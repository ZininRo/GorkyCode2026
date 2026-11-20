import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
export function ProtectedRoute() {
  const { status } = useAuth();
  if (status === 'loading') return <p>Проверяем сессию…</p>;
  return status === 'authenticated' ? <Outlet /> : <Navigate to="/login" replace />;
}
