import requests
import sys

endpoints = [
    "/",
    "/health",
    "/data",
    "/alerts",
    "/compliance",
    "/reports/monthly?year=2024&month=1",
    "/reports/yearly?year=2024",
    "/alerts/pollution-zones",
    "/cases-to-act"
]

print("Testing endpoints...")
for route in endpoints:
    try:
        r = requests.get(f"http://localhost:8000{route}")
        if r.status_code == 500:
            print(f"500 Error on {route}: {r.text}")
            sys.exit(1)
        else:
            print(f"OK: {route} ({r.status_code})")
    except Exception as e:
        print(f"Failed to fetch {route}: {e}")
