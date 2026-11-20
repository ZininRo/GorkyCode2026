import type { ApiErrorBody } from "../types/auth.types";


const API_BASE_URL = `${
  (import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080')
    .replace(/\/$/, '')
}/api/v1`;

export class ApiError extends Error {
  public readonly status: number;
  public readonly body: ApiErrorBody;

  constructor(status: number, body: ApiErrorBody) {
    super(body.error.message);

    this.name = 'ApiError';
    this.status = status;
    this.body = body;
  }
}

export async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers: { ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...options.headers },
    });
  } catch {
    throw new Error('Нет соединения с сервером. Проверьте адрес API и CORS.');
  }
  if (!response.ok) {
    const body = await response.json().catch(() => null) as ApiErrorBody | null;
    throw new ApiError(response.status, body?.error?.message ? body : {
      error: { code: 'INTERNAL_ERROR', message: `Ошибка сервера (HTTP ${response.status})` },
    });
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}
