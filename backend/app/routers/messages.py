from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models import (
    User, Conversation, ConversationMember, Message, MessageStatus, MessageReaction,
)
from app.schemas.schemas import SendMessageRequest, MessageOut, ReactionOut, AddReactionRequest
from app.ws.manager import manager

router = APIRouter(prefix="/conversations/{conversation_id}/messages", tags=["messages"])


def _serialize(msg: Message) -> MessageOut:
    return MessageOut(
        id=msg.id, conversation_id=msg.conversation_id, sender_id=msg.sender_id, body=msg.body,
        reply_to_id=msg.reply_to_id, is_system=msg.is_system, status=msg.status.value,
        created_at=msg.created_at, edited_at=msg.edited_at,
        reactions=[ReactionOut(emoji=r.emoji, user_id=r.user_id) for r in msg.reactions],
    )


def _require_member(conversation_id: str, user_id: str, db: Session) -> Conversation:
    conv = db.query(Conversation).filter(Conversation.id == conversation_id).first()
    if not conv or not any(m.user_id == user_id for m in conv.members):
        raise HTTPException(status_code=404, detail="Conversation not found")
    return conv


@router.get("", response_model=list[MessageOut])
def list_messages(
    conversation_id: str, before: str | None = Query(default=None), limit: int = Query(default=50, le=200),
    current_user: User = Depends(get_current_user), db: Session = Depends(get_db),
):
    _require_member(conversation_id, current_user.id, db)
    q = db.query(Message).filter(Message.conversation_id == conversation_id)
    if before:
        anchor = db.query(Message).filter(Message.id == before).first()
        if anchor:
            q = q.filter(Message.created_at < anchor.created_at)
    msgs = q.order_by(Message.created_at.desc()).limit(limit).all()
    msgs.reverse()
    return [_serialize(m) for m in msgs]


@router.post("", response_model=MessageOut)
async def send_message(
    conversation_id: str, payload: SendMessageRequest,
    current_user: User = Depends(get_current_user), db: Session = Depends(get_db),
):
    conv = _require_member(conversation_id, current_user.id, db)

    msg = Message(
        conversation_id=conversation_id, sender_id=current_user.id, body=payload.body,
        reply_to_id=payload.reply_to_id, status=MessageStatus.sent,
        disappears_in_seconds=payload.disappears_in_seconds,
    )
    db.add(msg)
    conv.last_message_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(msg)

    recipient_ids = [m.user_id for m in conv.members if m.user_id != current_user.id]
    online_recipients = [uid for uid in recipient_ids if manager.is_online(uid)]
    if online_recipients:
        msg.status = MessageStatus.delivered
        db.commit()
        db.refresh(msg)

    event = {"type": "new_message", "conversation_id": conversation_id, "message": _serialize(msg).model_dump(mode="json")}
    await manager.send_to_users(recipient_ids, event)
    # Echo back to sender's other connected devices/tabs. This can arrive at the
    # sending client *before* the HTTP response does, so we include the client's
    # own temp/optimistic id (client_id) alongside the real message. The client
    # uses it to swap its optimistic bubble in place instead of appending a
    # second copy when the HTTP response lands afterwards.
    await manager.send_to_user(current_user.id, {**event, "self_echo": True, "client_id": payload.client_id})

    return _serialize(msg)


@router.post("/{message_id}/reactions", response_model=MessageOut)
async def add_reaction(
    conversation_id: str, message_id: str, payload: AddReactionRequest,
    current_user: User = Depends(get_current_user), db: Session = Depends(get_db),
):
    conv = _require_member(conversation_id, current_user.id, db)
    msg = db.query(Message).filter(Message.id == message_id, Message.conversation_id == conversation_id).first()
    if not msg:
        raise HTTPException(status_code=404, detail="Message not found")

    existing = (
        db.query(MessageReaction)
        .filter(MessageReaction.message_id == message_id, MessageReaction.user_id == current_user.id)
        .first()
    )
    if existing:
        existing.emoji = payload.emoji
    else:
        db.add(MessageReaction(message_id=message_id, user_id=current_user.id, emoji=payload.emoji))
    db.commit()
    db.refresh(msg)

    recipient_ids = [m.user_id for m in conv.members]
    await manager.send_to_users(recipient_ids, {
        "type": "message_reaction", "conversation_id": conversation_id,
        "message": _serialize(msg).model_dump(mode="json"),
    })
    return _serialize(msg)


@router.delete("/{message_id}")
async def delete_message(
    conversation_id: str, message_id: str,
    current_user: User = Depends(get_current_user), db: Session = Depends(get_db),
):
    conv = _require_member(conversation_id, current_user.id, db)
    msg = db.query(Message).filter(Message.id == message_id, Message.conversation_id == conversation_id).first()
    if not msg:
        raise HTTPException(status_code=404, detail="Message not found")
    if msg.sender_id != current_user.id:
        raise HTTPException(status_code=403, detail="You can only delete your own messages")

    msg.deleted_at = datetime.now(timezone.utc)
    msg.body = None
    db.commit()

    recipient_ids = [m.user_id for m in conv.members]
    await manager.send_to_users(recipient_ids, {
        "type": "message_deleted", "conversation_id": conversation_id, "message_id": message_id,
    })
    return {"message": "Message deleted"}
