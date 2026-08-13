import { format, isToday, isYesterday, formatDistanceToNowStrict } from "date-fns";

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function formatConversationTime(iso: string): string {
  const date = new Date(iso);
  if (isToday(date)) return format(date, "h:mm a");
  if (isYesterday(date)) return "Yesterday";
  return format(date, "M/d/yy");
}

export function formatMessageTime(iso: string): string {
  return format(new Date(iso), "h:mm a");
}

export function formatLastSeen(iso: string): string {
  const distance = formatDistanceToNowStrict(new Date(iso), { addSuffix: true });
  return `last seen ${distance}`;
}

export function formatDayDivider(iso: string): string {
  const date = new Date(iso);
  if (isToday(date)) return "Today";
  if (isYesterday(date)) return "Yesterday";
  return format(date, "MMMM d, yyyy");
}
