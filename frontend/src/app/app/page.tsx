"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { useAuthStore } from "@/lib/store";
import { api } from "@/lib/api";
import { Conversation, Contact, Message, User, WsEvent } from "@/types";
import { useSocket } from "@/hooks/useSocket";
import Sidebar from "@/components/Sidebar";
import ChatWindow from "@/components/ChatWindow";
import NewChatModal from "@/components/NewChatModal";
import NewGroupModal from "@/components/NewGroupModal";
import ConversationInfoModal from "@/components/ConversationInfoModal";
import SettingsModal from "@/components/SettingsModal";
import { useToastStore } from "@/components/Toast";
import { MessageCircle } from "lucide-react";

type ModalType = "newChat" | "newGroup" | "info" | "settings" | null;

export default function HomePage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading, hydrate, updateUser, logout } = useAuthStore();
  const push = useToastStore((s) => s.push);

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messagesByConv, setMessagesByConv] = useState<Record<string, Message[]>>({});
  const [onlineIds, setOnlineIds] = useState<Set<string>>(new Set());
  const [typingByConv, setTypingByConv] = useState<Record<string, Set<string>>>({});
  const [modal, setModal] = useState<ModalType>(null);
  const [mobileShowChat, setMobileShowChat] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  const activeIdRef = useRef<string | null>(null);
  activeIdRef.current = activeId;

  // ---- initial auth check ----
  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.replace("/login");
  }, [isLoading, isAuthenticated, router]);

  // ---- dark mode ----
  useEffect(() => {
    const stored = localStorage.getItem("signal_dark_mode");
    if (stored === "true") setDarkMode(true);
  }, []);
  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
    localStorage.setItem("signal_dark_mode", String(darkMode));
  }, [darkMode]);

  // ---- load conversations + contacts ----
  const loadConversations = useCallback(async () => {
    const res = await api.get<Conversation[]>("/conversations");
    setConversations(res.data);
  }, []);

  const loadContacts = useCallback(async () => {
    const res = await api.get<Contact[]>("/contacts");
    setContacts(res.data);
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      loadConversations();
      loadContacts();
    }
  }, [isAuthenticated, loadConversations, loadContacts]);

  // ---- load messages for active conversation ----
  const loadMessages = useCallback(async (conversationId: string) => {
    const res = await api.get<Message[]>(`/conversations/${conversationId}/messages`);
    setMessagesByConv((prev) => ({ ...prev, [conversationId]: res.data }));
    await api.post(`/conversations/${conversationId}/read`);
    setConversations((prev) => prev.map((c) => (c.id === conversationId ? { ...c, unread_count: 0 } : c)));
  }, []);

  useEffect(() => {
    if (activeId) loadMessages(activeId);
  }, [activeId, loadMessages]);

  // ---- websocket event handling ----
  const handleWsEvent = useCallback((event: WsEvent) => {
    switch (event.type) {
      case "new_message": {
        const msg = event.message as Message;
        const clientId = event.client_id as string | undefined;
        setMessagesByConv((prev) => {
          const existing = prev[event.conversation_id] || [];
          // This is the self-echo of a message we just sent from this tab.
          // Swap the optimistic bubble in place instead of appending a new
          // one — the websocket echo can arrive before the HTTP response.
          if (clientId) {
            const tempIdx = existing.findIndex((m) => m.id === clientId);
            if (tempIdx !== -1) {
              const next = [...existing];
              next[tempIdx] = msg;
              return { ...prev, [event.conversation_id]: next };
            }
          }
          if (existing.some((m) => m.id === msg.id)) return prev;
          return { ...prev, [event.conversation_id]: [...existing, msg] };
        });
        setConversations((prev) => {
          const idx = prev.findIndex((c) => c.id === event.conversation_id);
          if (idx === -1) return prev;
          const conv = { ...prev[idx] };
          conv.last_message = {
            id: msg.id, body: msg.body, sender_id: msg.sender_id,
            created_at: msg.created_at, status: msg.status, is_system: msg.is_system,
          };
          conv.updated_at = msg.created_at;
          const isActiveAndVisible = activeIdRef.current === event.conversation_id;
          if (msg.sender_id !== user?.id && !isActiveAndVisible) {
            conv.unread_count = (conv.unread_count || 0) + 1;
          }
          const rest = prev.filter((c) => c.id !== event.conversation_id);
          return [conv, ...rest];
        });
        if (activeIdRef.current === event.conversation_id && msg.sender_id !== user?.id) {
          api.post(`/conversations/${event.conversation_id}/read`).catch(() => {});
        }
        if (msg.sender_id !== user?.id && activeIdRef.current !== event.conversation_id) {
          push(`New message`);
        }
        break;
      }
      case "typing": {
        setTypingByConv((prev) => {
          const set = new Set(prev[event.conversation_id] || []);
          if (event.is_typing) set.add(event.user_id);
          else set.delete(event.user_id);
          return { ...prev, [event.conversation_id]: set };
        });
        break;
      }
      case "presence": {
        setOnlineIds((prev) => {
          const next = new Set(prev);
          if (event.is_online) next.add(event.user_id);
          else next.delete(event.user_id);
          return next;
        });
        break;
      }
      case "messages_read": {
        setMessagesByConv((prev) => {
          const existing = prev[event.conversation_id];
          if (!existing) return prev;
          return {
            ...prev,
            [event.conversation_id]: existing.map((m) =>
              m.sender_id === user?.id ? { ...m, status: "read" } : m
            ),
          };
        });
        break;
      }
      case "message_reaction": {
        const msg = event.message as Message;
        setMessagesByConv((prev) => {
          const existing = prev[event.conversation_id];
          if (!existing) return prev;
          return { ...prev, [event.conversation_id]: existing.map((m) => (m.id === msg.id ? msg : m)) };
        });
        break;
      }
      case "message_deleted": {
        setMessagesByConv((prev) => {
          const existing = prev[event.conversation_id];
          if (!existing) return prev;
          return {
            ...prev,
            [event.conversation_id]: existing.map((m) => (m.id === event.message_id ? { ...m, body: null } : m)),
          };
        });
        break;
      }
    }
  }, [user, push]);

  const { sendTyping } = useSocket(handleWsEvent, isAuthenticated);

  // ---- actions ----
  const activeConversation = useMemo(() => conversations.find((c) => c.id === activeId) || null, [conversations, activeId]);
  const activeMessages = activeId ? messagesByConv[activeId] || [] : [];

  const handleSelectConversation = (id: string) => {
    setActiveId(id);
    setMobileShowChat(true);
  };

  const handleSend = async (body: string, replyToId?: string) => {
    if (!activeId || !user) return;
    const tempId = `temp-${Date.now()}`;
    const optimistic: Message = {
      id: tempId, conversation_id: activeId, sender_id: user.id, body,
      reply_to_id: replyToId, is_system: false, status: "sending",
      created_at: new Date().toISOString(), reactions: [], _pending: true,
    };
    setMessagesByConv((prev) => ({ ...prev, [activeId]: [...(prev[activeId] || []), optimistic] }));

    try {
      const res = await api.post<Message>(`/conversations/${activeId}/messages`, {
        body, reply_to_id: replyToId, client_id: tempId,
      });
      setMessagesByConv((prev) => ({
        ...prev,
        // If the websocket echo already swapped the optimistic bubble for the
        // real message, this map is a harmless no-op (no entry has id===tempId
        // anymore), so we never end up with two copies.
        [activeId]: (prev[activeId] || []).map((m) => (m.id === tempId ? res.data : m)),
      }));
      setConversations((prev) => {
        const idx = prev.findIndex((c) => c.id === activeId);
        if (idx === -1) return prev;
        const conv = { ...prev[idx] };
        conv.last_message = {
          id: res.data.id, body: res.data.body, sender_id: res.data.sender_id,
          created_at: res.data.created_at, status: res.data.status, is_system: false,
        };
        const rest = prev.filter((c) => c.id !== activeId);
        return [conv, ...rest];
      });
    } catch {
      setMessagesByConv((prev) => ({
        ...prev,
        [activeId]: (prev[activeId] || []).map((m) => (m.id === tempId ? { ...m, _failed: true, _pending: false } : m)),
      }));
      push("Message failed to send");
    }
  };

  const handleReact = async (messageId: string, emoji: string) => {
    if (!activeId) return;
    await api.post(`/conversations/${activeId}/messages/${messageId}/reactions`, { emoji });
  };

  const handleTyping = (isTyping: boolean) => {
    if (activeId) sendTyping(activeId, isTyping);
  };

  const startDirectChat = async (userId: string) => {
    const res = await api.post<Conversation>("/conversations/direct", { user_id: userId });
    setConversations((prev) => {
      const exists = prev.some((c) => c.id === res.data.id);
      return exists ? prev.map((c) => (c.id === res.data.id ? res.data : c)) : [res.data, ...prev];
    });
    setActiveId(res.data.id);
    setMobileShowChat(true);
    setModal(null);
  };

  const createGroup = async (name: string, memberIds: string[]) => {
    const res = await api.post<Conversation>("/conversations/group", { name, member_ids: memberIds });
    setConversations((prev) => [res.data, ...prev]);
    setActiveId(res.data.id);
    setMobileShowChat(true);
    setModal(null);
    push(`Group "${name}" created`);
  };

  const handleConversationUpdated = (conv: Conversation) => {
    setConversations((prev) => prev.map((c) => (c.id === conv.id ? conv : c)));
    if (!conv.members.some((m) => m.user.id === user?.id)) {
      setActiveId(null);
      setModal(null);
      push("You left the group");
    }
  };

  const handleLogout = async () => {
    await logout();
    router.replace("/login");
  };

  if (isLoading || !user) return null;

  const typingNames = activeId
    ? Array.from(typingByConv[activeId] || [])
        .map((uid) => activeConversation?.members.find((m) => m.user.id === uid)?.user.display_name)
        .filter(Boolean) as string[]
    : [];

  return (
    <div className="h-screen w-screen flex overflow-hidden bg-white dark:bg-signal-bg-dark">
      {/* Sidebar */}
      <div className={clsx("w-full md:w-[380px] shrink-0 h-full", mobileShowChat && "hidden md:block")}>
        <Sidebar
          me={user}
          conversations={conversations}
          activeId={activeId}
          onSelect={handleSelectConversation}
          onNewChat={() => setModal("newChat")}
          onNewGroup={() => setModal("newGroup")}
          onOpenSettings={() => setModal("settings")}
          onlineIds={onlineIds}
        />
      </div>

      {/* Chat pane */}
      <div className={clsx("flex-1 h-full", !mobileShowChat && "hidden md:block")}>
        {activeConversation ? (
          <ChatWindow
            me={user}
            conversation={activeConversation}
            messages={activeMessages}
            typingUserNames={typingNames}
            onlineIds={onlineIds}
            onSend={handleSend}
            onReact={handleReact}
            onTyping={handleTyping}
            onBack={() => setMobileShowChat(false)}
            onOpenInfo={() => setModal("info")}
          />
        ) : (
          <div className="h-full flex flex-col items-center justify-center bg-[#F7F7F8] dark:bg-signal-bg-dark-secondary text-center px-6">
            <div className="w-20 h-20 rounded-3xl bg-signal-blue/10 flex items-center justify-center mb-4">
              <MessageCircle size={40} className="text-signal-blue" />
            </div>
            <h2 className="text-xl font-semibold mb-1">Select a chat</h2>
            <p className="text-signal-text-secondary dark:text-signal-text-secondary-dark text-sm max-w-xs">
              Choose a conversation from the list, or start a new one to begin messaging.
            </p>
          </div>
        )}
      </div>

      {/* Modals */}
      {modal === "newChat" && (
        <NewChatModal
          contacts={contacts}
          onClose={() => setModal(null)}
          onStartChat={startDirectChat}
          onAddContact={(u: User) => {
            setContacts((prev) => [...prev, { id: `temp-${u.id}`, nickname: null, user: u }]);
          }}
        />
      )}
      {modal === "newGroup" && (
        <NewGroupModal contacts={contacts} onClose={() => setModal(null)} onCreate={createGroup} />
      )}
      {modal === "info" && activeConversation && (
        <ConversationInfoModal
          conversation={activeConversation}
          me={user}
          contacts={contacts}
          onClose={() => setModal(null)}
          onUpdated={handleConversationUpdated}
          onAddMembersClick={() => setModal("newChat")}
        />
      )}
      {modal === "settings" && (
        <SettingsModal
          me={user}
          onClose={() => setModal(null)}
          onUpdated={(patch) => updateUser(patch)}
          onLogout={handleLogout}
          darkMode={darkMode}
          onToggleDarkMode={() => setDarkMode((v) => !v)}
        />
      )}
    </div>
  );
}
