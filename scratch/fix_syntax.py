path = '/root/teleshop-api/backend.py'
with open(path, 'r') as f:
    content = f.read()

# Fix the syntax error from the base64 decode
content = content.replace(
    'info_parts.append("New Visitor"]',
    'info_parts.append("New Visitor")'
)

# Also fix the f-string issue from base64 decode (fM{display_name} -> f"{display_name}")
content = content.replace(
    'fM{display_name}',
    f'f"{chr(123)}display_name{chr(125)}'
)
# Handle the actual broken pattern
import re
content = re.sub(
    r'fM\{display_name\}\s+registered at your shop"',
    'f"{display_name} registered at your shop"',
    content
)

with open(path, 'w') as f:
    f.write(content)

# Verify syntax
import py_compile
try:
    py_compile.compile(path, doraise=True)
    print("SYNTAX OK - backend.py compiles cleanly")
except py_compile.PyCompileError as e:
    print("SYNTAX ERROR:", e)
