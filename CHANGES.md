# CHANGES: MVP «Открывай Нижний» (20.11.2026)

Удалённых файлов нет. Git-операций (commit, merge, push, rebase, reset) не выполнялось. Незакоммиченные изменения команды, которые уже были в рабочей копии (staged `V3__normalize_city_country_code.sql`, правки frontend регистрации), сохранены без изменений.

Обозначения: **Н** — новый файл, **И** — изменён. Владелец — по DEVELOPMENT_RULES_FOR_GPT.md.

## Backend — Game и Events (владелец: Юля)

| | Файл (`backend/src/...`) | Что сделано |
|---|---|---|
| Н | `main/resources/db/migration/V4__game_and_events.sql` | Таблицы `game_routes`, `game_checkpoints`, `game_collections` (UNIQUE user+checkpoint, ON DELETE CASCADE от users), `discovery_items`; seed: 2 маршрута, 6 чекпоинтов (cp_y01–cp_y04, cp_g01–cp_g02) с подсказками RU/EN, 8 карточек афиши. Хранится только факт и время сбора, без GPS-трека |
| Н | `main/java/.../game/domain/GeoDistance.java` | Расстояние по формуле Haversine |
| Н | `main/java/.../game/domain/TouristLevel.java` | Уровни NOVICE (0) / EXPLORER (60), следующий порог |
| Н | `main/java/.../game/dto/GameDtos.java` | DTO: Progress, Route, Checkpoint, PlaceCard, GameState, CollectRequest (валидация), CollectResponse |
| Н | `main/java/.../game/repository/GameRepository.java` | JDBC-доступ (JdbcTemplate), `INSERT … ON CONFLICT DO NOTHING`, `pg_advisory_xact_lock` на пользователя. JDBC выбран, чтобы общий `ddl-auto: validate` не мог сломать старт приложения |
| Н | `main/java/.../game/service/GameService.java` | Состояние игры, прогресс, сбор: маршрут → повтор → точность GPS → дистанция → атомарная запись; вычисление `newlyUnlockedRoutes`; скрытие точек закрытых маршрутов; подсказка и карточка только после сбора; реализует `GameReadApi` |
| Н | `main/java/.../game/readapi/GameReadApi.java` | Read-only интерфейс для AI (направление зависимости ai → game, без циклов) |
| Н | `main/java/.../game/api/GameController.java` | `GET /game`, `GET /checkpoints`, `GET /progress`, `POST /checkpoints/{id}/collect` |
| Н | `main/java/.../events/repository/DiscoveryRepository.java` | JDBC-доступ к афише |
| Н | `main/java/.../events/service/DiscoveryService.java` | Фильтр категорий, 400 на неизвестную категорию |
| Н | `main/java/.../events/dto/DiscoveryDtos.java` | DTO афиши (`isDemo`, `externalUrl`) |
| Н | `main/java/.../events/api/DiscoveryController.java` | `GET /events` и алиас `GET /discovery` |
| Н | `test/java/.../game/GameServiceTest.java` | 8 тестов по разделу 11 ТЗ: старт, TOO_FAR, GPS_INACCURATE, повтор +0, ROUTE_LOCKED, 60 → EXPLORER + hidden, 404/401, гео/уровни |
| Н | `test/java/.../game/InMemoryGameRepository.java` | In-memory репозиторий с тем же seed для тестов |

## Backend — AI (владелец: Рома)

| | Файл (`backend/src/...`) | Что сделано |
|---|---|---|
| Н | `main/java/.../ai/client/LlmClient.java` | Интерфейс LLM; никогда не бросает исключения |
| Н | `main/java/.../ai/client/OpenAiCompatibleLlmClient.java` | Клиент OpenAI-совместимого `/chat/completions` на `java.net.http` + Jackson tree (без новых зависимостей), env `AI_*`, таймаут, ключ не логируется |
| Н | `main/java/.../ai/service/AiTextGuard.java` | Проверка ответа модели: длина, ссылки, числа/даты, которых нет в проверенных фактах |
| Н | `main/java/.../ai/service/HintService.java` | Подсказка только по собранной точке, на основе фактов из `GameReadApi`; кэш; fallback на проверенную подсказку |
| Н | `main/java/.../ai/service/RecommendationService.java` | NOVICE → популярные, EXPLORER → менее известные места из `places.json`; модель пишет только вступление |
| Н | `main/java/.../ai/service/Language.java` | Нормализация `ru/en` |
| Н | `main/java/.../ai/dto/AiDtos.java` | DTO ответов (`source: AI | FALLBACK`) |
| Н | `main/java/.../ai/api/AiController.java` | `GET /ai/hint`, `GET /ai/recommendations`, `GET /ai/status` |
| Н | `main/resources/ai/places.json` | Заранее заданный список из 10 мест (5 POPULAR, 5 HIDDEN) |
| Н | `test/java/.../ai/AiTextGuardTest.java` | 2 теста фильтра ответов модели |

## Общие файлы (требуют подтверждения владельца, см. `docs/integration/SHARED_CHANGE_REQUESTS.md`)

| | Файл | Владелец | Что сделано |
|---|---|---|---|
| И | `backend/.../config/SecurityConfig.java` | Рома | Один блок `requestMatchers` перед `denyAll`: публичная афиша, остальное `authenticated`. Остальные правила не тронуты |
| И | `compose.yaml` | Рома | В `backend.environment` добавлены `GAME_*` и `AI_*` с безопасными значениями по умолчанию |
| И | `.env.example` | Рома | Добавлены блоки GAME_* и AI_* (без реальных ключей). Реальный `.env` не изменялся |
| И | `README.md` | общий | Добавлен раздел MVP сверху; исходный текст сохранён ниже без изменений |

## Frontend (владелец: Егор)

| | Файл (`frontend/...`) | Что сделано |
|---|---|---|
| И | `src/context/AuthContext.tsx` | **Добавлен** метод `authRequest` (Bearer + единственный refresh + один повтор). Существующие методы не менялись. Нужно подтверждение (затрагивает сессию) |
| И | `src/router/AppRouter.tsx` | Маршруты `/`, `/home` → `/`, `/game`, `/profile` внутри `AppLayout`; `/login`, `/register` без изменений |
| И | `src/App.tsx` | Обёртка `I18nProvider` |
| И | `src/main.tsx` | Подключён `styles/index.css` (раньше стили не подключались) |
| И | `src/pages/HomePage/HomePage.tsx` + `.module.css` | Главная: шапка, RU/EN, прогресс, баннер квеста, фильтры, Pinterest-лента (CSS columns), модалка подробностей, ссылка «Подробнее» только для https |
| И | `src/pages/ProfilePage/ProfilePage.tsx` | Профиль: прежние данные пользователя + уровень, очки, статистика, маршруты, кристаллы, рекомендации ИИ, выход |
| Н | `src/pages/ProfilePage/ProfilePage.module.css` | Стили профиля |
| Н | `src/pages/GamePage/GamePage.tsx` + `.module.css` | Квест: прогресс, маршруты с замком, карта, список точек, панель точки, «Собрать» (GPS по нажатию), демо-кнопка, ошибки |
| Н | `src/components/game/QuestMap.tsx` + `.module.css` | Leaflet-карта, divIcon-кристаллы (размер + цвет + ✓), позиция пользователя, fallback без карты |
| Н | `src/components/game/CollectResultModal.tsx` + `.module.css` | «Кристалл найден! +N», подсказка, AI-подсказка с источником, карточка места, новый маршрут/уровень |
| Н | `src/components/layout/AppLayout.tsx` + `.module.css` | Мобильный каркас и нижняя навигация |
| Н | `src/components/ui/Modal.tsx` + `ui.module.css` | Modal, LangSwitch, ProgressBar |
| Н | `src/i18n/I18nContext.tsx` | RU/EN-словарь, `localStorage` |
| Н | `src/api/game.api.ts` | Клиенты `/events`, `/game`, `/progress`, `/collect`, `/ai/*` |
| Н | `src/types/game.types.ts` | Типы контракта |
| Н | `src/lib/leaflet.ts` | Загрузка Leaflet 1.9.4 с unpkg по требованию + минимальные типы |
| Н | `src/lib/geo.ts` | Геолокация по запросу, расстояние (только для отображения) |
| Н | `src/lib/apiErrors.ts` | Коды ошибок → тексты UI (раздел 5.5 ТЗ) |
| И | `src/styles/variables.css`, `src/styles/global.css` | Были пустыми: токены цветов и стили маркеров карты |
| И | `index.html` | `lang="ru"`, заголовок «Открывай Нижний» |
| Н | `public/demo/*.svg` (10 шт.), `public/favicon.svg` | Плейсхолдеры изображений разной высоты и иконка |

`package.json` и `package-lock.json` **не менялись**.

## Документация и инструменты

| | Файл | Что сделано |
|---|---|---|
| Н | `SETUP_GUIDE.md`, `CHANGES.md`, `TESTING.md`, `LIMITATIONS.md` | Документация по запросу |
| Н | `docs/API_CONTRACT_MVP.md` | Контракт MVP и отличия от примеров ТЗ |
| Н | `docs/integration/SHARED_CHANGE_REQUESTS.md` | Фактические пути зон, запросы владельцам по шаблону раздела 6 правил |
| Н | `scripts/smoke-test.sh` | Сквозная проверка API (раздел 11 ТЗ), 40 проверок |
| Н | `backend/http/game-ai.http` | Коллекция запросов для IntelliJ HTTP Client |

## Обновление 20.11.2026 (вторая итерация): подключение YandexGPT

| | Файл | Что сделано |
|---|---|---|
| И | `backend/.../ai/client/OpenAiCompatibleLlmClient.java` | Новый необязательный параметр `AI_PROJECT`: если он задан, к запросу добавляется заголовок `OpenAI-Project: <folder_ID>` (как в официальном примере Yandex Cloud). Пустое значение — поведение как раньше. Формат запроса и ответа, таймаут, fallback не изменены |
| И | `compose.yaml` | Строка `AI_PROJECT: ${AI_PROJECT:-}` в `backend.environment` |
| И | `.env.example` | Блок AI_* с заполнителями для YandexGPT (`https://llm.api.cloud.yandex.net/v1`, `gpt://<FOLDER_ID>/yandexgpt/latest`) |
| Н | `YANDEX_SETUP_GUIDE.md` | Пошаговая настройка YandexGPT на macOS |
| И | `README.md`, `SETUP_GUIDE.md`, `LIMITATIONS.md` | Упоминания YandexGPT и `AI_PROJECT` |

Контракты `/ai/hint`, `/ai/recommendations`, `/ai/status`, а также frontend, игра, регистрация и миграции не менялись.
