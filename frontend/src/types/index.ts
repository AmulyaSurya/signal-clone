export interface User {
  id: string;
  phone_number?: string | null;
  username?: string | null;
  display_name: string;
  avatar_color: string;
  avatar_url?: string | null;
  about?: string | null;
  is_online: boolean;
  last_seen: string;
}

export interface Contact {
  id: string;
  nickname?: string | null;
  user: User;
}

export interface Member {
  user: User;
  role: "admin" | "member";
  joined_at: string;
}

export interface LastMessage {
  id: string;
  body?: string | null;
  sender_id: string;
  created_at: string;
  status: MessageStatus;
  is_system: boolean;
}

export type ConversationType = "direct" | "group";
export type MessageStatus = "sending" | "sent" | "delivered" | "read";

export interface Conversation {
  id: string;
  type: ConversationType;
  name?: string | null;
  avatar_color: string;
  members: Member[];
  last_message?: LastMessage | null;
  unread_count: number;
  updated_at: string;
}

export interface Reaction {
  emoji: string;
  user_id: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  body?: string | null;
  reply_to_id?: string | null;
  is_system: boolean;
  status: MessageStatus;
  created_at: string;
  edited_at?: string | null;
  reactions: Reaction[];
  // client-only optimistic-send state
  _pending?: boolean;
  _failed?: boolean;
}

export interface WsEvent {
  type: "new_message" | "typing" | "presence" | "messages_read" | "message_reaction" | "message_deleted" | "pong";
  [key: string]: any;
}
