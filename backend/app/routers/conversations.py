from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models import (
    User, Conversation, ConversationMember, ConversationType, MemberRole, Message, MessageStatus,
)
from app.schemas.schemas import (
    CreateDirectConversationRequest, CreateGroupRequest, UpdateGroupRequest, AddMembersRequest,
    ConversationOut, MemberOut, LastMessageOut, UserOut,
)
from app.ws.manager import manager

router = APIRouter(prefix="/conversations", tags=["conversations"])


def _serialize(conv: Conversation, current_user_id: str, db: Session) -> ConversationOut:
    my_membership = next((m for m in conv.members if m.user_id == current_user_id), None)
    last_msg = (
        db.query(Message)
        .filter(Message.conversation_id == conv.id)
        .order_by(Message.created_at.desc())
        .first()
    )
    unread_count = 0
    if my_membership:
        q = db.query(Message).filter(
            Message.conversation_id == conv.id,
            Message.sender_id != current_user_id,
        )
        if my_membership.last_read_message_at:
            q = q.filter(Message.created_at > my_membership.last_read_message_at)
        unread_count = q.count()

    name = conv.name
    avatar_color = conv.avatar_color
    if conv.type == ConversationType.direct:
        other = next((m.user for m in conv.members if m.user_id != current_user_id), None)
        if other:
            name = other.display_name
            avatar_color = other.avatar_color

    return ConversationOut(
        id=conv.id,
        type=conv.type.value,
        name=name,
        avatar_color=avatar_color,
        members=[MemberOut(user=m.user, role=m.role.value, joined_at=m.joined_at) for m in conv.members],
        last_message=(
            LastMessageOut(
                id=last_msg.id, body=last_msg.body, sender_id=last_msg.sender_id,
                created_at=last_msg.created_at, status=last_msg.status.value, is_system=last_msg.is_system,
            )
            if last_msg else None
        ),
        unread_count=unread_count,
        updated_at=conv.last_message_at,
    )


@router.get("", response_model=list[ConversationOut])
def list_conversations(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    memberships = db.query(ConversationMember).filter(ConversationMember.user_id == current_user.id).all()
    convs = [m.conversation for m in memberships]
    convs.sort(key=lambda c: c.last_message_at, reverse=True)
    return [_serialize(c, current_user.id, db) for c in convs]


@router.post("/direct", response_model=ConversationOut)
def create_direct_conversation(
    payload: CreateDirectConversationRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    other = db.query(User).filter(User.id == payload.user_id).first()
    if not other:
        raise HTTPException(status_code=404, detail="User not found")
    if other.id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot start a conversation with yourself")

    # Check if a direct conversation already exists between these two users
    my_conv_ids = {
        m.conversation_id
        for m in db.query(ConversationMember).filter(ConversationMember.user_id == current_user.id)
    }
    for m in db.query(ConversationMember).filter(ConversationMember.user_id == other.id):
        if m.conversation_id in my_conv_ids and m.conversation.type == ConversationType.direct:
            return _serialize(m.conversation, current_user.id, db)

    conv = Conversation(type=ConversationType.direct, created_by=current_user.id)
    db.add(conv)
    db.flush()
    db.add(ConversationMember(conversation_id=conv.id, user_id=current_user.id, role=MemberRole.member))
    db.add(ConversationMember(conversation_id=conv.id, user_id=other.id, role=MemberRole.member))
    db.commit()
    db.refresh(conv)
    return _serialize(conv, current_user.id, db)


@router.post("/group", response_model=ConversationOut)
def create_group(
    payload: CreateGroupRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if len(payload.member_ids) < 1:
        raise HTTPException(status_code=400, detail="Select at least one other member")

    conv = Conversation(
        type=ConversationType.group, name=payload.name, avatar_color=payload.avatar_color or "#3A76F0",
        created_by=current_user.id,
    )
    db.add(conv)
    db.flush()
    db.add(ConversationMember(conversation_id=conv.id, user_id=current_user.id, role=MemberRole.admin))
    member_ids = set(payload.member_ids) - {current_user.id}
    for uid in member_ids:
        if db.query(User).filter(User.id == uid).first():
            db.add(ConversationMember(conversation_id=conv.id, user_id=uid, role=MemberRole.member))

    system_msg = Message(
        conversation_id=conv.id, sender_id=current_user.id, is_system=True,
        body=f"{current_user.display_name} created the group \"{payload.name}\"",
        status=MessageStatus.sent,
    )
    db.add(system_msg)
    db.commit()
    db.refresh(conv)
    return _serialize(conv, current_user.id, db)


def _require_group_admin(conv: Conversation, user_id: str):
    membership = next((m for m in conv.members if m.user_id == user_id), None)
    if not membership or membership.role != MemberRole.admin:
        raise HTTPException(status_code=403, detail="Only group admins can do this")


@router.get("/{conversation_id}", response_model=ConversationOut)
def get_conversation(conversation_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    conv = db.query(Conversation).filter(Conversation.id == conversation_id).first()
    if not conv or not any(m.user_id == current_user.id for m in conv.members):
        raise HTTPException(status_code=404, detail="Conversation not found")
    return _serialize(conv, current_user.id, db)


@router.patch("/{conversation_id}", response_model=ConversationOut)
def update_group(
    conversation_id: str, payload: UpdateGroupRequest,
    current_user: User = Depends(get_current_user), db: Session = Depends(get_db),
):
    conv = db.query(Conversation).filter(Conversation.id == conversation_id).first()
    if not conv or conv.type != ConversationType.group:
        raise HTTPException(status_code=404, detail="Group not found")
    _require_group_admin(conv, current_user.id)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(conv, field, value)
    db.commit()
    db.refresh(conv)
    return _serialize(conv, current_user.id, db)


@router.post("/{conversation_id}/members", response_model=ConversationOut)
def add_members(
    conversation_id: str, payload: AddMembersRequest,
    current_user: User = Depends(get_current_user), db: Session = Depends(get_db),
):
    conv = db.query(Conversation).filter(Conversation.id == conversation_id).first()
    if not conv or conv.type != ConversationType.group:
        raise HTTPException(status_code=404, detail="Group not found")
    _require_group_admin(conv, current_user.id)

    existing_ids = {m.user_id for m in conv.members}
    added_names = []
    for uid in payload.member_ids:
        if uid in existing_ids:
            continue
        user = db.query(User).filter(User.id == uid).first()
        if user:
            db.add(ConversationMember(conversation_id=conv.id, user_id=uid, role=MemberRole.member))
            added_names.append(user.display_name)

    if added_names:
        db.add(Message(
            conversation_id=conv.id, sender_id=current_user.id, is_system=True,
            body=f"{current_user.display_name} added {', '.join(added_names)}",
            status=MessageStatus.sent,
        ))
    db.commit()
    db.refresh(conv)
    return _serialize(conv, current_user.id, db)


@router.delete("/{conversation_id}/members/{user_id}", response_model=ConversationOut)
def remove_member(
    conversation_id: str, user_id: str,
    current_user: User = Depends(get_current_user), db: Session = Depends(get_db),
):
    conv = db.query(Conversation).filter(Conversation.id == conversation_id).first()
    if not conv or conv.type != ConversationType.group:
        raise HTTPException(status_code=404, detail="Group not found")
    if user_id != current_user.id:
        _require_group_admin(conv, current_user.id)

    membership = next((m for m in conv.members if m.user_id == user_id), None)
    if not membership:
        raise HTTPException(status_code=404, detail="Member not found")
    removed_user = membership.user
    db.delete(membership)
    verb = "left" if user_id == current_user.id else f"was removed by {current_user.display_name}"
    db.add(Message(
        conversation_id=conv.id, sender_id=current_user.id, is_system=True,
        body=f"{removed_user.display_name} {verb} the group",
        status=MessageStatus.sent,
    ))
    db.commit()
    db.refresh(conv)
    return _serialize(conv, current_user.id, db)


@router.post("/{conversation_id}/read")
async def mark_read(conversation_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    membership = (
        db.query(ConversationMember)
        .filter(ConversationMember.conversation_id == conversation_id, ConversationMember.user_id == current_user.id)
        .first()
    )
    if not membership:
        raise HTTPException(status_code=404, detail="Conversation not found")
    membership.last_read_message_at = datetime.now(timezone.utc)

    unread_msgs = (
        db.query(Message)
        .filter(Message.conversation_id == conversation_id, Message.sender_id != current_user.id, Message.status != MessageStatus.read)
        .all()
    )
    sender_ids = set()
    for msg in unread_msgs:
        msg.status = MessageStatus.read
        sender_ids.add(msg.sender_id)
    db.commit()

    for sender_id in sender_ids:
        await manager.send_to_user(sender_id, {
            "type": "messages_read", "conversation_id": conversation_id, "reader_id": current_user.id,
        })
    return {"message": "Marked as read"}
