import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import type { Lang, LocalizedText } from '../types/game.types';

const ru = {
  appName: 'Открывай Нижний',
  tagline: 'Открой город по-новому',
  navHome: 'Главная',
  navQuest: 'Квест',
  navProfile: 'Профиль',
  you: 'Ты',
  points: 'очков',
  loginToPlay: 'Войдите, чтобы начать квест и копить очки',
  login: 'Войти',
  register: 'Регистрация',
  questBannerTitle: 'Исследуй город',
  questBannerText: 'Собирай кристаллы у достопримечательностей и открывай скрытые маршруты',
  startQuest: 'Начать квест',
  continueQuest: 'Продолжить квест',
  catAll: 'Все',
  catEXCURSIONS: 'Экскурсии',
  catEVENTS: 'Мероприятия',
  catFESTIVALS: 'Фестивали',
  catENTERTAINMENT: 'Развлечения',
  demoMaterial: 'Демонстрационный материал',
  more: 'Подробнее',
  close: 'Закрыть',
  loading: 'Загрузка…',
  emptyFeed: 'В этой категории пока нет карточек',
  retry: 'Повторить',
  questTitle: 'Квест',
  routes: 'Маршруты',
  routeLocked: 'Нужно {n} очков для доступа',
  routeOpen: 'Открыт',
  allPoints: 'Все точки',
  collected: 'Собран',
  available: 'Доступен',
  yellowCrystal: 'Малый жёлтый кристалл',
  greenCrystal: 'Большой зелёный кристалл',
  distance: 'До точки ≈ {n} м',
  distanceUnknown: 'Расстояние появится после проверки геопозиции',
  collect: 'Собрать',
  collectRadius: 'Для сбора подойдите к точке на {n} м или ближе.',
  collecting: 'Проверяем геопозицию…',
  demoCollect: 'Я на месте (демо)',
  demoModeNote: 'Демо-режим: сбор без поездки (только для тестового стенда)',
  selectPoint: 'Выберите кристалл на карте или в списке',
  mapUnavailable: 'Картографическая основа недоступна. Точки можно открыть из списка.',
  mapLabel: 'Карта городского квеста',
  mapLoading: 'Загрузка карты…',
  myLocation: 'Моё местоположение',
  locating: 'Определяем местоположение…',
  geoInsecure: 'Для геолокации откройте сайт по HTTPS или через localhost.',
  geoTimeout: 'GPS не ответил вовремя. Попробуйте ещё раз.',
  geoLowAccuracy: 'Точность GPS около {n} м. Для сбора нужно не более {max} м.',
  mapLocked: 'Заблокирован',
  nearbyPoints: 'Ближайшие доступные точки на карте',
  noMapPoints: 'В этой области нет квестовых точек. Передвиньте карту или выберите другой маршрут.',
  mapTruncated: 'Показана часть точек. Приблизьте карту, чтобы увидеть остальные.',
  pointDetails: 'Детали квеста',
  backToMap: 'Вернуться к карте',
  reward: 'Награда: +{n} очков',
  pointListLabel: 'Точки в области карты',
  pointDetailsError: 'Не удалось загрузить детали точки.',
  crystalFound: 'Кристалл найден!',
  alreadyCollected: 'Этот кристалл уже собран — очки не начисляются повторно',
  historicalHint: 'Историческая подсказка',
  aiHint: 'Подсказка ИИ',
  aiLoading: 'ИИ готовит подсказку…',
  aiSourceAi: 'сгенерировано ИИ по проверенным фактам',
  aiSourceFallback: 'проверенный факт (ИИ недоступен)',
  newRoute: 'Новый маршрут: {name}!',
  newLevel: 'Новый уровень: {name}',
  geoDenied: 'Разрешите геолокацию в браузере',
  geoUnavailable: 'Не удалось определить местоположение. Попробуйте ещё раз',
  geoUnsupported: 'Браузер не поддерживает геолокацию',
  errTooFar: 'Подойдите ближе к чекпоинту',
  errRouteLocked: 'Нужно 60 очков для доступа',
  errGpsInaccurate: 'Подождите более точного определения места',
  errBadRequest: 'Проверьте введённые данные',
  errGeneric: 'Не удалось выполнить запрос. Повторите',
  profileTitle: 'Профиль',
  nickname: 'Никнейм',
  country: 'Страна',
  city: 'Город',
  level: 'Уровень',
  score: 'Очки',
  nextLevel: 'до следующего уровня',
  maxLevel: 'Максимальный уровень MVP',
  collectedPoints: 'Собрано точек',
  openedRoutes: 'Открыто маршрутов',
  myCrystals: 'Мои кристаллы',
  noCrystals: 'Пока ни одного кристалла — отправляйтесь в квест!',
  recommendations: 'Куда сходить дальше',
  logout: 'Выйти',
  language: 'Язык',
} as const;

export type MessageKey = keyof typeof ru;

const en: Record<MessageKey, string> = {
  appName: 'Discover Nizhny',
  tagline: 'See the city in a new way',
  navHome: 'Home',
  navQuest: 'Quest',
  navProfile: 'Profile',
  you: 'You',
  points: 'points',
  loginToPlay: 'Sign in to start the quest and earn points',
  login: 'Sign in',
  register: 'Sign up',
  questBannerTitle: 'Explore the city',
  questBannerText: 'Collect crystals at landmarks and unlock hidden routes',
  startQuest: 'Start the quest',
  continueQuest: 'Continue the quest',
  catAll: 'All',
  catEXCURSIONS: 'Tours',
  catEVENTS: 'Events',
  catFESTIVALS: 'Festivals',
  catENTERTAINMENT: 'Entertainment',
  demoMaterial: 'Demo content',
  more: 'Learn more',
  close: 'Close',
  loading: 'Loading…',
  emptyFeed: 'No cards in this category yet',
  retry: 'Retry',
  questTitle: 'Quest',
  routes: 'Routes',
  routeLocked: '{n} points needed to unlock',
  routeOpen: 'Open',
  allPoints: 'All points',
  collected: 'Collected',
  available: 'Available',
  yellowCrystal: 'Small yellow crystal',
  greenCrystal: 'Large green crystal',
  distance: 'Distance ≈ {n} m',
  distanceUnknown: 'Distance appears after a location check',
  collect: 'Collect',
  collectRadius: 'Come within {n} m of the checkpoint to collect it.',
  collecting: 'Checking your location…',
  demoCollect: 'I am here (demo)',
  demoModeNote: 'Demo mode: collect without travelling (test stand only)',
  selectPoint: 'Pick a crystal on the map or in the list',
  mapUnavailable: 'The basemap is unavailable. Open points from the list.',
  mapLabel: 'City quest map',
  mapLoading: 'Loading the map…',
  myLocation: 'My location',
  locating: 'Finding your location…',
  geoInsecure: 'Open the site over HTTPS or on localhost to use geolocation.',
  geoTimeout: 'GPS timed out. Try again.',
  geoLowAccuracy: 'GPS accuracy is about {n} m. Collecting requires {max} m or better.',
  mapLocked: 'Locked',
  nearbyPoints: 'Nearest available points on the map',
  noMapPoints: 'There are no quest points here. Move the map or choose another route.',
  mapTruncated: 'Showing some of the points. Zoom in to see the rest.',
  pointDetails: 'Quest details',
  backToMap: 'Back to the map',
  reward: 'Reward: +{n} points',
  pointListLabel: 'Points in the map area',
  pointDetailsError: 'Could not load checkpoint details.',
  crystalFound: 'Crystal found!',
  alreadyCollected: 'Already collected — no points awarded twice',
  historicalHint: 'Historical hint',
  aiHint: 'AI hint',
  aiLoading: 'AI is preparing a hint…',
  aiSourceAi: 'generated by AI from verified facts',
  aiSourceFallback: 'verified fact (AI unavailable)',
  newRoute: 'New route: {name}!',
  newLevel: 'New level: {name}',
  geoDenied: 'Please allow location access in your browser',
  geoUnavailable: 'Could not get your location. Please try again',
  geoUnsupported: 'Your browser does not support geolocation',
  errTooFar: 'Get closer to the checkpoint',
  errRouteLocked: '60 points needed to unlock',
  errGpsInaccurate: 'Wait for a more accurate location fix',
  errBadRequest: 'Please check the data',
  errGeneric: 'Request failed. Please retry',
  profileTitle: 'Profile',
  nickname: 'Nickname',
  country: 'Country',
  city: 'City',
  level: 'Level',
  score: 'Score',
  nextLevel: 'to the next level',
  maxLevel: 'Top MVP level',
  collectedPoints: 'Points collected',
  openedRoutes: 'Routes unlocked',
  myCrystals: 'My crystals',
  noCrystals: 'No crystals yet — head to the quest!',
  recommendations: 'Where to go next',
  logout: 'Sign out',
  language: 'Language',
};

const dictionaries: Record<Lang, Record<MessageKey, string>> = { ru, en };
const STORAGE_KEY = 'gc.lang';

function initialLang(): Lang {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved === 'ru' || saved === 'en') return saved;
  } catch { /* localStorage может быть недоступен */ }
  return typeof navigator !== 'undefined' && navigator.language?.toLowerCase().startsWith('en') ? 'en' : 'ru';
}

interface I18nValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: MessageKey, params?: Record<string, string | number>) => string;
  pick: (text: LocalizedText | null | undefined) => string;
}

const I18nContext = createContext<I18nValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(initialLang);

  const setLang = useCallback((next: Lang) => {
    setLangState(next);
    try { window.localStorage.setItem(STORAGE_KEY, next); } catch { /* ignore */ }
    document.documentElement.lang = next;
  }, []);

  const value = useMemo<I18nValue>(() => ({
    lang,
    setLang,
    t: (key, params) => {
      let text = dictionaries[lang][key] ?? key;
      if (params) {
        for (const [name, val] of Object.entries(params)) text = text.replace(`{${name}}`, String(val));
      }
      return text;
    },
    pick: text => (text ? (text[lang] || text.ru || text.en || '') : ''),
  }), [lang, setLang]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const value = useContext(I18nContext);
  if (!value) throw new Error('useI18n должен вызываться внутри I18nProvider');
  return value;
}
