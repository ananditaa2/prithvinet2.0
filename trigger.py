import httpx

with httpx.Client(base_url='http://localhost:8000') as client:
    # 1. Login
    resp = client.post('/auth/login', data={'username': 'admin@prithvinet.gov.in', 'password': 'Demo@123'})
    resp.raise_for_status()
    token = resp.json()['access_token']
    
    # 2. Submit Anomaly Data
    data = {"location_id": 1, "pm25": 300.5, "pm10": 420.0, "so2": 50.1, "no2": 80.5, "co": 2.1}
    print("Submitting critical data to trigger WebSocket anomaly...")
    res = client.post('/data/air', json=data, headers={'Authorization': f'Bearer {token}'})
    print(res.json())
