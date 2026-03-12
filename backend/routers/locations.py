from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional

from core.database import get_db
from core.security import get_current_user, require_roles
from models.monitoring_location import MonitoringLocation
from models.industry import Industry
from schemas.industry import LocationCreate, LocationUpdate, LocationOut

router = APIRouter(prefix="/locations", tags=["Monitoring Locations"])


def _scoped_locations_query(db: Session, current_user):
    q = db.query(MonitoringLocation)

    if current_user.role == "industry_user":
        industry_ids = [
            industry.id
            for industry in db.query(Industry)
            .filter(Industry.contact_email == current_user.email)
            .all()
        ]
        if not industry_ids:
            return q.filter(MonitoringLocation.id == -1)
        q = q.filter(MonitoringLocation.industry_id.in_(industry_ids))

    return q


@router.get("", response_model=list[LocationOut])
def list_locations(
    region: Optional[str] = None,
    skip: int = 0, limit: int = 100,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    q = _scoped_locations_query(db, current_user)
    if region:
        q = q.filter(MonitoringLocation.region.ilike(f"%{region}%"))
    return q.offset(skip).limit(limit).all()


@router.get("/{loc_id}", response_model=LocationOut)
def get_location(
    loc_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    loc = (
        _scoped_locations_query(db, current_user)
        .filter(MonitoringLocation.id == loc_id)
        .first()
    )
    if not loc:
        raise HTTPException(404, "Location not found.")
    return loc


@router.post("", response_model=LocationOut, status_code=201)
def create_location(
    payload: LocationCreate,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles("admin", "regional_officer", "monitoring_team")),
):
    if current_user.role == "monitoring_team" and payload.assigned_team not in {None, "", current_user.email, current_user.name}:
        raise HTTPException(403, "Monitoring team can only create locations assigned to themselves.")

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
    current_user=Depends(require_roles("admin", "regional_officer", "monitoring_team")),
):
    loc = db.query(MonitoringLocation).filter(MonitoringLocation.id == loc_id).first()
    if not loc:
        raise HTTPException(404, "Location not found.")

    updates = payload.model_dump(exclude_none=True)

    if current_user.role == "monitoring_team":
        if loc.assigned_team not in {current_user.email, current_user.name}:
            raise HTTPException(403, "Monitoring team can only update locations assigned to themselves.")
        restricted_fields = {"region", "latitude", "longitude", "location_type", "industry_id", "assigned_team", "is_active"}
        attempted_restricted = [field for field in updates if field in restricted_fields]
        if attempted_restricted:
            raise HTTPException(
                403,
                f"Monitoring team cannot modify fields: {attempted_restricted}",
            )

    for field, value in updates.items():
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
