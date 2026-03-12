from sqlalchemy import Column, Integer, String, Float, DateTime, Text
from datetime import datetime, timezone
from core.database import Base


class EnvironmentalData(Base):
    __tablename__ = "environmental_data"

    id            = Column(Integer, primary_key=True, index=True)
    data_type     = Column(String, nullable=False, index=True)  # air | water | noise
    location_id   = Column(Integer, nullable=False, index=True)
    industry_id   = Column(Integer, nullable=True)
    submitted_by  = Column(Integer, nullable=True)   # user.id
    recorded_at   = Column(DateTime, default=lambda: datetime.now(timezone.utc), index=True)

    # ── Air Quality Fields (µg/m³ / ppm) ──────────────────────────────────────
    pm25          = Column(Float, nullable=True)
    pm10          = Column(Float, nullable=True)
    so2           = Column(Float, nullable=True)
    no2           = Column(Float, nullable=True)
    co            = Column(Float, nullable=True)
    o3            = Column(Float, nullable=True)
    aqi           = Column(Float, nullable=True)   # computed overall Air Quality Index

    # ── Water Quality Fields ────────────────────────────────────────────────────
    ph                  = Column(Float, nullable=True)
    bod                 = Column(Float, nullable=True)   # mg/L
    cod                 = Column(Float, nullable=True)   # mg/L
    dissolved_oxygen    = Column(Float, nullable=True)   # mg/L
    turbidity           = Column(Float, nullable=True)   # NTU
    coliform            = Column(Float, nullable=True)   # MPN/100mL

    # ── Noise Fields ────────────────────────────────────────────────────────────
    decibel_level       = Column(Float, nullable=True)   # dB(A) average
    peak_decibel        = Column(Float, nullable=True)   # dB(A) peak
    noise_location_type = Column(String, nullable=True)  # residential|commercial|industrial

    # ── Sensor / source metadata ────────────────────────────────────────────────
    source        = Column(String, default="manual")     # manual | sensor | api
    notes         = Column(Text, nullable=True)
