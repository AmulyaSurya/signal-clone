import json
from typing import Dict, Set
from fastapi import WebSocket


class ConnectionManager:
    """Tracks active websocket connections per user_id and broadcasts events."""

    def __init__(self):
        self.active_connections: Dict[str, Set[WebSocket]] = {}

    async def connect(self, user_id: str, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.setdefault(user_id, set()).add(websocket)

    def disconnect(self, user_id: str, websocket: WebSocket):
        conns = self.active_connections.get(user_id)
        if conns and websocket in conns:
            conns.remove(websocket)
        if conns is not None and not conns:
            self.active_connections.pop(user_id, None)

    def is_online(self, user_id: str) -> bool:
        return bool(self.active_connections.get(user_id))

    async def send_to_user(self, user_id: str, event: dict):
        conns = self.active_connections.get(user_id)
        if not conns:
            return
        payload = json.dumps(event, default=str)
        dead = []
        # Iterate a snapshot, not the live set. `ws.send_text` awaits, which can
        # yield control to another coroutine (e.g. a concurrent disconnect())
        # that mutates this same set — iterating the live set then raises
        # "Set changed size during iteration" and crashes the caller (which,
        # for /messages and /reactions, runs *after* the DB write has already
        # committed — so the client sees a false "failed" even though the
        # message/reaction was actually saved).
        for ws in list(conns):
            try:
                await ws.send_text(payload)
            except Exception:
                dead.append(ws)
        for ws in dead:
            conns.discard(ws)

    async def send_to_users(self, user_ids, event: dict, exclude_user_id: str = None):
        for uid in set(user_ids):
            if exclude_user_id and uid == exclude_user_id:
                continue
            await self.send_to_user(uid, event)


manager = ConnectionManager()
