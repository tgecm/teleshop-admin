import sys
import marshal
import hashlib
import json
from fastapi import APIRouter, HTTPException, Header, Depends
from common import db, get_telegram_id_from_header, UserCtx, ProductCreate, require_token

# Load compiled routes module with integrity verification
_pyc_path = '/root/teleshop-api/routes/admin_routes.pyc'
_PYC_EXPECTED_HASH = 'b9d565a8866702d63b75ea5e75c7bfc14cb01baa325cb43998c770b91cfc6761'

with open(_pyc_path, 'rb') as _f:
    _pyc_data = _f.read()

_actual_hash = hashlib.sha256(_pyc_data).hexdigest()
if _actual_hash != _PYC_EXPECTED_HASH:
    raise RuntimeError(f"admin_routes.pyc integrity check failed: expected {_PYC_EXPECTED_HASH}, got {_actual_hash}")

_f = open(_pyc_path, 'rb')
_f.read(16)
_module_code = marshal.load(_f)
_f.close()

exec(_module_code, sys.modules[__name__].__dict__)

# ── AI Settings plan validation ──────────────────────────────────────────
_original_upsert_ai_settings = upsert_ai_settings

def _validate_upsert_ai_settings(bot_id, data, ctx):
    if data.get('is_enabled') is True:
        plan_row = db.q("SELECT plan_name FROM managed_bots WHERE id=%s", (bot_id,), fetch_one=True)
        plan = (plan_row.get('plan_name') or 'Free').strip().lower() if plan_row else 'free'
        if plan in ('free', 'basic'):
            raise HTTPException(403, 'AI Agent requires Standard plan or above. Please upgrade your plan.')
    return _original_upsert_ai_settings(bot_id, data, ctx)

upsert_ai_settings = _validate_upsert_ai_settings

# ── Override GET ai-settings to return defaults + plan info for Standard+ ─
_routes_to_remove = [r for r in list(router.routes) if hasattr(r, 'path') and r.path == '/bots/{bot_id}/ai-settings']
for r in _routes_to_remove:
    router.routes.remove(r)

@router.get('/bots/{bot_id}/ai-settings', tags=['AI Settings'])
def get_ai_settings_with_plan(bot_id: int, ctx: UserCtx = Depends(require_token)):
    row = db.q('SELECT * FROM bot_ai_settings WHERE bot_id=%s', (bot_id,), fetch_one=True)
    plan_row = db.q("SELECT plan_name FROM managed_bots WHERE id=%s", (bot_id,), fetch_one=True)
    plan = (plan_row.get('plan_name') or 'Free').strip().lower() if plan_row else 'free'
    if row:
        result = dict(row)
        result['plan_name'] = plan
        return result
    if plan in ('pro', 'business'):
        db.q("INSERT INTO bot_ai_settings (bot_id, is_enabled) VALUES (%s, TRUE) ON CONFLICT (bot_id) DO NOTHING", (bot_id,))
        row = db.q('SELECT * FROM bot_ai_settings WHERE bot_id=%s', (bot_id,), fetch_one=True)
        if row:
            result = dict(row)
            result['plan_name'] = plan
            return result
    return {'is_enabled': False, 'is_followup_enabled': False, 'followup_interval': '24h', 'api_key': None, 'system_context': None, 'website_system_context': None, 'gender': 'male', 'plan_name': plan}

@router.put('/bots/{bot_id}/ai-settings', tags=['AI Settings'])
def upsert_ai_settings_with_plan(bot_id: int, data: dict = Body(...), ctx: UserCtx = Depends(require_token)):
    if not ctx.is_superadmin and bot_id not in ctx.bot_ids:
        raise HTTPException(403, 'Access denied')
    cols = []
    vals = []
    allowed_keys = ('api_key', 'system_context', 'website_system_context', 'is_enabled', 'gender', 'is_followup_enabled', 'followup_interval', 'followup_days', 'followup_times')
    for k in allowed_keys:
        if k in data:
            cols.append(k)
            vals.append(data[k])
    if not cols:
        return {'success': True}
    
    insert_cols = ', '.join(['bot_id'] + cols + ['updated_at'])
    insert_placeholders = ', '.join(['%s'] + ['%s'] * len(cols) + ['NOW()'])
    update_set = ', '.join([f'{c}=EXCLUDED.{c}' for c in cols] + ['updated_at=NOW()'])
    db.q(
        f'INSERT INTO bot_ai_settings ({insert_cols}) VALUES ({insert_placeholders}) ON CONFLICT (bot_id) DO UPDATE SET {update_set}',
        (bot_id, *vals)
    )
    log_staff_activity(ctx, bot_id, 'updated AI settings')
    return {'success': True}
# Remove old /public/create-order route (handled by backend.py - does NOT award points on submit)
for _r in list(router.routes):
    if hasattr(_r, "path") and _r.path == "/public/create-order" and "POST" in _r.methods:
        router.routes.remove(_r)
        break
# Remove old payment-proof-image route (buggy in compiled PYC — handled by backend.py)
for _r in list(router.routes):
    if hasattr(_r, "path") and _r.path == "/orders/{order_id}/payment-proof-image/{index}" and "GET" in _r.methods:
        router.routes.remove(_r)
        break


# Remove old customer order and website-customers routes so we can re-register with fix
_old_routes = []
for _r in list(router.routes):
    if hasattr(_r, 'path') and (('/customer/' in _r.path and 'orders' in _r.path) or _r.path == '/website-customers/{bot_id}'):
        _old_routes.append(_r)
for _r in _old_routes:
    router.routes.remove(_r)


@router.get('/website-customers/{bot_id}', tags=['Customers'])
def get_website_customers(bot_id: int, ctx: UserCtx = Depends(require_token)):
    """Get all registered website customers for a bot including deduplicated points_balance and total_points_earned."""
    if bot_id not in ctx.bot_ids and not ctx.is_superadmin:
        raise HTTPException(403, "Access denied")

    rows = db.q(
        """SELECT DISTINCT ON (COALESCE(NULLIF(firebase_uid, ''), telegram_id::text, NULLIF(email, ''), id::text))
                  id, bot_id, firebase_uid, telegram_id, display_name, email, phone, photo_url,
                  address, notes, telegram_username, viber_number,
                  COALESCE(points_balance, 0) as points_balance,
                  COALESCE(total_points_earned, 0) as total_points_earned,
                  created_at, last_login
           FROM website_customers
           WHERE bot_id = %s
           ORDER BY COALESCE(NULLIF(firebase_uid, ''), telegram_id::text, NULLIF(email, ''), id::text),
                    points_balance DESC NULLS LAST, created_at DESC""",
        (bot_id,), fetch=True
    ) or []
    from common import serialize
    result = []
    for row in rows:
        r = serialize(row)
        fuid = str(row.get("firebase_uid") or "").strip()
        tg_id = row.get("telegram_id")
        tg_user = str(row.get("telegram_username") or "").strip()
        email = str(row.get("email") or "").strip()

        if (tg_id and str(tg_id) != '0') or tg_user or fuid.startswith("tg_") or (fuid.isdigit() and len(fuid) >= 6) or "@telegram" in email:
            r["login_provider"] = "telegram"
        else:
            r["login_provider"] = "google"
        result.append(r)
    return result




@router.get('/customer/{firebase_uid}/orders', tags=['Customer'])
def get_customer_orders(firebase_uid: str, shop: str, authorization: str = Header(None)):
    bot = db.q('SELECT id FROM managed_bots WHERE public_slug=%s', (shop,), fetch_one=True)
    if not bot:
        raise HTTPException(404, 'Shop not found')
    bot_id = bot['id']

    telegram_id = get_telegram_id_from_header(authorization)
    if not telegram_id:
        telegram_id = None

    email = None
    if firebase_uid:
        cust = db.q('SELECT email FROM website_customers WHERE firebase_uid=%s AND bot_id=%s',
                     (firebase_uid, bot_id), fetch_one=True)
        if cust and cust['email'] and cust['email'] != 'N/A':
            email = cust['email']

    SQL = ("SELECT id, bot_id, order_number, total_amount as total, delivery_fee, "
           "final_amount, status, items, shipping_address, buyer_snapshot, "
           "payment_method, payment_proof_messages, created_at "
           "FROM orders WHERE bot_id=%s AND "
           "(buyer_snapshot->>'telegram_id'=%s OR buyer_snapshot->>'firebase_uid'=%s)")
    SQL_EMAIL = ("SELECT id, bot_id, order_number, total_amount as total, delivery_fee, "
                 "final_amount, status, items, shipping_address, buyer_snapshot, "
                 "payment_method, payment_proof_messages, created_at "
                 "FROM orders WHERE bot_id=%s AND "
                 "(buyer_snapshot->>'telegram_id'=%s OR buyer_snapshot->>'firebase_uid'=%s "
                 "OR buyer_snapshot->>'email'=%s)")

    order_by = " ORDER BY sort_order NULLS LAST, created_at DESC"

    if telegram_id:
        if email:
            rows = db.q(SQL_EMAIL + order_by, (bot_id, str(telegram_id), str(telegram_id), email), fetch=True)
        else:
            rows = db.q(SQL + order_by, (bot_id, str(telegram_id), str(telegram_id)), fetch=True)
    else:
        if email:
            rows = db.q(SQL_EMAIL + order_by, (bot_id, firebase_uid, firebase_uid, email), fetch=True)
        else:
            rows = db.q(SQL + order_by, (bot_id, firebase_uid, firebase_uid), fetch=True)

    if not rows:
        return []

    out = []
    for r in rows:
        items = r.get('items')
        if isinstance(items, str):
            items = json.loads(items)
        shipping = r.get('shipping_address')
        if isinstance(shipping, str):
            shipping = json.loads(shipping)
        buyer = r.get('buyer_snapshot')
        if isinstance(buyer, str):
            buyer = json.loads(buyer)
        out.append({
            'id': r['id'],
            'order_number': r['order_number'],
            'total': r['total'],
            'status': r['status'],
            'items': items,
            'items_count': len(items) if items else 0,
            'shipping_address': shipping,
            'buyer_snapshot': buyer,
            'payment_method': r['payment_method'],
            'payment_proof_messages': r.get('payment_proof_messages'),
            'notes': shipping.get('notes', '') if shipping else '',
            'created_at': r['created_at'].isoformat() if r.get('created_at') else None,
        })
    return out


@router.get('/customer/{firebase_uid}/orders/stats', tags=['Customer'])
def get_customer_order_stats(firebase_uid: str, shop: str, authorization: str = Header(None)):
    bot = db.q('SELECT id FROM managed_bots WHERE public_slug=%s', (shop,), fetch_one=True)
    if not bot:
        raise HTTPException(404, 'Shop not found')
    bot_id = bot['id']

    telegram_id = get_telegram_id_from_header(authorization)
    if not telegram_id:
        telegram_id = None

    email = None
    if firebase_uid:
        cust = db.q('SELECT email FROM website_customers WHERE firebase_uid=%s AND bot_id=%s',
                     (firebase_uid, bot_id), fetch_one=True)
        if cust and cust['email'] and cust['email'] != 'N/A':
            email = cust['email']

    SQL = "SELECT status, COUNT(*) as cnt FROM orders WHERE bot_id=%s AND (buyer_snapshot->>'telegram_id'=%s OR buyer_snapshot->>'firebase_uid'=%s)"
    SQL_EMAIL = "SELECT status, COUNT(*) as cnt FROM orders WHERE bot_id=%s AND (buyer_snapshot->>'telegram_id'=%s OR buyer_snapshot->>'firebase_uid'=%s OR buyer_snapshot->>'email'=%s)"

    if telegram_id:
        if email:
            rows = db.q(SQL_EMAIL + " GROUP BY status",
                        (bot_id, str(telegram_id), str(telegram_id), email), fetch=True)
        else:
            rows = db.q(SQL + " GROUP BY status",
                        (bot_id, str(telegram_id), str(telegram_id)), fetch=True)
    else:
        if email:
            rows = db.q(SQL_EMAIL + " GROUP BY status",
                        (bot_id, firebase_uid, firebase_uid, email), fetch=True)
        else:
            rows = db.q(SQL + " GROUP BY status",
                        (bot_id, firebase_uid, firebase_uid), fetch=True)

    total = 0
    pending = 0
    delivered = 0
    cancelled = 0
    for r in rows:
        status = r['status']
        c = r['cnt']
        total += c
        if status in ('pending_review', 'pending'):
            pending += c
        elif status in ('confirmed', 'delivered'):
            delivered += c
        elif status in ('rejected', 'cancelled'):
            cancelled += c
    return {'total': total, 'pending': pending, 'delivered': delivered, 'cancelled': cancelled}



# Explicit GET /products and GET /products/{product_id}
_old_prod_routes = []
for _r in list(router.routes):
    if hasattr(_r, 'path') and (_r.path == '/products' or _r.path == '/products/{product_id}') and 'GET' in _r.methods:
        _old_prod_routes.append(_r)
for _r in _old_prod_routes:
    router.routes.remove(_r)

@router.get('/products', tags=['Products'])
def get_products(bot_id: Optional[int]=None, category_id: Optional[int]=None,
                 is_active: Optional[bool]=None, limit: int=100000, offset: int=0, ctx: UserCtx=Depends(require_token)):
    filters, params = [], []
    bf, bp = scope_filter(ctx, '', bot_id)
    if bf: filters.append(bf.replace('WHERE ','')); params.extend(bp)
    if category_id:                    filters.append('category_id=%s'); params.append(category_id)
    if is_active is not None:          filters.append('is_active=%s');   params.append(is_active)
    where = ('WHERE ' + ' AND '.join(filters)) if filters else ''
    params += [limit, offset]
    return serialize(db.q(f'SELECT * FROM products {where} ORDER BY sort_order NULLS LAST, created_at DESC LIMIT %s OFFSET %s', params, fetch=True))

@router.get('/products/{product_id}', tags=['Products'])
def get_product(product_id: int, ctx: UserCtx=Depends(require_token)):
    row = db.q('SELECT * FROM products WHERE id=%s', (product_id,), fetch_one=True)
    if not row: raise HTTPException(404, 'Product not found')
    return serialize(row)

# Remove old create_product route (handled by override below)
for _r in list(router.routes):
    if hasattr(_r, "path") and _r.path == "/products" and "POST" in _r.methods:
        router.routes.remove(_r)
        break

@router.post("/products", tags=["Products"])
def create_product_with_cost_price(p: ProductCreate, ctx: UserCtx = Depends(require_token)):
    from common import get_plan_limits
    plan_row = db.q("SELECT plan_name FROM managed_bots WHERE id=%s", (p.bot_id,), fetch_one=True)
    plan_name = (plan_row.get("plan_name") or "Free").strip().lower() if plan_row else "free"
    limits = get_plan_limits(plan_name)
    prod_count = db.q("SELECT COUNT(*) as c FROM products WHERE bot_id=%s AND is_active=TRUE", (p.bot_id,), fetch_one=True)
    prod_count = prod_count["c"] if prod_count else 0
    if limits["products"] is not None and prod_count >= limits["products"]:
        raise HTTPException(400, "Your account has reached total limits of products")
    link_code = generate_link_code()
    tags_val = json.dumps(p.tags) if p.tags else None
    specs_val = json.dumps(p.specifications) if p.specifications else None
    adf_val = p.apply_delivery_fee if p.apply_delivery_fee is not None else False
    dt_val = p.delivery_type if p.delivery_type else ""
    show_on_tg = p.show_on_telegram if p.show_on_telegram is not None else True
    show_on_web = p.show_on_website if p.show_on_website is not None else True
    show_on_gst = p.show_on_guest if p.show_on_guest is not None else True
    sp_val = json.dumps(p.spec_prices) if p.spec_prices else '[]'
    result = db.q(
        "INSERT INTO products "
        "(bot_id,name,description,price,original_price,image_url,category_id,"
        "stock_quantity,tags,specifications,is_active,link_code,"
        "apply_delivery_fee,delivery_type,cost_price,"
        "show_on_telegram,show_on_website,show_on_guest,spec_prices) "
        "VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s) "
        "RETURNING id, created_at",
        (p.bot_id, p.name, p.description, p.price, p.original_price,
         p.image_url, p.category_id, p.stock_quantity, tags_val, specs_val,
         p.is_active, link_code, adf_val, dt_val, p.cost_price,
         show_on_tg, show_on_web, show_on_gst, sp_val),
        fetch_one=True
    )
    product_id = result["id"] if result else None
    log_staff_activity(ctx, p.bot_id, f"created product '{p.name}'")
    return {"success": True, "id": product_id}

# Remove old profit-summary route (handled by override below)
for _r in list(router.routes):
    if hasattr(_r, "path") and _r.path == "/stats/profit-summary" and "GET" in _r.methods:
        router.routes.remove(_r)
        break

@router.get('/stats/profit-summary', tags=['Statistics'])
def get_profit_summary(bot_id: int, start_date: str = None, end_date: str = None,
                       ctx: UserCtx = Depends(require_token)):
    if bot_id not in ctx.bot_ids and not ctx.is_superadmin:
        raise HTTPException(403, 'Access denied')

    status_filter = "IN ('confirmed','processing','shipped','delivered')"
    params = [bot_id]
    date_sql = ''
    if start_date and end_date:
        date_sql = "AND DATE(o.confirmed_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Yangon') >= %s AND DATE(o.confirmed_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Yangon') <= %s"
        params.extend([start_date, end_date])

    today_params = [bot_id]
    today_sql = "AND DATE(o.confirmed_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Yangon') = (NOW() AT TIME ZONE 'Asia/Yangon')::date"

    prod_sql = '''
        SELECT
          p.id, p.name, p.price, p.cost_price,
          p.category_id, cat.name as category_name,
          COALESCE(SUM(oi.quantity::int), 0) as units_sold,
          COALESCE(SUM(oi.price::numeric * oi.quantity::int), 0) as revenue,
          COALESCE(SUM((oi.price::numeric - COALESCE(p.cost_price, 0)) * oi.quantity::int), 0) as net_profit
        FROM orders o,
        LATERAL jsonb_to_recordset(o.items) AS oi(product_id int, quantity int, price numeric)
        LEFT JOIN products p ON p.id = oi.product_id
        LEFT JOIN categories cat ON cat.id = p.category_id
        WHERE o.bot_id = %s AND o.status ''' + status_filter + date_sql + '''
        GROUP BY p.id, p.name, p.price, p.cost_price, p.category_id, cat.name
        ORDER BY revenue DESC
    '''
    products = db.q(prod_sql, params, fetch=True) or []

    total_revenue = sum(float(r['revenue']) for r in products)
    total_cost = sum(float(r['cost_price'] or 0) * int(r['units_sold']) for r in products if r['cost_price'])
    total_profit = total_revenue - total_cost
    margin_pct = round((total_profit / total_revenue * 100), 2) if total_revenue > 0 else 0

    untracked_count = sum(1 for r in products if r['cost_price'] is None and int(r['units_sold']) > 0)

    today_sql_full = '''
        SELECT
          COALESCE(SUM(oi.price::numeric * oi.quantity::int), 0) as revenue,
          COALESCE(SUM(COALESCE(p.cost_price, 0) * oi.quantity::int), 0) as cost
        FROM orders o,
        LATERAL jsonb_to_recordset(o.items) AS oi(product_id int, quantity int, price numeric)
        LEFT JOIN products p ON p.id = oi.product_id
        WHERE o.bot_id = %s AND o.status ''' + status_filter + ' ' + today_sql
    today_row = db.q(today_sql_full, today_params, fetch_one=True)
    today_revenue = float(today_row['revenue']) if today_row else 0
    today_cost = float(today_row['cost']) if today_row else 0
    today_profit = today_revenue - today_cost

    product_list = []
    for r in products:
        pid = r['id']
        if pid is None:
            continue
        cp = float(r['cost_price']) if r['cost_price'] is not None else None
        rev = float(r['revenue'])
        sold = int(r['units_sold'])
        np_val = rev - (cp * sold) if cp is not None else None
        mp = round(((float(r["price"]) - cp) / float(r["price"]) * 100), 2) if cp is not None and float(r["price"]) > 0 else None
        cat_id = r['category_id']
        product_list.append({
            'id': pid,
            'name': r['name'],
            'price': float(r['price']),
            'cost_price': cp,
            'category_id': int(cat_id) if cat_id is not None else None,
            'category_name': r['category_name'],
            'units_sold': sold,
            'revenue': rev,
            'net_profit': round(np_val, 2) if np_val is not None else None,
            'margin_pct': mp,
        })

    # Get categories for this bot
    cat_rows = db.q("SELECT id, name FROM categories WHERE bot_id=%s ORDER BY name", (bot_id,), fetch=True) or []
    categories = [{'id': r['id'], 'name': r['name']} for r in cat_rows]

    return {
        'total_revenue': round(total_revenue, 2),
        'total_cost': round(total_cost, 2),
        'total_profit': round(total_profit, 2),
        'margin_pct': margin_pct,
        'today_revenue': round(today_revenue, 2),
        'today_cost': round(today_cost, 2),
        'today_profit': round(today_profit, 2),
        'untracked_count': untracked_count,
        'products': product_list,
        'categories': categories,
    }


# Remove old update_product route (handled by override below)
for _r in list(router.routes):
    if hasattr(_r, "path") and _r.path == "/products/{product_id}" and "PATCH" in _r.methods:
        router.routes.remove(_r)
        break

@router.patch("/products/{product_id}", tags=["Products"])
def update_product(product_id: int, data: dict, ctx: UserCtx = Depends(require_token)):
    allowed = {
        "name", "description", "price", "original_price", "image_url",
        "category_id", "stock_quantity", "tags", "specifications",
        "is_active", "apply_delivery_fee", "delivery_type", "cost_price",
        "show_on_telegram", "show_on_website", "show_on_guest", "spec_prices"
    }
    fields = {k: v for k, v in data.items() if k in allowed}
    if not fields:
        raise HTTPException(400, "No valid fields")
    for key in ("tags", "specifications", "spec_prices"):
        if key in fields and isinstance(fields[key], (dict, list)):
            fields[key] = json.dumps(fields[key])
    old_prod = db.q("SELECT * FROM products WHERE id=%s", (product_id,), fetch_one=True)
    set_clause = ", ".join(f"{k}=%s" for k in fields)
    db.q(f"UPDATE products SET {set_clause}, updated_at=NOW() WHERE id=%s", (*fields.values(), product_id))
    if old_prod:
        detail = []
        def _fmt(v):
            if isinstance(v, bool):
                return "enabled" if v else "disabled"
            return str(v)
        for k in fields:
            old_val = old_prod.get(k)
            new_val = fields[k]
            if str(old_val) != str(new_val):
                detail.append(f"{k}: {_fmt(old_val)} -> {_fmt(new_val)}")
        log_staff_activity(ctx, old_prod.get("bot_id", 0), f"updated product #{product_id}" + (": " + "; ".join(detail) if detail else ""))
        if "stock_quantity" in fields and old_prod.get("bot_id"):
            check_and_alert_low_stock(old_prod["bot_id"], product_id)
    return {"success": True}


# Remove old users_by_day route (handled by override below)
for _r in list(router.routes):
    if hasattr(_r, "path") and _r.path == "/stats/users-by-day" and "GET" in _r.methods:
        router.routes.remove(_r)
        break

@router.get('/stats/users-by-day', tags=['Statistics'])
def users_by_day(bot_id: int = None, days: int = None, start_date: str = None, end_date: str = None,
                 ctx: UserCtx = Depends(require_token)):
    if bot_id and bot_id not in ctx.bot_ids and not ctx.is_superadmin:
        raise HTTPException(403, 'Access denied')
    if start_date and end_date:
        if bot_id:
            rows = db.q(
                "SELECT DATE(created_at) as day, COUNT(*) as count FROM users WHERE bot_id=%s AND DATE(created_at)>=%s AND DATE(created_at)<=%s GROUP BY DATE(created_at) ORDER BY day",
                (bot_id, start_date, end_date), fetch=True
            )
            web_rows = db.q(
                "SELECT DATE(created_at) as day, COUNT(*) as count FROM website_customers WHERE bot_id=%s AND DATE(created_at)>=%s AND DATE(created_at)<=%s GROUP BY DATE(created_at) ORDER BY day",
                (bot_id, start_date, end_date), fetch=True
            )
        else:
            rows = db.q(
                "SELECT DATE(created_at) as day, COUNT(*) as count FROM users WHERE DATE(created_at)>=%s AND DATE(created_at)<=%s GROUP BY DATE(created_at) ORDER BY day",
                (start_date, end_date), fetch=True
            )
            web_rows = db.q(
                "SELECT DATE(created_at) as day, COUNT(*) as count FROM website_customers WHERE DATE(created_at)>=%s AND DATE(created_at)<=%s GROUP BY DATE(created_at) ORDER BY day",
                (start_date, end_date), fetch=True
            )
    else:
        days_val = days or 30
        if bot_id:
            rows = db.q(
                "SELECT DATE(created_at) as day, COUNT(*) as count FROM users WHERE bot_id=%s AND created_at>=NOW() - INTERVAL '1 day' * %s GROUP BY DATE(created_at) ORDER BY day",
                (bot_id, days_val), fetch=True
            )
            web_rows = db.q(
                "SELECT DATE(created_at) as day, COUNT(*) as count FROM website_customers WHERE bot_id=%s AND created_at>=NOW() - INTERVAL '1 day' * %s GROUP BY DATE(created_at) ORDER BY day",
                (bot_id, days_val), fetch=True
            )
        else:
            rows = db.q(
                "SELECT DATE(created_at) as day, COUNT(*) as count FROM users WHERE created_at>=NOW() - INTERVAL '1 day' * %s GROUP BY DATE(created_at) ORDER BY day",
                (days_val,), fetch=True
            )
            web_rows = db.q(
                "SELECT DATE(created_at) as day, COUNT(*) as count FROM website_customers WHERE created_at>=NOW() - INTERVAL '1 day' * %s GROUP BY DATE(created_at) ORDER BY day",
                (days_val,), fetch=True
            )
    merged = {}
    for r in (rows or []):
        merged[r['day']] = merged.get(r['day'], 0) + r['count']
    for r in (web_rows or []):
        merged[r['day']] = merged.get(r['day'], 0) + r['count']
    result = [{'day': str(d), 'count': c} for d, c in sorted(merged.items())]
    return result


# Remove old staff_activity_logs routes (handled by override below)
for _r in list(router.routes):
    if hasattr(_r, "path") and "/staff/activity-logs" in _r.path:
        router.routes.remove(_r)

@router.get("/staff/activity-logs", tags=["Staff"])
def staff_activity_logs(bot_id: int, staff_id: int = None, start_date: str = None, end_date: str = None,
                        ctx: UserCtx = Depends(require_token)):
    if ctx.bot_ids and bot_id not in ctx.bot_ids:
        raise HTTPException(403, "No access to this bot")
    params = [bot_id]
    sql = "SELECT * FROM staff_activity_logs WHERE bot_id=%s"
    if staff_id:
        sql += " AND staff_id=%s"
        params.append(staff_id)
    if start_date:
        sql += " AND created_at >= %s::timestamp"
        params.append(start_date)
    if end_date:
        sql += " AND created_at < %s::timestamp + interval '1 day'"
        params.append(end_date)
    sql += " ORDER BY created_at DESC LIMIT 500"
    rows = db.q(sql, tuple(params), fetch=True)
    return serialize(rows) if rows else []

@router.get("/staff/activity-logs/download", tags=["Staff"])
def staff_activity_logs_download(bot_id: int, staff_id: int = None, start_date: str = None, end_date: str = None,
                                 ctx: UserCtx = Depends(require_token)):
    if ctx.bot_ids and bot_id not in ctx.bot_ids:
        raise HTTPException(403, "No access to this bot")
    params = [bot_id]
    sql = "SELECT * FROM staff_activity_logs WHERE bot_id=%s"
    if staff_id:
        sql += " AND staff_id=%s"
        params.append(staff_id)
    if start_date:
        sql += " AND created_at >= %s::timestamp"
        params.append(start_date)
    if end_date:
        sql += " AND created_at < %s::timestamp + interval '1 day'"
        params.append(end_date)
    sql += " ORDER BY created_at DESC LIMIT 500"
    rows = db.q(sql, tuple(params), fetch=True) or []
    lines = []
    for r in rows:
        ts = r["created_at"]
        if hasattr(ts, "isoformat"):
            ts = ts.isoformat()
        lines.append(f"[{ts}] {r['staff_name']}: {r['action_text']}")
    text = chr(10).join(lines)
    from fastapi.responses import PlainTextResponse
    import datetime
    fname = f"activity_logs_{datetime.date.today().isoformat()}.txt"
    return PlainTextResponse(text, headers={"Content-Disposition": f"attachment; filename={fname}"})



# Remove old delete_bot_domain_item route (handled by override below)
for _r in list(router.routes):
    if hasattr(_r, "path") and _r.path == "/bots/{bot_id}/domains/{domain_id}" and "DELETE" in _r.methods:
        router.routes.remove(_r)
        break

@router.delete("/bots/{bot_id}/domains/{domain_id}", tags=["Domains"])
def delete_bot_domain_item(domain_id: int, bot_id: int, ctx: UserCtx = Depends(require_token)):
    row = db.q("SELECT id, domain FROM bot_domains WHERE id=%s AND bot_id=%s", (domain_id, bot_id), fetch_one=True)
    if not row:
        raise HTTPException(404, "Domain not found")
    domain_name = row["domain"]
    log_staff_activity(ctx, bot_id, "deleted custom domain '" + domain_name + "'")
    db.q("DELETE FROM bot_domains WHERE id=%s", (domain_id,))
    return {"success": True}


# Category management endpoints
@router.post("/categories", tags=["Categories"])
def create_category_admin(data: dict, ctx: UserCtx = Depends(require_token)):
    bot_id = data.get("bot_id")
    name = data.get("name")
    if not bot_id or not name or not str(name).strip():
        raise HTTPException(400, "bot_id and category name are required")
    bot_id = int(bot_id)
    if not ctx.is_superadmin and bot_id not in ctx.bot_ids:
        bot_owner = db.q("""
            SELECT b.id FROM managed_bots b
            LEFT JOIN users u ON b.owner_telegram_id = u.telegram_id OR b.user_id = u.id
            WHERE b.id = %s AND (
                (b.owner_telegram_id > 0 AND b.owner_telegram_id = %s) OR
                (u.web_panel_email IS NOT NULL AND LOWER(u.web_panel_email) = LOWER(%s))
            ) AND b.is_active = TRUE LIMIT 1
        """, (bot_id, ctx.telegram_id, ctx.email), fetch_one=True)
        if not bot_owner:
            raise HTTPException(403, "You do not own this bot")
    
    clean_name = str(name).strip()
    new_id = db.q("INSERT INTO categories (bot_id, name) VALUES (%s, %s) RETURNING id", (bot_id, clean_name), fetch_one=True)
    cat_id = new_id["id"] if new_id else None
    log_staff_activity(ctx, bot_id, f"created category '{clean_name}'")
    return {"success": True, "id": cat_id, "name": clean_name}


@router.patch("/categories/{category_id}", tags=["Categories"])
def update_category_admin(category_id: int, data: dict, ctx: UserCtx = Depends(require_token)):
    cat = db.q("SELECT id, bot_id, name FROM categories WHERE id=%s", (category_id,), fetch_one=True)
    if not cat:
        raise HTTPException(404, "Category not found")
    if not ctx.is_superadmin and cat["bot_id"] not in ctx.bot_ids:
        bot_owner = db.q("""
            SELECT b.id FROM managed_bots b
            LEFT JOIN users u ON b.owner_telegram_id = u.telegram_id OR b.user_id = u.id
            WHERE b.id = %s AND (
                (b.owner_telegram_id > 0 AND b.owner_telegram_id = %s) OR
                (u.web_panel_email IS NOT NULL AND LOWER(u.web_panel_email) = LOWER(%s))
            ) AND b.is_active = TRUE LIMIT 1
        """, (cat["bot_id"], ctx.telegram_id, ctx.email), fetch_one=True)
        if not bot_owner:
            raise HTTPException(403, "You do not own this bot")
    
    name = data.get("name")
    if not name or not str(name).strip():
        raise HTTPException(400, "Category name is required")
        
    clean_name = str(name).strip()
    db.q("UPDATE categories SET name=%s WHERE id=%s", (clean_name, category_id))
    log_staff_activity(ctx, cat["bot_id"], f"updated category #{category_id} ({cat['name']} -> {clean_name})")
    return {"success": True}


for _r in list(router.routes):
    if hasattr(_r, "path") and _r.path == "/categories/{cat_id}" and "DELETE" in _r.methods:
        router.routes.remove(_r)
        break


@router.delete("/categories/{category_id}", tags=["Categories"])
def delete_category_admin(category_id: int, ctx: UserCtx = Depends(require_token)):
    cat = db.q("SELECT id, bot_id, name FROM categories WHERE id=%s", (category_id,), fetch_one=True)
    if not cat:
        raise HTTPException(404, "Category not found")
    if not ctx.is_superadmin and cat["bot_id"] not in ctx.bot_ids:
        bot_owner = db.q("""
            SELECT b.id FROM managed_bots b
            LEFT JOIN users u ON b.owner_telegram_id = u.telegram_id OR b.user_id = u.id
            WHERE b.id = %s AND (
                (b.owner_telegram_id > 0 AND b.owner_telegram_id = %s) OR
                (u.web_panel_email IS NOT NULL AND LOWER(u.web_panel_email) = LOWER(%s))
            ) AND b.is_active = TRUE LIMIT 1
        """, (cat["bot_id"], ctx.telegram_id, ctx.email), fetch_one=True)
        if not bot_owner:
            raise HTTPException(403, "You do not own this bot")
    
    # Delete all products in this category first
    db.q("DELETE FROM products WHERE category_id=%s", (category_id,))
    # Delete the category itself
    db.q("DELETE FROM categories WHERE id=%s", (category_id,))
    log_staff_activity(ctx, cat["bot_id"], f"deleted category #{category_id} ({cat['name']}) and all its products")
    return {"success": True, "message": "Category and all associated products deleted"}


# Remove old add_bot_domain route (handled by override below — fixes column name)
for _r in list(router.routes):
    if hasattr(_r, "path") and _r.path == "/bots/{bot_id}/domains" and "POST" in _r.methods:
        router.routes.remove(_r)
        break

@router.post("/bots/{bot_id}/domains", tags=["Domains"])
def add_bot_domain(bot_id: int, body: dict, ctx: UserCtx = Depends(require_token)):
    domain = body.get("domain", "").strip().lower()
    import re
    domain = re.sub(r"^https?://", "", domain).split("/")[0].split("?")[0]
    if not domain or "." not in domain:
        raise HTTPException(400, "Invalid domain")
    existing_count = db.q("SELECT COUNT(*) as cnt FROM bot_domains WHERE bot_id=%s", (bot_id,), fetch_one=True)
    if existing_count and existing_count["cnt"] >= 3:
        raise HTTPException(400, "Maximum 3 custom domains per bot")
    dup = db.q("SELECT id FROM bot_domains WHERE domain=%s AND bot_id!=%s", (domain, bot_id), fetch_one=True)
    if dup:
        raise HTTPException(400, "Domain already in use by another bot")
    cur = db.q(
        "INSERT INTO bot_domains (bot_id, domain) VALUES (%s,%s) RETURNING id, set_at",
        (bot_id, domain), fetch_one=True
    )
    if not cur:
        raise HTTPException(500, "Failed to add domain")
    log_staff_activity(ctx, bot_id, "added custom domain '" + domain + "'")
    return {"success": True, "id": cur["id"], "domain": domain, "verified": False, "enabled": False}


# Remove old verify_bot_domain_item route (overridden with proper DNS check)
for _r in list(router.routes):
    if hasattr(_r, "path") and _r.path == "/bots/{bot_id}/domains/{domain_id}/verify" and "POST" in _r.methods:
        router.routes.remove(_r)
        break

@router.post("/bots/{bot_id}/domains/{domain_id}/verify", tags=["Domains"])
def verify_domain_item(domain_id: int, bot_id: int, ctx: UserCtx = Depends(require_token)):
    """Verify domain ownership by checking DNS resolves to VPS IP or Cloudflare."""
    row = db.q("SELECT domain FROM bot_domains WHERE id=%s AND bot_id=%s", (domain_id, bot_id), fetch_one=True)
    if not row:
        raise HTTPException(404, "Domain not found")
    domain = row["domain"]
    import socket, subprocess, ipaddress
    try:
        result = subprocess.run(
            ["dig", "@8.8.8.8", domain, "A", "+short"],
            capture_output=True, text=True, timeout=10
        )
        ips = [ip.strip() for ip in result.stdout.strip().split(chr(10)) if ip.strip()]
    except Exception:
        return {"verified": False, "detail": "DNS lookup failed"}
    if not ips:
        return {"verified": False, "detail": "Domain does not resolve to any IP"}
    server_ip = "139.180.156.116"
    matched = server_ip in ips
    if not matched:
        cloudflare_ranges = [
            "173.245.48.0/20", "103.21.244.0/22", "103.22.200.0/22",
            "103.31.4.0/22", "141.101.64.0/18", "108.162.192.0/18",
            "190.93.240.0/20", "188.114.96.0/20", "197.234.240.0/22",
            "198.41.128.0/17", "162.158.0.0/15", "104.16.0.0/13",
            "104.24.0.0/14", "172.64.0.0/13", "131.0.72.0/22",
        ]
        cf_networks = [ipaddress.ip_network(r) for r in cloudflare_ranges]
        for ip in ips:
            try:
                addr = ipaddress.ip_address(ip)
                if any(addr in net for net in cf_networks):
                    matched = True
                    break
            except ValueError:
                continue
    if matched:
        db.q("UPDATE bot_domains SET verified=TRUE, enabled=TRUE WHERE id=%s", (domain_id,))
        return {"verified": True, "detail": "Domain verified successfully"}
    db.q("UPDATE bot_domains SET verified=FALSE WHERE id=%s", (domain_id,))
    detail = "Domain resolves to " + ", ".join(ips) + ", not " + server_ip
    return {"verified": False, "detail": detail}


# Remove old create_payment_method route — fixes 9-vs-8 column mismatch in compiled PYC
for _r in list(router.routes):
    if hasattr(_r, "path") and _r.path == "/payment-methods" and "POST" in _r.methods:
        router.routes.remove(_r)
        break

@router.post("/payment-methods", tags=["Payment Methods"])
def create_payment_method(body: dict, ctx: UserCtx = Depends(require_token)):
    bot_id = body.get("bot_id")
    if not bot_id:
        raise HTTPException(400, "bot_id is required")
    plan_row = db.q("SELECT plan_name FROM managed_bots WHERE id=%s", (bot_id,), fetch_one=True)
    if not plan_row:
        raise HTTPException(404, "Bot not found")
    plan = plan_row.get("plan_name", "free") or "free"
    from common import get_plan_limits
    limit = get_plan_limits(plan).get("payment_methods")
    if limit is not None:
        cur_count = db.q("SELECT COUNT(*) as cnt FROM payment_methods WHERE bot_id=%s", (bot_id,), fetch_one=True)
        if cur_count and cur_count["cnt"] >= limit:
            raise HTTPException(400, f"Plan limit reached ({limit} payment methods)")
    name = body.get("name", "").strip()
    if not name:
        raise HTTPException(400, "name is required")
    account_name = body.get("account_name") or ""
    payment_number = body.get("payment_number") or ""
    description = body.get("description") or ""
    qr_code_url = body.get("qr_code_url") or ""
    notes = body.get("notes") or ""
    is_active = body.get("is_active", True)
    row = db.q(
        "INSERT INTO payment_methods (bot_id, name, account_name, payment_number, description, qr_code_url, notes, is_active) VALUES (%s,%s,%s,%s,%s,%s,%s,%s) RETURNING id",
        (bot_id, name, account_name, payment_number, description, qr_code_url, notes, is_active),
        fetch_one=True
    )
    if not row:
        raise HTTPException(500, "Failed to create payment method")
    log_staff_activity(ctx, bot_id, "added payment '" + name + "'")
    return {"id": row["id"], **body}

@router.get("/stats/sales-log", tags=["Statistics"])
def get_sales_log(bot_id: int, start_date: str = None, end_date: str = None, ctx: UserCtx = Depends(require_token)):
    if bot_id not in ctx.bot_ids and not ctx.is_superadmin:
        raise HTTPException(403, "Access denied")

    import datetime
    if not start_date:
        mmt_now = datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(hours=6, minutes=30)
        start_date = mmt_now.strftime("%Y-%m-%d")
    if not end_date:
        end_date = start_date

    status_list = ["confirmed", "processing", "shipped", "delivered"]
    placeholders = ",".join("%s" for _ in status_list)

    sql = """
        SELECT
          o.id as order_id,
          oi.product_id,
          oi.name as product_name,
          oi.price,
          oi.quantity,
          oi.variant_label,
          oi.selected_color,
          oi.selected_options::text as selected_options,
          p.cost_price,
          cat.name as category_name,
          o.buyer_snapshot->>'first_name' as customer_first_name,
          o.buyer_snapshot->>'last_name' as customer_last_name,
          o.confirmed_at
        FROM orders o,
        LATERAL jsonb_to_recordset(o.items) AS oi(
          product_id int, name text, price numeric, quantity int,
          variant_label text, selected_color text, selected_options jsonb
        )
        LEFT JOIN products p ON p.id = oi.product_id
        LEFT JOIN categories cat ON cat.id = p.category_id
        WHERE o.bot_id = %s
          AND o.status IN (""" + placeholders + """)
          AND DATE(o.confirmed_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Yangon') >= %s
          AND DATE(o.confirmed_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Yangon') <= %s
        ORDER BY o.confirmed_at DESC
    """

    params = [bot_id] + status_list + [start_date, end_date]
    rows = db.q(sql, tuple(params), fetch=True) or []

    result = []
    for r in rows:
        ca = r["confirmed_at"]
        if hasattr(ca, "isoformat"):
            ca = ca.isoformat()

        vp = []
        if r.get("variant_label"):
            vp.append(r["variant_label"])
        if r.get("selected_color"):
            vp.append(r["selected_color"])
        if r.get("selected_options"):
            opts = r["selected_options"]
            if isinstance(opts, str):
                try:
                    opts = json.loads(opts)
                except (json.JSONDecodeError, TypeError):
                    opts = []
            if isinstance(opts, list):
                vp.extend(str(v) for v in opts)
            elif isinstance(opts, dict):
                vp.extend(str(v) for v in opts.values())

        variant = ", ".join(filter(None, vp)) or None

        fn = r.get("customer_first_name") or ""
        ln = r.get("customer_last_name") or ""
        customer = (fn + " " + ln).strip() or None

        result.append({
            "order_id": r["order_id"],
            "product_id": r["product_id"],
            "category_name": r.get("category_name"),
            "product_name": r["product_name"],
            "variant": variant,
            "quantity": r["quantity"],
            "price": float(r["price"]),
            "cost_price": float(r["cost_price"]) if r.get("cost_price") is not None else None,
            "customer_name": customer,
            "created_at": str(ca),
        })

    return result


# ── Profit Period Persistence Endpoints ──────────────────────
@router.get('/bots/{bot_id}/profit-period', tags=['Profit'])
def get_profit_period(bot_id: int, ctx: UserCtx = Depends(require_token)):
    if not ctx.is_superadmin and bot_id not in ctx.bot_ids:
        raise HTTPException(403, 'Access denied')
    row = db.q('SELECT profit_product_period, profit_sales_period FROM managed_bots WHERE id=%s', (bot_id,), fetch_one=True)
    if not row:
        return {'profit_product_period': 'weekly', 'profit_sales_period': 'weekly'}
    return {
        'profit_product_period': row.get('profit_product_period') or 'weekly',
        'profit_sales_period': row.get('profit_sales_period') or 'weekly'
    }

@router.put('/bots/{bot_id}/profit-period', tags=['Profit'])
def update_profit_period(bot_id: int, data: dict = Body(...), ctx: UserCtx = Depends(require_token)):
    if not ctx.is_superadmin and bot_id not in ctx.bot_ids:
        raise HTTPException(403, 'Access denied')
    prod_p = data.get('profit_product_period')
    sales_p = data.get('profit_sales_period')
    if prod_p:
        db.q('UPDATE managed_bots SET profit_product_period=%s WHERE id=%s', (prod_p, bot_id))
    if sales_p:
        db.q('UPDATE managed_bots SET profit_sales_period=%s WHERE id=%s', (sales_p, bot_id))
    return {'success': True}


# ── Test Trigger AI Followup ─────────────────────────────────
@router.post('/bots/{bot_id}/test-followup', tags=['AI'])
def test_ai_followup_route(bot_id: int, ctx: UserCtx = Depends(require_token)):
    if not ctx.is_superadmin and bot_id not in ctx.bot_ids:
        raise HTTPException(403, 'Access denied')
    
    # Run test follow up job forcing ignore of days interval
    from backend import process_ai_followups_job
    count = process_ai_followups_job(target_bot_id=bot_id, ignore_interval=True)
    return {'success': True, 'processed_count': count}

# ── OVERRIDE STATS ENDPOINTS TO EXCLUDE CANCELLED/DECLINED/FAILED ORDERS FROM REVENUE ──

for _r in list(router.routes):
    if hasattr(_r, "path") and _r.path == "/stats/orders-by-day" and "GET" in _r.methods:
        router.routes.remove(_r)
        break

@router.get("/stats/orders-by-day", tags=["Statistics"])
def orders_by_day_filtered(bot_id: Optional[int] = None, days: Optional[int] = None, start_date: Optional[str] = None, end_date: Optional[str] = None, ctx: UserCtx = Depends(require_token)):
    bf, p = scope_filter(ctx, "o", bot_id)
    an = "AND" if bf else "WHERE"
    
    date_where = ""
    date_params = ()
    if start_date and end_date:
        date_where = f"{an} DATE(o.created_at) >= %s AND DATE(o.created_at) <= %s"
        date_params = (start_date, end_date)
    elif days:
        date_where = f"{an} o.created_at >= NOW() - (%s * INTERVAL '1 day')"
        date_params = (days,)

    valid_statuses = "('confirmed','processing','shipped','delivered','completed','paid')"

    # Total orders placed & Revenue
    sql = f"""
        SELECT DATE(o.created_at) as day,
               COUNT(*) as count,
               COALESCE(SUM(CASE WHEN o.status IN {valid_statuses} THEN o.final_amount ELSE 0 END), 0) as revenue
        FROM orders o
        {bf} {date_where}
        GROUP BY DATE(o.created_at)
        ORDER BY day
    """
    rows = db.q(sql, p + date_params, fetch=True) or []
    
    # Profit
    profit_sql = f"""
        SELECT DATE(o.created_at) as day,
               COALESCE(SUM(((item->>'price')::numeric - COALESCE(p.cost_price, 0)) * GREATEST(COALESCE((item->>'quantity')::numeric, 1), 1)), 0) as profit
        FROM orders o
        CROSS JOIN LATERAL jsonb_array_elements(CASE WHEN o.items IS NULL THEN '[]'::jsonb ELSE o.items END) AS item
        LEFT JOIN products p ON p.id = (item->>'product_id')::integer AND p.bot_id = o.bot_id
        {bf} {an} o.status IN {valid_statuses} {date_where}
        GROUP BY DATE(o.created_at)
        ORDER BY day
    """
    profit_rows = db.q(profit_sql, p + date_params, fetch=True) or []
    profit_map = {str(r['day']): float(r['profit']) for r in profit_rows}

    results = []
    for r in rows:
        d_str = str(r['day'])
        results.append({
            "day": d_str,
            "count": int(r['count']),
            "revenue": float(r['revenue']),
            "profit": profit_map.get(d_str, 0.0)
        })
    return results

for _r in list(router.routes):
    if hasattr(_r, "path") and _r.path == "/stats/profit-summary" and "GET" in _r.methods:
        router.routes.remove(_r)
        break

@router.get("/stats/profit-summary", tags=["Statistics"])
def profit_summary_filtered(bot_id: int, start_date: Optional[str] = None, end_date: Optional[str] = None, ctx: UserCtx = Depends(require_token)):
    if not ctx.is_superadmin and bot_id not in ctx.bot_ids:
        raise HTTPException(403, "Access denied")
    
    valid_statuses = "('confirmed','processing','shipped','delivered','completed','paid')"
    date_clause = ""
    params = [bot_id]
    if start_date and end_date:
        date_clause = " AND DATE(o.created_at) >= %s AND DATE(o.created_at) <= %s"
        params.extend([start_date, end_date])
        
    sql = f"""
        SELECT
          p.id, p.name, p.price, p.cost_price,
          p.category_id, cat.name as category_name,
          COALESCE(SUM(oi.quantity::int), 0) as units_sold,
          COALESCE(SUM(oi.price::numeric * oi.quantity::int), 0) as revenue,
          COALESCE(SUM((oi.price::numeric - COALESCE(p.cost_price, 0)) * oi.quantity::int), 0) as net_profit
        FROM orders o,
        LATERAL jsonb_to_recordset(o.items) AS oi(product_id int, quantity int, price numeric)
        LEFT JOIN products p ON p.id = oi.product_id
        LEFT JOIN categories cat ON cat.id = p.category_id
        WHERE o.bot_id = %s AND o.status IN {valid_statuses} {date_clause}
        GROUP BY p.id, p.name, p.price, p.cost_price, p.category_id, cat.name
        ORDER BY revenue DESC
    """
    products = db.q(sql, tuple(params), fetch=True) or []
    
    summary_sql = f"""
        SELECT
          COALESCE(SUM(oi.price::numeric * oi.quantity::int), 0) as revenue,
          COALESCE(SUM(COALESCE(p.cost_price, 0) * oi.quantity::int), 0) as cost
        FROM orders o,
        LATERAL jsonb_to_recordset(o.items) AS oi(product_id int, quantity int, price numeric)
        LEFT JOIN products p ON p.id = oi.product_id
        WHERE o.bot_id = %s AND o.status IN {valid_statuses} {date_clause}
    """
    summary = db.q(summary_sql, tuple(params), fetch_one=True) or {"revenue": 0, "cost": 0}
    total_rev = float(summary.get("revenue") or 0)
    total_cost = float(summary.get("cost") or 0)
    net_profit = total_rev - total_cost
    margin = (net_profit / total_rev * 100) if total_rev > 0 else 0
    
    categories = db.q("SELECT id, name FROM categories WHERE bot_id=%s ORDER BY name", (bot_id,), fetch=True) or []
    
    prod_list = []
    for prod in products:
        p_dict = dict(prod)
        price_val = float(p_dict.get("price") or 0)
        cost_val = float(p_dict.get("cost_price")) if p_dict.get("cost_price") is not None else None
        sold_val = int(p_dict.get("units_sold") or 0)
        rev_val = float(p_dict.get("revenue") or 0)
        
        np_val = (price_val - cost_val) * sold_val if cost_val is not None else None
        mp_val = round(((price_val - cost_val) / price_val * 100), 1) if cost_val is not None and price_val > 0 else None
        
        p_dict["net_profit"] = round(np_val, 2) if np_val is not None else None
        p_dict["margin_pct"] = mp_val
        prod_list.append(p_dict)
    
    from common import serialize
    return {
        "total_revenue": round(total_rev, 2),
        "total_cost": round(total_cost, 2),
        "total_profit": round(net_profit, 2),
        "margin_pct": round(margin, 1),
        "today_profit": round(net_profit, 2),
        "summary": {
            "total_revenue": round(total_rev, 2),
            "total_cost": round(total_cost, 2),
            "net_profit": round(net_profit, 2),
            "margin_percentage": round(margin, 1)
        },
        "products": serialize(prod_list),
        "categories": serialize(categories)
    }

# ── Enhanced /orders Route with Source Filtering and Pagination ──────────────
_orders_routes_to_remove = [r for r in list(router.routes) if hasattr(r, 'path') and r.path == '/orders' and 'GET' in getattr(r, 'methods', [])]
for r in _orders_routes_to_remove:
    router.routes.remove(r)

@router.get('/orders', tags=['Orders'])
def get_orders_enhanced(
    bot_id: Optional[int] = None,
    source: Optional[str] = 'all',
    status: Optional[str] = 'all',
    limit: int = 50,
    offset: int = 0,
    ctx: UserCtx = Depends(require_token)
):
    where_clauses = []
    params = []

    if bot_id:
        if not ctx.is_superadmin and bot_id not in ctx.bot_ids:
            raise HTTPException(403, "Access denied")
        where_clauses.append("o.bot_id = %s")
        params.append(bot_id)
    elif not ctx.is_superadmin:
        if not ctx.bot_ids:
            return []
        placeholders = ", ".join(["%s"] * len(ctx.bot_ids))
        where_clauses.append(f"o.bot_id IN ({placeholders})")
        params.extend(ctx.bot_ids)

    if status and status != 'all':
        if status == 'pending':
            where_clauses.append("o.status IN ('pending', 'pending_review', 'pending_payment')")
        elif status == 'rejected':
            where_clauses.append("o.status IN ('rejected', 'payment_failed')")
        else:
            where_clauses.append("o.status = %s")
    # where_clauses.append("o.status NOT IN (pending_payment)")

    if source and source != 'all':
        if source == 'telegram':
            where_clauses.append("(o.user_id IS NOT NULL OR (o.buyer_snapshot->>'telegram_id' IS NOT NULL AND o.buyer_snapshot->>'telegram_id' ~ '^[0-9]{6,11}$' AND (o.buyer_snapshot->>'email' IS NULL OR o.buyer_snapshot->>'email' NOT LIKE '%%@%%')))")
        elif source == 'website':
            where_clauses.append("(o.source = 'website' OR ((o.buyer_snapshot->>'firebase_uid' IS NOT NULL AND o.buyer_snapshot->>'firebase_uid' != '') OR (o.buyer_snapshot->>'email' IS NOT NULL AND o.buyer_snapshot->>'email' LIKE '%%@%%')))")
        elif source == 'guest':
            where_clauses.append("(o.source = 'guest' OR (NOT (o.user_id IS NOT NULL OR (o.buyer_snapshot->>'telegram_id' IS NOT NULL AND o.buyer_snapshot->>'telegram_id' ~ '^[0-9]{6,11}$')) AND NOT ((o.buyer_snapshot->>'firebase_uid' IS NOT NULL AND o.buyer_snapshot->>'firebase_uid' != '') OR (o.buyer_snapshot->>'email' IS NOT NULL AND o.buyer_snapshot->>'email' LIKE '%%@%%'))))")

    where_str = (" WHERE " + " AND ".join(where_clauses)) if where_clauses else ""

    sql = f"""
        SELECT sub.* FROM (
            SELECT 
                o.*,
                COALESCE(
                    u.profile_picture,
                    cp.photo_url,
                    o.buyer_snapshot->>'photo_url',
                    o.buyer_snapshot->>'profile_picture'
                ) AS resolved_photo_url,
                COALESCE(
                    NULLIF(TRIM(CONCAT(u.first_name, ' ', u.last_name)), ''),
                    u.username,
                    cp.display_name,
                    o.buyer_snapshot->>'full_name',
                    o.buyer_snapshot->>'name',
                    o.buyer_snapshot->>'telegram_name'
                ) AS resolved_customer_name,
                CASE
                    WHEN o.source = 'guest' THEN 'guest'
                    WHEN o.source = 'website' THEN 'website'
                    WHEN (o.user_id IS NOT NULL OR (o.buyer_snapshot->>'telegram_id' IS NOT NULL AND o.buyer_snapshot->>'telegram_id' ~ '^[0-9]{{6,11}}$' AND (o.buyer_snapshot->>'email' IS NULL OR o.buyer_snapshot->>'email' NOT LIKE '%%@%%'))) THEN 'telegram'
                    WHEN ((o.buyer_snapshot->>'firebase_uid' IS NOT NULL AND o.buyer_snapshot->>'firebase_uid' != '') OR (o.buyer_snapshot->>'email' IS NOT NULL AND o.buyer_snapshot->>'email' LIKE '%%@%%')) THEN 'website'
                    ELSE 'guest'
                END AS source,
                ROW_NUMBER() OVER (PARTITION BY o.id ORDER BY u.id NULLS LAST, cp.id NULLS LAST) as rn
            FROM orders o
            LEFT JOIN users u ON (o.buyer_snapshot->>'telegram_id' IS NOT NULL AND o.buyer_snapshot->>'telegram_id' != '' AND u.telegram_id::text = o.buyer_snapshot->>'telegram_id') OR (o.user_id IS NOT NULL AND u.id = o.user_id)
            LEFT JOIN customer_profiles cp ON (
                (o.buyer_snapshot->>'firebase_uid' IS NOT NULL AND o.buyer_snapshot->>'firebase_uid' != '' AND cp.uid = o.buyer_snapshot->>'firebase_uid')
                OR (o.buyer_snapshot->>'email' IS NOT NULL AND o.buyer_snapshot->>'email' != '' AND cp.email = o.buyer_snapshot->>'email')
            ) AND cp.bot_id = o.bot_id
            {where_str}
        ) sub
        WHERE sub.rn = 1
        ORDER BY sub.created_at DESC
        LIMIT %s OFFSET %s
    """
    params.extend([limit, offset])

    rows = db.q(sql, tuple(params), fetch=True) or []
    from common import serialize
    res = serialize(rows)
    for r in res:
        if isinstance(r, dict):
            bs = r.get('buyer_snapshot') or {}
            if not isinstance(bs, dict):
                bs = {}
            if r.get('resolved_photo_url'):
                bs['photo_url'] = r['resolved_photo_url']
                bs['profile_picture'] = r['resolved_photo_url']
            if r.get('resolved_customer_name'):
                bs['full_name'] = r['resolved_customer_name']
                bs['name'] = r['resolved_customer_name']
            r['buyer_snapshot'] = bs
    return res

# ── Superadmin MyanMyanPay Merchant Management ──────────────────────────────
@router.get('/admin/mmpay/merchants', tags=['Superadmin MMPay'])
def get_admin_mmpay_merchants(ctx: UserCtx = Depends(require_token)):
    if not ctx.is_superadmin:
        raise HTTPException(403, "Superadmin access required")
    
    rows = db.q(
        """SELECT m.id, m.bot_id, m.app_id, m.publishable_key, m.secret_key, m.enabled, m.created_at, m.updated_at,
                  b.bot_full_name, b.bot_username, b.public_slug
           FROM shop_payment_merchants m
           LEFT JOIN managed_bots b ON m.bot_id = b.id
           ORDER BY m.updated_at DESC""",
        fetch=True
    ) or []
    
    import os
    from cryptography.hazmat.primitives.ciphers.aead import AESGCM
    enc_key_hex = os.environ.get("MMPAY_SHOP_ENC_KEY", "4e0bd286bd51e94596b73e37f20a4d228a7fdf046baf68cf3321a1a0ae070369")
    
    def decrypt_secret(stored):
        try:
            parts = str(stored).split(':')
            if len(parts) != 3: return ""
            nonce = bytes.fromhex(parts[0])
            tag = bytes.fromhex(parts[1])
            data = bytes.fromhex(parts[2])
            aesgcm = AESGCM(bytes.fromhex(enc_key_hex))
            return aesgcm.decrypt(nonce, data + tag, None).decode('utf-8')
        except Exception:
            return ""

    from common import serialize
    result = serialize(rows)
    for r in result:
        pk_plain = decrypt_secret(r.get('publishable_key', ''))
        sk_plain = decrypt_secret(r.get('secret_key', ''))
        r['app_id_decrypted'] = decrypt_secret(r.get('app_id', ''))
        r['publishable_key_masked'] = '••••••••••••••••••••••••••••••••' if pk_plain else ''
        r['secret_key_masked'] = '••••••••••••••••••••••••••••••••' if sk_plain else ''
    return result

@router.post('/admin/mmpay/save-merchant', tags=['Superadmin MMPay'])
def save_admin_mmpay_merchant(data: dict = Body(...), ctx: UserCtx = Depends(require_token)):
    if not ctx.is_superadmin:
        raise HTTPException(403, "Superadmin access required")
    
    bot_id = data.get("bot_id")
    app_id = (data.get("app_id") or "").strip()
    publishable_key = (data.get("publishable_key") or "").strip()
    secret_key = (data.get("secret_key") or "").strip()
    enabled = bool(data.get("enabled", True))
    
    if not bot_id or not app_id:
        raise HTTPException(400, "bot_id and app_id are required")
        
    import os
    from cryptography.hazmat.primitives.ciphers.aead import AESGCM
    enc_key_hex = os.environ.get("MMPAY_SHOP_ENC_KEY", "4e0bd286bd51e94596b73e37f20a4d228a7fdf046baf68cf3321a1a0ae070369")
    
    def encrypt_secret(plain: str) -> str:
        key = bytes.fromhex(enc_key_hex)
        aesgcm = AESGCM(key)
        nonce = os.urandom(12)
        ct = aesgcm.encrypt(nonce, plain.encode('utf-8'), None)
        tag = ct[-16:]
        data_bytes = ct[:-16]
        return f"{nonce.hex()}:{tag.hex()}:{data_bytes.hex()}"

    existing = db.q("SELECT id, publishable_key, secret_key FROM shop_payment_merchants WHERE bot_id=%s", (bot_id,), fetch_one=True)
    
    enc_app = encrypt_secret(app_id)
    
    if existing:
        # Preserve existing keys if submitted as masked bullets (••••)
        if not publishable_key or '••••' in publishable_key or '*' in publishable_key:
            enc_pk = existing['publishable_key']
        else:
            enc_pk = encrypt_secret(publishable_key)

        if not secret_key or '••••' in secret_key or '*' in secret_key:
            enc_sk = existing['secret_key']
        else:
            enc_sk = encrypt_secret(secret_key)

        db.q(
            "UPDATE shop_payment_merchants SET app_id=%s, publishable_key=%s, secret_key=%s, enabled=%s, updated_at=NOW() WHERE bot_id=%s",
            (enc_app, enc_pk, enc_sk, enabled, bot_id)
        )
    else:
        if not publishable_key or not secret_key:
            raise HTTPException(400, "Publishable key and secret key are required for new merchants")
        enc_pk = encrypt_secret(publishable_key)
        enc_sk = encrypt_secret(secret_key)
        db.q(
            "INSERT INTO shop_payment_merchants (bot_id, app_id, publishable_key, secret_key, enabled) VALUES (%s, %s, %s, %s, %s)",
            (bot_id, enc_app, enc_pk, enc_sk, enabled)
        )
    return {"success": True}

@router.delete('/admin/mmpay/merchant/{bot_id}', tags=['Superadmin MMPay'])
def delete_admin_mmpay_merchant(bot_id: int, ctx: UserCtx = Depends(require_token)):
    if not ctx.is_superadmin:
        raise HTTPException(403, "Superadmin access required")
    db.q("DELETE FROM shop_payment_merchants WHERE bot_id=%s", (bot_id,))
    return {"success": True}

# ── Shop Owner MMPay Toggle Endpoints ──────────────────────────────
@router.get('/payment-settings/mmpay/{bot_id}', tags=['Shop MMPay Settings'])
def get_shop_mmpay_status(bot_id: int, ctx: UserCtx = Depends(require_token)):
    row = db.q("SELECT enabled, shop_enabled FROM shop_payment_merchants WHERE bot_id=%s", (bot_id,), fetch_one=True)
    if not row:
        return {"configured": False, "superadmin_enabled": False, "shop_enabled": False}
    return {
        "configured": True,
        "superadmin_enabled": bool(row.get("enabled")),
        "shop_enabled": bool(row.get("shop_enabled", True))
    }

@router.post('/payment-settings/mmpay-toggle/{bot_id}', tags=['Shop MMPay Settings'])
def toggle_shop_mmpay(bot_id: int, data: dict = Body(...), ctx: UserCtx = Depends(require_token)):
    shop_enabled = bool(data.get("shop_enabled", True))
    row = db.q("SELECT id FROM shop_payment_merchants WHERE bot_id=%s", (bot_id,), fetch_one=True)
    if not row:
        raise HTTPException(400, "MMPay is not configured by Superadmin for this bot yet")
    db.q("UPDATE shop_payment_merchants SET shop_enabled=%s, updated_at=NOW() WHERE bot_id=%s", (shop_enabled, bot_id))
    return {"success": True, "shop_enabled": shop_enabled}


# ── Shop Backup Endpoints & Delivery ──────────────────────────────
import os
import csv
import zipfile
import shutil
import requests
from datetime import datetime

def generate_shop_backup_zip(bot_id: int, target_date=None) -> str:
    """Generates a daily ZIP archive for a shop containing CSVs and chat transcripts for a specific day (12:00 AM - 11:59 PM)."""
    import pytz
    from datetime import datetime, time, timedelta

    bot = db.q("SELECT id, bot_full_name, bot_username, currency, plan_name FROM managed_bots WHERE id=%s", (bot_id,), fetch_one=True)
    if not bot:
        raise HTTPException(404, f"Bot #{bot_id} not found")

    mm_tz = pytz.timezone('Asia/Yangon')
    now_mm = datetime.now(mm_tz)

    if not target_date:
        target_date = now_mm.date()
    elif isinstance(target_date, str):
        target_date = datetime.strptime(target_date, '%Y-%m-%d').date()

    start_dt = mm_tz.localize(datetime.combine(target_date, time(0, 0, 0)))
    end_dt = mm_tz.localize(datetime.combine(target_date, time(23, 59, 59)))

    zip_name = str(target_date.day) + '_' + target_date.strftime('%m_%Y') + '.zip'

    out_dir = '/tmp/shop_backup_' + str(bot_id) + '_' + datetime.now().strftime('%Y%m%d_%H%M%S')
    os.makedirs(out_dir + '/chats', exist_ok=True)

    products = db.q(
        "SELECT id, name, price, cost_price, is_active, created_at FROM products WHERE bot_id=%s AND created_at >= %s AND created_at <= %s ORDER BY id ASC",
        (bot_id, start_dt, end_dt), fetch=True
    ) or []
    with open(out_dir + '/Products.csv', 'w', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        writer.writerow(["Product ID", "Product Name", "Price", "Cost Price", "Is Active", "Created At"])
        for p in products:
            writer.writerow([p.get("id"), p.get("name"), p.get("price"), p.get("cost_price", 0), p.get("is_active"), p.get("created_at")])

    orders = db.q(
        "SELECT id, order_number, total_amount, payment_method, status, created_at FROM orders WHERE bot_id=%s AND created_at >= %s AND created_at <= %s ORDER BY id DESC",
        (bot_id, start_dt, end_dt), fetch=True
    ) or []
    with open(out_dir + '/Orders.csv', 'w', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        writer.writerow(["Order ID", "Order Number", "Total Amount", "Payment Method", "Status", "Date & Time"])
        for o in orders:
            writer.writerow([o.get("id"), o.get("order_number"), o.get("total_amount"), o.get("payment_method"), o.get("status"), o.get("created_at")])

    customers = db.q(
        "SELECT id, display_name, phone, email, points_balance, created_at FROM website_customers WHERE bot_id=%s AND created_at >= %s AND created_at <= %s ORDER BY id DESC",
        (bot_id, start_dt, end_dt), fetch=True
    ) or []
    with open(out_dir + '/Customers.csv', 'w', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        writer.writerow(["Customer ID", "Display Name", "Phone Number", "Email", "Points Balance", "Joined Date"])
        for c in customers:
            writer.writerow([c.get("id"), c.get("display_name"), c.get("phone"), c.get("email"), c.get("points_balance"), c.get("created_at")])

    chats = db.q(
        "SELECT visitor_id, sender_name, sender_type, message_text, created_at FROM chat_messages WHERE bot_id=%s AND created_at >= %s AND created_at <= %s ORDER BY created_at ASC",
        (bot_id, start_dt, end_dt), fetch=True
    ) or []
    chats_by_visitor = {}
    for c in chats:
        v = c.get("visitor_id") or "unknown"
        chats_by_visitor.setdefault(v, []).append(c)

    date_str = target_date.strftime('%d/%m/%Y')
    for visitor, msgs in chats_by_visitor.items():
        clean_v = "".join(x for x in str(visitor) if x.isalnum() or x in ("_", "-"))
        if not clean_v:
            clean_v = "guest"
        with open(out_dir + '/chats/' + clean_v + '.txt', 'w', encoding='utf-8') as f:
            f.write('=== CHAT TRANSCRIPT FOR ' + str(visitor) + ' (' + str(date_str) + ') ===' + chr(10) + chr(10))
            for m in msgs:
                created_at = m.get("created_at")
                time_str = created_at.strftime("%Y-%m-%d %H:%M:%S") if hasattr(created_at, "strftime") else str(created_at)
                sender = m.get("sender_name") or m.get("sender_type") or "User"
                text = m.get("message_text") or ""
                f.write('[' + str(time_str) + '] ' + str(sender) + ': ' + str(text) + chr(10))

    zip_path = '/tmp/' + zip_name
    with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as z:
        for root, _, files in os.walk(out_dir):
            for file in files:
                full_path = os.path.join(root, file)
                rel_path = os.path.relpath(full_path, out_dir)
                z.write(full_path, rel_path)

    try:
        shutil.rmtree(out_dir)
    except Exception:
        pass

    return zip_path


def send_backup_zip_to_owner(bot_id: int, zip_path: str, is_auto: bool = False):
    """Sends the generated backup ZIP file to the Bot Owner via Telegram."""
    bot = db.q("SELECT bot_token, owner_telegram_id, bot_full_name FROM managed_bots WHERE id=%s", (bot_id,), fetch_one=True)
    if not bot or not bot.get("owner_telegram_id") or not bot.get("bot_token"):
        raise HTTPException(400, "Bot owner Telegram ID or bot token is not configured.")

    owner_id = bot["owner_telegram_id"]
    token = bot["bot_token"]
    bot_name = bot.get("bot_full_name") or "Shop"
    now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    caption = (
        f"✅ **Daily Auto-Backup (12:00 AM)**\n📅 Date: {now_str}\n🏪 Shop: {bot_name}\n\nHere is your daily shop data backup (Products, Orders, Customers, Chat Transcripts)."
        if is_auto else
        f"✅ **Manual Shop Backup**\n📅 Date: {now_str}\n🏪 Shop: {bot_name}\n\nHere is your full shop data backup file."
    )

    with open(zip_path, "rb") as f:
        resp = requests.post(
            f"https://api.telegram.org/bot{token}/sendDocument",
            data={"chat_id": owner_id, "caption": caption, "parse_mode": "Markdown"},
            files={"document": (os.path.basename(zip_path), f, "application/zip")},
            timeout=60
        )
        if not resp.ok:
            raise HTTPException(500, f"Telegram upload failed: {resp.text}")

    db.q("UPDATE managed_bots SET last_daily_backup_at=NOW() WHERE id=%s", (bot_id,))


@router.get('/backup/settings/{bot_id}', tags=['Shop Backup'])
def get_backup_settings(bot_id: int, ctx: UserCtx = Depends(require_token)):
    row = db.q("SELECT daily_backup_enabled, last_daily_backup_at FROM managed_bots WHERE id=%s", (bot_id,), fetch_one=True)
    if not row:
        return {"daily_backup_enabled": False, "last_daily_backup_at": None}
    last_at = row.get("last_daily_backup_at")
    return {
        "daily_backup_enabled": bool(row.get("daily_backup_enabled")),
        "last_daily_backup_at": last_at.isoformat() if hasattr(last_at, "isoformat") else str(last_at) if last_at else None
    }


@router.post('/backup/toggle/{bot_id}', tags=['Shop Backup'])
def toggle_backup_settings(bot_id: int, data: dict = Body(...), ctx: UserCtx = Depends(require_token)):
    enabled = bool(data.get("daily_backup_enabled", False))
    db.q("UPDATE managed_bots SET daily_backup_enabled=%s WHERE id=%s", (enabled, bot_id))
    return {"success": True, "daily_backup_enabled": enabled}


@router.post('/backup/trigger-manual/{bot_id}', tags=['Shop Backup'])
def trigger_manual_backup(bot_id: int, ctx: UserCtx = Depends(require_token)):
    zip_path = generate_shop_backup_zip(bot_id)
    try:
        send_backup_zip_to_owner(bot_id, zip_path, is_auto=False)
    finally:
        if os.path.exists(zip_path):
            try: os.remove(zip_path)
            except Exception: pass
    return {"success": True, "message": "Backup ZIP sent to bot owner on Telegram"}
