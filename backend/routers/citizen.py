"""
Citizen Portal — public, no-auth endpoints for read-only pollution data.
"""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional

from core.database import get_db
from models.environmental_data import EnvironmentalData
from models.monitoring_location import MonitoringLocation
from models.alert import Alert
from models.industry import Industry

router = APIRouter(prefix="/public", tags=["Citizen Portal (Public)"])


@router.get("/air-quality")
def public_air_quality(
    region: Optional[str] = None,
    db: Session = Depends(get_db),
):
    """Latest air quality reading per monitoring location (public, no auth)."""
    locations = db.query(MonitoringLocation).filter(MonitoringLocation.is_active == 1)
    if region:
        locations = locations.filter(MonitoringLocation.region.ilike(f"%{region}%"))
    locations = locations.all()

    results = []
    for loc in locations:
        row = (
            db.query(EnvironmentalData)
            .filter(EnvironmentalData.location_id == loc.id,
                    EnvironmentalData.data_type == "air")
            .order_by(EnvironmentalData.recorded_at.desc())
            .first()
        )
        if row:
            results.append({
                "location": {"id": loc.id, "name": loc.name, "region": loc.region,
                             "lat": loc.latitude, "lng": loc.longitude},
                "aqi": row.aqi,
                "pm25": row.pm25,
                "pm10": row.pm10,
                "source": row.source,
                "notes": row.notes,
                "recorded_at": row.recorded_at.isoformat() if row.recorded_at else None,
            })
    return {"count": len(results), "data": results}


@router.get("/water-quality")
def public_water_quality(
    region: Optional[str] = None,
    db: Session = Depends(get_db),
):
    """Latest water quality reading per monitoring location (public, no auth)."""
    locations = db.query(MonitoringLocation).filter(MonitoringLocation.is_active == 1)
    if region:
        locations = locations.filter(MonitoringLocation.region.ilike(f"%{region}%"))
    locations = locations.all()

    results = []
    for loc in locations:
        row = (
            db.query(EnvironmentalData)
            .filter(EnvironmentalData.location_id == loc.id,
                    EnvironmentalData.data_type == "water")
            .order_by(EnvironmentalData.recorded_at.desc())
            .first()
        )
        if row:
            results.append({
                "location": {"id": loc.id, "name": loc.name, "region": loc.region,
                             "lat": loc.latitude, "lng": loc.longitude},
                "ph": row.ph,
                "bod": row.bod,
                "dissolved_oxygen": row.dissolved_oxygen,
                "recorded_at": row.recorded_at.isoformat() if row.recorded_at else None,
            })
    return {"count": len(results), "data": results}


@router.get("/alerts")
def public_alerts(
    severity: Optional[str] = None,
    db: Session = Depends(get_db),
):
    """Active public alerts — citizens can see current pollution warnings."""
    q = db.query(Alert).filter(Alert.status == "active")
    if severity:
        q = q.filter(Alert.severity == severity)
    alerts = q.order_by(Alert.created_at.desc()).limit(50).all()
    return {
        "count": len(alerts),
        "alerts": [
            {
                "id": a.id,
                "alert_type": a.alert_type,
                "pollutant": a.pollutant,
                "severity": a.severity,
                "message": a.message,
                "location_id": a.location_id,
                "created_at": a.created_at.isoformat() if a.created_at else None,
            }
            for a in alerts
        ],
    }


@router.get("/industries")
def public_industries(
    region: Optional[str] = None,
    db: Session = Depends(get_db),
):
    """Public list of registered industries."""
    q = db.query(Industry)
    if region:
        q = q.filter(Industry.region.ilike(f"%{region}%"))
    industries = q.order_by(Industry.name).all()
    return {
        "count": len(industries),
        "industries": [
            {
                "id": i.id,
                "name": i.name,
                "type": i.industry_type,
                "region": i.region,
                "status": i.status,
                "lat": i.latitude,
                "lng": i.longitude,
            }
            for i in industries
        ],
    }
