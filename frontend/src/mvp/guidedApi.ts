import type { AuthRequest } from '../api/game.api';
import type { CollectRequest } from '../types/game.types';
import type { Coordinates, PlaceId } from './content';
import type { Journey, Reaction } from './demo';

export interface GuidedSnapshot extends Journey {
  coordinates: Partial<Record<PlaceId, Coordinates>>;
}

export interface QuestActions {
  collect: (index: number, position: CollectRequest) => Promise<void>;
  react: (index: number, reaction: Reaction) => Promise<void>;
}

export function guidedApi(request: AuthRequest) {
  const submit = (path: string, method: 'PUT' | 'POST', body?: unknown) =>
    request<GuidedSnapshot>('/guided' + path, { method, body: body === undefined ? undefined : JSON.stringify(body) });
  const stop = (quest: string, index: number) => '/' + encodeURIComponent(quest) + '/stops/' + index;
  return {
    state: (signal: AbortSignal) => request<GuidedSnapshot>('/guided', { signal }),
    start: (quest: string) => submit('/' + encodeURIComponent(quest) + '/start', 'POST'),
    collect: (quest: string, index: number, position: CollectRequest) => submit(stop(quest, index) + '/collect', 'POST', position),
    react: (quest: string, index: number, reaction: Reaction) => submit(stop(quest, index) + '/reaction', 'PUT', { reaction }),
    bookmark: (item: string, saved: boolean) => submit('/bookmarks/' + encodeURIComponent(item), 'PUT', { saved }),
  };
}
