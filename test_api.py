import requests, jwt, datetime, json, urllib3
urllib3.disable_warnings()

JWT_SECRET = "teleshop-super-secret-jwt-key-change-in-prod"
google_uid = "102583582879924773054"
bot_id = 78
shop_slug = "myanmar-digital-city-rmmrn"

expire = datetime.datetime.utcnow() + datetime.timedelta(days=1)
token = jwt.encode({"sub": google_uid, "bot_id": bot_id, "name": "H Y", "photo_url": "", "email": "h4611730@gmail.com", "type": "customer", "exp": expire}, JWT_SECRET, algorithm="HS256")

headers = {"Authorization": "Bearer " + token, "Content-Type": "application/json"}

# Test via actual API hostname
url = "https://api.telegramecommerce.shop/customer/" + google_uid + "/profile?shop=" + shop_slug
resp = requests.get(url, headers=headers, verify=False)
print("GET Status:", resp.status_code)
print(json.dumps(resp.json(), indent=2))
