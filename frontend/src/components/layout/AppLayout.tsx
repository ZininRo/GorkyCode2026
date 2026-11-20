import { NavLink, Outlet, useMatch } from 'react-router-dom';
import { useI18n } from '../../i18n/I18nContext';
import styles from './AppLayout.module.css';

/** Каркас мобильных экранов: контент + нижняя навигация «Главная / Квест / Профиль». */
export function AppLayout() {
  const { t } = useI18n();
  const quest = useMatch("/game/:checkpointId?");
  const linkClass = ({ isActive }: { isActive: boolean }) => (isActive ? `${styles.link} ${styles.active}` : styles.link);

  return (
    <div className={quest ? `${styles.shell} ${styles.wide}` : styles.shell}>
      <div className={styles.content}>
        <Outlet />
      </div>
      <nav className={styles.nav} aria-label="Main">
        <NavLink to="/" end className={linkClass}>
          <span aria-hidden="true">⌂</span>
          {t('navHome')}
        </NavLink>
        <NavLink to="/game" className={linkClass}>
          <span aria-hidden="true">◆</span>
          {t('navQuest')}
        </NavLink>
        <NavLink to="/profile" className={linkClass}>
          <span aria-hidden="true">☺</span>
          {t('navProfile')}
        </NavLink>
      </nav>
    </div>
  );
}
