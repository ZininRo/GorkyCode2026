import { lazy, Suspense, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { BrowserRouter, HashRouter, Link, Navigate, NavLink, Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom';
import { art, categories, events, osm, places, placeOrder, POINTS, quests, walk, type Category, type PlaceId, type Quest } from './content';
import { changeJourney, count, currentProfile, enterGuest, logout, readJourney, totalScore, type Journey, type Profile } from './demo';
import { Icon, Gem } from './icons';
import { useAuth } from '../context/AuthContext';
import { guidedApi, type GuidedSnapshot, type QuestActions } from './guidedApi';
import { AuthForm, type ConnectedAuth } from './AuthForm';
import { Modal } from './Modal';
import { Meter, Play } from './Play';
import './site.css';

const ServerMapPage = lazy(() => import('../pages/GamePage/GamePage').then(module => ({ default: module.GamePage })));

const navigation = [
  { to: '/', label: 'Главная', icon: 'home' },
  { to: '/quests', label: 'Квесты', icon: 'compass' },
  { to: '/my-quests', label: 'Мои квесты', icon: 'route' },
  { to: '/profile', label: 'Профиль', icon: 'user' },
] as const;

const anonymous = { active: null, routes: {}, saved: [], demo: true } satisfies Journey;
type Update = (fn: (state: Journey) => Journey) => void;
function activeQuest(journey: Journey) {
  const recent = [journey.active, ...Object.keys(journey.routes).reverse()];
  for (const id of recent) {
    const quest = quests.find(item => item.id === id);
    if (quest && count(journey, quest.id) < quest.stops.length) return quest;
  }
}
const continueTo = (journey: Journey) => {
  const active = activeQuest(journey);
  return active ? '/play/' + active.id : '/quests';
};

function Brand() {
  return <Link className="brand" to="/" aria-label="Открывай Нижний, главная"><img src={art('nino')} alt="" /><span>Открывай<strong>Нижний</strong></span></Link>;
}

function NavItems({ connected }: { connected: boolean }) {
  const items = connected ? [...navigation.slice(0, 2), { to: '/game', label: 'Карта', icon: 'map' } as const, ...navigation.slice(2)] : navigation;
  return items.map(item => <NavLink key={item.to} to={item.to} end={item.to === '/'}><Icon name={item.icon} size={19} /><span>{item.label}</span></NavLink>);
}

function Tabs<T extends string>({ items, value, onChange, label }: { items: readonly T[]; value: T; onChange: (next: T) => void; label: string }) {
  return <div className="chips" role="group" aria-label={label}>
    {items.map(item => <button className="chip" aria-pressed={item === value} key={item} onClick={() => onChange(item)}>{item}</button>)}
  </div>;
}

function Home({ journey }: { journey: Journey }) {
  const [filter, setFilter] = useState<Category>('Все');
  const showPlaces = filter === 'Все' || filter === 'Места';
  const eventCards = filter === 'Все' ? events : events.filter(event => event.category === filter);
  return <main className="shell home-page">
    <section className="hero">
      <div className="hero-scene">
        <div className="hero-image" />
        <img className="hero-mascot" src={art('nino')} alt="" />
        <span className="hero-caption"><Icon name="pin" size={14} /> Стрелка · Ока и Волга</span>
      </div>
      <div className="hero-content">
        <p className="eyebrow"><Icon name="pin" size={17} /> Нижний Новгород</p>
        <h1>Город ждёт<br />открытий<span>.</span></h1>
        <p>Гуляй с оленёнком НиНо, собирай кристаллы и открывай истории Нижнего.</p>
        <Link className="button gold" to={continueTo(journey)}><Icon name="compass" />{activeQuest(journey) ? 'Продолжить квест' : 'Начать квест'} <Icon name="arrow" size={18} /></Link>
      </div>
    </section>
    <section className="discover">
      <div className="discover-heading"><div><p className="eyebrow"><Icon name="spark" size={17} /> Путеводитель</p><h2>Куда пойдём?</h2></div>
        <Tabs items={categories} value={filter} onChange={setFilter} label="Категории путеводителя" />
      </div>
      <div className="place-grid">
        {showPlaces && placeOrder.map(id => <PlaceTile key={id} id={id} />)}
        {eventCards.map(event => <PlaceTile key={event.id} id={event.place} title={event.title} sub={event.category + ' · пример'} to={'/event/' + event.id} />)}
      </div>
    </section>
  </main>;
}

function PlaceTile({ id, title, sub, to }: { id: PlaceId; title?: string; sub?: string; to?: string }) {
  const place = places[id];
  return <Link className="place-tile" to={to ?? '/place/' + id}>
    <img loading="lazy" src={art(id)} alt={title ? place.title : ''} />
    <div className="place-tile-text"><div><small><Icon name="pin" size={14} /> {sub ?? place.district}</small><h3>{title ?? place.title}</h3></div><span className="tile-arrow"><Icon name="chevron" size={19} /></span></div>
  </Link>;
}

function Detail({ journey, save, isEvent, busy }: { journey: Journey; save: (item: string, saved: boolean) => void; isEvent: boolean; busy: boolean }) {
  const { id = '' } = useParams();
  const event = isEvent ? events.find(item => item.id === id) : undefined;
  const placeId = isEvent ? event?.place : placeOrder.find(key => key === id);
  if (!placeId) return <Missing />;
  const place = places[placeId];
  const title = event?.title ?? place.title;
  const bookmarkId = event ? 'event-' + event.id : 'place-' + placeId;
  const saved = journey.saved.includes(bookmarkId);

  return <main className="shell detail-page">
    <Link className="back-link" to="/"><Icon name="back" /> К путеводителю</Link>
    <div className="detail-layout">
      <img className="detail-hero" src={art(placeId)} alt={place.title} />
      <article className="paper detail-card">
        <span className="pill">{event ? event.category + ' · демо' : 'Место'}</span>
        <h1>{title}</h1>
        {event && <p className="detail-meta"><Icon name="calendar" /> {event.when}</p>}
        <p className="detail-meta"><Icon name="pin" /> {place.district}</p>
        <p>{event?.description ?? place.fact}</p>
        {event && <p className="muted">Пример карточки. Актуальные события и билеты доступны в городской афише.</p>}
        <div className="detail-actions">
          <a className="button gold" href={event?.url ?? walk(place.coordinates)} target="_blank" rel="noreferrer"><Icon name={event ? 'calendar' : 'map'} /> {event ? 'Открыть афишу' : 'Построить пеший маршрут'}</a>
          <button className="icon-button bookmark" aria-label={saved ? 'Удалить из избранного' : 'Сохранить в избранное'} aria-pressed={saved} disabled={busy} onClick={() => save(bookmarkId, !saved)}><Icon name="bookmark" /></button>
        </div>
      </article>
    </div>
    <section className="paper photo-panel">
      <h2><Icon name="image" /> Фотографии места</h2>
      <div><a href={art(placeId + '-photo')} target="_blank" rel="noreferrer"><img src={art(placeId + '-photo')} alt={place.title + ' — фотография'} /></a>
      <p>Фотография из Wikimedia Commons. Игровая иллюстрация сделана по этому снимку.<br /><Link className="text-link" to="/credits">Авторы и лицензии</Link></p></div>
    </section>
  </main>;
}

const questFilters = ['Все', 'Доступные', 'В процессе', 'Завершённые'] as const;
type QuestFilter = typeof questFilters[number];
function status(quest: Quest, journey: Journey) {
  const n = count(journey, quest.id);
  if (n === quest.stops.length) return 'Завершённые';
  if (quest.id in journey.routes) return 'В процессе';
  if (totalScore(journey) < quest.required) return 'Закрытые';
  return 'Доступные';
}

function QuestList({ journey, start, busy }: { journey: Journey; start: (quest: Quest) => void; busy: boolean }) {
  const [filter, setFilter] = useState<QuestFilter>('Все');
  const [expanded, setExpanded] = useState<string | null>('ghosts');
  const available = quests.filter(quest => filter === 'Все' || status(quest, journey) === filter);
  return <main className="shell inner-page">
    <div className="section-banner"><div><p className="eyebrow"><Icon name="compass" size={17} /> Городские маршруты</p><h1>Квесты</h1><p>Выбери прогулку. НиНо покажет первую точку.</p></div><img src={art('nino')} alt="" /></div>
    <Tabs items={questFilters} value={filter} onChange={setFilter} label="Статус квеста" />
    <div className="quest-list">{available.length ? available.map(quest => {
      const state = status(quest, journey);
      const locked = state === 'Закрытые';
      const completed = state === 'Завершённые';
      const open = expanded === quest.id && !locked;
      const n = count(journey, quest.id);
      return <article key={quest.id} className={`paper quest ${locked ? 'quest-locked' : ''}`}>
        <button className="quest-summary" disabled={locked} aria-expanded={open} onClick={() => setExpanded(open ? null : quest.id)}>
          <img src={art(quest.stops[0])} alt="" />
          <span className="quest-heading"><strong>{quest.title}</strong>
            <span className={`pill ${locked ? 'locked' : ''}`}>{locked ? `Доступен с ${quest.required} очков` : completed ? 'Завершён' : state === 'В процессе' ? `В процессе · ${n}/${quest.stops.length}` : 'Доступен'}</span>
          </span><span className={open ? 'chevron-open' : ''}><Icon name={locked ? 'lock' : 'chevron'} /></span>
        </button>
        {open && <div className="quest-expand"><p>{quest.description}</p><div className="quest-facts"><span><Icon name="route" /> {quest.stops.length} точки</span><span><Icon name="calendar" /> {quest.minutes}</span><span><Gem small /> +{quest.stops.length * POINTS} очков</span></div>
          {completed ? <Link className="button gold" to="/my-quests">Посмотреть историю</Link> :
            <button className="button gold" disabled={busy} onClick={() => start(quest)}><Icon name="compass" /> {state === 'В процессе' ? 'Продолжить' : 'Начать'}</button>}
        </div>}
      </article>;
    }) : <p className="paper empty">В этой категории пока нет квестов.</p>}</div>
  </main>;
}

function MyQuests({ journey, profile, start }: { journey: Journey; profile: Profile | null; start: (quest: Quest) => void }) {
  const open = quests.filter(quest => status(quest, journey) === 'В процессе');
  const complete = quests.filter(quest => status(quest, journey) === 'Завершённые');
  return <main className="shell inner-page">
    <div className="section-banner"><div><p className="eyebrow"><Icon name="route" size={17} /> Твои прогулки</p><h1>Мои квесты</h1><p>Открытые маршруты и истории из пройденных квестов.</p></div><img src={art('nino')} alt="" /></div>
    {!profile ? <div className="paper empty"><p>Войди или открой демо, чтобы посмотреть свои маршруты.</p><Link className="button gold" to="/login">Войти</Link></div> : <>
      <h2 className="list-heading">Открытые квесты <span>{open.length}</span></h2>
      <div className="quest-list">{!open.length && <div className="paper empty"><p>Ты ещё не начал новый маршрут.</p><Link className="text-link" to="/quests">Выбрать квест</Link></div>}
        {open.map(quest => <button key={quest.id} className="paper history-row" onClick={() => start(quest)}><img src={art(quest.stops[0])} alt="" /><div><h3>{quest.title}</h3><Meter value={count(journey, quest.id)} max={quest.stops.length} /><p>{count(journey, quest.id)}/{quest.stops.length} точек</p></div><Icon name="chevron" /></button>)}
      </div>
      <h2 className="list-heading">Завершённые квесты <span>{complete.length}</span></h2>
      <div className="quest-list">{!complete.length && <p className="paper empty">Здесь появятся места и факты после завершения квеста.</p>}
        {complete.map(quest => <details className="paper history-detail" key={quest.id}><summary><img src={art(quest.stops[0])} alt="" /><span><strong>{quest.title}</strong><small>+{quest.stops.length * POINTS} очков</small></span><Icon name="chevron" /></summary>
          <div className="visited-list"><h3>Посещённые места</h3>{quest.stops.map((id, i) => <article key={id}><img src={art(id)} alt={places[id].title} /><div><h4>{i + 1}. <Link to={'/place/' + id}>{places[id].title}</Link></h4><p>{places[id].fact}</p></div></article>)}</div>
        </details>)}
      </div>
    </>}
  </main>;
}

function ProfilePage({ profile, journey, onLogout, guest }: { profile: Profile | null; journey: Journey; onLogout: () => void; guest?: () => void }) {
  if (!profile) return <main className="shell inner-page"><h1>Профиль</h1><div className="paper empty profile-guest">
    <img src={art('nino')} alt="НиНо" /><h2>Привет! Я НиНо</h2><p>{guest ? 'Войди, создай профиль или пройди квест в демо-режиме.' : 'Войди или создай профиль, чтобы сохранить свои открытия.'}</p><div><Link className="button gold" to="/register">Создать профиль</Link><Link className="button paper-button" to="/login">Войти</Link>{guest && <button className="button paper-button" onClick={guest}>Войти в демо</button>}</div>
  </div></main>;
  const score = totalScore(journey);
  const collected = quests.reduce((sum, quest) => sum + count(journey, quest.id), 0);
  const total = quests.reduce((sum, quest) => sum + quest.stops.length, 0);
  const completed = quests.filter(quest => count(journey, quest.id) === quest.stops.length).length;
  return <main className="shell inner-page">
    <h1>Профиль</h1>
    <div className="paper profile-card">
      <div className="profile-head"><span className="avatar"><Icon name="user" size={37} /></span><div><h2>{profile.name}</h2><p><Icon name="pin" size={17} /> {profile.city?.name ?? 'Демо-профиль'}</p><span className="pill"><Icon name="star" size={16} /> {score >= 60 ? 'Исследователь' : 'Новичок'}</span></div></div>
      <div className="stats">
        <div><Icon name="star" /><strong>{score}</strong><small>Очки</small></div>
        <div><Gem small /><strong>{collected}/{total}</strong><small>Кристаллы</small></div>
        <div><Icon name="route" /><strong>{completed}/{quests.length}</strong><small>Маршруты</small></div>
      </div>
      <div className="level-progress"><div><strong>{score >= 60 ? 'Уровень «Исследователь» открыт' : 'До уровня «Исследователь»'}</strong><span>{Math.min(score, 60)}/60</span></div><Meter value={Math.min(score, 60)} max={60} /></div>
      <div className="profile-actions"><Link className="button gold" to={continueTo(journey)}>{activeQuest(journey) ? 'Продолжить квест' : 'Выбрать квест'}</Link><button className="button paper-button" onClick={onLogout}>Выйти</button></div>
    </div>
    {journey.saved.length > 0 && <section className="saved"><h2>Избранное</h2><div className="place-grid">
      {placeOrder.filter(id => journey.saved.includes('place-' + id)).map(id => <PlaceTile key={id} id={id} />)}
      {events.filter(event => journey.saved.includes('event-' + event.id)).map(event => <PlaceTile key={event.id} id={event.place} title={event.title} sub={event.category} to={'/event/' + event.id} />)}
    </div></section>}
  </main>;
}

function Missing() { return <main className="shell inner-page"><h1>Страница не найдена</h1><Link className="button gold" to="/">На главную</Link></main>; }

function Credits() {
  const credits = [
    ['Кремль · Дмитриевская башня', 'Алексей Белобородов', 'Nizhny_Novgorod_Kremlin._Dmitrovskaya_Tower._07-2024.jpg', '4.0'],
    ['Чкаловская лестница', 'Skorp24', 'Chkalov_Stairs_From_Above_2018.jpg', '4.0'],
    ['Рождественская улица', 'Rukaba', 'Rozhdestvenskaya_Street_in_Nizhny_Novgorod.jpg', '4.0'],
    ['Стрелка и панорама главной', 'Алексей Трефилов', 'NN-12-2020_20.jpg', '4.0'],
    ['Собор Александра Невского', 'KKotyusova', 'Saint_Alexander_Nevsky_Cathedral_(N.Novgorod).jpg', '3.0'],
    ['Стадион', 'Дмитрий Сазанов', 'Nizhny_Novgorod_Stadium_2018-05-02_(1).jpg', '4.0'],
  ];
  return <main className="shell inner-page"><h1>Источники изображений</h1><div className="paper credits">
    <p>Фотографии кадрированы и уменьшены. Игровые версии дополнительно пикселизованы. Для каждой версии действует лицензия оригинала.</p>
    <ul>{credits.map(([title, author, file, version]) => <li key={file}><a href={'https://commons.wikimedia.org/wiki/File:' + encodeURIComponent(file)} target="_blank" rel="noreferrer">{title}</a> — {author} · <a href={`https://creativecommons.org/licenses/by-sa/${version}/`} target="_blank" rel="noreferrer">CC BY-SA {version}</a></li>)}</ul>
    <p>Маскот НиНо взят из приложенного макета. Картографическая основа — <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">© OpenStreetMap contributors</a>.</p>
    <p><a href="/art/map-source.txt" target="_blank" rel="noreferrer">Границы и источники подложки</a> · <a href="/art/map-geography.json" download>Отрезки маршрутов</a></p>
    <p><a href={osm(places.strelka.coordinates)} target="_blank" rel="noreferrer">Стрелка на карте</a></p>
  </div></main>;
}

function PlayRoute({ journey, update, server }: { journey: Journey; update: Update; server?: ServerSession }) {
  const { id } = useParams();
  const quest = quests.find(item => item.id === id);
  if (!quest) return <Missing />;
  if (status(quest, journey) === 'Закрытые' || !(quest.id in journey.routes)) return <Navigate to="/quests" replace />;
  const actions: QuestActions | undefined = server ? {
    collect: (index, position) => server.mutate(api => api.collect(quest.id, index, position)),
    react: (index, reaction) => server.mutate(api => api.react(quest.id, index, reaction)),
  } : undefined;
  return <Play key={quest.id} quest={quest} journey={journey} update={update} actions={actions} coordinates={server?.snapshot?.coordinates} />;
}

type GuidedApi = ReturnType<typeof guidedApi>;

interface ServerSession {
  profile: Profile | null;
  snapshot: GuidedSnapshot | null;
  commands: ConnectedAuth;
  logout: () => Promise<void>;
  mutate: (fn: (api: GuidedApi) => Promise<GuidedSnapshot>) => Promise<void>;
  busy: boolean;
  error: string;
  retry: () => void;
}

function QuestAccess({ allowed, children }: { allowed: boolean; children: ReactNode }) {
  const location = useLocation();
  if (allowed) return children;

  return <main className="shell inner-page">
    <section className="paper quest-access" aria-labelledby="quest-access-title">
      <span className="quest-access-icon"><Icon name="lock" size={28} /></span>
      <h1 id="quest-access-title">Квесты доступны после входа</h1>
      <p>Войди в аккаунт, чтобы начать маршрут и сохранить прогресс.</p>
      <Link className="button gold" to="/login" state={{ from: location }}>Перейти ко входу</Link>
    </section>
  </main>;
}

function SiteContent({ server }: { server?: ServerSession }) {
  const [local, setLocal] = useState(() => server ? null : currentProfile());
  const profile = server ? server.profile : local;
  const id = profile?.id;
  const [updated, setUpdated] = useState<{ id: string; value: Journey } | null>(null);
  const offlineId = server ? undefined : id;
  const persisted = useMemo(() => offlineId ? readJourney(offlineId) : anonymous, [offlineId]);
  const journey = server ? server.snapshot ?? anonymous : updated && updated.id === id ? updated.value : persisted;
  const [menu, setMenu] = useState(false);
  const [feedback, setFeedback] = useState('');
  const location = useLocation();
  const navigate = useNavigate();
  const canPlay = !server || Boolean(profile);
  const playing = canPlay && location.pathname.startsWith('/play/');
  const needsJourney = playing || ['/profile', '/quests', '/my-quests'].includes(location.pathname);
  const loadingJourney = Boolean(server && profile && !server.snapshot);

  useEffect(() => { setMenu(false); setFeedback(''); window.scrollTo(0, 0); }, [location.pathname]);

  function guest() {
    try { setLocal(enterGuest()); }
    catch { setFeedback('Разреши сохранять данные в браузере и попробуй снова.'); }
  }

  function update(fn: (state: Journey) => Journey) {
    const owner = profile ?? enterGuest();
    if (!profile) setLocal(owner);
    setUpdated({ id: owner.id, value: changeJourney(owner.id, fn) });
  }

  async function start(quest: Quest) {
    setFeedback('');
    try {
      if (server) {
        if (!profile) return;
        await server.mutate(api => api.start(quest.id));
      } else {
        update(state => {
          if (totalScore(state) < quest.required || count(state, quest.id) === quest.stops.length) return state;
          return { ...state, active: quest.id, routes: { ...state.routes, [quest.id]: state.routes[quest.id] ?? [] } };
        });
      }
      navigate('/play/' + quest.id);
    } catch (error) { setFeedback(error instanceof Error ? error.message : 'Не удалось начать квест.'); }
  }

  async function save(item: string, saved: boolean) {
    setFeedback('');
    try {
      if (server) {
        if (!profile) { navigate('/login', { state: { from: { pathname: location.pathname } } }); return; }
        await server.mutate(api => api.bookmark(item, saved));
      } else {
        update(state => ({ ...state, saved: saved ? [...new Set([...state.saved, item])] : state.saved.filter(key => key !== item) }));
      }
    } catch (error) { setFeedback(error instanceof Error ? error.message : 'Не удалось сохранить карточку.'); }
  }

  function signOut() {
    setMenu(false);
    if (server) void server.logout();
    else { logout(); setLocal(null); setUpdated(null); }
    navigate('/login');
  }

  const auth = (next?: Profile) => {
    if (next) setLocal(next);
    navigate(location.state?.from?.pathname ?? '/', { replace: true });
  };
  const wrap = (element: ReactNode) => profile ? <Navigate to={location.state?.from?.pathname ?? '/'} replace /> : element;

  return <>
    {!playing && <header className="site-header"><div className="shell header-inner"><Brand />
      <nav className="desktop-nav" aria-label="Разделы сайта"><NavItems connected={Boolean(server)} /></nav>
      <div className="header-actions">{!profile && <Link className="login-link" to="/login"><Icon name="user" size={18} /> Войти</Link>}<button className="icon-button menu-button" aria-label="Открыть меню" aria-expanded={menu} onClick={() => setMenu(true)}><Icon name="menu" size={23} /></button></div>
    </div></header>}
    {menu && <Modal title="Меню" className="full-menu" showClose={false} onClose={() => setMenu(false)}>
      <header className="site-header"><div className="shell header-inner">
        <Brand />
        <button type="button" className="icon-button menu-button" onClick={() => setMenu(false)} aria-label="Закрыть меню" autoFocus><Icon name="close" size={23} /></button>
      </div></header>
      <div className="shell menu-inner"><div className="menu-greeting"><img src={art('nino')} alt="" /><div><h2>Привет{profile ? ', ' + profile.name : ''}!</h2><p>Куда отправимся сегодня?</p></div></div>
      <nav onClick={() => setMenu(false)} aria-label="Основное меню"><NavItems connected={Boolean(server)} /></nav>
      {profile
        ? <button type="button" className="button paper-button menu-exit" onClick={signOut}>Выйти из аккаунта</button>
        : <Link className="button gold" onClick={() => setMenu(false)} to="/register">Создать профиль</Link>}
    </div></Modal>}
    {feedback && <p className="shell error" role="alert">{feedback}</p>}
    {loadingJourney && needsJourney ? <main className="shell inner-page">
      {server?.error ? <><p className="error" role="alert">{server.error}</p><button className="button paper-button" onClick={server.retry}>Повторить</button></> : <p role="status">Загружаем прогресс…</p>}
    </main> : <Routes>
      <Route index element={<Home journey={journey} />} />
      <Route path="home" element={<Navigate to="/" replace />} />
      <Route path="quests" element={<QuestAccess allowed={canPlay}><QuestList journey={journey} start={quest => void start(quest)} busy={Boolean(server?.busy)} /></QuestAccess>} />
      <Route path="my-quests" element={<QuestAccess allowed={canPlay}><MyQuests journey={journey} profile={profile} start={quest => void start(quest)} /></QuestAccess>} />
      <Route path="profile" element={<ProfilePage profile={profile} journey={journey} guest={server ? undefined : guest} onLogout={signOut} />} />
      <Route path="register" element={wrap(<AuthForm key="register" register onAuth={auth} connected={server?.commands} />)} />
      <Route path="login" element={wrap(<AuthForm key="login" register={false} onAuth={auth} connected={server?.commands} />)} />
      <Route path="play/:id" element={<QuestAccess allowed={canPlay}><PlayRoute key={id} journey={journey} update={update} server={server} /></QuestAccess>} />
      {server && <Route path="game/:checkpointId?" element={<QuestAccess allowed={canPlay}><Suspense fallback={<p className="shell">Загружаем карту…</p>}><ServerMapPage /></Suspense></QuestAccess>} />}
      <Route path="place/:id" element={<Detail journey={journey} save={(item, saved) => void save(item, saved)} busy={Boolean(server?.busy || loadingJourney)} isEvent={false} />} />
      <Route path="event/:id" element={<Detail journey={journey} save={(item, saved) => void save(item, saved)} busy={Boolean(server?.busy || loadingJourney)} isEvent />} />
      <Route path="credits" element={<Credits />} />
      <Route path="*" element={<Missing />} />
    </Routes>}
    {!playing && <footer className="site-footer shell"><Brand /><Link to="/credits">Источники изображений</Link></footer>}
  </>;
}

function ConnectedSite() {
  const { status, user, login, register, logout: endSession, authRequest } = useAuth();
  const commands = useMemo(() => ({ login, register }), [login, register]);
  const api = useMemo(() => guidedApi(authRequest), [authRequest]);
  const id = user?.id;
  const currentUser = useRef(id);
  currentUser.current = id;
  const [result, setResult] = useState<{ id: string; data: GuidedSnapshot } | null>(null);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);
  useEffect(() => {
    if (!id) return;
    const controller = new AbortController();
    setError('');
    void api.state(controller.signal).then(data => {
      if (!controller.signal.aborted) setResult({ id, data });
    }).catch(reason => {
      if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : 'Не удалось загрузить прогресс.');
    });
    return () => controller.abort();
  }, [id, api, revision]);

  async function mutate(fn: (api: GuidedApi) => Promise<GuidedSnapshot>) {
    if (!id || pending.current) throw new Error('Дождись окончания запроса.');
    pending.current = true;
    setBusy(true);
    try {
      const data = await fn(api);
      if (currentUser.current === id) setResult({ id, data });
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }

  if (status === 'loading') return <main className="shell inner-page"><p role="status">Проверяем вход…</p></main>;
  const profile = user ? { id: user.id, name: user.displayName, city: user.city } : null;
  return <SiteContent server={{
    profile, commands, logout: () => { setResult(null); setError(''); return endSession(); },
    snapshot: result && result.id === id ? result.data : null,
    mutate, busy, error, retry: () => setRevision(value => value + 1),
  }} />;
}

export function Site({ connected = false }: { connected?: boolean }) {
  return connected ? <BrowserRouter><ConnectedSite /></BrowserRouter> : <HashRouter><SiteContent /></HashRouter>;
}
