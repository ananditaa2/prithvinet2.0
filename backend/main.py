"""
PrithviNet API — Main application entry point.
Registers all routers and initialises the database on startup.
"""
import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from core.config import APP_TITLE, APP_VERSION
from core.database import engine, Base

# Import all models so SQLAlchemy knows about them before create_all()
import models  # noqa: F401

# ── Create all tables on startup (SQLite will create the .db file) ─────────────
Base.metadata.create_all(bind=engine)

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
