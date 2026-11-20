import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useI18n } from '../../i18n/I18nContext';
import { aiApi } from '../../api/game.api';
import { Modal } from '../ui/Modal';
import type { AiHint, Checkpoint, CollectResponse, GameRoute } from '../../types/game.types';
import styles from './CollectResultModal.module.css';

interface Props {
  checkpoint: Pick<Checkpoint, 'id' | 'title' | 'type'>;
  result: CollectResponse;
  routes: GameRoute[];
  levelBefore: string | null;
  onClose: () => void;
}

/** «Кристалл найден! +10/+30»: подсказка, AI-подсказка, карточка места для зелёного, новый маршрут. */
export function CollectResultModal({ checkpoint, result, routes, levelBefore, onClose }: Props) {
  const { authRequest } = useAuth();
  const { lang, t, pick } = useI18n();
  const [aiHint, setAiHint] = useState<AiHint | null>(null);
  const [aiLoading, setAiLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setAiLoading(true);
    aiApi(authRequest).hint(checkpoint.id, lang)
      .then(hint => { if (active) setAiHint(hint); })
      .catch(() => { if (active) setAiHint(null); }) // AI не должен ломать сбор
      .finally(() => { if (active) setAiLoading(false); });
    return () => { active = false; };
  }, [authRequest, checkpoint.id, lang]);

  const unlocked = routes.filter(route => result.newlyUnlockedRoutes.includes(route.id));
  const levelChanged = levelBefore != null && levelBefore !== result.progress.level;
  const title = result.alreadyCollected ? pick(checkpoint.title) : `${t('crystalFound')} +${result.pointsAwarded}`;

  return (
    <Modal title={title} onClose={onClose}>
      <div className={checkpoint.type === 'GREEN' ? styles.badgeGreen : styles.badgeYellow}>
        {checkpoint.type === 'GREEN' ? t('greenCrystal') : t('yellowCrystal')} · {pick(checkpoint.title)}
      </div>

      {result.alreadyCollected && <p className={styles.notice}>{t('alreadyCollected')}</p>}

      {unlocked.map(route => (
        <p key={route.id} className={styles.celebrate} role="status">🔓 {t('newRoute', { name: pick(route.title) })}</p>
      ))}
      {levelChanged && (
        <p className={styles.celebrate} role="status">⭐ {t('newLevel', { name: pick(result.progress.levelTitle) })}</p>
      )}

      <h3 className={styles.sectionTitle}>{t('historicalHint')}</h3>
      <p>{pick(result.hint)}</p>

      <h3 className={styles.sectionTitle}>{t('aiHint')}</h3>
      {aiLoading && <p className={styles.muted}>{t('aiLoading')}</p>}
      {!aiLoading && aiHint && aiHint.text !== pick(result.hint) && <p>{aiHint.text}</p>}
      {!aiLoading && aiHint && (
        <p className={styles.muted}>{aiHint.source === 'AI' ? t('aiSourceAi') : t('aiSourceFallback')}</p>
      )}
      {!aiLoading && !aiHint && <p className={styles.muted}>{t('aiSourceFallback')}</p>}

      {result.placeCard && (
        <article className={styles.placeCard}>
          {result.placeCard.imageUrl && <img src={result.placeCard.imageUrl} alt="" />}
          <h3>{pick(result.placeCard.title)}</h3>
          <p>{pick(result.placeCard.description)}</p>
        </article>
      )}

      <p className={styles.score}>
        {t('score')}: <strong>{result.progress.score}</strong>
        {result.progress.nextLevelScore != null ? ` / ${result.progress.nextLevelScore}` : ''} · {pick(result.progress.levelTitle)}
      </p>
      <button type="button" className={styles.okButton} onClick={onClose}>OK</button>
    </Modal>
  );
}
