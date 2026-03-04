import requests
import json

url = "http://127.0.0.1:8000/api/simulate-risk"
payload = {
    "region": "City A",
    "industry": "Power Plant X",
    "pollutant": "SO2",
    "reduction_percentage": 30,
    "current_risk_score": 85.0
}
headers = {'Content-Type': 'application/json'}

try:
    response = requests.post(url, json=payload, headers=headers, timeout=15)
    print(f"Status Code: {response.status_code}")
    print(json.dumps(response.json(), indent=2))
except Exception as e:
    print(f"Error: {e}")
