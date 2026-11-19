# GorkyCode2026 — API-контракт Backend ↔ Frontend (React)

**Версия:** 1.0.0 (MVP)  
**Статус:** РЕАЛИЗОВАНО В ПАТЧЕ AUTH MVP — требуется проверка сборки и интеграционное тестирование на машине разработчика.  
**Ответственные:** Backend (Spring Boot 3.5.6 / Java 17), Frontend (React + TypeScript).  
**Источник истины для схем запросов/ответов:** [`openapi.yaml`](./openapi.yaml).

> Эндпоинты авторизации и профиля входят в патч `GorkyCode2026_auth_docker_patch.zip`. До его применения в исходном backend реализован только `GET /api/v1/ping`.

## 1. Цель и границы MVP

Реализовать регистрацию по email/паролю, вход, обновление сессии, выход и получение своего профиля. React должен показывать страницы `/register`, `/login`, `/profile`, восстанавливать сессию после перезагрузки страницы и закрывать приватные маршруты для неавторизованных пользователей.

**Не входят в MVP:** подтверждение email, сброс пароля, изменение профиля, роли ADMIN, OAuth через Google/GitHub, двухфакторная авторизация, загрузка аватаров. Их добавляем отдельными версиями контракта.

## 2. Общие правила

| Параметр | Соглашение |
|---|---|
| Dev backend | `http://localhost:8080` |
| Dev frontend | `http://localhost:5173` (Vite) |
| Префикс REST API | `/api/v1` |
| Формат тела | `application/json; charset=utf-8` |
| Названия полей | `camelCase` |
| Даты | UTC ISO 8601, например `2026-11-19T09:00:00Z` |
| ID пользователя | UUID-строка |
| Авторизация приватных API | `Authorization: Bearer <accessToken>` |
| Access token | JWT, срок жизни **15 минут** (`expiresIn: 900` секунд) |
| Refresh token | Случайный непрозрачный токен, **7 дней**, только HttpOnly-cookie |
| Сохранение токена в React | Access token только **в памяти** приложения; refresh token не доступен JS |
| Ответы об ошибках | Единый JSON `error`, см. раздел 5 |

Перечисленные ниже endpoint-ы реализованы в патче; актуальность подтвердить smoke-тестами после установки.

## 3. Реестр API

| Метод | Endpoint | Назначение | Авторизация | Успех |
|---|---|---|---|---|
| `POST` | `/api/v1/auth/register` | Создать пользователя и начать сессию | Нет | `201` |
| `POST` | `/api/v1/auth/login` | Войти по email/паролю | Нет | `200` |
| `POST` | `/api/v1/auth/refresh` | Обновить access token и refresh-cookie | Refresh-cookie | `200` |
| `POST` | `/api/v1/auth/logout` | Завершить текущую сессию | Refresh-cookie (если есть) | `204` |
| `GET` | `/api/v1/users/me` | Получить свой профиль | Bearer JWT | `200` |
| `GET` | `/api/v1/ping` | Проверить API (уже существует) | Нет | `200` |

### 3.1. Регистрация — `POST /api/v1/auth/register`

**Request**:

```json
{
  "displayName": "Roman",
  "email": "roman@example.com",
  "password": "StrongPass123!"
}
```

**Правила валидации:** `displayName` — от 2 до 60 символов после trim; `email` — валидный адрес, не более 254 символов, trim + нормализация регистра для поиска и уникальности; `password` — от 8 до 128 символов (проверяется на сервере). Пароль не возвращается и не записывается в лог.

**Response `201 Created`**: JSON `AuthResponse` (ниже) и заголовок `Set-Cookie: refresh_token=...` с атрибутами безопасности. Возможные ошибки: `400 VALIDATION_ERROR`, `409 EMAIL_ALREADY_EXISTS`, `429 TOO_MANY_REQUESTS`.

### 3.2. Вход — `POST /api/v1/auth/login`

**Request**:

```json
{
  "email": "roman@example.com",
  "password": "StrongPass123!"
}
```

**Response `200 OK`**: тот же `AuthResponse` + новая refresh-cookie. Ошибки: `400 VALIDATION_ERROR`, `401 INVALID_CREDENTIALS`, `429 TOO_MANY_REQUESTS`. При неверном email и пароле сообщение одинаковое, без раскрытия существования аккаунта.

### 3.3. Общий ответ регистрации/входа/обновления — `AuthResponse`

```json
{
  "accessToken": "<JWT_ACCESS_TOKEN>",
  "tokenType": "Bearer",
  "expiresIn": 900,
  "user": {
    "id": "c71c6214-b925-4baf-8a7a-530b6fd23d45",
    "displayName": "Roman",
    "email": "roman@example.com",
    "createdAt": "2026-11-19T09:00:00Z"
  }
}
```

**Важно:** `refreshToken` **никогда не возвращается в JSON**. Он выдаётся и обновляется только через cookie, доступную браузеру, но не JavaScript.

### 3.4. Обновление сессии — `POST /api/v1/auth/refresh`

Без JSON-тела. Браузер отправляет cookie `refresh_token` автоматически при `credentials: 'include'`.

**Response `200 OK`**: новый `AuthResponse` и обновлённая refresh-cookie. Сервер ротирует refresh token и отзывает старый. Если cookie отсутствует, просрочена или отозвана: `401 INVALID_REFRESH_TOKEN` и очистка cookie. Не отправлять Bearer токен для этого запроса.

### 3.5. Выход — `POST /api/v1/auth/logout`

Без JSON-тела. Сервер отзывает текущий refresh token, если он есть, и удаляет cookie (`Max-Age=0`, те же `Path` и другие применимые атрибуты). **Всегда `204 No Content`**, даже если сессия уже завершена. React очищает access token и состояние пользователя.

### 3.6. Текущий пользователь — `GET /api/v1/users/me`

**Request header**: `Authorization: Bearer <accessToken>`.

**Response `200 OK`**:

```json
{
  "id": "c71c6214-b925-4baf-8a7a-530b6fd23d45",
  "displayName": "Roman",
  "email": "roman@example.com",
  "createdAt": "2026-11-19T09:00:00Z"
}
```

При отсутствующем, недействительном или просроченном access token — `401 UNAUTHORIZED`.

### 3.7. Ping — `GET /api/v1/ping`

**Response `200 OK`**:

```json
{"status":"ok"}
```

## 4. Cookie, CORS и безопасность

- Имя cookie: `refresh_token`; `HttpOnly`; `Path=/api/v1/auth`; `SameSite=Lax`; `Max-Age=604800` (7 суток).
- В production обязательно `Secure`, HTTPS и host-only cookie (без `Domain`); в локальной HTTP-разработке `Secure=false`.
- Разрешённый CORS origin для dev: **строго** `http://localhost:5173`, `Access-Control-Allow-Credentials: true`, разрешить `Content-Type`, `Authorization` и методы `GET`, `POST`, `OPTIONS`. Не использовать `*` вместе с credentials.
- Каждый `POST /api/v1/auth/*` **обязан** содержать `Origin` из `AUTH_ALLOWED_ORIGINS` (по умолчанию `http://localhost:5173,http://localhost:8080`); иначе `403 FORBIDDEN_ORIGIN`. Для curl/Postman укажи заголовок `Origin` вручную. `SameSite=Lax` — дополнительная защита. Для фронтенда на **другом сайте** (не просто другом порту) потребуется отдельное решение `SameSite=None; Secure` и CSRF-защита.
- Пароли хранить **только в виде адаптивного хеша** (например, Argon2id). Refresh-токены хранить в БД только в виде хеша, выполнять ротацию и отзыв при logout.
- JWT подписывать серверным секретом/ключом из окружения, не коммитить ключи. Проверять подпись, срок действия, issuer и audience.
- MVP rate limiting: до 20 запросов в минуту на IP + endpoint (in-memory, отдельно на каждом экземпляре; для production заменить на распределённый лимитер). Не логировать пароли, токены и содержимое `Cookie`/`Authorization`.
- Приватные API без Bearer возвращают `401`, а не HTML-страницу входа.

## 5. Формат ошибок (единый для всех API)

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Некорректные данные запроса",
    "details": [
      { "field": "email", "message": "Некорректный email" }
    ],
    "requestId": "8f50c891-890e-4f09-96b9-90149db8eb3b"
  }
}
```

`details` — необязательный массив (обычно для валидации); `requestId` — необязательный идентификатор запроса для диагностики.

| HTTP | `error.code` | Когда |
|---|---|---|
| `400` | `VALIDATION_ERROR` | Пустые/некорректные поля, неправильный JSON |
| `401` | `INVALID_CREDENTIALS` | Неверный email или пароль |
| `401` | `INVALID_REFRESH_TOKEN` | Нет действующей refresh-cookie |
| `401` | `UNAUTHORIZED` | Bearer отсутствует/просрочен/невалиден |
| `409` | `EMAIL_ALREADY_EXISTS` | Email уже зарегистрирован |
| `429` | `TOO_MANY_REQUESTS` | Слишком много попыток; заголовок `Retry-After` |
| `403` | `FORBIDDEN_ORIGIN` | Нет заголовка Origin либо он не в allowlist |
| `500` | `INTERNAL_ERROR` | Ошибка сервера без утечки технических деталей |

## 6. Сценарии React (обязательное поведение)

1. **Регистрация:** `/register` → проверка полей → `POST /auth/register` → сохранить `accessToken` в памяти → перейти на `/profile`.
2. **Вход:** `/login` → `POST /auth/login` → сохранить access token в памяти → перейти на `/profile`.
3. **Перезагрузка вкладки:** access token в памяти пропал → однократно вызвать `POST /auth/refresh` с cookie → восстановить пользователя и access token либо показать `/login`.
4. **Защищённый маршрут:** при открытии `/profile` проверять состояние авторизации; не показывать приватные данные до завершения проверки.
5. **Запросы к защищённым API:** передавать `Authorization: Bearer ...`. При `401` один раз выполнить `/auth/refresh`, затем повторить исходный запрос **только один раз**. При повторном `401` — выйти из сессии.
6. **Выход:** `POST /auth/logout` с cookie → очистить локальное состояние даже при сетевой ошибке → перенаправить на `/login`.
7. **Ошибки формы:** отображать `error.message`, а `details[].field` сопоставлять с полями формы. Не выводить технические стектрейсы.

### Пример запросов в React + TypeScript

Файл `.env.local` (для Vite):

```dotenv
VITE_API_BASE_URL=http://localhost:8080
```

```ts
const API = `${import.meta.env.VITE_API_BASE_URL}/api/v1`;

export async function login(email: string, password: string) {
  const response = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include', // отправка/получение HttpOnly refresh-cookie
    body: JSON.stringify({ email, password }),
  });
  if (!response.ok) throw await response.json();
  return response.json(); // AuthResponse; accessToken хранить в памяти
}

export async function refresh() {
  const response = await fetch(`${API}/auth/refresh`, {
    method: 'POST',
    credentials: 'include',
  });
  if (!response.ok) throw await response.json();
  return response.json(); // AuthResponse
}

export async function getMe(accessToken: string) {
  const response = await fetch(`${API}/users/me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) throw await response.json();
  return response.json(); // User
}
```

Это пример интеграции, **не готовый React-проект**. Для реального приложения обернуть вызовы в типизированный API-клиент и единый AuthContext/provider.

## 7. Что реализует Backend (входит в патч)

- Flyway-миграции: `users` (`id UUID`, `email` уникальный без учёта регистра, `display_name`, `password_hash`, `created_at`, `updated_at`) и `refresh_tokens` (`id`, `user_id`, `token_hash`, `expires_at`, `revoked_at`, `created_at`), индексы.
- DTO, валидация, контроллеры и сервисы для пяти новых API; JWT-подпись/проверка; хеширование паролей; ротация refresh-токенов.
- CORS, проверка Origin/CSRF, JSON-ответы 401/403, единый `@RestControllerAdvice` для ошибок.
- Интеграционные тесты: успешная регистрация/вход, дубликат email, неверный пароль, `GET /me` с/без JWT, refresh/rotation, logout/revoke, валидация.
- Подключить эти эндпоинты к Swagger/OpenAPI; изменить текущий `SecurityConfig`, который пока запрещает все новые маршруты.

## 8. Что реализует Frontend

- React + TypeScript, страницы `/register`, `/login`, `/profile` и компонент ProtectedRoute.
- API-клиент с `credentials: 'include'` для cookie-эндпоинтов; AuthContext; состояние `loading/authenticated/anonymous`.
- Формы и сообщения ошибок по единому контракту; logout; восстановление сессии после F5.
- Никакого хранения JWT или refresh-token в `localStorage`/`sessionStorage`.

## 9. Критерии приёмки (отметить после запуска)

- [ ] Новый пользователь регистрируется и сразу попадает в профиль.
- [ ] Повторная регистрация с тем же email возвращает `409 EMAIL_ALREADY_EXISTS`.
- [ ] Правильный пароль даёт вход, неправильный — `401 INVALID_CREDENTIALS`.
- [ ] После F5 пользователь остаётся авторизованным через refresh-cookie.
- [ ] Истёкший access token обновляется один раз без зацикливания запросов.
- [ ] После logout refresh-token больше не работает, приватные API дают `401`.
- [ ] Swagger соответствует `docs/openapi.yaml`; backend и React проходят интеграционный smoke-test.

## 10. Правило изменения контракта

Если меняются URL, поля, коды ошибок, cookie-политика или статус-коды — сначала обновить `docs/openapi.yaml` и этот файл, согласовать изменение в Pull Request с backend- и frontend-разработчиками, затем менять реализацию. Для несовместимых изменений использовать `/api/v2`.


## 11. Важные ограничения MVP

- `POST /auth/logout` отзывает refresh-токен; ранее выпущенный access JWT действует до истечения срока (максимум 15 минут). Для мгновенного отзыва потребовались бы stateful blocklist / introspection.
- Лимитер находится в памяти одного backend-контейнера, не синхронизируется между репликами и не учитывает пользователя за обратным прокси. Перед публичным запуском поставить rate limiting на gateway/Redis и настроить доверенные proxy IP.
- Хранение refresh-токенов предусматривает плановую очистку истёкших/отозванных записей (пока нет scheduler).
- HTTPS обязателен вне локальной разработки; переключить `AUTH_COOKIE_SECURE=true`, настроить CORS/Origin для реального домена и использовать отдельное защищённое хранилище секретов.
- Swagger `/v3/api-docs` генерируется по контроллерам; согласованный контракт в `docs/openapi.yaml` является основной спецификацией.
