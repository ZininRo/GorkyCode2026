# GorkyCode2026

Maven reactor + Spring Boot **3.5.6**, Java **17**, PostgreSQL **17**, Docker Compose.

- `backend/` — Spring Boot API (регистрация, вход, JWT, refresh/logout, профиль).
- `docs/API_CONTRACT.md` + `docs/openapi.yaml` — согласованный контракт для React.
- `APPLY_PATCH.md` — инструкция по установке добавленных/изменённых файлов (если применён патч).

## Первый запуск (Windows x86-64 или macOS Apple Silicon ARM64)

1. Установить Docker Desktop, включить режим Linux containers (Windows).
2. Создать `.env` из `.env.example`, если его нет. Если `.env` уже существует — **добавить только новые переменные**, не перезаписывать существующие пароли.
3. Сгенерировать криптографически случайный Base64-секрет минимум из 32 байт:

   - Windows PowerShell 5.1+:

     ```powershell
     $bytes = New-Object byte[] 32
     $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
     $rng.GetBytes($bytes)
     [Convert]::ToBase64String($bytes)
     $rng.Dispose()
     ```

   - macOS: `openssl rand -base64 32`

4. В `.env` поставить `AUTH_JWT_SECRET=<выведенная Base64-строка>` и `AUTH_COOKIE_SECURE=false`. Не публиковать `.env` в Git.
5. В корне проекта выполнить:

   ```bash
   docker compose config
   docker compose up --build -d
   docker compose ps
   docker compose logs --tail=100 backend
   ```

6. Проверить:
   - `http://localhost:8080/api/v1/ping` → `{"status":"ok"}`
   - `http://localhost:8080/actuator/health` → `{"status":"UP"}`
   - `http://localhost:8080/swagger-ui/index.html` → Swagger UI

> Если порт 8080 изменён через `APP_PORT`, нужно также изменить `AUTH_ALLOWED_ORIGINS` в `.env`, добавив фактический backend origin. По умолчанию разрешены `http://localhost:5173` и `http://localhost:8080`.

## Auth API

| Метод | URL | Ответ |
|---|---|---|
| POST | `/api/v1/auth/register` | 201, AuthResponse + HttpOnly refresh-cookie |
| POST | `/api/v1/auth/login` | 200, AuthResponse + HttpOnly refresh-cookie |
| POST | `/api/v1/auth/refresh` | 200, AuthResponse + новая refresh-cookie |
| POST | `/api/v1/auth/logout` | 204, удаление refresh-cookie |
| GET | `/api/v1/users/me` | 200, профиль; нужен Bearer JWT |
| GET | `/api/v1/ping` | 200, `{"status":"ok"}` |

Любой `POST /api/v1/auth/*` требует `Origin` из `AUTH_ALLOWED_ORIGINS` (CSRF-защита для cookie-запросов). Браузер выставляет Origin автоматически, в терминале добавляй его вручную.

### Запрос регистрации (PowerShell)

```powershell
$body = @{displayName='Roman'; email='roman@example.com'; password='StrongPass123!'} | ConvertTo-Json
Invoke-RestMethod -Uri 'http://localhost:8080/api/v1/auth/register' -Method Post -ContentType 'application/json' -Headers @{ Origin = 'http://localhost:5173' } -Body $body -SessionVariable session
```

Для проверки refresh/logout проще использовать Postman или React с `credentials: 'include'`. JWT из `accessToken` передаётся в `Authorization: Bearer <token>` на `GET /api/v1/users/me`. Полные JSON-схемы в `docs/openapi.yaml`.

## Тестирование

```bash
# Unit-тесты, доступен Docker Compose service без локальных Java/Maven
 docker compose run --rm maven

# Полный интеграционный тест с Testcontainers (Docker должен быть доступен Maven на хосте)
 cd backend
 mvn -B -ntp verify -Pintegration-tests
```

В Dockerfile на стадии сборки `mvn clean package` запускает быстрые unit-тесты; `AuthApiIT` отдельно запускается через профиль `integration-tests` (не требует настоящей production-БД, создаёт временный контейнер PostgreSQL). Для этих тестов необходимы JDK 17, Maven и доступный Docker Engine на машине, откуда запускается Maven.

## Docker

- `backend/Dockerfile`: multi-stage Maven Java 17 + `eclipse-temurin:17-jre`; без привязки к `linux/amd64`.
- База `postgres:17-alpine`, имя контейнерного хоста `db`, порт `5432`.
- Healthcheck приложения: `curl`, установленный в runtime-образе.
- Volume `postgres_data` хранит БД между перезапусками.
- `docker compose down` **сохраняет** данные, а `docker compose down -v` **удаляет их безвозвратно**.

## Безопасность MVP и границы

- Секрет подписания JWT обязательно задать в `.env`; без него backend не запускается.
- Access JWT 15 минут (только в памяти React), refresh-cookie HttpOnly, SameSite=Lax, Path `/api/v1/auth`, 7 дней.
- Refresh-токены хранятся только как SHA-256 в БД и ротируются после каждого refresh.
- Пароли хешируются с Argon2id.
- Лимит 20 POST/мин на IP и маршрут для register/login/refresh — **локальный in-memory**; для нескольких реплик и production нужен gateway/Redis.
- Logout отзывает refresh-токен, но **не** ранее выданный JWT до окончания его 15 минут.
- Для production: HTTPS, `AUTH_COOKIE_SECURE=true`, реальные CORS origins, секреты в secret manager, централизованный лимитер, чистка таблицы refresh_tokens, наблюдаемость и CI/CD.

## IntelliJ IDEA

Открыть корень `GorkyCode2026` по `pom.xml`, использовать JDK 17 для запуска из IDE. В IDEA задать env-переменные `AUTH_JWT_SECRET`, `DB_URL`, `DB_USERNAME`, `DB_PASSWORD` при прямом запуске `BackendApplication`, а для контейнерного запуска достаточно заполненного `.env`.
