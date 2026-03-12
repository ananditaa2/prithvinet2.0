from sqlalchemy import Column, Integer, String, Float, DateTime, Text, Boolean
from datetime import datetime, timezone
from core.database import Base


class Alert(Base):
    __tablename__ = "alerts"

    id              = Column(Integer, primary_key=True, index=True)
    data_id         = Column(Integer, nullable=True)    # which reading triggered it
    location_id     = Column(Integer, nullable=True, index=True)
    industry_id     = Column(Integer, nullable=True, index=True)
    alert_type      = Column(String, nullable=False)    # air | water | noise | compliance
    pollutant       = Column(String, nullable=True)     # pm25 | bod | decibel_level | etc.
    measured_value  = Column(Float, nullable=True)
    threshold_value = Column(Float, nullable=True)
    severity        = Column(String, nullable=False)    # low | medium | high | critical
    message         = Column(Text, nullable=False)
    status          = Column(String, default="active")  # active | resolved | acknowledged
    resolved_by     = Column(Integer, nullable=True)
    resolved_at     = Column(DateTime, nullable=True)
    created_at      = Column(DateTime, default=lambda: datetime.now(timezone.utc), index=True)


class Notification(Base):
    __tablename__ = "notifications"

    id          = Column(Integer, primary_key=True, index=True)
    user_id     = Column(Integer, nullable=False, index=True)
    alert_id    = Column(Integer, nullable=True)
    title       = Column(String, nullable=False)
    message     = Column(Text, nullable=False)
    notif_type  = Column(String, default="alert")       # alert | reminder | escalation
    is_read     = Column(Boolean, default=False)
    created_at  = Column(DateTime, default=lambda: datetime.now(timezone.utc))
