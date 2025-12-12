import urllib.request
import json

url = "http://localhost:8000/api/login"
data = json.dumps({"username": "admin", "password": "admin123"}).encode('utf-8')
headers = {'Content-Type': 'application/json'}

print(f"Testing {url}...")
try:
    req = urllib.request.Request(url, data=data, headers=headers)
    with urllib.request.urlopen(req) as response:
        print(f"Status: {response.getcode()}")
        print(response.read().decode('utf-8'))
except Exception as e:
    print(f"Error: {e}")
