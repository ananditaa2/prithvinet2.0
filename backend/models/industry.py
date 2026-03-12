from sqlalchemy import Column, Integer, String, Float, DateTime, Enum
from datetime import datetime, timezone
from core.database import Base

class Industry(Base):
    __tablename__ = "industries"

    id                  = Column(Integer, primary_key=True, index=True)
    name                = Column(String, nullable=False, index=True)
    industry_type       = Column(String, nullable=False)
    # type: manufacturing | mining | chemical | textile | power | pharmaceutical | other
    address             = Column(String, nullable=False)
    region              = Column(String, nullable=False, index=True)
    latitude            = Column(Float, nullable=True)
    longitude           = Column(Float, nullable=True)
    contact_email       = Column(String, nullable=True)
    registration_number = Column(String, unique=True, nullable=False)
    status              = Column(String, default="active")
    # status: active | suspended | compliant | violating
    registered_by       = Column(Integer, nullable=True)   # FK user.id (loose)
    created_at          = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at          = Column(DateTime, default=lambda: datetime.now(timezone.utc),
                                 onupdate=lambda: datetime.now(timezone.utc))
