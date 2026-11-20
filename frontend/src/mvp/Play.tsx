import { useState } from 'react';
import { Link } from 'react-router-dom';
import { distanceMeters, GeoError, getCurrentPosition, type Position } from '../lib/geo';
import { art, places, POINTS, walk, type Coordinates, type PlaceId, type Quest } from './content';
import { count, type Journey, type Reaction } from './demo';
import { Gem, Icon } from './icons';
import { PixelMap } from './Map';
import { Modal } from './Modal';
import type { QuestActions } from './guidedApi';

const geoMessages: Record<GeoError['kind'], string> = {
  denied: 'Разреши доступ к геопозиции в браузере.',
  insecure: 'Для сбора по GPS открой сайт по HTTPS или на localhost.',
  unsupported: 'Этот браузер не предоставляет геопозицию.',
  timeout: 'Не удалось дождаться геопозиции. Попробуй ещё раз.',
  unavailable: 'Геопозиция недоступна. Попробуй ещё раз.',
};

const reactions: { id: Reaction; emoji: string; label: string }[] = [
  { id: 'love', emoji: '😍', label: 'Очень понравилось' },
  { id: 'interesting', emoji: '🙂', label: 'Интересно' },
  { id: 'okay', emoji: '😐', label: 'Нормально' },
  { id: 'more', emoji: '🤩', label: 'Хочу ещё' },
];

export function Meter({ value, max }: { value: number; max: number }) {
  return <progress className="meter" value={value} max={max} aria-label="Прогресс" />;
}

export function Play({ quest, journey, update, actions, coordinates }: {
  quest: Quest;
  journey: Journey;
  update: (fn: (state: Journey) => Journey) => void;
  actions?: QuestActions;
  coordinates?: Partial<Record<PlaceId, Coordinates>>;
}) {
  const [picked, setPicked] = useState<number | null>(null);
  const [real, setReal] = useState(false);
  const [stage, setStage] = useState<'fact' | 'reaction' | null>(null);
  const [reaction, setReaction] = useState<Reaction | null>(null);
  const [position, setPosition] = useState<Position | null>(null);
  const [checking, setChecking] = useState(false);
  const [methodError, setMethodError] = useState('');
  const [localSimulation, setLocalSimulation] = useState(false);
  const allowDemo = !actions || (journey.demo && ['localhost', '127.0.0.1', '[::1]'].includes(window.location.hostname));
  const simulate = allowDemo && (actions ? localSimulation : journey.demo);
  const visits = journey.routes[quest.id] ?? [];
  const completed = count(journey, quest.id);
  const finished = completed >= quest.stops.length;
  const selected = picked ?? Math.min(completed, quest.stops.length - 1);
  const current = selected === completed;
  const stop = places[quest.stops[selected]];
  const visible = quest.stops.slice(0, completed + 1);
  const currentCoordinates = coordinates?.[quest.stops[selected]] ?? stop.coordinates;

  function choose(index: number) {
    if (checking) return;
    setPicked(index);
    setMethodError('');
    if (index < completed || visits[index]) setStage('fact');
    else void collect(index);
  }

  async function collect(index: number) {
    if (checking || index !== completed) return;
    const id = quest.stops[index];
    const target = coordinates?.[id] ?? places[id].coordinates;
    setChecking(true);
    setMethodError('');
    try {
      const point = simulate ? { lat: target[0], lng: target[1], accuracy: 5 } : await getCurrentPosition();
      if (!simulate) setPosition(point);
      if (actions) {
        await actions.collect(index, { lat: point.lat, lng: point.lng, accuracyMeters: point.accuracy });
      } else {
        const distance = Math.round(distanceMeters(point.lat, point.lng, ...target));
        if (point.accuracy > 75) throw new Error('Сигнал GPS слишком неточный. Выйди на открытое место и попробуй снова.');
        if (distance > 70) throw new Error(`До точки примерно ${distance} м. Подойди ближе, чтобы собрать кристалл.`);
        update(state => {
          const latest = state.routes[quest.id] ?? [];
          if (latest.length > index || count(state, quest.id) !== index) return state;
          return { ...state, routes: { ...state.routes, [quest.id]: [...latest, { at: new Date().toISOString(), reaction: null }] } };
        });
      }
      setStage('fact');
    } catch (error) {
      setMethodError(error instanceof GeoError
        ? geoMessages[error.kind]
        : error instanceof Error ? error.message : 'Не удалось сохранить точку.');
    } finally { setChecking(false); }
  }

  async function submitReaction() {
    if (!reaction || checking) return;
    setChecking(true);
    setMethodError('');
    try {
      if (actions) await actions.react(selected, reaction);
      else {
        update(state => {
          const latest = state.routes[quest.id];
          if (!latest?.[selected] || latest[selected].reaction !== null) return state;
          const routes = { ...state.routes, [quest.id]: latest.map((visit, index) => index === selected ? { ...visit, reaction } : visit) };
          return { ...state, routes, active: state.active === quest.id && selected === quest.stops.length - 1 ? null : state.active };
        });
      }
      setStage(null);
      setReaction(null);
      setPicked(null);
    } catch (error) {
      setMethodError(error instanceof Error ? error.message : 'Не удалось сохранить реакцию. Попробуй ещё раз.');
    } finally { setChecking(false); }
  }

  const openFact = () => { setMethodError(''); setStage('fact'); };

  return <main className="shell play-page">
    <Link className="back-link" to="/quests"><Icon name="back" /> К квестам</Link>
    <div className="title-row"><div><p className="eyebrow"><Icon name="compass" size={17} /> Пешеходный квест</p><h1>{quest.title}</h1></div><span className="pill gem-pill"><Gem small /> {completed}/{quest.stops.length}</span></div>
    <Meter value={completed} max={quest.stops.length} />
    <div className="play-layout">
      <div className="map-area">
        <div className="map-toolbar"><strong>Карта маршрута</strong><div className="map-toggle" aria-label="Вид карты">
          <button aria-pressed={!real} onClick={() => setReal(false)}>Пиксельная</button><button aria-pressed={real} onClick={() => setReal(true)}>Улицы</button>
        </div></div>
        <PixelMap stops={visible} selected={selected} done={completed} onSelect={choose} real={real} position={position} coordinates={coordinates} />
      </div>
      <section className="play-side">
        {finished ? <div className="paper completion">
          <img src={art('nino')} alt="НиНо" /><h2>Квест завершён!</h2>
          <p>{quest.stops.length} точки пройдены · +{quest.stops.length * POINTS} очков</p>
          <Link className="button gold" to="/my-quests">Посмотреть историю</Link>
          <Link className="button paper-button" to="/quests">Выбрать другой квест</Link>
        </div> : <>
          <div className="nino-note"><img src={art('nino')} alt="" /><div><strong>НиНо подсказывает</strong><p>{selected === 0 ? quest.intro : stop.hint}</p></div></div>
          <div className="paper play-card">
            <span className="pill">{current ? 'Текущая точка' : 'Посещённая точка'}</span>
            <h2>{stop.title}</h2><p className="muted"><Icon name="pin" size={17} /> {stop.district}</p>
            <img className="preview-photo" src={art(quest.stops[selected])} alt={stop.title} />
            <a className="text-link" href={walk(currentCoordinates)} target="_blank" rel="noreferrer"><Icon name="map" size={18} /> Пеший маршрут в Яндекс Картах</a>
            {methodError && !stage && <p role="alert" className="error">{methodError}</p>}
            {current && !visits[selected] ? <button className="button gold" disabled={checking} onClick={() => void collect(selected)}><Gem small /> {checking ? 'Проверяем точку…' : 'Собрать кристалл'}</button>
              : <button className="button gold" onClick={openFact}><Icon name="spark" /> {current ? 'Открыть факт' : 'Перечитать факт'}</button>}
            {allowDemo && <label className="switch-row"><span><strong>Демо-режим</strong><small>Сбор точек без GPS</small></span><input type="checkbox" role="switch" checked={simulate} disabled={checking} onChange={event => {
              setMethodError('');
              const demo = event.target.checked;
              if (actions) setLocalSimulation(demo);
              else update(state => ({ ...state, demo }));
            }} /></label>}
          </div>
        </>}
      </section>
    </div>
    {stage && <Modal title={stage === 'fact' ? stop.title : 'Как вам это место?'} onClose={() => { if (!checking) { setStage(null); setMethodError(''); } }} className="stop-dialog">
      {stage === 'fact' ? <>
        <img className="modal-photo" src={art(quest.stops[selected])} alt={stop.title} />
        <div className="modal-content"><span className="pill"><Gem small done /> Кристалл собран</span><h2>{stop.title}</h2>
          <p>{stop.fact}</p>
          {current ? <button className="button gold" onClick={() => { setReaction(null); setStage('reaction'); }}>Продолжить <Icon name="arrow" /></button>
            : <button className="button gold" onClick={() => setStage(null)}>К карте</button>}
        </div>
      </> : <div className="reaction-content">
        <img src={art('nino')} alt="" /><h2>Как вам это место?</h2>
        <p>Выбери реакцию, чтобы продолжить квест.</p>
        <div className="reactions" role="group" aria-label="Реакция">
          {reactions.map(choice => <button key={choice.id} aria-pressed={choice.id === reaction} onClick={() => setReaction(choice.id)}><span aria-hidden="true">{choice.emoji}</span>{choice.label}</button>)}
        </div>
        {methodError && <p role="alert" className="error">{methodError}</p>}
        <button className="button gold" onClick={() => void submitReaction()} disabled={!reaction || checking}>{selected === quest.stops.length - 1 ? 'Завершить квест' : 'Следующая точка'} <Icon name="arrow" /></button>
      </div>}
    </Modal>}
  </main>;
}
