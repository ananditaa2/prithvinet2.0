from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from typing import Optional
from datetime import datetime, timezone, timedelta

from core.database import get_db
from core.security import get_current_user, require_roles
from models.alert import Alert, Notification
from models.industry import Industry
from models.monitoring_location import MonitoringLocation
from models.environmental_data import EnvironmentalData
from schemas.alert import AlertOut, NotificationOut

router = APIRouter(tags=["Alerts & Compliance"])

# CPCB law references for different pollutant types (EPA 1986, CPCB National AQI)
CPCB_REFERENCES = {
    "air": "Environment (Protection) Act 1986 §5 & §15 | CPCB National AQI Technical Manual 2014",
    "pm25": "CPCB PM2.5 limit: 60 µg/m³ (24h avg) — Industrial",
    "pm10": "CPCB PM10 limit: 100 µg/m³ (24h avg) — Industrial",
    "water": "Water (Prevention & Control of Pollution) Act 1974 | CPCB Effluent Standards",
    "ph": "CPCB pH range: 6.5–8.5 for discharge",
    "bod": "CPCB BOD limit: 30 mg/L (general effluent)",
    "noise": "Noise Pollution (Regulation & Control) Rules 2000",
}


# ─────────────────────────────────────────────────────────────────────────────
# ALERTS
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/alerts", response_model=list[AlertOut])
def list_alerts(
    status: Optional[str] = None,
    severity: Optional[str] = None,
    alert_type: Optional[str] = None,
    industry_id: Optional[int] = None,
    location_id: Optional[int] = None,
    skip: int = 0, limit: int = 100,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    from sqlalchemy.orm import joinedload
    q = db.query(Alert).options(
        joinedload(Alert.location),
        joinedload(Alert.industry)
    )
    if status:
        q = q.filter(Alert.status == status)
    if severity:
        q = q.filter(Alert.severity == severity)
    if alert_type:
        q = q.filter(Alert.alert_type == alert_type)
    if industry_id:
        q = q.filter(Alert.industry_id == industry_id)
    if location_id:
        q = q.filter(Alert.location_id == location_id)
    alerts = q.order_by(Alert.created_at.desc()).offset(skip).limit(limit).all()
    
    # Build response with joined names
    result = []
    for a in alerts:
        alert_dict = {
            "id": a.id,
            "data_id": a.data_id,
            "location_id": a.location_id,
            "location_name": a.location.name if a.location else None,
            "industry_id": a.industry_id,
            "industry_name": a.industry.name if a.industry else None,
            "alert_type": a.alert_type,
            "pollutant": a.pollutant,
            "measured_value": a.measured_value,
            "threshold_value": a.threshold_value,
            "severity": a.severity,
            "message": a.message,
            "status": a.status,
            "resolved_by": a.resolved_by,
            "resolved_at": a.resolved_at,
            "created_at": a.created_at,
        }
        result.append(AlertOut.model_validate(alert_dict))
    return result


@router.get("/alerts/{alert_id}", response_model=AlertOut)
def get_alert(alert_id: int, db: Session = Depends(get_db), _=Depends(get_current_user)):
    a = db.query(Alert).filter(Alert.id == alert_id).first()
    if not a:
        raise HTTPException(404, "Alert not found.")
    return a


@router.patch("/alerts/{alert_id}/resolve", response_model=AlertOut)
def resolve_alert(
    alert_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles("admin", "regional_officer", "monitoring_team")),
):
    a = db.query(Alert).filter(Alert.id == alert_id).first()
    if not a:
        raise HTTPException(404, "Alert not found.")
    a.status = "resolved"
    a.resolved_by = current_user.id
    a.resolved_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(a)
    return a


@router.patch("/alerts/{alert_id}/acknowledge", response_model=AlertOut)
def acknowledge_alert(
    alert_id: int,
    db: Session = Depends(get_db),
    _=Depends(require_roles("admin", "regional_officer", "monitoring_team")),
):
    a = db.query(Alert).filter(Alert.id == alert_id).first()
    if not a:
        raise HTTPException(404, "Alert not found.")
    a.status = "acknowledged"
    db.commit()
    db.refresh(a)
    return a


# ─────────────────────────────────────────────────────────────────────────────
# COMPLIANCE
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/compliance")
def get_violating_industries(
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    from models.monitoring_location import MonitoringLocation
    violating = db.query(Industry).filter(Industry.status == "violating").all()
    
    result = []
    for i in violating:
        # Get all location IDs belonging to this industry
        locations = db.query(MonitoringLocation).filter(
            MonitoringLocation.industry_id == i.id
        ).all()
        location_ids = [loc.id for loc in locations]
        
        # Also get locations in same region (for JSON-imported data without industry_id)
        region_location_ids = [
            loc.id for loc in 
            db.query(MonitoringLocation).filter(
                MonitoringLocation.region.ilike(f"%{i.region}%"),
                MonitoringLocation.industry_id.is_(None)
            ).all()
        ]
        
        all_location_ids = list(set(location_ids + region_location_ids))
        
        # Count alerts directly linked to industry
        direct_count = db.query(Alert).filter(
            Alert.industry_id == i.id,
            Alert.status == "active"
        ).count()
        
        # Count alerts via locations
        via_location_count = 0
        if all_location_ids:
            via_location_count = db.query(Alert).filter(
                Alert.location_id.in_(all_location_ids),
                Alert.status == "active"
            ).count()
        
        total_alerts = max(direct_count, via_location_count) if (direct_count or via_location_count) else 0
        
        result.append({
            "id": i.id,
            "name": i.name,
            "region": i.region,
            "type": i.industry_type,
            "registration_number": i.registration_number,
            "active_alerts": total_alerts,
        })
    
    return {
        "count": len(violating),
        "violating_industries": result,
    }


@router.get("/compliance/{industry_id}")
def industry_compliance_history(
    industry_id: int,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    industry = db.query(Industry).filter(Industry.id == industry_id).first()
    if not industry:
        raise HTTPException(404, "Industry not found.")

    alerts = (
        db.query(Alert)
        .filter(Alert.industry_id == industry_id)
        .order_by(Alert.created_at.desc())
        .all()
    )
    return {
        "industry_id": industry_id,
        "name": industry.name,
        "current_status": industry.status,
        "total_alerts": len(alerts),
        "active_alerts": sum(1 for a in alerts if a.status == "active"),
        "resolved_alerts": sum(1 for a in alerts if a.status == "resolved"),
        "alerts": [AlertOut.model_validate(a) for a in alerts],
    }


# ─────────────────────────────────────────────────────────────────────────────
# INSPECTION PRIORITY & CASES TO ACT (Regulator workflow)
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/inspection-priority")
def inspection_priority(
    region: Optional[str] = None,
    limit: int = 10,
    db: Session = Depends(get_db),
    _=Depends(require_roles("admin", "regional_officer")),
):
    """
    Top N industries/locations to inspect this week — combines active alerts,
    severity weight, and recent violation count. Prioritizes critical/high.
    """
    subq = (
        db.query(Alert.industry_id, func.count(Alert.id).label("cnt"))
        .filter(Alert.status == "active", Alert.industry_id.isnot(None))
        .group_by(Alert.industry_id)
    ).subquery()

    q = (
        db.query(Industry, func.coalesce(subq.c.cnt, 0).label("active_count"))
        .outerjoin(subq, Industry.id == subq.c.industry_id)
        .filter(Industry.status.in_(["violating", "active"]))
    )
    if region:
        q = q.filter(Industry.region.ilike(f"%{region}%"))
    industries = q.order_by(desc(func.coalesce(subq.c.cnt, 0)), Industry.name).limit(limit * 2).all()

    # Build priority list with scores
    priority = []
    severity_weight = {"critical": 4, "high": 3, "medium": 2, "low": 1}
    for ind, cnt in industries:
        if ind is None:
            continue
        active_alerts = (
            db.query(Alert)
            .filter(Alert.industry_id == ind.id, Alert.status == "active")
            .all()
        )
        score = sum(severity_weight.get(a.severity, 1) for a in active_alerts)
        score += (cnt or 0) * 2
        priority.append({
            "industry": {
                "id": ind.id,
                "name": ind.name,
                "region": ind.region,
                "type": ind.industry_type,
                "registration_number": ind.registration_number,
            },
            "active_alerts": len(active_alerts),
            "priority_score": score,
            "recommended_action": "Immediate inspection" if score >= 6 else "Schedule within 7 days",
        })

    priority.sort(key=lambda x: -x["priority_score"])
    return {"items": priority[:limit], "generated_at": datetime.now(timezone.utc).isoformat()}


@router.get("/cases-to-act")
def cases_to_act(
    region: Optional[str] = None,
    db: Session = Depends(get_db),
    _=Depends(require_roles("admin", "regional_officer")),
):
    """
    Cases requiring regulatory action this week — with draft show-cause templates.
    """
    q = (
        db.query(Alert, Industry)
        .join(Industry, Alert.industry_id == Industry.id)
        .filter(Alert.status == "active", Alert.industry_id.isnot(None), Alert.severity.in_(["critical", "high"]))
    )
    if region:
        q = q.filter(Industry.region.ilike(f"%{region}%"))
    rows = q.order_by(Alert.created_at.desc()).limit(50).all()

    cases = []
    seen = set()
    for a, ind in rows:
        key = (a.industry_id, a.pollutant, a.alert_type)
        if key in seen:
            continue
        seen.add(key)
        law_ref = CPCB_REFERENCES.get(a.pollutant or a.alert_type, CPCB_REFERENCES.get(a.alert_type, "EPA 1986"))
        draft = (
            f"SHOW-CAUSE NOTICE (DRAFT)\n"
            f"To: {ind.name}, Reg. No. {ind.registration_number}\n"
            f"Re: Violation of {law_ref}\n"
            f"Location ID: {a.location_id} | Pollutant: {a.pollutant or 'N/A'}\n"
            f"Measured: {a.measured_value} | Threshold: {a.threshold_value}\n"
            f"Please explain within 15 days why action should not be taken under EPA §15.\n"
            f"Reference: Alert #{a.id} | {a.created_at.date() if a.created_at else 'N/A'}"
        )
        cases.append({
            "alert_id": a.id,
            "industry": {"id": ind.id, "name": ind.name, "region": ind.region, "registration_number": ind.registration_number},
            "severity": a.severity,
            "alert_type": a.alert_type,
            "pollutant": a.pollutant,
            "message": a.message,
            "measured_value": a.measured_value,
            "threshold_value": a.threshold_value,
            "cpcb_reference": law_ref,
            "draft_show_cause": draft,
            "created_at": a.created_at.isoformat() if a.created_at else None,
        })

    return {"cases": cases, "count": len(cases)}


@router.get("/alerts/pollution-zones")
def get_pollution_zones(
    limit: int = 10,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    """
    Returns the top high-pollution zones based on real active alerts +
    latest environmental readings. Used by the real-time crisis alert panel.
    """
    # Get active alerts with location data, ordered by severity
    severity_order = {"critical": 0, "high": 1, "medium": 2, "low": 3}

    from sqlalchemy.orm import joinedload
    alerts_q = (
        db.query(Alert)
        .options(joinedload(Alert.location), joinedload(Alert.industry))
        .filter(Alert.status == "active", Alert.location_id.isnot(None))
        .order_by(Alert.created_at.desc())
        .limit(limit * 3)
        .all()
    )

    seen_locations = set()
    zones = []
    for a in alerts_q:
        loc_id = a.location_id
        if loc_id in seen_locations:
            continue
        seen_locations.add(loc_id)

        # Get latest environmental reading for this location
        latest = (
            db.query(EnvironmentalData)
            .filter(EnvironmentalData.location_id == loc_id)
            .order_by(EnvironmentalData.recorded_at.desc())
            .first()
        )
        aqi = latest.aqi if latest and latest.aqi else None

        zones.append({
            "alert_id": a.id,
            "location_id": loc_id,
            "location_name": a.location.name if a.location else f"Location #{loc_id}",
            "region": a.location.region if a.location else "Unknown",
            "industry_name": a.industry.name if a.industry else None,
            "pollutant": a.pollutant,
            "measured_value": a.measured_value,
            "threshold_value": a.threshold_value,
            "severity": a.severity,
            "message": a.message,
            "aqi": aqi,
            "created_at": a.created_at.isoformat() if a.created_at else None,
        })

        if len(zones) >= limit:
            break

    # Sort by severity then by AQI descending
    zones.sort(key=lambda z: (severity_order.get(z["severity"], 9), -(z["aqi"] or 0)))
    return {
        "zones": zones,
        "count": len(zones),
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }



# ─────────────────────────────────────────────────────────────────────────────
# NOTIFICATIONS
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/notifications", response_model=list[NotificationOut])
def my_notifications(
    unread_only: bool = False,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    q = db.query(Notification).filter(Notification.user_id == current_user.id)
    if unread_only:
        q = q.filter(Notification.is_read == False)
    return q.order_by(Notification.created_at.desc()).limit(50).all()


@router.patch("/notifications/{notif_id}/read", response_model=NotificationOut)
def mark_read(
    notif_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    n = db.query(Notification).filter(
        Notification.id == notif_id,
        Notification.user_id == current_user.id
    ).first()
    if not n:
        raise HTTPException(404, "Notification not found.")
    n.is_read = True
    db.commit()
    db.refresh(n)
    return n
