import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useI18n, type MessageKey } from '../../i18n/I18nContext';
import { discoveryApi, gameApi } from '../../api/game.api';
import { errorMessageKey } from '../../lib/apiErrors';
import { LangSwitch, Modal, ProgressBar } from '../../components/ui/Modal';
import type { CategoryFilter, DiscoveryItem, Progress } from '../../types/game.types';
import styles from './HomePage.module.css';

const FILTERS: { id: CategoryFilter; label: MessageKey }[] = [
  { id: 'all', label: 'catAll' },
  { id: 'excursions', label: 'catEXCURSIONS' },
  { id: 'events', label: 'catEVENTS' },
  { id: 'festivals', label: 'catFESTIVALS' },
  { id: 'entertainment', label: 'catENTERTAINMENT' },
];

function isSafeExternalUrl(url: string | null): url is string {
  if (!url) return false;
  try {
    return new URL(url).protocol === 'https:';
  } catch {
    return false;
  }
}

/** Главная: прогресс, баннер квеста, фильтры и Pinterest-лента афиши (GET /events). */
export function HomePage() {
  const { status, user, authRequest } = useAuth();
  const { t, pick } = useI18n();
  const navigate = useNavigate();
  const [filter, setFilter] = useState<CategoryFilter>('all');
  const [cache, setCache] = useState<Partial<Record<CategoryFilter, DiscoveryItem[]>>>({});
  const [feedError, setFeedError] = useState<MessageKey | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [selected, setSelected] = useState<DiscoveryItem | null>(null);
  const [progress, setProgress] = useState<Progress | null>(null);

  const items = cache[filter];

  useEffect(() => {
    if (cache[filter]) return;
    const controller = new AbortController();
    setFeedError(null);
    discoveryApi.list(filter, controller.signal)
      .then(response => setCache(prev => ({ ...prev, [filter]: response.items })))
      .catch(error => {
        if (error instanceof DOMException && error.name === 'AbortError') return;
        setFeedError(errorMessageKey(error));
      });
    return () => controller.abort();
  }, [filter, cache, reloadKey]);

  useEffect(() => {
    if (status !== 'authenticated') {
      setProgress(null);
      return;
    }
    let active = true;
    gameApi(authRequest).progress()
      .then(value => { if (active) setProgress(value); })
      .catch(() => { if (active) setProgress(null); });
    return () => { active = false; };
  }, [status, authRequest]);

  const closeDetails = useCallback(() => setSelected(null), []);
  const columns = useMemo(() => items ?? [], [items]);

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.logo}>{t('appName')}</h1>
          <p className={styles.tagline}>{t('tagline')}</p>
        </div>
        <LangSwitch />
      </header>

      <section className={styles.progressBox} aria-live="polite">
        {status === 'authenticated' && progress && (
          <>
            <p>
              <strong>{user?.displayName ?? t('you')}</strong>: {pick(progress.levelTitle)} · {progress.score}
              {progress.nextLevelScore != null ? ` / ${progress.nextLevelScore}` : ''} {t('points')}
            </p>
            <ProgressBar value={progress.score} max={progress.nextLevelScore ?? progress.score} />
          </>
        )}
        {status === 'anonymous' && (
          <p>
            {t('loginToPlay')} · <Link to="/login">{t('login')}</Link> · <Link to="/register">{t('register')}</Link>
          </p>
        )}
        {status === 'loading' && <p>{t('loading')}</p>}
      </section>

      <section className={styles.banner}>
        <h2>{t('questBannerTitle')}</h2>
        <p>{t('questBannerText')}</p>
        <button type="button" className={styles.bannerButton} onClick={() => navigate('/game')}>
          {progress && progress.score > 0 ? t('continueQuest') : t('startQuest')}
        </button>
      </section>

      <div className={styles.filters} role="tablist">
        {FILTERS.map(item => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={filter === item.id}
            className={filter === item.id ? `${styles.chip} ${styles.chipActive}` : styles.chip}
            onClick={() => setFilter(item.id)}
          >
            {t(item.label)}
          </button>
        ))}
      </div>

      {feedError && (
        <div className={styles.state} role="alert">
          <p>{t(feedError)}</p>
          <button type="button" onClick={() => setReloadKey(k => k + 1)}>{t('retry')}</button>
        </div>
      )}
      {!feedError && !items && <p className={styles.state}>{t('loading')}</p>}
      {!feedError && items && items.length === 0 && <p className={styles.state}>{t('emptyFeed')}</p>}

      <section className={styles.masonry}>
        {columns.map(item => (
          <button key={item.id} type="button" className={styles.card} onClick={() => setSelected(item)}>
            <img src={item.imageUrl} alt="" loading="lazy" />
            <span className={styles.cardBody}>
              <span className={styles.cardTitle}>{pick(item.title)}</span>
              <span className={styles.cardCategory}>{t(`cat${item.category}` as MessageKey)}</span>
            </span>
          </button>
        ))}
      </section>

      {selected && (
        <Modal title={pick(selected.title)} onClose={closeDetails}>
          <img className={styles.detailImage} src={selected.imageUrl} alt="" />
          <p className={styles.cardCategory}>{t(`cat${selected.category}` as MessageKey)}</p>
          <p>{pick(selected.description)}</p>
          {selected.isDemo && <p className={styles.demoNote}>{t('demoMaterial')}</p>}
          {isSafeExternalUrl(selected.externalUrl) && (
            <a className={styles.moreLink} href={selected.externalUrl} target="_blank" rel="noopener noreferrer">
              {t('more')} ↗
            </a>
          )}
        </Modal>
      )}
    </main>
  );
}
