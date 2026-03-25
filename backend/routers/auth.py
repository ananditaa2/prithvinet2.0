from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from core.database import get_db
from core.security import hash_password, verify_password, create_access_token, get_current_user
from models.user import User
from schemas.auth import UserRegister, UserLogin, UserOut, TokenOut, UserUpdate, ChangePassword

router = APIRouter(prefix="/auth", tags=["Authentication"])

VALID_ROLES = {"admin", "regional_officer", "monitoring_team", "industry_user", "citizen"}


@router.post("/register", response_model=UserOut, status_code=201)
def register(payload: UserRegister, db: Session = Depends(get_db)):
    if payload.role not in VALID_ROLES:
        raise HTTPException(400, f"Invalid role. Choose from: {VALID_ROLES}")

    existing = db.query(User).filter(User.email == payload.email).first()
    if existing:
        raise HTTPException(400, "Email already registered.")

    # First ever user gets admin automatically
    if db.query(User).count() == 0:
        payload.role = "admin"

    try:
        password_hash = hash_password(payload.password)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    user = User(
        name=payload.name,
        email=payload.email,
        password_hash=password_hash,
        role=payload.role,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.post("/login", response_model=TokenOut)
def login(payload: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email).first()
    try:
        is_valid_password = user and verify_password(payload.password, user.password_hash)
    except ValueError:
        is_valid_password = False

    if not user or not is_valid_password:
        raise HTTPException(status_code=401, detail="Invalid email or password.")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account is deactivated.")

    token = create_access_token({"sub": str(user.id), "role": user.role})
    return TokenOut(access_token=token, user=UserOut.model_validate(user))


@router.get("/me", response_model=UserOut)
def me(current_user=Depends(get_current_user)):
    return current_user


@router.patch("/me", response_model=UserOut)
def update_me(payload: UserUpdate, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    if payload.name is not None:
        current_user.name = payload.name
    db.commit()
    db.refresh(current_user)
    return current_user


@router.post("/change-password")
def change_password(payload: ChangePassword, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    try:
        is_current_password_valid = verify_password(payload.current_password, current_user.password_hash)
    except ValueError:
        is_current_password_valid = False

    if not is_current_password_valid:
        raise HTTPException(400, "Incorrect current password.")
    try:
        current_user.password_hash = hash_password(payload.new_password)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    db.commit()
    return {"message": "Password updated successfully."}


@router.get("/users", response_model=list[UserOut])
def list_users(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    from core.security import require_roles
    if current_user.role != "admin":
        raise HTTPException(403, "Admin only.")
    return db.query(User).all()


@router.patch("/users/{user_id}/deactivate")
def deactivate_user(user_id: int, db: Session = Depends(get_db),
                    current_user=Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(403, "Admin only.")
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(404, "User not found.")
    user.is_active = False
    db.commit()
    return {"message": f"User {user.email} deactivated."}
