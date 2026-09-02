"""
Public Shop routes — split from backend.py
"""

from fastapi import APIRouter, Depends, HTTPException, Request, Body
from common import db, serialize, logger, JWT_SECRET, JWT_ALGORITHM
import json, datetime

router = APIRouter()

@router.get("/public/shop-by-domain", tags=["Public Shop"])
def get_public_shop_by_domain(request: Request):
    """Get public shop by custom domain (Host header)."""
    host = request.headers.get("host", "").lower()
    host = host.split(":")[0]  # strip port

    row = db.q(
        "SELECT id, bot_full_name, bot_username, currency, plan_name, profile_picture, public_slug, social_links FROM managed_bots "
        "WHERE custom_domain=%s AND domain_verified=TRUE",
        (host,), fetch_one=True
    )
    if not row:
        row = db.q(
            "SELECT b.id, b.bot_full_name, b.bot_username, b.currency, b.plan_name, b.profile_picture, b.public_slug, b.social_links FROM managed_bots b "
            "JOIN bot_domains d ON d.bot_id = b.id "
            "WHERE d.domain=%s AND d.verified=TRUE AND d.enabled=TRUE",
            (host,), fetch_one=True
        )
    if not row:
        raise HTTPException(404, "Shop not found for this domain")

    bot_id = row["id"]
    plan = (row.get("plan_name") or "Free").strip().lower()

    shop_settings = db.q(
        "SELECT content_data FROM content_blocks WHERE bot_id=%s AND key='shop_settings'",
        (bot_id,), fetch_one=True
    )
    is_manual_open = True; payment_mode = "postpaid"
    cd = None
    if shop_settings and shop_settings["content_data"]:
        cd = shop_settings["content_data"]
        if isinstance(cd, dict):
            is_manual_open = cd.get("is_open", True)
            payment_mode = cd.get("payment_mode", "postpaid")

    # Fetch theme from content_blocks
    theme_row = db.q(
        "SELECT content_data FROM content_blocks WHERE bot_id=%s AND key='shop_theme'",
        (bot_id,), fetch_one=True
    )
    theme = "default"
    if theme_row and theme_row["content_data"]:
        td = theme_row["content_data"]
        if isinstance(td, str):
            import json; td = json.loads(td)
        if isinstance(td, dict):
            theme = td.get("theme", "default")

    products = serialize(db.q(
        "SELECT id, name, description, price, original_price, image_url, category_id, stock_quantity, link_token, link_code, specifications, apply_delivery_fee, delivery_type, spec_prices "
        "FROM products WHERE bot_id=%s AND is_active=TRUE ORDER BY sort_order NULLS LAST, created_at DESC",
        (bot_id,), fetch=True
    ))

    import random as _pr, string as _ps
    for prod in products:
        if not prod.get("link_token"):
            length = 8
            while True:
                token = "".join(_pr.choices(_ps.ascii_letters + _ps.digits, k=length))
                conflict = db.q("SELECT 1 FROM used_product_tokens WHERE token=%s", (token,), fetch_one=True)
                if not conflict:
                    break
            db.q("UPDATE products SET link_token=%s WHERE id=%s", (token, prod["id"]))
            db.q("INSERT INTO used_product_tokens (token, product_id) VALUES (%s, %s) ON CONFLICT DO NOTHING", (token, prod["id"]))
            prod["link_token"] = token

    categories = serialize(db.q(
        "SELECT id, name FROM categories WHERE bot_id=%s ORDER BY name",
        (bot_id,), fetch=True
    ))

    # Fetch AI agent status
    ai_row = db.q(
        "SELECT is_enabled, enable_website_chat, enable_guest_chat FROM bot_ai_settings WHERE bot_id=%s",
        (bot_id,), fetch_one=True
    )
    ai_agent_enabled = ai_row["is_enabled"] if ai_row else False
    enable_website_chat = ai_row["enable_website_chat"] if (ai_row and ai_row.get("enable_website_chat") is not None) else True
    enable_guest_chat = ai_row["enable_guest_chat"] if (ai_row and ai_row.get("enable_guest_chat") is not None) else True

    ai_agent_mode_row = db.q(
        "SELECT content_data FROM content_blocks WHERE bot_id=%s AND key='ai_agent_mode'",
        (bot_id,), fetch_one=True
    )
    if ai_agent_mode_row and isinstance(ai_agent_mode_row["content_data"], dict):
        am_cd = ai_agent_mode_row["content_data"]
        if "website" in am_cd:
            enable_website_chat = bool(am_cd["website"])
        if "guest" in am_cd:
            enable_guest_chat = bool(am_cd["guest"])
    mmpay_row = db.q(
        "SELECT enabled, shop_enabled FROM shop_payment_merchants WHERE bot_id=%s",
        (bot_id,), fetch_one=True
    )
    has_instant_mmpay = bool(mmpay_row and mmpay_row.get("enabled") and mmpay_row.get("shop_enabled"))

    if has_instant_mmpay:
        payment_methods = []
    else:
        payment_methods = serialize(db.q(
            "SELECT id, name, account_name, payment_number, description, qr_code_url, notes FROM payment_methods WHERE bot_id=%s AND is_active=TRUE ORDER BY name",
            (bot_id,), fetch=True
        ))
    # Fetch shop banners from content_blocks
    banners_block = db.q(
        "SELECT content_data FROM content_blocks WHERE bot_id=%s AND key='shop_banners'",
        (bot_id,), fetch_one=True
    )
    banners = []
    if banners_block and banners_block["content_data"]:
        bd = banners_block["content_data"]
        if isinstance(bd, str):
            import json as _json
            bd = _json.loads(bd)
        if isinstance(bd, dict) and "banners" in bd and isinstance(bd["banners"], list):
            banners = [b for b in bd["banners"] if isinstance(b, dict) and b.get("file_id")]

    # Fetch shop bio from content_blocks
    bio_block = db.q(
        "SELECT content_data FROM content_blocks WHERE bot_id=%s AND key='shop_bio'",
        (bot_id,), fetch_one=True
    )
    shop_bio = {}
    if bio_block and bio_block["content_data"]:
        bd = bio_block["content_data"]
        if isinstance(bd, str):
            import json as _json
            bd = _json.loads(bd)
        if isinstance(bd, dict):
            shop_bio = bd

    # Fetch order button label
    order_btn_block = db.q(
        "SELECT content_data FROM content_blocks WHERE bot_id=%s AND key='order_button_name'",
        (bot_id,), fetch_one=True
    )
    order_button_name = "Buy Now"
    if order_btn_block and order_btn_block["content_data"]:
        obd = order_btn_block["content_data"]
        if isinstance(obd, str):
            obd = json.loads(obd)
        if isinstance(obd, dict):
            order_button_name = obd.get("label", "Buy Now")

    delivery_fees = serialize(db.q(
        "SELECT id, region, district, township, fee FROM delivery_fees WHERE bot_id=%s ORDER BY region, district, township",
        (bot_id,), fetch=True
    )) or []

    delivery_settings = db.q(
        "SELECT delivery_fee, free_delivery_threshold, delivery_fee_mode FROM managed_bots WHERE id=%s",
        (bot_id,), fetch_one=True
    )

    checkout_fields_row = db.q(
        "SELECT checkout_fields FROM managed_bots WHERE id=%s",
        (bot_id,), fetch_one=True
    )
    checkout_fields = checkout_fields_row["checkout_fields"] if checkout_fields_row else None
    if checkout_fields and isinstance(checkout_fields, dict):
        checkout_fields["name"] = True
    if checkout_fields and isinstance(checkout_fields, str):
        import json
        checkout_fields = json.loads(checkout_fields)
    if not checkout_fields:
        checkout_fields = {"name": True, "phones": True, "emails": True, "telegram": False, "viber": False, "zone": True, "address": True, "notes": False}

    mode_order_row = db.q(
        "SELECT content_data FROM content_blocks WHERE bot_id=%s AND key='mode_order'",
        (bot_id,), fetch_one=True
    )
    mode_order = {}
    if mode_order_row and isinstance(mode_order_row["content_data"], dict):
        mode_order = mode_order_row["content_data"]

    # Fetch COD settings
    cod_row = db.q(
        "SELECT content_data FROM content_blocks WHERE bot_id=%s AND key='cod_settings'",
        (bot_id,), fetch_one=True
    )
    cod_enabled = False
    if cod_row and cod_row["content_data"]:
        cod_enabled = cod_row["content_data"].get("cod_enabled", False)
    # Auto-determine shop open/closed based on payment availability & manual setting
    is_open = (len(payment_methods) > 0 or cod_enabled or has_instant_mmpay) and is_manual_open

    shop_dict = serialize(row)
    shop_dict["has_instant_mmpay"] = has_instant_mmpay

    return {
        "shop": shop_dict,
        "has_instant_mmpay": has_instant_mmpay,
        "is_open": is_open,
        "theme": theme,
        "categories": categories,
        "products": products,
        "is_business_plan": plan == "business",
        "ai_agent_enabled": ai_agent_enabled,
        "enable_website_chat": enable_website_chat,
        "enable_guest_chat": enable_guest_chat,
        "banners": banners,
        "shop_bio": shop_bio,
        "order_button_name": order_button_name,
        "payment_methods": payment_methods,
        "delivery_fees": delivery_fees,
        "delivery_settings": {
            "delivery_fee": float(delivery_settings["delivery_fee"] or 0) if delivery_settings else 0,
            "delivery_fee_mode": delivery_settings["delivery_fee_mode"] or "flat" if delivery_settings else "flat",
            "free_delivery_threshold": float(delivery_settings["free_delivery_threshold"] or 0) if delivery_settings else 0,
        },
        "checkout_fields": checkout_fields,
        "mode_order": mode_order,
        "social_links": (row.get("social_links") if isinstance(row.get("social_links"), list) else []) or (
            db.q("SELECT content_data FROM content_blocks WHERE bot_id=%s AND key='social_links'", (bot_id,), fetch_one=True) or {}
        ).get("content_data", {}).get("links", []) if isinstance((db.q("SELECT content_data FROM content_blocks WHERE bot_id=%s AND key='social_links'", (bot_id,), fetch_one=True) or {}).get("content_data"), dict) else [],
        "cod_enabled": cod_enabled,
    }


@router.get("/public/newsfeed/{bot_id}", tags=["Public Newsfeed"])
def get_public_newsfeed(bot_id: int, visitor_id: str = "", limit: int = 10, offset: int = 0, topic: str = ""):
    topic_clause = " AND np.topic LIKE %s" if topic else ""
    params = []
    if visitor_id:
        sql = (
            "SELECT np.id, np.content, np.images, np.pinned, np.created_at, np.share_code,"
            "  COALESCE(lc.like_count, 0) AS like_count,"
            "  COALESCE(cc.comment_count, 0) AS comment_count,"
            "  CASE WHEN nl.id IS NOT NULL THEN TRUE ELSE FALSE END AS liked_by_me"
            " FROM newsfeed_posts np"
            " LEFT JOIN (SELECT post_id, COUNT(*) AS like_count FROM newsfeed_likes GROUP BY post_id) lc ON lc.post_id = np.id"
            " LEFT JOIN (SELECT post_id, COUNT(*) AS comment_count FROM newsfeed_comments GROUP BY post_id) cc ON cc.post_id = np.id"
            " LEFT JOIN newsfeed_likes nl ON nl.post_id = np.id AND nl.visitor_id = %s"
            " WHERE np.bot_id = %s" + topic_clause + (
            " ORDER BY np.pinned DESC, np.created_at DESC"
            " LIMIT %s OFFSET %s")
        )
        params = [visitor_id, bot_id]
        if topic:
            params.append(f'%{topic}%')
        params.extend([limit, offset])
        rows = db.q(sql, tuple(params), fetch=True)
    else:
        sql = (
            "SELECT np.id, np.content, np.images, np.pinned, np.created_at, np.share_code,"
            "  COALESCE(lc.like_count, 0) AS like_count,"
            "  COALESCE(cc.comment_count, 0) AS comment_count,"
            "  FALSE AS liked_by_me"
            " FROM newsfeed_posts np"
            " LEFT JOIN (SELECT post_id, COUNT(*) AS like_count FROM newsfeed_likes GROUP BY post_id) lc ON lc.post_id = np.id"
            " LEFT JOIN (SELECT post_id, COUNT(*) AS comment_count FROM newsfeed_comments GROUP BY post_id) cc ON cc.post_id = np.id"
            " WHERE np.bot_id = %s" + topic_clause + (
            " ORDER BY np.pinned DESC, np.created_at DESC"
            " LIMIT %s OFFSET %s")
        )
        params = [bot_id]
        if topic:
            params.append(f'%{topic}%')
        params.extend([limit, offset])
        rows = db.q(sql, tuple(params), fetch=True)
    return serialize(rows) or []

@router.get("/public/newsfeed/{post_id}/comments", tags=["Public Newsfeed"])
def get_public_newsfeed_comments(post_id: int):
    rows = db.q(
        "SELECT id, visitor_id, visitor_name, content, created_at FROM newsfeed_comments WHERE post_id = %s ORDER BY created_at ASC",
        (post_id,), fetch=True,
    )
    return serialize(rows) or []

@router.post("/public/newsfeed/{post_id}/like", tags=["Public Newsfeed"])
def toggle_newsfeed_like(post_id: int, body: dict = Body(...)):
    visitor_id = body.get("visitor_id")
    if not visitor_id:
        raise HTTPException(400, "visitor_id is required")
    existing = db.q(
        "SELECT id FROM newsfeed_likes WHERE post_id = %s AND visitor_id = %s",
        (post_id, visitor_id), fetch_one=True,
    )
    if existing:
        db.q("DELETE FROM newsfeed_likes WHERE id = %s", (existing["id"],))
        return {"liked": False}
    else:
        db.q(
            "INSERT INTO newsfeed_likes (post_id, visitor_id) VALUES (%s, %s)",
            (post_id, visitor_id),
        )
        return {"liked": True}

@router.post("/public/newsfeed/{post_id}/comment", tags=["Public Newsfeed"])
def add_newsfeed_comment(post_id: int, body: dict = Body(...)):
    content_text = body.get("content", "")
    visitor_id = body.get("visitor_id", "")
    visitor_name = body.get("visitor_name", "Guest")
    if not content_text:
        raise HTTPException(400, "content is required")
    result = db.q(
        "INSERT INTO newsfeed_comments (post_id, visitor_id, visitor_name, content) VALUES (%s, %s, %s, %s) RETURNING id, created_at",
        (post_id, visitor_id, visitor_name, content_text), fetch_one=True,
    )
    return {"success": True, "id": result["id"] if result else None}


@router.patch("/public/newsfeed/{post_id}/comment/{comment_id}", tags=["Public Newsfeed"])
def edit_newsfeed_comment(post_id: int, comment_id: int, body: dict = Body(...)):
    visitor_id = body.get("visitor_id", "")
    content_text = body.get("content", "")
    if not content_text:
        raise HTTPException(400, "content is required")
    comment = db.q("SELECT * FROM newsfeed_comments WHERE id = %s AND post_id = %s", (comment_id, post_id), fetch_one=True)
    if not comment:
        raise HTTPException(404, "Comment not found")
    if comment["visitor_id"] != visitor_id:
        raise HTTPException(403, "Not authorized to edit this comment")
    db.q("UPDATE newsfeed_comments SET content = %s WHERE id = %s", (content_text, comment_id))
    return {"success": True}

@router.delete("/public/newsfeed/{post_id}/comment/{comment_id}", tags=["Public Newsfeed"])
def delete_newsfeed_comment(post_id: int, comment_id: int, visitor_id: str = ""):
    comment = db.q("SELECT * FROM newsfeed_comments WHERE id = %s AND post_id = %s", (comment_id, post_id), fetch_one=True)
    if not comment:
        raise HTTPException(404, "Comment not found")
    if comment["visitor_id"] != visitor_id:
        raise HTTPException(403, "Not authorized to delete this comment")
    db.q("DELETE FROM newsfeed_comments WHERE id = %s", (comment_id,))
    return {"success": True}



@router.get("/api/customer-profile", tags=["Customer"])
def api_customer_profile_get(bot_id: int, uid: str, email: str = None):
    print(">>> API CUSTOMER PROFILE GET FIRED <<<", bot_id, uid, flush=True)
    """Get customer profile for a specific shop and user, with fallback to website_customers & users tables."""
    clean_uid = str(uid).replace('tg_', '').replace('web_', '').replace('wv_', '').strip()
    uids = list(set([str(uid), clean_uid, f"tg_{clean_uid}", f"web_{clean_uid}"]))
    placeholders = ','.join(['%s'] * len(uids))
    params = [bot_id] + uids

    row = db.q(
        f"SELECT id, bot_id, uid, email, display_name, phone, telegram_username, viber_number, address, region, district, township, notes, photo_url, updated_at FROM customer_profiles WHERE bot_id=%s AND uid IN ({placeholders}) ORDER BY updated_at DESC NULLS LAST",
        params, fetch_one=True
    )
    if not row and email:
        row = db.q(
            "SELECT id, bot_id, uid, email, display_name, phone, telegram_username, viber_number, address, region, district, township, notes, photo_url, updated_at FROM customer_profiles WHERE bot_id=%s AND email=%s ORDER BY updated_at DESC NULLS LAST",
            (bot_id, email), fetch_one=True
        )
        if row and row['uid'] != uid:
            db.q("UPDATE customer_profiles SET uid=%s WHERE id=%s", (uid, row['id']))
            row['uid'] = uid

    tid = int(clean_uid) if clean_uid.isdigit() else None
    wc = None
    if tid:
        wc = db.q(
            "SELECT display_name, email, phone, photo_url, COALESCE(points_balance, 0) as points_balance, COALESCE(total_points_earned, 0) as total_points_earned FROM website_customers WHERE bot_id=%s AND (telegram_id=%s OR firebase_uid=%s)",
            (bot_id, str(clean_uid), str(uid)), fetch_one=True
        )
    if not wc:
        wc = db.q(
            f"SELECT display_name, email, phone, photo_url, COALESCE(points_balance, 0) as points_balance, COALESCE(total_points_earned, 0) as total_points_earned FROM website_customers WHERE bot_id=%s AND (firebase_uid IN ({placeholders}) OR (email=%s AND email IS NOT NULL AND email!='')) ORDER BY id ASC",
            params + [email or ''], fetch_one=True
        )

    if not row:
        if wc:
            row = {
                "id": 0,
                "bot_id": bot_id,
                "uid": uid,
                "email": wc["email"] or email or "",
                "display_name": wc["display_name"] or "",
                "phone": wc["phone"] or "",
                "photo_url": wc["photo_url"],
                "telegram_username": "",
                "viber_number": "",
                "address": "",
                "region": "",
                "district": "",
                "township": "",
                "notes": ""
            }
        else:
            if clean_uid.isdigit():
                u = db.q(
                    "SELECT first_name, last_name, username, phone_number, email, profile_picture FROM users WHERE bot_id=%s AND telegram_id=%s",
                    (bot_id, int(clean_uid)), fetch_one=True
                )
                if u:
                    disp = f"{u['first_name'] or ''} {u['last_name'] or ''}".strip() or u["username"]
                    row = {
                        "id": 0,
                        "bot_id": bot_id,
                        "uid": uid,
                        "email": u["email"] or email or "",
                        "display_name": disp or "",
                        "phone": u["phone_number"] or "",
                        "photo_url": u["profile_picture"],
                        "telegram_username": u["username"] or "",
                        "viber_number": "",
                        "address": "",
                        "region": "",
                        "district": "",
                        "township": "",
                        "notes": ""
                    }
    if row:
        row = dict(row)
        tg_user = (row.get("telegram_username") or "").replace("@", "").strip()
        if tid or tg_user:
            u = None
            if tid:
                u = db.q(
                    "SELECT first_name, last_name, username, phone_number, email, profile_picture FROM users WHERE bot_id=%s AND telegram_id=%s",
                    (bot_id, tid), fetch_one=True
                )
            if not u and tg_user:
                u = db.q(
                    "SELECT first_name, last_name, username, phone_number, email, profile_picture FROM users WHERE bot_id=%s AND LOWER(username)=LOWER(%s)",
                    (bot_id, tg_user), fetch_one=True
                )
            if u:
                if not row.get("display_name"):
                    disp = f"{u['first_name'] or ''} {u['last_name'] or ''}".strip() or u["username"]
                    if disp:
                        row["display_name"] = disp
                if not row.get("email") and u.get("email"):
                    row["email"] = u["email"]
                if not row.get("phone") and u.get("phone_number") and "User Skipped" not in str(u.get("phone_number")):
                    row["phone"] = u["phone_number"]
                if not row.get("photo_url") and u.get("profile_picture"):
                    row["photo_url"] = u["profile_picture"]

        # Past orders fallback enrichment
        orders = db.q("SELECT shipping_address, buyer_snapshot FROM orders WHERE bot_id=%s ORDER BY id DESC LIMIT 25", (bot_id,), fetch=True) or []
        for ord_row in orders:
            ship = ord_row.get("shipping_address") or {}
            snap = ord_row.get("buyer_snapshot") or {}
            if isinstance(ship, str):
                try: ship = json.loads(ship)
                except: ship = {}
            if isinstance(snap, str):
                try: snap = json.loads(snap)
                except: snap = {}

            c_email = snap.get("email") or ship.get("email")
            c_name = snap.get("full_name") or snap.get("name") or ship.get("name")
            c_uid = snap.get("firebase_uid") or snap.get("telegram_id")
            
            if (c_email and c_email == row.get("email")) or (c_uid and c_uid == str(clean_uid)) or (c_name and c_name == row.get("display_name")):
                p = ship.get("phone") or snap.get("phone")
                if p and p != "N/A" and "User Skipped" not in str(p) and not row.get("phone"):
                    row["phone"] = p
                ph = snap.get("photo_url") or ship.get("photo_url")
                if ph and not row.get("photo_url"):
                    row["photo_url"] = ph
                if not row.get("address") and ship.get("address") and ship.get("address") != "N/A":
                    row["address"] = ship["address"]
                if not row.get("region") and ship.get("region"):
                    row["region"] = ship["region"]
                if not row.get("district") and ship.get("district"):
                    row["district"] = ship["district"]
                if not row.get("township") and ship.get("township"):
                    row["township"] = ship["township"]
                if not row.get("viber_number") and snap.get("viber_number"):
                    row["viber_number"] = snap["viber_number"]
                if not row.get("telegram_username") and snap.get("telegram_username"):
                    row["telegram_username"] = snap["telegram_username"]

        if wc:
            if not row.get("display_name") and wc.get("display_name"):
                row["display_name"] = wc["display_name"]
            if not row.get("email") and wc.get("email"):
                row["email"] = wc["email"]
            if not row.get("phone") and wc.get("phone"):
                row["phone"] = wc["phone"]
            if not row.get("photo_url") and wc.get("photo_url"):
                row["photo_url"] = wc["photo_url"]
            row["points_balance"] = wc.get("points_balance", 0)
            row["total_points_earned"] = wc.get("total_points_earned", 0)

    if not row:
        return {}
    return serialize(row)

@router.post("/api/customer-profile/save", tags=["Customer"])
def api_customer_profile_save(data: dict = Body(...)):
    """Save or update customer profile. Simple CRUD — identified by bot_id + uid."""
    bot_id = data.get("bot_id")
    uid = data.get("uid")
    if not bot_id or not uid:
        raise HTTPException(400, "bot_id and uid are required")

    clean_uid = str(uid).replace('tg_', '').replace('web_', '').replace('wv_', '').strip()
    uids = list(set([str(uid), clean_uid, f"tg_{clean_uid}", f"web_{clean_uid}"]))
    placeholders = ','.join(['%s'] * len(uids))
    params = [bot_id] + uids

    display_name = data.get("display_name", "").strip()
    email = data.get("email", "").strip()
    phone = data.get("phone", "").strip()
    telegram_username = data.get("telegram_username", "").strip()
    viber_number = data.get("viber_number", "").strip()
    region = data.get("region", "").strip()
    district = data.get("district", "").strip()
    township = data.get("township", "").strip()
    address = data.get("address", "").strip()
    notes = data.get("notes", "").strip()
    photo_url = data.get("photo_url", "").strip()

    existing = db.q(
        f"SELECT id FROM customer_profiles WHERE bot_id=%s AND uid IN ({placeholders}) ORDER BY updated_at DESC NULLS LAST",
        params, fetch_one=True
    )

    if not existing and email:
        existing = db.q(
            "SELECT id FROM customer_profiles WHERE bot_id=%s AND email=%s ORDER BY updated_at DESC NULLS LAST",
            (bot_id, email), fetch_one=True
        )
        if existing:
            db.q("UPDATE customer_profiles SET uid=%s WHERE id=%s", (str(uid), existing["id"]))

    if existing:
        db.q(
            "UPDATE customer_profiles SET uid=%s, display_name=%s, email=%s, phone=%s, telegram_username=%s, viber_number=%s, region=%s, district=%s, township=%s, address=%s, notes=%s, photo_url=COALESCE(NULLIF(%s,''), photo_url), updated_at=NOW() WHERE id=%s",
            (str(uid), display_name, email, phone, telegram_username, viber_number, region, district, township, address, notes, photo_url, existing["id"])
        )
    else:
        db.q(
            "INSERT INTO customer_profiles (bot_id, uid, email, display_name, phone, telegram_username, viber_number, region, district, township, address, notes, photo_url) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)",
            (bot_id, str(uid), email, display_name, phone, telegram_username, viber_number, region, district, township, address, notes, photo_url)
        )

    tid = int(clean_uid) if clean_uid.isdigit() else None
    wc = None
    if tid:
        wc = db.q("SELECT id FROM website_customers WHERE bot_id=%s AND (telegram_id=%s OR firebase_uid=%s)", (bot_id, tid, str(uid)), fetch_one=True)
    if not wc:
        wc = db.q(
            f"SELECT id FROM website_customers WHERE bot_id=%s AND (firebase_uid IN ({placeholders}) OR (email=%s AND email IS NOT NULL AND email!=''))",
            params + [email or ''], fetch_one=True
        )

    if wc:
        db.q(
            "UPDATE website_customers SET display_name=%s, email=%s, phone=%s, photo_url=COALESCE(NULLIF(%s,''), photo_url), last_login=NOW() WHERE id=%s",
            (display_name, email, phone, photo_url, wc["id"])
        )
    else:
        try:
            db.q(
                "INSERT INTO website_customers (bot_id, firebase_uid, telegram_id, display_name, email, phone, photo_url) VALUES (%s,%s,%s,%s,%s,%s,%s)",
                (bot_id, str(uid) if not tid else None, tid, display_name, email, phone, photo_url)
            )
        except Exception:
            pass

    try:
        db.q(f"UPDATE web_visitors SET name=%s, email=%s, phone=%s WHERE bot_id=%s AND visitor_id IN ({placeholders})", [display_name, email, phone, bot_id] + uids)
    except Exception:
        pass

    return {"success": True}

@router.get("/public/order-status/{order_id}", tags=["Public Shop"])
def get_public_order_status(request: Request, order_id: str):
    """Check order status by order ID or order number (for MMQR live polling)."""
    clean_id = str(order_id).replace("SH-", "").split("-")[-1]
    order = None
    if clean_id.isdigit():
        order = db.q("SELECT id, status, final_amount, order_number FROM orders WHERE id=%s", (int(clean_id),), fetch_one=True)
    if not order:
        order = db.q("SELECT id, status, final_amount, order_number FROM orders WHERE order_number=%s", (str(order_id),), fetch_one=True)
    if not order:
        return {"status": "not_found", "paid": False}
    
    is_confirmed = order["status"] in ["confirmed", "processing", "completed", "shipped", "delivered"]
    if is_confirmed:
        client_ip = request.client.host if request.client else "unknown"
        reset_ip_unpaid_streak(client_ip)

    return {
        "order_id": order["id"],
        "order_number": order.get("order_number"),
        "status": order["status"],
        "paid": is_confirmed
    }

def notify_order_status_change(bot_id: int, order: dict, status: str):
    try:
        bot = db.q("SELECT bot_token, owner_telegram_id, currency FROM managed_bots WHERE id=%s", (bot_id,), fetch_one=True)
        if not bot or not bot.get("bot_token") or not bot.get("owner_telegram_id"):
            return
        currency = bot.get("currency", "MMK")
        items = order.get("items") or []
        if isinstance(items, str):
            try: items = json.loads(items)
            except: items = []
        
        shipping = order.get("shipping_address") or {}
        if isinstance(shipping, str):
            try: shipping = json.loads(shipping)
            except: shipping = {}

        buyer = order.get("buyer_snapshot") or {}
        if isinstance(buyer, str):
            try: buyer = json.loads(buyer)
            except: buyer = {}

        item_lines = []
        for i, item in enumerate(items):
            name = item.get("name") or item.get("product_name") or f"Item #{i+1}"
            qty = item.get("quantity") or 1
            price = float(item.get("price") or 0)
            item_lines.append(f"• {name} (x{qty}) — {price:,.0f} {currency}")
        items_text = "\n".join(item_lines) if item_lines else "• (empty)"

        status_titles = {
            "pending_payment": "Payment Pending",
            "confirmed": "Payment Verified",
            "payment_failed": "Payment Failed",
            "expired": "Order Expired"
        }
        status_text = status_titles.get(status, status.replace('_', ' ').title())

        telegram_id = order.get("telegram_id") or buyer.get("telegram_id") or buyer.get("telegram_user_id") or (buyer.get("id") if str(buyer.get("id") or "").isdigit() and int(buyer.get("id")) > 100000 else None) or (order.get("user_id") if str(order.get("user_id") or "").isdigit() and int(order.get("user_id")) > 100000 else None)
        
        lines = [
            f"<b>New Order Received</b>",
            f"<b>{status_text}</b>",
            "",
            f"<b>Order ID:</b> {order.get('order_number') or order.get('id') or 'N/A'}",
            ""
        ]

        cust_name = shipping.get('name') or buyer.get('name') or buyer.get('full_name')
        if cust_name and cust_name not in ['N/A', 'None']:
            lines.append(f"<b>Name:</b> {cust_name}")

        phone_val = shipping.get('phone') or buyer.get('phone') or buyer.get('phone_number')
        if phone_val and phone_val not in ['N/A', 'None']:
            lines.append(f"<b>Phone:</b> {phone_val}")

        email_val = shipping.get('email') or buyer.get('email')
        if email_val and email_val not in ['N/A', 'None']:
            lines.append(f"<b>Email:</b> {email_val}")

        if telegram_id:
            lines.append(f"<b>User ID:</b> <code>{telegram_id}</code>")

        lines.append("")
        lines.append("<b>Products:</b>")
        lines.append(items_text)
        lines.append("")

        import datetime
        date_val = order.get('created_at')
        if isinstance(date_val, datetime.datetime):
            date_str = date_val.strftime("%B %d, %Y at %I:%M %p")
        elif isinstance(date_val, str):
            date_str = date_val[:16].replace("T", " ")
        else:
            date_str = ""
            
        if date_str:
            lines.append(f"<b>Date:</b> {date_str}")

        lines.append(f"<b>Amount:</b> {float(order.get('final_amount') or order.get('total_amount') or 0):,.0f} {currency}")
        lines.append("<b>Payment Method:</b> Myan Myan Pay MMQR")

        notes_val = shipping.get('notes')
        if notes_val and notes_val != 'N/A':
            lines.append("")
            lines.append(f"<b>Notes:</b> {notes_val}")

        if telegram_id:
            lines.append("")
            lines.append("⟵ <b>Swipe left to send message</b>")

        msg = "\n".join(lines)

        import requests
        requests.post(
            f"https://api.telegram.org/bot{bot['bot_token']}/sendMessage",
            json={"chat_id": bot["owner_telegram_id"], "text": msg, "parse_mode": "HTML"},
            timeout=10
        )
        if status == "confirmed" and telegram_id:
            try:
                qr_msg_id = shipping.get("qr_message_id")
                if qr_msg_id:
                    try:
                        requests.post(
                            f"https://api.telegram.org/bot{bot['bot_token']}/deleteMessage",
                            json={"chat_id": telegram_id, "message_id": qr_msg_id},
                            timeout=5
                        )
                    except Exception:
                        pass
                buyer_lines = [
                    "🧾 <b>Order Confirmation Slip</b>",
                    "",
                    f"<b>Order ID:</b> {order.get('order_number') or order.get('id') or 'N/A'}",
                    ""
                ]
                if cust_name and cust_name not in ['N/A', 'None', None]:
                    buyer_lines.append(f"<b>Name:</b> {cust_name}")
                if phone_val and phone_val not in ['N/A', 'None', None]:
                    buyer_lines.append(f"<b>Phone:</b> {phone_val}")
                if email_val and email_val not in ['N/A', 'None', None]:
                    buyer_lines.append(f"<b>Email:</b> {email_val}")
                buyer_lines.append("")
                buyer_lines.append("<b>Products:</b>")
                buyer_lines.append(items_text)
                buyer_lines.append("")
                buyer_lines.append(f"<b>Amount:</b> {float(order.get('final_amount') or order.get('total_amount') or 0):,.0f} {currency}")
                buyer_lines.append("<b>Payment Method:</b> Myan Myan Pay MMQR")
                if notes_val and notes_val not in ['N/A', 'None', None]:
                    buyer_lines.append("")
                    buyer_lines.append(f"<b>Notes:</b> {notes_val}")
                buyer_lines.append("")
                buyer_lines.append("Admin will shortly contact.")
                buyer_msg = "\n".join(buyer_lines)
                requests.post(
                    f"https://api.telegram.org/bot{bot['bot_token']}/sendMessage",
                    json={"chat_id": telegram_id, "text": buyer_msg, "parse_mode": "HTML"},
                    timeout=10
                )
            except Exception as _be:
                logger.error(f"Failed to notify buyer for confirmed order: {_be}")
    except Exception as e:
        logger.error(f"Failed to notify bot owner: {e}")

import time

_ip_unpaid_streaks = {}  # ip -> int (consecutive expired unpaid order count)
_ip_blocked_until = {}   # ip -> float (timestamp when cooldown ends)

PENALTY_STEPS = [
    300,    # 1st expired order: 5 mins
    600,    # 2nd expired order: 10 mins
    900,    # 3rd expired order: 15 mins
    1200,   # 4th expired order: 20 mins
    1800,   # 5th expired order: 30 mins
    3600,   # 6th expired order: 1 hour
    10800,  # 7th expired order: 3 hours
    18000   # 8th+ expired order: 5 hours
]

def record_ip_unpaid_expire(ip: str):
    """Escalate penalty when an unpaid order expires for an IP."""
    if not ip or ip == "unknown":
        return
    streak = _ip_unpaid_streaks.get(ip, 0) + 1
    _ip_unpaid_streaks[ip] = streak
    penalty_seconds = PENALTY_STEPS[min(streak - 1, len(PENALTY_STEPS) - 1)]
    _ip_blocked_until[ip] = time.time() + penalty_seconds
    logger.info(f"[AntiSpam] IP {ip} unpaid expire streak={streak}, blocked for {penalty_seconds}s")

def reset_ip_unpaid_streak(ip: str):
    """Reset penalty streak to 0 when a payment completes successfully."""
    if not ip or ip == "unknown":
        return
    _ip_unpaid_streaks[ip] = 0
    _ip_blocked_until[ip] = 0
    logger.info(f"[AntiSpam] IP {ip} payment succeeded, penalty streak reset to 0")

@router.post("/public/order-expire/{order_id}", tags=["Public Shop"])
def expire_public_order(request: Request, order_id: str):
    """Mark an un-paid instant payment order as expired when the 5-minute timer elapses and escalate anti-spam streak."""
    client_ip = request.client.host if request.client else "unknown"
    clean_id = str(order_id).replace("SH-", "").split("-")[-1]
    order = None
    if clean_id.isdigit():
        order = db.q("SELECT id, bot_id, order_number, total_amount, final_amount, shipping_address, items, buyer_snapshot, source FROM orders WHERE id=%s AND status='pending_payment'", (int(clean_id),), fetch_one=True)
    if not order:
        order = db.q("SELECT id, bot_id, order_number, total_amount, final_amount, shipping_address, items, buyer_snapshot, source FROM orders WHERE order_number=%s AND status='pending_payment'", (str(order_id),), fetch_one=True)
    
    if not order:
        return {"success": False, "message": "Order not found or not pending_payment"}
    
    db.q("UPDATE orders SET status='expired', updated_at=NOW() WHERE id=%s", (order["id"],))
    record_ip_unpaid_expire(client_ip)
    notify_order_status_change(order["bot_id"], order, "expired")
    return {"success": True, "status": "expired"}

@router.post("/public/checkout/instant-mmpay", tags=["Public Shop"])
def public_checkout_instant_mmpay(request: Request, data: dict = Body(...)):
    """Create order in pending_payment state and generate instant MMQR payment payload from mmpay-shop microservice."""
    client_ip = request.client.host if request.client else "unknown"
    now_ts = time.time()
    blocked_until = _ip_blocked_until.get(client_ip, 0)
    if now_ts < blocked_until:
        remaining = int(blocked_until - now_ts)
        mins = remaining // 60
        secs = remaining % 60
        streak = _ip_unpaid_streaks.get(client_ip, 1)
        time_str = f"{mins}m {secs}s" if mins > 0 else f"{secs}s"
        raise HTTPException(
            429,
            detail=f"Please wait {time_str} before generating another payment QR code.\nFailing multiple times to pay may temporarily prevent you from creating new orders.",
            headers={"X-Cooldown-Seconds": str(remaining)}
        )

    bot_id = data.get("bot_id")
    items = data.get("items", [])
    total_amount = data.get("total_amount", 0)
    if not total_amount or float(total_amount) < 1000:
        raise HTTPException(400, "MMQR payment requires a minimum order total of 1,000 MMK.")

    customer_name = data.get("customer_name", "Customer")
    phone = data.get("phone", "")
    email = data.get("email", "")
    address = data.get("address", "")
    township = data.get("township", "")
    notes = data.get("notes", "")
    firebase_uid = data.get("firebase_uid", "")
    view_mode = data.get("view_mode", "")
    req_source = data.get("source", "")
    
    if not bot_id or not items:
        raise HTTPException(400, "bot_id and items are required")

    mmpay_row = db.q("SELECT enabled, shop_enabled FROM shop_payment_merchants WHERE bot_id=%s", (bot_id,), fetch_one=True)
    if not mmpay_row or not mmpay_row.get("enabled") or not mmpay_row.get("shop_enabled"):
        raise HTTPException(400, "Instant MMPay is not enabled for this shop")

    if view_mode == "guest" or req_source == "guest":
        order_source = "guest"
    else:
        order_source = "website"

    order_number = f"WS{bot_id}{int(time.time() * 1000) % 10000000000:010d}"

    import json
    shipping_address = {
        "name": customer_name,
        "phone": phone,
        "email": email,
        "address": address,
        "township": township,
        "notes": notes
    }
    buyer_snapshot = {
        "name": customer_name,
        "phone": phone,
        "email": email,
        "firebase_uid": firebase_uid if order_source == "website" else ""
    }

    order_row = db.q(
        "INSERT INTO orders (bot_id, order_number, total_amount, final_amount, delivery_fee, status, payment_method, shipping_address, items, buyer_snapshot, source, created_at) "
        "VALUES (%s, %s, %s, %s, 0, 'pending_payment', 'mmpay', %s, %s, %s, %s, NOW()) RETURNING id",
        (bot_id, order_number, total_amount, total_amount, json.dumps(shipping_address), json.dumps(items), json.dumps(buyer_snapshot), order_source),
        fetch_one=True
    )
    if not order_row:
        raise HTTPException(500, "Failed to create order record")
    order_id = order_row["id"]

    try:
        order_notify = {
            "id": order_id,
            "bot_id": bot_id,
            "order_number": order_number,
            "total_amount": total_amount,
            "final_amount": total_amount,
            "shipping_address": shipping_address,
            "items": items,
            "buyer_snapshot": buyer_snapshot,
            "source": order_source,
            "telegram_id": data.get("telegram_id") or buyer_snapshot.get("telegram_id")
        }
        notify_order_status_change(bot_id, order_notify, "pending_payment")
    except Exception as _e:
        logger.error(f"Failed to notify Telegram for pending_payment: {_e}")

    import requests, os
    mmpay_port = os.getenv("MMPAY_PORT", "3001")
    mmpay_url = os.getenv("MMPAY_SHOP_URL", f"http://127.0.0.1:{mmpay_port}/create-shop-order")
    payload = {
        "bot_id": bot_id,
        "order_id": order_id,
        "amount": total_amount,
        "order_number": order_number
    }
    
    # Strict Single-Shot execution: 1 request to MMPay SDK, ZERO retries
    qr_data = {}
    try:
        res = requests.post(mmpay_url, json=payload, timeout=8)
        if res.ok:
            qr_data = res.json()
        else:
            logger.error(f"Single-shot MMPay call returned status {res.status_code}: {res.text[:200]}")
    except Exception as e:
        logger.error(f"Single-shot MMPay call failed (NO RETRY): {e}")

    return {
        "success": True,
        "order_id": order_id,
        "order_number": order_number,
        "total_amount": total_amount,
        "amount": total_amount,
        "qr_code_url": qr_data.get("qr_code_url") or qr_data.get("qr_url") or qr_data.get("qrCodeUrl"),
        "qr_payload": qr_data.get("qr") or qr_data.get("qr_payload") or qr_data.get("raw_payload") or qr_data.get("qrPayload"),
        "deep_link": qr_data.get("deep_link") or qr_data.get("web_url") or qr_data.get("deepLink")
    }

from fastapi import Response

@router.post("/mmpay-webhook", include_in_schema=False)
@router.post("/mmpay", include_in_schema=False)
async def mmpay_webhook_proxy(request: Request):
    """Proxy incoming MyanMyanPay webhook calls to mmpay-shop-dev microservice (port 3002)."""
    import os, requests
    from fastapi import Response
    body = await request.body()
    headers = {}
    for h in ("content-type", "x-mmpay-nonce", "x-mmpay-signature"):
        val = request.headers.get(h)
        if val:
            headers[h] = val
    mmpay_port = os.getenv("MMPAY_PORT", "3001")
    res = requests.post(f"http://127.0.0.1:{mmpay_port}/mmpay", data=body, headers=headers, timeout=10)
    return Response(content=res.content, status_code=res.status_code, media_type=res.headers.get("content-type", "application/json"))


@router.post("/mmpay-status-notify", include_in_schema=False)
@router.post("/public/mmpay-status-notify", include_in_schema=False)
@router.post("/api/mmpay-status-notify", include_in_schema=False)
@router.post("/api/public/mmpay-status-notify", include_in_schema=False)
def internal_mmpay_status_notify(data: dict = Body(...)):
    bot_id = data.get("bot_id")
    order_id = data.get("order_id")
    status = data.get("status", "confirmed")
    if not bot_id or not order_id:
        return {"error": "bot_id and order_id required"}
    order = db.q("SELECT id, order_number, bot_id, user_id, items, total_amount, final_amount, status, created_at, shipping_address, buyer_snapshot FROM orders WHERE id=%s AND bot_id=%s", (order_id, bot_id), fetch_one=True)
    if order:
        notify_order_status_change(bot_id, order, status)
    return {"success": True}
