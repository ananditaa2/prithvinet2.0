import os
from dotenv import load_dotenv

load_dotenv()

# ─── App ───────────────────────────────────────────────────────────────────────
APP_TITLE = "PrithviNet API"
APP_VERSION = "1.0.0"

# ─── Database ──────────────────────────────────────────────────────────────────
# Production: Use PostgreSQL or persistent storage
# Local: SQLite is fine
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./prithvinet.db")

# ─── JWT ───────────────────────────────────────────────────────────────────────
# CRITICAL: Set SECRET_KEY in environment variables for production!
SECRET_KEY = os.getenv("SECRET_KEY")
if not SECRET_KEY:
    # For hackathon/demo only - in production this should fail
    SECRET_KEY = "demo-secret-key-change-immediately"
    print("⚠️  WARNING: Using default SECRET_KEY. Set SECRET_KEY env var for production!")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_HOURS = 24

# ─── AI / Groq ─────────────────────────────────────────────────────────────────
XAI_API_KEY = os.getenv("XAI_API_KEY", "")
GROQ_BASE_URL = "https://api.groq.com/openai/v1"
GROQ_MODEL = "llama-3.1-8b-instant"

# ─── Pollution Thresholds ──────────────────────────────────────────────────────
# CPCB Legal Limits (NAAQS 24-hour average standards)
# Sources: https://cpcb.nic.in/naaqs-standards/
CPCB_LEGAL_LIMITS = {
    "pm25":  60,   # µg/m³ - CPCB NAAQS 24hr standard
    "pm10":  100,  # µg/m³ - CPCB NAAQS 24hr standard
    "so2":   80,   # µg/m³ - CPCB NAAQS 24hr standard
    "no2":   80,   # µg/m³ - CPCB NAAQS 24hr standard
    "co":    4,    # mg/m³ - CPCB NAAQS 8hr standard
    "o3":    100,  # µg/m³ - CPCB NAAQS 8hr standard
}

# Air (µg/m³ or ppm) - Used for severity classification AFTER legal limit is exceeded
# These tiers classify HOW BAD the violation is, not WHETHER there is a violation
AIR_SEVERITY_TIERS = {
    "pm25":  {"warning": 60,  "high": 90,  "critical": 120},
    "pm10":  {"warning": 100, "high": 150, "critical": 250},
    "so2":   {"warning": 80,  "high": 120, "critical": 200},
    "no2":   {"warning": 80,  "high": 150, "critical": 200},
    "co":    {"warning": 4,   "high": 8,   "critical": 15},
    "o3":    {"warning": 100, "high": 168, "critical": 208},
}

# Backwards compatibility alias (will be removed after migration)
AIR_THRESHOLDS = AIR_SEVERITY_TIERS
# Water
WATER_THRESHOLDS = {
    "ph_low":           6.5,
    "ph_high":          8.5,
    "bod":              {"low": 15, "medium": 30, "high": 60, "critical": 100},
    "cod":              {"low": 50, "medium": 100,"high": 200,"critical": 400},
    "dissolved_oxygen": 4.0,   # minimum mg/L
    "turbidity":        {"low": 10, "medium": 25, "high": 50, "critical": 100},
    "coliform":         {"low": 50, "medium": 200,"high": 500,"critical": 1000},
}
# Noise (dB)
NOISE_THRESHOLDS = {
    "residential":  {"low": 55, "medium": 65, "high": 75, "critical": 85},
    "commercial":   {"low": 65, "medium": 75, "high": 85, "critical": 95},
    "industrial":   {"low": 75, "medium": 85, "high": 95, "critical": 105},
}
