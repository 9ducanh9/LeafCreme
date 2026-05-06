
import requests
import json
import sys
import io

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
url = "http://localhost:8003/auth/login"
data = {"username": "admin_demo", "password": "admin123"}
print(f"POST {url}")
print(f"Body: {data}")
try:
    resp = requests.post(url, data=data)
    print(f"Status Code: {resp.status_code}")
    print(f"Response: {json.dumps(resp.json(), indent=2, ensure_ascii=False)}")
except Exception as e:
    print(f"Error: {e}")
