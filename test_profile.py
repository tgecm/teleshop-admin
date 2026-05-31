import requests
import jwt
import datetime
import json
import sys

JWT_SECRET = "teleshop-super-secret-jwt-key-change-in-prod"
JWT_ALGORITHM = "HS256"
google_uid = "102583582879924773054"
bot_id = 78
shop_slug = "myanmar-digital-city-rmmrn"

expire = datetime.datetime.utcnow() + datetime.timedelta(days=1)
token = jwt.encode(
    {"sub": google_uid, "bot_id": bot_id, "name": "H Y", "photo_url": "", "email": "h4611730@gmail.com", "type": "customer", "exp": expire},
    JWT_SECRET, algorithm=JWT_ALGORITHM
)

headers = {"Authorization": "Bearer " + token, "Content-Type": "application/json"}

# Step 1: Get current profile
print("=== GET PROFILE ===")
url = "http://127.0.0.1:8000/customer/" + google_uid + "/profile?shop=" + shop_slug
resp = requests.get(url, headers=headers)
print("Status: " + str(resp.status_code))
print("Response: " + json.dumps(resp.json(), indent=2))

# Step 2: Save profile
print("\n=== SAVE PROFILE ===")
save_data = {
    "firebase_uid": google_uid,
    "bot_id": bot_id,
    "display_name": "H Y Updated",
    "email": "h4611730@gmail.com",
    "phone": "09123456789",
    "telegram_username": "@testuser",
    "viber_number": "09123456789",
    "address": "123 Test Street",
    "notes": "Test profile save"
}
resp = requests.post("http://127.0.0.1:8000/customer/profile/save", headers=headers, json=save_data)
print("Status: " + str(resp.status_code))
print("Response: " + json.dumps(resp.json(), indent=2))

# Step 3: Get profile again
print("\n=== GET PROFILE AFTER SAVE ===")
resp = requests.get(url, headers=headers)
print("Status: " + str(resp.status_code))
print("Response: " + json.dumps(resp.json(), indent=2))

# Step 4: Check DB directly
import subprocess
result = subprocess.run(
    ["sudo", "-u", "postgres", "psql", "-d", "telegram_market", "-c",
     "SELECT id, bot_id, firebase_uid, display_name, email, phone, telegram_username, viber_number, address, notes FROM website_customers WHERE id=30"],
    capture_output=True, text=True
)
print("\n=== DATABASE STATE ===")
print(result.stdout)
if result.stderr:
    print("STDERR:", result.stderr[:200])
