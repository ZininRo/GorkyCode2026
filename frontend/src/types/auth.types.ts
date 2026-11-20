export interface User {
  id: string;
  displayName: string;
  email: string;
  createdAt: string;
}
export interface LoginRequest { email: string; password: string }
export interface RegisterRequest extends LoginRequest { displayName: string }
export interface AuthResponse {
  accessToken: string;
  tokenType: 'Bearer';
  expiresIn: number;
  user: User;
}
export interface FieldError { field: string; message: string }
export interface ApiErrorBody {
  error: {
    code: 'VALIDATION_ERROR' | 'INVALID_CREDENTIALS' | 'INVALID_REFRESH_TOKEN' | 'UNAUTHORIZED' | 'EMAIL_ALREADY_EXISTS' | 'TOO_MANY_REQUESTS' | 'INTERNAL_ERROR';
    message: string;
    details?: FieldError[];
    requestId?: string;
  };
}
