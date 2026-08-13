"use client";

import { useEffect, useState } from "react";
import { Search, UserPlus } from "lucide-react";
import { Contact, User } from "@/types";
import { api } from "@/lib/api";
import Avatar from "./Avatar";
import Modal from "./Modal";

interface NewChatModalProps {
  contacts: Contact[];
  onClose: () => void;
  onStartChat: (userId: string) => void;
  onAddContact: (user: User) => void;
}

export default function NewChatModal({ contacts, onClose, onStartChat, onAddContact }: NewChatModalProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<User[]>([]);
  const [searching, setSearching] = useState(false);
  const [addError, setAddError] = useState("");

  useEffect(() => {
    if (query.trim().length < 1) {
      setResults([]);
      return;
    }
    setSearching(true);
    const t = setTimeout(async () => {
      try {
        const res = await api.get<User[]>("/users/search", { params: { q: query } });
        setResults(res.data);
      } finally {
        setSearching(false);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [query]);

  const contactIds = new Set(contacts.map((c) => c.user.id));

  const handleAddAndStart = async (user: User) => {
    setAddError("");
    try {
      if (!contactIds.has(user.id)) {
        await api.post("/contacts", { username: user.username, phone_number: user.username ? undefined : user.phone_number });
        onAddContact(user);
      }
      onStartChat(user.id);
    } catch (e: any) {
      setAddError(e?.response?.data?.detail || "Could not add contact");
    }
  };

  return (
    <Modal title="New chat" onClose={onClose}>
      <div className="p-4">
        <div className="flex items-center gap-2 bg-signal-bg-secondary dark:bg-signal-bg-dark rounded-lg px-3 py-2 mb-3">
          <Search size={16} className="text-signal-text-secondary dark:text-signal-text-secondary-dark shrink-0" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by username or phone number"
            className="bg-transparent outline-none text-sm w-full"
          />
        </div>
        {addError && <p className="text-sm text-red-500 mb-2">{addError}</p>}

        {!query && (
          <>
            <p className="text-xs font-semibold text-signal-text-secondary dark:text-signal-text-secondary-dark uppercase px-1 mb-1">
              Contacts
            </p>
            <div className="flex flex-col">
              {contacts.length === 0 && (
                <p className="text-sm text-signal-text-secondary dark:text-signal-text-secondary-dark px-1 py-3">
                  No contacts yet. Search above to find people on Signal.
                </p>
              )}
              {contacts.map((c) => (
                <button
                  key={c.id}
                  onClick={() => onStartChat(c.user.id)}
                  className="flex items-center gap-3 px-1 py-2.5 rounded-lg hover:bg-signal-list-hover dark:hover:bg-signal-list-hover-dark text-left"
                >
                  <Avatar name={c.user.display_name} color={c.user.avatar_color} size={40} />
                  <div>
                    <p className="text-sm font-medium">{c.nickname || c.user.display_name}</p>
                    <p className="text-xs text-signal-text-secondary dark:text-signal-text-secondary-dark">
                      @{c.user.username}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </>
        )}

        {query && (
          <div className="flex flex-col">
            {searching && <p className="text-sm text-signal-text-secondary dark:text-signal-text-secondary-dark px-1 py-2">Searching...</p>}
            {!searching && results.length === 0 && (
              <p className="text-sm text-signal-text-secondary dark:text-signal-text-secondary-dark px-1 py-2">No users found.</p>
            )}
            {results.map((u) => (
              <button
                key={u.id}
                onClick={() => handleAddAndStart(u)}
                className="flex items-center gap-3 px-1 py-2.5 rounded-lg hover:bg-signal-list-hover dark:hover:bg-signal-list-hover-dark text-left"
              >
                <Avatar name={u.display_name} color={u.avatar_color} size={40} />
                <div className="flex-1">
                  <p className="text-sm font-medium">{u.display_name}</p>
                  <p className="text-xs text-signal-text-secondary dark:text-signal-text-secondary-dark">
                    @{u.username || u.phone_number}
                  </p>
                </div>
                {!contactIds.has(u.id) && <UserPlus size={16} className="text-signal-blue" />}
              </button>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
}
