"""
Alert Service — checks submitted environmental data against thresholds
and creates Alert + Notification records automatically.
"""
from sqlalchemy.orm import Session
from models.alert import Alert, Notification
from models.user import User
from core.config import AIR_THRESHOLDS, WATER_THRESHOLDS, NOISE_THRESHOLDS
from datetime import datetime, timezone


def _severity(value: float, thresholds: dict) -> str | None:
    """Return severity string or None if within safe limits."""
    if value >= thresholds["critical"]:
        return "critical"
    if value >= thresholds["high"]:
        return "high"
    if value >= thresholds["medium"]:
        return "medium"
    if value >= thresholds["low"]:
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
        notif = Notification(
            user_id=user.id,
            alert_id=alert.id,
            title=f"🚨 {severity.upper()} Alert: {pollutant} exceeded",
            message=message,
            notif_type="alert",
        )
        db.add(notif)
    return alert


def check_and_trigger_alerts(db: Session, data) -> list[Alert]:
    """
    Inspect an EnvironmentalData record and create alerts for every
    pollutant that exceeds its threshold. Returns list of created Alert objects.
    """
    triggered = []

    # ── Air Checks ─────────────────────────────────────────────────────────────
    if data.data_type == "air":
        air_fields = ["pm25", "pm10", "so2", "no2", "co", "o3"]
        for field in air_fields:
            value = getattr(data, field, None)
            if value is None:
                continue
            th = AIR_THRESHOLDS.get(field)
            if not th:
                continue
            sev = _severity(value, th)
            if sev:
                msg = (
                    f"{field.upper()} level of {value} µg/m³ at location #{data.location_id} "
                    f"exceeds {sev} threshold ({th[sev]})."
                )
                a = _create_alert(
                    db, data.id, data.location_id, data.industry_id,
                    "air", field, value, th[sev], sev, msg
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
                    db, data.id, data.location_id, data.industry_id,
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
                    db, data.id, data.location_id, data.industry_id,
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
                db, data.id, data.location_id, data.industry_id,
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
                    db, data.id, data.location_id, data.industry_id,
                    "noise", "decibel_level", data.decibel_level, th[sev], sev, msg
                )
                triggered.append(a)

    # Update industry status if critical violations found
    if triggered and data.industry_id:
        from models.industry import Industry
        industry = db.query(Industry).filter(Industry.id == data.industry_id).first()
        if industry:
            critical_or_high = any(a.severity in ("critical", "high") for a in triggered)
            if critical_or_high:
                industry.status = "violating"

    return triggered
