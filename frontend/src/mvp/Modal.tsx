import { useEffect, useRef, type ReactNode } from 'react';
import { Icon } from './icons';

export function Modal({ title, onClose, className = '', showClose = true, children }: { title: string; onClose: () => void; className?: string; showClose?: boolean; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    dialog.showModal();
    return () => dialog.close();
  }, []);

  return <dialog ref={ref} aria-label={title} className={className} onCancel={event => { event.preventDefault(); onClose(); }} onClick={event => { if (event.target === ref.current) onClose(); }}>
    <div className="modal-body">
      {showClose && <button className="icon-button modal-close" onClick={onClose} aria-label="Закрыть" autoFocus><Icon name="close" /></button>}
      {children}
    </div>
  </dialog>;
}
