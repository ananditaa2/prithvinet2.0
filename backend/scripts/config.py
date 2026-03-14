import os
from pathlib import Path

from dotenv import load_dotenv

_ = load_dotenv()

BASE_DIR = Path(__file__).resolve().parent.parent
DEFAULT_SQLITE_PATH = BASE_DIR / "prithvinet.db"

# ─── App ───────────────────────────────────────────────────────────────────────
APP_TITLE = "PrithviNet API"
APP_VERSION = "1.0.0"

# ─── Database ──────────────────────────────────────────────────────────────────
DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{DEFAULT_SQLITE_PATH.as_posix()}")

# ─── JWT ───────────────────────────────────────────────────────────────────────
SECRET_KEY = os.getenv("SECRET_KEY", "prithvinet-super-secret-key-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_HOURS = 24

# ─── AI / Groq ─────────────────────────────────────────────────────────────────
XAI_API_KEY = os.getenv("XAI_API_KEY", "")
GROQ_BASE_URL = "https://api.groq.com/openai/v1"
GROQ_MODEL = "llama-3.1-8b-instant"

# ─── Pollution Thresholds ──────────────────────────────────────────────────────
# Air (µg/m³ or ppm)
AIR_THRESHOLDS = {
    "pm25": {"low": 30, "medium": 60, "high": 90, "critical": 120},
    "pm10": {"low": 50, "medium": 100, "high": 150, "critical": 250},
    "so2": {"low": 40, "medium": 80, "high": 120, "critical": 200},
    "no2": {"low": 40, "medium": 80, "high": 150, "critical": 200},
    "co": {"low": 2, "medium": 4, "high": 8, "critical": 15},
    "o3": {"low": 50, "medium": 100, "high": 168, "critical": 208},
}
# Water
WATER_THRESHOLDS = {
    "ph_low": 6.5,
    "ph_high": 8.5,
    "bod": {"low": 15, "medium": 30, "high": 60, "critical": 100},
    "cod": {"low": 50, "medium": 100, "high": 200, "critical": 400},
    "dissolved_oxygen": 4.0,  # minimum mg/L
    "turbidity": {"low": 10, "medium": 25, "high": 50, "critical": 100},
    "coliform": {"low": 50, "medium": 200, "high": 500, "critical": 1000},
}
# Noise (dB)
NOISE_THRESHOLDS = {
    "residential": {"low": 55, "medium": 65, "high": 75, "critical": 85},
    "commercial": {"low": 65, "medium": 75, "high": 85, "critical": 95},
    "industrial": {"low": 75, "medium": 85, "high": 95, "critical": 105},
    "silent": {"low": 50, "medium": 60, "high": 70, "critical": 80},
}
