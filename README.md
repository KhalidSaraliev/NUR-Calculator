# NUR Chat — корпоративный мессенджер

Закрытый мессенджер для внутреннего общения сотрудников компании
(аналог WhatsApp/Telegram + функции Slack), архитектура рассчитана
на масштабирование до 1000+ сотрудников.

Разработка ведётся поэтапно (см. `documentation/ARCHITECTURE.md`,
раздел "Что дальше"). **Этот пакет — Этап 1**: архитектура, база данных,
backend API, регистрация через SMS, система пользователей.

## Быстрый старт (Этап 1 — backend)

Понадобится Docker и Node.js 20+.

```bash
# 1. Поднять инфраструктуру (PostgreSQL, Redis, MinIO)
docker compose up -d postgres redis minio

# 2. Настроить backend
cd backend
cp .env.example .env
npm install

# 3. Применить схему БД
npx prisma migrate dev --name init
npx prisma generate

# 4. Запустить API в dev-режиме
npm run start:dev
```

API поднимется на `http://localhost:3000/api/v1`.

### Проверка (curl)

```bash
# 1. Запросить код
curl -X POST http://localhost:3000/api/v1/auth/otp/request \
  -H "Content-Type: application/json" \
  -d '{"phone": "+77001234567"}'
# код придёт в консоль backend (dev-заглушка SmsService)

# 2. Подтвердить код
curl -X POST http://localhost:3000/api/v1/auth/otp/verify \
  -H "Content-Type: application/json" \
  -d '{"phone": "+77001234567", "code": "1234"}'
# ответ: {"isNewUser": true}  — компании ещё нет, нужно сначала
# создать Company через Prisma Studio (npx prisma studio) — сценарий
# "регистрация компании владельцем" будет добавлен отдельным эндпоинтом
# на следующем этапе вместе с онбордингом

# 3. Завершить регистрацию (после того как есть companyId)
curl -X POST http://localhost:3000/api/v1/users/complete-profile/+77001234567 \
  -H "Content-Type: application/json" \
  -d '{"firstName":"Иван","lastName":"Иванов","companyId":"<uuid компании>"}'
```

### Проверка личных чатов (Этап 2)

```bash
TOKEN="<accessToken из ответа complete-profile>"

# создать/получить личный чат с коллегой
curl -X POST http://localhost:3000/api/v1/chats/direct \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"targetUserId":"<uuid коллеги>"}'

# отправить сообщение
curl -X POST http://localhost:3000/api/v1/chats/<chatId>/messages \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"text":"Привет! Как дела с отчётом?"}'

# список моих чатов (с непрочитанными и последним сообщением)
curl http://localhost:3000/api/v1/chats -H "Authorization: Bearer $TOKEN"
```

Real-time (WebSocket, namespace `/chats`) — пример на JS:

```js
import { io } from 'socket.io-client';

const socket = io('http://localhost:3000/chats', {
  auth: { token: accessToken },
});

socket.on('message:new', (msg) => console.log('Новое сообщение', msg));
socket.on('typing:update', (t) => console.log(`${t.userId} печатает: ${t.isTyping}`));
socket.on('presence:update', (p) => console.log(`${p.userId} online: ${p.isOnline}`));

socket.emit('message:send', { chatId, text: 'Привет через сокет!' });
socket.emit('typing:start', { chatId });
```

### Проверка групп (Этап 3)

```bash
# создать группу "Отдел продаж" с двумя коллегами
curl -X POST http://localhost:3000/api/v1/groups \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"name":"Отдел продаж","memberIds":["<uuid1>","<uuid2>"]}'

# отправить сообщение в группу (тот же эндпоинт, что и для личных чатов)
curl -X POST http://localhost:3000/api/v1/chats/<groupId>/messages \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"text":"Всем привет!"}'

# назначить участника администратором группы (только владелец)
curl -X PATCH http://localhost:3000/api/v1/groups/<groupId>/members/<uuid>/role \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"role":"ADMIN"}'
```

### Проверка файлов (Этап 4)

```bash
# загрузить одно или несколько фото/документов
curl -X POST http://localhost:3000/api/v1/files/upload \
  -H "Authorization: Bearer $TOKEN" \
  -F "files=@photo1.jpg" -F "files=@report.pdf"
# ответ: [{ "id": "...", "url": "https://...", "category": "IMAGE", ... }, ...]

# прикрепить загруженные файлы к сообщению
curl -X POST http://localhost:3000/api/v1/chats/<chatId>/messages \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"attachmentIds":["<fileId1>","<fileId2>"]}'

# раздел "Файлы компании"
curl http://localhost:3000/api/v1/files/company -H "Authorization: Bearer $TOKEN"
```

### Проверка уведомлений (Этап 5)

```bash
# зарегистрировать push-токен устройства (FCM/APNs/Web Push токен от клиента)
curl -X POST http://localhost:3000/api/v1/notifications/push-token \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"token":"<fcm-device-token>","platform":"ANDROID"}'

# сообщение с упоминанием — коллега по имени Иван получит MENTION, остальные NEW_MESSAGE
curl -X POST http://localhost:3000/api/v1/chats/<chatId>/messages \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"text":"@Иван, посмотри отчёт, пожалуйста"}'

# лента непрочитанных уведомлений
curl "http://localhost:3000/api/v1/notifications?unreadOnly=true" \
  -H "Authorization: Bearer $TOKEN"
```

В dev-режиме реальный push не отправляется — текст пишется в консоль
backend (`PushService`), пока не подключён `firebase-admin`.

## Структура проекта

```
nur-chat/
├── backend/          ← готово (Этапы 1–5)
├── admin-panel/       ← готово (Этап 6, React + TypeScript + Vite)
├── frontend/mobile/    ← этап 7 (React Native + Expo)
├── frontend/web/        ← этап 7 (React + TypeScript, чат для сотрудников)
├── documentation/
│   ├── ARCHITECTURE.md
│   └── DATABASE.md
└── docker-compose.yml
```

## Быстрый старт — Admin Web Panel (Этап 6)

```bash
cd admin-panel
cp .env.example .env
npm install
npm run dev
```

Откроется на `http://localhost:5173`. Вход — по номеру телефона и
SMS-коду, как в обычном приложении, но пускает только пользователей
с ролью `OWNER` или `ADMIN`. Backend должен быть запущен (см. выше).

## Известные upgrade-точки перед продакшеном

- `SmsService` — заглушка, вывод кода в лог. Нужно подключить реального
  SMS-провайдера.
- Онбординг компании (кто и как создаёт `Company` первым) — сейчас
  через Prisma Studio вручную, нужен отдельный эндпоинт.
- Шифрование содержимого сообщений "at rest" и настройка бэкапов
  PostgreSQL — до продакшена.
