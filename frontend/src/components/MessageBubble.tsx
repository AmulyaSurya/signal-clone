"use client";

import { useState } from "react";
import clsx from "clsx";
import { Message, User } from "@/types";
import { formatMessageTime } from "@/lib/utils";
import StatusTicks from "./StatusTicks";
import { SmilePlus, Reply } from "lucide-react";

const QUICK_REACTIONS = ["❤️", "😂", "😮", "😢", "🙏", "👍"];

interface MessageBubbleProps {
  message: Message;
  isMine: boolean;
  sender?: User;
  showSenderName: boolean;
  onReact: (emoji: string) => void;
  onReply: () => void;
}

export default function MessageBubble({ message, isMine, sender, showSenderName, onReact, onReply }: MessageBubbleProps) {
  const [showPicker, setShowPicker] = useState(false);

  if (message.is_system) {
    return (
      <div className="flex justify-center my-2 animate-fade-in">
        <span className="text-xs text-signal-text-secondary dark:text-signal-text-secondary-dark bg-signal-bg-secondary dark:bg-signal-bg-dark-elevated px-3 py-1 rounded-full">
          {message.body}
        </span>
      </div>
    );
  }

  const groupedReactions = message.reactions.reduce<Record<string, number>>((acc, r) => {
    acc[r.emoji] = (acc[r.emoji] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className={clsx("group flex mb-0.5 animate-fade-in", isMine ? "justify-end" : "justify-start")}>
      <div className={clsx("flex items-end gap-1.5 max-w-[70%]", isMine && "flex-row-reverse")}>
        <div
          className={clsx(
            "relative rounded-2xl px-3.5 py-2 shadow-sm",
            isMine
              ? "bg-signal-blue text-white rounded-br-sm"
              : "bg-signal-bubble-in dark:bg-signal-bubble-in-dark text-signal-text dark:text-signal-text-dark rounded-bl-sm"
          )}
        >
          {showSenderName && sender && !isMine && (
            <div className="text-xs font-semibold mb-0.5" style={{ color: sender.avatar_color }}>
              {sender.display_name}
            </div>
          )}
          {message.body === null ? (
            <p className="text-sm italic opacity-60">Message deleted</p>
          ) : (
            <p className="text-[15px] leading-snug whitespace-pre-wrap break-words">{message.body}</p>
          )}
          <div className={clsx("flex items-center gap-1 mt-1 justify-end select-none", isMine ? "text-white/70" : "text-signal-text-secondary dark:text-signal-text-secondary-dark")}>
            <span className="text-[11px]">{formatMessageTime(message.created_at)}</span>
            {isMine && <StatusTicks status={message.status} />}
          </div>

          {Object.keys(groupedReactions).length > 0 && (
            <div className={clsx("absolute -bottom-3 flex gap-0.5 bg-white dark:bg-signal-bg-dark-elevated rounded-full px-1.5 py-0.5 shadow border border-signal-border dark:border-signal-border-dark", isMine ? "right-2" : "left-2")}>
              {Object.entries(groupedReactions).map(([emoji, count]) => (
                <span key={emoji} className="text-xs">
                  {emoji}
                  {count > 1 && <span className="text-[10px] text-signal-text-secondary ml-0.5">{count}</span>}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* hover actions */}
        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5 shrink-0">
          <div className="relative">
            <button
              onClick={() => setShowPicker((v) => !v)}
              className="p-1.5 rounded-full hover:bg-signal-list-hover dark:hover:bg-signal-list-hover-dark text-signal-text-secondary dark:text-signal-text-secondary-dark"
              aria-label="React"
            >
              <SmilePlus size={16} />
            </button>
            {showPicker && (
              <div className={clsx("absolute z-10 top-8 flex gap-1 bg-white dark:bg-signal-bg-dark-elevated rounded-full shadow-lg border border-signal-border dark:border-signal-border-dark px-2 py-1.5", isMine ? "right-0" : "left-0")}>
                {QUICK_REACTIONS.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => {
                      onReact(emoji);
                      setShowPicker(false);
                    }}
                    className="text-lg hover:scale-125 transition-transform"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button
            onClick={onReply}
            className="p-1.5 rounded-full hover:bg-signal-list-hover dark:hover:bg-signal-list-hover-dark text-signal-text-secondary dark:text-signal-text-secondary-dark"
            aria-label="Reply"
          >
            <Reply size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
