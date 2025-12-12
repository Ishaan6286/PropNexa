import requests

print("Attempting login...")
try:
    res = requests.post("http://localhost:8000/api/login", json={"username": "admin", "password": "admin123"})
    print(f"Status Code: {res.status_code}")
    print(f"Response: {res.text}")
except Exception as e:
    print(f"Error: {e}")
