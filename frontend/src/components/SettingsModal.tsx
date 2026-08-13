"use client";

import { useState } from "react";
import { Bell, LogOut, Moon, Palette, Shield, Smartphone, Sun, Video } from "lucide-react";
import { User } from "@/types";
import Avatar from "./Avatar";
import Modal from "./Modal";
import { api } from "@/lib/api";

interface SettingsModalProps {
  me: User;
  onClose: () => void;
  onUpdated: (patch: Partial<User>) => void;
  onLogout: () => void;
  darkMode: boolean;
  onToggleDarkMode: () => void;
}

const AVATAR_COLORS = ["#2C6BED", "#3A76F0", "#4CAF50", "#FF9500", "#E63950", "#9C27B0", "#00A8B5", "#D97757", "#5E7CE2", "#2E9E6D"];

function PlaceholderRow({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-3 px-1 py-3">
      <span className="text-signal-text-secondary dark:text-signal-text-secondary-dark">{icon}</span>
      <span className="flex-1 text-sm">{label}</span>
      <span className="text-xs text-signal-text-secondary dark:text-signal-text-secondary-dark bg-signal-bg-secondary dark:bg-signal-bg-dark-elevated px-2 py-0.5 rounded-full">
        Coming soon
      </span>
    </div>
  );
}

export default function SettingsModal({ me, onClose, onUpdated, onLogout, darkMode, onToggleDarkMode }: SettingsModalProps) {
  const [displayName, setDisplayName] = useState(me.display_name);
  const [about, setAbout] = useState(me.about || "");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      const res = await api.patch("/users/me", { display_name: displayName, about });
      onUpdated(res.data);
    } finally {
      setSaving(false);
    }
  };

  const setColor = async (color: string) => {
    const res = await api.patch("/users/me", { avatar_color: color });
    onUpdated(res.data);
  };

  return (
    <Modal title="Settings" onClose={onClose}>
      <div className="p-5 flex flex-col items-center border-b border-signal-border dark:border-signal-border-dark">
        <Avatar name={displayName} color={me.avatar_color} size={88} />
        <div className="flex gap-1.5 mt-3">
          {AVATAR_COLORS.map((c) => (
            <button
              key={c}
              onClick={() => setColor(c)}
              className="w-5 h-5 rounded-full border-2"
              style={{ backgroundColor: c, borderColor: c === me.avatar_color ? "#000" : "transparent" }}
            />
          ))}
        </div>
      </div>

      <div className="p-4 border-b border-signal-border dark:border-signal-border-dark">
        <label className="text-xs font-semibold text-signal-text-secondary dark:text-signal-text-secondary-dark uppercase">
          Display name
        </label>
        <input
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          className="w-full bg-signal-bg-secondary dark:bg-signal-bg-dark-elevated rounded-lg px-3 py-2 text-sm outline-none mt-1 mb-3"
        />
        <label className="text-xs font-semibold text-signal-text-secondary dark:text-signal-text-secondary-dark uppercase">
          About
        </label>
        <input
          value={about}
          onChange={(e) => setAbout(e.target.value)}
          className="w-full bg-signal-bg-secondary dark:bg-signal-bg-dark-elevated rounded-lg px-3 py-2 text-sm outline-none mt-1 mb-3"
        />
        <p className="text-xs text-signal-text-secondary dark:text-signal-text-secondary-dark mb-2">
          {me.phone_number} · @{me.username}
        </p>
        <button
          onClick={save}
          disabled={saving}
          className="w-full bg-signal-blue text-white rounded-lg py-2 text-sm font-medium disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save profile"}
        </button>
      </div>

      <div className="p-4 border-b border-signal-border dark:border-signal-border-dark">
        <div className="flex items-center gap-3 px-1 py-2">
          <span className="text-signal-text-secondary dark:text-signal-text-secondary-dark">
            {darkMode ? <Moon size={18} /> : <Sun size={18} />}
          </span>
          <span className="flex-1 text-sm">Dark mode</span>
          <button
            onClick={onToggleDarkMode}
            className={`w-10 h-6 rounded-full transition-colors relative ${darkMode ? "bg-signal-blue" : "bg-gray-300"}`}
          >
            <span
              className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform ${darkMode ? "translate-x-4" : "translate-x-0.5"}`}
            />
          </button>
        </div>
        <PlaceholderRow icon={<Palette size={18} />} label="Chat wallpaper & themes" />
      </div>

      <div className="p-4 border-b border-signal-border dark:border-signal-border-dark">
        <PlaceholderRow icon={<Shield size={18} />} label="Privacy (screen lock, blocked contacts)" />
        <PlaceholderRow icon={<Bell size={18} />} label="Notifications" />
        <PlaceholderRow icon={<Video size={18} />} label="Voice & video calls" />
        <PlaceholderRow icon={<Smartphone size={18} />} label="Linked devices" />
      </div>

      <div className="p-4">
        <button
          onClick={onLogout}
          className="w-full flex items-center justify-center gap-2 text-red-500 font-medium py-2.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30"
        >
          <LogOut size={17} /> Log out
        </button>
      </div>
    </Modal>
  );
}
