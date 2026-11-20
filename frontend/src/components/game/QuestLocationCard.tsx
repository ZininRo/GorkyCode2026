import { Link } from 'react-router-dom';
import { useI18n } from '../../i18n/I18nContext';
import type { CheckpointDetail, MapCheckpoint } from '../../types/game.types';
import styles from './QuestLocationCard.module.css';

interface Props {
  checkpoint: MapCheckpoint;
  detail: CheckpointDetail | null;
  descriptionError: boolean;
  requiredScore?: number;
  routeTitle?: string;
  collectRadius?: number;
  distance: number | null;
  collecting: boolean;
  demo: boolean;
  expanded: boolean;
  feedback: string | null;
  onCollect: (demo: boolean) => void;
  onRetry: () => void;
}

export function QuestLocationCard({
  checkpoint, detail, descriptionError, requiredScore, routeTitle, collectRadius, distance,
  collecting, demo, expanded, feedback, onCollect, onRetry,
}: Props) {
  const { t, pick } = useI18n();
  const status = checkpoint.status === 'LOCKED' ? t('mapLocked') :
    checkpoint.status === 'COMPLETED' ? t('collected') : t('available');
  return (
    <article className={styles.card} aria-labelledby="checkpoint-title">
      {detail?.imageUrl && <img className={styles.image} src={detail.imageUrl} alt="" />}
      <div className={styles.body}>
        <h2 id="checkpoint-title">{pick(checkpoint.title)}</h2>
        <p className={styles.status}><strong>{status}</strong> · {t('reward', { n: checkpoint.score })}</p>
        {detail && <p>{pick(detail.description)}</p>}
        {descriptionError && <p role="alert">{t('pointDetailsError')} <button onClick={onRetry}>{t('retry')}</button></p>}
        {!detail && !descriptionError && <p role="status">{t('loading')}</p>}
        <p>{distance == null ? t('distanceUnknown') : t('distance', { n: distance })}</p>
        {checkpoint.status === 'LOCKED' && requiredScore !== undefined && <p>{t('routeLocked', { n: requiredScore })}</p>}
        {expanded && (
          <div>
            <p>{[routeTitle, t(checkpoint.type === 'GREEN' ? 'greenCrystal' : 'yellowCrystal')].filter(Boolean).join(' · ')}</p>
            {checkpoint.status === 'AVAILABLE' && collectRadius != null && <p>{t('collectRadius', { n: collectRadius })}</p>}
          </div>
        )}
        {detail?.hint && <p>{pick(detail.hint)}</p>}
        {expanded && detail?.placeCard && (
          <section>
            <h3>{pick(detail.placeCard.title)}</h3>
            <p>{pick(detail.placeCard.description)}</p>
          </section>
        )}
        {feedback && <p role="alert">{feedback}</p>}
        <div className={styles.actions}>
          {checkpoint.status === 'AVAILABLE' && (
            <button type="button" disabled={collecting} onClick={() => onCollect(false)}>
              {collecting ? t('collecting') : t('collect')}
            </button>
          )}
          {checkpoint.status === 'AVAILABLE' && demo && (
            <button type="button" disabled={collecting} onClick={() => onCollect(true)}>{t('demoCollect')}</button>
          )}
          <Link to={expanded ? '/game' : `/game/${encodeURIComponent(checkpoint.id)}`}>
            {t(expanded ? 'backToMap' : 'pointDetails')}
          </Link>
        </div>
      </div>
    </article>
  );
}
