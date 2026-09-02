from pydantic import BaseModel
"""
Superadmin routes — split from backend.py
"""

from fastapi import APIRouter, Depends, HTTPException, Body, File, Request
from typing import Optional, List, Any, Dict
from common import db, require_token, UserCtx, serialize, logger, SuperadminSendMessage, FaqCreate, SubscriptionDiscountCreate, SubscriptionDiscountUpdate, scope_filter
import json, datetime, subprocess

router = APIRouter()

@router.get("/superadmin/bots", tags=["Superadmin"])
def get_all_bots(ctx: UserCtx = Depends(require_token)):
    if not ctx.is_superadmin:
        raise HTTPException(403, "Superadmin only")
    return serialize(db.q("SELECT * FROM managed_bots ORDER BY sort_order NULLS LAST, created_at DESC", fetch=True))



@router.get("/superadmin/subscribers", tags=["Superadmin"])
def get_subscribers(ctx: UserCtx = Depends(require_token)):
    """Get all subscribers (bots) with owner info for superadmin."""
    if not ctx.is_superadmin:
        raise HTTPException(403, "Superadmin only")
    rows = db.q(
        "SELECT mb.id, mb.bot_username, mb.bot_full_name as shop_name, "
        "mb.plan_name, mb.plan_expiry, mb.plan_start_date, mb.is_active, "
        "u.username as owner_username "
        "FROM managed_bots mb "
        "LEFT JOIN users u ON u.telegram_id = mb.owner_telegram_id "
        "ORDER BY mb.sort_order NULLS LAST, mb.created_at DESC",
        fetch=True)
    seen = set()
    result = []
    for r in rows:
        key = r["id"]
        if key not in seen:
            seen.add(key)
            result.append(r)
    return serialize(result)

@router.post("/superadmin/send-message", tags=["Superadmin"])
def superadmin_send_message(body: SuperadminSendMessage, ctx: UserCtx = Depends(require_token)):
    if not ctx.is_superadmin:
        raise HTTPException(403, "Superadmin only")
    bot_id = body.bot_id
    message = body.message.strip()
    if not message:
        raise HTTPException(400, "Message cannot be empty")
    visitor_id = f"support_{bot_id}"
    # Ensure web_visitors entry exists for this support conversation
    db.q("""
        INSERT INTO web_visitors (visitor_id, bot_id, name)
        VALUES (%s, %s, 'E-commerce Support')
        ON CONFLICT (visitor_id) DO UPDATE SET name = 'E-commerce Support'
    """, (visitor_id, bot_id))
    db.q(
        "INSERT INTO chat_messages (bot_id, visitor_id, sender_type, message_text) VALUES (%s, %s, 'superadmin', %s)",
        (bot_id, visitor_id, message)
    )
    return {"success": True}


@router.post("/superadmin/update-apk", tags=["Superadmin"])
def trigger_apk_update(ctx: UserCtx = Depends(require_token)):
    if not ctx.is_superadmin:
        raise HTTPException(403, "Superadmin only")
    try:
        now_str = datetime.datetime.utcnow().isoformat()
        db.q("INSERT INTO app_settings (key, value) VALUES ('release_timestamp', %s) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value", (now_str,))
        
        try:
            subprocess.run(["/usr/local/bin/update-apk.sh"], capture_output=True, text=True, timeout=60)
        except Exception as e:
            logger.warning(f"update-apk.sh warning: {e}")

        from common import _send_fcm_silent_data
        _send_fcm_silent_data({"type": "app_release", "timestamp": now_str})

        return {"success": True, "message": "Release update published to all devices!"}
    except Exception as e:
        raise HTTPException(500, str(e))


@router.get("/superadmin/messages", tags=["Superadmin"])
def superadmin_get_messages(ctx: UserCtx = Depends(require_token)):
    if not ctx.is_superadmin:
        raise HTTPException(403, "Superadmin only")
    rows = db.q(
        "SELECT cm.*, mb.bot_username, mb.bot_full_name FROM chat_messages cm JOIN managed_bots mb ON cm.bot_id = mb.id WHERE cm.sender_type = 'superadmin' ORDER BY cm.created_at DESC",
        fetch=True
    )
    return serialize(rows)


@router.get("/admin/messages", tags=["Admin"])
def admin_get_messages(ctx: UserCtx = Depends(require_token)):
    """Get superadmin messages for this admin's bots."""
    if not ctx.bot_ids:
        return []
    ph = ",".join(["%s"] * len(ctx.bot_ids))
    rows = db.q(
        f"SELECT * FROM chat_messages WHERE sender_type = 'superadmin' AND bot_id IN ({ph}) ORDER BY sort_order NULLS LAST, created_at DESC",
        tuple(ctx.bot_ids), fetch=True
    )
    return serialize(rows)


@router.get("/admin/messages/unread-count", tags=["Admin"])
def admin_messages_unread_count(ctx: UserCtx = Depends(require_token)):
    """Get unread superadmin message count for this admin's bots."""
    if not ctx.bot_ids:
        return {"count": 0}
    ph = ",".join(["%s"] * len(ctx.bot_ids))
    row = db.q(
        f"SELECT COUNT(*) as c FROM chat_messages WHERE sender_type = 'superadmin' AND bot_id IN ({ph}) AND (is_read IS NULL OR is_read = FALSE)",
        tuple(ctx.bot_ids), fetch_one=True
    )
    return {"count": row["c"] if row else 0}


@router.get("/faqs", tags=["FAQs"])
def list_faqs():
    rows = db.q("SELECT * FROM faqs ORDER BY sort_order NULLS LAST, created_at DESC", fetch=True) or []
    return serialize(rows)


@router.post("/faqs", tags=["FAQs"])
def create_faq(body: FaqCreate, ctx: UserCtx = Depends(require_token)):
    if not ctx.is_superadmin:
        raise HTTPException(403, "Superadmin only")
    q = body.question.strip()
    a = body.answer.strip()
    if not q or not a:
        raise HTTPException(400, "Question and answer are required")
    row = db.q(
        "INSERT INTO faqs (question, answer) VALUES (%s, %s) RETURNING *",
        (q, a), fetch_one=True
    )
    return serialize(row)


@router.put("/faqs/reorder", tags=["FAQs"])
def reorder_faqs(body: dict = Body(...), ctx: UserCtx = Depends(require_token)):
    if not ctx.is_superadmin:
        raise HTTPException(403, "Superadmin only")
    items = body.get("items", [])
    for item in items:
        faq_id = item.get("id")
        sort_order = item.get("sort_order", 0)
        db.q("UPDATE faqs SET sort_order=%s WHERE id=%s", (sort_order, faq_id))
    return {"success": True}


@router.put("/faqs/{faq_id}", tags=["FAQs"])
def update_faq(faq_id: int, body: FaqCreate, ctx: UserCtx = Depends(require_token)):
    if not ctx.is_superadmin:
        raise HTTPException(403, "Superadmin only")
    q = body.question.strip()
    a = body.answer.strip()
    if not q or not a:
        raise HTTPException(400, "Question and answer are required")
    row = db.q(
        "UPDATE faqs SET question=%s, answer=%s, updated_at=CURRENT_TIMESTAMP WHERE id=%s RETURNING *",
        (q, a, faq_id), fetch_one=True
    )
    if not row:
        raise HTTPException(404, "FAQ not found")
    return serialize(row)


@router.delete("/faqs/{faq_id}", tags=["FAQs"])
def delete_faq(faq_id: int, ctx: UserCtx = Depends(require_token)):
    if not ctx.is_superadmin:
        raise HTTPException(403, "Superadmin only")
    db.q("DELETE FROM faqs WHERE id = %s", (faq_id,))
    return {"success": True}


@router.post("/admin/messages/read", tags=["Admin"])
def admin_mark_messages_read(ctx: UserCtx = Depends(require_token)):
    """Mark all superadmin messages as read for this admin's bots."""
    if not ctx.bot_ids:
        return {"success": True}
    ph = ",".join(["%s"] * len(ctx.bot_ids))
    db.q(
        f"UPDATE chat_messages SET is_read = TRUE WHERE sender_type = 'superadmin' AND bot_id IN ({ph})",
        tuple(ctx.bot_ids)
    )
    return {"success": True}


@router.delete("/admin/messages/{message_id}", tags=["Admin"])
def admin_delete_message(message_id: int, ctx: UserCtx = Depends(require_token)):
    """Delete a superadmin message."""
    msg = db.q("SELECT * FROM chat_messages WHERE id = %s AND sender_type = 'superadmin'", (message_id,), fetch_one=True)
    if not msg:
        raise HTTPException(404, "Message not found")
    if not ctx.is_superadmin:
        bf, bp = scope_filter(ctx, "", msg["bot_id"])
        if not bf:
            raise HTTPException(403, "No access")
    db.q("DELETE FROM chat_messages WHERE id = %s", (message_id,))
    return {"success": True}


@router.get("/superadmin/support/conversations", tags=["Superadmin"])
def superadmin_support_conversations(ctx: UserCtx = Depends(require_token)):
    """List all support conversations for superadmin."""
    if not ctx.is_superadmin:
        raise HTTPException(403, "Superadmin only")
    rows = db.q("""
        SELECT DISTINCT ON (cm.visitor_id)
            cm.visitor_id,
            cm.bot_id,
            mb.bot_username,
            mb.bot_full_name,
            wv.name as visitor_name,
            cm.message_text AS last_message,
            cm.sender_type AS last_sender,
            cm.created_at AS last_time,
            COUNT(*) FILTER (WHERE cm.sender_type = 'admin' AND cm.is_read = FALSE) OVER (PARTITION BY cm.visitor_id) AS unread_count
        FROM chat_messages cm
        JOIN managed_bots mb ON mb.id = cm.bot_id
        LEFT JOIN web_visitors wv ON wv.visitor_id = cm.visitor_id
        WHERE cm.visitor_id LIKE 'support_%%'
        ORDER BY cm.visitor_id, cm.created_at DESC
    """, fetch=True) or []
    result = []
    for row in rows:
        r = serialize(row)
        r["unread_count"] = row["unread_count"] or 0
        result.append(r)
    result.sort(key=lambda r: r["last_time"] or "", reverse=True)
    return result


@router.post("/superadmin/support/reply/{bot_id}", tags=["Superadmin"])
def superadmin_support_reply(bot_id: int, body: dict = Body(...), ctx: UserCtx = Depends(require_token)):
    """Superadmin replies to a support conversation."""
    if not ctx.is_superadmin:
        raise HTTPException(403, "Superadmin only")
    message = body.get("message", "").strip()
    if not message:
        raise HTTPException(400, "Message cannot be empty")
    visitor_id = f"support_{bot_id}"
    db.q("""
        INSERT INTO web_visitors (visitor_id, bot_id, name)
        VALUES (%s, %s, 'E-commerce Support')
        ON CONFLICT (visitor_id) DO UPDATE SET name = 'E-commerce Support'
    """, (visitor_id, bot_id))
    db.q(
        "INSERT INTO chat_messages (bot_id, visitor_id, sender_type, message_text) VALUES (%s, %s, 'superadmin', %s)",
        (bot_id, visitor_id, message)
    )
    return {"success": True}


@router.get("/superadmin/support/messages/{bot_id}", tags=["Superadmin"])
def superadmin_support_messages(bot_id: int, ctx: UserCtx = Depends(require_token)):
    """Get all messages for a support conversation."""
    if not ctx.is_superadmin:
        raise HTTPException(403, "Superadmin only")
    visitor_id = f"support_{bot_id}"
    rows = db.q(
        "SELECT * FROM chat_messages WHERE visitor_id = %s ORDER BY created_at ASC",
        (visitor_id,), fetch=True
    ) or []
    return serialize(rows)


# ─────────────────────────────────────────────
#  MANAGED BOTS
# ─────────────────────────────────────────────

@router.get("/superadmin/subscription-discounts", tags=["Superadmin"])
def get_subscription_discounts(ctx: UserCtx = Depends(require_token)):
    if not ctx.is_superadmin:
        raise HTTPException(403, "Superadmin only")
    rows = db.q("SELECT * FROM subscription_discounts ORDER BY created_at DESC", fetch=True)
    return serialize(rows)


@router.post("/superadmin/subscription-discounts", tags=["Superadmin"])
def create_subscription_discount(body: SubscriptionDiscountCreate, ctx: UserCtx = Depends(require_token)):
    if not ctx.is_superadmin:
        raise HTTPException(403, "Superadmin only")
    if body.discount_percent < 1 or body.discount_percent > 100:
        raise HTTPException(400, "Discount must be between 1 and 100")
    if body.duration_days is not None and body.duration_days < 1:
        raise HTTPException(400, "Duration must be at least 1 day")
    code = body.code.strip() if body.code.strip() else _generate_discount_code()
    existing = db.q("SELECT id FROM subscription_discounts WHERE code=%s", (code,), fetch_one=True)
    if existing:
        raise HTTPException(409, "Code already exists")
    expires_at = body.expires_at if body.expires_at else None
    result = db.q(
        """INSERT INTO subscription_discounts
           (code, discount_percent, duration_days, total_cards, chat_id, is_active, expires_at, internal_note, created_by)
           VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s) RETURNING id""",
        (code, body.discount_percent, body.duration_days, body.total_cards, body.chat_id,
         body.is_active, expires_at, body.internal_note, ctx.telegram_id or 0),
        fetch_one=True
    )
    return {"success": True, "id": result["id"] if result else None, "code": code}


@router.put("/superadmin/subscription-discounts/{discount_id}", tags=["Superadmin"])
def update_subscription_discount(discount_id: int, body: SubscriptionDiscountUpdate, ctx: UserCtx = Depends(require_token)):
    if not ctx.is_superadmin:
        raise HTTPException(403, "Superadmin only")
    existing = db.q("SELECT id FROM subscription_discounts WHERE id=%s", (discount_id,), fetch_one=True)
    if not existing:
        raise HTTPException(404, "Discount not found")
    updates = {}
    if body.chat_id is not None:
        updates["chat_id"] = body.chat_id
    if body.code is not None:
        code = body.code.strip()
        dup = db.q("SELECT id FROM subscription_discounts WHERE code=%s AND id!=%s", (code, discount_id), fetch_one=True)
        if dup:
            raise HTTPException(409, "Code already exists")
        updates["code"] = code
    if body.discount_percent is not None:
        if body.discount_percent < 1 or body.discount_percent > 100:
            raise HTTPException(400, "Discount must be between 1 and 100")
        updates["discount_percent"] = body.discount_percent
    if body.duration_days is not None:
        if body.duration_days < 1:
            raise HTTPException(400, "Duration must be at least 1 day")
        updates["duration_days"] = body.duration_days
    if body.total_cards is not None:
        updates["total_cards"] = body.total_cards
    if body.is_active is not None:
        updates["is_active"] = body.is_active
    if body.expires_at is not None:
        updates["expires_at"] = body.expires_at
    if body.internal_note is not None:
        updates["internal_note"] = body.internal_note
    if not updates:
        raise HTTPException(400, "No fields to update")
    updates["updated_at"] = datetime.datetime.utcnow().isoformat()
    set_clause = ", ".join(f"{k}=%s" for k in updates)
    vals = list(updates.values()) + [discount_id]
    db.q(f"UPDATE subscription_discounts SET {set_clause} WHERE id=%s", vals)
    return {"success": True}


@router.delete("/superadmin/subscription-discounts/{discount_id}", tags=["Superadmin"])
def delete_subscription_discount(discount_id: int, ctx: UserCtx = Depends(require_token)):
    if not ctx.is_superadmin:
        raise HTTPException(403, "Superadmin only")
    db.q("DELETE FROM subscription_discounts WHERE id=%s", (discount_id,))
    return {"success": True}


# ── Public: Validate subscription discount code ────────────────


class PushNotificationRequest(BaseModel):
    title: str
    message: str


@router.post("/superadmin/send-push-notification", tags=["Superadmin"])
def send_superadmin_push_notification(req: PushNotificationRequest, ctx: UserCtx = Depends(require_token)):
    if not ctx.is_superadmin:
        raise HTTPException(403, "Superadmin only")
    if not req.title.strip() or not req.message.strip():
        raise HTTPException(400, "Title and message are required")
    from common import _send_fcm_broadcast
    count = _send_fcm_broadcast(
        title=req.title.strip(),
        body=req.message.strip(),
        data={"type": "admin_broadcast", "title": req.title.strip(), "body": req.message.strip()}
    )
    return {"success": True, "count": count, "message": f"Push notification sent to {count} devices"}
