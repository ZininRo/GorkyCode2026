
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export function GuestRoute() {
  const { status } = useAuth();

  if (status === 'loading') {
    return <p>Проверяем авторизацию...</p>;
  }

  if (status === 'authenticated') {
    return <Navigate to="/profile" replace />;
  }

  return <Outlet />;
}
