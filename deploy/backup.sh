#!/usr/bin/env bash
# The nightly backup of the VPS (berete-backup.timer), kept 14 days in <DATA_DIR>/backups:
#   db/berete-<date>.dump     the whole base (pieces, players, stories, photos sent from the admin, messages, clients,
#                             3D settings): pg_dump, read back by deploy/restore.sh
#   storage/<date>/           the 3D files (a full copy each day; the files that did not change take no room)
# The photos and videos of the site are in git (GitHub): nothing to save for them here.
# A copy on the Mac: npm run vps -- backup
set -euo pipefail
cd /srv/berete
DATA="$(grep -E '^DATA_DIR=' .env | cut -d= -f2- || true)"
DATA="${DATA:-/srv/berete-data}"
B="$DATA/backups"
DAY="$(date +%Y-%m-%d)"
KEEP=14
mkdir -p "$B/db" "$B/storage"

docker compose exec -T db pg_dump -U berete -d berete -Fc > "$B/db/berete-$DAY.dump.part"
mv "$B/db/berete-$DAY.dump.part" "$B/db/berete-$DAY.dump"

last="$(find "$B/storage" -mindepth 1 -maxdepth 1 -type d ! -name "$DAY" | sort | tail -1)"
rsync -a --delete --exclude 'uploads/' --exclude 'shares/' ${last:+--link-dest="$last"} "$DATA/storage/" "$B/storage/$DAY/"

find "$B/db" -name 'berete-*.dump' -mtime +"$KEEP" -delete
find "$B/storage" -mindepth 1 -maxdepth 1 -type d | sort | head -n -"$KEEP" | xargs -r rm -rf
echo "Sauvegarde du $DAY : $(du -sh "$B/db/berete-$DAY.dump" | cut -f1) de base, $(du -sh "$B/storage/$DAY" | cut -f1) de fichiers 3D."
