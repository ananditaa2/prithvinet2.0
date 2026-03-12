from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, extract
from sqlalchemy.orm import Session
from typing import Optional

from core.database import get_db
from core.security import get_current_user
from models.environmental_data import EnvironmentalData
from models.alert import Alert
from models.industry import Industry

router = APIRouter(prefix="/reports", tags=["Reports"])


@router.get("/monthly")
def monthly_report(
    year: int = Query(..., description="Year e.g. 2024"),
    month: int = Query(..., ge=1, le=12, description="Month 1–12"),
    region: Optional[str] = None,
    data_type: Optional[str] = None,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    q = db.query(EnvironmentalData).filter(
        extract("year", EnvironmentalData.recorded_at) == year,
        extract("month", EnvironmentalData.recorded_at) == month,
    )
    if region:
        from models.monitoring_location import MonitoringLocation
        loc_ids = [
            r.id for r in db.query(MonitoringLocation)
            .filter(MonitoringLocation.region.ilike(f"%{region}%")).all()
        ]
        q = q.filter(EnvironmentalData.location_id.in_(loc_ids))
    if data_type:
        q = q.filter(EnvironmentalData.data_type == data_type)

    rows = q.all()
    air = [r for r in rows if r.data_type == "air"]
    water = [r for r in rows if r.data_type == "water"]
    noise = [r for r in rows if r.data_type == "noise"]

    def avg(lst, field):
        vals = [getattr(r, field) for r in lst if getattr(r, field) is not None]
        return round(sum(vals) / len(vals), 2) if vals else None

    alerts_count = db.query(Alert).filter(
        extract("year", Alert.created_at) == year,
        extract("month", Alert.created_at) == month,
    ).count()

    return {
        "period": f"{year}-{month:02d}",
        "region": region or "all",
        "total_readings": len(rows),
        "alerts_triggered": alerts_count,
        "air_quality": {
            "readings": len(air),
            "avg_pm25": avg(air, "pm25"),
            "avg_pm10": avg(air, "pm10"),
            "avg_aqi":  avg(air, "aqi"),
            "avg_so2":  avg(air, "so2"),
            "avg_no2":  avg(air, "no2"),
        },
        "water_quality": {
            "readings": len(water),
            "avg_ph":   avg(water, "ph"),
            "avg_bod":  avg(water, "bod"),
            "avg_cod":  avg(water, "cod"),
            "avg_do":   avg(water, "dissolved_oxygen"),
        },
        "noise": {
            "readings": len(noise),
            "avg_decibel": avg(noise, "decibel_level"),
            "avg_peak_decibel": avg(noise, "peak_decibel"),
        },
    }


@router.get("/yearly")
def yearly_report(
    year: int = Query(..., description="Year e.g. 2024"),
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    rows = db.query(EnvironmentalData).filter(
        extract("year", EnvironmentalData.recorded_at) == year
    ).all()
    air = [r for r in rows if r.data_type == "air"]
    water = [r for r in rows if r.data_type == "water"]
    noise = [r for r in rows if r.data_type == "noise"]

    def avg(lst, field):
        vals = [getattr(r, field) for r in lst if getattr(r, field) is not None]
        return round(sum(vals) / len(vals), 2) if vals else None

    violations = db.query(Industry).filter(Industry.status == "violating").count()
    alerts = db.query(Alert).filter(
        extract("year", Alert.created_at) == year
    ).count()
    critical = db.query(Alert).filter(
        extract("year", Alert.created_at) == year,
        Alert.severity == "critical"
    ).count()

    return {
        "year": year,
        "total_readings": len(rows),
        "total_alerts": alerts,
        "critical_alerts": critical,
        "industries_in_violation": violations,
        "air_quality": {
            "readings": len(air),
            "avg_pm25": avg(air, "pm25"),
            "avg_pm10": avg(air, "pm10"),
            "avg_aqi":  avg(air, "aqi"),
        },
        "water_quality": {
            "readings": len(water),
            "avg_ph":   avg(water, "ph"),
            "avg_bod":  avg(water, "bod"),
        },
        "noise": {
            "readings": len(noise),
            "avg_decibel": avg(noise, "decibel_level"),
        },
    }


@router.get("/industry/{industry_id}")
def industry_report(
    industry_id: int,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    industry = db.query(Industry).filter(Industry.id == industry_id).first()
    if not industry:
        from fastapi import HTTPException
        raise HTTPException(404, "Industry not found.")

    data = db.query(EnvironmentalData).filter(
        EnvironmentalData.industry_id == industry_id
    ).order_by(EnvironmentalData.recorded_at.desc()).all()

    alerts = db.query(Alert).filter(
        Alert.industry_id == industry_id
    ).order_by(Alert.created_at.desc()).all()

    def avg(lst, field):
        vals = [getattr(r, field) for r in lst if getattr(r, field) is not None]
        return round(sum(vals) / len(vals), 2) if vals else None

    air = [r for r in data if r.data_type == "air"]
    water = [r for r in data if r.data_type == "water"]
    noise = [r for r in data if r.data_type == "noise"]

    return {
        "industry": {
            "id": industry.id,
            "name": industry.name,
            "registration_number": industry.registration_number,
            "status": industry.status,
            "region": industry.region,
        },
        "total_readings": len(data),
        "total_alerts": len(alerts),
        "alerts_by_severity": {
            "critical": sum(1 for a in alerts if a.severity == "critical"),
            "high":     sum(1 for a in alerts if a.severity == "high"),
            "medium":   sum(1 for a in alerts if a.severity == "medium"),
            "low":      sum(1 for a in alerts if a.severity == "low"),
        },
        "air_averages": {
            "pm25": avg(air, "pm25"),
            "pm10": avg(air, "pm10"),
            "aqi":  avg(air, "aqi"),
        },
        "water_averages": {
            "ph":  avg(water, "ph"),
            "bod": avg(water, "bod"),
            "cod": avg(water, "cod"),
        },
        "noise_averages": {
            "decibel_level": avg(noise, "decibel_level"),
        },
    }
