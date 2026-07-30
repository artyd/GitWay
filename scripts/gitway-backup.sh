#!/usr/bin/env bash
# Нічний бекап прогресу GitШлях. Запускати з каталогу деплою (~/GitWay) або через cron.
# Робить pg_dump таблиці progress у ~/GitWay/backups і лишає останні 30 копій.
#
# Встановлення cron (раз, на сервері):
#   (crontab -l 2>/dev/null; echo "0 3 * * * cd ~/GitWay && bash scripts/gitway-backup.sh >> backups/backup.log 2>&1") | crontab -
#
# Ручний запуск:  bash scripts/gitway-backup.sh
# Відновлення:    zcat backups/<файл>.sql.gz | docker compose exec -T db psql -U gitway -d gitway
set -euo pipefail

cd "$(dirname "$0")/.."          # корінь деплою (там, де docker-compose.yml)
mkdir -p backups
STAMP="$(date +%Y%m%d-%H%M%S)"
OUT="backups/gitway-${STAMP}.sql.gz"

# --data-only + повний dump схеми БД: беремо все, щоб відновлення було самодостатнім.
docker compose exec -T db pg_dump -U gitway -d gitway --clean --if-exists \
  | gzip -c > "$OUT"

echo "$(date '+%F %T')  backup -> ${OUT} ($(du -h "$OUT" | cut -f1))"

# Лишаємо останні 30 копій.
ls -1t backups/gitway-*.sql.gz 2>/dev/null | tail -n +31 | xargs -r rm -f
