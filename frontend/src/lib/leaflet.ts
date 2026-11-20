// Leaflet подгружается с CDN по требованию: не нужно менять package.json/package-lock.json,
// а сбой CDN не ломает приложение (на странице квеста остаётся список точек).

export interface LeafletLatLng { lat: number; lng: number }
export interface LeafletLayer { addTo(target: LeafletMap | LeafletLayerGroup): LeafletLayer; remove(): void }
export interface LeafletMarker extends LeafletLayer {
  on(event: 'click', handler: () => void): LeafletMarker;
  bindTooltip(text: string, options?: Record<string, unknown>): LeafletMarker;
}
export interface LeafletLayerGroup { addTo(map: LeafletMap): LeafletLayerGroup; clearLayers(): void }
export interface LeafletMap {
  setView(center: [number, number], zoom: number): LeafletMap;
  fitBounds(bounds: [number, number][], options?: Record<string, unknown>): LeafletMap;
  panTo(center: [number, number]): LeafletMap;
  invalidateSize(): void;
  remove(): void;
}
export interface LeafletGlobal {
  map(element: HTMLElement, options?: Record<string, unknown>): LeafletMap;
  tileLayer(url: string, options?: Record<string, unknown>): LeafletLayer;
  layerGroup(): LeafletLayerGroup;
  divIcon(options: Record<string, unknown>): unknown;
  marker(latLng: [number, number], options?: Record<string, unknown>): LeafletMarker;
  circle(latLng: [number, number], options?: Record<string, unknown>): LeafletLayer;
}

const VERSION = '1.9.4';
const CSS_URL = `https://unpkg.com/leaflet@${VERSION}/dist/leaflet.css`;
const JS_URL = `https://unpkg.com/leaflet@${VERSION}/dist/leaflet.js`;

let loading: Promise<LeafletGlobal> | null = null;

export function loadLeaflet(timeoutMs = 10000): Promise<LeafletGlobal> {
  const existing = (window as unknown as { L?: LeafletGlobal }).L;
  if (existing) return Promise.resolve(existing);
  if (loading) return loading;

  loading = new Promise<LeafletGlobal>((resolve, reject) => {
    if (!document.querySelector(`link[href="${CSS_URL}"]`)) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = CSS_URL;
      link.crossOrigin = '';
      document.head.appendChild(link);
    }
    const script = document.createElement('script');
    script.src = JS_URL;
    script.async = true;
    script.crossOrigin = '';
    const timer = window.setTimeout(() => reject(new Error('Leaflet load timeout')), timeoutMs);
    script.onload = () => {
      window.clearTimeout(timer);
      const L = (window as unknown as { L?: LeafletGlobal }).L;
      if (L) resolve(L); else reject(new Error('Leaflet not available'));
    };
    script.onerror = () => {
      window.clearTimeout(timer);
      reject(new Error('Leaflet load error'));
    };
    document.head.appendChild(script);
  }).catch(error => {
    loading = null; // следующая попытка загрузит заново
    throw error;
  });
  return loading;
}
