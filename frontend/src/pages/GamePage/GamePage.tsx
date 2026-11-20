import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useI18n } from '../../i18n/I18nContext';
import { gameApi } from '../../api/game.api';
import { errorMessageKey, serverDetail } from '../../lib/apiErrors';
import { distanceMeters, getCurrentPosition, type Position } from '../../lib/geo';
import { CollectResultModal } from '../../components/game/CollectResultModal';
import { QuestLocationCard } from '../../components/game/QuestLocationCard';
import { defaultMapConfig, loadMapConfig, type MapBounds } from '../../components/game/questMapConfig';
import { ProgressBar } from '../../components/ui/Modal';
import type { CollectResponse, GameState, MapCheckpoint } from '../../types/game.types';
import { useCheckpointDetail, useQuestLocations } from './useQuestLocations';
import styles from './GamePage.module.css';

const QuestMap = lazy(() => import('../../components/game/QuestMap').then(module => ({ default: module.QuestMap })));

interface ResultState {
  checkpoint: MapCheckpoint;
  response: CollectResponse;
  levelBefore: string;
}

function bboxKey(bounds: MapBounds) {
  return bounds.map((value, index) => {
    const round = index < 2 ? Math.floor : Math.ceil;
    return (round(value * 10000) / 10000).toFixed(4);
  }).join(',');
}

export function GamePage() {
  const { authRequest } = useAuth();
  const { lang, t, pick } = useI18n();
  const { checkpointId } = useParams();
  const navigate = useNavigate();
  const api = useMemo(() => gameApi(authRequest), [authRequest]);
  const [config, setConfig] = useState<typeof defaultMapConfig | null>(null);
  const [bbox, setBbox] = useState(() => bboxKey(defaultMapConfig.initialBounds));
  const [game, setGame] = useState<GameState | null>(null);
  const [summaryError, setSummaryError] = useState<unknown>(null);
  const [routeId, setRouteId] = useState('');
  const [selected, setSelected] = useState<MapCheckpoint | null>(null);
  const [position, setPosition] = useState<Position | null>(null);
  const [focus, setFocus] = useState<[number, number] | null>(null);
  const [locating, setLocating] = useState(false);
  const [geoError, setGeoError] = useState<unknown>(null);
  const [collecting, setCollecting] = useState(false);
  const busy = useRef(false);
  const card = useRef<HTMLDivElement>(null);
  const [collectError, setCollectError] = useState<{ id: string; error: unknown } | null>(null);
  const [result, setResult] = useState<ResultState | null>(null);
  const [revision, setRevision] = useState(0);
  const requestedId = checkpointId ?? selected?.id ?? null;
  const { data, error, loading } = useQuestLocations(api, bbox, routeId, revision);
  const { detail, error: detailError } = useCheckpointDetail(api, requestedId, revision);
  const points = useMemo(() => data?.items.filter(cp => !routeId || cp.routeId === routeId) ?? [], [data, routeId]);
  const updated = points.find(cp => cp.id === requestedId);
  const point = updated ?? detail?.checkpoint ?? (selected?.id === requestedId ? selected : null);

  useEffect(() => {
    const controller = new AbortController();
    loadMapConfig(controller.signal).then(next => {
      if (controller.signal.aborted) return;
      setConfig(next);
      setBbox(bboxKey(next.initialBounds));
    }).catch(() => { if (!controller.signal.aborted) setConfig(defaultMapConfig); });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    setSummaryError(null);
    api.summary(controller.signal)
      .then(next => { if (!controller.signal.aborted) setGame(next); })
      .catch(cause => { if (!controller.signal.aborted) setSummaryError(cause); });
    return () => controller.abort();
  }, [api, revision]);

  useEffect(() => {
    if (!checkpointId || !detail) return;
    setFocus([detail.checkpoint.lng, detail.checkpoint.lat]);
  }, [checkpointId, detail]);

  const nearby = useMemo(() => {
    if (!position) return [];
    return points.filter(cp => cp.status === 'AVAILABLE')
      .map(cp => ({ cp, distance: distanceMeters(position.lat, position.lng, cp.lat, cp.lng) }))
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 3);
  }, [points, position]);

  const reload = () => setRevision(value => value + 1);
  const demo = Boolean(game?.demoMode && ['localhost', '127.0.0.1', '[::1]'].includes(window.location.hostname));

  function choose(cp: MapCheckpoint, center: boolean) {
    if (checkpointId && checkpointId !== cp.id) navigate('/game');
    setSelected(cp);
    setCollectError(null);
    if (center) setFocus([cp.lng, cp.lat]);
    card.current?.scrollIntoView({ block: 'nearest' });
  }

  async function locate() {
    if (busy.current) return;
    busy.current = true;
    setLocating(true);
    setGeoError(null);
    try {
      const current = await getCurrentPosition();
      setPosition(current);
      setFocus([current.lng, current.lat]);
    } catch (cause) {
      setGeoError(cause);
    } finally {
      busy.current = false;
      setLocating(false);
    }
  }

  async function collect(cp: MapCheckpoint, simulate: boolean) {
    if (!game || cp.status !== 'AVAILABLE' || busy.current || (simulate && !demo)) return;
    busy.current = true;
    setCollecting(true);
    setCollectError(null);
    try {
      const current = simulate ? { lat: cp.lat, lng: cp.lng, accuracy: 5 } : await getCurrentPosition();
      if (!simulate) {
        setPosition(current);
        setGeoError(null);
      }
      const response = await api.collect(cp.id, { lat: current.lat, lng: current.lng, accuracyMeters: current.accuracy });
      setResult({ checkpoint: cp, response, levelBefore: game.progress.level });
      reload();
    } catch (cause) {
      setCollectError({ id: cp.id, error: cause });
    } finally {
      busy.current = false;
      setCollecting(false);
    }
  }

  function listPoint(cp: MapCheckpoint, meters?: number) {
    const status = cp.status === 'LOCKED' ? t('mapLocked') : cp.status === 'COMPLETED' ? t('collected') : t('available');
    return (
      <li key={cp.id}>
        <button type="button" className={`${styles.listItem} ${cp.id === requestedId ? styles.listItemActive : ''}`}
          onClick={() => choose(cp, true)} aria-pressed={cp.id === requestedId}>
          <span className={cp.type === 'GREEN' ? styles.dotGreen : styles.dotYellow} aria-hidden="true" />
          <span className={styles.listTitle}>{pick(cp.title)}</span>
          <span className={styles.muted}>{meters == null ? status : t('distance', { n: Math.round(meters) })}</span>
        </button>
      </li>
    );
  }

  function filterRoute(id: string) {
    setRouteId(id);
    if (id && point?.routeId !== id) {
      setSelected(null);
      if (checkpointId) navigate('/game');
    }
  }

  const progress = game?.progress;
  const route = game?.routes.find(item => item.id === point?.routeId);
  const distance = point && position ? Math.round(distanceMeters(position.lat, position.lng, point.lat, point.lng)) : null;
  const collectCause = collectError?.id === point?.id ? collectError?.error : null;
  const collectFeedback = collectCause ? [t(errorMessageKey(collectCause)), lang === 'ru' && serverDetail(collectCause)]
    .filter(Boolean).join('. ') : null;

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <h1>{t('questTitle')}</h1>
        {progress && <span className={styles.level}>
          {pick(progress.levelTitle)} · {progress.score}{progress.nextLevelScore != null ? `/${progress.nextLevelScore}` : ''}
        </span>}
      </header>
      {progress && <ProgressBar value={progress.score} max={progress.nextLevelScore ?? progress.score} />}
      {summaryError != null && <p role="alert">{t(errorMessageKey(summaryError))} <button onClick={reload}>{t('retry')}</button></p>}
      <section aria-label={t('routes')} className={styles.routes}>
        <button type="button" aria-pressed={!routeId} className={`${styles.route} ${!routeId ? styles.routeActive : ''}`}
          onClick={() => filterRoute('')}>{t('allPoints')}</button>
        {game?.routes.map(item => (
          <button key={item.id} type="button" aria-pressed={routeId === item.id}
            className={`${styles.route} ${routeId === item.id ? styles.routeActive : ''}`}
            onClick={() => filterRoute(item.id)} title={pick(item.description)}>
            {pick(item.title)} <small>· {item.unlocked ? `${item.collectedCount}/${item.checkpointCount}` : t('routeLocked', { n: item.requiredScore })}</small>
          </button>
        ))}
      </section>
      {demo && <p className={styles.demo}>{t('demoModeNote')}</p>}
      <div className={styles.mapTools}>
        <button type="button" onClick={() => void locate()} disabled={locating || collecting}>
          {t(locating ? 'locating' : 'myLocation')}
        </button>
        {geoError != null && <span role="alert">{t(errorMessageKey(geoError))}</span>}
        {position && game && position.accuracy > game.maxGpsAccuracyMeters && (
          <span role="status">{t('geoLowAccuracy', { n: Math.ceil(position.accuracy), max: game.maxGpsAccuracyMeters })}</span>
        )}
      </div>
      <div className={styles.mapAndCard}>
        <Suspense fallback={<div className={styles.mapPlaceholder} role="status">{t('mapLoading')}</div>}>
          {config ? <QuestMap config={config} checkpoints={points} selectedId={requestedId} focus={focus} userPosition={position}
            onBounds={bounds => setBbox(bboxKey(bounds))}
            onSelect={id => { const cp = points.find(item => item.id === id); if (cp) choose(cp, false); }}
            label={t('mapLabel')} loadingText={t('mapLoading')} unavailableText={t('mapUnavailable')} />
            : <div className={styles.mapPlaceholder} role="status">{t('mapLoading')}</div>}
        </Suspense>
        <div ref={card}>
          {point ? (
            <QuestLocationCard checkpoint={point} detail={detail} descriptionError={detailError}
              requiredScore={route?.requiredScore} routeTitle={route && pick(route.title)}
              collectRadius={game?.collectRadiusMeters} distance={distance} collecting={collecting || locating || !game}
              demo={demo} expanded={Boolean(checkpointId)} feedback={collectFeedback}
              onCollect={simulate => void collect(point, simulate)} onRetry={reload} />
          ) : requestedId ? (
            detailError ? <p role="alert">{t('pointDetailsError')} <button onClick={reload}>{t('retry')}</button></p>
              : <p role="status">{t('loading')}</p>
          ) : <p className={styles.muted}>{t('selectPoint')}</p>}
        </div>
      </div>

      {nearby.length > 0 && <section>
        <h2 className={styles.subheading}>{t('nearbyPoints')}</h2>
        <ul className={styles.list}>{nearby.map(({ cp, distance }) => listPoint(cp, distance))}</ul>
      </section>}
      <section aria-label={t('pointListLabel')} aria-busy={loading}>
        {error && <p role="alert">{t('errGeneric')} <button onClick={reload}>{t('retry')}</button></p>}
        {loading && <p role="status">{t('loading')}</p>}
        {!loading && !error && !points.length && <p role="status">{t('noMapPoints')}</p>}
        {data?.truncated && <p role="status">{t('mapTruncated')}</p>}
        <ul className={styles.list}>{points.map(cp => listPoint(cp))}</ul>
      </section>

      {result && game && <CollectResultModal checkpoint={result.checkpoint} result={result.response}
        levelBefore={result.levelBefore} routes={game.routes} onClose={() => setResult(null)} />}
    </main>
  );
}
