"""
Alert Service — checks submitted environmental data against thresholds
and creates Alert + Notification records automatically.
"""
import asyncio
from sqlalchemy.orm import Session
from models.alert import Alert, Notification
from models.user import User
from core.config import CPCB_LEGAL_LIMITS, AIR_SEVERITY_TIERS, WATER_THRESHOLDS, NOISE_THRESHOLDS
from datetime import datetime, timezone

_notification_broadcaster = None


def set_notification_broadcaster(broadcaster):
    global _notification_broadcaster
    _notification_broadcaster = broadcaster


def _serialize_notification(notification: Notification) -> dict:
    return {
        "id": notification.id,
        "user_id": notification.user_id,
        "alert_id": notification.alert_id,
        "title": notification.title,
        "message": notification.message,
        "notif_type": notification.notif_type,
        "is_read": notification.is_read,
        "created_at": notification.created_at.isoformat() if notification.created_at else None,
    }


def _emit_notification(notification: Notification) -> None:
    if not _notification_broadcaster:
        return

    try:
        loop = asyncio.get_running_loop()
        loop.create_task(
            _notification_broadcaster.broadcast_to_user(
                notification.user_id,
                {
                    "event": "notification",
                    "notification": _serialize_notification(notification),
                },
            )
        )
    except RuntimeError:
        # No running loop in this context; skip live broadcast safely.
        return


def _severity(value: float, thresholds: dict) -> str | None:
    """Return severity string or None if within safe limits.

    Handles two threshold key schemas:
    - Air tiers: {"warning": ..., "high": ..., "critical": ...}
    - Water/Noise: {"low": ..., "medium": ..., "high": ..., "critical": ...}
    """
    if value >= thresholds.get("critical", float("inf")):
        return "critical"
    if value >= thresholds.get("high", float("inf")):
        return "high"
    # "warning" key used by air tiers; "medium" used by water/noise thresholds
    medium_threshold = thresholds.get("warning") or thresholds.get("medium")
    if medium_threshold is not None and value >= medium_threshold:
        return "medium"
    # "low" key only exists in water/noise thresholds
    low_threshold = thresholds.get("low")
    if low_threshold is not None and value >= low_threshold:
        return "low"
    return None


def _create_alert(db: Session, data_id: int, location_id: int,
                  industry_id: int | None, alert_type: str,
                  pollutant: str, measured: float, threshold: float,
                  severity: str, message: str) -> Alert:
    alert = Alert(
        data_id=data_id,
        location_id=location_id,
        industry_id=industry_id,
        alert_type=alert_type,
        pollutant=pollutant,
        measured_value=measured,
        threshold_value=threshold,
        severity=severity,
        message=message,
        status="active",
    )
    db.add(alert)
    db.flush()   # get alert.id without committing

    # Notify all admins and regional officers
    notif_users = db.query(User).filter(
        User.role.in_(["admin", "regional_officer"]), User.is_active == True
    ).all()
    for user in notif_users:
        alert_notif = Notification(
            user_id=user.id,
            alert_id=alert.id,
            title=f"🚨 {severity.upper()} Alert: {pollutant} exceeded",
            message=message,
            notif_type="alert",
        )
        db.add(alert_notif)
        db.flush()
        _emit_notification(alert_notif)

        meeting_message = (
            f"Pollution limit breach detected for {pollutant} at location #{location_id}. "
            f"Please schedule a compliance meeting with the concerned stakeholders."
        )
        if industry_id:
            meeting_message += f" Industry reference: #{industry_id}."

        meeting_notif = Notification(
            user_id=user.id,
            alert_id=alert.id,
            title="📅 Meeting Required: Pollution limit exceeded",
            message=meeting_message,
            notif_type="meeting",
        )
        db.add(meeting_notif)
        db.flush()
        _emit_notification(meeting_notif)

    return alert


def check_and_trigger_alerts(db: Session, data) -> list[Alert]:
    """
    Inspect an EnvironmentalData record and create alerts for every
    pollutant that exceeds its threshold. Returns list of created Alert objects.
    """
    triggered = []
    
    # Resolve industry_id from location if not directly set on data
    industry_id = data.industry_id
    if not industry_id and data.location_id:
        from models.monitoring_location import MonitoringLocation
        loc = db.query(MonitoringLocation).filter(MonitoringLocation.id == data.location_id).first()
        if loc:
            industry_id = loc.industry_id

    # ── Air Checks ─────────────────────────────────────────────────────────────
    if data.data_type == "air":
        air_fields = ["pm25", "pm10", "so2", "no2", "co", "o3"]
        for field in air_fields:
            value = getattr(data, field, None)
            if value is None:
                continue
            
            # Step 1: Check against CPCB legal limit first
            legal_limit = CPCB_LEGAL_LIMITS.get(field)
            if not legal_limit:
                continue
            
            # Only trigger alert if value exceeds CPCB legal limit
            if value <= legal_limit:
                continue
            
            # Step 2: Determine severity using severity tiers
            sev_tiers = AIR_SEVERITY_TIERS.get(field)
            if sev_tiers:
                sev = _severity(value, sev_tiers)
            else:
                sev = "high"  # Default severity if no tiers defined
            
            if not sev:
                sev = "warning"  # Above legal limit but below severity tiers
            
            msg = (
                f"{field.upper()} level of {value} µg/m³ at location #{data.location_id} "
                f"exceeds CPCB legal limit ({legal_limit}). Severity: {sev}."
            )
            a = _create_alert(
                db, data.id, data.location_id, industry_id,
                "air", field, value, legal_limit, sev, msg
            )
            triggered.append(a)

    # ── Water Checks ───────────────────────────────────────────────────────────
    elif data.data_type == "water":
        water_range_fields = ["bod", "cod", "turbidity", "coliform"]
        for field in water_range_fields:
            value = getattr(data, field, None)
            if value is None:
                continue
            th = WATER_THRESHOLDS.get(field)
            if not th:
                continue
            sev = _severity(value, th)
            if sev:
                msg = (
                    f"{field.upper()} level of {value} at location #{data.location_id} "
                    f"exceeds {sev} threshold ({th[sev]})."
                )
                a = _create_alert(
                    db, data.id, data.location_id, industry_id,
                    "water", field, value, th[sev], sev, msg
                )
                triggered.append(a)

        # pH check (range-based)
        if data.ph is not None:
            if data.ph < WATER_THRESHOLDS["ph_low"] or data.ph > WATER_THRESHOLDS["ph_high"]:
                msg = (
                    f"pH level of {data.ph} at location #{data.location_id} "
                    f"is outside safe range ({WATER_THRESHOLDS['ph_low']}–{WATER_THRESHOLDS['ph_high']})."
                )
                a = _create_alert(
                    db, data.id, data.location_id, industry_id,
                    "water", "ph", data.ph, WATER_THRESHOLDS["ph_high"], "high", msg
                )
                triggered.append(a)

        # Dissolved oxygen (low is bad)
        if data.dissolved_oxygen is not None and data.dissolved_oxygen < WATER_THRESHOLDS["dissolved_oxygen"]:
            msg = (
                f"Dissolved oxygen of {data.dissolved_oxygen} mg/L at location #{data.location_id} "
                f"is below safe minimum ({WATER_THRESHOLDS['dissolved_oxygen']} mg/L)."
            )
            a = _create_alert(
                db, data.id, data.location_id, industry_id,
                "water", "dissolved_oxygen", data.dissolved_oxygen,
                WATER_THRESHOLDS["dissolved_oxygen"], "high", msg
            )
            triggered.append(a)

    # ── Noise Checks ───────────────────────────────────────────────────────────
    elif data.data_type == "noise":
        if data.decibel_level is not None:
            loc_type = data.noise_location_type or "residential"
            th = NOISE_THRESHOLDS.get(loc_type, NOISE_THRESHOLDS["residential"])
            sev = _severity(data.decibel_level, th)
            if sev:
                msg = (
                    f"Noise level of {data.decibel_level} dB at location #{data.location_id} "
                    f"({loc_type}) exceeds {sev} threshold ({th[sev]} dB)."
                )
                a = _create_alert(
                    db, data.id, data.location_id, industry_id,
                    "noise", "decibel_level", data.decibel_level, th[sev], sev, msg
                )
                triggered.append(a)

    # Update industry status if critical violations found
    if triggered and industry_id:
        from models.industry import Industry
        industry = db.query(Industry).filter(Industry.id == industry_id).first()
        if industry:
            critical_or_high = any(a.severity in ("critical", "high") for a in triggered)
            if critical_or_high:
                industry.status = "violating"

    return triggered
