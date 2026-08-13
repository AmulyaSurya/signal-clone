# Signal — Secure Messaging Platform (Clone)

A functional clone of the Signal messenger: registration, contacts, one-on-one
and group conversations, real-time messaging with typing indicators and
read/delivery receipts, all wrapped in a UI modeled closely on Signal's own
design. Encryption is simulated, not real — as specified in the assignment.

---

## Tech stack

| Layer      | Technology                                                            |
|------------|------------------------------------------------------------------------|
| Frontend   | Next.js 14 (App Router) + TypeScript, Tailwind CSS, Zustand, Axios     |
| Backend    | Python 3.12, FastAPI, SQLAlchemy ORM                                   |
| Database   | SQLite                                                                  |
| Real-time  | Native WebSockets (FastAPI `WebSocket` + a connection manager)         |
| Auth       | JWT (python-jose) with a mocked phone/OTP verification flow            |

---

## Project structure

```
signal-clone/
├── backend/
│   ├── app/
│   │   ├── core/         # config, db session, JWT/security, auth dependency
│   │   ├── models/       # SQLAlchemy models (schema)
│   │   ├── schemas/      # Pydantic request/response models
│   │   ├── routers/      # auth, users, contacts, conversations, messages, ws
│   │   ├── ws/           # WebSocket connection manager
│   │   └── main.py       # FastAPI app entrypoint
│   ├── seed.py           # seeds demo users/conversations/messages
│   ├── requirements.txt
│   └── .env
└── frontend/
    ├── src/
    │   ├── app/           # Next.js pages (login, main chat page, layout)
    │   ├── components/    # Sidebar, ChatWindow, MessageBubble, modals, etc.
    │   ├── hooks/          # useSocket (WebSocket client hook)
    │   ├── lib/            # api client, zustand store, formatting utils
    │   └── types/          # shared TypeScript types
    ├── package.json
    └── .env.local
```

---

## Setup instructions

### 1. Backend

```bash
cd backend
python3 -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env            # adjust secrets if you like
python seed.py                  # creates + seeds signal_clone.db
uvicorn app.main:app --reload --port 8000
```

The API is now live at `http://localhost:8000` (interactive docs at
`http://localhost:8000/docs`), and the WebSocket endpoint is at
`ws://localhost:8000/ws?token=<JWT>`.

### 2. Frontend

```bash
cd frontend
npm install
cp .env.local.example .env.local
npm run dev
```

Open `http://localhost:3000`. You'll land on `/login`.

### 3. Log in

Two ways to log in (both mocked, no real SMS/passwords):

- **Quick demo login** — the login page lists 5 seeded accounts
  (`alex`, `priya`, `sam`, `mira`, `leo`). Click one to log in instantly.
  Log in as **alex** to see a fully populated inbox (4 direct chats + 1
  group, "Weekend Trip 🏔️", with realistic message history).
- **Phone/OTP flow** — enter any phone number, click "Send code". The
  mocked OTP is always shown on-screen (and defaults to `123456`, see
  `MOCK_OTP` in `.env`). If the number isn't in the database yet, you'll be
  asked to set a display name to finish registration.

Open a second browser (or incognito window) and log in as a different
seeded user (e.g. `priya`) to see real-time delivery, typing indicators,
and read receipts working live between two sessions.

---

## Architecture overview

- **Backend** is a standard FastAPI app: routers per resource
  (`auth`, `users`, `contacts`, `conversations`, `messages`, `ws`), a
  SQLAlchemy session per-request via `Depends(get_db)`, and JWT bearer auth
  via `Depends(get_current_user)`.
- **Real-time** is handled by a single `/ws` WebSocket endpoint. The client
  authenticates by passing its JWT as a query param. A `ConnectionManager`
  (`app/ws/manager.py`) tracks active sockets per `user_id` (a user can have
  multiple tabs/devices open) and pushes events (`new_message`, `typing`,
  `presence`, `messages_read`, `message_reaction`, `message_deleted`) only to
  the relevant conversation members. REST endpoints that mutate state
  (`send_message`, `mark_read`, `add_reaction`, ...) push the corresponding
  WebSocket event after committing to the DB, so REST is the source of
  truth and WS is purely the real-time notification layer.
- **Message status** (`sending → sent → delivered → read`) is set
  server-side: a message becomes `delivered` immediately if any recipient is
  currently connected, and `read` when the recipient opens the conversation
  and calls `POST /conversations/{id}/read`, which flips their
  `MessageReceipt`/`last_read_message_at` and notifies the sender over the
  socket, driving the blue double-check mark.
- **Frontend** is a single-page-feeling app: `src/app/page.tsx` is the
  orchestrator holding conversation/message state, wiring the `useSocket`
  hook's events into React state, and rendering `Sidebar` +
  `ChatWindow` side by side (Signal's classic two-pane layout). Sending a
  message is optimistic: a `sending` bubble appears immediately and is
  reconciled with the server's real message object (or marked failed) once
  the REST call resolves.
- **Auth persistence**: JWT stored in `localStorage`; a Zustand store
  (`useAuthStore`) hydrates the session on load via `GET /auth/me` and
  redirects to `/login` if invalid/missing.

---

## Database schema

```
users
├─ id (pk, uuid)
├─ phone_number (unique, nullable)
├─ username (unique, nullable)
├─ display_name
├─ avatar_color / avatar_url
├─ about
├─ is_online, last_seen
└─ created_at

contacts                              (owner's private address book)
├─ id (pk)
├─ owner_id (fk → users.id)
├─ contact_user_id (fk → users.id)
├─ nickname
└─ unique(owner_id, contact_user_id)

conversations
├─ id (pk)
├─ type (direct | group)
├─ name (group only)
├─ avatar_color
├─ created_by (fk → users.id)
├─ last_message_at (drives conversation-list ordering)
└─ created_at

conversation_members                  (join table: who's in which conversation)
├─ id (pk)
├─ conversation_id (fk)
├─ user_id (fk)
├─ role (admin | member)
├─ last_read_message_at              (drives unread-count + read receipts)
├─ is_muted
└─ unique(conversation_id, user_id)

messages
├─ id (pk)
├─ conversation_id (fk)
├─ sender_id (fk → users.id)
├─ body (nullable — null after delete)
├─ reply_to_id (self-fk, for quoted replies)
├─ is_system (bool — "X added Y", "X created the group", etc.)
├─ status (sending | sent | delivered | read)
├─ disappears_in_seconds (nullable, placeholder for disappearing messages)
├─ created_at, edited_at, deleted_at

message_receipts                      (per-recipient delivery/read state)
├─ id (pk)
├─ message_id (fk)
├─ user_id (fk)
├─ delivered_at, read_at
└─ unique(message_id, user_id)

message_reactions
├─ id (pk)
├─ message_id (fk)
├─ user_id (fk)
├─ emoji
└─ unique(message_id, user_id)          (one reaction per user per message)

attachments                            (schema in place; upload flow not wired up)
├─ id (pk)
├─ message_id (fk)
├─ file_name, file_url, mime_type, size_bytes
```

**Design notes:**
- `conversations` unifies direct and group chats under one table/one set of
  endpoints — a direct chat is just a `type=direct` conversation with
  exactly 2 members. This avoids duplicating message/read-receipt logic.
- Unread counts are computed on read (`unread_count` in `ConversationOut`)
  by comparing `last_read_message_at` against message timestamps, rather
  than maintaining a denormalized counter — simpler and always consistent.
- `message_receipts` exists for future group-chat "read by N of M" detail
  views; the current UI collapses this into the single/double/blue-tick
  status shown on `messages.status`, which is sufficient for 1:1 chats and
  is set to `read` in a group once any recipient has read it (kept simple
  intentionally — see Assumptions).

---

## Feature coverage

**Implemented**
- Mocked phone/OTP registration + username-based demo login, JWT sessions
- Profile: display name, about, avatar color, logout
- Contacts: search by username/phone, add, list
- Conversation list: recency-sorted, search, unread badges, last-message
  preview, mocked online/last-seen indicators
- 1:1 messaging: real-time send/receive, timestamps, sending/sent/
  delivered/read status ticks, typing indicators, full persistence
- Group messaging: create with name + members, admin add/remove members,
  leave group, system messages ("X added Y", "X left"), persistence
- Signal-like UI: two-pane layout, message bubbles, day dividers, modals for
  new chat/new group/conversation info/settings, toasts, dark mode
- Bonus: emoji reactions, reply-to quoting (UI + `reply_to_id` persisted),
  dark mode, responsive layout (mobile collapses to single pane)

**Placeholders ("Coming soon")**
- Voice/video calls, stories, linked devices, real E2E encryption,
  notifications/privacy settings screens (UI present, non-functional),
  file/image attachments (schema exists, upload flow not implemented),
  functional disappearing-message timers (field exists, not enforced)

---

## Assumptions

- "Real phone verification... can be mocked" is taken literally: OTP is a
  fixed code (`123456` by default) returned directly in the API response
  and shown in the UI, so no SMS provider integration was built.
- A user can only be logged in as one identity per browser tab; the "quick
  demo login" buttons are a convenience for grading/demoing multi-user
  real-time behavior, not a production auth flow.
- Group read receipts are simplified to "delivered once any member is
  online" / "read once any member reads it" rather than full per-member
  fan-out receipts, since Signal's own UI for this is quite deep and out of
  scope for the assignment's stated focus (workflow, not protocol fidelity).
- SQLite is used as instructed; the schema doesn't rely on
  Postgres-specific features so it would port cleanly if needed.
