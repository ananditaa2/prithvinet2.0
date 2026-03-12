from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional
from datetime import datetime, timezone

from core.database import get_db
from core.security import get_current_user, require_roles
from models.alert import Alert, Notification
from models.industry import Industry
from schemas.alert import AlertOut, NotificationOut

router = APIRouter(tags=["Alerts & Compliance"])


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
    q = db.query(Alert)
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
    return q.order_by(Alert.created_at.desc()).offset(skip).limit(limit).all()


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
    violating = db.query(Industry).filter(Industry.status == "violating").all()
    return {
        "count": len(violating),
        "violating_industries": [
            {
                "id": i.id, "name": i.name,
                "region": i.region, "type": i.industry_type,
                "registration_number": i.registration_number,
                "active_alerts": db.query(Alert).filter(
                    Alert.industry_id == i.id, Alert.status == "active"
                ).count(),
            }
            for i in violating
        ],
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
