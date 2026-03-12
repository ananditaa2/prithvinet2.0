from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional

from core.database import get_db
from core.security import get_current_user
from models.environmental_data import EnvironmentalData
from models.monitoring_location import MonitoringLocation
from models.alert import Alert

router = APIRouter(prefix="/heatmap", tags=["Geo Heatmap"])


def _severity_label(value: float | None, thresholds: dict) -> str:
    if value is None:
        return "unknown"
    if value >= thresholds.get("critical", float("inf")):
        return "critical"
    if value >= thresholds.get("high", float("inf")):
        return "high"
    if value >= thresholds.get("medium", float("inf")):
        return "medium"
    if value >= thresholds.get("low", float("inf")):
        return "low"
    return "safe"


@router.get("")
def get_heatmap(
    data_type: str = Query("air", description="air | water | noise"),
    pollutant: Optional[str] = Query(None, description="e.g. pm25, bod, decibel_level"),
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    """
    Returns heatmap-ready data: list of {lat, lng, value, severity, location_name}.
    For each active monitoring location, returns the most recent reading.
    """
    from core.config import AIR_THRESHOLDS, WATER_THRESHOLDS, NOISE_THRESHOLDS

    locations = db.query(MonitoringLocation).filter(MonitoringLocation.is_active == 1).all()
    points = []

    for loc in locations:
        row = (
            db.query(EnvironmentalData)
            .filter(
                EnvironmentalData.location_id == loc.id,
                EnvironmentalData.data_type == data_type,
            )
            .order_by(EnvironmentalData.recorded_at.desc())
            .first()
        )
        if not row:
            continue

        # Determine primary value for the heatmap
        if data_type == "air":
            field = pollutant or "aqi"
            value = getattr(row, field, None)
            th = AIR_THRESHOLDS.get(field, {"low": 30, "medium": 60, "high": 90, "critical": 120})
        elif data_type == "water":
            field = pollutant or "bod"
            value = getattr(row, field, None)
            th = WATER_THRESHOLDS.get(field, {"low": 15, "medium": 30, "high": 60, "critical": 100})
        else:  # noise
            field = "decibel_level"
            value = row.decibel_level
            loc_type = row.noise_location_type or "residential"
            th = NOISE_THRESHOLDS.get(loc_type, NOISE_THRESHOLDS["residential"])

        sev = _severity_label(value, th)

        points.append({
            "location_id": loc.id,
            "location_name": loc.name,
            "region": loc.region,
            "lat": loc.latitude,
            "lng": loc.longitude,
            "data_type": data_type,
            "pollutant": field,
            "value": value,
            "severity": sev,
            "recorded_at": row.recorded_at.isoformat() if row.recorded_at else None,
        })

    return {"data_type": data_type, "points": points, "count": len(points)}
