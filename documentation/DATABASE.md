# NUR Chat — база данных

Файл схемы: `backend/prisma/schema.prisma`

## Ключевые сущности

- **Company** — компания-клиент (в проекте на 500 сотрудников — одна запись,
  но схема с самого начала поддерживает мульти-компанию).
- **Department** — отдел (Отдел продаж, Бухгалтерия и т.д.).
- **User** — сотрудник. Поля покрывают все требования ТЗ:
  `role` (OWNER/ADMIN/DEPARTMENT_HEAD/EMPLOYEE), `workStatus`
  (AT_WORK/ON_VACATION/BUSY/DO_NOT_DISTURB), `isOnline`, `lastSeenAt`,
  `isBlocked`.
- **OtpCode** — одноразовые SMS-коды с TTL 5 минут.
- **RefreshToken** — хранится **хэш** refresh-токена (не сам токен) —
  требование безопасности для корпоративного продукта.
- **Chat** — тип DIRECT / GROUP / CHANNEL. Один чат — и личка,
  и группа, и канал компании — упрощает шлюз WebSocket в будущем.
- **ChatMember** — участники чата + роль в чате (для групп) + `lastReadAt`
  (для счётчика непрочитанных).
- **Message** — текст/медиа, `replyTo` (ответ), `forwardedFromId`
  (пересылка), `isPinned`, `isEdited`, `isDeleted` (soft-delete —
  сообщение можно восстановить из админки при инциденте).
- **MessageRead** — кто и когда прочитал сообщение (для галочек
  "доставлено/прочитано").
- **FileAsset** — метаданные файла в S3-совместимом хранилище;
  используется и как вложение к сообщению, и в разделе
  "Файлы компании" (фильтр по `companyId`, видно `uploadedBy`, `createdAt`).
- **Notification** — уведомление пользователя (`NEW_MESSAGE`, `MENTION`,
  `ADDED_TO_GROUP`, `REMOVED_FROM_GROUP`, `ROLE_CHANGED`), `data` (JSON)
  хранит `chatId`/`messageId` для перехода по тапу, `isRead` — для бейджа.
- **PushToken** — токен устройства (FCM/APNs/Web Push) привязанный к
  пользователю; `platform` = `IOS`/`ANDROID`/`WEB`. Один физический
  токен — одна строка (`@unique` на `token`), при повторной регистрации
  того же токена запись обновляется (`upsert`), а не дублируется.

## Как применить схему

```bash
cd backend
cp .env.example .env      # затем отредактировать DATABASE_URL / JWT_SECRET
npm install
npx prisma migrate dev --name init
npx prisma generate
```

`prisma migrate dev` создаст все таблицы в PostgreSQL и сгенерирует
типобезопасный клиент (`@prisma/client`), которым уже пользуется
`PrismaService`.
