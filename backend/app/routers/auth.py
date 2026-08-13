import random
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.core.deps import get_current_user
from app.core.security import create_access_token
from app.models import User
from app.schemas.schemas import (
    RequestOtpRequest,
    VerifyOtpRequest,
    LoginRequest,
    TokenResponse,
    UserOut,
)

router = APIRouter(prefix="/auth", tags=["auth"])

# In-memory OTP store: {phone_number: otp}. Reset on server restart - fine for a mocked flow.
_otp_store = {}

AVATAR_PALETTE = [
    "#2C6BED", "#3A76F0", "#4CAF50", "#FF9500", "#E63950",
    "#9C27B0", "#00A8B5", "#D97757", "#5E7CE2", "#2E9E6D",
]


@router.post("/request-otp")
def request_otp(payload: RequestOtpRequest):
    """Mocked SMS OTP. In a real app this would hit an SMS gateway (Twilio, etc)."""
    otp = settings.mock_otp  # fixed mocked OTP as allowed by the assignment
    _otp_store[payload.phone_number] = otp
    return {"message": f"OTP sent to {payload.phone_number}", "mock_otp": otp}


@router.post("/verify-otp", response_model=TokenResponse)
def verify_otp(payload: VerifyOtpRequest, db: Session = Depends(get_db)):
    expected = _otp_store.get(payload.phone_number, settings.mock_otp)
    if payload.otp != expected:
        raise HTTPException(status_code=400, detail="Invalid OTP")

    user = db.query(User).filter(User.phone_number == payload.phone_number).first()
    if not user:
        if not payload.display_name:
            raise HTTPException(status_code=400, detail="display_name is required for new users")
        user = User(
            phone_number=payload.phone_number,
            display_name=payload.display_name,
            avatar_color=random.choice(AVATAR_PALETTE),
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    user.is_online = True
    user.last_seen = datetime.now(timezone.utc)
    db.commit()

    token = create_access_token(subject=user.id)
    return TokenResponse(access_token=token, user=UserOut.model_validate(user))


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    """Simple username-based login for seeded demo users (no password, mocked)."""
    query = db.query(User)
    user = None
    if payload.username:
        user = query.filter(User.username == payload.username).first()
    elif payload.phone_number:
        user = query.filter(User.phone_number == payload.phone_number).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.is_online = True
    user.last_seen = datetime.now(timezone.utc)
    db.commit()

    token = create_access_token(subject=user.id)
    return TokenResponse(access_token=token, user=UserOut.model_validate(user))


@router.post("/logout")
def logout(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    current_user.is_online = False
    current_user.last_seen = datetime.now(timezone.utc)
    db.commit()
    return {"message": "Logged out"}


@router.get("/me", response_model=UserOut)
def me(current_user: User = Depends(get_current_user)):
    return current_user
