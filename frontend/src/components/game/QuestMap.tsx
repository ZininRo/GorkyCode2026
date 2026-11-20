import { useEffect, useEffectEvent, useRef, useState } from 'react';
import {
  Map as MapLibreMap, NavigationControl, AttributionControl, type GeoJSONSource,
} from 'maplibre-gl';
import type { FeatureCollection, LineString, Point } from 'geojson';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { Position } from '../../lib/geo';
import type { MapCheckpoint } from '../../types/game.types';
import { createMapSprites } from './mapSprites';
import type { MapBounds, QuestMapConfig } from './questMapConfig';
import styles from './QuestMap.module.css';

const QUESTS = 'gorky-quests';
const TRACK = 'gorky-track';
const PLAYER = 'gorky-player';
const MARKERS = 'gorky-markers';
const CLUSTERS = 'gorky-clusters';
const empty: FeatureCollection<Point> = { type: 'FeatureCollection', features: [] };

interface QuestMapProps {
  config: QuestMapConfig;
  checkpoints: MapCheckpoint[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onBounds?: (bounds: MapBounds) => void;
  segments?: [number, number][][];
  focus: [number, number] | null;
  userPosition: Position | null;
  label: string;
  loadingText: string;
  unavailableText: string;
}

export function QuestMap({
  config, checkpoints, selectedId, onSelect, onBounds, segments, focus, userPosition, label, loadingText, unavailableText,
}: QuestMapProps) {
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [baseReady, setBaseReady] = useState(false);
  const select = useEffectEvent(onSelect);
  const publishBounds = useEffectEvent((bounds: MapBounds) => onBounds?.(bounds));

  useEffect(() => {
    let map: MapLibreMap;
    try {
      map = new MapLibreMap({
        container: container.current!,
        style: config.styleUrl,
        center: config.center,
        zoom: config.zoom,
        minZoom: config.minZoom,
        maxZoom: config.maxZoom,
        renderWorldCopies: false,
        dragRotate: false,
        touchPitch: false,
        pitchWithRotate: false,
        attributionControl: false,
      });
    } catch {
      setFailed(true);
      return;
    }
    mapRef.current = map;
    map.touchZoomRotate.disableRotation();
    map.addControl(new NavigationControl({ showCompass: false }), 'top-right');
    map.addControl(new AttributionControl({ compact: false }), 'bottom-right');

    function reportBounds() {
      const bounds = map.getBounds();
      const west = Math.max(-180, bounds.getWest());
      const south = Math.max(-90, bounds.getSouth());
      const east = Math.min(180, bounds.getEast());
      const north = Math.min(90, bounds.getNorth());
      if (west < east && south < north) publishBounds([west, south, east, north]);
    }

    let loaded = false;
    let disposed = false;
    const timeout = window.setTimeout(() => setFailed(true), 15000);
    map.once('load', () => {
      window.clearTimeout(timeout);
      setBaseReady(true);
    });
    map.on('error', event => {
      const sourceId = 'sourceId' in event ? event.sourceId : null;
      if (!loaded || (sourceId && sourceId !== QUESTS && sourceId !== PLAYER && sourceId !== TRACK)) setFailed(true);
    });
    map.on('sourcedata', event => {
      if (event.tile?.state === 'loaded' && event.sourceId !== QUESTS && event.sourceId !== PLAYER && event.sourceId !== TRACK) {
        setFailed(false);
      }
    });
    map.on('style.load', () => {
      for (const [name, sprite] of createMapSprites()) map.addImage(`gorky-${name}`, sprite);
      map.addSource(QUESTS, { type: 'geojson', data: empty, cluster: config.cluster, clusterRadius: 42, clusterMaxZoom: 14 });
      map.addSource(PLAYER, { type: 'geojson', data: empty });
      map.addSource(TRACK, { type: 'geojson', data: empty });
      map.addLayer({
        id: 'gorky-trail-outline', type: 'line', source: TRACK,
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: { 'line-color': '#224f3d', 'line-width': 6, 'line-opacity': 0.8 },
      });
      map.addLayer({
        id: 'gorky-trail', type: 'line', source: TRACK,
        paint: { 'line-color': '#fff1a7', 'line-width': 2.5, 'line-dasharray': [1, 2] },
      });

      map.addLayer({
        id: CLUSTERS, type: 'circle', source: QUESTS, filter: ['has', 'point_count'],
        paint: { 'circle-radius': 18, 'circle-color': '#684e76', 'circle-stroke-color': '#fff4cb', 'circle-stroke-width': 3 },
      });
      if (map.getStyle().glyphs) map.addLayer({
        id: 'gorky-cluster-count', type: 'symbol', source: QUESTS, filter: ['has', 'point_count'],
        layout: {
          'text-field': ['to-string', ['get', 'point_count']],
          'text-font': ['Noto Sans Regular'], 'text-size': 13, 'text-allow-overlap': true,
        },
        paint: { 'text-color': '#fff4cb' },
      });
      map.addLayer({
        id: 'gorky-selected', type: 'circle', source: QUESTS, filter: ['==', ['get', 'selected'], true],
        paint: { 'circle-radius': 20, 'circle-color': '#fff4cb', 'circle-stroke-color': '#684e76', 'circle-stroke-width': 2 },
      });
      map.addLayer({
        id: MARKERS, type: 'symbol', source: QUESTS, filter: ['!', ['has', 'point_count']],
        layout: { 'icon-image': ['get', 'sprite'], 'icon-allow-overlap': true, 'symbol-sort-key': ['get', 'order'] },
      });
      map.addLayer({
        id: 'gorky-location', type: 'symbol', source: PLAYER,
        layout: { 'icon-image': 'gorky-player', 'icon-allow-overlap': true, 'icon-size': 0.75 },
      });
      loaded = true;
      setReady(true);
      reportBounds();
    });

    map.on('moveend', reportBounds);
    map.on('resize', reportBounds);
    map.on('click', MARKERS, event => {
      const id: unknown = event.features?.[0]?.properties?.id;
      if (typeof id === 'string') select(id);
    });
    map.on('click', CLUSTERS, event => {
      const cluster = event.features?.[0];
      if (!cluster || cluster.geometry.type !== 'Point') return;
      const center: [number, number] = [cluster.geometry.coordinates[0], cluster.geometry.coordinates[1]];
      const source = map.getSource<GeoJSONSource>(QUESTS);
      void source?.getClusterExpansionZoom(Number(cluster.properties.cluster_id)).then(zoom => {
        if (!disposed) map.easeTo({ center, zoom });
      }).catch(() => { /* The cluster may have changed after a viewport update. */ });
    });
    for (const layer of [MARKERS, CLUSTERS]) {
      map.on('mouseenter', layer, () => { map.getCanvas().style.cursor = 'pointer'; });
      map.on('mouseleave', layer, () => { map.getCanvas().style.cursor = ''; });
    }
    const resize = new ResizeObserver(() => map.resize());
    resize.observe(container.current!);
    return () => {
      disposed = true;
      window.clearTimeout(timeout);
      resize.disconnect();
      mapRef.current = null;
      map.remove();
    };
  }, [config]);

  useEffect(() => {
    const source = mapRef.current?.getSource<GeoJSONSource>(QUESTS);
    if (!ready || !source) return;
    source.setData({
      type: 'FeatureCollection',
      features: checkpoints.map(cp => ({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [cp.lng, cp.lat] },
        properties: {
          id: cp.id,
          selected: cp.id === selectedId,
          order: cp.id === selectedId ? 1 : 0,
          sprite: `gorky-${cp.status === 'LOCKED' ? 'locked' :
            cp.status === 'COMPLETED' ? 'completed' : cp.type.toLowerCase()}`,
        },
      })),
    });
  }, [ready, checkpoints, selectedId]);

  useEffect(() => {
    const source = mapRef.current?.getSource<GeoJSONSource>(TRACK);
    if (!ready || !source || !segments) return;
    const data: FeatureCollection<LineString> = {
      type: 'FeatureCollection',
      features: segments.filter(points => points.length > 1).map(coordinates => ({
        type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates },
      })),
    };
    source.setData(data);
  }, [ready, segments]);

  useEffect(() => {
    const source = mapRef.current?.getSource<GeoJSONSource>(PLAYER);
    if (!ready || !source) return;
    source.setData(userPosition ? {
      type: 'FeatureCollection',
      features: [{
        type: 'Feature', properties: {},
        geometry: { type: 'Point', coordinates: [userPosition.lng, userPosition.lat] },
      }],
    } : empty);
  }, [ready, userPosition]);

  useEffect(() => {
    if (ready && focus) mapRef.current?.easeTo({ center: focus });
  }, [ready, focus]);

  return (
    <div className={styles.frame}>
      <div ref={container} className={styles.map} role="region" aria-label={label} />
      {(!baseReady || failed) && <p className={styles.notice} role="status">{failed ? unavailableText : loadingText}</p>}
    </div>
  );
}
