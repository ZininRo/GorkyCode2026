import { Navigate, Route, Routes } from 'react-router-dom';

import { ProtectedRoute } from '../components/routing/ProtectedRoute';
import { GuestRoute } from '../components/routing/GuestRoute';
import { AppLayout } from '../components/layout/AppLayout';

import { HomePage } from '../pages/HomePage/HomePage';
import { LoginPage } from '../pages/LoginPage/LoginPage';
import { RegisterPage } from '../pages/RegisterPage/RegisterPage';
import { ProfilePage } from '../pages/ProfilePage/ProfilePage';
import { GamePage } from '../pages/GamePage/GamePage';
import { NotFoundPage } from '../pages/NotFoundPage/NotFoundPage';

export function AppRouter() {
  return (
    <Routes>
      {/* Экраны с нижней навигацией «Главная / Квест / Профиль» */}
      <Route element={<AppLayout />}>
        {/* Главная: афиша доступна всем, прогресс — после входа */}
        <Route path="/" element={<HomePage />} />
        <Route path="/home" element={<Navigate to="/" replace />} />

        {/* Только для авторизованных */}
        <Route element={<ProtectedRoute />}>
          <Route path="/game/:checkpointId?" element={<GamePage />} />
          <Route path="/profile" element={<ProfilePage />} />
        </Route>
      </Route>

      {/* Только для гостей (существующая регистрация и вход — без изменений) */}
      <Route element={<GuestRoute />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
      </Route>

      {/* Несуществующие страницы */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
