# API-контракт MVP «Открывай Нижний» (квест + афиша + ИИ)

**Версия:** 1.0 (20.11.2026) · **Префикс:** `/api/v1` · **Формат:** JSON, camelCase  
**Авторизация:** существующая (`docs/API_CONTRACT.md`): `Authorization: Bearer <accessToken>` из `/auth/register` или `/auth/login`. Текущий пользователь = `sub` JWT. Гостевой вход `POST /guests` из ТЗ **не реализован**: команда решила сохранить готовую регистрацию.  
**Ошибки:** единый формат `{"error":{"code":"TOO_FAR","message":"..."}}` (тот же `ApiError`, что в auth).

Пояснения к решениям, которые отличаются от примеров в ТЗ, собраны в конце документа. Перед изменением формата сначала обновите этот файл и предупредите Егора.

## Реестр

| Метод | Путь | Авторизация | Владелец | Назначение |
|---|---|---|---|---|
| GET | `/events?category=` | нет | Юля | Афиша (путь из DEVELOPMENT_RULES) |
| GET | `/discovery?category=` | нет | Юля | То же самое (путь из ТЗ MVP) |
| GET | `/game` | Bearer | Юля | Прогресс + маршруты + видимые чекпоинты (карта и профиль) |
| GET | `/checkpoints` | Bearer | Юля | `{"items":[Checkpoint]}`: только открытые маршруты |
| GET | `/progress` | Bearer | Юля | Только `Progress` |
| POST | `/checkpoints/{id}/collect` | Bearer | Юля | GPS-проверка и сбор кристалла |
| GET | `/ai/hint?checkpointId=&lang=` | Bearer | Рома | AI-подсказка по **собранной** точке |
| GET | `/ai/recommendations?lang=` | Bearer | Рома | Рекомендации по уровню из заранее заданного списка |
| GET | `/ai/status` | Bearer | Рома | `{enabled, model}` для отладки |

`category` = `all | excursions | events | festivals | entertainment` (регистр не важен); другое значение → `400 VALIDATION_ERROR`.  
`lang` = `ru | en` (всё остальное → `ru`).

## Типы

```jsonc
// LocalizedText
{"ru": "Площадь Минина и Пожарского", "en": "Minin and Pozharsky Square"}

// Progress
{"score": 50, "level": "NOVICE", "levelTitle": {"ru":"Новичок","en":"Novice"},
 "nextLevelScore": 60,          // null на максимальном уровне MVP
 "collectedCount": 3, "totalCheckpoints": 6, "unlockedRoutesCount": 1}

// Route
{"id": "hidden", "title": LocalizedText, "description": LocalizedText,
 "requiredScore": 60, "unlocked": false, "checkpointCount": 2, "collectedCount": 0}

// Checkpoint (score = очки за этот кристалл)
{"id": "cp_g01", "routeId": "main", "type": "GREEN", "lat": 56.3293, "lng": 44.0046,
 "score": 30, "collected": true, "collectedAt": "2026-11-20T12:00:00Z",
 "title": LocalizedText,
 "hint": LocalizedText | null,          // только после сбора
 "placeCard": PlaceCard | null}         // только GREEN и только после сбора

// PlaceCard
{"title": LocalizedText, "description": LocalizedText, "imageUrl": "/demo/place-kremlin.svg"}
```

## GET /game → 200

```json
{"progress": {...}, "routes": [...], "checkpoints": [...],
 "demoMode": false, "collectRadiusMeters": 100, "maxGpsAccuracyMeters": 100}
```
Чекпоинты закрытых маршрутов **не** возвращаются: маршрут виден с замком и `requiredScore`.

## POST /checkpoints/{id}/collect

Request: `{"lat": 56.32370, "lng": 44.00200, "accuracyMeters": 15}`. Все три поля обязательны; лишние поля → 400.

Response 200:
```json
{"checkpointId": "cp_y03", "alreadyCollected": false, "pointsAwarded": 10,
 "hint": {"ru": "...", "en": "..."}, "placeCard": null,
 "progress": {"score": 60, "level": "EXPLORER", "nextLevelScore": null, ...},
 "newlyUnlockedRoutes": ["hidden"], "distanceMeters": 12}
```

Порядок проверок на сервере: точка существует → маршрут открыт → уже собрана (тогда `200`, `alreadyCollected=true`, `pointsAwarded=0`, без проверки GPS) → точность GPS → расстояние (Haversine) → запись (UNIQUE `user_id + checkpoint_id`, advisory-lock на пользователя).

| HTTP | code | Когда | Текст в UI |
|---|---|---|---|
| 400 | VALIDATION_ERROR | нет координат/лишние поля | «Проверьте введённые данные» |
| 401 | UNAUTHORIZED | нет/просрочен токен | фронт делает refresh, иначе на /login |
| 403 | TOO_FAR | расстояние > `GAME_COLLECT_RADIUS_METERS` (100) | «Подойдите ближе к чекпоинту» |
| 403 | ROUTE_LOCKED | очков меньше `requiredScore` | «Нужно 60 очков для доступа» |
| 404 | CHECKPOINT_NOT_FOUND | неизвестный id | «Не удалось выполнить запрос» |
| 422 | GPS_INACCURATE | `accuracyMeters` > `GAME_MAX_GPS_ACCURACY_METERS` (100) | «Подождите более точного определения места» |
| 500 | INTERNAL_ERROR | сбой | «Не удалось выполнить запрос. Повторите» |

## GET /events → 200

```json
{"items": [{"id": "ev01", "category": "EXCURSIONS", "title": LocalizedText, "description": LocalizedText,
            "imageUrl": "/demo/ev01.svg", "externalUrl": "https://ru.wikipedia.org/...", "isDemo": true}]}
```
`externalUrl = null` → кнопки «Подробнее» нет. Дат и билетов нет: это демонстрационный каталог.

## AI

`GET /ai/hint?checkpointId=cp_g01&lang=ru` → `{"checkpointId":"cp_g01","language":"ru","text":"...","source":"AI"}`  
- `403 NOT_COLLECTED`: точка ещё не собрана; `404 CHECKPOINT_NOT_FOUND`; `400 VALIDATION_ERROR`: нет `checkpointId`.  
- `source = FALLBACK`: модель выключена, недоступна, или ответ отклонён проверкой (ссылки, лишние числа/даты, длина). В этом случае `text` = проверенная подсказка из БД.

`GET /ai/recommendations?lang=ru` →
```json
{"level": "NOVICE", "language": "ru", "intro": "...", "source": "AI|FALLBACK",
 "items": [{"id": "kremlin", "title": "...", "description": "...", "tier": "POPULAR"}]}
```
NOVICE → `POPULAR`, EXPLORER → `HIDDEN`. Список берётся из `backend/src/main/resources/ai/places.json`; модель пишет только вступительную фразу.

## Решения, отличающиеся от примеров ТЗ (согласовать)

1. **Вход:** вместо `POST /guests` используется готовая регистрация (email/пароль/город). Язык выбирается переключателем RU/EN в интерфейсе и хранится в `localStorage`. Страна берётся из города пользователя (`city.countryCode`).
2. **Названия маршрутов и точек** возвращаются как `{ru,en}`, а не строкой, чтобы работал RU/EN.
3. **Очки точки:** поле `score` у Checkpoint (как в ТЗ) — это очки за кристалл, а `progress.score` — сумма игрока.
4. **Дополнительные поля** (`levelTitle`, `collectedCount`, `distanceMeters`, `demoMode` и т.д.) только добавлены: поля из примеров ТЗ сохранены.
5. **Демо-режим:** `GAME_DEMO_MODE=true` показывает кнопку «Я на месте (демо)», которая отправляет координаты точки. Сервер всё равно выполняет обычную проверку. На публичном сервере флаг держать `false`.
