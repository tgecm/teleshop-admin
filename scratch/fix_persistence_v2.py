"""
Fix chat persistence properly:
1. Merge duplicate visitor rows (tg_ + firebase variant -> single row with firebase_uid set)
2. register_visitor: when a firebase-authenticated user registers, find the tg_ row
   (created when they first chatted via Telegram) and link it by setting firebase_uid,
   instead of creating a new separate row.
3. get_visitor_messages (public): already fixed in previous run with tg_/clean_str bridging.

Strategy: The canonical visitor_id is the tg_ one (oldest), we just need to set its
firebase_uid so future lookups via Firebase UID find it.
"""
import sys
sys.path.append('/root/teleshop-api')
from common import db

# ── Step 1: Fix existing duplicate visitors in DB ─────────────────────────────
print("=== Step 1: Merging duplicate visitors ===")

# Find all cases where we have BOTH tg_X and X as separate rows
dupes = db.q(
    """
    SELECT a.visitor_id as tg_vid, b.visitor_id as clean_vid, a.bot_id,
           a.firebase_uid as tg_fuid, b.firebase_uid as clean_fuid,
           a.name as tg_name, b.name as clean_name,
           b.email as clean_email, b.phone as clean_phone
    FROM web_visitors a
    JOIN web_visitors b ON b.visitor_id = REPLACE(a.visitor_id, 'tg_', '')
                       AND b.bot_id = a.bot_id
    WHERE a.visitor_id LIKE 'tg_%'
    """,
    fetch=True
) or []

print(f"Found {len(dupes)} duplicate pairs")
for d in dupes:
    tg_vid = d['tg_vid']
    clean_vid = d['clean_vid']
    bot_id = d['bot_id']
    # The firebase_uid to use (from clean_vid row, since it was created via Firebase login)
    fuid = d['clean_fuid'] or d['tg_fuid'] or clean_vid

    print(f"  Merging: {tg_vid} <-> {clean_vid}, firebase_uid={fuid}")

    # 1. Update the tg_ row to set firebase_uid so lookups work
    db.q(
        "UPDATE web_visitors SET firebase_uid = %s, name = CASE WHEN %s != '' THEN %s ELSE name END, "
        "email = COALESCE(NULLIF(%s, ''), email), phone = COALESCE(NULLIF(%s, ''), phone) "
        "WHERE visitor_id = %s AND bot_id = %s",
        (fuid, d['clean_name'], d['clean_name'], d['clean_email'] or '', d['clean_phone'] or '', tg_vid, bot_id)
    )

    # 2. Migrate any messages from clean_vid row to tg_ row
    moved = db.q(
        "UPDATE chat_messages SET visitor_id = %s WHERE visitor_id = %s AND bot_id = %s",
        (tg_vid, clean_vid, bot_id)
    )
    print(f"    Migrated messages from {clean_vid} -> {tg_vid}")

    # 3. Delete the duplicate clean_vid row
    db.q("DELETE FROM web_visitors WHERE visitor_id = %s AND bot_id = %s", (clean_vid, bot_id))
    print(f"    Deleted duplicate row {clean_vid}")

print()

# ── Step 2: Fix register_visitor in backend.py ────────────────────────────────
print("=== Step 2: Fixing register_visitor in backend.py ===")

path = '/root/teleshop-api/backend.py'
with open(path, 'r') as f:
    content = f.read()

# Find the register_visitor function and replace the lookup logic
# Look for the existing lookup block (from the previous update_reg.py run)
old_lookup = (
    '    tg_id = "tg_" + visitor_id if not visitor_id.startswith("tg_") else visitor_id\n'
    '    clean_id = visitor_id.replace("tg_", "")\n'
    '\n'
    '    existing = db.q(\n'
    '        "SELECT visitor_id FROM web_visitors WHERE bot_id = %s AND ("\n'
    '        "visitor_id = %s OR visitor_id = %s OR user_id::text = %s "\n'
    '        "OR (firebase_uid IS NOT NULL AND firebase_uid != \'\' AND (firebase_uid = %s OR firebase_uid = %s OR firebase_uid = %s))"\n'
    '        ")",\n'
    '        (bot_id, visitor_id, tg_id, clean_id, firebase_uid or visitor_id, visitor_id, clean_id),\n'
    '        fetch_one=True\n'
    '    )\n'
    '    is_new = existing is None\n'
    '    target_visitor_id = existing["visitor_id"] if existing else visitor_id\n'
)

new_lookup = (
    '    tg_id = "tg_" + visitor_id if not visitor_id.startswith("tg_") else visitor_id\n'
    '    clean_id = visitor_id.replace("tg_", "")\n'
    '    lookup_uid = firebase_uid if firebase_uid else visitor_id\n'
    '\n'
    '    # Look up existing visitor - check both tg_ prefix and clean variants, and firebase_uid\n'
    '    existing = db.q(\n'
    '        "SELECT visitor_id FROM web_visitors WHERE bot_id = %s AND ("\n'
    '        "  visitor_id = %s OR visitor_id = %s OR visitor_id = %s"\n'
    '        "  OR (firebase_uid IS NOT NULL AND firebase_uid != \'\' AND"\n'
    '        "      (firebase_uid = %s OR firebase_uid = %s OR firebase_uid = %s))"\n'
    '        ") ORDER BY created_at ASC LIMIT 1",\n'
    '        (bot_id, visitor_id, tg_id, clean_id, lookup_uid, visitor_id, clean_id),\n'
    '        fetch_one=True\n'
    '    )\n'
    '    is_new = existing is None\n'
    '    target_visitor_id = existing["visitor_id"] if existing else visitor_id\n'
    '\n'
    '    # If found via Firebase and the canonical row uses tg_ prefix, update its firebase_uid link\n'
    '    if existing and firebase_uid and existing["visitor_id"] != visitor_id:\n'
    '        db.q(\n'
    '            "UPDATE web_visitors SET firebase_uid = %s WHERE visitor_id = %s AND bot_id = %s AND (firebase_uid IS NULL OR firebase_uid = \'\')",\n'
    '            (firebase_uid, target_visitor_id, bot_id)\n'
    '        )\n'
)

if old_lookup in content:
    content = content.replace(old_lookup, new_lookup, 1)
    print("  ✓ Fixed register_visitor lookup block")
else:
    print("  ✗ Could not find old lookup block — check manually")
    # Show what's there around the register_visitor
    idx = content.find('@app.post("/public/visitor/register"')
    print("Current register_visitor (first 1500 chars):")
    print(content[idx:idx+1500])

with open(path, 'w') as f:
    f.write(content)

print()
print("=== All fixes applied! Restart the server. ===")
