"use client";

import { useState } from "react";
import { Contact } from "@/types";
import Avatar from "./Avatar";
import Modal from "./Modal";

interface NewGroupModalProps {
  contacts: Contact[];
  onClose: () => void;
  onCreate: (name: string, memberIds: string[]) => void;
}

export default function NewGroupModal({ contacts, onClose, onCreate }: NewGroupModalProps) {
  const [name, setName] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const canCreate = name.trim().length > 0 && selected.size > 0;

  return (
    <Modal
      title="New group"
      onClose={onClose}
      footer={
        <button
          disabled={!canCreate}
          onClick={() => onCreate(name.trim(), Array.from(selected))}
          className="w-full bg-signal-blue text-white rounded-lg py-2.5 font-medium disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Create group ({selected.size} selected)
        </button>
      }
    >
      <div className="p-4">
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Group name"
          className="w-full bg-signal-bg-secondary dark:bg-signal-bg-dark rounded-lg px-3 py-2.5 text-sm outline-none mb-4"
        />
        <p className="text-xs font-semibold text-signal-text-secondary dark:text-signal-text-secondary-dark uppercase px-1 mb-1">
          Add members
        </p>
        <div className="flex flex-col">
          {contacts.length === 0 && (
            <p className="text-sm text-signal-text-secondary dark:text-signal-text-secondary-dark px-1 py-3">
              Add some contacts first from &quot;New chat&quot;.
            </p>
          )}
          {contacts.map((c) => (
            <label
              key={c.id}
              className="flex items-center gap-3 px-1 py-2.5 rounded-lg hover:bg-signal-list-hover dark:hover:bg-signal-list-hover-dark cursor-pointer"
            >
              <input
                type="checkbox"
                checked={selected.has(c.user.id)}
                onChange={() => toggle(c.user.id)}
                className="w-4 h-4 accent-signal-blue"
              />
              <Avatar name={c.user.display_name} color={c.user.avatar_color} size={38} />
              <span className="text-sm font-medium">{c.nickname || c.user.display_name}</span>
            </label>
          ))}
        </div>
      </div>
    </Modal>
  );
}
