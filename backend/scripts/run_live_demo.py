import time
import json
import asyncio
import random
from fastapi import FastAPI, BackgroundTasks, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from typing import List

# ==========================================
# PrithviNet Live Demo WebSocket Server
# Run this during your hackathon pitch!
# Command: uvicorn run_live_demo:app --reload --port 8000
# ==========================================

app = FastAPI()

# Enable CORS for the frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        print(f"Frontend Dashboard Connected! ({len(self.active_connections)} active)")

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast(self, message: dict):
        for connection in self.active_connections:
            try:
                await connection.send_text(json.dumps(message))
            except Exception as e:
                print(f"Error broadcasting: {e}")

manager = ConnectionManager()

@app.websocket("/ws/dashboard")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            # Keep connection alive and listen for any messages from client
            data = await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)
        print("Frontend Dashboard Disconnected")

@app.post("/trigger-anomaly")
async def trigger_anomaly(background_tasks: BackgroundTasks):
    """
    Hit this endpoint to simulate a massive real-time pollution spike.
    This will instantly push to all connected frontend dashboards via WebSockets.
    """
    
    anomaly_payload = {
        "type": "ANOMALY_ALERT",
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "message": "CRITICAL BREACH DETECTED: Illegal night-time industrial emissions verified at Siltara Industrial Area (Raipur). AQI spiked from 145 to 380 in 10 minutes.",
        "data": {
            "type": "AIR_QUALITY_SPIKE",
            "station_id": "ST-RPR-02",
            "AQI": 380,
            "category": "SEVERE"
        }
    }
    print("\nINJECTING REAL-TIME ANOMALY INTO DATASPACE")
    print(f"Payload: {anomaly_payload['message']}")
    
    # Broadcast to all connected WebSockets (the React frontend)
    await manager.broadcast(anomaly_payload)
    
    return {"status": "Anomaly broadcasted to frontend successfully", "payload": anomaly_payload}

if __name__ == "__main__":
    import uvicorn
    print("\n========================================================")
    print("PRITHVINET REAL-TIME WEBSOCKET DEMO SERVER")
    print("========================================================")
    print("1. Start your React frontend (npm run dev)")
    print("2. Make sure the dashboard shows 'System Live' in the footer")
    print("3. When ready to wow the judges, run this in another terminal:")
    print("   curl -X POST https://prithvinet-api-prod.onrender.com/trigger-anomaly")
    print("========================================================\n")
    uvicorn.run(app, host="0.0.0.0", port=8000)

