"""
PrithviNet API — Main application entry point.
Registers all routers and initialises the database on startup.
"""
import os
import asyncio
import json
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from core.config import APP_TITLE, APP_VERSION
from core.database import engine, Base

# Import all models so SQLAlchemy knows about them before create_all()
import models  # noqa: F401

# ── Create all tables on startup (SQLite will create the .db file) ─────────────
Base.metadata.create_all(bind=engine)


# ── WebSocket Connection Manager ───────────────────────────────────────────────
class ConnectionManager:
    def __init__(self):
        self.active_connections: list[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast(self, message: dict):
        data = json.dumps(message)
        dead = []
        for ws in self.active_connections:
            try:
                await ws.send_text(data)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.disconnect(ws)


manager = ConnectionManager()


# ── App ────────────────────────────────────────────────────────────────────────
app = FastAPI(
    title=APP_TITLE,
    version=APP_VERSION,

    description=(
        "PrithviNet Environmental Compliance & Monitoring Platform API.\n\n"
        "**Roles**: `admin` | `regional_officer` | `monitoring_team` | `industry_user` | `citizen`\n\n"
        "**Auth**: Use `/auth/login` to get a JWT token, then click **Authorize** and paste it."
    ),
    docs_url="/docs",
    redoc_url="/redoc",
)

# ── CORS ────────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:8080",
        "http://127.0.0.1:8080",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:8081",
        "http://127.0.0.1:8081",
        "*",
    ],
    allow_credentials=False,   # Must be False when allow_origins includes "*"
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ────────────────────────────────────────────────────────────────────
from routers import auth, industries, locations, environmental, reports, alerts, ai, heatmap, sensors, citizen

app.include_router(auth.router)
app.include_router(industries.router)
app.include_router(locations.router)
app.include_router(environmental.router)
app.include_router(reports.router)
app.include_router(alerts.router)
app.include_router(ai.router)
app.include_router(heatmap.router)
app.include_router(sensors.router)
app.include_router(citizen.router)


# ── Root ───────────────────────────────────────────────────────────────────────
@app.get("/", tags=["Health"])
def root():
    return {
        "app": APP_TITLE,
        "version": APP_VERSION,
        "docs": "/docs",
        "status": "running",
    }


@app.get("/health", tags=["Health"])
def health():
    return {"status": "ok"}


# ── WebSocket Endpoint ─────────────────────────────────────────────────────────
@app.websocket("/ws/dashboard")
async def ws_dashboard(websocket: WebSocket):
    """Live dashboard push — broadcasts new readings and anomaly alerts."""
    await manager.connect(websocket)
    try:
        while True:
            # Keep connection alive; clients don't need to send anything
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)
