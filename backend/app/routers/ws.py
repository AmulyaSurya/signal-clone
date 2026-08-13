import json
from datetime import datetime, timezone

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from sqlalchemy.orm import Session

from app.core.database import SessionLocal
from app.core.deps import get_user_from_token
from app.models import User, ConversationMember
from app.ws.manager import manager

router = APIRouter(tags=["websocket"])


@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket, token: str = Query(...)):
    db: Session = SessionLocal()
    user = get_user_from_token(token, db)
    if not user:
        await websocket.close(code=4401)
        db.close()
        return

    user_id = user.id
    await manager.connect(user_id, websocket)

    user.is_online = True
    db.commit()

    # tell this user's conversation partners that they've come online
    member_convs = db.query(ConversationMember).filter(ConversationMember.user_id == user_id).all()
    peer_ids = set()
    for m in member_convs:
        for other in m.conversation.members:
            if other.user_id != user_id:
                peer_ids.add(other.user_id)
    await manager.send_to_users(peer_ids, {"type": "presence", "user_id": user_id, "is_online": True})

    try:
        while True:
            raw = await websocket.receive_text()
            try:
                data = json.loads(raw)
            except json.JSONDecodeError:
                continue

            event_type = data.get("type")

            if event_type == "typing":
                conversation_id = data.get("conversation_id")
                is_typing = data.get("is_typing", True)
                membership = (
                    db.query(ConversationMember)
                    .filter(ConversationMember.conversation_id == conversation_id)
                    .all()
                )
                recipient_ids = [m.user_id for m in membership if m.user_id != user_id]
                await manager.send_to_users(recipient_ids, {
                    "type": "typing", "conversation_id": conversation_id,
                    "user_id": user_id, "is_typing": is_typing,
                })

            elif event_type == "ping":
                await websocket.send_text(json.dumps({"type": "pong"}))

    except WebSocketDisconnect:
        pass
    finally:
        manager.disconnect(user_id, websocket)
        if not manager.is_online(user_id):
            user.is_online = False
            user.last_seen = datetime.now(timezone.utc)
            db.commit()
            await manager.send_to_users(peer_ids, {
                "type": "presence", "user_id": user_id, "is_online": False, "last_seen": str(user.last_seen),
            })
        db.close()
