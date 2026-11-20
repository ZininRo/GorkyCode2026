import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { AuthProvider } from './context/AuthContext';
import { I18nProvider } from './i18n/I18nContext';

const root = createRoot(document.getElementById('root')!);
const mode = import.meta.env.VITE_APP_MODE;

async function mount() {
  if (mode === 'legacy') {
    const [{ default: App }] = await Promise.all([import('./App'), import('./styles/index.css')]);
    root.render(<StrictMode><App /></StrictMode>);
  } else {
    const { Site } = await import('./mvp/Site');
    root.render(<StrictMode>{mode === 'demo'
      ? <Site />
      : <I18nProvider><AuthProvider><Site connected /></AuthProvider></I18nProvider>
    }</StrictMode>);
  }
}
void mount();
