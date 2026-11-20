import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { defaultMapConfig, loadMapConfig } from '../components/game/questMapConfig';
import type { Position } from '../lib/geo';
import type { MapCheckpoint } from '../types/game.types';
import { art, places, type Coordinates, type PlaceId } from './content';
import { Gem } from './icons';
import geography from '../../public/art/map-geography.json';

const QuestMap = lazy(() => import('../components/game/QuestMap').then(module => ({ default: module.QuestMap })));
const MAP_LOADING = 'Загружаем карту…';
const { bounds, legs } = geography;
const mercator = (lat: number) => Math.log(Math.tan(Math.PI / 4 + lat * Math.PI / 360));
function plot(lat: number, lon: number) {
  return [
    (lon - bounds.west) / (bounds.east - bounds.west) * 100,
    (mercator(bounds.north) - mercator(lat)) / (mercator(bounds.north) - mercator(bounds.south)) * 100,
  ];
}
export function leg(from: PlaceId | undefined, to: PlaceId) {
  if (!from) return [];
  const routes: Record<string, number[][]> = legs;
  return routes[from + '-' + to] ?? routes[to + '-' + from]?.slice().reverse() ?? [];
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
          unavailableText="Векторная подложка недоступна. Можно переключиться на пиксельную карту." />
      : <p role="status">{MAP_LOADING}</p>}
    </Suspense>
  </div>;
}

export function PixelMap({ stops, selected, done, onSelect, real, position, coordinates }: {
  stops: PlaceId[];
  selected: number;
  done: number;
  onSelect: (index: number) => void;
  real: boolean;
  position: Position | null;
  coordinates?: Partial<Record<PlaceId, Coordinates>>;
}) {
  const [zoomed, setZoomed] = useState(false);
  const coordinate = (place: PlaceId): Coordinates => coordinates?.[place] ?? places[place].coordinates;
  const focus = coordinate(stops[selected]);
  const checkpoints: MapCheckpoint[] = stops.map((id, index) => ({
    id: String(index), routeId: 'current', type: 'GREEN', lat: coordinate(id)[0], lng: coordinate(id)[1],
    score: 20, status: index < done ? 'COMPLETED' : 'AVAILABLE', title: { ru: places[id].title, en: places[id].title },
  }));
  const segments = stops.slice(1).map((id, index) => leg(stops[index], id));
  if (real) return <VectorMap checkpoints={checkpoints} selected={selected} focus={focus} onSelect={onSelect} position={position}
    segments={segments.map(segment => segment.map(([lat, lon]) => [lon, lat]))} />;

  const [focusX, focusY] = plot(...focus);
  const lines = segments.map(segment => segment.map(([lat, lon]) => plot(lat, lon).join(',')).join(' '));
  const userPoint = position ? plot(position.lat, position.lng) : null;
  return <div className="map-frame" aria-label="Пиксельная карта Нижнего Новгорода">
    <div className={`map-canvas ${zoomed ? 'map-zoomed' : ''}`} style={{ transformOrigin: `${focusX}% ${focusY}%` }}>
      <img src={art('map')} alt="Улицы, берега Волги и Оки, Канавинский мост" />
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="map-lines" aria-hidden="true">
        {lines.map((points, index) => <g key={index}><polyline className="track-shadow" points={points} /><polyline className="track" points={points} /></g>)}
      </svg>
      {userPoint && userPoint.every(number => number > 0 && number < 100) &&
        <span className="map-user" role="img" aria-label="Твоя геопозиция" style={{ left: `${userPoint[0]}%`, top: `${userPoint[1]}%` }} />}
      {stops.map((id, index) => {
        const [x,y] = plot(...coordinate(id));
        return <button key={id} className={`map-marker ${index === selected ? 'map-selected' : ''}`} style={{ left: `${x}%`, top: `${y}%` }} onClick={() => onSelect(index)} aria-label={places[id].title} aria-pressed={index === selected}>
          <Gem done={index < done} />{index < done && <span className="marker-check">✓</span>}
        </button>;
      })}
    </div>
    <button className="map-zoom icon-button" onClick={() => setZoomed(!zoomed)} aria-label={zoomed ? 'Уменьшить карту' : 'Увеличить карту'}>{zoomed ? '−' : '+'}</button>
    <a className="map-credit" href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">© OpenStreetMap</a>
  </div>;
}
