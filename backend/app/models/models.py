import enum
import uuid
from datetime import datetime, timezone

from sqlalchemy import (
    Column, String, Boolean, DateTime, ForeignKey, Text, Enum, Integer, UniqueConstraint
)
from sqlalchemy.orm import relationship

from app.core.database import Base


def gen_uuid() -> str:
    return str(uuid.uuid4())


def utcnow():
    return datetime.now(timezone.utc)


class ConversationType(str, enum.Enum):
    direct = "direct"
    group = "group"


class MemberRole(str, enum.Enum):
    admin = "admin"
    member = "member"


class MessageStatus(str, enum.Enum):
    sending = "sending"
    sent = "sent"
    delivered = "delivered"
    read = "read"


# ---------------------------------------------------------------------------
# User
# ---------------------------------------------------------------------------
class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=gen_uuid)
    phone_number = Column(String, unique=True, index=True, nullable=True)
    username = Column(String, unique=True, index=True, nullable=True)
    display_name = Column(String, nullable=False)
    avatar_color = Column(String, default="#2C6BED")  # Signal-style solid color avatar
    avatar_url = Column(String, nullable=True)
    about = Column(String, default="Available")
    password_hash = Column(String, nullable=True)  # not used for real auth, mocked flow
    is_online = Column(Boolean, default=False)
    last_seen = Column(DateTime, default=utcnow)
    created_at = Column(DateTime, default=utcnow)

    contacts = relationship(
        "Contact", foreign_keys="Contact.owner_id", back_populates="owner", cascade="all, delete-orphan"
    )
    memberships = relationship("ConversationMember", back_populates="user", cascade="all, delete-orphan")
    messages = relationship("Message", back_populates="sender")


# ---------------------------------------------------------------------------
# Contacts (address book, one-directional like a phone contact list)
# ---------------------------------------------------------------------------
class Contact(Base):
    __tablename__ = "contacts"
    __table_args__ = (UniqueConstraint("owner_id", "contact_user_id", name="uq_owner_contact"),)

    id = Column(String, primary_key=True, default=gen_uuid)
    owner_id = Column(String, ForeignKey("users.id"), nullable=False)
    contact_user_id = Column(String, ForeignKey("users.id"), nullable=False)
    nickname = Column(String, nullable=True)  # custom name owner gave the contact
    created_at = Column(DateTime, default=utcnow)

    owner = relationship("User", foreign_keys=[owner_id], back_populates="contacts")
    contact_user = relationship("User", foreign_keys=[contact_user_id])


# ---------------------------------------------------------------------------
# Conversation (1-1 or group)
# ---------------------------------------------------------------------------
class Conversation(Base):
    __tablename__ = "conversations"

    id = Column(String, primary_key=True, default=gen_uuid)
    type = Column(Enum(ConversationType), nullable=False, default=ConversationType.direct)
    name = Column(String, nullable=True)  # group name only
    avatar_color = Column(String, default="#3A76F0")
    created_by = Column(String, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=utcnow)
    last_message_at = Column(DateTime, default=utcnow, index=True)

    members = relationship("ConversationMember", back_populates="conversation", cascade="all, delete-orphan")
    messages = relationship(
        "Message", back_populates="conversation", cascade="all, delete-orphan", order_by="Message.created_at"
    )


class ConversationMember(Base):
    __tablename__ = "conversation_members"
    __table_args__ = (UniqueConstraint("conversation_id", "user_id", name="uq_conversation_user"),)

    id = Column(String, primary_key=True, default=gen_uuid)
    conversation_id = Column(String, ForeignKey("conversations.id"), nullable=False)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    role = Column(Enum(MemberRole), default=MemberRole.member)
    joined_at = Column(DateTime, default=utcnow)
    last_read_message_at = Column(DateTime, nullable=True)  # drives unread counts
    is_muted = Column(Boolean, default=False)

    conversation = relationship("Conversation", back_populates="members")
    user = relationship("User", back_populates="memberships")


# ---------------------------------------------------------------------------
# Messages
# ---------------------------------------------------------------------------
class Message(Base):
    __tablename__ = "messages"

    id = Column(String, primary_key=True, default=gen_uuid)
    conversation_id = Column(String, ForeignKey("conversations.id"), nullable=False, index=True)
    sender_id = Column(String, ForeignKey("users.id"), nullable=False)
    body = Column(Text, nullable=True)
    reply_to_id = Column(String, ForeignKey("messages.id"), nullable=True)
    is_system = Column(Boolean, default=False)  # "X added Y to the group" style events
    status = Column(Enum(MessageStatus), default=MessageStatus.sent)
    created_at = Column(DateTime, default=utcnow, index=True)
    edited_at = Column(DateTime, nullable=True)
    deleted_at = Column(DateTime, nullable=True)
    disappears_in_seconds = Column(Integer, nullable=True)

    sender = relationship("User", back_populates="messages")
    conversation = relationship("Conversation", back_populates="messages")
    reply_to = relationship("Message", remote_side=[id])
    receipts = relationship("MessageReceipt", back_populates="message", cascade="all, delete-orphan")
    reactions = relationship("MessageReaction", back_populates="message", cascade="all, delete-orphan")
    attachments = relationship("Attachment", back_populates="message", cascade="all, delete-orphan")


class MessageReceipt(Base):
    """Per-recipient delivery/read receipt - needed for accurate group check-marks."""
    __tablename__ = "message_receipts"
    __table_args__ = (UniqueConstraint("message_id", "user_id", name="uq_message_user_receipt"),)

    id = Column(String, primary_key=True, default=gen_uuid)
    message_id = Column(String, ForeignKey("messages.id"), nullable=False)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    delivered_at = Column(DateTime, nullable=True)
    read_at = Column(DateTime, nullable=True)

    message = relationship("Message", back_populates="receipts")
    user = relationship("User")


class MessageReaction(Base):
    __tablename__ = "message_reactions"
    __table_args__ = (UniqueConstraint("message_id", "user_id", name="uq_message_user_reaction"),)

    id = Column(String, primary_key=True, default=gen_uuid)
    message_id = Column(String, ForeignKey("messages.id"), nullable=False)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    emoji = Column(String, nullable=False)
    created_at = Column(DateTime, default=utcnow)

    message = relationship("Message", back_populates="reactions")
    user = relationship("User")


class Attachment(Base):
    __tablename__ = "attachments"

    id = Column(String, primary_key=True, default=gen_uuid)
    message_id = Column(String, ForeignKey("messages.id"), nullable=False)
    file_name = Column(String, nullable=False)
    file_url = Column(String, nullable=False)
    mime_type = Column(String, nullable=True)
    size_bytes = Column(Integer, nullable=True)

    message = relationship("Message", back_populates="attachments")
