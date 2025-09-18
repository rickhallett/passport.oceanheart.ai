export interface SignInRequest {
  email: string;
  password: string;
}

export interface SignUpRequest {
  email: string;
  password: string;
  passwordConfirmation?: string;
}

export interface PasswordResetRequest {
  email: string;
}

export interface NewPasswordRequest {
  token: string;
  password: string;
  passwordConfirmation: string;
}

export interface AuthenticatedRequest extends Request {
  user?: {
    id: number;
    email: string;
    role: string;
  };
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}