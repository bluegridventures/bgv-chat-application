import { createClient } from "@supabase/supabase-js";
import { Env } from "./env.config";

const supabaseUrl = Env.SUPABASE_URL;
const supabaseServiceRoleKey = Env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error("Missing Supabase environment variables");
}

export const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// Database types for better TypeScript support
export interface User {
  id: string;
  name: string;
  email: string;
  password: string;
  avatar?: string | null;
  username?: string | null;
  bio?: string | null;
  role?: string | null;
  is_ai: boolean;
  created_at: string;
  updated_at: string;
}

export interface Chat {
  id: string;
  is_group: boolean;
  group_name?: string | null;
  group_description?: string | null;
  group_avatar?: string | null;
  group_admin_id?: string | null;
  created_by: string;
  last_message_id?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ChatParticipant {
  id: string;
  chat_id: string;
  user_id: string;
  created_at: string;
}

export interface Message {
  id: string;
  chat_id: string;
  sender_id: string;
  content?: string | null;
  image?: string | null;
  audio?: string | null;
  reply_to_id?: string | null;
  created_at: string;
  updated_at: string;
}

// Helper types for joined queries
export interface UserWithoutPassword extends Omit<User, 'password'> {}

export interface ChatWithParticipants extends Chat {
  participants: UserWithoutPassword[];
  lastMessage?: MessageWithSender | null;
}

export interface MessageWithSender extends Message {
  sender: UserWithoutPassword;
  replyTo?: MessageWithSender | null;
}
