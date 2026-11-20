// Контракт MVP-квеста (см. docs/API_CONTRACT_MVP.md). Все очки и разблокировки приходят с сервера.

export type Lang = 'ru' | 'en';

export interface LocalizedText {
  ru: string;
  en: string;
}

export type LevelCode = 'NOVICE' | 'EXPLORER';
export type CrystalType = 'YELLOW' | 'GREEN';
export type DiscoveryCategory = 'EXCURSIONS' | 'EVENTS' | 'FESTIVALS' | 'ENTERTAINMENT';
export type CategoryFilter = 'all' | 'excursions' | 'events' | 'festivals' | 'entertainment';

export interface Progress {
  score: number;
  level: LevelCode;
  levelTitle: LocalizedText;
  nextLevelScore: number | null;
  collectedCount: number;
  totalCheckpoints: number;
  unlockedRoutesCount: number;
}

export interface GameRoute {
  id: string;
  title: LocalizedText;
  description: LocalizedText;
  requiredScore: number;
  unlocked: boolean;
  checkpointCount: number;
  collectedCount: number;
}

export interface PlaceCard {
  title: LocalizedText;
  description: LocalizedText;
  imageUrl: string | null;
}

export interface Checkpoint {
  id: string;
  routeId: string;
  type: CrystalType;
  lat: number;
  lng: number;
  /** Очки за этот кристалл (10 / 30). */
  score: number;
  collected: boolean;
  collectedAt: string | null;
  title: LocalizedText;
  hint: LocalizedText | null;
  placeCard: PlaceCard | null;
}

export type CheckpointStatus = 'AVAILABLE' | 'COMPLETED' | 'LOCKED';

export type MapCheckpoint = Pick<Checkpoint, 'id' | 'routeId' | 'type' | 'lat' | 'lng' | 'score' | 'title'> & {
  status: CheckpointStatus;
};

export interface MapCheckpoints {
  items: MapCheckpoint[];
  truncated: boolean;
}

export interface CheckpointDetail {
  checkpoint: MapCheckpoint;
  description: LocalizedText;
  imageUrl: string | null;
  hint: LocalizedText | null;
  placeCard: PlaceCard | null;
}

export interface GameState {
  progress: Progress;
  routes: GameRoute[];
  checkpoints: Checkpoint[];
  demoMode: boolean;
  collectRadiusMeters: number;
  maxGpsAccuracyMeters: number;
}

export interface CollectRequest {
  lat: number;
  lng: number;
  accuracyMeters: number;
}

export interface CollectResponse {
  checkpointId: string;
  alreadyCollected: boolean;
  pointsAwarded: number;
  hint: LocalizedText | null;
  placeCard: PlaceCard | null;
  progress: Progress;
  newlyUnlockedRoutes: string[];
  distanceMeters: number | null;
}

export interface DiscoveryItem {
  id: string;
  category: DiscoveryCategory;
  title: LocalizedText;
  description: LocalizedText;
  imageUrl: string;
  externalUrl: string | null;
  isDemo: boolean;
}

export interface DiscoveryResponse {
  items: DiscoveryItem[];
}

export interface AiHint {
  checkpointId: string;
  language: Lang;
  text: string;
  source: 'AI' | 'FALLBACK';
}

export interface AiRecommendations {
  level: LevelCode;
  language: Lang;
  intro: string;
  source: 'AI' | 'FALLBACK';
  items: { id: string; title: string; description: string; tier: 'POPULAR' | 'HIDDEN' }[];
}
