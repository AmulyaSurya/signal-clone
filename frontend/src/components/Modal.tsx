"use client";

import { X } from "lucide-react";
import { ReactNode } from "react";

interface ModalProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
}

export default function Modal({ title, onClose, children, footer }: ModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 animate-fade-in" onClick={onClose}>
      <div
        className="bg-white dark:bg-signal-bg-dark-elevated rounded-xl shadow-2xl w-full max-w-md mx-4 max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-signal-border dark:border-signal-border-dark shrink-0">
          <h2 className="font-semibold text-lg">{title}</h2>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-signal-list-hover dark:hover:bg-signal-list-hover-dark">
            <X size={20} />
          </button>
        </div>
        <div className="overflow-y-auto flex-1">{children}</div>
        {footer && <div className="px-5 py-3 border-t border-signal-border dark:border-signal-border-dark shrink-0">{footer}</div>}
      </div>
    </div>
  );
}
