#!/usr/bin/env bash
# Puts a backup of the base back (deploy/backup.sh): the base becomes what it was that day.
#   bash /srv/berete/deploy/restore.sh                       lists the backups
#   bash /srv/berete/deploy/restore.sh 2026-12-01            puts back the base of that day
#   bash /srv/berete/deploy/restore.sh 2026-12-01 --storage  and the 3D files of that day
#   bash /srv/berete/deploy/restore.sh 2026-12-01 --test     a test that changes nothing: the backup is read back into a
#                                                            scratch base, its tables counted beside those of the site,
#                                                            then the scratch base is removed
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
if [ "${2:-}" = "--test" ]; then
  psql() { docker compose exec -T db psql -U berete -v ON_ERROR_STOP=1 -At "$@"; }
  # The number of rows of every table of a base.
  COUNT="select table_name || ' ' || (xpath('/row/c/text()', query_to_xml(format('select count(*) as c from %I.%I', table_schema, table_name), false, true, '')))[1]::text from information_schema.tables where table_schema = 'public' and table_type = 'BASE TABLE' order by 1"
  docker compose exec -T db dropdb -U berete --if-exists berete_restore_test
  docker compose exec -T db createdb -U berete berete_restore_test
  trap 'docker compose exec -T db dropdb -U berete --if-exists berete_restore_test' EXIT
  docker compose exec -T db pg_restore -U berete -d berete_restore_test --no-owner --exit-on-error < "$FILE"
  restored="$(psql -d berete_restore_test -c "$COUNT")"
  live="$(psql -d berete -c "$COUNT")"
  echo "Sauvegarde du $DAY relue dans une base d'essai : $(printf '%s\n' "$restored" | wc -l | tr -d ' ') tables, $(printf '%s\n' "$restored" | awk '{s += $2} END {print s}') lignes."
  if [ "$restored" = "$live" ]; then
    echo "Identique à la base du site."
  else
    echo "Différences avec la base du site (ce qui a changé depuis la sauvegarde) :"
    diff <(printf '%s\n' "$live") <(printf '%s\n' "$restored") | grep -E '^[<>]' | sed 's/^</  site       :/; s/^>/  sauvegarde :/' || true
  fi
  echo "Base d'essai supprimée ; la base du site n'a pas été touchée."
  exit 0
fi
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
