export default function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 bg-signal-bubble-in dark:bg-signal-bubble-in-dark rounded-2xl px-4 py-3 w-fit">
      <span className="w-1.5 h-1.5 rounded-full bg-signal-text-secondary dark:bg-signal-text-secondary-dark typing-dot" style={{ animationDelay: "0ms" }} />
      <span className="w-1.5 h-1.5 rounded-full bg-signal-text-secondary dark:bg-signal-text-secondary-dark typing-dot" style={{ animationDelay: "150ms" }} />
      <span className="w-1.5 h-1.5 rounded-full bg-signal-text-secondary dark:bg-signal-text-secondary-dark typing-dot" style={{ animationDelay: "300ms" }} />
    </div>
  );
}
