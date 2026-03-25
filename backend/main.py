"""
PrithviNet API — Main application entry point.
Registers all routers and initialises the database on startup.
"""
import os
import asyncio
import json
import traceback
import time
import uuid
import sys
from pathlib import Path
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

# Ensure emoji/unicode logs never crash startup on cp1252 consoles.
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")


# region agent log
_DEBUG_LOG_PATH = Path(__file__).resolve().parent.parent / "debug-a22406.log"


def _debug_log(hypothesis_id: str, location: str, message: str, data: dict) -> None:
    try:
        payload = {
            "sessionId": "a22406",
            "runId": "initial",
            "hypothesisId": hypothesis_id,
            "location": location,
            "message": message,
            "data": data,
            "timestamp": int(time.time() * 1000),
            "id": f"log_{int(time.time() * 1000)}_{uuid.uuid4().hex[:8]}",
        }
        with _DEBUG_LOG_PATH.open("a", encoding="utf-8") as f:
            f.write(json.dumps(payload, ensure_ascii=True) + "\n")
    except Exception as e:
        try:
            print(f"[debug-log-failed] {type(e).__name__}: {e}", file=sys.stderr)
        except Exception:
            pass
# endregion


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


@app.middleware("http")
async def debug_request_probe(request: Request, call_next):
    # region agent log
    _debug_log(
        "H10",
        "backend/main.py:debug_request_probe",
        "Incoming HTTP request",
        {
            "method": request.method,
            "path": request.url.path,
            "query": str(request.url.query),
            "client": request.client.host if request.client else None,
        },
    )
    # endregion
    print(f"[H10] -> {request.method} {request.url.path}")
    response = await call_next(request)
    # region agent log
    _debug_log(
        "H10",
        "backend/main.py:debug_request_probe",
        "Outgoing HTTP response",
        {
            "method": request.method,
            "path": request.url.path,
            "status_code": response.status_code,
        },
    )
    # endregion
    print(f"[H10] <- {request.method} {request.url.path} {response.status_code}")
    return response

# ── CORS ────────────────────────────────────────────────────────────────────────
# Allow all origins for production deployment (no credentials with wildcard)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:8080",
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:8080",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
        "http://[::1]:8080",
        "http://[::1]:5173",
        "http://0.0.0.0:8080",
        "https://prithvinet-2e98-9tcjmj1wi-ananditaa2s-projects.vercel.app",
        "https://prithvinet-2e98.vercel.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Global exception handler (surfaces real errors for debugging) ─────────────────
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    if isinstance(exc, HTTPException):
        return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail})
    tb = traceback.format_exc()
    # region agent log
    _debug_log(
        "H0",
        "backend/main.py:global_exception_handler",
        "Unhandled exception captured",
        {
            "method": request.method,
            "path": request.url.path,
            "query": str(request.url.query),
            "exceptionType": type(exc).__name__,
            "exceptionMessage": str(exc),
            "tracebackTail": tb[-800:],
        },
    )
    # endregion
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


@app.get("/debug/log-test", tags=["Health"])
def debug_log_test():
    # region agent log
    _debug_log(
        "H6",
        "backend/main.py:debug_log_test",
        "Manual debug log endpoint hit",
        {"ok": True},
    )
    # endregion
    return {"status": "logged"}


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


@app.on_event("startup")
async def startup_seed():
    from seed_db import seed_database
    from seed_priority_cases import seed_priority_cases
    from seed_noise_stations import seed_noise_stations
    # region agent log
    _debug_log(
        "H5",
        "backend/main.py:startup_seed",
        "Backend startup hook executed",
        {"cwd": os.getcwd()},
    )
    # endregion
    try:
        seed_database()
        print("✅ seed_db complete")
    except Exception as e:
        print(f"❌ seed_db failed: {e}")
    try:
        seed_priority_cases()
        print("✅ seed_priority_cases complete")
    except Exception as e:
        print(f"❌ seed_priority_cases failed: {e}")
    try:
        seed_noise_stations()
        print("✅ seed_noise_stations complete")
    except Exception as e:
        print(f"❌ seed_noise_stations failed: {e}")
    try:
        from seed_real_emissions import seed_real_emissions
        seed_real_emissions()
        print("✅ seed_real_emissions complete")
    except Exception as e:
        print(f"❌ seed_real_emissions failed: {e}")
