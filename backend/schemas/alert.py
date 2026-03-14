from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class AlertOut(BaseModel):
    id: int
    data_id: Optional[int]
    location_id: Optional[int]
    location_name: Optional[str] = None
    industry_id: Optional[int]
    industry_name: Optional[str] = None
    alert_type: str
    pollutant: Optional[str]
    measured_value: Optional[float]
    threshold_value: Optional[float]
    severity: str
    message: str
    status: str
    resolved_by: Optional[int]
    resolved_at: Optional[datetime]
    created_at: datetime

    model_config = {"from_attributes": True}


class NotificationOut(BaseModel):
    id: int
    user_id: int
    alert_id: Optional[int]
    title: str
    message: str
    notif_type: str
    is_read: bool
    created_at: datetime

    model_config = {"from_attributes": True}
