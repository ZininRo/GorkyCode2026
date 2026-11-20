import { BrowserRouter } from 'react-router-dom';

import { AuthProvider } from './context/AuthContext';
import { I18nProvider } from './i18n/I18nContext';
import { AppRouter } from './router/AppRouter';

export default function App() {
  return (
    <BrowserRouter>
      <I18nProvider>
        <AuthProvider>
          <AppRouter />
        </AuthProvider>
      </I18nProvider>
    </BrowserRouter>
  );
}
