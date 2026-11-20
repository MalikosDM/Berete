#!/usr/bin/env bash
# Puts a backup of the base back (deploy/backup.sh): the base becomes what it was that day.
#   bash /srv/berete/deploy/restore.sh                       lists the backups
#   bash /srv/berete/deploy/restore.sh 2026-12-01            puts back the base of that day
#   bash /srv/berete/deploy/restore.sh 2026-12-01 --storage  and the 3D files of that day
# The base of now is saved first (db/berete-before-restore-<date and time>.dump).
set -euo pipefail
cd /srv/berete
DATA="$(grep -E '^DATA_DIR=' .env | cut -d= -f2- || true)"
DATA="${DATA:-/srv/berete-data}"
B="$DATA/backups"
DAY="${1:-}"
if [ -z "$DAY" ]; then
  echo "Sauvegardes de la base :"; ls -1 "$B/db" 2>/dev/null | sed 's/^berete-//; s/\.dump$//'
  exit 0
fi
FILE="$B/db/berete-$DAY.dump"
[ -f "$FILE" ] || { echo "Pas de sauvegarde $FILE"; exit 1; }
if [ "${BERETE_YES:-}" != 1 ]; then
  read -r -p "Remettre la base du $DAY ? Tout ce qui a changé depuis sera remplacé. Taper OUI : " answer
  [ "$answer" = "OUI" ] || { echo "Rien n'a changé."; exit 1; }
fi
docker compose exec -T db pg_dump -U berete -d berete -Fc > "$B/db/berete-before-restore-$(date +%Y-%m-%d-%H%M).dump"
docker compose stop app
docker compose exec -T db pg_restore -U berete -d berete --clean --if-exists --no-owner < "$FILE"
if [ "${2:-}" = "--storage" ] && [ -d "$B/storage/$DAY" ]; then
  rsync -a --delete --exclude 'uploads/' "$B/storage/$DAY/" "$DATA/storage/"
  chown -R 1000:1000 "$DATA/storage"
fi
docker compose start app
echo "Base du $DAY remise en place."
