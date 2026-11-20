export type MapBounds = [west: number, south: number, east: number, north: number];

export interface QuestMapConfig {
  styleUrl: string;
  center: [number, number];
  zoom: number;
  minZoom: number;
  maxZoom: number;
  initialBounds: MapBounds;
  cluster: boolean;
}

export const defaultMapConfig: QuestMapConfig = {
  styleUrl: '/maps/nizhny-rpg.json',
  center: [44.0035, 56.328],
  zoom: 14.2,
  minZoom: 10,
  maxZoom: 19,
  initialBounds: [43.97, 56.30, 44.04, 56.35],
  cluster: true,
};

export async function loadMapConfig(signal: AbortSignal): Promise<QuestMapConfig> {
  const response = await fetch('/maps/config.json', { signal });
  if (!response.ok) throw new Error('Map configuration could not load');
  return { ...defaultMapConfig, ...await response.json() };
}
