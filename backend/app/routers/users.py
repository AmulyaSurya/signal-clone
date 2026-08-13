from fastapi import APIRouter, Depends, Query
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models import User
from app.schemas.schemas import UserOut, UpdateProfileRequest

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/me", response_model=UserOut)
def get_my_profile(current_user: User = Depends(get_current_user)):
    return current_user


@router.patch("/me", response_model=UserOut)
def update_my_profile(
    payload: UpdateProfileRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(current_user, field, value)
    db.commit()
    db.refresh(current_user)
    return current_user


@router.get("/search", response_model=list[UserOut])
def search_users(
    q: str = Query(..., min_length=1),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Used by 'Add contact' / 'New chat' to find people by phone or username."""
    results = (
        db.query(User)
        .filter(
            User.id != current_user.id,
            or_(User.username.ilike(f"%{q}%"), User.phone_number.ilike(f"%{q}%"), User.display_name.ilike(f"%{q}%")),
        )
        .limit(20)
        .all()
    )
    return results
