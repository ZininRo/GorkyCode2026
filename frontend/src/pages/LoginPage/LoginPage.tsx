import { useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getFieldError, getFormError } from '../../components/FormError';
import styles from './LoginPage.module.css';

export function LoginPage() {
  const { login, status } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<unknown>(null);
  if (status === 'authenticated') return <Navigate to="/profile" replace />;
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setPending(true); setError(null);
    try { await login({ email: email.trim(), password }); navigate('/profile', { replace: true }); }
    catch (err) { setError(err); }
    finally { setPending(false); }
  }
  return <main className={styles.card}>
    <h1>Вход</h1>
    <form onSubmit={submit} className={styles.form}>
      <label>Email<input type="email" required maxLength={254} autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} /></label>
      {getFieldError(error, 'email') && <small role="alert">{getFieldError(error, 'email')}</small>}
      <label>Пароль<input type="password" required autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} /></label>
      {getFieldError(error, 'password') && <small role="alert">{getFieldError(error, 'password')}</small>}
      {error != null && <p role="alert" className={styles.error}>{getFormError(error)}</p>}
      <button disabled={pending || status === 'loading'}>{pending ? 'Входим…' : 'Войти'}</button>
    </form>
    <p>Нет аккаунта? <Link to="/register">Зарегистрироваться</Link></p>
  </main>;
}
