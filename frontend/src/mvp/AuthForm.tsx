import { useEffect, useState, type FormEvent } from 'react';
import { Link, useLocation } from 'react-router-dom';
import type { City, LoginRequest, RegisterRequest } from '../types/auth.types';
import { cityApi } from '../api/city.api';
import { art } from './content';
import { searchCities, signIn, type Profile } from './demo';
import { Icon } from './icons';

export interface ConnectedAuth {
  login: (payload: LoginRequest) => Promise<void>;
  register: (payload: RegisterRequest) => Promise<void>;
}

export function AuthForm({ register, onAuth, connected }: { register: boolean; onAuth: (profile?: Profile) => void; connected?: ConnectedAuth }) {
  const { state: returnState } = useLocation();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<City | null>(null);
  const [options, setOptions] = useState<City[]>([]);
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(-1);
  const [loading, setLoading] = useState(false);
  const [searchError, setSearchError] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setSearchError(false);
      const search = connected
        ? cityApi.search(query, controller.signal).then(response => response.items)
        : searchCities(query, controller.signal);
      void search.then(results => {
        if (!controller.signal.aborted) {
          setOptions(results);
          setLoading(false);
        }
      }).catch(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
          setSearchError(true);
        }
      });
    }, 250);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [open, query, connected]);

  function choose(city: City) {
    setSelected(city);
    setQuery(city.name);
    setOpen(false);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (pending) return;
    setError('');
    if ((register || !connected) && name.trim().length < 2) { setError('Введите имя длиной от двух символов.'); return; }
    if (register && !selected) { setError('Выберите город из списка.'); return; }
    setPending(true);
    try {
      if (connected) {
        const credentials = { email: email.trim(), password };
        if (register && selected) await connected.register({ ...credentials, displayName: name.trim(), cityId: selected.id });
        else await connected.login(credentials);
        onAuth();
      } else {
        onAuth(await signIn(name, password, register ? selected?.id : undefined));
      }
    }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Попробуйте ещё раз.'); }
    finally { setPending(false); }
  }

  return <main className="auth-screen">
    <div className="auth-art" style={{ backgroundImage: `url(${art('hero')})` }}><img src={art('nino')} alt="Оленёнок НиНо" /></div>
    <form className="auth-card" onSubmit={submit}>
      <h1>{register ? 'Регистрация' : 'Вход'}</h1>
      <p className="muted">{register ? 'Создай профиль, чтобы сохранять прогресс и проходить квесты.' : 'Войди, чтобы вернуться к своим маршрутам.'}</p>
      {(register || !connected) && <label>Имя<input autoComplete={connected ? 'name' : 'username'} required minLength={2} maxLength={60} value={name} onChange={event => setName(event.target.value)} /></label>}
      {connected && <label>Электронная почта<input type="email" autoComplete="email" required maxLength={254} value={email} onChange={event => setEmail(event.target.value)} /></label>}
      <label>Пароль<span className="password">
        <input type={show ? 'text' : 'password'} autoComplete={register ? 'new-password' : 'current-password'} required minLength={8} maxLength={128} value={password} onChange={event => setPassword(event.target.value)} />
        <button type="button" className="password-toggle" aria-label={show ? 'Скрыть пароль' : 'Показать пароль'} onClick={() => setShow(!show)}><Icon name="eye" /></button>
      </span></label>
      {register && <div className="city-field">
        <label htmlFor="city">Город</label>
        <input id="city" autoComplete="off" role="combobox" aria-autocomplete="list" aria-expanded={open} aria-controls={open ? 'city-list' : undefined} aria-activedescendant={open && highlight >= 0 ? `city-${options[highlight]?.id}` : undefined} required placeholder="Начни вводить название" value={query}
          onFocus={() => { setLoading(true); setOpen(true); setHighlight(-1); }}
          onBlur={() => setOpen(false)}
          onChange={event => { setQuery(event.target.value); setSelected(null); setOptions([]); setLoading(true); setOpen(true); setHighlight(-1); }}
          onKeyDown={event => {
            if (event.key === 'Escape') setOpen(false);
            if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
              event.preventDefault();
              if (!open) { setOpen(true); setLoading(true); }
              else if (options.length) setHighlight(event.key === 'ArrowDown' ? (highlight + 1) % options.length : (highlight <= 0 ? options.length - 1 : highlight - 1));
            }
            if (event.key === 'Enter' && open && options[highlight]) { event.preventDefault(); choose(options[highlight]); }
          }} />
        {open && <div className="city-list" id="city-list" role="listbox" aria-label="Варианты города">
          {loading ? <span>Ищем города…</span> : searchError ? <span role="alert">Не удалось загрузить города.</span> : options.length ? options.map((city, index) =>
            <div id={`city-${city.id}`} role="option" aria-selected={index === highlight} key={city.id} onPointerDown={event => event.preventDefault()} onClick={() => choose(city)}>{city.name}</div>
          ) : <span>Городов с таким названием нет.</span>}
        </div>}
      </div>}
      {error && <p className="error" role="alert">{error}</p>}
      <button className="button gold" disabled={pending}>{pending ? 'Подожди…' : register ? 'Продолжить' : 'Войти'}</button>
      <p className="auth-links">{register ? 'Уже есть профиль? ' : 'Впервые здесь? '}<Link to={register ? '/login' : '/register'} state={returnState}>{register ? 'Войти' : 'Создать профиль'}</Link></p>
      <small className="muted">{connected ? 'Прогресс квестов сохраняется в твоём профиле.' : 'Демо-профиль и прогресс сохраняются в этом браузере.'}</small>
    </form>
  </main>;
}
