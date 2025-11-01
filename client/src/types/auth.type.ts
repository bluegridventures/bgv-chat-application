export type RegisterType = {
  name: string;
  email: string;
  password: string;
  avatar?: string;
};

export type LoginType = {
  email: string;
  password: string;
};

export interface UserType {
  id: string;
  name: string;
  email: string;
  avatar?: string | null;
  username?: string | null;
  bio?: string | null;
  role?: string | null;
  isAI?: boolean;
  is_ai?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
  created_at?: string;
  updated_at?: string;
}
