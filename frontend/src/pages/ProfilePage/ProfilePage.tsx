import { useAuth } from '../../context/AuthContext';

export function ProfilePage() {
  const { user } = useAuth();

  return (
    <div>
      <h1>Профиль</h1>
      <p>Добро пожаловать{user?.displayName ? `, ${user.displayName}` : ''}!</p>
      {user?.email && <p>Email: {user.email}</p>}
      {user?.city && (
        <p>
          Город: {user.city.name}{user.city.region ? `, ${user.city.region}` : ''}
        </p>
      )}
    </div>
  );
}
