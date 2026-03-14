from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional
from datetime import datetime
import asyncio

from core.database import get_db
from core.security import get_current_user, require_roles
from models.environmental_data import EnvironmentalData
from models.industry import Industry
from models.monitoring_location import MonitoringLocation
from schemas.environmental import AirDataSubmit, WaterDataSubmit, NoiseDataSubmit, EnvironmentalDataOut
from services.alert_service import check_and_trigger_alerts

router = APIRouter(prefix="/data", tags=["Environmental Data"])


def _broadcast(event: dict):
    """Fire-and-forget WebSocket broadcast (lazy import avoids circular dep)."""
    try:
        from core.websocket import manager
        loop = asyncio.get_event_loop()
        if loop.is_running():
            asyncio.create_task(manager.broadcast(event))
    except Exception:
        pass  # Never let WS errors break data submission


SUBMIT_ROLES = ("admin", "regional_officer", "monitoring_team", "industry_user")


def _get_user_industry(current_user, db: Session) -> Optional[Industry]:
    if current_user.role != "industry_user":
        return None
    return db.query(Industry).filter(Industry.contact_email == current_user.email).first()


def _apply_environmental_scope(q, current_user, db: Session):
    if current_user.role in ("admin", "regional_officer"):
        return q

    if current_user.role == "industry_user":
        industry = _get_user_industry(current_user, db)
        if not industry:
            raise HTTPException(
                status_code=403,
                detail="Industry user is not linked to any registered industry.",
            )
        return q.filter(EnvironmentalData.industry_id == industry.id)

    if current_user.role == "monitoring_team":
        return q.filter(EnvironmentalData.submitted_by == current_user.id)

    return q.filter(False)


def _validate_submission_scope(payload, current_user, db: Session):
    if current_user.role in ("admin", "regional_officer"):
        return

    if current_user.role == "industry_user":
        industry = _get_user_industry(current_user, db)
        if not industry:
            raise HTTPException(
                status_code=403,
                detail="Industry user is not linked to any registered industry.",
            )
        if payload.industry_id != industry.id:
            raise HTTPException(
                status_code=403,
                detail="Industry users can only submit data for their own industry.",
            )
        return

    if current_user.role == "monitoring_team":
        location = (
            db.query(MonitoringLocation)
            .filter(MonitoringLocation.id == payload.location_id)
            .first()
        )
        if not location:
            raise HTTPException(404, "Location not found.")
        if not location.assigned_team:
            raise HTTPException(
                status_code=403,
                detail="This location is not assigned to any monitoring team.",
            )
        assigned = location.assigned_team.strip().lower()
        user_name = current_user.name.strip().lower()
        user_email = current_user.email.strip().lower()
        if assigned not in {user_name, user_email}:
            raise HTTPException(
                status_code=403,
                detail="Monitoring team can only submit data for assigned locations.",
            )
        return

    raise HTTPException(status_code=403, detail="Access denied.")


# ── CPCB National AQI Breakpoint Tables (AQI Technical Manual 2014) ────────────
# Each entry: (C_low, C_high, I_low, I_high)
_CPCB_BREAKPOINTS: dict[str, list[tuple]] = {
    "pm25": [(0,30,0,50),(30,60,51,100),(60,90,101,200),(90,120,201,300),(120,250,301,400),(250,9999,401,500)],
    "pm10": [(0,50,0,50),(50,100,51,100),(100,250,101,200),(250,350,201,300),(350,430,301,400),(430,9999,401,500)],
    "so2":  [(0,40,0,50),(40,80,51,100),(80,380,101,200),(380,800,201,300),(800,1600,301,400),(1600,9999,401,500)],
    "no2":  [(0,40,0,50),(40,80,51,100),(80,180,101,200),(180,280,201,300),(280,400,301,400),(400,9999,401,500)],
    "co":   [(0,1,0,50),(1,2,51,100),(2,10,101,200),(10,17,201,300),(17,34,301,400),(34,9999,401,500)],
    "o3":   [(0,50,0,50),(50,100,51,100),(100,168,101,200),(168,208,201,300),(208,748,301,400),(748,9999,401,500)],
}

def _sub_index(pollutant: str, concentration: float) -> float:
    """Calculate the CPCB sub-index for a single pollutant."""
    for (c_lo, c_hi, i_lo, i_hi) in _CPCB_BREAKPOINTS[pollutant]:
        if c_lo <= concentration <= c_hi:
            return round(i_lo + (concentration - c_lo) * (i_hi - i_lo) / (c_hi - c_lo), 1)
    return 500.0  # Beyond maximum breakpoint → hazardous

def _compute_aqi(pm25: float | None, pm10: float | None,
                 so2: float | None = None, no2: float | None = None,
                 co: float | None = None, o3: float | None = None) -> float | None:
    """
    Compute AQI using the official CPCB National AQI formula.
    AQI = max sub-index across all available pollutants.
    """
    readings = {
        "pm25": pm25, "pm10": pm10,
        "so2": so2,   "no2": no2,
        "co": co,     "o3": o3,
    }
    sub_indices = [
        _sub_index(p, v)
        for p, v in readings.items()
        if v is not None and p in _CPCB_BREAKPOINTS
    ]
    return round(max(sub_indices), 1) if sub_indices else None


@router.post("/air", response_model=EnvironmentalDataOut, status_code=201)
def submit_air(
    payload: AirDataSubmit,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(*SUBMIT_ROLES)),
):
    _validate_submission_scope(payload, current_user, db)
    aqi = _compute_aqi(payload.pm25, payload.pm10,
                       so2=payload.so2, no2=payload.no2,
                       co=payload.co,  o3=payload.o3)
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
    _broadcast({
        "type": "ANOMALY_ALERT" if (entry.aqi or 0) > 200 else "SYSTEM_UPDATE",
        "message": f"New air reading at location {entry.location_id}: AQI={entry.aqi}",
        "timestamp": entry.recorded_at.isoformat() if entry.recorded_at else "",
        "data": {"data_type": "air", "location_id": entry.location_id,
                 "aqi": entry.aqi, "pm25": entry.pm25, "pm10": entry.pm10},
    })
    return entry


@router.post("/water", response_model=EnvironmentalDataOut, status_code=201)
def submit_water(
    payload: WaterDataSubmit,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(*SUBMIT_ROLES)),
):
    _validate_submission_scope(payload, current_user, db)
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
    _broadcast({
        "type": "SYSTEM_UPDATE",
        "message": f"New water reading at location {entry.location_id}",
        "timestamp": entry.recorded_at.isoformat() if entry.recorded_at else "",
        "data": {"data_type": "water", "location_id": entry.location_id,
                 "ph": entry.ph, "bod": entry.bod},
    })
    return entry


@router.post("/noise", response_model=EnvironmentalDataOut, status_code=201)
def submit_noise(
    payload: NoiseDataSubmit,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(*SUBMIT_ROLES)),
):
    _validate_submission_scope(payload, current_user, db)
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
    _broadcast({
        "type": "SYSTEM_UPDATE",
        "message": f"New noise reading at location {entry.location_id}",
        "timestamp": entry.recorded_at.isoformat() if entry.recorded_at else "",
        "data": {"data_type": "noise", "location_id": entry.location_id,
                 "decibel_level": entry.decibel_level},
    })
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
    current_user=Depends(get_current_user),
):
    q = db.query(EnvironmentalData)
    q = _apply_environmental_scope(q, current_user, db)
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
    current_user=Depends(get_current_user),
):
    """Returns the most recent reading of each type for a location."""
    results = []
    for dtype in ("air", "water", "noise"):
        q = (
            db.query(EnvironmentalData)
            .filter(
                EnvironmentalData.location_id == location_id,
                EnvironmentalData.data_type == dtype,
            )
        )
        q = _apply_environmental_scope(q, current_user, db)
        row = q.order_by(EnvironmentalData.recorded_at.desc()).first()
        if row:
            results.append(row)
    return results
