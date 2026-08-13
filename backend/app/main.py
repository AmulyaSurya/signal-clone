from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.database import Base, engine
from app.routers import auth, users, contacts, conversations, messages, ws

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Signal Clone API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(users.router)
app.include_router(contacts.router)
app.include_router(conversations.router)
app.include_router(messages.router)
app.include_router(ws.router)


@app.get("/")
def root():
    return {"status": "ok", "service": "signal-clone-api"}


@app.get("/health")
def health():
    return {"status": "healthy"}
