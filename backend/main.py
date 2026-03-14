"""
PrithviNet API — Main application entry point.
Registers all routers and initialises the database on startup.
"""
import os
import asyncio
import json
import traceback
from typing import Optional
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from core.config import APP_TITLE, APP_VERSION
from core.database import engine, Base

# Import all models so SQLAlchemy knows about them before create_all()
import models  # noqa: F401

# ── Create all tables on startup (SQLite will create the .db file) ─────────────
Base.metadata.create_all(bind=engine)


from core.websocket import manager


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
# Configure allowed origins via FRONTEND_URL env var
# Local: http://localhost:8080, http://localhost:3000
# Production: https://your-frontend.netlify.app or https://your-frontend.vercel.app
ALLOWED_ORIGINS = os.getenv("FRONTEND_URL", "http://localhost:8080").split(",")
# For hackathon/demo: also allow common local dev ports
if os.getenv("ENVIRONMENT") != "production":
    ALLOWED_ORIGINS.extend([
        "http://localhost:8080",
        "http://localhost:3000",
        "http://127.0.0.1:8080",
        "http://127.0.0.1:3000",
    ])

# Always allow Netlify/Vercel common patterns for deployment
ALLOWED_ORIGINS.extend([
    "https://prithvinet.netlify.app",
    "https://prithvinet-cg.netlify.app",
    "https://*.netlify.app",
])

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)


# ── Global exception handler (surfaces real errors for debugging) ─────────────────
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    if isinstance(exc, HTTPException):
        return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail})
    tb = traceback.format_exc()
    print(f"[500] {request.method} {request.url.path}\n{tb}")
    detail = str(exc) if os.getenv("DEBUG", "").lower() in ("1", "true") else "Internal Server Error"
    return JSONResponse(
        status_code=500,
        content={"detail": detail, "type": type(exc).__name__},
    )


# ── Routers ────────────────────────────────────────────────────────────────────
from routers import auth, industries, locations, environmental, reports, alerts, ai, heatmap, sensors, citizen, public_ai

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
app.include_router(public_ai.router)  # Public AI Copilot - no auth required


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
async def ws_dashboard(websocket: WebSocket, token: Optional[str] = None):
    """Live dashboard push — broadcasts new readings and anomaly alerts."""
    try:
        await manager.connect(websocket)
        print(f"🔌 WebSocket connected. Total connections: {len(manager.active_connections)}")
        try:
            while True:
                # Keep connection alive; clients don't need to send anything
                await websocket.receive_text()
        except WebSocketDisconnect:
            manager.disconnect(websocket)
            print(f"🔌 WebSocket disconnected. Total connections: {len(manager.active_connections)}")
        except Exception as e:
            print(f"⚠️ WebSocket error: {e}")
            manager.disconnect(websocket)
    except Exception as e:
        print(f"⚠️ Failed to connect WebSocket: {e}")
