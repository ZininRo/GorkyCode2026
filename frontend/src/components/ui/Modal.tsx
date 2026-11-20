import { useEffect, type ReactNode } from 'react';
import { useI18n } from '../../i18n/I18nContext';
import styles from './ui.module.css';

interface ModalProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
}

/** Простое модальное окно поверх страницы: закрывается по Esc, по фону и кнопке. */
export function Modal({ title, onClose, children }: ModalProps) {
  const { t } = useI18n();

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
    };
  }, [onClose]);

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <div className={styles.modal} role="dialog" aria-modal="true" aria-label={title} onClick={e => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2>{title}</h2>
          <button type="button" className={styles.iconButton} onClick={onClose} aria-label={t('close')}>✕</button>
        </div>
        <div className={styles.modalBody}>{children}</div>
      </div>
    </div>
  );
}

export function LangSwitch() {
  const { lang, setLang, t } = useI18n();
  return (
    <div className={styles.langSwitch} role="group" aria-label={t('language')}>
      <button type="button" aria-pressed={lang === 'ru'} onClick={() => setLang('ru')}>RU</button>
      <button type="button" aria-pressed={lang === 'en'} onClick={() => setLang('en')}>EN</button>
    </div>
  );
}

export function ProgressBar({ value, max }: { value: number; max: number }) {
  const percent = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 100;
  return (
    <div className={styles.progressTrack} role="progressbar" aria-valuemin={0} aria-valuemax={max} aria-valuenow={value}>
      <div className={styles.progressFill} style={{ width: `${percent}%` }} />
    </div>
  );
}
