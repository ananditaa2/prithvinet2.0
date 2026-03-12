from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional

from core.database import get_db
from core.security import get_current_user, require_roles
from models.monitoring_location import MonitoringLocation
from schemas.industry import LocationCreate, LocationUpdate, LocationOut

router = APIRouter(prefix="/locations", tags=["Monitoring Locations"])


@router.get("", response_model=list[LocationOut])
def list_locations(
    region: Optional[str] = None,
    skip: int = 0, limit: int = 100,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    q = db.query(MonitoringLocation)
    if region:
        q = q.filter(MonitoringLocation.region.ilike(f"%{region}%"))
    return q.offset(skip).limit(limit).all()


@router.get("/{loc_id}", response_model=LocationOut)
def get_location(loc_id: int, db: Session = Depends(get_db), _=Depends(get_current_user)):
    loc = db.query(MonitoringLocation).filter(MonitoringLocation.id == loc_id).first()
    if not loc:
        raise HTTPException(404, "Location not found.")
    return loc


@router.post("", response_model=LocationOut, status_code=201)
def create_location(
    payload: LocationCreate,
    db: Session = Depends(get_db),
    _=Depends(require_roles("admin", "regional_officer", "monitoring_team")),
):
    loc = MonitoringLocation(**payload.model_dump())
    db.add(loc)
    db.commit()
    db.refresh(loc)
    return loc


@router.put("/{loc_id}", response_model=LocationOut)
def update_location(
    loc_id: int,
    payload: LocationUpdate,
    db: Session = Depends(get_db),
    _=Depends(require_roles("admin", "regional_officer")),
):
    loc = db.query(MonitoringLocation).filter(MonitoringLocation.id == loc_id).first()
    if not loc:
        raise HTTPException(404, "Location not found.")
    for field, value in payload.model_dump(exclude_none=True).items():
        setattr(loc, field, value)
    db.commit()
    db.refresh(loc)
    return loc


@router.delete("/{loc_id}", status_code=204)
def delete_location(
    loc_id: int,
    db: Session = Depends(get_db),
    _=Depends(require_roles("admin")),
):
    loc = db.query(MonitoringLocation).filter(MonitoringLocation.id == loc_id).first()
    if not loc:
        raise HTTPException(404, "Location not found.")
    db.delete(loc)
    db.commit()
