#!/usr/bin/env python3
"""Patch backend.py to add FCM notification registration endpoints."""
import re

with open("/home/meriko/VPS/backend-api/backend.py", "r") as f:
    code = f.read()

changes = 0

# 1. Add init_fcm_tokens_table method to Database class
old_method = """    def init_pending_logins_table(self):
        self.q(\"""
            CREATE TABLE IF NOT EXISTS pending_logins (
                token VARCHAR(36) PRIMARY KEY,
                bot_id INTEGER NOT NULL REFERENCES managed_bots(id) ON DELETE CASCADE,
                chat_id BIGINT,
                telegram_user_id BIGINT,
                telegram_name VARCHAR(255),
                telegram_username VARCHAR(255),
                status VARCHAR(20) NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'confirmed', 'declined', 'expired')),
                jwt_token TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        \""")
        self.q("CREATE INDEX IF NOT EXISTS idx_pending_logins_status ON pending_logins(status)")
        logger.info("pending_logins table ready")


db = Database()"""

new_method = """    def init_pending_logins_table(self):
        self.q(\"""
            CREATE TABLE IF NOT EXISTS pending_logins (
                token VARCHAR(36) PRIMARY KEY,
                bot_id INTEGER NOT NULL REFERENCES managed_bots(id) ON DELETE CASCADE,
                chat_id BIGINT,
                telegram_user_id BIGINT,
                telegram_name VARCHAR(255),
                telegram_username VARCHAR(255),
                status VARCHAR(20) NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'confirmed', 'declined', 'expired')),
                jwt_token TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        \""")
        self.q("CREATE INDEX IF NOT EXISTS idx_pending_logins_status ON pending_logins(status)")
        logger.info("pending_logins table ready")

    def init_fcm_tokens_table(self):
        self.q(\"""
            CREATE TABLE IF NOT EXISTS fcm_tokens (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                token TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        \""")
        self.q("CREATE UNIQUE INDEX IF NOT EXISTS idx_fcm_tokens_user_token ON fcm_tokens(user_id, token)")
        logger.info("fcm_tokens table ready")


db = Database()"""

if old_method in code:
    code = code.replace(old_method, new_method)
    changes += 1
    print("OK - added init_fcm_tokens_table method")
else:
    print("FAIL - init_pending_logins_table not found")

# 2. Add db.init_fcm_tokens_table() in lifespan
old_lifespan = """    db.init_pending_logins_table()

    # Ensure broadcast_history has message"""
new_lifespan = """    db.init_pending_logins_table()
    db.init_fcm_tokens_table()

    # Ensure broadcast_history has message"""

if old_lifespan in code:
    code = code.replace(old_lifespan, new_lifespan)
    changes += 1
    print("OK - added fcm table init to lifespan")
else:
    print("FAIL - lifespan init call not found")

# 3. Add notification routes before __main__
old_main = """    return {"token": token, "user": {"id": tid, "name": name, "photo_url": photo_url}}
if __name__ == "__main__":"""

# Add notification routes + FCM send helper
new_routes = """    return {"token": token, "user": {"id": tid, "name": name, "photo_url": photo_url}}

# ─────────────────────────────────────────────
#  NOTIFICATIONS (FCM Push)
# ─────────────────────────────────────────────

FCM_SERVER_KEY = os.getenv("FCM_SERVER_KEY", "")


def _send_fcm_notification(user_id, title, body, data=None):
    if not FCM_SERVER_KEY:
        logger.warning("FCM_SERVER_KEY not set — cannot send push")
        return
    rows = db.q("SELECT token FROM fcm_tokens WHERE user_id=%s", (user_id,), fetch=True) or []
    for row in rows:
        try:
            requests.post(
                "https://fcm.googleapis.com/fcm/send",
                headers={
                    "Authorization": f"key={FCM_SERVER_KEY}",
                    "Content-Type": "application/json",
                },
                json={
                    "to": row["token"],
                    "notification": {"title": title, "body": body},
                    "data": data or {},
                },
                timeout=5,
            )
        except Exception:
            pass


class RegisterTokenBody(BaseModel):
    token: str


@app.post("/notifications/register", tags=["Notifications"])
def register_device_token(body: RegisterTokenBody, ctx: UserCtx = Depends(require_token)):
    db.q(
        "INSERT INTO fcm_tokens (user_id, token) VALUES (%s, %s) ON CONFLICT (user_id, token) DO NOTHING",
        (ctx.telegram_id, body.token),
    )
    return {"success": True}


@app.delete("/notifications/register", tags=["Notifications"])
def unregister_device_token(ctx: UserCtx = Depends(require_token)):
    db.q("DELETE FROM fcm_tokens WHERE user_id=%s", (ctx.telegram_id,))
    return {"success": True}


if __name__ == "__main__":"""

if old_main in code:
    code = code.replace(old_main, new_routes)
    changes += 1
    print("OK - added notification routes + FCM helper")
else:
    print("FAIL - main block not found")

if changes == 3:
    with open("/home/meriko/VPS/backend-api/backend.py", "w") as f:
        f.write(code)
    print(f"All {changes} changes applied successfully")
else:
    print(f"Only {changes}/3 changes applied — file NOT saved")
