export interface Position {
  lat: number;
  lng: number;
  accuracy: number;
}

export type GeoErrorKind = 'denied' | 'unavailable' | 'unsupported' | 'timeout' | 'insecure';

export class GeoError extends Error {
  public readonly kind: GeoErrorKind;

  constructor(kind: GeoErrorKind) {
    super(kind);
    this.name = 'GeoError';
    this.kind = kind;
  }
}

/** GPS запрашивается по действию пользователя. Трек не хранится. */
export function getCurrentPosition(): Promise<Position> {
  return new Promise((resolve, reject) => {
    if (!window.isSecureContext) {
      reject(new GeoError('insecure'));
      return;
    }
    if (!navigator.geolocation) {
      reject(new GeoError('unsupported'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      pos => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy }),
      err => {
        const kind = err.code === err.PERMISSION_DENIED ? 'denied' :
          err.code === err.TIMEOUT ? 'timeout' : 'unavailable';
        reject(new GeoError(kind));
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
  });
}

/** Только для отображения расстояния. Решение о сборе принимает сервер. */
export function distanceMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(Math.max(0, 1 - a)));
}
