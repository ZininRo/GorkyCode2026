import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useI18n, type MessageKey } from '../../i18n/I18nContext';
import { aiApi, gameApi } from '../../api/game.api';
import { errorMessageKey } from '../../lib/apiErrors';
import { LangSwitch, ProgressBar } from '../../components/ui/Modal';
import type { AiRecommendations, GameState } from '../../types/game.types';
import styles from './ProfilePage.module.css';

/** Профиль: данные регистрации (как раньше) + уровень, очки, кристаллы, маршруты, рекомендации ИИ. */
export function ProfilePage() {
  const { user, logout, authRequest } = useAuth();
  const { lang, t, pick } = useI18n();
  const navigate = useNavigate();
  const api = useMemo(() => gameApi(authRequest), [authRequest]);
  const [game, setGame] = useState<GameState | null>(null);
  const [error, setError] = useState<MessageKey | null>(null);
  const [recs, setRecs] = useState<AiRecommendations | null>(null);

  useEffect(() => {
    let active = true;
    api.state()
      .then(state => { if (active) setGame(state); })
      .catch(err => { if (active) setError(errorMessageKey(err)); });
    return () => { active = false; };
  }, [api]);

  useEffect(() => {
    let active = true;
    aiApi(authRequest).recommendations(lang)
      .then(value => { if (active) setRecs(value); })
      .catch(() => { if (active) setRecs(null); });
    return () => { active = false; };
  }, [authRequest, lang, game?.progress.level]);

  async function signOut() {
    await logout();
    navigate('/login', { replace: true });
  }

  const progress = game?.progress;
  const collected = game?.checkpoints.filter(cp => cp.collected) ?? [];

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <h1>{t('profileTitle')}</h1>
        <LangSwitch />
      </header>

      <section className={styles.card}>
        <p><span className={styles.label}>{t('nickname')}:</span> {user?.displayName}</p>
        {user?.email && <p><span className={styles.label}>Email:</span> {user.email}</p>}
        {user?.city && (
          <>
            <p><span className={styles.label}>{t('city')}:</span> {user.city.name}{user.city.region ? `, ${user.city.region}` : ''}</p>
            <p><span className={styles.label}>{t('country')}:</span> {user.city.countryCode}</p>
          </>
        )}
      </section>

      {error && <p role="alert">{t(error)}</p>}
      {!error && !progress && <p>{t('loading')}</p>}

      {progress && game && (
        <>
          <section className={styles.card}>
            <p className={styles.level}>{t('level')}: {pick(progress.levelTitle)}</p>
            <p>
              {t('score')}: <strong>{progress.score}</strong>
              {progress.nextLevelScore != null ? ` / ${progress.nextLevelScore} ${t('nextLevel')}` : ` · ${t('maxLevel')}`}
            </p>
            <ProgressBar value={progress.score} max={progress.nextLevelScore ?? progress.score} />
            <div className={styles.stats}>
              <div><strong>{progress.collectedCount}</strong><span>{t('collectedPoints')}</span></div>
              <div><strong>{progress.unlockedRoutesCount}</strong><span>{t('openedRoutes')}</span></div>
            </div>
          </section>

          <section className={styles.card}>
            <h2>{t('routes')}</h2>
            <ul className={styles.list}>
              {game.routes.map(route => (
                <li key={route.id}>
                  {route.unlocked ? '✓' : '🔒'} {pick(route.title)}{' '}
                  <span className={styles.muted}>
                    {route.unlocked
                      ? `${route.collectedCount}/${route.checkpointCount}`
                      : t('routeLocked', { n: route.requiredScore })}
                  </span>
                </li>
              ))}
            </ul>
          </section>

          <section className={styles.card}>
            <h2>{t('myCrystals')}</h2>
            {collected.length === 0 && <p className={styles.muted}>{t('noCrystals')} <Link to="/game">→</Link></p>}
            <ul className={styles.list}>
              {collected.map(cp => (
                <li key={cp.id}>
                  <span className={cp.type === 'GREEN' ? styles.dotGreen : styles.dotYellow} aria-hidden="true" />
                  {pick(cp.title)} <span className={styles.muted}>+{cp.score}</span>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}

      {recs && recs.items.length > 0 && (
        <section className={styles.card}>
          <h2>{t('recommendations')}</h2>
          <p className={styles.muted}>{recs.intro}</p>
          <ul className={styles.list}>
            {recs.items.map(item => (
              <li key={item.id}><strong>{item.title}</strong> — <span className={styles.muted}>{item.description}</span></li>
            ))}
          </ul>
        </section>
      )}

      <button type="button" className={styles.logout} onClick={() => void signOut()}>{t('logout')}</button>
    </main>
  );
}
