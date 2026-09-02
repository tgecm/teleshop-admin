import re
"""
Chat routes — split from backend.py
"""

from fastapi import APIRouter, Depends, HTTPException, Request, Body
from typing import Optional, List, Any, Dict
from common import db, require_token, UserCtx, serialize, scope_filter, logger, JWT_SECRET, JWT_ALGORITHM, ChatSendRequest, WebVisitorSendRequest, log_staff_activity, expand_visitor_ids
import json, datetime, requests, uuid
from pydantic import BaseModel

router = APIRouter()

@router.get("/chats/unread-count", tags=["Chat"])
def get_unread_count(bot_id: int, ctx: UserCtx = Depends(require_token)):
    """Get total unread message count across all conversations."""
    bf, bp = scope_filter(ctx, "cm", bot_id)
    if not bf:
        return {"telegram": 0, "web": 0, "total": 0}
    
    # Telegram user unread
    tele_row = db.q(f"""
        SELECT COUNT(*) AS cnt FROM (
            SELECT cm.user_id FROM chat_messages cm
            WHERE cm.user_id IS NOT NULL AND cm.sender_type = 'user' AND cm.is_read = FALSE AND {bf[6:]}
            GROUP BY cm.user_id
        ) sub
    """, bp, fetch_one=True)
    tele_unread = tele_row["cnt"] if tele_row else 0
    
    # Web visitor unread
    web_row = db.q(f"""
        SELECT COUNT(*) AS cnt FROM (
            SELECT cm.visitor_id FROM chat_messages cm
            WHERE cm.visitor_id IS NOT NULL AND cm.sender_type = 'user' AND cm.is_read = FALSE AND {bf[6:]}
            GROUP BY cm.visitor_id
        ) sub
    """, bp, fetch_one=True)
    web_unread = web_row["cnt"] if web_row else 0
    
    return {"telegram": tele_unread, "web": web_unread, "total": tele_unread + web_unread}

@router.get("/chats/{user_id}/messages", tags=["Chat"])
def get_chat_messages(user_id: int, bot_id: int, ctx: UserCtx = Depends(require_token)):
    """Get all messages for a specific user conversation."""
    bf, bp = scope_filter(ctx, "cm", bot_id)
    if not bf:
        return []

    user_row = db.q("SELECT telegram_id FROM users WHERE id = %s AND telegram_id IS NOT NULL", (user_id,), fetch_one=True)
    alt_id = int(user_row["telegram_id"]) if (user_row and user_row.get("telegram_id")) else user_id

    db.q(
        "UPDATE chat_messages SET is_read = TRUE WHERE (user_id = %s OR user_id = %s) AND bot_id = %s AND sender_type = 'user' AND is_read = FALSE",
        (user_id, alt_id, bot_id)
    )
    rows = db.q(f"""
        SELECT * FROM chat_messages
        WHERE (user_id = %s OR user_id = %s) AND bot_id = %s
        ORDER BY created_at ASC
    """, (user_id, alt_id, bot_id), fetch=True) or []
    return serialize(rows)

@router.post("/chats/{user_id}/send", tags=["Chat"])
def send_chat_message(user_id: int, req: ChatSendRequest, ctx: UserCtx = Depends(require_token)):
    """Send a message from admin to a user via Telegram bot."""
    # Resolve internal users.id to telegram_id if applicable
    user_row = db.q("SELECT telegram_id FROM users WHERE id = %s AND telegram_id IS NOT NULL", (user_id,), fetch_one=True)
    if user_row and user_row.get("telegram_id"):
        user_id = int(user_row["telegram_id"])

    # Get bot token
    bot = db.q("SELECT bot_token, bot_username FROM managed_bots WHERE id = %s AND is_active = TRUE",
               (req.bot_id,), fetch_one=True)
    if not bot:
        raise HTTPException(404, "Bot not found or inactive")

    # Verify access
    bf, bp = scope_filter(ctx, "", req.bot_id)
    if not bf:
        raise HTTPException(403, "No access to this bot")

    # Send via Telegram Bot API
    try:
        if req.file_id:
            resp = requests.post(
                f"https://api.telegram.org/bot{bot['bot_token']}/sendPhoto",
                data={"chat_id": user_id, "photo": req.file_id, "caption": req.message or None},
                timeout=10
            )
        else:
            resp = requests.post(
                f"https://api.telegram.org/bot{bot['bot_token']}/sendMessage",
                json={
                    "chat_id": user_id,
                    "text": req.message,
                    "parse_mode": "Markdown"
                },
                timeout=10
            )
            if not resp.ok:
                # Retry without parse_mode in case Markdown entity parsing failed
                resp = requests.post(
                    f"https://api.telegram.org/bot{bot['bot_token']}/sendMessage",
                    json={
                        "chat_id": user_id,
                        "text": req.message
                    },
                    timeout=10
                )
        if not resp.ok:
            # Fallback: log warning and continue saving message locally
            import logging
            logging.warning(f"Telegram API warning for user {user_id}: {resp.text}")
    except requests.RequestException as e:
        raise HTTPException(502, f"Failed to send message: {e}")

    # Save to chat_messages
    db.q(
        "INSERT INTO chat_messages (bot_id, user_id, sender_type, sender_name, message_text, file_id, file_type) VALUES (%s, %s, 'admin', %s, %s, %s, %s)",
        (req.bot_id, user_id, ctx.staff_name or None, req.message, req.file_id, req.file_type)
    )
    msg_trunc = req.message[:80] + ("…" if len(req.message) > 80 else "")
    log_staff_activity(ctx, req.bot_id, f"replied to Telegram user #{user_id}: '{msg_trunc}'")

    return {"success": True}


@router.post("/chats/{user_id}/mark-read", tags=["Chat"])
def mark_chat_read(user_id: int, data: dict = Body(...), ctx: UserCtx = Depends(require_token)):
    bot_id = data.get("bot_id") if isinstance(data, dict) else None
    if not bot_id:
        raise HTTPException(400, "bot_id required")
    bf, bp = scope_filter(ctx, "", bot_id)
    if not bf:
        raise HTTPException(403, "No access to this bot")
    u_str = str(user_id).strip()
    db.q(
        "UPDATE chat_messages SET is_read = TRUE WHERE bot_id = %s AND (user_id = %s OR visitor_id = %s OR visitor_id = %s)",
        (bot_id, user_id, u_str, 'tg_' + u_str)
    )
    return {"success": True}


@router.post("/chats/{user_id}/mark-unread", tags=["Chat"])
def mark_chat_unread(user_id: int, data: dict = Body(...), ctx: UserCtx = Depends(require_token)):
    bot_id = data.get("bot_id") if isinstance(data, dict) else None
    if not bot_id:
        raise HTTPException(400, "bot_id required")
    bf, bp = scope_filter(ctx, "", bot_id)
    if not bf:
        raise HTTPException(403, "No access to this bot")
    u_str = str(user_id).strip()
    db.q(
        "UPDATE chat_messages SET is_read = FALSE WHERE bot_id = %s AND (user_id = %s OR visitor_id = %s OR visitor_id = %s)",
        (bot_id, user_id, u_str, 'tg_' + u_str)
    )
    return {"success": True}


@router.delete("/chats/{user_id}", tags=["Chat"])
def delete_chat(user_id: int, bot_id: int, ctx: UserCtx = Depends(require_token)):
    """Delete all messages and data for a conversation."""
    bf, bp = scope_filter(ctx, "", bot_id)
    if not bf:
        raise HTTPException(403, "No access to this bot")
    u_str = str(user_id).strip()
    db.q("DELETE FROM chat_messages WHERE bot_id = %s AND (user_id = %s OR visitor_id = %s OR visitor_id = %s)", (bot_id, user_id, u_str, "tg_" + u_str))
    db.q("DELETE FROM web_visitors WHERE bot_id = %s AND (visitor_id = %s OR firebase_uid = %s)", (bot_id, u_str, u_str))
    db.q("DELETE FROM chat_metadata WHERE bot_id = %s AND (visitor_id = %s OR user_id = %s)", (bot_id, u_str, user_id))
    db.q("DELETE FROM customer_profiles WHERE bot_id = %s AND uid = %s", (bot_id, u_str))
    log_staff_activity(ctx, bot_id, f"deleted chat with user #{user_id}")
    return {"success": True}


# ─────────────────────────────────────────────
#  WEB VISITOR CHATS (Admin)
# ─────────────────────────────────────────────

@router.get("/web-visitors/{bot_id}", tags=["Chat"])
def list_web_visitors(bot_id: int, ctx: UserCtx = Depends(require_token)):
    """List web visitor conversations with latest message preview."""
    bf, bp = scope_filter(ctx, "cm", bot_id)
    if not bf:
        return []
    rows = db.q("""
        SELECT DISTINCT ON (customer_key)
            customer_key,
            real_visitor_id AS visitor_id,
            user_id,
            name,
            phone,
            email,
            ai_disabled,
            firebase_uid,
            photo_url,
            last_message,
            last_sender,
            last_file_type,
            last_time,
            unread_count,
            is_pinned,
            is_done,
            is_blocked,
            is_muted,
            payment_status,
            website_customer_id
        FROM (
            SELECT
                COALESCE(
                    'wc_' || wc.id::text,
                    NULLIF('fb_' || wc.firebase_uid, 'fb_'),
                    NULLIF('fb_' || wv.firebase_uid, 'fb_'),
                    NULLIF('email_' || LOWER(TRIM(wc.email)), 'email_'),
                    NULLIF('email_' || LOWER(TRIM(wv.email)), 'email_'),
                    cm.visitor_id
                ) AS customer_key,
                cm.visitor_id AS real_visitor_id,
                wc.id AS website_customer_id,
                cm.user_id AS user_id,
                cm.visitor_id AS visitor_id,
                COALESCE(
                    NULLIF(TRIM(cp.display_name), ''),
                    NULLIF(TRIM(wc.display_name), ''),
                    NULLIF(TRIM(wv.name), 'Website Customer'),
                    NULLIF(TRIM(wv.name), 'Shop Visitor'),
                    NULLIF(TRIM(wv.name), 'Guest'),
                    NULLIF(TRIM(wv.name), ''),
                    'Website Customer'
                ) AS name,
                COALESCE(NULLIF(TRIM(cp.phone), ''), wv.phone, wc.phone ) AS phone,
                COALESCE(NULLIF(TRIM(cp.email), ''), wv.email, wc.email) AS email,
                COALESCE(cmd.ai_disabled, wv.ai_disabled, FALSE) AS ai_disabled,
                COALESCE(wc.firebase_uid, wv.firebase_uid) AS firebase_uid,
                COALESCE(
                    NULLIF(TRIM(cp.photo_url), ''),
                    NULLIF(TRIM(wc.photo_url), '')
                ) AS photo_url,
                cm.message_text AS last_message,
                cm.sender_type AS last_sender,
                cm.file_type AS last_file_type,
                cm.created_at AS last_time,
                COUNT(*) FILTER (WHERE cm.is_read = FALSE AND cm.sender_type NOT IN ('ai', 'admin')) OVER (
                    PARTITION BY COALESCE(
                        'wc_' || wc.id::text,
                        NULLIF('fb_' || wc.firebase_uid, 'fb_'),
                        NULLIF('fb_' || wv.firebase_uid, 'fb_'),
                        NULLIF('email_' || LOWER(TRIM(wc.email)), 'email_'),
                        NULLIF('email_' || LOWER(TRIM(wv.email)), 'email_'),
                        cm.visitor_id
                    )
                ) AS unread_count,
                COALESCE(cmd.is_pinned, FALSE) AS is_pinned,
                COALESCE(cmd.is_done, FALSE) AS is_done,
                COALESCE(cmd.is_blocked, FALSE) AS is_blocked,
                COALESCE(cmd.is_muted, FALSE) AS is_muted,
                COALESCE(cmd.payment_status, 'none') AS payment_status
            FROM chat_messages cm
            LEFT JOIN web_visitors wv ON (wv.visitor_id = cm.visitor_id OR wv.visitor_id = cm.user_id::text)
            LEFT JOIN website_customers wc ON (
                (wc.dashboard_chat_id = cm.visitor_id OR wc.dashboard_chat_id = wv.visitor_id)
                OR (wc.firebase_uid IS NOT NULL AND wc.firebase_uid != '' AND (wc.firebase_uid = wv.firebase_uid OR wc.firebase_uid = cm.visitor_id))
                OR (wv.email IS NOT NULL AND wv.email != '' AND LOWER(wc.email) = LOWER(wv.email))
                OR (wv.phone IS NOT NULL AND wv.phone != '' AND wc.phone = wv.phone)
                OR (wv.name IS NOT NULL AND wv.name NOT IN ('Website Customer', 'Shop Visitor', 'Guest', 'User') AND LOWER(wc.display_name) = LOWER(wv.name))
            ) AND wc.bot_id = cm.bot_id
            LEFT JOIN customer_profiles cp ON ((cp.uid = wv.firebase_uid OR cp.uid = cm.visitor_id OR cp.uid = cm.user_id::text) OR (cp.email IS NOT NULL AND cp.email != '' AND (cp.email = wv.email OR cp.email = wc.email))) AND cp.bot_id = cm.bot_id
            LEFT JOIN chat_metadata cmd ON cmd.bot_id = cm.bot_id AND (
                cmd.visitor_id = cm.visitor_id 
                OR cmd.visitor_id = 'web_' || cm.visitor_id 
                OR cmd.visitor_id = REPLACE(cm.visitor_id, 'web_', '')
                OR (wc.dashboard_chat_id IS NOT NULL AND cmd.visitor_id = wc.dashboard_chat_id)
                OR (wc.firebase_uid IS NOT NULL AND cmd.visitor_id = wc.firebase_uid)
                OR (wv.visitor_id IS NOT NULL AND cmd.visitor_id = wv.visitor_id)
                OR (wv.firebase_uid IS NOT NULL AND cmd.visitor_id = wv.firebase_uid)
            )
            WHERE cm.visitor_id IS NOT NULL 
              AND cm.visitor_id NOT LIKE 'tg_%%' 
              AND cm.visitor_id NOT LIKE 'web_tg_%%' 
              AND (cm.user_id IS NULL OR cm.user_id = 0) 
              AND cm.bot_id = %s
        ) combined
        ORDER BY customer_key, last_time DESC NULLS LAST
    """, (bot_id,), fetch=True) or []
    result = []
    seen_keys = set()
    for row in rows:
        r = serialize(row)
        v_id = str(r.get("visitor_id") or r.get("customer_key") or "").strip()
        c_name = (r.get("name") or "").strip().lower()
        wc_id = r.get("website_customer_id")
        phone = (r.get("phone") or "").strip()
        email = (r.get("email") or "").strip().lower()

        name_key = f"name_{c_name}" if (c_name and c_name not in ("website customer", "shop visitor", "guest", "user", "customer")) else None
        wc_key = f"wc_{wc_id}" if wc_id else None
        email_key = f"email_{email}" if email else None
        phone_key = f"phone_{phone}" if phone else None

        if (v_id in seen_keys or 
            (wc_key and wc_key in seen_keys) or 
            (email_key and email_key in seen_keys) or 
            (phone_key and phone_key in seen_keys) or 
            (name_key and name_key in seen_keys)):
            continue

        seen_keys.add(v_id)
        if wc_key: seen_keys.add(wc_key)
        if email_key: seen_keys.add(email_key)
        if phone_key: seen_keys.add(phone_key)
        if name_key: seen_keys.add(name_key)

        if v_id.startswith('support_') or v_id == f"support_{bot_id}":
            r["name"] = "E-commerce Support"
            r["unread_count"] = row["unread_count"] or 0
            r["is_registered_customer"] = False
            r["conversation_id"] = v_id
            result.append(r)
            continue

        r["unread_count"] = row["unread_count"] or 0
        r["name"] = row["name"] if row.get("name") and row["name"].strip() else "Website Customer"
        r["website_customer_id"] = row.get("website_customer_id")

        fb_uid = (r.get("firebase_uid") or "").strip()
        c_name = (r.get("name") or "").strip()
        has_real_name = bool(c_name and c_name not in ("Website Customer", "Shop Visitor", "Guest", "User"))
        has_account = bool(has_real_name and (row.get("website_customer_id") or (fb_uid and not fb_uid.startswith(('wv_', 'v_', 'dc_')))))
        r["is_registered_customer"] = has_account

        if v_id.startswith(('web_', 'tg_', 'dc_')):
            r["conversation_id"] = v_id
        else:
            r["conversation_id"] = f"web_{v_id}"
        result.append(r)
    result.sort(key=lambda r: (bool(r.get("is_pinned")), r.get("last_time") or ""), reverse=True)
    return result


@router.get("/web-visitor-messages/{bot_id}/{visitor_id}", tags=["Chat"])
@router.get("/web-visitors/{visitor_id}/messages", tags=["Chat"])
def get_web_visitor_messages(visitor_id: str, bot_id: int, ctx: UserCtx = Depends(require_token)):
    """Get all messages for a web visitor conversation."""
    bf, bp = scope_filter(ctx, "", bot_id)
    if not bf:
        raise HTTPException(403, "No access to this bot")
    v_str = str(visitor_id).strip()
    clean_str = v_str.replace("web_tg_", "").replace("tg_", "")
    web_tg_str = "web_tg_" + clean_str
    tg_str = "tg_" + clean_str

    if v_str.startswith('support_') or v_str == 'support':
        supp_id = f"support_{bot_id}"
        sql_sel = (
            "SELECT id, sender_type, message_text, file_id, file_type, created_at "
            "FROM chat_messages "
            "WHERE bot_id = %s AND (visitor_id = %s OR visitor_id = 'support' OR visitor_id LIKE 'support%%') "
            "ORDER BY created_at ASC"
        )
        rows = db.q(sql_sel, (bot_id, supp_id), fetch=True) or []
        if not rows:
            welcome_msg = "Hello! 👋 Welcome to E-commerce Support. If you have any questions or need assistance with your shop, please send us a message here!"
            db.q(
                "INSERT INTO chat_messages (bot_id, visitor_id, sender_type, sender_name, message_text) VALUES (%s, %s, 'superadmin', 'E-commerce Support', %s)",
                (bot_id, supp_id, welcome_msg)
            )
            rows = db.q(sql_sel, (bot_id, supp_id), fetch=True) or []
    else:
        cur_v_set = set([v_str, web_tg_str, tg_str, clean_str])

        target_info = db.q("""
            SELECT 
                COALESCE(wc.display_name, wv.name) as name,
                COALESCE(wc.email, wv.email) as email,
                COALESCE(wc.phone, wv.phone) as phone,
                COALESCE(wc.firebase_uid, wv.firebase_uid) as firebase_uid,
                wc.dashboard_chat_id
            FROM (SELECT 1) dummy
            LEFT JOIN website_customers wc ON wc.bot_id = %s AND (wc.dashboard_chat_id = %s OR wc.firebase_uid = %s OR wc.dashboard_chat_id = %s OR wc.firebase_uid = %s)
            LEFT JOIN web_visitors wv ON wv.bot_id = %s AND (wv.visitor_id = %s OR wv.firebase_uid = %s OR wv.visitor_id = %s OR wv.firebase_uid = %s)
            LIMIT 1
        """, (bot_id, v_str, v_str, clean_str, clean_str, bot_id, v_str, v_str, clean_str, clean_str), fetch_one=True) or {}

        t_name = (target_info.get("name") or "").strip()
        t_email = (target_info.get("email") or "").strip()
        t_phone = (target_info.get("phone") or "").strip()
        t_fuid = (target_info.get("firebase_uid") or "").strip()
        t_dcid = (target_info.get("dashboard_chat_id") or "").strip()

        if t_fuid: cur_v_set.add(t_fuid)
        if t_dcid: cur_v_set.add(t_dcid)

        matched_vids = db.q("""
            SELECT DISTINCT cm.visitor_id
            FROM chat_messages cm
            LEFT JOIN web_visitors wv ON (wv.visitor_id = cm.visitor_id) AND wv.bot_id = cm.bot_id
            LEFT JOIN website_customers wc ON (wc.dashboard_chat_id = cm.visitor_id OR wc.firebase_uid = cm.visitor_id) AND wc.bot_id = cm.bot_id
            WHERE cm.bot_id = %s AND (
                cm.visitor_id = ANY(%s)
                OR (wv.visitor_id IS NOT NULL AND wv.visitor_id = ANY(%s))
                OR (wc.dashboard_chat_id IS NOT NULL AND wc.dashboard_chat_id = ANY(%s))
                OR (%s != '' AND (wc.firebase_uid = %s OR wv.firebase_uid = %s OR cm.visitor_id = %s))
                OR (%s != '' AND %s NOT IN ('Website Customer', 'Shop Visitor', 'Guest', 'User') AND (
                    LOWER(wc.display_name) = LOWER(%s) OR LOWER(wv.name) = LOWER(%s)
                ))
                OR (%s != '' AND %s != 'N/A' AND (wc.email = %s OR wv.email = %s))
                OR (%s != '' AND %s != 'N/A' AND (wc.phone = %s OR wv.phone = %s))
            )
        """, (
            bot_id,
            list(cur_v_set), list(cur_v_set), list(cur_v_set),
            t_fuid, t_fuid, t_fuid, t_fuid,
            t_name, t_name, t_name, t_name,
            t_email, t_email, t_email, t_email,
            t_phone, t_phone, t_phone, t_phone
        ), fetch=True) or []

        for row in matched_vids:
            if row.get("visitor_id"):
                cur_v_set.add(row["visitor_id"])

        v_list = list(cur_v_set)

        db.q(
            "UPDATE chat_messages SET is_read = TRUE WHERE bot_id = %s AND sender_type IN ('user', 'superadmin') AND (is_read IS NULL OR is_read = FALSE) AND visitor_id = ANY(%s)",
            (bot_id, v_list)
        )

        rows = db.q(
            "SELECT id, sender_type, message_text, file_id, file_type, created_at FROM chat_messages WHERE bot_id = %s AND user_id IS NULL AND visitor_id = ANY(%s) ORDER BY created_at ASC",
            (bot_id, v_list), fetch=True
        ) or []
    return serialize(rows)

@router.post("/web-visitors/{visitor_id}/send", tags=["Chat"])
def send_web_visitor_message(visitor_id: str, req: WebVisitorSendRequest, ctx: UserCtx = Depends(require_token)):
    """Send a message from admin to a web visitor (stored in DB, not Telegram)."""
    bf, bp = scope_filter(ctx, "", req.bot_id)
    if not bf:
        raise HTTPException(403, "No access to this bot")
    v_str = str(visitor_id).strip()

    # Look up canonical primary visitor_id
    v_info = db.q("SELECT visitor_id, firebase_uid FROM web_visitors WHERE bot_id = %s AND (visitor_id = %s OR firebase_uid = %s)", (req.bot_id, v_str, v_str), fetch_one=True) or {}
    primary_id = v_info.get("visitor_id") or v_str

    db.q(
        "INSERT INTO chat_messages (bot_id, visitor_id, user_id, sender_type, sender_name, message_text, file_id, file_type) VALUES (%s, %s, NULL, 'admin', %s, %s, %s, %s)",
        (req.bot_id, primary_id, ctx.staff_name or None, req.message, req.file_id, req.file_type)
    )

    msg_trunc = req.message[:80] + ("…" if len(req.message) > 80 else "")
    log_staff_activity(ctx, req.bot_id, f"replied to web visitor {visitor_id}: '{msg_trunc}'")
    return {"success": True}

@router.post("/web-visitors/{visitor_id}/mark-read", tags=["Chat"])
def mark_web_visitor_read(visitor_id: str, data: dict = Body(...), ctx: UserCtx = Depends(require_token)):
    bot_id = data.get("bot_id")
    if not bot_id:
        raise HTTPException(400, "bot_id required")
    bf, bp = scope_filter(ctx, "", bot_id)
    if not bf:
        raise HTTPException(403, "No access to this bot")
    v_str = str(visitor_id).strip()
    v_clean = v_str.replace("web_", "").replace("tg_", "")
    v_web = "web_" + v_clean
    v_tg = "tg_" + v_clean

    db.q(
        """UPDATE chat_messages SET is_read = TRUE 
           WHERE bot_id = %s AND (
               visitor_id IN (%s, %s, %s, %s)
               OR user_id::text IN (%s, %s)
               OR visitor_id IN (
                   SELECT dashboard_chat_id FROM website_customers WHERE (dashboard_chat_id IN (%s, %s, %s) OR firebase_uid IN (%s, %s, %s)) AND bot_id = %s AND dashboard_chat_id IS NOT NULL
                   UNION
                   SELECT firebase_uid FROM website_customers WHERE (dashboard_chat_id IN (%s, %s, %s) OR firebase_uid IN (%s, %s, %s)) AND bot_id = %s AND firebase_uid IS NOT NULL
                   UNION
                   SELECT visitor_id FROM web_visitors WHERE (visitor_id IN (%s, %s, %s) OR firebase_uid IN (%s, %s, %s)) AND bot_id = %s
                   UNION
                   SELECT firebase_uid FROM web_visitors WHERE (visitor_id IN (%s, %s, %s) OR firebase_uid IN (%s, %s, %s)) AND bot_id = %s AND firebase_uid IS NOT NULL
               )
           )""",
        (bot_id, v_str, v_clean, v_web, v_tg, v_str, v_clean,
         v_str, v_clean, v_web, v_str, v_clean, v_web, bot_id,
         v_str, v_clean, v_web, v_str, v_clean, v_web, bot_id,
         v_str, v_clean, v_web, v_str, v_clean, v_web, bot_id,
         v_str, v_clean, v_web, v_str, v_clean, v_web, bot_id)
    )
    return {"success": True}


@router.post("/web-visitors/{visitor_id}/mark-unread", tags=["Chat"])
def mark_web_visitor_unread(visitor_id: str, data: dict = Body(...), ctx: UserCtx = Depends(require_token)):
    bot_id = data.get("bot_id")
    if not bot_id:
        raise HTTPException(400, "bot_id required")
    bf, bp = scope_filter(ctx, "", bot_id)
    if not bf:
        raise HTTPException(403, "No access to this bot")
    v_str = str(visitor_id).strip()
    v_clean = v_str.replace("web_", "").replace("tg_", "")
    v_web = "web_" + v_clean
    v_tg = "tg_" + v_clean

    db.q(
        """UPDATE chat_messages SET is_read = FALSE 
           WHERE id IN (
               SELECT id FROM chat_messages
               WHERE bot_id = %s AND sender_type NOT IN ('admin', 'ai') AND (
                   visitor_id IN (%s, %s, %s, %s)
                   OR user_id::text IN (%s, %s)
                   OR visitor_id IN (
                       SELECT dashboard_chat_id FROM website_customers WHERE (dashboard_chat_id IN (%s, %s, %s) OR firebase_uid IN (%s, %s, %s)) AND bot_id = %s AND dashboard_chat_id IS NOT NULL
                       UNION
                       SELECT firebase_uid FROM website_customers WHERE (dashboard_chat_id IN (%s, %s, %s) OR firebase_uid IN (%s, %s, %s)) AND bot_id = %s AND firebase_uid IS NOT NULL
                       UNION
                       SELECT visitor_id FROM web_visitors WHERE (visitor_id IN (%s, %s, %s) OR firebase_uid IN (%s, %s, %s)) AND bot_id = %s
                       UNION
                       SELECT firebase_uid FROM web_visitors WHERE (visitor_id IN (%s, %s, %s) OR firebase_uid IN (%s, %s, %s)) AND bot_id = %s AND firebase_uid IS NOT NULL
                   )
               )
               ORDER BY created_at DESC LIMIT 1
           )""",
        (bot_id, v_str, v_clean, v_web, v_tg, v_str, v_clean,
         v_str, v_clean, v_web, v_str, v_clean, v_web, bot_id,
         v_str, v_clean, v_web, v_str, v_clean, v_web, bot_id,
         v_str, v_clean, v_web, v_str, v_clean, v_web, bot_id,
         v_str, v_clean, v_web, v_str, v_clean, v_web, bot_id)
    )
    return {"success": True}


@router.post("/web-visitors/{visitor_id}/mark-unread", tags=["Chat"])
def mark_web_visitor_unread(visitor_id: str, data: dict = Body(...), ctx: UserCtx = Depends(require_token)):
    bot_id = data.get("bot_id")
    if not bot_id:
        raise HTTPException(400, "bot_id required")
    bf, bp = scope_filter(ctx, "", bot_id)
    if not bf:
        raise HTTPException(403, "No access to this bot")
    v_str = str(visitor_id).strip()
    v_tg = "tg_" + v_str if not v_str.startswith("tg_") else v_str
    v_clean = v_str.replace("tg_", "")

    db.q(
        """UPDATE chat_messages SET is_read = FALSE 
           WHERE bot_id = %s AND (
               visitor_id = %s OR visitor_id = %s OR visitor_id = %s
               OR user_id::text = %s
               OR visitor_id IN (SELECT firebase_uid FROM web_visitors WHERE (visitor_id = %s OR visitor_id = %s OR firebase_uid = %s OR firebase_uid = %s) AND firebase_uid IS NOT NULL)
               OR visitor_id IN (SELECT visitor_id FROM web_visitors WHERE (visitor_id = %s OR visitor_id = %s OR firebase_uid = %s OR firebase_uid = %s))
           )""",
        (bot_id, v_str, v_tg, v_clean, v_str, v_str, v_tg, v_str, v_tg, v_str, v_tg, v_str, v_tg)
    )
    return {"success": True}


@router.delete("/web-visitors/{visitor_id}", tags=["Chat"])
def delete_web_visitor(visitor_id: str, bot_id: int, ctx: UserCtx = Depends(require_token)):
    """Delete all messages and data for a web visitor conversation."""
    bf, bp = scope_filter(ctx, "", bot_id)
    if not bf:
        raise HTTPException(403, "No access to this bot")
    v_str = str(visitor_id).strip()
    u_id = int(v_str) if (v_str.isdigit() and len(v_str) < 19) else None
    db.q("DELETE FROM chat_messages WHERE bot_id = %s AND (visitor_id = %s OR visitor_id = %s OR (%s IS NOT NULL AND user_id = %s))", (bot_id, v_str, "tg_" + v_str, u_id, u_id))
    db.q("DELETE FROM web_visitors WHERE bot_id = %s AND (visitor_id = %s OR firebase_uid = %s)", (bot_id, v_str, v_str))
    db.q("DELETE FROM chat_metadata WHERE bot_id = %s AND (visitor_id = %s OR visitor_id = %s)", (bot_id, v_str, "tg_" + v_str))
    if u_id:
        db.q("DELETE FROM customer_profiles WHERE bot_id = %s AND uid = %s", (bot_id, v_str))
    log_staff_activity(ctx, bot_id, f"deleted web visitor chat {visitor_id}")
    return {"success": True}


@router.patch("/web-visitors/{visitor_id}/ai-toggle", tags=["Chat"])
def toggle_web_visitor_ai(visitor_id: str, data: dict = Body(...), ctx: UserCtx = Depends(require_token)):
    """Enable or disable AI responses for a web visitor."""
    bot_id = data.get("bot_id")
    if not bot_id:
        raise HTTPException(400, "bot_id is required")
    bf, bp = scope_filter(ctx, "", bot_id)
    if not bf:
        raise HTTPException(403, "No access to this bot")
    disabled = data.get("ai_disabled", False)
    db.q("UPDATE web_visitors SET ai_disabled = %s WHERE visitor_id = %s", (disabled, visitor_id))
    log_staff_activity(ctx, bot_id, f"{'disabled' if disabled else 'enabled'} AI for web visitor {visitor_id}")
    return {"success": True, "ai_disabled": disabled}


# ─────────────────────────────────────────────
#  PAYMENT METHODS
# ─────────────────────────────────────────────

class InitiateWebVisitorRequest(BaseModel):
    bot_id: int
    firebase_uid: Optional[str] = None
    name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    visitor_id: Optional[str] = None

@router.post("/web-visitors/initiate", tags=["Chat"])
def initiate_web_visitor(req: InitiateWebVisitorRequest, ctx: UserCtx = Depends(require_token)):
    """Find existing or create canonical web_visitor chat session for a website customer."""
    bf, bp = scope_filter(ctx, "", req.bot_id)
    if not bf:
        raise HTTPException(403, "No access to this bot")

    uid_str = str(req.firebase_uid or req.visitor_id or "").strip()
    clean_uid = re.sub(r'^(web_|guest_)', '', uid_str)
    email_str = (req.email or "").strip()
    phone_str = (req.phone or "").strip()
    disp_name = (req.name or "Website Customer").strip()

    wc_row = db.q("""
        SELECT dashboard_chat_id FROM website_customers 
        WHERE bot_id = %s AND (
            dashboard_chat_id = %s OR 
            firebase_uid = %s OR 
            dashboard_chat_id = %s OR 
            firebase_uid = %s OR
            id::text = %s OR
            (email IS NOT NULL AND email != '' AND email = %s)
        )
        ORDER BY id ASC LIMIT 1
    """, (req.bot_id, uid_str, uid_str, clean_uid, clean_uid, clean_uid, email_str), fetch_one=True)

    if wc_row and wc_row.get('dashboard_chat_id'):
        target_uid = wc_row['dashboard_chat_id']
    else:
        v_row = db.q("""
            SELECT visitor_id FROM web_visitors 
            WHERE bot_id = %s AND (
                visitor_id = %s OR 
                firebase_uid = %s OR 
                visitor_id = %s OR 
                firebase_uid = %s OR
                (email IS NOT NULL AND email != '' AND email = %s)
            )
            ORDER BY created_at ASC LIMIT 1
        """, (req.bot_id, uid_str, uid_str, clean_uid, clean_uid, email_str), fetch_one=True)

        if v_row and v_row.get('visitor_id') and v_row['visitor_id'].startswith('dc_'):
            target_uid = v_row['visitor_id']
        elif clean_uid.startswith('dc_'):
            target_uid = clean_uid
        else:
            target_uid = f"dc_{uuid.uuid4().hex[:28]}"

    db.q("""
        INSERT INTO web_visitors (visitor_id, bot_id, name, phone, email, firebase_uid)
        VALUES (%s, %s, %s, %s, %s, %s)
        ON CONFLICT (visitor_id) DO UPDATE 
        SET bot_id = EXCLUDED.bot_id,
            name = COALESCE(NULLIF(EXCLUDED.name, ''), web_visitors.name),
            phone = COALESCE(NULLIF(EXCLUDED.phone, ''), web_visitors.phone),
            email = COALESCE(NULLIF(EXCLUDED.email, ''), web_visitors.email),
            firebase_uid = COALESCE(NULLIF(EXCLUDED.firebase_uid, ''), web_visitors.firebase_uid)
    """, (target_uid, req.bot_id, disp_name, phone_str, email_str, uid_str))

    return {"visitor_id": target_uid, "conversation_id": target_uid}

class ChatMetadataUpdate(BaseModel):
    is_pinned: Optional[bool] = None
    is_done: Optional[bool] = None
    is_blocked: Optional[bool] = None
    is_muted: Optional[bool] = None
    payment_status: Optional[str] = None
    ai_disabled: Optional[bool] = None


@router.post("/chats/{visitor_id}/metadata", tags=["Chat"])
def update_chat_metadata(visitor_id: str, bot_id: int, body: ChatMetadataUpdate, ctx: UserCtx = Depends(require_token)):
    """Update metadata (pin, done, block, mute, payment status, ai_disabled) for a visitor chat."""
    bf, bp = scope_filter(ctx, "", bot_id)
    if not bf:
        raise HTTPException(403, "No access to this bot")
    v_str = str(visitor_id).strip()
    v_clean = v_str.replace("web_", "").replace("tg_", "")
    v_web = "web_" + v_clean
    v_tg = "tg_" + v_clean

    targets = set([v_str, v_clean, v_web, v_tg])
    linked = db.q(
        """SELECT dashboard_chat_id, firebase_uid FROM website_customers WHERE (dashboard_chat_id IN (%s, %s, %s) OR firebase_uid IN (%s, %s, %s)) AND bot_id = %s
           UNION
           SELECT visitor_id, firebase_uid FROM web_visitors WHERE (visitor_id IN (%s, %s, %s) OR firebase_uid IN (%s, %s, %s)) AND bot_id = %s""",
        (v_str, v_clean, v_web, v_str, v_clean, v_web, bot_id,
         v_str, v_clean, v_web, v_str, v_clean, v_web, bot_id), fetch=True
    ) or []
    for r in linked:
        for val in r.values():
            if val:
                targets.add(str(val).strip())

    if body.is_pinned is True:
        pinned_count = db.q(
            "SELECT COUNT(*) as count FROM chat_metadata WHERE bot_id = %s AND is_pinned = TRUE AND visitor_id NOT IN %s",
            (bot_id, tuple(targets)), fetch_one=True
        )
        if pinned_count and (pinned_count.get("count") or 0) >= 10:
            raise HTTPException(400, "Maximum 10 pinned chats allowed per bot")

    for target_id in targets:
        db.q("""
            INSERT INTO chat_metadata (bot_id, visitor_id)
            VALUES (%s, %s)
            ON CONFLICT (bot_id, visitor_id) DO NOTHING
        """, (bot_id, target_id))

    updates = []
    params = []
    if body.is_pinned is not None:
        updates.append("is_pinned = %s")
        params.append(body.is_pinned)
    if body.is_done is not None:
        updates.append("is_done = %s")
        params.append(body.is_done)
    if body.is_blocked is not None:
        updates.append("is_blocked = %s")
        params.append(body.is_blocked)
    if body.is_muted is not None:
        updates.append("is_muted = %s")
        params.append(body.is_muted)
    if body.payment_status is not None:
        updates.append("payment_status = %s")
        params.append(body.payment_status)
    if body.ai_disabled is not None:
        updates.append("ai_disabled = %s")
        params.append(body.ai_disabled)
        for t in targets:
            db.q("UPDATE web_visitors SET ai_disabled = %s WHERE bot_id = %s AND visitor_id = %s", (body.ai_disabled, bot_id, t))

    if updates:
        updates.append("updated_at = NOW()")
        sql = f"UPDATE chat_metadata SET {', '.join(updates)} WHERE bot_id = %s AND visitor_id = %s"
        for _target in targets:
            _p = list(params) + [bot_id, _target]
            db.q(sql, tuple(_p))

    return {"success": True}
