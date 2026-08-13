"use client";

import { create } from "zustand";

interface Toast {
  id: string;
  message: string;
}

interface ToastState {
  toasts: Toast[];
  push: (message: string) => void;
  dismiss: (id: string) => void;
}

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  push: (message: string) => {
    const id = Math.random().toString(36).slice(2);
    set((s) => ({ toasts: [...s.toasts, { id, message }] }));
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
    }, 3500);
  },
  dismiss: (id: string) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

export default function ToastContainer() {
  const toasts = useToastStore((s) => s.toasts);
  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-2 items-center">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="animate-toast-in bg-[#1B1C1F] text-white text-sm px-4 py-2.5 rounded-full shadow-lg"
        >
          {t.message}
        </div>
      ))}
    </div>
  );
}
