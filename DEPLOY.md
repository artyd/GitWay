# Розгортання GitШлях на сервері

Прогрес усіх учасників і рейтинг зберігаються у **Postgres** (спільна БД), а не в
памʼяті браузера. Нижче — два способи розгортання.

## Варіант A — Docker Compose (рекомендовано)

Потрібні лише Docker і Docker Compose.

```bash
# у корені проєкту
docker compose up -d --build
```

- Підніме Postgres (сервіс `db`) і застосунок (сервіс `app`) на `http://СЕРВЕР:3000`.
- Схема таблиць створюється **автоматично** при першому запиті — міграції запускати не треба.
- Дані Postgres зберігаються у томі `gitway-db` (переживають перезапуск/оновлення).

> ⚠️ Перед продом змініть `POSTGRES_PASSWORD` у `docker-compose.yml` і відповідно
> `DATABASE_URL` сервісу `app`. За потреби заберіть публікацію порту `5432`.

Оновлення після зміни коду:
```bash
git pull
docker compose up -d --build
```

## Варіант B — свій Postgres + Node на сервері

1. Створіть БД і користувача в наявному Postgres.
2. Задайте змінну оточення (файл `.env` за зразком `.env.example`):
   ```
   DATABASE_URL=postgres://user:pass@host:5432/gitway
   ```
3. Зберіть і запустіть:
   ```bash
   npm ci
   npm run build
   DATABASE_URL=... npm start        # або node .next/standalone/server.js
   ```
   Для автозапуску використайте `pm2`, `systemd` або службу Windows.

## Схема БД

Створюється автоматично (`src/lib/db.ts` → `ensureSchema`). Одна таблиця:

```
progress(user_id PK, name, department, dept_key, completed jsonb,
         current, xp, streak, tr_known jsonb, updated_at)
```

`user_id` = `<ключ_відділу>:<ПІБ>` — стабільний ключ учасника з роестру
(`src/lib/roster.ts`).

## Резервне копіювання

```bash
# дамп
docker compose exec db pg_dump -U gitway gitway > backup.sql
# відновлення
docker compose exec -T db psql -U gitway gitway < backup.sql
```

## Реєстр учасників

Відділи та ПІБ — у `src/lib/roster.ts`. Щоб додати/змінити людину або відділ,
відредагуйте цей файл і перезберіть застосунок. Прогрес привʼязано до
`ключ_відділу:ПІБ`, тож зміна написання імені створює нового учасника.

## API (внутрішнє)

- `GET /api/progress?user=<id>` — прогрес учасника.
- `POST /api/progress` — зберегти (upsert) прогрес.
- `GET /api/leaderboard?department=<key>&sort=xp|name&me=<id>` — рейтинг;
  без `department` повертає **топ-10** за XP.
