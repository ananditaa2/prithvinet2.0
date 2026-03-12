from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class IndustryCreate(BaseModel):
    name: str
    industry_type: str
    address: str
    region: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    contact_email: Optional[str] = None
    registration_number: str
    status: str = "active"


class IndustryUpdate(BaseModel):
    name: Optional[str] = None
    industry_type: Optional[str] = None
    address: Optional[str] = None
    region: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    contact_email: Optional[str] = None
    status: Optional[str] = None


class IndustryOut(BaseModel):
    id: int
    name: str
    industry_type: str
    address: str
    region: str
    latitude: Optional[float]
    longitude: Optional[float]
    contact_email: Optional[str]
    registration_number: str
    status: str
    created_at: datetime

    model_config = {"from_attributes": True}


# ── Monitoring Location ────────────────────────────────────────────────────────

class LocationCreate(BaseModel):
    name: str
    region: str
    latitude: float
    longitude: float
    location_type: str = "general"
    industry_id: Optional[int] = None
    assigned_team: Optional[str] = None


class LocationUpdate(BaseModel):
    name: Optional[str] = None
    region: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    location_type: Optional[str] = None
    industry_id: Optional[int] = None
    assigned_team: Optional[str] = None
    is_active: Optional[int] = None


class LocationOut(BaseModel):
    id: int
    name: str
    region: str
    latitude: float
    longitude: float
    location_type: str
    industry_id: Optional[int]
    assigned_team: Optional[str]
    is_active: int
    created_at: datetime

    model_config = {"from_attributes": True}
