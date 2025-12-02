import type { UserType } from "./auth.type";

export type MessageReactionType = {
  id: string;
  emoji: string;
  userId?: string;
  user_id?: string;
  user?: UserType | null;
};

export type ChatType = {
  id: string;
  lastMessage: MessageType;
  participants: UserType[];
  isGroup: boolean;
  is_group?: boolean;
  isAiChat?: boolean;
  createdBy?: string;
  created_by?: string;
  groupName?: string;
  group_name?: string;
  groupDescription?: string;
  group_description?: string;
  groupAvatar?: string;
  group_avatar?: string;
  groupAdminId?: string;
  group_admin_id?: string;
  createdAt?: string;
  updatedAt?: string;
  created_at?: string;
  updated_at?: string;
};

export type MessageType = {
  id: string;
  content: string | null;
  image: string | null;
  audio: string | null;
  sender: UserType | null;
  replyTo: MessageType | null;
   reactions?: MessageReactionType[];
  chatId?: string;
  chat_id?: string;
  createdAt?: string;
  updatedAt?: string;
  created_at?: string;
  updated_at?: string;
  //only frontend
  status?: string;
  streaming?: boolean;
};

export type CreateChatType = {
  participantId?: string;
  isGroup?: boolean;
  participants?: string[];
  groupName?: string;
};

export type CreateMessageType = {
  chatId: string | null;
  content?: string;
  image?: string;
  audio?: string;
  replyTo?: MessageType | null;
};
