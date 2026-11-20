import { useEffect, useState } from 'react';
import { gameApi } from '../../api/game.api';
import type { CheckpointDetail, MapCheckpoints } from '../../types/game.types';

type GameApi = ReturnType<typeof gameApi>;

export function useQuestLocations(api: GameApi, bbox: string, routeId: string, revision: number) {
  const [data, setData] = useState<MapCheckpoints | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(false);
    const timer = window.setTimeout(async () => {
      try {
        const response = await api.mapCheckpoints(bbox, routeId, controller.signal);
        if (!controller.signal.aborted) setData(response);
      } catch {
        if (!controller.signal.aborted) setError(true);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 230);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [api, bbox, routeId, revision]);

  return { data, loading, error };
}

export function useCheckpointDetail(api: GameApi, id: string | null, revision: number) {
  const [data, setData] = useState<CheckpointDetail | null>(null);
  const [failedId, setFailedId] = useState<string | null>(null);
  useEffect(() => {
    if (!id) return;
    const controller = new AbortController();
    setFailedId(null);
    api.checkpoint(id, controller.signal)
      .then(detail => { if (!controller.signal.aborted) setData(detail); })
      .catch(() => { if (!controller.signal.aborted) setFailedId(id); });
    return () => controller.abort();
  }, [api, id, revision]);

  return { detail: data?.checkpoint.id === id ? data : null, error: failedId != null && failedId === id };
}
