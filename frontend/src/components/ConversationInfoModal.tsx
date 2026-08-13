"use client";

import { useState } from "react";
import { Shield, UserMinus, UserPlus } from "lucide-react";
import { Conversation, Contact, User } from "@/types";
import Avatar from "./Avatar";
import Modal from "./Modal";
import { api } from "@/lib/api";

interface ConversationInfoModalProps {
  conversation: Conversation;
  me: User;
  contacts: Contact[];
  onClose: () => void;
  onUpdated: (conv: Conversation) => void;
  onAddMembersClick: () => void;
}

export default function ConversationInfoModal({
  conversation, me, contacts, onClose, onUpdated, onAddMembersClick,
}: ConversationInfoModalProps) {
  const [busy, setBusy] = useState<string | null>(null);
  const myRole = conversation.members.find((m) => m.user.id === me.id)?.role;
  const isAdmin = myRole === "admin";

  const removeMember = async (userId: string) => {
    setBusy(userId);
    try {
      const res = await api.delete(`/conversations/${conversation.id}/members/${userId}`);
      onUpdated(res.data);
    } finally {
      setBusy(null);
    }
  };

  const other = conversation.type === "direct" ? conversation.members.find((m) => m.user.id !== me.id)?.user : null;

  return (
    <Modal title={conversation.type === "group" ? "Group info" : "Contact info"} onClose={onClose}>
      <div className="p-5 flex flex-col items-center border-b border-signal-border dark:border-signal-border-dark">
        <Avatar
          name={conversation.type === "group" ? conversation.name ?? "Group" : other?.display_name ?? ""}
          color={conversation.avatar_color}
          size={88}
          isGroup={conversation.type === "group"}
        />
        <h3 className="mt-3 font-semibold text-lg">
          {conversation.type === "group" ? conversation.name : other?.display_name}
        </h3>
        {conversation.type === "direct" && other && (
          <p className="text-sm text-signal-text-secondary dark:text-signal-text-secondary-dark mt-0.5">
            @{other.username} · {other.about}
          </p>
        )}
        {conversation.type === "group" && (
          <p className="text-sm text-signal-text-secondary dark:text-signal-text-secondary-dark mt-0.5">
            {conversation.members.length} members
          </p>
        )}
      </div>

      {conversation.type === "group" && (
        <div className="p-4">
          <div className="flex items-center justify-between mb-2 px-1">
            <p className="text-xs font-semibold text-signal-text-secondary dark:text-signal-text-secondary-dark uppercase">
              Members
            </p>
            {isAdmin && (
              <button onClick={onAddMembersClick} className="flex items-center gap-1 text-signal-blue text-sm font-medium">
                <UserPlus size={15} /> Add
              </button>
            )}
          </div>
          <div className="flex flex-col">
            {conversation.members.map((m) => (
              <div key={m.user.id} className="flex items-center gap-3 px-1 py-2.5">
                <Avatar name={m.user.display_name} color={m.user.avatar_color} size={38} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {m.user.id === me.id ? `${m.user.display_name} (You)` : m.user.display_name}
                  </p>
                  {m.role === "admin" && (
                    <p className="text-xs text-signal-blue flex items-center gap-1">
                      <Shield size={11} /> Admin
                    </p>
                  )}
                </div>
                {isAdmin && m.user.id !== me.id && (
                  <button
                    onClick={() => removeMember(m.user.id)}
                    disabled={busy === m.user.id}
                    className="p-1.5 rounded-full hover:bg-signal-list-hover dark:hover:bg-signal-list-hover-dark text-red-500 disabled:opacity-40"
                    title="Remove from group"
                  >
                    <UserMinus size={16} />
                  </button>
                )}
              </div>
            ))}
          </div>
          <button
            onClick={() => removeMember(me.id)}
            className="mt-3 w-full text-red-500 text-sm font-medium py-2.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30"
          >
            Leave group
          </button>
        </div>
      )}

      {conversation.type === "direct" && (
        <div className="p-4 text-sm text-signal-text-secondary dark:text-signal-text-secondary-dark space-y-2">
          <p>🔒 Messages in this chat are simulated as end-to-end encrypted for this demo.</p>
          <p>Disappearing messages, media, and calls are placeholders in this build.</p>
        </div>
      )}
    </Modal>
  );
}
