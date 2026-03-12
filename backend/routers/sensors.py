"""
IoT Sensor Integration Router
- POST /sensors/ingest  — accept sensor payloads (auto-routes to correct data type)
- GET  /sensors/latest  — latest reading per sensor
"""
import random
import asyncio
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone

from core.database import get_db, SessionLocal
from core.security import get_current_user, require_roles
from models.environmental_data import EnvironmentalData
from services.alert_service import check_and_trigger_alerts

router = APIRouter(prefix="/sensors", tags=["IoT Sensors"])


class SensorPayload(BaseModel):
    sensor_id: str
    location_id: int
    data_type: str          # air | water | noise
    industry_id: Optional[int] = None
    # air
    pm25: Optional[float] = None
    pm10: Optional[float] = None
    so2:  Optional[float] = None
    no2:  Optional[float] = None
    co:   Optional[float] = None
    o3:   Optional[float] = None
    # water
    ph:               Optional[float] = None
    bod:              Optional[float] = None
    cod:              Optional[float] = None
    dissolved_oxygen: Optional[float] = None
    turbidity:        Optional[float] = None
    coliform:         Optional[float] = None
    # noise
    decibel_level:       Optional[float] = None
    peak_decibel:        Optional[float] = None
    noise_location_type: Optional[str] = None


@router.post("/ingest", status_code=201)
def ingest_sensor(
    payload: SensorPayload,
    db: Session = Depends(get_db),
    _=Depends(require_roles("admin", "monitoring_team")),
):
    if payload.data_type not in ("air", "water", "noise"):
        raise HTTPException(400, "data_type must be air, water, or noise")

    from routers.environmental import _compute_aqi
    aqi = _compute_aqi(payload.pm25, payload.pm10) if payload.data_type == "air" else None

    entry = EnvironmentalData(
        data_type=payload.data_type,
        location_id=payload.location_id,
        industry_id=payload.industry_id,
        source=f"sensor:{payload.sensor_id}",
        aqi=aqi,
        pm25=payload.pm25, pm10=payload.pm10, so2=payload.so2,
        no2=payload.no2, co=payload.co, o3=payload.o3,
        ph=payload.ph, bod=payload.bod, cod=payload.cod,
        dissolved_oxygen=payload.dissolved_oxygen,
        turbidity=payload.turbidity, coliform=payload.coliform,
        decibel_level=payload.decibel_level,
        peak_decibel=payload.peak_decibel,
        noise_location_type=payload.noise_location_type,
    )
    db.add(entry)
    db.flush()
    alerts = check_and_trigger_alerts(db, entry)
    db.commit()
    db.refresh(entry)
    return {
        "message": "Sensor data ingested successfully.",
        "data_id": entry.id,
        "alerts_triggered": len(alerts),
    }


@router.get("/latest")
def latest_sensor_readings(
    location_id: Optional[int] = None,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    """Returns the latest sensor reading from each data type and location."""
    results = []
    for dtype in ("air", "water", "noise"):
        q = db.query(EnvironmentalData).filter(
            EnvironmentalData.source.like("sensor:%"),
            EnvironmentalData.data_type == dtype,
        )
        if location_id:
            q = q.filter(EnvironmentalData.location_id == location_id)
        row = q.order_by(EnvironmentalData.recorded_at.desc()).first()
        if row:
            results.append({
                "data_type": dtype,
                "location_id": row.location_id,
                "source": row.source,
                "recorded_at": row.recorded_at.isoformat(),
                "values": {
                    "pm25": row.pm25, "pm10": row.pm10, "aqi": row.aqi,
                    "ph": row.ph, "bod": row.bod,
                    "decibel_level": row.decibel_level,
                },
            })
    return results


async def _simulate_stream():
    """SSE generator: emits a simulated sensor reading every 3 seconds."""
    sensor_types = ["air", "water", "noise"]
    while True:
        dtype = random.choice(sensor_types)
        if dtype == "air":
            data = {"data_type": "air", "pm25": round(random.uniform(10, 200), 1),
                    "pm10": round(random.uniform(20, 300), 1),
                    "aqi": round(random.uniform(30, 400), 1)}
        elif dtype == "water":
            data = {"data_type": "water", "ph": round(random.uniform(5.5, 9.5), 2),
                    "bod": round(random.uniform(5, 150), 1),
                    "dissolved_oxygen": round(random.uniform(1, 10), 1)}
        else:
            data = {"data_type": "noise",
                    "decibel_level": round(random.uniform(40, 120), 1)}

        import json
        data["timestamp"] = datetime.now(timezone.utc).isoformat()
        yield f"data: {json.dumps(data)}\n\n"
        await asyncio.sleep(3)


@router.get("/stream")
async def sensor_stream(_=Depends(get_current_user)):
    """Server-Sent Events stream of simulated sensor readings."""
    return StreamingResponse(
        _simulate_stream(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
