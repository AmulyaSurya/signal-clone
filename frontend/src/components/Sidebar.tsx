"use client";

import { useMemo, useState } from "react";
import clsx from "clsx";
import { MessageSquarePlus, Search, Settings, Users2 } from "lucide-react";
import { Conversation, User } from "@/types";
import Avatar from "./Avatar";
import { formatConversationTime } from "@/lib/utils";
import StatusTicks from "./StatusTicks";

interface SidebarProps {
  me: User;
  conversations: Conversation[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNewChat: () => void;
  onNewGroup: () => void;
  onOpenSettings: () => void;
  onlineIds: Set<string>;
}

function otherMember(conv: Conversation, meId: string) {
  return conv.members.find((m) => m.user.id !== meId)?.user;
}

export default function Sidebar({ me, conversations, activeId, onSelect, onNewChat, onNewGroup, onOpenSettings, onlineIds }: SidebarProps) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    if (!query.trim()) return conversations;
    const q = query.toLowerCase();
    return conversations.filter((c) => {
      const name = c.type === "group" ? c.name ?? "" : otherMember(c, me.id)?.display_name ?? "";
      return name.toLowerCase().includes(q);
    });
  }, [conversations, query, me.id]);

  return (
    <div className="flex flex-col h-full w-full border-r border-signal-border dark:border-signal-border-dark bg-white dark:bg-signal-bg-dark">
      {/* Header */}
      <div className="flex items-center justify-between px-4 h-16 shrink-0 border-b border-signal-border dark:border-signal-border-dark">
        <button onClick={onOpenSettings} className="flex items-center gap-2 group">
          <Avatar name={me.display_name} color={me.avatar_color} size={36} />
        </button>
        <h1 className="text-lg font-semibold">Chats</h1>
        <div className="flex items-center gap-1">
          <button
            onClick={onNewGroup}
            className="p-2 rounded-full hover:bg-signal-list-hover dark:hover:bg-signal-list-hover-dark text-signal-blue"
            aria-label="New group"
            title="New group"
          >
            <Users2 size={20} />
          </button>
          <button
            onClick={onNewChat}
            className="p-2 rounded-full hover:bg-signal-list-hover dark:hover:bg-signal-list-hover-dark text-signal-blue"
            aria-label="New chat"
            title="New chat"
          >
            <MessageSquarePlus size={20} />
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="px-3 py-2 shrink-0">
        <div className="flex items-center gap-2 bg-signal-bg-secondary dark:bg-signal-bg-dark-elevated rounded-lg px-3 py-2">
          <Search size={16} className="text-signal-text-secondary dark:text-signal-text-secondary-dark shrink-0" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search"
            className="bg-transparent outline-none text-sm w-full placeholder:text-signal-text-secondary dark:placeholder:text-signal-text-secondary-dark"
          />
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto no-scrollbar">
        {filtered.length === 0 ? (
          <div className="text-center text-sm text-signal-text-secondary dark:text-signal-text-secondary-dark mt-10 px-6">
            {query ? "No chats found" : "No conversations yet. Start a new chat!"}
          </div>
        ) : (
          filtered.map((conv) => {
            const other = conv.type === "direct" ? otherMember(conv, me.id) : undefined;
            const isOnline = other ? onlineIds.has(other.id) : false;
            const displayName = conv.type === "group" ? conv.name ?? "Group" : other?.display_name ?? "Unknown";
            const lastMsg = conv.last_message;
            const isMineLast = lastMsg?.sender_id === me.id;

            return (
              <button
                key={conv.id}
                onClick={() => onSelect(conv.id)}
                className={clsx(
                  "w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors",
                  activeId === conv.id
                    ? "bg-signal-list-active dark:bg-signal-list-active-dark"
                    : "hover:bg-signal-list-hover dark:hover:bg-signal-list-hover-dark"
                )}
              >
                <Avatar
                  name={displayName}
                  color={conv.avatar_color}
                  size={48}
                  isGroup={conv.type === "group"}
                  online={isOnline}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-[15px] truncate">{displayName}</span>
                    {lastMsg && (
                      <span
                        className={clsx(
                          "text-xs shrink-0 ml-2",
                          conv.unread_count > 0 ? "text-signal-blue font-medium" : "text-signal-text-secondary dark:text-signal-text-secondary-dark"
                        )}
                      >
                        {formatConversationTime(lastMsg.created_at)}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between mt-0.5">
                    <div className="flex items-center gap-1 min-w-0 text-signal-text-secondary dark:text-signal-text-secondary-dark text-sm">
                      {isMineLast && !lastMsg?.is_system && (
                        <span className="shrink-0"><StatusTicks status={lastMsg!.status} /></span>
                      )}
                      <span className="truncate">
                        {lastMsg ? (lastMsg.is_system ? lastMsg.body : lastMsg.body || "📎 Attachment") : "Say hello 👋"}
                      </span>
                    </div>
                    {conv.unread_count > 0 && (
                      <span className="shrink-0 ml-2 bg-signal-blue text-white text-[11px] font-semibold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                        {conv.unread_count > 99 ? "99+" : conv.unread_count}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
