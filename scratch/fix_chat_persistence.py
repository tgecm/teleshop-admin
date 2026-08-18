"""
Fix chat persistence:
1. register_visitor - look up existing visitor by firebase_uid OR tg_prefix so cross-device sign-ins
   reuse the same visitor_id instead of creating new ones.
2. get_visitor_messages (public endpoint) - also do tg_/clean_id bridging like the admin endpoint.
"""

path = '/root/teleshop-api/backend.py'
with open(path, 'r') as f:
    content = f.read()

# ── Fix 1: get_visitor_messages (public) ──────────────────────────────────────
old_get = '''@app.get("/public/chat/{bot_id}/{visitor_id}/messages", tags=["Public"])
def get_visitor_messages(bot_id: int, visitor_id: str):
    v_str = str(visitor_id).strip()
    rows = db.q(
        """SELECT id, sender_type, message_text, created_at, file_id, file_type
           FROM chat_messages
           WHERE bot_id = %s AND (
             visitor_id = %s 
             OR user_id::text = %s
             OR visitor_id IN (SELECT firebase_uid FROM web_visitors WHERE (visitor_id = %s OR firebase_uid = %s) AND firebase_uid IS NOT NULL) 
             OR visitor_id IN (SELECT visitor_id FROM web_visitors WHERE (visitor_id = %s OR firebase_uid = %s))
           )
           ORDER BY created_at ASC""",
        (bot_id, v_str, v_str, v_str, v_str, v_str, v_str), fetch=True
    ) or []

    # Removed leaky email_rows cross-customer query

    return serialize(rows)'''

new_get = '''@app.get("/public/chat/{bot_id}/{visitor_id}/messages", tags=["Public"])
def get_visitor_messages(bot_id: int, visitor_id: str):
    v_str = str(visitor_id).strip()
    tg_str = "tg_" + v_str if not v_str.startswith("tg_") else v_str
    clean_str = v_str.replace("tg_", "")
    rows = db.q(
        "SELECT id, sender_type, message_text, created_at, file_id, file_type "
        "FROM chat_messages "
        "WHERE bot_id = %s AND ("
        "  visitor_id = %s OR visitor_id = %s OR visitor_id = %s "
        "  OR user_id::text = %s "
        "  OR visitor_id IN (SELECT firebase_uid FROM web_visitors WHERE (visitor_id = %s OR visitor_id = %s OR firebase_uid = %s OR firebase_uid = %s) AND firebase_uid IS NOT NULL) "
        "  OR visitor_id IN (SELECT visitor_id FROM web_visitors WHERE (visitor_id = %s OR visitor_id = %s OR firebase_uid = %s OR firebase_uid = %s))"
        ") ORDER BY created_at ASC",
        (bot_id, v_str, tg_str, clean_str, v_str, v_str, tg_str, v_str, tg_str, v_str, tg_str, v_str, tg_str),
        fetch=True
    ) or []
    return serialize(rows)'''

if old_get in content:
    content = content.replace(old_get, new_get, 1)
    print("✓ Fixed get_visitor_messages (public)")
else:
    print("✗ Could not find get_visitor_messages to replace!")

# ── Fix 2: register_visitor — look up by firebase_uid too ─────────────────────
old_reg_check = '''    # Check if new visitor (didn't exist before)
    existing = db.q("SELECT 1 FROM web_visitors WHERE visitor_id=%s", (visitor_id,), fetch_one=True)
    is_new = existing is None

    disp_name = name if (name and name.strip() != 'User') else ''
    db.q(
        """INSERT INTO web_visitors (visitor_id, bot_id, name, phone, email, firebase_uid)
           VALUES (%s, %s, %s, %s, %s, %s)
           ON CONFLICT (visitor_id) DO UPDATE SET 
             name=CASE WHEN EXCLUDED.name != '' AND EXCLUDED.name != 'User' THEN EXCLUDED.name ELSE web_visitors.name END, 
             phone=COALESCE(NULLIF(EXCLUDED.phone, ''), web_visitors.phone), 
             email=COALESCE(NULLIF(EXCLUDED.email, ''), web_visitors.email), 
             firebase_uid=COALESCE(EXCLUDED.firebase_uid, web_visitors.firebase_uid)""",
        (visitor_id, bot_id, disp_name, phone, email, firebase_uid or None)
    )
    if firebase_uid:
        db.q(
            """UPDATE web_visitors SET firebase_uid = %s 
               WHERE bot_id = %s AND (firebase_uid IS NULL OR firebase_uid = '') 
               AND (visitor_id = %s OR (email = %s AND email IS NOT NULL AND email != ''))""",
            (firebase_uid, bot_id, visitor_id, email)
        )

    # If new visitor, insert a welcome message with their info
    if is_new:'''

new_reg_check = '''    # Check if existing visitor by firebase_uid OR tg_ prefix (cross-device sign-in)
    tg_id = "tg_" + visitor_id if not visitor_id.startswith("tg_") else visitor_id
    clean_id = visitor_id.replace("tg_", "")
    lookup_uid = firebase_uid if firebase_uid else visitor_id
    existing = db.q(
        "SELECT visitor_id FROM web_visitors WHERE bot_id = %s AND ("
        "  visitor_id = %s OR visitor_id = %s OR visitor_id = %s "
        "  OR (firebase_uid IS NOT NULL AND firebase_uid != '' AND (firebase_uid = %s OR firebase_uid = %s OR firebase_uid = %s))"
        ")",
        (bot_id, visitor_id, tg_id, clean_id, lookup_uid, visitor_id, clean_id),
        fetch_one=True
    )
    is_new = existing is None
    target_visitor_id = existing["visitor_id"] if existing else visitor_id

    disp_name = name if (name and name.strip() != 'User') else ''
    db.q(
        """INSERT INTO web_visitors (visitor_id, bot_id, name, phone, email, firebase_uid)
           VALUES (%s, %s, %s, %s, %s, %s)
           ON CONFLICT (visitor_id) DO UPDATE SET 
             name=CASE WHEN EXCLUDED.name != '' AND EXCLUDED.name != 'User' THEN EXCLUDED.name ELSE web_visitors.name END, 
             phone=COALESCE(NULLIF(EXCLUDED.phone, ''), web_visitors.phone), 
             email=COALESCE(NULLIF(EXCLUDED.email, ''), web_visitors.email), 
             firebase_uid=COALESCE(EXCLUDED.firebase_uid, web_visitors.firebase_uid)""",
        (target_visitor_id, bot_id, disp_name, phone, email, firebase_uid or None)
    )
    if firebase_uid:
        db.q(
            """UPDATE web_visitors SET firebase_uid = %s 
               WHERE bot_id = %s AND (firebase_uid IS NULL OR firebase_uid = '') 
               AND (visitor_id = %s OR visitor_id = %s OR (email = %s AND email IS NOT NULL AND email != ''))""",
            (firebase_uid, bot_id, target_visitor_id, clean_id, email)
        )

    # If new visitor, insert a welcome message with their info
    if is_new:'''

if old_reg_check in content:
    content = content.replace(old_reg_check, new_reg_check, 1)
    print("✓ Fixed register_visitor lookup logic")
else:
    print("✗ Could not find register_visitor check to replace!")
    # Debug: show what's there
    import re
    idx = content.find("Check if new visitor")
    if idx >= 0:
        print("Found 'Check if new visitor' at char", idx)
        print(repr(content[idx:idx+300]))

# ── Fix 3: also replace `visitor_id` with `target_visitor_id` in the welcome msg insert ──
old_info_insert = '''        db.q(
            "INSERT INTO chat_messages (bot_id, visitor_id, sender_type, message_text) VALUES (%s, %s, 'admin', %s)",
            (bot_id, visitor_id, info_text)
        )'''

new_info_insert = '''        db.q(
            "INSERT INTO chat_messages (bot_id, visitor_id, sender_type, message_text) VALUES (%s, %s, 'admin', %s)",
            (bot_id, target_visitor_id, info_text)
        )'''

if old_info_insert in content:
    content = content.replace(old_info_insert, new_info_insert, 1)
    print("✓ Fixed info_text insert to use target_visitor_id")
else:
    print("✗ Could not find info_text insert (may already use target_visitor_id)")

with open(path, 'w') as f:
    f.write(content)

print("\nAll done. Please restart the server.")
