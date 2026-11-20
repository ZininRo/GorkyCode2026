import { useEffect, useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { cityApi } from '../../api/city.api';
import { getFieldError, getFormError } from '../../components/FormError';
import type { City } from '../../types/auth.types';
import styles from './RegisterPage.module.css';

function cityLabel(city: City) {
  return city.region ? `${city.name}, ${city.region}` : city.name;
}

export function RegisterPage() {
  const { register, status } = useAuth();
  const navigate = useNavigate();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [cityQuery, setCityQuery] = useState('');
  const [selectedCity, setSelectedCity] = useState<City | null>(null);
  const [cities, setCities] = useState<City[]>([]);
  const [cityOpen, setCityOpen] = useState(false);
  const [cityLoading, setCityLoading] = useState(false);
  const [cityError, setCityError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<unknown>(null);

  useEffect(() => {
    if (!cityOpen) return;

    const query = cityQuery.trim();
    if (query.length === 1) {
      setCities([]);
      setCityLoading(false);
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setCityLoading(true);
      setCityError(null);
      void cityApi.search(query, controller.signal)
        .then(response => setCities(response.items))
        .catch(err => {
          if (err instanceof DOMException && err.name === 'AbortError') return;
          setCities([]);
          setCityError(getFormError(err));
        })
        .finally(() => {
          if (!controller.signal.aborted) setCityLoading(false);
        });
    }, 250);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [cityOpen, cityQuery]);

  if (status === 'authenticated') return <Navigate to="/profile" replace />;

  function updateCityQuery(value: string) {
    setCityQuery(value);
    setSelectedCity(null);
    setCityOpen(true);
  }

  function selectCity(city: City) {
    setSelectedCity(city);
    setCityQuery(city.name);
    setCities([]);
    setCityOpen(false);
    setCityError(null);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (displayName.trim().length < 2) {
      setError(new Error('Имя должно содержать от 2 до 60 символов'));
      return;
    }

    if (!selectedCity) {
      setError(new Error('Выберите город из выпадающего списка'));
      setCityOpen(true);
      return;
    }

    setPending(true);
    try {
      await register({
        displayName: displayName.trim(),
        email: email.trim(),
        password,
        cityId: selectedCity.id,
      });
      navigate('/profile', { replace: true });
    } catch (err) {
      setError(err);
    } finally {
      setPending(false);
    }
  }

  return <main className={styles.card}>
    <h1>Регистрация</h1>
    <form onSubmit={submit} className={styles.form}>
      <label>Имя
        <input
          required
          minLength={2}
          maxLength={60}
          autoComplete="name"
          value={displayName}
          onChange={e => setDisplayName(e.target.value)}
        />
      </label>
      {getFieldError(error, 'displayName') && <small role="alert">{getFieldError(error, 'displayName')}</small>}

      <label>Email
        <input
          type="email"
          required
          maxLength={254}
          autoComplete="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
        />
      </label>
      {getFieldError(error, 'email') && <small role="alert">{getFieldError(error, 'email')}</small>}

      <label>Пароль
        <input
          type="password"
          required
          minLength={8}
          maxLength={128}
          autoComplete="new-password"
          value={password}
          onChange={e => setPassword(e.target.value)}
        />
      </label>
      {getFieldError(error, 'password') && <small role="alert">{getFieldError(error, 'password')}</small>}

      <div className={styles.cityField}>
        <label htmlFor="register-city">Город</label>
        <div className={styles.cityPicker}>
          <input
            id="register-city"
            required
            autoComplete="off"
            value={cityQuery}
            onFocus={() => setCityOpen(true)}
            onChange={e => updateCityQuery(e.target.value)}
            aria-autocomplete="list"
            aria-expanded={cityOpen}
            aria-controls="city-options"
            placeholder="Начните вводить город"
          />

          {cityOpen && (cityLoading || cities.length > 0 || cityError) && (
            <div id="city-options" className={styles.cityOptions} role="listbox">
              {cityLoading && <div className={styles.cityStatus}>Ищем города…</div>}
              {!cityLoading && cityError && <div className={styles.cityStatus} role="alert">{cityError}</div>}
              {!cityLoading && !cityError && cities.map(city => (
                <button
                  key={city.id}
                  type="button"
                  role="option"
                  className={styles.cityOption}
                  onMouseDown={event => event.preventDefault()}
                  onClick={() => selectCity(city)}
                >
                  <span>{city.name}</span>
                  <small>{city.region ?? city.countryCode}</small>
                </button>
              ))}
              {!cityLoading && !cityError && cities.length === 0 && (
                <div className={styles.cityStatus}>Города не найдены</div>
              )}
            </div>
          )}
        </div>
        {selectedCity && <small className={styles.selectedCity}>Выбрано: {cityLabel(selectedCity)}</small>}
        {getFieldError(error, 'cityId') && <small role="alert">{getFieldError(error, 'cityId')}</small>}
      </div>

      {error != null && <p role="alert" className={styles.error}>{getFormError(error)}</p>}
      <button disabled={pending || status === 'loading'}>{pending ? 'Регистрируем…' : 'Зарегистрироваться'}</button>
    </form>
    <p>Уже есть аккаунт? <Link to="/login">Войти</Link></p>
  </main>;
}
