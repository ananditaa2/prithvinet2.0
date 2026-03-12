from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional

from core.database import get_db
from core.security import get_current_user
from services import ai_service

router = APIRouter(prefix="/ai", tags=["AI & Predictions"])


class SimulationRequest(BaseModel):
    region: str
    industry: str
    pollutant: str
    reduction_percentage: float
    current_risk_score: float


class PredictionRequest(BaseModel):
    location_id: int
    hours: int = 24  # 24 | 48 | 72


class CopilotRequest(BaseModel):
    question: str
    context: Optional[str] = ""


@router.post("/simulate-risk")
async def simulate_risk(
    request: SimulationRequest,
    _=Depends(get_current_user),
):
    return await ai_service.simulate_risk(
        request.region, request.industry, request.pollutant,
        request.reduction_percentage, request.current_risk_score,
    )


@router.post("/predict")
async def predict(
    request: PredictionRequest,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    if request.hours not in (24, 48, 72):
        raise HTTPException(400, "hours must be 24, 48, or 72")

    from models.environmental_data import EnvironmentalData
    rows = (
        db.query(EnvironmentalData)
        .filter(EnvironmentalData.location_id == request.location_id)
        .order_by(EnvironmentalData.recorded_at.asc())
        .limit(168)  # ~7 days of hourly data
        .all()
    )
    recent = [
        {
            "pm25": r.pm25, "pm10": r.pm10, "so2": r.so2,
            "no2": r.no2, "co": r.co, "o3": r.o3, "aqi": r.aqi,
            "bod": r.bod, "cod": r.cod,
            "decibel_level": r.decibel_level,
        }
        for r in rows
    ]
    return await ai_service.predict_pollution(request.location_id, request.hours, recent)


@router.post("/copilot")
async def copilot(
    request: CopilotRequest,
    _=Depends(get_current_user),
):
    answer = await ai_service.answer_copilot(request.question, request.context or "")
    return {"question": request.question, "answer": answer}
