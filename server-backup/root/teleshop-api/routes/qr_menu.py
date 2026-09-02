"""
Qr Menu routes — split from backend.py
"""

from fastapi import APIRouter, Depends, HTTPException, Body, Header, Request
from common import db, require_token, UserCtx, serialize, scope_filter, logger, hash_phone, mask_phone, JWT_SECRET, JWT_ALGORITHM, QRMenuCategoryCreate, QRMenuItemCreate, log_staff_activity, jwt
import json, datetime, re
import time
from collections import defaultdict

# IP rate limiter: {key: [timestamp, ...]}
_rate_limits = defaultdict(list)

def _check_rate_limit(key: str, max_count: int, period: int):
    now = time.time()
    cutoff = now - period
    # Keep only recent timestamps
    _rate_limits[key] = [t for t in _rate_limits[key] if t > cutoff]
    if len(_rate_limits[key]) >= max_count:
        return False
    _rate_limits[key].append(now)
    return True

def _client_ip(request: Request):
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


router = APIRouter()

@router.get("/qr-menu/{bot_id}", tags=["QR Menu"])
def get_qr_menu_items(bot_id: int, ctx: UserCtx=Depends(require_token)):
    # QR Menu is only available on Pro and Business plans
    plan_row = db.q("SELECT plan_name FROM managed_bots WHERE id=%s", (bot_id,), fetch_one=True)
    plan = (plan_row.get("plan_name") or "Free").strip().lower() if plan_row else "free"
    if plan not in ("pro", "business", "standard"):
        raise HTTPException(403, "QR Menu is only available on Pro and Business plans")
    items = db.q(
        "SELECT * FROM qr_menu_items WHERE bot_id=%s ORDER BY sort_order NULLS LAST, created_at DESC",
        (bot_id,), fetch=True
    )
    return serialize(items)

@router.put("/qr-menu/{item_id}", tags=["QR Menu"])
def update_qr_menu_item(item_id: int, data: dict=Body(...), ctx: UserCtx=Depends(require_token)):
    allowed = {"name","description","price","image_url","category_id","badges","is_available","data"}
    fields = {k: v for k, v in data.items() if k in allowed}
    if not fields: raise HTTPException(400, "No valid fields")
    set_clause = ", ".join(k + "=%s" for k in fields)
    db.q("UPDATE qr_menu_items SET " + set_clause + ", updated_at=NOW() WHERE id=%s", (*fields.values(), item_id))
    item = db.q("SELECT name, bot_id FROM qr_menu_items WHERE id=%s", (item_id,), fetch_one=True)
    if item:
        changed = ", ".join(fields.keys())
        log_staff_activity(ctx, item["bot_id"], f"updated QR menu item '{item['name']}' (changed: {changed})")
    return {"success": True}

@router.delete("/qr-menu/{item_id}", tags=["QR Menu"])
def delete_qr_menu_item(item_id: int, ctx: UserCtx=Depends(require_token)):
    item = db.q("SELECT name, bot_id FROM qr_menu_items WHERE id=%s", (item_id,), fetch_one=True)
    name_str = " ('" + item["name"] + "')" if item else ""
    log_staff_activity(ctx, item["bot_id"] if item else 0, "deleted QR menu item #" + str(item_id) + name_str)
    db.q("DELETE FROM qr_menu_items WHERE id=%s", (item_id,))
    return {"success": True}

@router.get("/qr-menu/{bot_id}/categories", tags=["QR Menu"])
def get_qr_menu_categories(bot_id: int, ctx: UserCtx=Depends(require_token)):
    # QR Menu is only available on Pro and Business plans
    plan_row = db.q("SELECT plan_name FROM managed_bots WHERE id=%s", (bot_id,), fetch_one=True)
    plan = (plan_row.get("plan_name") or "Free").strip().lower() if plan_row else "free"
    if plan not in ("pro", "business", "standard"):
        raise HTTPException(403, "QR Menu is only available on Pro and Business plans")
    return serialize(db.q("SELECT * FROM qr_menu_categories WHERE bot_id=%s ORDER BY sort_order NULLS LAST, name", (bot_id,), fetch=True))

@router.post("/qr-menu/categories", tags=["QR Menu"])
def create_qr_menu_category(p: QRMenuCategoryCreate, ctx: UserCtx=Depends(require_token)):
    bot_id = p.bot_id
    # QR Menu is only available on Pro and Business plans
    plan_row = db.q("SELECT plan_name FROM managed_bots WHERE id=%s", (bot_id,), fetch_one=True)
    plan = (plan_row.get("plan_name") or "Free").strip().lower() if plan_row else "free"
    if plan not in ("pro", "business", "standard"):
        raise HTTPException(403, "QR Menu is only available on Pro and Business plans")
    result = db.q(
        "INSERT INTO qr_menu_categories (bot_id,name,icon) VALUES (%s,%s,%s) RETURNING id, created_at",
        (p.bot_id, p.name, p.icon), fetch_one=True
    )
    log_staff_activity(ctx, p.bot_id, "created QR menu category " + p.name)
    return {"success": True, "id": result["id"] if result else None}

@router.put("/qr-menu/categories/{cat_id}", tags=["QR Menu"])
def update_qr_menu_category(cat_id: int, data: dict=Body(...), ctx: UserCtx=Depends(require_token)):
    allowed = {"name", "sort_order", "icon"}
    fields = {k: v for k, v in data.items() if k in allowed}
    if not fields: raise HTTPException(400, "No valid fields")
    set_clause = ", ".join(k + "=%s" for k in fields)
    db.q("UPDATE qr_menu_categories SET " + set_clause + " WHERE id=%s", (*fields.values(), cat_id))
    cat = db.q("SELECT name, bot_id FROM qr_menu_categories WHERE id=%s", (cat_id,), fetch_one=True)
    if cat:
        changed = ", ".join(fields.keys())
        log_staff_activity(ctx, cat["bot_id"], f"updated QR menu category '{cat['name']}' (changed: {changed})")
    return {"success": True}

@router.delete("/qr-menu/categories/{cat_id}", tags=["QR Menu"])
def delete_qr_menu_category(cat_id: int, ctx: UserCtx=Depends(require_token)):
    cat = db.q("SELECT name FROM qr_menu_categories WHERE id=%s", (cat_id,), fetch_one=True)
    db.q("UPDATE qr_menu_items SET category_id=NULL WHERE category_id=%s", (cat_id,))
    db.q("DELETE FROM qr_menu_categories WHERE id=%s", (cat_id,))
    name_str = " ('" + cat["name"] + "')" if cat else ""
    log_staff_activity(ctx, 0, "deleted QR menu category #" + str(cat_id) + name_str)
    return {"success": True}

# ─────────────────────────────────────────────
#  QR MENU — Orders (only orders with qr menu items)
# ─────────────────────────────────────────────

@router.get("/qr-menu/{bot_id}/orders", tags=["QR Menu"])
def get_qr_menu_orders(bot_id: int, limit: int=100, offset: int=0, ctx: UserCtx=Depends(require_token)):
    bf, bp = scope_filter(ctx, "o", bot_id)
    filter_clause = ""
    params = []
    if bf:
        filter_clause = bf.replace("WHERE ", "AND ")
        params.extend(bp)
    like_pattern = '%"item_id"%'
    all_params = [like_pattern] + params + [limit, offset]
    rows = db.q("SELECT o.*, u.first_name, u.last_name, u.username, u.telegram_id "
        "FROM orders o LEFT JOIN users u ON u.id=o.user_id "
        "WHERE o.items::text LIKE %s " + filter_clause + " "
        "ORDER BY o.created_at DESC LIMIT %s OFFSET %s", all_params, fetch=True)
    return serialize(rows)

# ─────────────────────────────────────────────
#  SHOP STATUS — Toggle open/close
# ─────────────────────────────────────────────

@router.get("/public/qr-menu/{slug}", tags=["Public QR Menu"])
def get_public_qr_menu(slug: str):
    row = db.q(
        "SELECT id, bot_full_name, bot_username, currency, plan_name, profile_picture, public_slug FROM managed_bots "
        "WHERE public_slug=%s",
        (slug,), fetch_one=True
    )
    if not row:
        raise HTTPException(404, "Shop not found")

    bot_id = row["id"]

    # Check shop open/closed
    shop_settings = db.q(
        "SELECT content_data FROM content_blocks WHERE bot_id=%s AND key='shop_settings'",
        (bot_id,), fetch_one=True
    )
    is_open = True; payment_mode = "postpaid"; business_mode = "restaurant"; qr_labels = {}; dual_mode_enabled = False; order_flow_mode = "postpaid"; qr_landing = {}; points_settings = {}
    if shop_settings and shop_settings["content_data"]:
        cd = shop_settings["content_data"]
        if isinstance(cd, dict):
            is_open = cd.get("is_open", True)
            payment_mode = cd.get("payment_mode", "postpaid")
            business_mode = cd.get("business_mode", "restaurant")
            qr_labels = cd.get("qr_labels", {})
            dual_mode_enabled = cd.get("dual_mode_enabled", False)
            order_flow_mode = cd.get("order_flow_mode", "postpaid")
            qr_landing = cd.get("qr_landing", {})
            points_settings = cd.get("points_settings", {})

    if not is_open:
        return {"shop": serialize(row), "items": [], "categories": [], "theme": "default", "is_open": False, "payment_mode": payment_mode, "business_mode": business_mode, "qr_labels": qr_labels, "dual_mode_enabled": dual_mode_enabled, "order_flow_mode": order_flow_mode, "qr_landing": qr_landing, "banners": [], "payment_methods": [], "cod_enabled": False, "points_settings": points_settings}

    # Fetch theme
    theme_row = db.q(
        "SELECT content_data FROM content_blocks WHERE bot_id=%s AND key='shop_theme'",
        (bot_id,), fetch_one=True
    )
    theme = "default"
    if theme_row and theme_row["content_data"]:
        td = theme_row["content_data"]
        if isinstance(td, str): td = json.loads(td)
        if isinstance(td, dict):
            theme = td.get("theme", "default")

    items = serialize(db.q(
        "SELECT * FROM qr_menu_items WHERE bot_id=%s AND is_available=TRUE ORDER BY sort_order NULLS LAST, created_at DESC",
        (bot_id,), fetch=True
    ))

    categories = serialize(db.q(
        "SELECT * FROM qr_menu_categories WHERE bot_id=%s ORDER BY sort_order NULLS LAST, name",
        (bot_id,), fetch=True
    ))

    # Fetch menu banners
    banners_block = db.q(
        "SELECT content_data FROM content_blocks WHERE bot_id=%s AND key='menu_banners'",
        (bot_id,), fetch_one=True
    )
    banners = []
    if banners_block and banners_block["content_data"]:
        bd = banners_block["content_data"]
        if isinstance(bd, str):
            bd = json.loads(bd)
        if isinstance(bd, dict) and "banners" in bd and isinstance(bd["banners"], list):
            banners = [b for b in bd["banners"] if isinstance(b, dict) and b.get("file_id")]

    payment_methods = serialize(db.q(
        "SELECT id, name, account_name, payment_number, description, qr_code_url, notes FROM payment_methods WHERE bot_id=%s AND is_active=TRUE ORDER BY name",
        (bot_id,), fetch=True
    ))

    # Fetch COD settings
    cod_row = db.q(
        "SELECT content_data FROM content_blocks WHERE bot_id=%s AND key='cod_settings'",
        (bot_id,), fetch_one=True
    )
    cod_enabled = False
    if cod_row and cod_row["content_data"]:
        cod_enabled = cod_row["content_data"].get("cod_enabled", False)

    return {
        "shop": serialize(row),
        "items": items,
        "categories": categories,
        "theme": theme,
        "is_open": is_open,
        "banners": banners,
        "payment_mode": payment_mode,
        "business_mode": business_mode,
        "qr_labels": qr_labels,
        "dual_mode_enabled": dual_mode_enabled,
        "order_flow_mode": order_flow_mode,
        "qr_landing": qr_landing,
        "payment_methods": payment_methods,
        "cod_enabled": cod_enabled,
        "points_settings": points_settings,
    }




@router.post("/public/qr-menu/{slug}/assign-token", tags=["Public QR Menu"])
def assign_qr_token(slug: str, request: Request):
    ip = _client_ip(request)
    if not _check_rate_limit(f"assign:{ip}", 10, 3600):
        raise HTTPException(429, "Too many tokens requested. Please try again later.")

    row = db.q(
        "SELECT id FROM managed_bots WHERE public_slug=%s",
        (slug,), fetch_one=True
    )
    if not row:
        raise HTTPException(404, "Shop not found")
    bot_id = row["id"]
    
    tq_row = db.q(
        "SELECT content_data FROM content_blocks WHERE bot_id=%s AND key='token_queue'",
        (bot_id,), fetch_one=True
    )
    tq = {"current": 0, "next": 1, "assigned": []}
    if tq_row and tq_row["content_data"]:
        cd = tq_row["content_data"]
        if isinstance(cd, str):
            cd = json.loads(cd)
        if isinstance(cd, dict):
            tq = cd
    
    token_num = tq.get("next", 1)
    assigned = tq.get("assigned", [])
    assigned.append(token_num)
    tq["next"] = token_num + 1
    tq["assigned"] = assigned
    
    db.q(
        "INSERT INTO content_blocks (bot_id, key, content_data) VALUES (%s, 'token_queue', %s) "
        "ON CONFLICT (bot_id, key) DO UPDATE SET content_data=%s",
        (bot_id, json.dumps(tq), json.dumps(tq))
    )
    return {"token_number": token_num, "token_queue": tq}
    
@router.post("/public/qr-menu/{slug}/cancel-token", tags=["Public QR Menu"])
def cancel_qr_token(slug: str, data: dict = Body(...), request: Request = None):
    ip = _client_ip(request) if request else "unknown"
    if not _check_rate_limit(f"cancel:{ip}", 2, 3600):
        raise HTTPException(429, "Too many cancel attempts. Please try again later.")

    token_number = data.get("token_number")
    if not token_number:
        raise HTTPException(400, "token_number required")
    row = db.q("SELECT id FROM managed_bots WHERE public_slug=%s", (slug,), fetch_one=True)
    if not row:
        raise HTTPException(404, "Shop not found")
    bot_id = row["id"]
    tq_row = db.q("SELECT content_data FROM content_blocks WHERE bot_id=%s AND key='token_queue'",
                  (bot_id,), fetch_one=True)
    tq = {"current": 0, "next": 1, "assigned": []}
    if tq_row and tq_row["content_data"]:
        cd = tq_row["content_data"]
        if isinstance(cd, str): cd = json.loads(cd)
        if isinstance(cd, dict): tq = cd
    if token_number <= tq.get("current", 0):
        raise HTTPException(400, "Cannot cancel - token is being served or already completed")
    assigned = tq.get("assigned", [])
    if token_number not in assigned:
        raise HTTPException(404, "Token not found in queue")
    assigned.remove(token_number)
    tq["assigned"] = assigned
    db.q(
        "INSERT INTO content_blocks (bot_id, key, content_data) VALUES (%s,'token_queue',%s) "
        "ON CONFLICT (bot_id, key) DO UPDATE SET content_data=%s",
        (bot_id, json.dumps(tq), json.dumps(tq))
    )
    return {"ok": True}

@router.get("/public/qr-menu/{slug}/token-queue", tags=["Public QR Menu"])
def get_token_queue(slug: str):
    row = db.q(
        "SELECT id FROM managed_bots WHERE public_slug=%s",
        (slug,), fetch_one=True
    )
    if not row:
        raise HTTPException(404, "Shop not found")
    bot_id = row["id"]
    
    tq_row = db.q(
        "SELECT content_data FROM content_blocks WHERE bot_id=%s AND key='token_queue'",
        (bot_id,), fetch_one=True
    )
    tq = {"current": 0, "next": 1, "assigned": []}
    if tq_row and tq_row["content_data"]:
        cd = tq_row["content_data"]
        if isinstance(cd, str):
            cd = json.loads(cd)
        if isinstance(cd, dict):
            tq = cd
    
    return {"token_queue": tq}

@router.get("/qr-menu/{bot_id}/orders/pending-count", tags=["QR Menu"])
def get_qr_menu_pending_orders_count(bot_id: int, ctx: UserCtx = Depends(require_token)):
    bf, bp = scope_filter(ctx, "o", bot_id)
    filter_clause = ""
    params = []
    if bf:
        filter_clause = "AND " + bf[6:]
        params.extend(bp)
    lpat = "%\"item_id\"%" + ""
    all_params = [lpat] + params
    row = db.q('SELECT COUNT(*) as c FROM orders o '
        'WHERE o.items::text LIKE %s ' + filter_clause + ' '
        "AND o.status IN ('pending', 'pending_review')", all_params, fetch_one=True)
    return {"pending": row["c"] if row else 0}


# ─────────────────────────────────────────────
#  QR MENU — CUSTOMER ID / POINTS / COUPONS
# ─────────────────────────────────────────────

@router.post("/public/qr-menu/customer/identify", tags=["Public QR Menu"])
def identify_qr_customer(data: dict = Body(...)):
    """Find or create a QR menu customer by phone number."""
    phone = data.get("phone", "").strip()
    bot_id = data.get("bot_id")
    name = data.get("name", "")
    if not phone or not bot_id:
        raise HTTPException(400, "phone and bot_id required")
    # Normalize phone: remove spaces, dashes
    phone = re.sub(r"[\s\-]+", "", phone)
    phone_hash = hash_phone(phone)
    existing = db.q("SELECT id, phone, name, points_balance, total_orders, total_spent FROM qr_customers WHERE bot_id=%s AND phone_hash=%s",
                    (bot_id, phone_hash), fetch_one=True)
    # Fallback: look up by raw phone for legacy records (before hashing was added)
    if not existing:
        existing = db.q("SELECT id, phone, name, points_balance, total_orders, total_spent FROM qr_customers WHERE bot_id=%s AND phone=%s",
                        (bot_id, phone), fetch_one=True)
        if existing and not existing.get("phone_hash"):
            # Backfill hash
            db.q("UPDATE qr_customers SET phone_hash=%s WHERE id=%s", (phone_hash, existing["id"]))
    if existing:
        return {"customer_id": existing["id"], "phone": mask_phone(existing["phone"]), "name": existing["name"],
                "points": existing["points_balance"], "total_orders": existing["total_orders"],
                "total_spent": float(existing["total_spent"]), "is_new": False}
    # Create new customer
    result = db.q("INSERT INTO qr_customers (bot_id, phone, name, phone_hash) VALUES (%s,%s,%s,%s) RETURNING id",
                  (bot_id, phone, name, phone_hash), fetch_one=True)
    # Award welcome bonus points if configured
    welcome_pts = 0
    try:
        shop_settings = db.q("SELECT content_data FROM content_blocks WHERE bot_id=%s AND key='shop_settings'", (bot_id,), fetch_one=True)
        if shop_settings and shop_settings["content_data"]:
            ps = shop_settings["content_data"].get("points_settings", {})
            if ps.get("enabled") and ps.get("welcome_bonus"):
                welcome_pts = int(ps["welcome_bonus"])
                if welcome_pts > 0:
                    db.q("UPDATE qr_customers SET points_balance=points_balance+%s WHERE id=%s", (welcome_pts, result["id"]))
                    db.q("INSERT INTO qr_points_transactions (customer_id,bot_id,points,type,description) VALUES (%s,%s,%s,'earn','Welcome bonus')",
                         (result["id"], bot_id, welcome_pts))
    except Exception as e:
        logger.warning(f"Could not award welcome points: {e}")
    return {"customer_id": result["id"], "phone": mask_phone(phone), "name": name,
            "points": welcome_pts, "total_orders": 0, "total_spent": 0, "is_new": True}


@router.post("/public/qr-menu/customer/redeem-points", tags=["Public QR Menu"])
def redeem_qr_points(data: dict = Body(...)):
    """Redeem points for a discount. Validates server-side."""
    customer_id = data.get("customer_id")
    points_raw = data.get("points_to_use", 0)
    try:
        points_to_use = int(points_raw)
    except (ValueError, TypeError):
        raise HTTPException(400, "Invalid points value")
    if points_to_use <= 0:
        raise HTTPException(400, "points_to_use must be positive")
    order_total = float(data.get("order_total", 0))
    if order_total < 0:
        order_total = 0
    bot_id = data.get("bot_id")
    if not customer_id or not bot_id:
        raise HTTPException(400, "customer_id and bot_id required")
    customer = db.q("SELECT id, points_balance, bot_id FROM qr_customers WHERE id=%s AND bot_id=%s",
                    (customer_id, bot_id), fetch_one=True)
    if not customer:
        raise HTTPException(404, "Customer not found")
    if customer["points_balance"] < points_to_use:
        raise HTTPException(400, "Insufficient points")
    # Get points settings
    points_settings = {}
    shop_settings = db.q("SELECT content_data FROM content_blocks WHERE bot_id=%s AND key='shop_settings'", (bot_id,), fetch_one=True)
    if shop_settings and shop_settings["content_data"]:
        points_settings = shop_settings["content_data"].get("points_settings", {})
    redeem_points = int(points_settings.get("redeem_points", 100)) if points_settings.get("redeem_points") else 100
    redeem_value = float(points_settings.get("redeem_value", 1000)) if points_settings.get("redeem_value") else 1000
    min_redeem = int(points_settings.get("min_redeem", 50)) if points_settings.get("min_redeem") else 50
    if points_to_use < min_redeem:
        raise HTTPException(400, f"Minimum {min_redeem} points to redeem")
    # Calculate discount: (points / redeem_points) * redeem_value
    discount = (points_to_use / redeem_points) * redeem_value
    if discount > order_total:
        discount = order_total
        points_to_use = int((discount / redeem_value) * redeem_points)
    return {"discount": round(discount, -1), "points_used": points_to_use, "remaining_points": customer["points_balance"] - points_to_use}


@router.post("/public/qr-menu/coupon/validate", tags=["Public QR Menu"])
def validate_qr_coupon(data: dict = Body(...)):
    """Validate a coupon code and return discount amount."""
    code = data.get("code", "").strip().upper()
    order_total = float(data.get("order_total", 0))
    bot_id = data.get("bot_id")
    if not code or not bot_id:
        raise HTTPException(400, "code and bot_id required")
    coupon = db.q("SELECT * FROM qr_coupons WHERE bot_id=%s AND code=%s",
                  (bot_id, code), fetch_one=True)
    if not coupon:
        return {"valid": False, "discount": 0, "message": "Invalid coupon code"}
    if not coupon["is_active"]:
        return {"valid": False, "discount": 0, "message": "This coupon has been deactivated"}
    if coupon["usage_limit"] > 0 and coupon["used_count"] >= coupon["usage_limit"]:
        return {"valid": False, "discount": 0, "message": "This coupon has reached its usage limit"}
    if coupon["expires_at"]:
        try:
            expires = coupon["expires_at"]
            if isinstance(expires, str):
                expires = datetime.datetime.fromisoformat(expires)
            if expires < datetime.datetime.now():
                return {"valid": False, "discount": 0, "message": "This coupon has expired"}
        except Exception as exc:
            pass
        currency_row = db.q("SELECT currency FROM managed_bots WHERE id=%s", (bot_id,), fetch_one=True)
    currency_code = (currency_row["currency"] or "MMK") if currency_row else "MMK"
    if coupon["min_order"] > 0 and order_total < float(coupon["min_order"]):
        return {"valid": False, "discount": 0, "message": f"Minimum order of {float(coupon['min_order']):,.0f} {currency_code} required"}
    if coupon["type"] == "percentage":
        discount = order_total * float(coupon["value"]) / 100
    else:
        discount = float(coupon["value"])
    if discount > order_total:
        discount = order_total
    return {"valid": True, "discount": round(discount, -1), "message": f"{coupon['code']} applied!",
            "coupon_code": coupon["code"], "coupon_type": coupon["type"]}


# ---------- ADMIN: QR Customers ----------

@router.get("/admin/qr-menu/customers", tags=["QR Menu"])
def get_qr_customers(bot_id: int, search: str = "", ctx: UserCtx = Depends(require_token)):
    if search:
        pattern = f"%{search}%"
        rows = db.q("SELECT id, phone, name, points_balance, total_orders, total_spent FROM qr_customers "
                    "WHERE bot_id=%s AND (phone LIKE %s OR name LIKE %s) ORDER BY updated_at DESC LIMIT 100",
                    (bot_id, pattern, pattern), fetch=True)
    else:
        rows = db.q("SELECT id, phone, name, points_balance, total_orders, total_spent FROM qr_customers "
                    "WHERE bot_id=%s ORDER BY updated_at DESC LIMIT 100",
                    (bot_id,), fetch=True)
    return serialize(rows)


@router.get("/admin/qr-menu/customers/{customer_id}", tags=["QR Menu"])
def get_qr_customer_detail(customer_id: int, bot_id: int, ctx: UserCtx = Depends(require_token)):
    customer = db.q("SELECT id, phone, name, points_balance, total_orders, total_spent, created_at FROM qr_customers "
                    "WHERE id=%s AND bot_id=%s", (customer_id, bot_id), fetch_one=True)
    if not customer:
        raise HTTPException(404, "Customer not found")
    # Get point transactions
    points_tx = db.q("SELECT id, points, type, reference_order_id, description, created_at FROM qr_points_transactions "
                     "WHERE customer_id=%s ORDER BY created_at DESC LIMIT 50", (customer_id,), fetch=True)
    # Get orders from this customer (via phone lookup)
    orders = []
    try:
        orders = db.q("SELECT id, order_number, total_amount, final_amount, status, created_at, items, buyer_snapshot FROM orders "
                      "WHERE bot_id=%s AND buyer_snapshot::text LIKE %s ORDER BY created_at DESC LIMIT 20",
                      (bot_id, f"%{customer['phone']}%"), fetch=True)
    except Exception as exc:
        pass
    log_staff_activity(ctx, bot_id, f"viewed customer #{customer_id} ({customer.get('name', '')}) details")
    result = serialize(customer)
    result["points_history"] = serialize(points_tx)
    result["orders"] = serialize(orders)
    return result


@router.post("/admin/qr-menu/customers/{customer_id}/adjust-points", tags=["QR Menu"])
def adjust_qr_customer_points(customer_id: int, data: dict = Body(...), ctx: UserCtx = Depends(require_token)):
    points = int(data.get("points", 0))
    reason = data.get("reason", "Manual adjustment")
    bot_id = data.get("bot_id")
    if not bot_id:
        raise HTTPException(400, "bot_id required")
    customer = db.q("SELECT id FROM qr_customers WHERE id=%s AND bot_id=%s", (customer_id, bot_id), fetch_one=True)
    if not customer:
        raise HTTPException(404, "Customer not found")
    if points > 0:
        db.q("UPDATE qr_customers SET points_balance=points_balance+%s, updated_at=NOW() WHERE id=%s", (points, customer_id))
        db.q("INSERT INTO qr_points_transactions (customer_id,bot_id,points,type,description) VALUES (%s,%s,%s,'earn',%s)",
             (customer_id, bot_id, points, reason))
    elif points < 0:
        db.q("UPDATE qr_customers SET points_balance=GREATEST(0, points_balance+%s), updated_at=NOW() WHERE id=%s", (points, customer_id))
        db.q("INSERT INTO qr_points_transactions (customer_id,bot_id,points,type,description) VALUES (%s,%s,%s,'redeem',%s)",
             (customer_id, bot_id, abs(points), reason))
    log_staff_activity(ctx, bot_id, f"adjusted customer #{customer_id} points by {points} ({reason})")
    return {"success": True}


# ---------- ADMIN: QR Coupons ----------

@router.get("/admin/qr-menu/coupons", tags=["QR Menu"])
def get_qr_coupons(bot_id: int, ctx: UserCtx = Depends(require_token)):
    rows = db.q("SELECT * FROM qr_coupons WHERE bot_id=%s ORDER BY created_at DESC", (bot_id,), fetch=True)
    return serialize(rows)


@router.post("/admin/qr-menu/coupons", tags=["QR Menu"])
def create_qr_coupon(data: dict = Body(...), ctx: UserCtx = Depends(require_token)):
    bot_id = data.get("bot_id")
    code = data.get("code", "").strip().upper()
    ctype = data.get("type", "percentage")
    value = float(data.get("value", 0))
    usage_limit = int(data.get("usage_limit", 0))
    min_order = float(data.get("min_order", 0))
    expires_at = data.get("expires_at")
    if not bot_id or not code or value <= 0:
        raise HTTPException(400, "bot_id, code, and value required")
    # Check duplicate
    existing = db.q("SELECT id FROM qr_coupons WHERE bot_id=%s AND code=%s", (bot_id, code), fetch_one=True)
    if existing:
        raise HTTPException(400, f"Coupon code '{code}' already exists")
    result = db.q(
        "INSERT INTO qr_coupons (bot_id, code, type, value, usage_limit, min_order, expires_at) VALUES (%s,%s,%s,%s,%s,%s,%s) RETURNING id",
        (bot_id, code, ctype, value, usage_limit, min_order, expires_at), fetch_one=True)
    log_staff_activity(ctx, bot_id, f"created coupon '{code}'")
    return {"success": True, "id": result["id"] if result else None}


@router.delete("/admin/qr-menu/coupons/{coupon_id}", tags=["QR Menu"])
def delete_qr_coupon(coupon_id: int, bot_id: int, ctx: UserCtx = Depends(require_token)):
    coupon = db.q("SELECT code FROM qr_coupons WHERE id=%s AND bot_id=%s", (coupon_id, bot_id), fetch_one=True)
    db.q("DELETE FROM qr_coupons WHERE id=%s AND bot_id=%s", (coupon_id, bot_id))
    if coupon:
        log_staff_activity(ctx, bot_id, f"deleted coupon '{coupon['code']}'")
    return {"success": True}


# ─────────────────────────────────────────────
#  QR MENU — Dashboard Stats
# ─────────────────────────────────────────────

@router.get('/qr-menu/{bot_id}/stats', tags=['QR Menu'])
def get_qr_menu_stats(bot_id: int, days: int | None = None, start_date: str | None = None, end_date: str | None = None, ctx: UserCtx = Depends(require_token)):
    bf, bp = scope_filter(ctx, 'o', bot_id)

    qr_filter = "o.items::text LIKE '%%\"item_id\"%%'"
    where_parts = [qr_filter]
    params: list = []

    if bf:
        where_parts.append(bf[6:])
        params.extend(bp)

    if days is not None:
        where_parts.append('o.created_at >= CURRENT_DATE - INTERVAL \'1 day\' * %s')
        params.append(days)
    elif start_date and end_date:
        where_parts.append('DATE(o.created_at) >= %s AND DATE(o.created_at) <= %s')
        params.extend([start_date, end_date])

    def clone_parts(extra_conditions: list[str]) -> tuple[list[str], list]:
        p = where_parts.copy()
        p.extend(extra_conditions)
        return p, list(params)

    where_all = ' AND '.join(where_parts)

    # Confirmed orders (revenue-generating)
    confirmed_parts, confirmed_params = clone_parts(["o.status IN ('confirmed','processing','shipped','delivered')"])
    where_confirmed = ' AND '.join(confirmed_parts)

    # Today
    today_parts, today_params = clone_parts(["o.status IN ('confirmed','processing','shipped','delivered')", 'DATE(o.confirmed_at)=CURRENT_DATE'])
    where_today = ' AND '.join(today_parts)

    # Monthly
    monthly_parts, monthly_params = clone_parts(["o.status IN ('confirmed','processing','shipped','delivered')", "DATE_TRUNC('month', o.confirmed_at)=DATE_TRUNC('month', CURRENT_DATE)"])
    where_monthly = ' AND '.join(monthly_parts)

    # Pending
    pending_parts, pending_params = clone_parts(["o.status IN ('pending','pending_review')"])
    where_pending = ' AND '.join(pending_parts)

    total_revenue = float((db.q(f'SELECT COALESCE(SUM(final_amount),0) as r FROM orders o WHERE {where_confirmed}', confirmed_params, fetch_one=True) or {}).get('r', 0))
    total_orders = (db.q(f'SELECT COUNT(*) as c FROM orders o WHERE {where_all}', params, fetch_one=True) or {}).get('c', 0)
    pending_orders = (db.q(f'SELECT COUNT(*) as c FROM orders o WHERE {where_pending}', params, fetch_one=True) or {}).get('c', 0)
    today_revenue = float((db.q(f'SELECT COALESCE(SUM(final_amount),0) as r FROM orders o WHERE {where_today}', params, fetch_one=True) or {}).get('r', 0))
    monthly_revenue = float((db.q(f'SELECT COALESCE(SUM(final_amount),0) as r FROM orders o WHERE {where_monthly}', params, fetch_one=True) or {}).get('r', 0))

    # Items sold (via jsonb_array_elements)
    items_where = ' AND '.join(where_parts).replace('o.', '')
    items_params = list(params)
    items_sold = (db.q(f"SELECT COALESCE(SUM((item->>'quantity')::int),0) as c FROM orders o, jsonb_array_elements(o.items) item WHERE o.items IS NOT NULL AND {items_where} AND o.status IN ('confirmed','processing','shipped','delivered')", items_params, fetch_one=True) or {}).get('c', 0)

    # Total QR customers
    total_customers = (db.q('SELECT COUNT(*) as c FROM qr_customers WHERE bot_id=%s', (bot_id,), fetch_one=True) or {}).get('c', 0)

    # Avg order value
    avg_order_value = round(total_revenue / total_orders, -2) if total_orders > 0 else 0

    # Orders by day (chart data)
    orders_by_day = serialize(db.q(f"SELECT DATE(o.created_at) as day, COUNT(*) as count, COALESCE(SUM(o.final_amount),0) as revenue FROM orders o WHERE {where_confirmed} GROUP BY DATE(o.created_at) ORDER BY day", confirmed_params, fetch=True))

    # Top items (most ordered menu items)
    top_items = serialize(db.q(f"SELECT item->>'item_id' as item_id, item->>'name' as name, COUNT(*) as order_count, COALESCE(SUM((item->>'quantity')::int),0) as total_quantity, COALESCE(SUM((item->>'price')::int * (item->>'quantity')::int),0) as total_revenue FROM orders o, jsonb_array_elements(o.items) item WHERE o.items IS NOT NULL AND {items_where} AND o.status IN ('confirmed','processing','shipped','delivered') GROUP BY item->>'item_id', item->>'name' ORDER BY total_revenue DESC LIMIT 10", items_params, fetch=True))

    return {
        'total_revenue': total_revenue,
        'total_orders': total_orders,
        'pending_orders': pending_orders,
        'total_customers': total_customers,
        'today_revenue': today_revenue,
        'monthly_revenue': monthly_revenue,
        'items_sold': items_sold,
        'avg_order_value': avg_order_value,
        'orders_by_day': orders_by_day,
        'top_items': top_items,
    }
# ─────────────────────────────────────────────
#  QR CUSTOMER AUTH (Telegram / Google)
# ─────────────────────────────────────────────

from common import verify_telegram_auth, create_customer_token, TELEGRAM_BOT_TOKEN, JWT_EXPIRE_DAYS
import requests as _reqs

@router.post("/public/qr-menu/auth/telegram", tags=["Public QR Menu"])
def qr_auth_telegram(data: dict = Body(...)):
    """Sign in or register with Telegram for QR customer dashboard."""
    shop_slug = data.pop("shop_slug", "")
    if not shop_slug:
        raise HTTPException(400, "shop_slug is required")
    if not verify_telegram_auth(data, TELEGRAM_BOT_TOKEN):
        raise HTTPException(400, "Invalid Telegram authentication data")
    bot = db.q("SELECT id, bot_full_name FROM managed_bots WHERE public_slug=%s",
               (shop_slug,), fetch_one=True)
    if not bot:
        raise HTTPException(404, "Shop not found")
    bot_id = bot["id"]
    tid = str(data.get("id"))
    first_name = data.get("first_name", "")
    last_name = data.get("last_name", "")
    username = data.get("username")
    photo_url = data.get("photo_url")
    chat_id = data.get("chat_id")
    name = f"{first_name} {last_name}".strip() if last_name else first_name

    existing = db.q("SELECT id FROM qr_customers WHERE bot_id=%s AND telegram_id=%s",
                    (bot_id, tid), fetch_one=True)
    if existing:
        db.q("UPDATE qr_customers SET name=%s, chat_id=COALESCE(%s, chat_id), updated_at=NOW() WHERE id=%s",
             (name, chat_id, existing["id"]))
        customer_id = existing["id"]
    else:
        result = db.q("INSERT INTO qr_customers (bot_id, telegram_id, name, phone, chat_id) VALUES (%s,%s,%s,NULL,%s) RETURNING id",
                      (bot_id, tid, name, chat_id), fetch_one=True)
        if not result:
            raise HTTPException(500, "Failed to create customer")
        customer_id = result["id"]

    token = create_customer_token(int(tid), bot_id, name, photo_url or "")
    return {"token": token, "customer_id": customer_id, "user": {"id": tid, "name": name, "photo_url": photo_url}}


@router.post("/public/qr-menu/auth/google", tags=["Public QR Menu"])
def qr_auth_google(data: dict = Body(...)):
    """Sign in with Google for QR customer dashboard."""
    access_token = data.get("access_token", "")
    shop_slug = data.get("shop_slug", "")
    if not access_token or not shop_slug:
        raise HTTPException(400, "access_token and shop_slug are required")
    resp = _reqs.get("https://www.googleapis.com/oauth2/v3/userinfo", headers={"Authorization": f"Bearer {access_token}"})
    if not resp.ok:
        resp = _reqs.get("https://www.googleapis.com/oauth2/v3/tokeninfo?access_token=" + access_token)
    if not resp.ok:
        raise HTTPException(401, "Invalid Google access token")
    google_info = resp.json()
    google_uid = google_info.get("sub")
    email = google_info.get("email", "")
    name = google_info.get("name") or google_info.get("given_name") or ""
    picture = google_info.get("picture", "")
    if not name and email:
        name = email.split('@')[0].replace('.', ' ').replace('_', ' ').title()
    if not google_uid:
        raise HTTPException(400, "Could not retrieve user identity from Google")
    bot = db.q("SELECT id, bot_full_name FROM managed_bots WHERE public_slug=%s",
               (shop_slug,), fetch_one=True)
    if not bot:
        raise HTTPException(404, "Shop not found")
    bot_id = bot["id"]
    firebase_uid_input = data.get("firebase_uid")
    if firebase_uid_input is not None and firebase_uid_input.isdigit() and len(firebase_uid_input) > 15:
        raise HTTPException(400, "Invalid firebase_uid: expected Firebase UID (alphanumeric), got Google numeric sub")
    customer_uid = firebase_uid_input or google_uid

    existing = db.q("SELECT id FROM qr_customers WHERE bot_id=%s AND firebase_uid=%s",
                    (bot_id, customer_uid), fetch_one=True)
    if existing:
        db.q("UPDATE qr_customers SET name=%s, email=%s, updated_at=NOW() WHERE id=%s",
             (name, email, existing["id"]))
        customer_id = existing["id"]
    else:
        result = db.q("INSERT INTO qr_customers (bot_id, firebase_uid, name, email) VALUES (%s,%s,%s,%s) RETURNING id",
                      (bot_id, customer_uid, name, email), fetch_one=True)
        if not result:
            # Handle unique constraint on (bot_id, phone='')
            existing_phone = db.q("SELECT id FROM qr_customers WHERE bot_id=%s AND phone=''",
                                  (bot_id,), fetch_one=True)
            if existing_phone:
                db.q("UPDATE qr_customers SET firebase_uid=%s, name=%s, email=%s, updated_at=NOW() WHERE id=%s",
                      (customer_uid, name, email, existing_phone["id"]))
                customer_id = existing_phone["id"]
            else:
                raise HTTPException(500, "Failed to create customer")
        else:
            customer_id = result["id"]




    expire = datetime.datetime.utcnow() + datetime.timedelta(days=JWT_EXPIRE_DAYS)
    token = jwt.encode(
        {"sub": customer_uid, "bot_id": bot_id, "name": name, "photo_url": picture,
         "email": email, "customer_id": customer_id, "type": "customer", "exp": expire},
        JWT_SECRET, algorithm=JWT_ALGORITHM
    )
    return {"token": token, "customer_id": customer_id, "user": {"id": customer_uid, "name": name, "email": email, "photo_url": picture}}


# ─────────────────────────────────────────────
#  QR CUSTOMER DASHBOARD
# ─────────────────────────────────────────────

def _get_qr_customer_by_auth(slug: str, auth_header: str):
    """Resolve QR customer from JWT token + slug."""
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(401, "Authorization required")
    try:
        token = auth_header.replace("Bearer ", "")
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except Exception as exc:
        logger.error("Exchange decode: JWT_SECRET=%s alg=%s err=%s", str(JWT_SECRET)[:30], JWT_ALGORITHM, str(exc))
        raise HTTPException(401, "Invalid token")
    bot = db.q("SELECT id FROM managed_bots WHERE public_slug=%s", (slug,), fetch_one=True)
    if not bot:
        raise HTTPException(404, "Shop not found")
    bot_id = bot["id"]
    sub = payload.get("sub", "")
    customer_id = payload.get("customer_id")
    if customer_id:
        cust = db.q("SELECT id, name, phone, email, points_balance, total_orders, total_spent "
                     "FROM qr_customers WHERE id=%s AND bot_id=%s",
                     (customer_id, bot_id), fetch_one=True)
        if cust:
            return cust, bot_id
    cust = db.q("SELECT id, name, phone, email, points_balance, total_orders, total_spent "
                 "FROM qr_customers WHERE bot_id=%s AND (firebase_uid=%s OR telegram_id=%s) ORDER BY id LIMIT 1",
                 (bot_id, sub, sub), fetch_one=True)
    if not cust:
        raise HTTPException(404, "Customer not found")
    return cust, bot_id


@router.get("/public/qr-menu/{slug}/customer/dashboard", tags=["Public QR Menu"])
def get_qr_customer_dashboard(slug: str, authorization: str = Header("")):
    """Get QR customer dashboard data: stats + recent orders."""
    cust, bot_id = _get_qr_customer_by_auth(slug, authorization)
    stats_row = db.q(
        "SELECT COUNT(*) as total_orders, "
        "COALESCE(SUM(CASE WHEN status='pending' THEN 1 ELSE 0 END), 0) as pending, "
        "COALESCE(SUM(CASE WHEN status IN ('confirmed','processing','shipped','delivered') THEN 1 ELSE 0 END), 0) as completed, "
        "COALESCE(SUM(final_amount), 0) as total_spent "
        "FROM qr_customer_orders WHERE customer_id=%s",
        (cust["id"],), fetch_one=True
    )
    orders = serialize(db.q(
        "SELECT id, order_number, items, total_amount, final_amount, status, channel, "
        "token_number, created_at FROM qr_customer_orders "
        "WHERE customer_id=%s ORDER BY created_at DESC LIMIT 20",
        (cust["id"],), fetch=True
    ))
    return {
        "customer": serialize(cust),
        "stats": {
            "total_orders": stats_row["total_orders"] if stats_row else 0,
            "pending": stats_row["pending"] if stats_row else 0,
            "completed": stats_row["completed"] if stats_row else 0,
            "total_spent": float(stats_row["total_spent"]) if stats_row else 0,
        },
        "orders": orders,
    }


@router.get("/public/qr-menu/{slug}/customer/orders", tags=["Public QR Menu"])
def get_qr_customer_orders(slug: str, limit: int = 50, offset: int = 0,
                           authorization: str = Header("")):
    """Get QR customer order history."""
    cust, bot_id = _get_qr_customer_by_auth(slug, authorization)
    orders = serialize(db.q(
        "SELECT id, order_number, items, total_amount, final_amount, status, channel, "
        "token_number, customer_notes, created_at FROM qr_customer_orders "
        "WHERE customer_id=%s ORDER BY created_at DESC LIMIT %s OFFSET %s",
        (cust["id"], limit, offset), fetch=True
    ))
    return {"orders": orders}


@router.post("/public/qr-menu/{slug}/customer/cart", tags=["Public QR Menu"])
def save_qr_customer_cart(slug: str, data: dict = Body(...),
                          authorization: str = Header("")):
    """Save QR customer cart."""
    cust, bot_id = _get_qr_customer_by_auth(slug, authorization)
    items = data.get("items", [])
    db.q(
        "INSERT INTO qr_customer_cart (customer_id, bot_id, items, updated_at) "
        "VALUES (%s,%s,%s,NOW()) ON CONFLICT (customer_id, bot_id) "
        "DO UPDATE SET items=%s, updated_at=NOW()",
        (cust["id"], bot_id, json.dumps(items), json.dumps(items))
    )
    return {"success": True}


@router.get("/public/qr-menu/{slug}/customer/cart", tags=["Public QR Menu"])
def get_qr_customer_cart(slug: str, authorization: str = Header("")):
    """Get saved QR customer cart."""
    cust, bot_id = _get_qr_customer_by_auth(slug, authorization)
    row = db.q("SELECT items FROM qr_customer_cart WHERE customer_id=%s AND bot_id=%s",
               (cust["id"], bot_id), fetch_one=True)
    items = []
    if row and row["items"]:
        if isinstance(row["items"], str):
            items = json.loads(row["items"])
        else:
            items = row["items"]
    return {"items": items}


@router.post("/public/qr-menu/{slug}/customer/cart/clear", tags=["Public QR Menu"])
def clear_qr_customer_cart(slug: str, authorization: str = Header("")):
    """Clear saved QR customer cart."""
    cust, bot_id = _get_qr_customer_by_auth(slug, authorization)
    db.q("DELETE FROM qr_customer_cart WHERE customer_id=%s AND bot_id=%s",
         (cust["id"], bot_id))
    return {"success": True}


@router.get("/public/qr-menu/{slug}/customer/token-status", tags=["Public QR Menu"])
def get_qr_customer_token_status(slug: str, authorization: str = Header("")):
    """Get current token number + queue info for this customer."""
    cust, bot_id = _get_qr_customer_by_auth(slug, authorization)
    tq_row = db.q("SELECT content_data FROM content_blocks WHERE bot_id=%s AND key='token_queue'",
                  (bot_id,), fetch_one=True)
    tq = {"current": 0, "next": 1, "assigned": []}
    if tq_row and tq_row["content_data"]:
        cd = tq_row["content_data"]
        if isinstance(cd, str):
            cd = json.loads(cd)
        if isinstance(cd, dict):
            tq = cd
    active_order = db.q(
        "SELECT token_number FROM qr_customer_orders "
        "WHERE customer_id=%s AND status='pending' AND token_number IS NOT NULL "
        "ORDER BY created_at DESC LIMIT 1",
        (cust["id"],), fetch_one=True
    )
    token_number = active_order["token_number"] if active_order else None
    return {
        "token_number": token_number,
        "current_serving": tq.get("current", 0),
        "queue_size": len([t for t in tq.get("assigned", []) if t > (tq.get("current", 0))]),
    }

@router.post("/public/qr-menu/auth/telegram-exchange", tags=["Public QR Menu"])
def qr_auth_telegram_exchange(data: dict = Body(...)):
    """Exchange existing ecommerce Telegram JWT for QR customer JWT."""
    jwt_token = data.get("token", "")
    chat_id = data.get("chat_id")
    shop_slug = data.get("shop_slug", "")
    if not jwt_token or not shop_slug:
        raise HTTPException(400, "token and shop_slug are required")
    try:
        payload = jwt.decode(jwt_token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except Exception as exc:
        logger.error("Exchange decode: JWT_SECRET=%s alg=%s err=%s", str(JWT_SECRET)[:30], JWT_ALGORITHM, str(exc))
        raise HTTPException(401, "Invalid token")
    tid = payload.get("sub", "")
    name = payload.get("name", "")
    photo_url = payload.get("photo_url", "")
    if not tid:
        raise HTTPException(400, "Token missing user identity")
    bot = db.q("SELECT id, bot_full_name FROM managed_bots WHERE public_slug=%s",
               (shop_slug,), fetch_one=True)
    if not bot:
        raise HTTPException(404, "Shop not found")
    bot_id = bot["id"]
    existing = db.q("SELECT id FROM qr_customers WHERE bot_id=%s AND telegram_id=%s",
                    (bot_id, tid), fetch_one=True)
    if existing:
        db.q("UPDATE qr_customers SET name=%s, chat_id=COALESCE(%s, chat_id), updated_at=NOW() WHERE id=%s",
             (name, chat_id, existing["id"]))
        customer_id = existing["id"]
    else:
        result = db.q("INSERT INTO qr_customers (bot_id, telegram_id, name, phone, chat_id) VALUES (%s,%s,%s,NULL,%s) RETURNING id",
                      (bot_id, tid, name, chat_id), fetch_one=True)
        if not result:
            raise HTTPException(500, "Failed to create customer")
        customer_id = result["id"]
    token = create_customer_token(int(tid), bot_id, name, photo_url or "")
    return {"token": token, "customer_id": customer_id, "user": {"id": tid, "name": name, "photo_url": photo_url}}

@router.get("/public/qr-menu/debug-jwt-secret", tags=["Public QR Menu"])
def debug_jwt_secret():
    import os
    return {
        "jwt_secret_from_common": JWT_SECRET[:20] + "...",
        "jwt_secret_from_env": (os.environ.get("JWT_SECRET", "NOT_SET")[:20] + "...") if os.environ.get("JWT_SECRET") else "NOT_SET",
        "algorithm": JWT_ALGORITHM,
    }

@router.get("/public/qr-menu/{slug}/customer/points-history", tags=["Public QR Menu"])
def get_qr_customer_points_history(slug: str, authorization: str = Header("")):
    """Get QR customer points balance and transaction history."""
    cust, bot_id = _get_qr_customer_by_auth(slug, authorization)
    transactions = db.q(
        "SELECT id, points, type, description, reference_order_id, created_at "
        "FROM qr_points_transactions WHERE customer_id=%s "
        "ORDER BY created_at DESC LIMIT 50",
        (cust["id"],), fetch=True
    ) or []
    total_earned = sum(t["points"] for t in transactions if t["type"] == "earn")
    total_redeemed = sum(t["points"] for t in transactions if t["type"] == "redeem")
    return {
        "points_balance": cust.get("points_balance", 0),
        "total_earned": total_earned,
        "total_redeemed": total_redeemed,
        "transactions": serialize(transactions),
    }
