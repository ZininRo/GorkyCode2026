# Подключение YandexGPT (macOS)

ИИ-подсказки (`/api/v1/ai/hint`) и рекомендации (`/api/v1/ai/recommendations`) работают через **OpenAI-совместимый API Yandex Cloud**:

- адрес: `POST https://llm.api.cloud.yandex.net/v1/chat/completions`;
- заголовки: `Authorization: Bearer <API-ключ>` и, при заданном `AI_PROJECT`, `OpenAI-Project: <folder_ID>`;
- модель: `gpt://<folder_ID>/yandexgpt/latest`.

Если YandexGPT недоступен, ключ неверный или пустой, API отвечает как обычно, но с проверенными подсказками из БД (`"source": "FALLBACK"`). Игра от ИИ не зависит.

## 1. Получите folder ID и API-ключ

1. Откройте консоль Yandex Cloud: https://console.yandex.cloud.
2. **Folder ID.** Выберите каталог, в котором будете работать. Его ID (строка вида `b1g…`) показан на странице каталога; скопируйте его.
3. **Сервисный аккаунт.** В этом каталоге: «Сервисные аккаунты» (Identity and Access Management) → «Создать сервисный аккаунт». Назначьте роль **`ai.languageModels.user`**.
4. **API-ключ.** Откройте созданный сервисный аккаунт → «Создать новый ключ» → «Создать API-ключ». В области действия (scope) выберите **`yc.ai.foundationModels.execute`**. Скопируйте значение ключа: оно показывается один раз.
5. Убедитесь, что для облака подключён платёжный аккаунт: без него запросы к моделям не выполняются.

## 2. Проверьте ключ напрямую (до запуска проекта)

```bash
export YC_FOLDER='b1g...'      # ваш folder ID
export YC_KEY='AQVN...'        # ваш API-ключ

curl -s https://llm.api.cloud.yandex.net/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $YC_KEY" \
  -H "OpenAI-Project: $YC_FOLDER" \
  -d "{\"model\":\"gpt://$YC_FOLDER/yandexgpt/latest\",\"max_tokens\":50,\"messages\":[{\"role\":\"user\",\"content\":\"Скажи привет одним словом\"}]}" | jq .
```

Если в ответе есть `choices[0].message.content`, значит, ключ, роль и модель в порядке. Если `jq` не установлен: `brew install jq`.

## 3. Заполните `.env`

```bash
cd GorkyCode2026
cp -n .env.example .env     # если .env уже есть, команда его не перезапишет
open -e .env                # откроет файл в TextEdit
```

Задайте значения (вместо `b1g...` и `AQVN...` подставьте свои):

```properties
AI_ENABLED=true
AI_BASE_URL=https://llm.api.cloud.yandex.net/v1
AI_API_KEY=AQVN...
AI_MODEL=gpt://b1g.../yandexgpt/latest
AI_PROJECT=b1g...
AI_TIMEOUT_SECONDS=15
```

Также должны быть заданы `AUTH_JWT_SECRET` (`openssl rand -base64 32`) и переменные `POSTGRES_*` (см. SETUP_GUIDE.md). Для показа в помещении поставьте `GAME_DEMO_MODE=true`.

`.env` не попадает в Git. Не вставляйте ключ в код, в `compose.yaml` или в `.env.example`.

## 4. Запуск через Docker

```bash
docker compose up --build -d          # первый запуск или после изменения Java-кода
docker compose ps                     # db, backend, frontend → healthy
docker compose logs backend | grep "LLM client"
# ожидается: LLM client: enabled=true, baseUrl=https://llm.api.cloud.yandex.net/v1, model=gpt://b1g.../yandexgpt/latest
```

После изменения только `.env` достаточно пересоздать backend:

```bash
docker compose up -d --force-recreate backend
```

## 5. Проверьте, что отвечает именно YandexGPT

```bash
API=http://localhost:8080/api/v1

# Токен: войдите своим пользователем из приложения (email и пароль)
TOKEN=$(curl -s -X POST $API/auth/login -H "Origin: http://localhost:5173" \
  -H "Content-Type: application/json" \
  -d '{"email":"you@example.com","password":"YourPassword1!"}' | jq -r .accessToken)

# 1) Статус ИИ: ожидается {"enabled": true, "model": "gpt://.../yandexgpt/latest"}
curl -s $API/ai/status -H "Authorization: Bearer $TOKEN" | jq .

# 2) Подсказка выдаётся только по собранной точке: соберите cp_y01 (её координаты)
curl -s -X POST $API/checkpoints/cp_y01/collect -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" -d '{"lat":56.32370,"lng":44.00200,"accuracyMeters":10}' | jq '.pointsAwarded, .alreadyCollected'

# 3) Подсказка ИИ: ожидается "source": "AI"
curl -s "$API/ai/hint?checkpointId=cp_y01&lang=ru" -H "Authorization: Bearer $TOKEN" | jq .

# 4) Рекомендации: ожидается "source": "AI" и вступительная фраза от модели
curl -s "$API/ai/recommendations?lang=ru" -H "Authorization: Bearer $TOKEN" | jq '.source, .intro'
```

Как отличить ответ модели от запасного:
- **`"source": "AI"`**: текст сгенерировал YandexGPT.
- **`"source": "FALLBACK"`**: показана проверенная подсказка из БД. Это значит одно из трёх: ИИ выключен, произошла ошибка, или фильтр отклонил ответ (например, модель добавила год, которого нет в проверенных фактах).

В приложении (http://localhost:5173 → «Квест» → собрать кристалл) под блоком «Подсказка ИИ» видна подпись: «сгенерировано ИИ по проверенным фактам» или «проверенный факт (ИИ недоступен)».

Причину fallback смотрите в логе:

```bash
docker compose logs backend | grep "LLM"
```

## 6. Ошибки

Причины ниже — типичные для Yandex Cloud; точный текст ошибки виден в ответе curl из шага 2 (поле `error`).

| В логе | Вероятная причина | Что сделать |
|---|---|---|
| `AI_ENABLED=true but AI_API_KEY is empty` | ключ не задан | заполнить `AI_API_KEY` в `.env`, затем `docker compose up -d --force-recreate backend` |
| `LLM HTTP 401` | неверный, удалённый или скопированный с пробелами ключ | создать новый API-ключ (шаг 1.4), проверить его curl из шага 2 |
| `LLM HTTP 403` | у сервисного аккаунта нет роли `ai.languageModels.user` в этом каталоге, у ключа нет области `yc.ai.foundationModels.execute`, либо folder ID в `AI_MODEL`/`AI_PROJECT` — от другого каталога | выдать роль в каталоге из `AI_MODEL`, пересоздать ключ с нужной областью, сверить folder ID |
| `LLM HTTP 404` | неверный адрес или модель: ошибка в `AI_BASE_URL` (должен заканчиваться на `/v1`, без `/chat/completions`) или в `AI_MODEL` | `AI_BASE_URL=https://llm.api.cloud.yandex.net/v1`, `AI_MODEL=gpt://<folder_ID>/yandexgpt/latest` |
| `LLM HTTP 400` | неверный формат ID модели или folder ID | проверить `gpt://` и folder ID |
| `LLM HTTP 429` | превышена квота или частота запросов | подождать; удачные подсказки кэшируются в памяти backend |
| `LLM call failed (HttpTimeoutException)` | модель не ответила вовремя | увеличить `AI_TIMEOUT_SECONDS` до 20–30 |
| `LLM call failed (ConnectException)` или `UnknownHostException` | нет интернета из контейнера | проверить сеть Docker Desktop, VPN, прокси |

## 7. Проверка fallback (ИИ недоступен)

```bash
# Без ключа: в .env оставьте AI_API_KEY= (пусто), затем
docker compose up -d --force-recreate backend
curl -s $API/ai/status -H "Authorization: Bearer $TOKEN" | jq .                          # enabled: false
curl -s "$API/ai/hint?checkpointId=cp_y01&lang=ru" -H "Authorization: Bearer $TOKEN" | jq .source   # "FALLBACK"
```

Сбор кристаллов, очки и карта при этом работают как обычно. После проверки верните ключ и снова пересоздайте backend.

## 8. Вернуться на OpenAI

```properties
AI_BASE_URL=https://api.openai.com/v1
AI_MODEL=gpt-4o-mini
AI_PROJECT=
AI_API_KEY=<ключ OpenAI>
```

Если `AI_PROJECT` пустой, заголовок `OpenAI-Project` не отправляется.
