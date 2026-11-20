
import { Route, Routes } from 'react-router-dom';

import { ProtectedRoute } from '../components/routing/ProtectedRoute';
import { GuestRoute } from '../components/routing/GuestRoute';

import { HomePage } from '../pages/HomePage/HomePage';
import { LoginPage } from '../pages/LoginPage/LoginPage';
import { RegisterPage } from '../pages/RegisterPage/RegisterPage';
import { ProfilePage } from '../pages/ProfilePage/ProfilePage';
import { NotFoundPage } from '../pages/NotFoundPage/NotFoundPage';

export function AppRouter() {
  return (
    <Routes>
      {/* Главная страница */}
      <Route path="/" element={<HomePage />} />

      {/* Только для гостей */}
      <Route element={<GuestRoute />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
      </Route>

      {/* Только для авторизованных */}
      <Route element={<ProtectedRoute />}>
        <Route path="/profile" element={<ProfilePage />} />
      </Route>

      {/* Несуществующие страницы */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
