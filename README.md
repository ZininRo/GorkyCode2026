# GorkyCode2026

**GorkyCode2026** — корневой проект. **backend** — Spring Boot-приложение и Maven-модуль.

Основа взята из приложенного `pom.xml`: **Java 17, Spring Boot 3.5.6** и его список зависимостей. Добавлен Spring Boot Actuator для Docker healthcheck. PostgreSQL **17** работает в отдельном контейнере.

## Быстрый запуск

Достаточно установленного **Docker Desktop** (Windows/macOS) или **Docker Engine + Compose v2** (Linux). Установка Maven и Java на хосте для контейнерного запуска не нужна.

Из каталога **GorkyCode2026**:

```bash
docker compose up --build -d
docker compose ps
docker compose logs -f backend
```

После запуска:

- API: http://localhost:8080/api/v1/ping — `{"status":"ok"}`
- Healthcheck: http://localhost:8080/actuator/health — `{"status":"UP"}`
- Swagger UI: http://localhost:8080/swagger-ui/index.html
- OpenAPI JSON: http://localhost:8080/v3/api-docs

Если порт 8080 или 5432 занят, измените `APP_PORT` или `POSTGRES_PORT` в `.env`. Значения в `.env` — **только для локальной разработки**.

## Полезные команды

| Что сделать | Команда из корня |
|---|---|
| Запустить систему | `docker compose up --build -d` |
| Посмотреть логи API | `docker compose logs -f backend` |
| Запустить Maven-тесты в Docker | `docker compose run --rm maven` |
| Собрать JAR в Docker | `docker compose run --rm maven mvn -B -ntp clean package` |
| Открыть PostgreSQL | `docker compose exec db psql -U backend -d gorkycode2026` |
| Остановить | `docker compose down` |
| **Удалить БД и её данные** | `docker compose down -v` |

При каждом изменении исходников пересобирайте образ: `docker compose up --build -d`.

## Структура

```text
GorkyCode2026/
├── pom.xml                        # Maven-агрегатор проекта
├── compose.yaml                   # backend + PostgreSQL + Maven tools
├── .env / .env.example
├── README.md
└── backend/
    ├── pom.xml                    # Spring Boot; artifactId/name: backend
    ├── Dockerfile
    ├── http/requests.http
    └── src/
        ├── main/
        │   ├── java/com/gorkycode2026/backend/
        │   │   ├── BackendApplication.java
        │   │   ├── api/PingController.java
        │   │   └── config/SecurityConfig.java
        │   └── resources/
        │       ├── application.yml
        │       └── db/migration/
        └── test/java/com/gorkycode2026/backend/api/PingControllerTest.java
```

## База данных, безопасность и Swagger

- Внутри Docker приложение подключается по имени хоста `db:5432`; с компьютера база доступна на `localhost:${POSTGRES_PORT}`.
- Данные PostgreSQL сохраняются в именованном volume. `docker compose down` данные **сохраняет**, а `down -v` **удаляет**.
- Схема управляется через **Flyway**. При появлении сущностей создайте миграцию `backend/src/main/resources/db/migration/V1__init.sql`; Hibernate настроен на `ddl-auto: validate`.
- Spring Security из вашего `pom.xml` **подключён**. В стартовой конфигурации публичны только `/api/v1/ping`, health и Swagger; все прочие запросы запрещены до реализации аутентификации. Наличие OAuth2 Resource Server в зависимостях не означает, что JWT-проверка уже настроена.
- Lombok, Web Push/VAPID, Bouncy Castle, Testcontainers и WireMock подключены как библиотеки из вашего `pom.xml`, но бизнес-логика их пока не использует.
- Конфигурации и пароли предназначены для **локальной разработки**, не для эксплуатации в продакшене.

## IntelliJ IDEA

1. В **File → Open** откройте **GorkyCode2026** (корневой каталог). IDEA увидит Maven-агрегатор `pom.xml` и модуль `backend`.
2. Укажите **JDK 17** для работы в IDE (Docker сам содержит JDK 17 для сборки).
3. Откройте терминал IDEA в корне и выполните `docker compose up --build -d`.
4. Опционально для запуска из IDEA: сначала выполните `docker compose up -d db`, затем запускайте `BackendApplication.main()` с JDK 17; localhost-настройки уже есть в `application.yml`.

### Плагины и компоненты IDEA

- **Java** и **Maven** — встроенные, должны быть включены.
- **Spring / Spring Boot** — дополнительная поддержка контекста и конфигураций; расширенные функции IDEA Ultimate.
- **Docker** — управление контейнерами в IDE, необязательно: работает и `docker compose` из терминала.
- **Database Tools and SQL** — обозреватель БД, SQL-консоль (по возможностям вашей редакции IDEA).
- **Lombok** — при необходимости включите поддержку Lombok / annotation processing, поскольку эта зависимость есть в `backend/pom.xml`.
- **.env files** — необязательная подсветка `.env`.

## Maven / зависимости

`backend/pom.xml` сохранён на основе приложенного пользователем файла: Spring Web, Data JPA, Validation, Security, OAuth2 Resource Server, Flyway, PostgreSQL, Springdoc/OpenAPI, Lombok, web-push, Bouncy Castle, тестовый Spring Boot, Security Test, Testcontainers, WireMock. Дополнительно включён Actuator для `/actuator/health`.

Корневой `pom.xml` — только Maven-агрегатор. Внутри `backend/pom.xml` задано:

```xml
<artifactId>backend</artifactId>
<name>backend</name>
```

> **Проверка:** XML-конфигурация, расположение файлов и ZIP-архив проверены статически. Настоящую сборку Docker/Maven в этой среде выполнить нельзя: Docker и Maven здесь не установлены. Первый запуск потребует доступ к Docker Hub и Maven Central.
