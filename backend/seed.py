"""
Seed the database with demo users, contacts, direct + group conversations, and messages
so the app is immediately usable.

Run with:  python seed.py
"""
import random
from datetime import datetime, timedelta, timezone

from app.core.database import Base, engine, SessionLocal
from app.models import (
    User, Contact, Conversation, ConversationMember, ConversationType, MemberRole,
    Message, MessageStatus, MessageReaction,
)

Base.metadata.drop_all(bind=engine)
Base.metadata.create_all(bind=engine)

db = SessionLocal()

now = datetime.now(timezone.utc)

DEMO_USERS = [
    {"username": "alex", "phone_number": "+15550100001", "display_name": "Alex Carter", "avatar_color": "#2C6BED", "about": "Busy building things"},
    {"username": "priya", "phone_number": "+15550100002", "display_name": "Priya Nair", "avatar_color": "#E63950", "about": "Available"},
    {"username": "sam", "phone_number": "+15550100003", "display_name": "Sam Okafor", "avatar_color": "#4CAF50", "about": "At the gym 💪"},
    {"username": "mira", "phone_number": "+15550100004", "display_name": "Mira Chen", "avatar_color": "#9C27B0", "about": "Encrypted, as always."},
    {"username": "leo", "phone_number": "+15550100005", "display_name": "Leo Fischer", "avatar_color": "#FF9500", "about": "Signal > everything"},
]

users = {}
for u in DEMO_USERS:
    user = User(**u, is_online=random.choice([True, False]), last_seen=now - timedelta(minutes=random.randint(0, 500)))
    db.add(user)
    users[u["username"]] = user
db.flush()

# Primary demo account we log in as: Alex. Everyone else is a contact.
me = users["alex"]
for uname, u in users.items():
    if uname == "alex":
        continue
    db.add(Contact(owner_id=me.id, contact_user_id=u.id))
    db.add(Contact(owner_id=u.id, contact_user_id=me.id))
db.flush()


def add_message(conv, sender, body, minutes_ago, status=MessageStatus.read, is_system=False):
    msg = Message(
        conversation_id=conv.id, sender_id=sender.id, body=body, is_system=is_system,
        status=status, created_at=now - timedelta(minutes=minutes_ago),
    )
    db.add(msg)
    return msg


# ---------------- Direct conversations ----------------
def make_direct(a, b):
    conv = Conversation(type=ConversationType.direct, created_by=a.id, last_message_at=now)
    db.add(conv)
    db.flush()
    db.add(ConversationMember(conversation_id=conv.id, user_id=a.id))
    db.add(ConversationMember(conversation_id=conv.id, user_id=b.id))
    db.flush()
    return conv

conv_priya = make_direct(me, users["priya"])
add_message(conv_priya, users["priya"], "Hey! Did you get a chance to look at the designs?", 120)
add_message(conv_priya, me, "Yes! They look great, love the new color palette 🎨", 115)
add_message(conv_priya, users["priya"], "Awesome, glad you like it", 110)
add_message(conv_priya, users["priya"], "Can we sync tomorrow at 10?", 20, status=MessageStatus.delivered)
conv_priya.last_message_at = now - timedelta(minutes=20)

conv_sam = make_direct(me, users["sam"])
add_message(conv_sam, me, "Gym at 6?", 300)
add_message(conv_sam, users["sam"], "See you there 🏋️", 295)
add_message(conv_sam, users["sam"], "Bring the resistance bands", 5, status=MessageStatus.sent)
conv_sam.last_message_at = now - timedelta(minutes=5)

conv_mira = make_direct(me, users["mira"])
add_message(conv_mira, users["mira"], "This message will disappear soon 👀", 600)
add_message(conv_mira, me, "haha nice, testing the feature?", 595)
conv_mira.last_message_at = now - timedelta(minutes=595)

conv_leo = make_direct(me, users["leo"])
add_message(conv_leo, users["leo"], "Ping me when you're free", 2, status=MessageStatus.delivered)
conv_leo.last_message_at = now - timedelta(minutes=2)

# ---------------- Group conversation ----------------
group = Conversation(type=ConversationType.group, name="Weekend Trip 🏔️", avatar_color="#3A76F0", created_by=me.id, last_message_at=now)
db.add(group)
db.flush()
db.add(ConversationMember(conversation_id=group.id, user_id=me.id, role=MemberRole.admin))
for uname in ["priya", "sam", "mira"]:
    db.add(ConversationMember(conversation_id=group.id, user_id=users[uname].id, role=MemberRole.member))
db.flush()

add_message(group, me, f"{me.display_name} created the group \"Weekend Trip 🏔️\"", 200, is_system=True)
add_message(group, me, "Who's in for the mountains this weekend?", 190)
add_message(group, users["priya"], "Count me in!", 185)
add_message(group, users["sam"], "Same, need to buy a jacket though", 180)
m1 = add_message(group, users["mira"], "I'll bring the tent 🏕️", 30, status=MessageStatus.delivered)
db.flush()
db.add(MessageReaction(message_id=m1.id, user_id=me.id, emoji="🔥"))
db.add(MessageReaction(message_id=m1.id, user_id=users["priya"].id, emoji="❤️"))
group.last_message_at = now - timedelta(minutes=30)

db.commit()
print("Seed complete.")
print("Demo accounts (login via username, no password needed - mocked auth):")
for u in DEMO_USERS:
    print(f"  - username: {u['username']:6s}  phone: {u['phone_number']}  name: {u['display_name']}")
print("\nLog in as 'alex' to see the fully seeded inbox (Priya, Sam, Mira, Leo + 'Weekend Trip' group).")
