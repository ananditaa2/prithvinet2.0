import requests
import json
import sys

# Get a token using regular login (form data, not JSON)
auth_res = requests.post("http://localhost:8000/auth/login", data={"username": "admin@prithvinet.gov.in", "password": "password123"})
if auth_res.status_code != 200:
    print("Login failed:", auth_res.text)
    sys.exit(1)

token = auth_res.json()["access_token"]
headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}

payloads = {
    "/data/air": {"location_id": 1, "pm25": 100, "pm10": 150},
    "/data/water": {"location_id": 1, "ph": 7.0, "bod": 20},
    "/data/noise": {"location_id": 1, "decibel_level": 80}
}

for route, payload in payloads.items():
    print(f"Testing {route}...")
    try:
        r = requests.post(f"http://localhost:8000{route}", json=payload, headers=headers)
        if r.status_code == 500:
            print(f"500 Error on {route}: {r.text}")
        else:
            print(f"OK: {route} ({r.status_code})")
    except Exception as e:
        print(f"Failed to fetch {route}: {e}")
