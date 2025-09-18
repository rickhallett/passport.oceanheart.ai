export interface User {
  id: number;
  email: string;
  password: string;
  role: 'user' | 'admin';
  created_at: string;
  updated_at: string;
}

export interface Session {
  id: number;
  user_id: number;
  token: string;
  expires_at: string;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}

export interface PasswordReset {
  id: number;
  user_id: number;
  token: string;
  expires_at: string;
  used_at?: string;
  created_at: string;
}

export type CreateUserInput = {
  email: string;
  password: string;
  role?: 'user' | 'admin';
};

export type UpdateUserInput = {
  email?: string;
  password?: string;
  role?: 'user' | 'admin';
};

export type CreateSessionInput = {
  user_id: number;
  token: string;
  expires_at: string;
  ip_address?: string;
  user_agent?: string;
};

export type UserWithoutPassword = Omit<User, 'password'>;