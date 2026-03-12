from sqlalchemy import Column, Integer, String, Float, DateTime
from datetime import datetime, timezone
from core.database import Base

class MonitoringLocation(Base):
    __tablename__ = "monitoring_locations"

    id            = Column(Integer, primary_key=True, index=True)
    name          = Column(String, nullable=False)
    region        = Column(String, nullable=False, index=True)
    latitude      = Column(Float, nullable=False)
    longitude     = Column(Float, nullable=False)
    location_type = Column(String, default="general")
    # location_type: general | industrial | residential | commercial | forest | river
    industry_id   = Column(Integer, nullable=True)   # nearest industry (loose FK)
    assigned_team = Column(String, nullable=True)     # team name / email
    is_active     = Column(Integer, default=1)
    created_at    = Column(DateTime, default=lambda: datetime.now(timezone.utc))
