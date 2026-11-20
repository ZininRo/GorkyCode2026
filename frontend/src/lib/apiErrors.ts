import { ApiError } from '../api/client';
import type { MessageKey } from '../i18n/I18nContext';
import { GeoError } from './geo';

/** Переводит ошибку API/геолокации в ключ человекопонятного сообщения (ТЗ MVP, раздел 5.5). */
export function errorMessageKey(error: unknown): MessageKey {
  if (error instanceof GeoError) {
    if (error.kind === 'denied') return 'geoDenied';
    if (error.kind === 'insecure') return 'geoInsecure';
    if (error.kind === 'timeout') return 'geoTimeout';
    if (error.kind === 'unsupported') return 'geoUnsupported';
    return 'geoUnavailable';
  }
  if (error instanceof ApiError) {
    const code = error.body.error.code as string;
    switch (code) {
      case 'TOO_FAR': return 'errTooFar';
      case 'ROUTE_LOCKED': return 'errRouteLocked';
      case 'GPS_INACCURATE': return 'errGpsInaccurate';
      case 'VALIDATION_ERROR': return 'errBadRequest';
      default: return 'errGeneric';
    }
  }
  return 'errGeneric';
}

/** Сообщение сервера для TOO_FAR содержит расстояние — показываем его как уточнение. */
export function serverDetail(error: unknown): string | null {
  if (error instanceof ApiError && (error.body.error.code as string) === 'TOO_FAR') return error.message;
  return null;
}
