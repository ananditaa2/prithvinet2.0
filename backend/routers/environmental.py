from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional
from datetime import datetime

from core.database import get_db
from core.security import get_current_user, require_roles
from models.environmental_data import EnvironmentalData
from schemas.environmental import AirDataSubmit, WaterDataSubmit, NoiseDataSubmit, EnvironmentalDataOut
from services.alert_service import check_and_trigger_alerts

router = APIRouter(prefix="/data", tags=["Environmental Data"])

SUBMIT_ROLES = ("admin", "regional_officer", "monitoring_team")


def _compute_aqi(pm25: float | None, pm10: float | None) -> float | None:
    """Simplified AQI from PM2.5 and PM10 (dominant pollutants)."""
    if pm25 is None and pm10 is None:
        return None
    vals = [v for v in [pm25, pm10] if v is not None]
    raw = max(vals)
    if raw <= 30:   return round(raw * (50/30), 1)
    if raw <= 60:   return round(50 + (raw - 30) * (50/30), 1)
    if raw <= 90:   return round(100 + (raw - 60) * (50/30), 1)
    if raw <= 120:  return round(150 + (raw - 90) * (50/30), 1)
    if raw <= 250:  return round(200 + (raw - 120) * (100/130), 1)
    return round(300 + (raw - 250) * (100/130), 1)


@router.post("/air", response_model=EnvironmentalDataOut, status_code=201)
def submit_air(
    payload: AirDataSubmit,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(*SUBMIT_ROLES)),
):
    aqi = _compute_aqi(payload.pm25, payload.pm10)
    entry = EnvironmentalData(
        data_type="air",
        submitted_by=current_user.id,
        aqi=aqi,
        source="manual",
        **payload.model_dump(),
    )
    db.add(entry)
    db.flush()
    check_and_trigger_alerts(db, entry)
    db.commit()
    db.refresh(entry)
    return entry


@router.post("/water", response_model=EnvironmentalDataOut, status_code=201)
def submit_water(
    payload: WaterDataSubmit,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(*SUBMIT_ROLES)),
):
    entry = EnvironmentalData(
        data_type="water",
        submitted_by=current_user.id,
        source="manual",
        **payload.model_dump(),
    )
    db.add(entry)
    db.flush()
    check_and_trigger_alerts(db, entry)
    db.commit()
    db.refresh(entry)
    return entry


@router.post("/noise", response_model=EnvironmentalDataOut, status_code=201)
def submit_noise(
    payload: NoiseDataSubmit,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(*SUBMIT_ROLES)),
):
    entry = EnvironmentalData(
        data_type="noise",
        submitted_by=current_user.id,
        source="manual",
        **payload.model_dump(),
    )
    db.add(entry)
    db.flush()
    check_and_trigger_alerts(db, entry)
    db.commit()
    db.refresh(entry)
    return entry


@router.get("", response_model=list[EnvironmentalDataOut])
def get_data(
    data_type: Optional[str] = None,
    location_id: Optional[int] = None,
    industry_id: Optional[int] = None,
    from_date: Optional[datetime] = None,
    to_date: Optional[datetime] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    q = db.query(EnvironmentalData)
    if data_type:
        q = q.filter(EnvironmentalData.data_type == data_type)
    if location_id:
        q = q.filter(EnvironmentalData.location_id == location_id)
    if industry_id:
        q = q.filter(EnvironmentalData.industry_id == industry_id)
    if from_date:
        q = q.filter(EnvironmentalData.recorded_at >= from_date)
    if to_date:
        q = q.filter(EnvironmentalData.recorded_at <= to_date)
    return q.order_by(EnvironmentalData.recorded_at.desc()).offset(skip).limit(limit).all()


@router.get("/latest/{location_id}", response_model=list[EnvironmentalDataOut])
def latest_for_location(
    location_id: int,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    """Returns the most recent reading of each type for a location."""
    results = []
    for dtype in ("air", "water", "noise"):
        row = (
            db.query(EnvironmentalData)
            .filter(
                EnvironmentalData.location_id == location_id,
                EnvironmentalData.data_type == dtype,
            )
            .order_by(EnvironmentalData.recorded_at.desc())
            .first()
        )
        if row:
            results.append(row)
    return results
