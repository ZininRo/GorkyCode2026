import type { City } from '../types/auth.types';
import { POINTS, quests } from './content';

const prefix = 'otkryvay.v1.';
const session = prefix + 'session';

export interface Profile {
  id: string;
  name: string;
  city: City | null;
}

interface Account extends Profile { salt: string; proof: string }
export type Reaction = 'love' | 'interesting' | 'okay' | 'more';
interface Visit { at: string; reaction: Reaction | null }
export interface Journey {
  active: string | null;
  routes: Record<string, Visit[]>;
  saved: string[];
  demo: boolean;
}

function read<T>(key: string, fallback: T): T {
  try { return JSON.parse(localStorage.getItem(key) ?? 'null') as T ?? fallback; }
  catch { return fallback; }
}
function write<T>(key: string, value: T) {
  localStorage.setItem(key, JSON.stringify(value));
}

const guestProfile: Profile = { id: 'demo-guest', name: 'Путешественник', city: null };
export function currentProfile(): Profile | null {
  const id = read<string | null>(session, null);
  if (id === guestProfile.id) return guestProfile;
  return read<Account[]>(prefix + 'accounts', []).find(account => account.id === id) ?? null;
}

const cityNames = ['Нижний Новгород', 'Москва', 'Санкт-Петербург', 'Казань', 'Дзержинск', 'Бор', 'Арзамас', 'Владимир', 'Ярославль', 'Киров', 'Самара', 'Чебоксары', 'Екатеринбург', 'Пермь', 'Саров', 'Выборг', 'Новосибирск', 'Уфа', 'Краснодар', 'Сочи'];
const cityFixture: City[] = cityNames.map((name, index) => ({ id: index + 1, name, region: null, countryCode: 'RU' }));
export async function searchCities(query: string, signal: AbortSignal): Promise<City[]> {
  signal.throwIfAborted();
  const normalized = query.trim().toLocaleLowerCase('ru');
  return cityFixture.filter(city => city.name.toLocaleLowerCase('ru').includes(normalized)).slice(0, normalized ? 20 : 7);
}

async function proof(password: string, salt: string) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits']);
  const hash = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: encoder.encode(salt), iterations: 120_000 }, key, 256);
  return Array.from(new Uint8Array(hash), byte => byte.toString(16).padStart(2, '0')).join('');
}

const normalize = (name: string) => name.trim().replace(/\s+/g, ' ').toLocaleLowerCase('ru');
export async function signIn(name: string, password: string, cityId?: number) {
  let accounts = read<Account[]>(prefix + 'accounts', []);
  const existing = accounts.find(account => normalize(account.name) === normalize(name));
  if (cityId === undefined) {
    if (!existing || await proof(password, existing.salt) !== existing.proof) throw new Error('Проверьте имя и пароль.');
    write(session, existing.id);
    return existing as Profile;
  }
  const city = cityFixture.find(option => option.id === cityId);
  if (!city) throw new Error('Выберите город из списка.');
  if (existing) throw new Error('Такое имя уже есть в этом браузере. Войдите или выберите другое имя.');
  const salt = crypto.randomUUID();
  const account: Account = { id: crypto.randomUUID(), name: name.trim(), city, salt, proof: await proof(password, salt) };
  accounts = read<Account[]>(prefix + 'accounts', []);
  if (accounts.some(other => normalize(other.name) === normalize(name))) throw new Error('Такое имя уже есть в этом браузере.');
  write(prefix + 'accounts', [...accounts, account]);
  write(session, account.id);
  return account as Profile;
}
export function enterGuest() { write(session, guestProfile.id); return guestProfile; }
export function logout() { localStorage.removeItem(session); }

export function readJourney(id: string): Journey {
  return read(prefix + 'journey.' + id, { active: null, routes: {}, saved: [], demo: true });
}
export function changeJourney(id: string, update: (journey: Journey) => Journey): Journey {
  const result = update(readJourney(id));
  write(prefix + 'journey.' + id, result);
  return result;
}
export function count(journey: Journey, questId: string) {
  return journey.routes[questId]?.filter(visit => visit.reaction !== null).length ?? 0;
}
export function totalScore(journey: Journey) {
  return quests.reduce((total, quest) => total + count(journey, quest.id) * POINTS, 0);
}
