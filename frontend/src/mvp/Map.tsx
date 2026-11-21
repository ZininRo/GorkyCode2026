import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { defaultMapConfig, loadMapConfig } from '../components/game/questMapConfig';
import type { Position } from '../lib/geo';
import type { MapCheckpoint } from '../types/game.types';
import { places, POINTS, type Coordinates, type PlaceId } from './content';
import geography from '../../public/art/map-geography.json';

const QuestMap = lazy(() => import('../components/game/QuestMap').then(module => ({ default: module.QuestMap })));
const MAP_LOADING = 'Загружаем карту…';
const legs: Record<string, number[][]> = geography.legs;

export function leg(from: PlaceId | undefined, to: PlaceId) {
  if (!from) return [];
  return legs[from + '-' + to] ?? legs[to + '-' + from]?.slice().reverse() ?? [];
}

function VectorMap({ checkpoints, selected, focus, onSelect, position, segments }: {
  checkpoints: MapCheckpoint[];
  selected: number;
  focus: Coordinates;
  onSelect: (index: number) => void;
  position: Position | null;
  segments: [number, number][][];
}) {
  const [config, setConfig] = useState<typeof defaultMapConfig | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    void loadMapConfig(controller.signal)
      .catch(() => defaultMapConfig)
      .then(next => { if (!controller.signal.aborted) setConfig({ ...next, cluster: false }); });
    return () => controller.abort();
  }, []);
  const center = useMemo<[number, number]>(() => [focus[1], focus[0]], [focus[0], focus[1]]);
  return <div className="real-map">
    <Suspense fallback={<p role="status">{MAP_LOADING}</p>}>{config
      ? <QuestMap config={config} checkpoints={checkpoints} selectedId={String(selected)} focus={center}
          onSelect={id => onSelect(Number(id))} userPosition={position} segments={segments}
          label="Векторная карта Нижнего Новгорода" loadingText={MAP_LOADING}
          unavailableText="Карта недоступна. Выбери точку в списке под картой." />
      : <p role="status">{MAP_LOADING}</p>}
    </Suspense>
  </div>;
}

export function RouteMap({ stops, selected, done, onSelect, position, coordinates }: {
  stops: PlaceId[];
  selected: number;
  done: number;
  onSelect: (index: number) => void;
  position: Position | null;
  coordinates?: Partial<Record<PlaceId, Coordinates>>;
}) {
  const coordinate = (place: PlaceId): Coordinates => coordinates?.[place] ?? places[place].coordinates;
  const focus = coordinate(stops[selected]);
  const checkpoints: MapCheckpoint[] = stops.map((id, index) => ({
    id: String(index), routeId: 'current', type: 'GREEN', lat: coordinate(id)[0], lng: coordinate(id)[1],
    score: POINTS, status: index < done ? 'COMPLETED' : 'AVAILABLE', title: { ru: places[id].title, en: places[id].title },
  }));
  const segments = stops.slice(1).map((id, index) => leg(stops[index], id));
  return <>
    <VectorMap checkpoints={checkpoints} selected={selected} focus={focus} onSelect={onSelect} position={position}
      segments={segments.map(segment => segment.map(([lat, lon]) => [lon, lat]))} />
    <ul className="route-stops" aria-label="Открытые точки маршрута">
      {stops.map((id, index) => <li key={id}>
        <button type="button" className="chip route-stop" aria-pressed={index === selected} onClick={() => onSelect(index)}>
          {index + 1}. {places[id].title}
        </button>
      </li>)}
    </ul>
  </>;
}
