# SETUP_GUIDE: запуск на macOS (Apple Silicon и Intel)

Есть два пути. **A. Всё в Docker**: проще всего, нужен только Docker Desktop. **B. Dev-режим**: БД в Docker, backend из IntelliJ/Maven, frontend через Vite с hot reload.

## 0. Что установить

| Инструмент | Для чего | Установка |
|---|---|---|
| Docker Desktop 4.x | БД, backend и frontend в контейнерах | https://www.docker.com/products/docker-desktop/ → запустить и дождаться «Engine running» |
| Homebrew | установка утилит | https://brew.sh |
| jq | smoke-тест API | `brew install jq` |
| (путь B) JDK 17 | backend локально | `brew install --cask temurin@17` |
| (путь B) Maven 3.9 | сборка backend | `brew install maven` |
| (путь B) Node.js 22+ | frontend dev-сервер | `brew install node` |

Проверка: `docker --version && docker compose version`.

## 1. Переменные окружения

```bash
cd GorkyCode2026
cp -n .env.example .env        # -n: НЕ перезаписывать существующий .env
openssl rand -base64 32        # скопировать вывод
```

Откройте `.env` и проверьте:

| Переменная | Значение для демо | Комментарий |
|---|---|---|
| `AUTH_JWT_SECRET` | вывод `openssl rand -base64 32` | обязательна, иначе backend не стартует |
| `POSTGRES_*` | как в примере | локальная БД |
| `GAME_DEMO_MODE` | `true` на ноутбуке для показа жюри, `false` на публичном сервере | показывает кнопку «Я на месте (демо)» |
| `AI_ENABLED` | `true`, если есть ключ | без ключа ИИ отвечает проверенными fallback-текстами |
| `AI_API_KEY` | ваш ключ | никогда не коммитить |
| `AI_BASE_URL` | `https://api.openai.com/v1` или другой OpenAI-совместимый endpoint | для YandexGPT: `https://llm.api.cloud.yandex.net/v1`, подробно в `YANDEX_SETUP_GUIDE.md`; также OpenRouter, локальный Ollama `http://host.docker.internal:11434/v1` |
| `AI_MODEL` | `gpt-4o-mini` или модель вашего провайдера | |

Если `.env` уже был, **добавьте только новые строки** из `.env.example` (блоки GAME_* и AI_*), не трогая существующие пароли.

## 2. Путь A: всё в Docker

```bash
docker compose config > /dev/null && echo "compose OK"
docker compose up --build -d
docker compose ps                 # db, backend, frontend → healthy (первый build backend ~3–6 мин)
docker compose logs --tail=100 backend
```

Откройте:
- приложение: http://localhost:5173 (nginx проксирует `/api` на backend);
- API: http://localhost:8080/api/v1/ping → `{"status":"ok"}`;
- Swagger: http://localhost:8080/swagger-ui/index.html.

Flyway при старте применит `V4__game_and_events.sql`: маршруты, 6 чекпоинтов, 8 карточек афиши.

Smoke-тест API (создаёт нового тестового пользователя):

```bash
./scripts/smoke-test.sh http://localhost:8080
```

Остановка: `docker compose down` (данные сохраняются). `docker compose down -v` **удаляет БД безвозвратно**: использовать только осознанно.

## 3. Путь B: dev-режим

```bash
# БД
docker compose up -d db

# Backend (вариант 1: терминал)
cd backend
export $(grep -v '^#' ../.env | xargs)      # переменные из .env
export DB_URL=jdbc:postgresql://localhost:${POSTGRES_PORT:-5432}/$POSTGRES_DB DB_USERNAME=$POSTGRES_USER DB_PASSWORD=$POSTGRES_PASSWORD
mvn -B spring-boot:run
# вариант 2: IntelliJ → BackendApplication → Environment variables: AUTH_JWT_SECRET, DB_URL, DB_USERNAME, DB_PASSWORD, GAME_DEMO_MODE, AI_*

# Frontend (новый терминал)
cd frontend
npm ci
npm run dev        # http://localhost:5173; API по умолчанию http://localhost:8080
```

Unit-тесты backend: `cd backend && mvn -B test` (или `docker compose run --rm maven` без локальной Java).

## 4. Демонстрация с телефона

- Браузер разрешает геолокацию только на **HTTPS** или `localhost`. По `http://192.168.x.x` телефон GPS не отдаст.
- `compose.yaml` публикует порты только на `127.0.0.1`. Для телефона используйте HTTPS-туннель, например `cloudflared tunnel --url http://localhost:5173` или `ngrok http 5173`, и добавьте выданный origin в `AUTH_ALLOWED_ORIGINS`.
- В помещении: либо `GAME_DEMO_MODE=true` (кнопка «Я на месте (демо)»), либо Chrome DevTools → More tools → **Sensors** → Location → задать координаты точки (координаты есть в `docs/API_CONTRACT_MVP.md` и в V4-миграции).

## 5. Частые проблемы

| Симптом | Причина / решение |
|---|---|
| backend падает: `AUTH_JWT_SECRET must ...` | не задан или короткий секрет в `.env` |
| `403 FORBIDDEN` на `/api/v1/game` | не внесена правка SecurityConfig (запрос 1 в `docs/integration/SHARED_CHANGE_REQUESTS.md`) |
| Карта не отображается, виден список точек | нет доступа к `unpkg.com` или к тайлам OpenStreetMap; сбор работает и без карты |
| «Разрешите геолокацию в браузере» | разрешение отклонено или страница открыта по HTTP не с localhost |
| «Подойдите ближе к чекпоинту» | реальная дистанция > 100 м; для теста включите демо-режим |
| ИИ всегда «проверенный факт» | `AI_ENABLED=false`, пустой ключ или провайдер недоступен; это штатный fallback |
| Flyway: `checksum mismatch` | кто-то изменил уже применённую миграцию; новые изменения — только новыми файлами `V5__...` |
