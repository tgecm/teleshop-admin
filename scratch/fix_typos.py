path = '/root/teleshop-api/backend.py'
with open(path, 'r') as f:
    content = f.read()

# Fix the SQL typo ANE -> AND
before = len(content)
content = content.replace('ANE EXCLUDED.name', 'AND EXCLUDED.name')
print('Fixed ANE typo:', len(content) != before or 'ANE' not in content)

# Check the fcm notify f-string (base64 might have mangled it)
if 'fM{display_name}' in content or 'fMdisplay_name}' in content:
    content = content.replace('fM{display_name}', f'"{"{display_name}"} registered at your shop"')
    print('Fixed fM f-string')

with open(path, 'w') as f:
    f.write(content)

# Now verify the info_text insert
insert_needle = "INSERT INTO chat_messages (bot_id, visitor_id, sender_type, message_text)"
idx = content.find(insert_needle)
while idx >= 0:
    snippet = content[idx:idx+250]
    print("--- insert found ---")
    print(snippet)
    print()
    idx = content.find(insert_needle, idx+1)
