from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models import User, Contact
from app.schemas.schemas import AddContactRequest, ContactOut

router = APIRouter(prefix="/contacts", tags=["contacts"])


@router.get("", response_model=list[ContactOut])
def list_contacts(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    contacts = db.query(Contact).filter(Contact.owner_id == current_user.id).all()
    return [ContactOut(id=c.id, nickname=c.nickname, user=c.contact_user) for c in contacts]


@router.post("", response_model=ContactOut)
def add_contact(
    payload: AddContactRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = db.query(User)
    target = None
    if payload.username:
        target = query.filter(User.username == payload.username).first()
    elif payload.phone_number:
        target = query.filter(User.phone_number == payload.phone_number).first()
    if not target:
        raise HTTPException(status_code=404, detail="No Signal user found with that phone number/username")
    if target.id == current_user.id:
        raise HTTPException(status_code=400, detail="You cannot add yourself")

    existing = (
        db.query(Contact)
        .filter(Contact.owner_id == current_user.id, Contact.contact_user_id == target.id)
        .first()
    )
    if existing:
        raise HTTPException(status_code=400, detail="Contact already added")

    contact = Contact(owner_id=current_user.id, contact_user_id=target.id, nickname=payload.nickname)
    db.add(contact)
    db.commit()
    db.refresh(contact)
    return ContactOut(id=contact.id, nickname=contact.nickname, user=target)


@router.delete("/{contact_id}")
def delete_contact(contact_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    contact = (
        db.query(Contact).filter(Contact.id == contact_id, Contact.owner_id == current_user.id).first()
    )
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")
    db.delete(contact)
    db.commit()
    return {"message": "Contact removed"}
