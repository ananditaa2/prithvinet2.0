from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional

from core.database import get_db
from core.security import get_current_user, require_roles
from models.industry import Industry
from schemas.industry import IndustryCreate, IndustryUpdate, IndustryOut

router = APIRouter(prefix="/industries", tags=["Industry Registry"])

WRITE_ROLES = ("admin", "regional_officer")


def _industry_scope_query(db: Session, current_user):
    q = db.query(Industry)

    if current_user.role == "industry_user":
        q = q.filter(Industry.contact_email == current_user.email)

    return q


def _get_scoped_industry_or_404(industry_id: int, db: Session, current_user):
    industry = _industry_scope_query(db, current_user).filter(Industry.id == industry_id).first()
    if not industry:
        raise HTTPException(404, "Industry not found.")
    return industry


@router.get("", response_model=list[IndustryOut])
def list_industries(
    region: Optional[str] = None,
    status: Optional[str] = None,
    industry_type: Optional[str] = None,
    skip: int = 0, limit: int = 100,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    q = _industry_scope_query(db, current_user)
    if region:
        q = q.filter(Industry.region.ilike(f"%{region}%"))
    if status:
        q = q.filter(Industry.status == status)
    if industry_type:
        q = q.filter(Industry.industry_type == industry_type)
    return q.offset(skip).limit(limit).all()


@router.get("/{industry_id}", response_model=IndustryOut)
def get_industry(
    industry_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    return _get_scoped_industry_or_404(industry_id, db, current_user)


@router.post("", response_model=IndustryOut, status_code=201)
def create_industry(
    payload: IndustryCreate,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(*WRITE_ROLES)),
):
    existing = db.query(Industry).filter(
        Industry.registration_number == payload.registration_number
    ).first()
    if existing:
        raise HTTPException(400, "Registration number already exists.")

    industry = Industry(**payload.model_dump(), registered_by=current_user.id)
    db.add(industry)
    db.commit()
    db.refresh(industry)
    return industry


@router.put("/{industry_id}", response_model=IndustryOut)
def update_industry(
    industry_id: int,
    payload: IndustryUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(*WRITE_ROLES, "industry_user")),
):
    industry = _get_scoped_industry_or_404(industry_id, db, current_user)

    if current_user.role == "industry_user":
        blocked_fields = {"status", "region"}
        updates = payload.model_dump(exclude_none=True)
        for field in blocked_fields:
            updates.pop(field, None)
    else:
        updates = payload.model_dump(exclude_none=True)

    for field, value in updates.items():
        setattr(industry, field, value)
    db.commit()
    db.refresh(industry)
    return industry


@router.delete("/{industry_id}", status_code=204)
def delete_industry(
    industry_id: int,
    db: Session = Depends(get_db),
    _=Depends(require_roles("admin")),
):
    industry = db.query(Industry).filter(Industry.id == industry_id).first()
    if not industry:
        raise HTTPException(404, "Industry not found.")
    db.delete(industry)
    db.commit()
