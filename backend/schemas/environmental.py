from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class AirDataSubmit(BaseModel):
    location_id: int
    industry_id: Optional[int] = None
    pm25: Optional[float] = None
    pm10: Optional[float] = None
    so2:  Optional[float] = None
    no2:  Optional[float] = None
    co:   Optional[float] = None
    o3:   Optional[float] = None
    notes: Optional[str] = None


class WaterDataSubmit(BaseModel):
    location_id: int
    industry_id: Optional[int] = None
    ph: Optional[float] = None
    bod: Optional[float] = None
    cod: Optional[float] = None
    dissolved_oxygen: Optional[float] = None
    turbidity: Optional[float] = None
    coliform: Optional[float] = None
    notes: Optional[str] = None


class NoiseDataSubmit(BaseModel):
    location_id: int
    industry_id: Optional[int] = None
    decibel_level: Optional[float] = None
    peak_decibel: Optional[float] = None
    noise_location_type: str = "general"
    notes: Optional[str] = None


class EnvironmentalDataOut(BaseModel):
    id: int
    data_type: str
    location_id: int
    industry_id: Optional[int]
    submitted_by: Optional[int]
    recorded_at: datetime
    # air
    pm25: Optional[float]
    pm10: Optional[float]
    so2: Optional[float]
    no2: Optional[float]
    co: Optional[float]
    o3: Optional[float]
    aqi: Optional[float]
    # water
    ph: Optional[float]
    bod: Optional[float]
    cod: Optional[float]
    dissolved_oxygen: Optional[float]
    turbidity: Optional[float]
    coliform: Optional[float]
    # noise
    decibel_level: Optional[float]
    peak_decibel: Optional[float]
    noise_location_type: Optional[str]
    source: str
    notes: Optional[str]

    model_config = {"from_attributes": True}
