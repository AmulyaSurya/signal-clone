from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict


# ---------------- Auth ----------------
class RegisterRequest(BaseModel):
    phone_number: Optional[str] = None
    username: Optional[str] = None
    display_name: str


class RequestOtpRequest(BaseModel):
    phone_number: str


class VerifyOtpRequest(BaseModel):
    phone_number: str
    otp: str
    display_name: Optional[str] = None


class LoginRequest(BaseModel):
    phone_number: Optional[str] = None
    username: Optional[str] = None


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: "UserOut"


# ---------------- User ----------------
class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    phone_number: Optional[str] = None
    username: Optional[str] = None
    display_name: str
    avatar_color: str
    avatar_url: Optional[str] = None
    about: Optional[str] = None
    is_online: bool
    last_seen: datetime


class UpdateProfileRequest(BaseModel):
    display_name: Optional[str] = None
    about: Optional[str] = None
    avatar_color: Optional[str] = None
    avatar_url: Optional[str] = None


# ---------------- Contacts ----------------
class AddContactRequest(BaseModel):
    phone_number: Optional[str] = None
    username: Optional[str] = None
    nickname: Optional[str] = None


class ContactOut(BaseModel):
    id: str
    nickname: Optional[str] = None
    user: UserOut


# ---------------- Conversations ----------------
class CreateDirectConversationRequest(BaseModel):
    user_id: str


class CreateGroupRequest(BaseModel):
    name: str
    member_ids: List[str]
    avatar_color: Optional[str] = "#3A76F0"


class UpdateGroupRequest(BaseModel):
    name: Optional[str] = None
    avatar_color: Optional[str] = None


class AddMembersRequest(BaseModel):
    member_ids: List[str]


class MemberOut(BaseModel):
    user: UserOut
    role: str
    joined_at: datetime


class LastMessageOut(BaseModel):
    id: str
    body: Optional[str] = None
    sender_id: str
    created_at: datetime
    status: str
    is_system: bool = False


class ConversationOut(BaseModel):
    id: str
    type: str
    name: Optional[str] = None
    avatar_color: str
    members: List[MemberOut]
    last_message: Optional[LastMessageOut] = None
    unread_count: int = 0
    updated_at: datetime


# ---------------- Messages ----------------
class SendMessageRequest(BaseModel):
    body: str
    reply_to_id: Optional[str] = None
    disappears_in_seconds: Optional[int] = None
    client_id: Optional[str] = None


class ReactionOut(BaseModel):
    emoji: str
    user_id: str


class MessageOut(BaseModel):
    id: str
    conversation_id: str
    sender_id: str
    body: Optional[str] = None
    reply_to_id: Optional[str] = None
    is_system: bool
    status: str
    created_at: datetime
    edited_at: Optional[datetime] = None
    reactions: List[ReactionOut] = []


class AddReactionRequest(BaseModel):
    emoji: str
