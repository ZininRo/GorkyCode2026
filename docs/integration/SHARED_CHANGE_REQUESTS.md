# Интеграция MVP: зоны, пути и запросы на изменение общего кода

По DEVELOPMENT_RULES_FOR_GPT.md изменения в чужих и общих файлах нужно согласовать с владельцем. Поэтому каждая такая правка сделана **минимально и добавочно**, отмечена комментарием в коде, а полный список файлов по владельцам приведён в `CHANGES.md`. Ниже готовые сообщения для общего чата: их можно отправить без изменений.

## Фактические пути (раздел 2 правил)

- AI (Рома): `backend/src/main/java/com/gorkycode2026/backend/ai/`, `backend/src/main/resources/ai/`, `backend/src/test/java/com/gorkycode2026/backend/ai/`
- Game (Юля): `backend/src/main/java/com/gorkycode2026/backend/game/`, `backend/src/test/java/com/gorkycode2026/backend/game/`
- Events (Юля): `backend/src/main/java/com/gorkycode2026/backend/events/`
- Миграции (Юля): `backend/src/main/resources/db/migration/V4__game_and_events.sql`
- Frontend (Егор): `frontend/`
- Shared/config/auth: `backend/src/main/java/com/gorkycode2026/backend/config/`, `backend/src/main/java/com/gorkycode2026/backend/auth/`, `backend/src/main/resources/application.yml`, `backend/pom.xml`, `compose.yaml`, `.env.example`

## Как перенести изменения в feature-ветки

Проект в архиве содержит все изменения сразу. Каждый владелец переносит в свою ветку (`feature/game`, `feature/ai`, `feature/frontend`) только файлы своей зоны. Список файлов по владельцам приведён в `CHANGES.md`, разделы «Backend — Game и Events», «Backend — AI», «Frontend» и «Общие файлы». Общие файлы вносит Рома после подтверждения запросов ниже.

---

### Запрос 1: SecurityConfig (без него новые эндпоинты закрыты `denyAll`)

> **Нужно изменение общего/чужого кода**  
> Кто просит: Юля (game/events) и Рома (ai), подготовлено ассистентом  
> Владелец файла: Рома  
> Файл/эндпоинт: `backend/.../config/SecurityConfig.java`  
> Зачем: `anyRequest().denyAll()` закрывает `/events`, `/game`, `/checkpoints/*/collect`, `/progress`, `/ai/*`  
> Предлагаемое изменение (до → после): перед `.anyRequest().denyAll()` добавить:  
> `GET /api/v1/events, /api/v1/discovery → permitAll`;  
> `GET /api/v1/game, /checkpoints, /progress, /ai/hint, /ai/recommendations, /ai/status → authenticated`;  
> `POST /api/v1/checkpoints/*/collect → authenticated`  
> Совместимость со старым кодом: полная; правила auth, CORS, Origin-фильтра и rate-limit не меняются; остальное по-прежнему `denyAll`  
> Кто вносит правку и когда: Рома, перед первой интеграцией

### Запрос 2: compose.yaml и .env.example

> **Нужно изменение общего/чужого кода**  
> Кто просит: Юля (демо-режим), Рома (AI-ключ)  
> Владелец файла: Рома  
> Файл: `compose.yaml` (service backend → environment), `.env.example`  
> Зачем: передать в контейнер `GAME_DEMO_MODE`, `GAME_COLLECT_RADIUS_METERS`, `GAME_MAX_GPS_ACCURACY_METERS`, `AI_ENABLED`, `AI_BASE_URL`, `AI_API_KEY`, `AI_MODEL`, `AI_TIMEOUT_SECONDS`  
> Предлагаемое изменение: 8 строк env с безопасными значениями по умолчанию (демо выключено, AI выключен)  
> Совместимость: без `.env`-переменных поведение как раньше; `application.yml` и `pom.xml` **не менялись**  
> Кто вносит правку и когда: Рома

### Запрос 3: AuthContext (frontend, зона регистрации)

> **Нужно изменение общего/чужого кода**  
> Кто просит: Егор (экраны квеста), подготовлено ассистентом  
> Владелец файла: Егор, затрагивает модуль регистрации/сессии  
> Файл: `frontend/src/context/AuthContext.tsx`  
> Зачем: access-токен хранится только в `useRef` внутри провайдера; защищённым запросам квеста нужен тот же токен и тот же единственный refresh (иначе параллельные refresh отзывают cookie друг друга)  
> Предлагаемое изменение: **добавлен** метод `authRequest(path, options)` в контекст; логика существующих `login/register/logout/getMe/refresh` не изменена  
> Совместимость: полная, это только новое поле в значении контекста  
> Кто вносит правку и когда: Егор (или подтверждает текущую правку)

### Запрос 4: контракт API

> **Нужно изменение общего/чужого кода**  
> Кто просит: все трое  
> Владелец: общий контракт, редактор Рома  
> Файл: новый `docs/API_CONTRACT_MVP.md`  
> Зачем: зафиксировать фактические поля; отличия от примеров ТЗ перечислены в конце файла (вход через существующую регистрацию, `{ru,en}` в названиях, алиасы `/events` = `/discovery`)  
> Совместимость: существующий `docs/API_CONTRACT.md` (auth) не изменён  
> Кто вносит правку и когда: Рома утверждает в первый час интеграции

## Что сознательно НЕ трогалось

- Регистрация и вход (backend `auth/`, `city/`, миграции V1–V3, `LoginPage`, `RegisterPage`, `GuestRoute`, `ProtectedRoute`).
- `application.yml`, `backend/pom.xml`, корневой `pom.xml`, Dockerfile backend и frontend, `nginx.conf`, `package.json`, `package-lock.json`.
- Файл `.env` с реальными секретами.
- Git: ни одного commit/merge/push/rebase не выполнялось. Незакоммиченные изменения команды в рабочей копии (staged V3, правки frontend) сохранены как были.
