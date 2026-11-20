import { useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getFieldError, getFormError } from '../../components/FormError';
import styles from './RegisterPage.module.css';

export function RegisterPage() {
  const { register, status } = useAuth();
  const navigate = useNavigate();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<unknown>(null);
  if (status === 'authenticated') return <Navigate to="/profile" replace />;
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(null);
    if (displayName.trim().length < 2) { setError(new Error('Имя должно содержать от 2 до 60 символов')); return; }
    setPending(true);
    try { await register({ displayName: displayName.trim(), email: email.trim(), password }); navigate('/profile', { replace: true }); }
    catch (err) { setError(err); }
    finally { setPending(false); }
  }
  return <main className={styles.card}>
    <h1>Регистрация</h1>
    <form onSubmit={submit} className={styles.form}>
      <label>Имя<input required minLength={2} maxLength={60} autoComplete="name" value={displayName} onChange={e => setDisplayName(e.target.value)} /></label>
      {getFieldError(error, 'displayName') && <small role="alert">{getFieldError(error, 'displayName')}</small>}
      <label>Email<input type="email" required maxLength={254} autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} /></label>
      {getFieldError(error, 'email') && <small role="alert">{getFieldError(error, 'email')}</small>}
      <label>Пароль<input type="password" required minLength={8} maxLength={128} autoComplete="new-password" value={password} onChange={e => setPassword(e.target.value)} /></label>
      {getFieldError(error, 'password') && <small role="alert">{getFieldError(error, 'password')}</small>}
      {error != null && <p role="alert" className={styles.error}>{getFormError(error)}</p>}
      <button disabled={pending || status === 'loading'}>{pending ? 'Регистрируем…' : 'Зарегистрироваться'}</button>
    </form>
    <p>Уже есть аккаунт? <Link to="/login">Войти</Link></p>
  </main>;
}
