export interface User {
  id: string;
  name: string;
  email: string;
  password?: string;
  avatar?: string | null;
  username?: string | null;
  bio?: string | null;
  role?: string | null;
  is_ai: boolean;
  created_at: Date | string;
  updated_at: Date | string;
}

export type UserWithoutPassword = Omit<User, "password">;

export interface Chat {
  id: string;
  is_group: boolean;
  group_name?: string | null;
  group_description?: string | null;
  group_avatar?: string | null;
  group_admin_id?: string | null;
  created_by: string;
  last_message_id?: string | null;
  created_at: Date | string;
  updated_at: Date | string;
}

export interface ChatParticipant {
  id: string;
  chat_id: string;
  user_id: string;
  created_at: Date | string;
}

export interface Message {
  id: string;
  chat_id: string;
  sender_id: string;
  content?: string | null;
  image?: string | null;
  audio?: string | null;
  reply_to_id?: string | null;
  created_at: Date | string;
  updated_at: Date | string;
}

export interface MessageReaction {
  id: string;
  message_id: string;
  user_id: string;
  emoji: string;
  created_at: Date | string;
  user?: UserWithoutPassword;
}

export interface MessageWithSender extends Message {
  sender: UserWithoutPassword;
  reactions?: MessageReaction[];
  replyTo?: MessageWithSender | null;
}

export interface ChatWithParticipants extends Chat {
  participants: UserWithoutPassword[];
  lastMessage?: MessageWithSender | null;
}
