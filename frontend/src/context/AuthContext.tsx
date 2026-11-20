import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { authApi } from '../api/auth.api';
import { ApiError, request } from '../api/client';
import type { AuthResponse, LoginRequest, RegisterRequest, User } from '../types/auth.types';

type Status = 'loading' | 'authenticated' | 'anonymous';
interface AuthContextValue {
  status: Status;
  user: User | null;
  login: (payload: LoginRequest) => Promise<void>;
  register: (payload: RegisterRequest) => Promise<void>;
  logout: () => Promise<void>;
  getMe: () => Promise<User>;
  /** MVP quest: запрос к защищённому API с Bearer-токеном и одним повтором после refresh. */
  authRequest: <T>(path: string, options?: RequestInit) => Promise<T>;
}
const AuthContext = createContext<AuthContextValue | null>(null);

// Единственный refresh одновременно: исключает гонку ротации cookie.
let refreshInFlight: Promise<AuthResponse> | null = null;
function refreshOnce() {
  if (!refreshInFlight) {
    refreshInFlight = authApi.refresh().finally(() => { refreshInFlight = null; });
  }
  return refreshInFlight;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>('loading');
  const [user, setUser] = useState<User | null>(null);
  const token = useRef<string | null>(null);
  const generation = useRef(0);

  const clear = useCallback(() => {
    generation.current += 1;
    token.current = null;
    setUser(null);
    setStatus('anonymous');
  }, []);

  const apply = useCallback((response: AuthResponse) => {
    token.current = response.accessToken;
    setUser(response.user);
    setStatus('authenticated');
  }, []);

  useEffect(() => {
    const current = generation.current;
    void refreshOnce().then(response => {
      if (generation.current === current) apply(response);
    }).catch(() => {
      if (generation.current === current) clear();
    });
    // Не отменяем запрос при StrictMode: refreshOnce объединяет параллельные вызовы.
  }, [apply, clear]);

  const login = useCallback(async (payload: LoginRequest) => {
    const response = await authApi.login(payload);
    generation.current += 1;
    apply(response);
  }, [apply]);
  const register = useCallback(async (payload: RegisterRequest) => {
    const response = await authApi.register(payload);
    generation.current += 1;
    apply(response);
  }, [apply]);
  const logout = useCallback(async () => {
    // Сначала очищаем локальные данные, даже если сеть недоступна.
    clear();
    try { await authApi.logout(); } catch { /* локальный выход всё равно выполнен */ }
  }, [clear]);

  const getMe = useCallback(async (): Promise<User> => {
    if (!token.current) throw new Error('Требуется авторизация');
    try {
      const profile = await authApi.me(token.current);
      setUser(profile);
      return profile;
    } catch (error) {
      if (!(error instanceof ApiError) || error.status !== 401) throw error;
      try {
        const renewed = await refreshOnce();
        apply(renewed);
        const profile = await authApi.me(renewed.accessToken); // единственный повтор
        setUser(profile);
        return profile;
      } catch (retryError) {
        if (retryError instanceof ApiError && retryError.status === 401) clear();
        throw retryError;
      }
    }
  }, [apply, clear]);

  // Добавлено для MVP-квеста (game/events/ai): та же схема, что в getMe — токен в памяти,
  // при 401 единственный refresh через refreshOnce и один повтор запроса.
  const authRequest = useCallback(async <T,>(path: string, options: RequestInit = {}): Promise<T> => {
    const send = (accessToken: string) => request<T>(path, {
      ...options,
      headers: { ...options.headers, Authorization: `Bearer ${accessToken}` },
    });
    if (!token.current) {
      throw new ApiError(401, { error: { code: 'UNAUTHORIZED', message: 'Требуется авторизация' } });
    }
    try {
      return await send(token.current);
    } catch (error) {
      if (!(error instanceof ApiError) || error.status !== 401) throw error;
      try {
        const renewed = await refreshOnce();
        apply(renewed);
        return await send(renewed.accessToken);
      } catch (retryError) {
        if (retryError instanceof ApiError && retryError.status === 401) clear();
        throw retryError;
      }
    }
  }, [apply, clear]);

  return <AuthContext.Provider value={{ status, user, login, register, logout, getMe, authRequest }}>{children}</AuthContext.Provider>;
}
export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth должен вызываться внутри AuthProvider');
  return value;
}
