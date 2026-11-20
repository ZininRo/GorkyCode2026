import { request } from './client';
import type {
  AiHint, AiRecommendations, CategoryFilter, CheckpointDetail, CollectRequest, CollectResponse, DiscoveryResponse, GameState, Lang,
  MapCheckpoints, Progress,
} from '../types/game.types';

/** Функция запроса с авторизацией: useAuth().authRequest. */
export type AuthRequest = <T>(path: string, options?: RequestInit) => Promise<T>;

// Публичная афиша (без токена).
export const discoveryApi = {
  list: (category: CategoryFilter, signal?: AbortSignal) =>
    request<DiscoveryResponse>(`/events?category=${encodeURIComponent(category)}`, { signal }),
};

// Квест: владелец backend — Юля (game/). Источник истины — сервер.
export function gameApi(authRequest: AuthRequest) {
  return {
    state: () => authRequest<GameState>('/game'),
    summary: (signal: AbortSignal) => authRequest<GameState>('/game?includeCheckpoints=false', { signal }),
    mapCheckpoints: (bbox: string, routeId: string, signal: AbortSignal) => {
      const query = new URLSearchParams({ bbox });
      if (routeId) query.set('routeId', routeId);
      return authRequest<MapCheckpoints>(`/checkpoints?${query}`, { signal });
    },
    checkpoint: (id: string, signal: AbortSignal) =>
      authRequest<CheckpointDetail>(`/checkpoints/${encodeURIComponent(id)}`, { signal }),
    progress: () => authRequest<Progress>('/progress'),
    collect: (checkpointId: string, body: CollectRequest) =>
      authRequest<CollectResponse>(`/checkpoints/${encodeURIComponent(checkpointId)}/collect`, {
        method: 'POST',
        body: JSON.stringify(body),
      }),
  };
}

// ИИ: владелец backend — Рома (ai/). При сбое модели сервер сам отдаёт fallback.
export function aiApi(authRequest: AuthRequest) {
  return {
    hint: (checkpointId: string, lang: Lang) =>
      authRequest<AiHint>(`/ai/hint?checkpointId=${encodeURIComponent(checkpointId)}&lang=${lang}`),
    recommendations: (lang: Lang) => authRequest<AiRecommendations>(`/ai/recommendations?lang=${lang}`),
  };
}
