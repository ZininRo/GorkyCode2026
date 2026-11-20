
import { request } from './client';
import type { AuthResponse, LoginRequest, RegisterRequest, User } from '../types/auth.types';

export const authApi = {
  register: (payload: RegisterRequest) => request<AuthResponse>('/auth/register', {
    method: 'POST', credentials: 'include', body: JSON.stringify(payload),
  }),
  login: (payload: LoginRequest) => request<AuthResponse>('/auth/login', {
    method: 'POST', credentials: 'include', body: JSON.stringify(payload),
  }),
  refresh: () => request<AuthResponse>('/auth/refresh', {
    method: 'POST', credentials: 'include',
  }),
  logout: () => request<void>('/auth/logout', {
    method: 'POST', credentials: 'include',
  }),
  me: (accessToken: string) => request<User>('/users/me', {
    headers: { Authorization: `Bearer ${accessToken}` },
  }),
};
