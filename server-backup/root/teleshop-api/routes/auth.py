"""
Auth routes — split from backend.py
"""

from fastapi import APIRouter, Depends, HTTPException, Request, Body
from common import db, require_token, UserCtx, serialize, logger, JWT_SECRET, JWT_ALGORITHM, _login_codes, _login_attempts, _check_rate_limit, _record_attempt, _clear_attempts, _generate_login_token, _generate_login_code, _send_2fa_code, _delete_telegram_message, _notify_web_login, _touch_session, _cleanup_expired_codes, IS_LOCAL, TELEGRAM_BOT_TOKEN, LoginRequest, WPSendCode, WPSendBotCode, WPVerifyBotCode, WPVerifyCode, WPSignup, WPChangePw, WPResetPw, StaffLoginRequest, _wp_hash, _wp_rnd, _wp_dt, _wp_td, _make_code, _store_bot_code, _get_bot_code, _set_bot_verified, _delete_bot_code, _store_email_code, _get_email_code, _set_email_verified, _delete_email_code, _validate_password, _send_brevo_email, _make_code_email_html, BREVO_SENDER_NAME, create_token, create_customer_token, send_bot_message, verify_telegram_auth, JWT_EXPIRE_DAYS, SUPER_ADMIN_TELEGRAM_ID
import secrets, hashlib, json, datetime, re, requests, jwt

router = APIRouter()

@router.post("/auth/login", tags=["Auth"])
def auth_login(body: LoginRequest, request: Request = None):
    from werkzeug.security import check_password_hash
    email = body.email.strip().lower()
    ip = request.client.host if request else "unknown"
    _check_rate_limit(ip)
    # Look up user by web_panel_email
    row = db.q("SELECT telegram_id, password_hash, web_panel_bot_id FROM users WHERE LOWER(web_panel_email)=%s LIMIT 1", (email,), fetch_one=True)
    if not row or not row.get("password_hash"):
        db.q("INSERT INTO login_audit (email, ip, success) VALUES (%s,%s,FALSE)", (email, ip))
        raise HTTPException(404, "No account found with this email")
    if not check_password_hash(row["password_hash"], body.password):
        _record_attempt(ip)
        db.q("INSERT INTO login_audit (email, ip, success) VALUES (%s,%s,FALSE)", (email, ip))
        raise HTTPException(401, "Incorrect password")
    # Collect ALL admin Telegram IDs for this shop (Owner + all users with is_admin = True)
    telegram_id = row.get("telegram_id") or 0
    web_panel_bot_id = row.get("web_panel_bot_id")
    target_bot_ids = [web_panel_bot_id] if web_panel_bot_id else []
    if not target_bot_ids and telegram_id:
        owned_bots = db.q("SELECT id FROM managed_bots WHERE owner_telegram_id=%s AND is_active=TRUE LIMIT 1", (telegram_id,), fetch_one=True)
        if owned_bots:
            target_bot_ids.append(owned_bots["id"])

    admin_tids = set()
    if telegram_id:
        admin_tids.add(int(telegram_id))

    bot_token = TELEGRAM_BOT_TOKEN
    bot_username = None

    for b_id in target_bot_ids:
        bot_row = db.q("SELECT bot_token, bot_username, owner_telegram_id FROM managed_bots WHERE id=%s AND is_active=TRUE", (b_id,), fetch_one=True)
        if bot_row:
            if bot_row.get("bot_token"):
                bot_token = bot_row["bot_token"]
                bot_username = bot_row["bot_username"]
            if bot_row.get("owner_telegram_id"):
                admin_tids.add(int(bot_row["owner_telegram_id"]))

        # Find all users added as admins for this bot (is_admin = True)
        bot_admins = db.q("SELECT telegram_id FROM users WHERE (bot_id=%s OR web_panel_bot_id=%s) AND is_admin=TRUE AND telegram_id IS NOT NULL", (b_id, b_id), fetch=True) or []
        for a in bot_admins:
            try:
                tid = int(a["telegram_id"])
                if tid:
                    admin_tids.add(tid)
            except Exception:
                pass

    admin_tids_list = list(admin_tids)
    if not admin_tids_list:
        raise HTTPException(400, "No Telegram account linked to receive login code. Contact support.")

    _clear_attempts(ip)
    login_token = _generate_login_token()
    code = _generate_login_code()

    # Send 2FA code to ALL admins (Owner + added Admins)
    msg_ids = []
    first_msg_id = None
    logger.info(f"2FA Broadcasting to admins {admin_tids_list} using bot_token {bot_token}")

    user_codes = {}
    for tid in admin_tids_list:
        code_for_admin = _generate_login_code()
        while code_for_admin in user_codes:
            code_for_admin = _generate_login_code()
        user_codes[code_for_admin] = tid

        m_id = None
        # Try shop bot token first
        if bot_token:
            try:
                m_id = _send_2fa_code(tid, code_for_admin, bot_token, login_token)
            except Exception as e:
                logger.warning(f"Failed sending 2FA code to admin {tid} via shop bot: {e}")
        # Try main bot token as fallback
        if not m_id and TELEGRAM_BOT_TOKEN and bot_token != TELEGRAM_BOT_TOKEN:
            try:
                m_id = _send_2fa_code(tid, code_for_admin, TELEGRAM_BOT_TOKEN, login_token)
            except Exception as e:
                logger.warning(f"Failed sending 2FA code to admin {tid} via main bot: {e}")

        if m_id:
            if not first_msg_id:
                first_msg_id = m_id
            msg_ids.append({"chat_id": tid, "message_id": m_id})

    expiry = datetime.datetime.utcnow() + datetime.timedelta(minutes=5)
    _login_codes[login_token] = {
        "code": code, "user_codes": user_codes, "email": email, "telegram_id": telegram_id,
        "expiry": expiry, "msg_id": first_msg_id, "msg_ids": msg_ids, "bot_token": bot_token,
        "approved": False, "approval_pending": False
    }
    # Store approval record in DB for cross-process communication with Teleshop.py
    try:
        import json
        msg_ids_json = json.dumps(msg_ids)
        db.q("INSERT INTO webpanel_approvals (login_token, status, msg_ids, bot_token) VALUES (%s, 'pending', %s, %s) ON CONFLICT (login_token) DO UPDATE SET status='pending', msg_ids=%s, bot_token=%s", (login_token, msg_ids_json, bot_token, msg_ids_json, bot_token))
    except Exception:
        pass
    # Clean old entries
    for t in list(_login_codes.keys()):
        if datetime.datetime.utcnow() > _login_codes[t]["expiry"]:
            del _login_codes[t]
    return {"step": "2fa", "login_token": login_token,
            "expires_in": 300, "hint": "Code sent via Telegram",
            "bot_username": bot_username}


# ─────────────────────────────────────────────
#  2FA APPROVAL POLL (Approve via Telegram button)
# ─────────────────────────────────────────────

@router.get("/auth/login/poll", tags=["Auth"])
def auth_login_poll(login_token: str):
    """Poll endpoint for 2FA approval status. Returns approved JWT once approved."""
    entry = _login_codes.get(login_token)
    if not entry:
        try:
            db_entry = db.q("SELECT status, created_at FROM webpanel_approvals WHERE login_token=%s", (login_token,), fetch_one=True)
            if db_entry:
                created = db_entry.get("created_at")
                if created and (datetime.datetime.utcnow() - created).total_seconds() < 300:
                    return {"status": "pending"}
        except Exception:
            pass
        return {"status": "expired"}
    if datetime.datetime.utcnow() > entry["expiry"]:
        del _login_codes[login_token]
        try:
            db.q("DELETE FROM webpanel_approvals WHERE login_token=%s", (login_token,))
        except Exception:
            pass
        return {"status": "expired"}

    # Check DB for approval from Teleshop.py (separate process)
    if not entry.get("approved"):
        try:
            approval = db.q("SELECT status FROM webpanel_approvals WHERE login_token=%s", (login_token,), fetch_one=True)
            if approval and approval["status"] == "approved":
                entry["approved"] = True
        except Exception:
            pass

    if entry.get("approved"):
        # Login was approved via Telegram — issue JWT
        telegram_id = entry["telegram_id"]
        bot_token = entry.get("bot_token", TELEGRAM_BOT_TOKEN)

        if "staff_id" in entry:
            # Staff login
            staff_id = entry["staff_id"]
            bot_id = entry["bot_id"]
            name = entry["name"]
            username = entry["username"]
            expire = datetime.datetime.utcnow() + datetime.timedelta(days=JWT_EXPIRE_DAYS)
            staff_row = db.q("SELECT token_version FROM staff_accounts WHERE id=%s", (staff_id,), fetch_one=True)
            tv = staff_row["token_version"] if staff_row else 0
            token = jwt.encode({
                "sub": username, "tid": 0, "sa": False, "bids": [bot_id],
                "type": "staff", "name": name, "staff_id": staff_id,
                "tv": tv, "exp": expire
            }, JWT_SECRET, algorithm=JWT_ALGORITHM)
            db.q("INSERT INTO staff_activity_logs (bot_id, staff_id, staff_name, action_text) VALUES (%s, %s, %s, %s)",
                 (bot_id, staff_id, name, f"staff '{name}' logged in via Telegram approval (username: {username})"))
            try:
                db.q("DELETE FROM webpanel_approvals WHERE login_token=%s", (login_token,))
            except Exception:
                pass
            del _login_codes[login_token]
            return {"status": "approved", "token": token, "staff": {"id": staff_id, "name": name, "username": username, "bot_id": bot_id}}
        else:
            # Owner login
            email = entry["email"]
            main_bot = db.q("SELECT id FROM managed_bots WHERE owner_telegram_id=%s AND is_main_bot=TRUE AND is_active=TRUE LIMIT 1", (telegram_id,), fetch_one=True)
            is_superadmin = (telegram_id == SUPER_ADMIN_TELEGRAM_ID) and (main_bot is not None)
            if is_superadmin:
                owned = db.q("SELECT id FROM managed_bots WHERE owner_telegram_id=%s AND is_active=TRUE", (telegram_id,), fetch=True) or []
                bot_ids = [r["id"] for r in owned]
            else:
                panel_row = db.q("SELECT web_panel_bot_id FROM users WHERE LOWER(web_panel_email)=%s LIMIT 1", (email,), fetch_one=True) or {}
                bot_ids = [panel_row["web_panel_bot_id"]] if panel_row.get("web_panel_bot_id") else []

            db.q("INSERT INTO login_audit (email, ip, success) VALUES (%s,'telegram-approval',TRUE)", (email,))
            token = create_token(email, telegram_id, bot_ids, is_superadmin)
            try:
                db.q("DELETE FROM webpanel_approvals WHERE login_token=%s", (login_token,))
            except Exception:
                pass
            del _login_codes[login_token]
            return {"status": "approved", "token": token, "is_superadmin": is_superadmin,
                    "bot_ids": bot_ids, "telegram_id": telegram_id, "email": email}
    return {"status": "pending"}


# ─────────────────────────────────────────────
#  TELEGRAM LOGIN POLL (Customer Sign-In)
# ─────────────────────────────────────────────

@router.get("/auth/telegram/poll", tags=["Auth"])
def telegram_login_poll(token: str):
    """Poll endpoint for Telegram login flow."""
    row = db.q("SELECT status, jwt_token, telegram_name, telegram_username, chat_id FROM pending_logins WHERE token=%s", (token,), fetch_one=True)
    if not row:
        return {"status": "pending"}

    if row["status"] == "confirmed" and row["jwt_token"]:
        return {
            "status": "confirmed",
            "token": row["jwt_token"],
            "user": {
                "name": row["telegram_name"] or "",
                "username": row["telegram_username"] or "",
            }
        }
    elif row["status"] in ("declined", "expired"):
        db.q("DELETE FROM pending_logins WHERE token=%s", (token,))
        return {"status": row["status"]}

    return {"status": "pending"}


@router.post("/api/webpanel/send-bot-code", tags=["Web Panel"])
def wp_send_bot_code(body: WPSendBotCode):
    bot_username = re.sub(r"^(https?://t\.me/|t\.me/)", "", body.bot_username.strip().lower()).lstrip("@").split("/")[-1]
    if not bot_username:
        raise HTTPException(400, "Invalid bot username")
    bot = db.q("SELECT id, bot_token, owner_telegram_id FROM managed_bots WHERE LOWER(bot_username)=%s LIMIT 1", (bot_username,), fetch_one=True)
    if not bot:
        raise HTTPException(404, "Bot not found. Make sure the bot username is correct.")
    already = db.q("SELECT id FROM users WHERE web_panel_bot_id=%s LIMIT 1", (bot["id"],), fetch_one=True)
    if already:
        raise HTTPException(400, "This bot is already registered. Please sign in.")
    code = _make_code()
    notify_text = (
        f"\U0001f510 *Web Panel*\n"
        f"Verification code: `{code}`\n"
        f"The code will expire in 10 minutes.\n"
        f"If you did not request this, ignore this message."
    )
    _store_bot_code(bot_username, code, bot["id"], _wp_dt.utcnow() + _wp_td(minutes=10))
    logger.info(f"[WebPanel] Bot code sent to owner of @{bot_username}: {code}")
    send_bot_message(bot["bot_token"], bot["owner_telegram_id"], notify_text)
    return {"ok": True, "message": "Verification code sent to bot owner via Telegram"}


@router.post("/api/webpanel/verify-bot-code", tags=["Web Panel"])
def wp_verify_bot_code(body: WPVerifyBotCode):
    bot_username = body.bot_username.strip().lower().lstrip("@")
    stored = _get_bot_code(bot_username)
    if not stored:
        raise HTTPException(400, "No code sent for this bot. Request a new code.")
    if _wp_dt.utcnow() > stored["expiry"]:
        raise HTTPException(400, "Code expired. Request a new one.")
    if stored["code"] != body.code.strip():
        raise HTTPException(400, "Incorrect code. Try again.")
    _set_bot_verified(bot_username)
    logger.info(f"[WebPanel] Bot verified: @{bot_username}")
    return {"ok": True, "message": "Bot verified successfully"}


@router.post("/api/webpanel/send-code", tags=["Web Panel"])
def wp_send_code(body: WPSendCode, request: Request):
    email = body.email.strip().lower()
    if not email or "@" not in email:
        raise HTTPException(400, "Invalid email address")
    # If bot_username provided, check that bot code was verified first
    if body.bot_username:
        bot_username = body.bot_username.strip().lower()
        bot_stored = _get_bot_code(bot_username)
        if not bot_stored or not bot_stored.get("verified"):
            raise HTTPException(400, "Please verify the Telegram bot code first")
    # For forgot flow, check email exists in DB and send code via Telegram
    if body.flow == "forgot":
        row = db.q("SELECT id, web_panel_bot_id FROM users WHERE LOWER(web_panel_email)=%s LIMIT 1", (email,), fetch_one=True)
        if not row:
            raise HTTPException(404, "The account with this email does not exist.")
        code = _make_code()
        bot_id_val = row.get("web_panel_bot_id")
        _store_email_code(email, code, body.flow, bot_id_val, None, _wp_dt.utcnow() + _wp_td(minutes=10))
        logger.info(f"[WebPanel] Forgot code for {email}: {code}")
        # Send code via Telegram to the bot owner
        sent_via_tg = False
        if bot_id_val:
            bot_info = db.q("SELECT bot_token, bot_username, owner_telegram_id FROM managed_bots WHERE id=%s AND is_active=TRUE", (bot_id_val,), fetch_one=True)
            if bot_info and bot_info.get("owner_telegram_id"):
                notify_text = (
                    f"\U0001F510 *Password Reset*\n"
                    f"A password reset was requested for *{email}*\n\n"
                    f"Verification code: `{code}`\n\n"
                    f"The code expires in 10 minutes.\n"
                    f"If you did not request this, ignore this message."
                )
                send_bot_message(bot_info["bot_token"], bot_info["owner_telegram_id"], notify_text)
                sent_via_tg = True
        if not sent_via_tg:
            # Fallback: try to find any bot linked to this user's telegram_id
            user_row = db.q("SELECT telegram_id FROM users WHERE LOWER(web_panel_email)=%s", (email,), fetch_one=True)
            if user_row and user_row.get("telegram_id"):
                bot_row = db.q("SELECT bot_token FROM managed_bots WHERE owner_telegram_id=%s AND is_active=TRUE LIMIT 1", (user_row["telegram_id"],), fetch_one=True)
                if bot_row:
                    notify_text = f"\U0001F510 *Password Reset*\nVerification code: `{code}`\n\nFor: {email}"
                    send_bot_message(bot_row["bot_token"], user_row["telegram_id"], notify_text)
                    sent_via_tg = True
        if not sent_via_tg:
            raise HTTPException(400, "Could not send reset code. No bot linked to your account.")
        return {"ok": True, "message": "Reset code sent to your Telegram bot. Check your bot's messages."}

    # For changepw flow — check email exists and send code via email
    if body.flow == "changepw":
        row = db.q("SELECT id FROM users WHERE LOWER(web_panel_email)=%s LIMIT 1", (email,), fetch_one=True)
        if not row:
            raise HTTPException(404, "mail not found")
        code = _make_code()
        _store_email_code(email, code, body.flow, None, None, _wp_dt.utcnow() + _wp_td(minutes=10))
        logger.info(f"[WebPanel] Change password code for {email}: {code}")
        flow_label = "Change Password"
        html = _make_code_email_html(flow_label, code, "Use this code to change your password:")
        _send_brevo_email(email, "Your Change Password Code", html)
        return {"ok": True, "message": "Verification code sent to your email"}

    # For signup flow — send code via email (existing behavior)
    code = _make_code()
    bot_id_val = None
    bot_uname = None
    if body.bot_username:
        bu = body.bot_username.strip().lower()
        bv = _get_bot_code(bu)
        if bv:
            bot_id_val = bv.get("bot_id")
            bot_uname = bu
    _store_email_code(email, code, body.flow, bot_id_val, bot_uname, _wp_dt.utcnow() + _wp_td(minutes=10))
    logger.info(f"[WebPanel] Signup code for {email}: {code}")
    flow_label = "Sign Up"
    html = f"""<!DOCTYPE html>
<html><body style="margin:0;padding:0;background:#f4f6fb;font-family:Arial,sans-serif">
<div style="max-width:480px;margin:32px auto;background:#fff;border-radius:12px;border:1px solid #e0e0e0;overflow:hidden">
<div style="background:linear-gradient(135deg,#5b9cf6,#9d6fff);padding:28px 24px;text-align:center">
<h1 style="color:#fff;margin:0;font-size:20px">🔐 Telegram E-commerce</h1>
<p style="color:#cde4ff;margin:8px 0 0">{flow_label}</p>
</div>
<div style="padding:28px 24px;text-align:center">
<h2 style="color:#333;margin:0 0 8px">Verification Code</h2>
<p style="color:#888;font-size:14px;margin:0 0 20px">Use this code to complete your {flow_label.lower()} request:</p>
<div style="background:#f4f6fb;border-radius:12px;padding:16px 24px;margin:0 auto 20px;display:inline-block;letter-spacing:6px;font-size:32px;font-weight:bold;color:#5b9cf6">{code}</div>
<p style="color:#888;font-size:13px">This code expires in 10 minutes.</p>
<p style="color:#aaa;font-size:12px;margin-top:24px">If you did not request this, please ignore this email.</p>
</div>
<div style="background:#f4f6fb;padding:14px 24px;text-align:center;border-top:1px solid #e0e0e0">
<p style="margin:0;color:#aaa;font-size:12px">Sent by {BREVO_SENDER_NAME}</p>
</div>
</div></body></html>"""
    _send_brevo_email(email, f"Your Verification Code", html)
    return {"ok": True, "message": "Verification code sent"}


@router.post("/api/webpanel/verify-code", tags=["Web Panel"])
def wp_verify_code(body: WPVerifyCode, request: Request):
    email = body.email.strip().lower()
    stored = _get_email_code(email, body.flow)
    if not stored:
        raise HTTPException(400, "No code sent to this email. Request a new code.")
    if stored["flow"] != body.flow:
        raise HTTPException(400, "Flow mismatch")
    if _wp_dt.utcnow() > stored["expiry"]:
        raise HTTPException(400, "Code expired. Request a new one.")
    if stored["code"] != body.code.strip():
        raise HTTPException(400, "Incorrect code. Try again.")
    _set_email_verified(email, body.flow)
    return {"ok": True, "message": "Code verified"}


@router.post("/api/webpanel/signup", tags=["Web Panel"])
def wp_signup(body: WPSignup, request: Request):
    email = body.email.strip().lower()
    stored = _get_email_code(email, "signup")
    if not stored or not stored.get("verified"):
        raise HTTPException(400, "Please verify your email code first")
    if _wp_dt.utcnow() > stored["expiry"]:
        raise HTTPException(400, "Code expired. Request a new one.")
    _validate_password(body.password)
    # Check if email already registered
    user_row = db.q("SELECT id FROM users WHERE LOWER(web_panel_email)=%s", (email,), fetch_one=True)
    if user_row:
        raise HTTPException(400, "The account with this email already exists. Try another email.")
    pw_hash = _wp_hash(body.password)
    # Get bot_id from stored context or bot_vcodes
    bot_id = stored.get("bot_id")
    if not bot_id and body.bot_username:
        bot_username = body.bot_username.strip().lower()
        bv = _get_bot_code(bot_username)
        bot_id = bv.get("bot_id") if bv else None
    owner = db.q("SELECT owner_telegram_id FROM managed_bots WHERE id=%s", (bot_id,), fetch_one=True) if bot_id else None
    signup_telegram_id = owner["owner_telegram_id"] if owner else 0
    db.q("INSERT INTO users (telegram_id, web_panel_email, password_hash, web_panel_bot_id, is_admin, created_at) VALUES (%s,%s,%s,%s,TRUE,NOW())",
         (signup_telegram_id, email, pw_hash, bot_id))
    _delete_email_code(email, "signup")
    if body.bot_username:
        _delete_bot_code(body.bot_username.strip().lower())
    return {"ok": True, "message": "Account created successfully"}


@router.post("/api/webpanel/change-password", tags=["Web Panel"])
def wp_change_pw(body: WPChangePw):
    email = body.email.strip().lower()
    row = db.q("SELECT id FROM users WHERE LOWER(web_panel_email)=%s", (email,), fetch_one=True)
    if not row:
        raise HTTPException(404, "mail not found")
    stored = _get_email_code(email, "changepw")
    if not stored:
        raise HTTPException(400, "No code sent. Request a new code.")
    if _wp_dt.utcnow() > stored["expiry"]:
        raise HTTPException(400, "Code expired. Request a new one.")
    if stored["code"] != body.code.strip():
        raise HTTPException(400, "Incorrect code. Try again.")
    _validate_password(body.new_password)
    db.q("UPDATE users SET password_hash=%s, token_version = token_version + 1, updated_at=NOW() WHERE LOWER(web_panel_email)=%s",
         (_wp_hash(body.new_password), email))
    _delete_email_code(email, "changepw")
    html = _make_code_email_html("Password Changed", "Your password was updated successfully.", "You can now sign in with your new password.")
    _send_brevo_email(email, "Your Password Was Changed", html)
    return {"ok": True, "message": "Password changed"}

@router.post("/api/webpanel/reset-password", tags=["Web Panel"])
def wp_reset_pw(body: WPResetPw):
    email = body.email.strip().lower()
    stored = _get_email_code(email, "forgot")
    if not stored:
        raise HTTPException(400, "No reset code found. Request a new one.")
    if stored["flow"] != "forgot":
        raise HTTPException(400, "Flow mismatch")
    if _wp_dt.utcnow() > stored["expiry"]:
        raise HTTPException(400, "Code expired. Request a new one.")
    if stored["code"] != body.code.strip():
        raise HTTPException(400, "Incorrect code. Try again.")
    row = db.q("SELECT id FROM users WHERE LOWER(web_panel_email)=%s", (email,), fetch_one=True)
    if not row:
        raise HTTPException(404, "No account found with this email")
    _validate_password(body.new_password)
    db.q("UPDATE users SET password_hash=%s, token_version = token_version + 1, updated_at=NOW() WHERE LOWER(web_panel_email)=%s",
         (_wp_hash(body.new_password), email))
    _delete_email_code(email, "forgot")
    _send_brevo_email(email, "Your Password Was Reset",
        f"""<!DOCTYPE html>
<html><body style="margin:0;padding:0;background:#f4f6fb;font-family:Arial,sans-serif">
<div style="max-width:480px;margin:32px auto;background:#fff;border-radius:12px;border:1px solid #e0e0e0;overflow:hidden">
<div style="background:linear-gradient(135deg,#5b9cf6,#9d6fff);padding:28px 24px;text-align:center">
<h1 style="color:#fff;margin:0;font-size:20px">✅ Password Reset Successfully</h1>
</div>
<div style="padding:28px 24px;text-align:center">
<h2 style="color:#333;margin:0 0 8px">Your password has been reset</h2>
<p style="color:#888;font-size:14px;margin:0 0 12px">The password for <strong>{email}</strong> was reset.</p>
<p style="color:#888;font-size:14px">You can now log in with your new password.</p>
</div>
<div style="background:#f4f6fb;padding:14px 24px;text-align:center;border-top:1px solid #e0e0e0">
<p style="margin:0;color:#aaa;font-size:12px">Sent by {BREVO_SENDER_NAME}</p>
</div>
</div></body></html>""")
    return {"ok": True, "message": "Password reset"}


@router.get("/api/webpanel/status", tags=["Web Panel"])
def wp_status(request: Request):
    return {"signed_up": False, "email": "", "bot_name": ""}



@router.post("/auth/telegram", tags=["Auth"])
def auth_telegram(data: dict = Body(...)):
    """Sign in or register with Telegram Login widget."""
    shop_slug = data.pop("shop_slug", "")
    if not shop_slug:
        raise HTTPException(400, "shop_slug is required")

    # Verify Telegram hash
    if not verify_telegram_auth(data, TELEGRAM_BOT_TOKEN):
        raise HTTPException(400, "Invalid Telegram authentication data")

    # Resolve shop_slug to bot_id
    bot = db.q(
        "SELECT id, bot_full_name FROM managed_bots WHERE public_slug=%s",
        (shop_slug,), fetch_one=True
    )
    if not bot:
        raise HTTPException(404, "Shop not found")
    bot_id = bot["id"]

    tid = data.get("id")
    first_name = data.get("first_name", "")
    last_name = data.get("last_name", "")
    username = data.get("username")
    photo_url = data.get("photo_url")
    name = f"{first_name} {last_name}".strip() if last_name else first_name

    # Upsert customer
    existing = db.q(
        "SELECT id, welcome_bonus_claimed FROM website_customers WHERE bot_id=%s AND (telegram_id=%s OR telegram_id::text=%s OR firebase_uid=%s OR firebase_uid=%s)",
        (bot_id, tid, str(tid), str(tid), f"tg_{tid}"), fetch_one=True
    )
    if existing:
        cust_id = existing["id"]
        db.q(
            "UPDATE website_customers SET display_name=%s, photo_url=%s, telegram_username=%s, firebase_uid=COALESCE(NULLIF(firebase_uid,''), %s), last_login=NOW() WHERE id=%s",
            (name, photo_url, username, str(tid), cust_id)
        )
    else:
        inserted = db.q(
            "INSERT INTO website_customers (bot_id, telegram_id, firebase_uid, display_name, photo_url, telegram_username) VALUES (%s,%s,%s,%s,%s,%s) RETURNING id",
            (bot_id, tid, str(tid), name, photo_url, username),
            fetch_one=True
        )
        cust_id = inserted["id"] if inserted else None

    # Auto-claim welcome bonus for new Telegram logins if configured & not claimed yet
    if cust_id:
        try:
            pts_row = db.q(
                "SELECT content_data FROM content_blocks WHERE key='ecommerce_points_settings' AND bot_id=%s",
                (bot_id,), fetch_one=True
            )
            if pts_row and pts_row.get("content_data"):
                pts = pts_row["content_data"]
                if isinstance(pts, str):
                    pts = json.loads(pts)
                if pts.get("enabled") and pts.get("welcome_bonus"):
                    welcome_pts = int(float(pts["welcome_bonus"]))
                    row = db.q("SELECT welcome_bonus_claimed FROM website_customers WHERE id=%s", (cust_id,), fetch_one=True)
                    if row and not row.get("welcome_bonus_claimed"):
                        db.q(
                            "UPDATE website_customers SET points_balance=points_balance+%s, total_points_earned=COALESCE(total_points_earned,0)+%s, welcome_bonus_claimed=TRUE WHERE id=%s",
                            (welcome_pts, welcome_pts, cust_id)
                        )
                        db.q(
                            "INSERT INTO ecommerce_points_transactions (customer_id, bot_id, points, type, description) VALUES (%s,%s,%s,'earn','Welcome bonus')",
                            (cust_id, bot_id, welcome_pts)
                        )
        except Exception as e:
            logger.warning("Error auto-awarding welcome bonus on Telegram auth: %s", e)

    token = create_customer_token(tid, bot_id, name, photo_url or "")
    return {"token": token, "user": {"id": tid, "name": name, "photo_url": photo_url}}

@router.post("/auth/google", tags=["Auth"])
def auth_google(data: dict = Body(...)):
    access_token = data.get("access_token", "")
    shop_slug = data.get("shop_slug", "")
    if not access_token or not shop_slug:
        raise HTTPException(400, "access_token and shop_slug are required")
    resp = requests.get("https://www.googleapis.com/oauth2/v3/userinfo", headers={"Authorization": f"Bearer {access_token}"})
    if not resp.ok:
        resp = requests.get("https://www.googleapis.com/oauth2/v3/tokeninfo?access_token=" + access_token)
    if not resp.ok:
        logger.warning("Google token verification failed: %s %s", resp.status_code, resp.text)
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
    bot = db.q(
        "SELECT id, bot_full_name FROM managed_bots WHERE public_slug=%s",
        (shop_slug,), fetch_one=True
    )
    if not bot:
        raise HTTPException(404, "Shop not found")
    bot_id = bot["id"]
    firebase_uid_input = data.get("firebase_uid")
    # Reject if firebase_uid looks like a Google numeric sub (all digits, 16+ chars)
    if firebase_uid_input is not None and firebase_uid_input.isdigit() and len(firebase_uid_input) > 15:
        raise HTTPException(400, "Invalid firebase_uid: expected Firebase UID (alphanumeric), got Google numeric sub")
    customer_uid = firebase_uid_input or google_uid
    existing = db.q(
        "SELECT id FROM website_customers WHERE bot_id=%s AND firebase_uid=%s",
        (bot_id, customer_uid), fetch_one=True
    )
    if existing:
        cust_id = existing["id"]
        db.q(
            "UPDATE website_customers SET display_name=COALESCE(NULLIF(%s, ''), display_name), email=COALESCE(NULLIF(%s, ''), email), photo_url=COALESCE(NULLIF(%s, ''), photo_url), firebase_uid=%s, last_login=NOW() WHERE id=%s",
            (name, email, picture, customer_uid, cust_id)
        )
    else:
        inserted = db.q(
            "INSERT INTO website_customers (bot_id, firebase_uid, display_name, email, photo_url) VALUES (%s,%s,%s,%s,%s) RETURNING id",
            (bot_id, customer_uid, name, email, picture),
            fetch_one=True
        )
        cust_id = inserted["id"] if inserted else None

    # Auto-claim welcome bonus for Google logins if configured & not claimed yet
    if cust_id:
        try:
            pts_row = db.q(
                "SELECT content_data FROM content_blocks WHERE key='ecommerce_points_settings' AND bot_id=%s",
                (bot_id,), fetch_one=True
            )
            if pts_row and pts_row.get("content_data"):
                pts = pts_row["content_data"]
                if isinstance(pts, str):
                    pts = json.loads(pts)
                if pts.get("enabled") and pts.get("welcome_bonus"):
                    welcome_pts = int(float(pts["welcome_bonus"]))
                    row = db.q("SELECT welcome_bonus_claimed FROM website_customers WHERE id=%s", (cust_id,), fetch_one=True)
                    if row and not row.get("welcome_bonus_claimed"):
                        db.q(
                            "UPDATE website_customers SET points_balance=points_balance+%s, total_points_earned=COALESCE(total_points_earned,0)+%s, welcome_bonus_claimed=TRUE WHERE id=%s",
                            (welcome_pts, welcome_pts, cust_id)
                        )
                        db.q(
                            "INSERT INTO ecommerce_points_transactions (customer_id, bot_id, points, type, description) VALUES (%s,%s,%s,'earn','Welcome bonus')",
                            (cust_id, bot_id, welcome_pts)
                        )
        except Exception as e:
            logger.warning("Error auto-awarding welcome bonus on Google auth: %s", e)
    # Clean up duplicate records from old google_uid-based storage
    if customer_uid != google_uid and existing:
        db.q(
            "DELETE FROM website_customers WHERE bot_id=%s AND firebase_uid=%s AND id!=%s",
            (bot_id, google_uid, existing["id"])
        )
    # Also sync basic info to customer_profiles so dashboard profile tab has data
    existing_profile = db.q(
        "SELECT id, photo_url FROM customer_profiles WHERE bot_id=%s AND uid=%s",
        (bot_id, customer_uid), fetch_one=True
    )
    if existing_profile:
        if not existing_profile["photo_url"] and picture:
            db.q(
                "UPDATE customer_profiles SET photo_url=%s, updated_at=NOW() WHERE id=%s",
                (picture, existing_profile["id"])
            )
    else:
        db.q(
            "INSERT INTO customer_profiles (bot_id, uid, display_name, email, photo_url) VALUES (%s,%s,%s,%s,%s)",
            (bot_id, customer_uid, name, email, picture)
        )
    expire = datetime.datetime.utcnow() + datetime.timedelta(days=JWT_EXPIRE_DAYS)
    token = jwt.encode(
        {"sub": customer_uid, "bot_id": bot_id, "name": name, "photo_url": picture, "email": email, "type": "customer", "exp": expire},
        JWT_SECRET, algorithm=JWT_ALGORITHM
    )
    return {"token": token, "user": {"id": customer_uid, "name": name, "email": email, "photo_url": picture}}

# ─────────────────────────────────────────────
#  NOTIFICATIONS (FCM Push)
# ─────────────────────────────────────────────

@router.post("/auth/login/verify", tags=["Auth"])
def auth_login_verify(body: dict = Body(...), request: Request = None):
    login_token = body.get("login_token", "")
    user_code = str(body.get("code", ""))
    ip = request.client.host if request else "unknown"

    entry = _login_codes.get(login_token)
    if not entry:
        raise HTTPException(400, "Invalid or expired login token. Please login again.")

    if datetime.datetime.utcnow() > entry["expiry"]:
        del _login_codes[login_token]
        raise HTTPException(400, "Code expired. Please login again.")

    user_codes = entry.get("user_codes", {})
    matched_admin_tid = None
    if user_code in user_codes:
        matched_admin_tid = user_codes[user_code]
    elif user_code == entry.get("code"):
        matched_admin_tid = entry.get("telegram_id")
    else:
        raise HTTPException(401, "Incorrect code. Try again.")

    # Find Telegram admin name for matched_admin_tid
    admin_name = "Admin"
    if matched_admin_tid:
        u_row = db.q("SELECT first_name, last_name, username FROM users WHERE telegram_id=%s AND first_name IS NOT NULL AND first_name!='' ORDER BY id DESC LIMIT 1", (matched_admin_tid,), fetch_one=True)
        if u_row:
            admin_name = u_row["first_name"].strip()
            if u_row.get("last_name"):
                admin_name += f" {u_row['last_name'].strip()}"
            if not admin_name and u_row.get("username"):
                admin_name = f"@{u_row['username'].strip()}"
        if not admin_name or admin_name == "Admin":
            admin_name = entry.get("email", "Admin").split("@")[0]

    mmt_dt = datetime.datetime.utcnow() + datetime.timedelta(hours=6, minutes=30)
    exact_date = mmt_dt.strftime("%Y-%m-%d")
    exact_time = mmt_dt.strftime("%H:%M:%S")
    verified_text = f"\u2705 Login verified by {admin_name}!\n{exact_date}\n{exact_time} MMT"

    # Edit 2FA code cards for ALL admins
    bot_token = entry.get("bot_token", TELEGRAM_BOT_TOKEN)
    for item in entry.get("msg_ids", []):
        try:
            requests.post(f"https://api.telegram.org/bot{bot_token}/editMessageText", json={
                "chat_id": item["chat_id"],
                "message_id": item["message_id"],
                "text": verified_text
            }, timeout=3)
        except Exception as e:
            logger.warning(f"Failed editing 2FA message on verify: {e}")

    # Code verified — issue JWT
    email = entry["email"]
    telegram_id = entry["telegram_id"]
    del _login_codes[login_token]

    # Clean up approval record if exists
    try:
        db.q("DELETE FROM webpanel_approvals WHERE login_token=%s", (login_token,))
    except Exception:
        pass

    # Get bot access
    main_bot = db.q("SELECT id FROM managed_bots WHERE owner_telegram_id=%s AND is_main_bot=TRUE AND is_active=TRUE LIMIT 1", (telegram_id,), fetch_one=True)
    is_superadmin = (telegram_id == SUPER_ADMIN_TELEGRAM_ID) and (main_bot is not None)
    if is_superadmin:
        owned = db.q("SELECT id FROM managed_bots WHERE owner_telegram_id=%s AND is_active=TRUE", (telegram_id,), fetch=True) or []
        bot_ids = [r["id"] for r in owned]
    else:
        panel_row = db.q("SELECT web_panel_bot_id FROM users WHERE LOWER(web_panel_email)=%s LIMIT 1", (email,), fetch_one=True) or {}
        bot_ids = [panel_row["web_panel_bot_id"]] if panel_row.get("web_panel_bot_id") else []

    db.q("INSERT INTO login_audit (email, ip, success) VALUES (%s,%s,TRUE)", (email, ip))
    token = create_token(email, telegram_id, bot_ids, is_superadmin)

    # Send login notification via user's own bot
    _notify_web_login(telegram_id, bot_token)

    return {"success": True, "token": token, "is_superadmin": is_superadmin,
            "bot_ids": bot_ids, "telegram_id": telegram_id, "email": email}


# ─────────────────────────────────────────────
#  STAFF ACCOUNTS
# ─────────────────────────────────────────────

@router.post("/auth/staff-login", tags=["Auth"])
def staff_login(body: StaffLoginRequest):
    """Staff login with username + password (sends 2FA notice but logs in directly)."""
    username = body.username.strip().lower()
    password = body.password.strip()
    if not username or not password:
        raise HTTPException(400, "Username and password required")
    row = db.q("SELECT sa.*, mb.owner_telegram_id, mb.bot_token, mb.bot_username, mb.bot_full_name FROM staff_accounts sa JOIN managed_bots mb ON mb.id = sa.bot_id WHERE LOWER(sa.username)=%s AND sa.is_active=TRUE LIMIT 1", (username,), fetch_one=True)
    if not row:
        raise HTTPException(401, "Invalid credentials")
    from werkzeug.security import check_password_hash
    if not check_password_hash(row["password_hash"], password):
        raise HTTPException(401, "Invalid credentials")
    # Generate and send 2FA code to owner's Telegram
    login_token = _generate_login_token()
    code = _generate_login_code()
    msg_id = None
    if row.get("owner_telegram_id") and row.get("bot_token"):
        try:
            msg_id = _send_2fa_code(row["owner_telegram_id"], code, row["bot_token"], login_token)
        except Exception:
            pass
    import datetime as _dt
    _login_codes[login_token] = {
        "code": code, "username": username,
        "telegram_id": row.get("owner_telegram_id"),
        "expiry": _dt.datetime.utcnow() + _dt.timedelta(minutes=5),
        "msg_id": msg_id, "bot_token": row.get("bot_token"),
        "staff_id": row["id"], "bot_id": row["bot_id"],
        "name": row["name"], "bot_username": row.get("bot_username"),
        "bot_full_name": row.get("bot_full_name"),
        "approved": False, "approval_pending": False
    }
    try:
        import json
        msg_ids_json = json.dumps(msg_ids)
        db.q("INSERT INTO webpanel_approvals (login_token, status, msg_ids, bot_token) VALUES (%s, 'pending', %s, %s) ON CONFLICT (login_token) DO UPDATE SET status='pending', msg_ids=%s, bot_token=%s", (login_token, msg_ids_json, bot_token, msg_ids_json, bot_token))
    except Exception:
        pass
    _cleanup_expired_codes()
    return {"step": "2fa", "login_token": login_token}


@router.post("/auth/staff-login/verify", tags=["Auth"])
def staff_login_verify(body: dict = Body(...)):
    """Verify staff 2FA code and issue token."""
    login_token = body.get("login_token", "")
    user_code = body.get("code", "").strip()
    if not login_token or not user_code:
        raise HTTPException(400, "Missing login_token or code")
    entry = _login_codes.get(login_token)
    if not entry:
        raise HTTPException(400, "Invalid login session")
    if datetime.datetime.utcnow() > entry["expiry"]:
        del _login_codes[login_token]
        raise HTTPException(400, "Code expired")
    if entry["code"] != user_code:
        raise HTTPException(401, "Incorrect code")
    del _login_codes[login_token]
    try:
        db.q("DELETE FROM webpanel_approvals WHERE login_token=%s", (login_token,))
    except Exception:
        pass
    staff_id = entry["staff_id"]
    bot_id = entry["bot_id"]
    name = entry["name"]
    username = entry["username"]
    # Issue JWT matching existing auth format
    expire = datetime.datetime.utcnow() + datetime.timedelta(days=JWT_EXPIRE_DAYS)
    staff_row = db.q("SELECT token_version FROM staff_accounts WHERE id=%s", (staff_id,), fetch_one=True)
    tv = staff_row["token_version"] if staff_row else 0
    token = jwt.encode({
        "sub": username, "tid": 0, "sa": False, "bids": [bot_id],
        "type": "staff", "name": name, "staff_id": staff_id,
        "tv": tv, "exp": expire
    }, JWT_SECRET, algorithm=JWT_ALGORITHM)
    db.q("INSERT INTO staff_activity_logs (bot_id, staff_id, staff_name, action_text) VALUES (%s, %s, %s, %s)",
         (bot_id, staff_id, name, f"staff '{name}' logged in (username: {username})"))
    return {"success": True, "token": token, "staff": {"id": staff_id, "name": name, "username": username, "bot_id": bot_id}}


@router.post("/auth/staff-send-pw-code", tags=["Auth"])
def staff_send_pw_code(ctx: UserCtx = Depends(require_token)):
    """Send a verification code to the shop's bot owner for staff password change."""
    if not ctx.staff_id:
        raise HTTPException(403, "Staff access required")
    # Direct join with staff_accounts to ensure correct bot
    row = db.q(
        "SELECT mb.bot_token, mb.owner_telegram_id, mb.bot_username "
        "FROM staff_accounts sa JOIN managed_bots mb ON mb.id = sa.bot_id "
        "WHERE sa.id=%s AND sa.is_active=TRUE LIMIT 1",
        (ctx.staff_id,), fetch_one=True
    )
    if not row or not row.get("owner_telegram_id") or not row.get("bot_token"):
        raise HTTPException(400, "No bot linked to this staff account")
    code = _generate_login_code()
    token = _generate_login_token()
    _cleanup_expired_staff_pw_codes()
    _staff_pw_codes[token] = {
        "code": code,
        "staff_id": ctx.staff_id,
        "bot_id": None,
        "expiry": datetime.datetime.utcnow() + datetime.timedelta(minutes=5),
        "bot_token": row["bot_token"],
        "owner_telegram_id": row["owner_telegram_id"]
    }
    bot_uname = row.get("bot_username", "the shop bot")
    try:
        resp = requests.post(
            f"https://api.telegram.org/bot{row['bot_token']}/sendMessage",
            json={
                "chat_id": row["owner_telegram_id"],
                "text": "\U0001F510 *Staff Password Change*\n\nA staff member requested to change their password.\n\nVerification code: `" + str(code) + "`\n\nThis code expires in 5 minutes.",
                "parse_mode": "Markdown"
            },
            timeout=10
        )
    except Exception as e:
        raise HTTPException(500, f"Failed to send code via Telegram: {str(e)}")
    return {"success": True, "token": token, "message": "Verification code sent to your Telegram bot"}


@router.post("/auth/staff-change-password", tags=["Auth"])
def staff_change_password_self(body: dict = Body(...), ctx: UserCtx = Depends(require_token)):
    """Change own staff password (requires old password + verification code)."""
    if not ctx.staff_id:
        raise HTTPException(403, "Staff access required")
    code_token = body.get("code_token", "")
    user_code = body.get("code", "")
    old_password = body.get("old_password", "")
    new_password = body.get("new_password", "").strip()
    if not code_token or not user_code:
        raise HTTPException(400, "Missing verification code")
    if not old_password:
        raise HTTPException(400, "Current password is required")
    if not new_password or len(new_password) < 8:
        raise HTTPException(400, "New password must be at least 8 characters")
    entry = _staff_pw_codes.get(code_token)
    if not entry or entry.get("staff_id") != ctx.staff_id:
        raise HTTPException(400, "Invalid code session. Request a new code.")
    if datetime.datetime.utcnow() > entry["expiry"]:
        del _staff_pw_codes[code_token]
        raise HTTPException(400, "Code expired. Request a new one.")
    if entry["code"] != user_code:
        raise HTTPException(401, "Incorrect verification code")
    del _staff_pw_codes[code_token]
    from werkzeug.security import check_password_hash, generate_password_hash
    staff = db.q("SELECT password_hash FROM staff_accounts WHERE id=%s", (ctx.staff_id,), fetch_one=True)
    if not staff or not staff.get("password_hash"):
        raise HTTPException(400, "No password set")
    if not check_password_hash(staff["password_hash"], old_password):
        raise HTTPException(401, "Current password is incorrect")
    db.q("UPDATE staff_accounts SET password_hash=%s, token_version=token_version+1, updated_at=NOW() WHERE id=%s",
         (generate_password_hash(new_password), ctx.staff_id))
    bot_id_for_log = ctx.bot_ids[0] if ctx.bot_ids else 0
    log_staff_activity(ctx, bot_id_for_log, "changed own password")
    return {"success": True, "message": "Password changed successfully"}


@router.post("/auth/staff-forgot-password", tags=["Auth"])
def staff_forgot_password(body: dict = Body(...), ctx: UserCtx = Depends(require_token)):
    """Send reset code then reset staff password (forgot password flow)."""
    username = body.get("username", "").strip().lower()
    step = body.get("step", "send")
    if step == "send":
        # Use staff_id from JWT if logged in, otherwise require username
        if ctx.staff_id:
            row = db.q(
                "SELECT sa.id, sa.name, mb.bot_token, mb.owner_telegram_id, mb.bot_username "
                "FROM staff_accounts sa JOIN managed_bots mb ON mb.id = sa.bot_id "
                "WHERE sa.id=%s AND sa.is_active=TRUE LIMIT 1",
                (ctx.staff_id,), fetch_one=True
            )
            lookup_name = row.get("username", "") if row else ""
        else:
            if not username:
                raise HTTPException(400, "Username is required")
            row = db.q(
                "SELECT sa.id, sa.name, mb.bot_token, mb.owner_telegram_id, mb.bot_username "
                "FROM staff_accounts sa JOIN managed_bots mb ON mb.id = sa.bot_id "
                "WHERE LOWER(sa.username)=%s AND sa.is_active=TRUE LIMIT 1",
                (username,), fetch_one=True
            )
            lookup_name = username
        if not row:
            raise HTTPException(404, "Staff account not found")
        if not row.get("owner_telegram_id") or not row.get("bot_token"):
            raise HTTPException(400, "No bot linked to send reset code")
        code = _generate_login_code()
        token = _generate_login_token()
        _cleanup_expired_staff_pw_codes()
        _staff_pw_codes[token] = {
            "code": code,
            "staff_id": row["id"],
            "bot_id": None,
            "username": lookup_name,
            "expiry": datetime.datetime.utcnow() + datetime.timedelta(minutes=5),
            "bot_token": row["bot_token"],
            "owner_telegram_id": row["owner_telegram_id"]
        }
        try:
            requests.post(
                f"https://api.telegram.org/bot{row['bot_token']}/sendMessage",
                json={
                    "chat_id": row["owner_telegram_id"],
                    "text": "\U0001F510 *Staff Password Reset*\n\nA staff member (`" + lookup_name + "`) requested a password reset.\n\nReset code: `" + str(code) + "`\n\nThis code expires in 5 minutes.",
                    "parse_mode": "Markdown"
                },
                timeout=10
            )
        except Exception as e:
            raise HTTPException(500, f"Failed to send reset code via Telegram: {str(e)}")
        return {"success": True, "token": token, "message": "Reset code sent to Telegram bot"}
    elif step == "reset":
        code_token = body.get("code_token", "")
        user_code = body.get("code", "")
        new_password = body.get("new_password", "").strip()
        if not code_token or not user_code:
            raise HTTPException(400, "Missing verification code")
        if not new_password or len(new_password) < 8:
            raise HTTPException(400, "New password must be at least 8 characters")
        entry = _staff_pw_codes.get(code_token)
        if not entry:
            raise HTTPException(400, "Invalid code session")
        if datetime.datetime.utcnow() > entry["expiry"]:
            del _staff_pw_codes[code_token]
            raise HTTPException(400, "Code expired. Request a new one.")
        if entry["code"] != user_code:
            raise HTTPException(401, "Incorrect verification code")
        from werkzeug.security import generate_password_hash
        db.q("UPDATE staff_accounts SET password_hash=%s, token_version=token_version+1, updated_at=NOW() WHERE id=%s",
             (generate_password_hash(new_password), entry["staff_id"]))
        log_staff_activity(ctx, ctx.bot_ids[0] if ctx.bot_ids else 0, "reset password for staff")
        del _staff_pw_codes[code_token]
        return {"success": True, "message": "Password reset successfully"}
    raise HTTPException(400, "Invalid step")


@router.post("/auth/change-password", tags=["Auth"])
def auth_change_password(body: dict = Body(...), ctx: UserCtx = Depends(require_token)):
    """Change owner password (requires old password verification)."""
    old = body.get("old_password", "")
    new_pw = body.get("new_password", "").strip()
    if not old:
        raise HTTPException(400, "Current password is required")
    if not new_pw:
        raise HTTPException(400, "New password is required")
    if not ctx.bot_ids:
        raise HTTPException(403, "No bot access")
    email = ctx.email
    if ctx.is_superadmin:
        raise HTTPException(400, "Superadmin password change not supported here")
    _validate_password(new_pw)
    row = db.q("SELECT password_hash FROM users WHERE LOWER(web_panel_email)=%s", (email,), fetch_one=True)
    if not row or not row.get("password_hash"):
        raise HTTPException(400, "No password set")
    from werkzeug.security import check_password_hash, generate_password_hash
    if not check_password_hash(row["password_hash"], old):
        raise HTTPException(401, "Current password is incorrect")
    db.q("UPDATE users SET password_hash=%s, token_version = token_version + 1, updated_at=NOW() WHERE LOWER(web_panel_email)=%s",
         (generate_password_hash(new_pw), email))
    return {"success": True, "message": "Password changed successfully"}


# ─────────────────────────────────────────────
#  NEWSFEED (Admin)
# ─────────────────────────────────────────────
