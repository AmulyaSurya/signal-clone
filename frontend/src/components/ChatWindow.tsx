"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Info, Phone, Send, Video, X } from "lucide-react";
import { Conversation, Message, User } from "@/types";
import Avatar from "./Avatar";
import MessageBubble from "./MessageBubble";
import TypingIndicator from "./TypingIndicator";
import { formatDayDivider, formatLastSeen } from "@/lib/utils";

interface ChatWindowProps {
  me: User;
  conversation: Conversation;
  messages: Message[];
  typingUserNames: string[];
  onlineIds: Set<string>;
  onSend: (body: string, replyToId?: string) => void;
  onReact: (messageId: string, emoji: string) => void;
  onTyping: (isTyping: boolean) => void;
  onBack: () => void;
  onOpenInfo: () => void;
}

function otherMember(conv: Conversation, meId: string) {
  return conv.members.find((m) => m.user.id !== meId)?.user;
}

export default function ChatWindow({
  me, conversation, messages, typingUserNames, onlineIds, onSend, onReact, onTyping, onBack, onOpenInfo,
}: ChatWindowProps) {
  const [draft, setDraft] = useState("");
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const typingTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const other = conversation.type === "direct" ? otherMember(conversation, me.id) : undefined;
  const title = conversation.type === "group" ? conversation.name ?? "Group" : other?.display_name ?? "Unknown";
  const isOnline = other ? onlineIds.has(other.id) : false;

  const subtitle = useMemo(() => {
    if (typingUserNames.length > 0) return `${typingUserNames.join(", ")} typing...`;
    if (conversation.type === "group") {
      return `${conversation.members.length} members`;
    }
    if (isOnline) return "Online";
    return other ? formatLastSeen(other.last_seen) : "";
  }, [typingUserNames, conversation, isOnline, other]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, typingUserNames.length]);

  const senderById = (id: string) => conversation.members.find((m) => m.user.id === id)?.user;

  const handleChange = (val: string) => {
    setDraft(val);
    onTyping(true);
    if (typingTimeout.current) clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => onTyping(false), 1500);
  };

  const handleSend = () => {
    const body = draft.trim();
    if (!body) return;
    onSend(body, replyTo?.id);
    setDraft("");
    setReplyTo(null);
    onTyping(false);
    if (typingTimeout.current) clearTimeout(typingTimeout.current);
  };

  let lastDay = "";

  return (
    <div className="flex flex-col h-full w-full bg-[#F7F7F8] dark:bg-signal-bg-dark-secondary">
      {/* Header */}
      <div className="flex items-center gap-3 h-16 px-4 shrink-0 border-b border-signal-border dark:border-signal-border-dark bg-white dark:bg-signal-bg-dark">
        <button onClick={onBack} className="md:hidden p-1 -ml-1 text-signal-blue">
          <ArrowLeft size={22} />
        </button>
        <button onClick={onOpenInfo} className="flex items-center gap-3 flex-1 min-w-0 text-left">
          <Avatar name={title} color={conversation.avatar_color} size={38} isGroup={conversation.type === "group"} online={isOnline} />
          <div className="min-w-0">
            <div className="font-semibold text-[15px] truncate">{title}</div>
            <div className="text-xs text-signal-text-secondary dark:text-signal-text-secondary-dark truncate">{subtitle}</div>
          </div>
        </button>
        <div className="flex items-center gap-1 text-signal-blue">
          <button className="p-2 rounded-full hover:bg-signal-list-hover dark:hover:bg-signal-list-hover-dark" title="Voice call (coming soon)">
            <Phone size={19} />
          </button>
          <button className="p-2 rounded-full hover:bg-signal-list-hover dark:hover:bg-signal-list-hover-dark" title="Video call (coming soon)">
            <Video size={20} />
          </button>
          <button onClick={onOpenInfo} className="p-2 rounded-full hover:bg-signal-list-hover dark:hover:bg-signal-list-hover-dark" title="Conversation info">
            <Info size={19} />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3">
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center text-signal-text-secondary dark:text-signal-text-secondary-dark px-6">
            <Avatar name={title} color={conversation.avatar_color} size={72} isGroup={conversation.type === "group"} />
            <p className="mt-3 font-medium text-signal-text dark:text-signal-text-dark">{title}</p>
            <p className="text-sm mt-1">
              {conversation.type === "group" ? "This is the start of your group." : "Say hi to start the conversation."}
            </p>
          </div>
        )}
        {messages.map((m) => {
          const day = formatDayDivider(m.created_at);
          const showDivider = day !== lastDay;
          lastDay = day;
          const isMine = m.sender_id === me.id;
          const prevMsg = messages[messages.indexOf(m) - 1];
          const showSenderName = conversation.type === "group" && !isMine && (!prevMsg || prevMsg.sender_id !== m.sender_id);

          return (
            <div key={m.id}>
              {showDivider && (
                <div className="flex justify-center my-3">
                  <span className="text-xs font-medium text-signal-text-secondary dark:text-signal-text-secondary-dark bg-white dark:bg-signal-bg-dark-elevated px-3 py-1 rounded-full shadow-sm">
                    {day}
                  </span>
                </div>
              )}
              <MessageBubble
                message={m}
                isMine={isMine}
                sender={senderById(m.sender_id)}
                showSenderName={showSenderName}
                onReact={(emoji) => onReact(m.id, emoji)}
                onReply={() => setReplyTo(m)}
              />
            </div>
          );
        })}
        {typingUserNames.length > 0 && (
          <div className="mt-2">
            <TypingIndicator />
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Reply preview */}
      {replyTo && (
        <div className="flex items-center justify-between px-4 py-2 bg-white dark:bg-signal-bg-dark border-t border-signal-border dark:border-signal-border-dark">
          <div className="flex items-start gap-2 border-l-2 border-signal-blue pl-2 min-w-0">
            <div className="min-w-0">
              <p className="text-xs font-semibold text-signal-blue">
                {senderById(replyTo.sender_id)?.display_name ?? "Message"}
              </p>
              <p className="text-sm text-signal-text-secondary dark:text-signal-text-secondary-dark truncate max-w-[280px]">
                {replyTo.body}
              </p>
            </div>
          </div>
          <button onClick={() => setReplyTo(null)} className="p-1 text-signal-text-secondary dark:text-signal-text-secondary-dark">
            <X size={18} />
          </button>
        </div>
      )}

      {/* Composer */}
      <div className="flex items-end gap-2 px-4 py-3 shrink-0 bg-white dark:bg-signal-bg-dark border-t border-signal-border dark:border-signal-border-dark">
        <textarea
          value={draft}
          onChange={(e) => handleChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          placeholder="Signal message"
          rows={1}
          className="flex-1 resize-none bg-signal-bg-secondary dark:bg-signal-bg-dark-elevated rounded-2xl px-4 py-2.5 text-[15px] outline-none max-h-32 placeholder:text-signal-text-secondary dark:placeholder:text-signal-text-secondary-dark"
        />
        <button
          onClick={handleSend}
          disabled={!draft.trim()}
          className="p-2.5 rounded-full bg-signal-blue text-white disabled:opacity-40 disabled:cursor-not-allowed shrink-0 hover:brightness-110 transition"
          aria-label="Send"
        >
          <Send size={18} />
        </button>
      </div>
    </div>
  );
}
