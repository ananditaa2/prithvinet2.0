from datetime import datetime, timedelta, timezone
from typing import Optional, List

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session

from core.config import SECRET_KEY, ALGORITHM, ACCESS_TOKEN_EXPIRE_HOURS
from core.database import get_db
from models.industry import Industry
from models.monitoring_location import MonitoringLocation

# ─── Password Hashing ──────────────────────────────────────────────────────────
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_password(password: str) -> str:
    # BCrypt limits passwords to 72 bytes. Truncate safely.
    return pwd_context.hash(password[:72])

def verify_password(plain: str, hashed: str) -> bool:
    pw_bytes = plain.encode('utf-8')[:72]
    return pwd_context.verify(pw_bytes.decode('utf-8', 'ignore'), hashed)

# ─── JWT ───────────────────────────────────────────────────────────────────────
def create_access_token(data: dict) -> str:
    payload = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(hours=ACCESS_TOKEN_EXPIRE_HOURS)
    payload.update({"exp": expire})
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)

def decode_token(token: str) -> dict:
    return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])

# ─── Auth Dependencies ─────────────────────────────────────────────────────────
bearer_scheme = HTTPBearer()

def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: Session = Depends(get_db),
):
    """Decode JWT and return the current user model."""
    from models.user import User  # local import to avoid circular dependency

    token = credentials.credentials
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or expired token",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = decode_token(token)
        user_id_str: str = payload.get("sub")
        if user_id_str is None:
            raise credentials_exception
        try:
            user_id = int(user_id_str)
        except ValueError:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    user = db.query(User).filter(User.id == user_id).first()
    if not user or not user.is_active:
        raise credentials_exception
    return user


def require_roles(*roles: str):
    """Dependency factory: raises 403 if user's role is not in `roles`."""
    def checker(current_user=Depends(get_current_user)):
        if current_user.role not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Required roles: {list(roles)}",
            )
        return current_user
    return checker


def get_user_industry(db: Session, user):
    """Return the industry linked to the logged-in industry user, if any."""
    if not user or user.role != "industry_user":
        return None
    return db.query(Industry).filter(Industry.contact_email == user.email).first()


def ensure_industry_scope(db: Session, user, industry_id: Optional[int] = None):
    """
    Restrict industry users to their own industry records.
    Returns the resolved industry for industry_user roles, otherwise None.
    """
    if not user or user.role != "industry_user":
        return None

    industry = get_user_industry(db, user)
    if not industry:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No industry is linked to this user account.",
        )

    if industry_id is not None and industry.id != industry_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied for this industry record.",
        )

    return industry


def ensure_location_scope(db: Session, user, location_id: Optional[int] = None):
    """
    Restrict industry users to locations belonging to their own industry.
    Monitoring team users can access all current locations.
    """
    if not user:
        return None

    if user.role == "industry_user":
        industry = ensure_industry_scope(db, user)
        if location_id is None:
            return industry

        location = (
            db.query(MonitoringLocation)
            .filter(MonitoringLocation.id == location_id)
            .first()
        )
        if not location:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Location not found.",
            )
        if location.industry_id != industry.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied for this location.",
            )
        return industry

    return None
