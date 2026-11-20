#!/usr/bin/env bash
# Puts the last version of GitHub (branch main) online on the VPS. Run every 2 minutes by berete-update.timer:
# nothing happens when nothing changed. The new version is built while the current one keeps serving, then takes its
# place (a few seconds, during which Caddy makes the visitors wait). If it does not start, the previous one comes back
# and this version is not tried again (a newer push will be).
#   bash /srv/berete/deploy/update.sh            only when GitHub has something new
#   bash /srv/berete/deploy/update.sh --force    build and restart anyway (after a change of .env)
set -euo pipefail

# git changes this very file during the update: bash runs a copy of it.
if [ -z "${BERETE_UPDATE_COPY:-}" ]; then
  copy="$(mktemp /tmp/berete-update.XXXXXX)"
  cp "$0" "$copy"
  BERETE_UPDATE_COPY="$copy" exec bash "$copy" "$@"
fi
trap 'rm -f "$BERETE_UPDATE_COPY"' EXIT

export GIT_TERMINAL_PROMPT=0
APP=/srv/berete
LOG=/var/log/berete-deploy.log
FORCE="${1:-}"
log() { printf '%s  %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$*" | tee -a "$LOG"; }

# One update at a time.
exec 9>/run/berete-update.lock
flock -n 9 || exit 0

cd "$APP"
DATA="$(grep -E '^DATA_DIR=' .env | cut -d= -f2- || true)"
DATA="${DATA:-/srv/berete-data}"
git fetch --quiet --depth 1 origin main
CURRENT="$(git rev-parse HEAD)"
NEXT="$(git rev-parse FETCH_HEAD)"
if [ "$FORCE" != "--force" ]; then
  [ "$CURRENT" != "$NEXT" ] || exit 0
  # A version that did not start is not tried again.
  [ "$(cat "$DATA/failed-commit" 2>/dev/null)" != "$NEXT" ] || exit 0
fi

log "Nouvelle version ${NEXT:0:7} : construction"
git reset --quiet --hard "$NEXT"
docker image tag berete-app:latest berete-app:previous 2>/dev/null || true
if ! docker compose build app >> "$LOG" 2>&1; then
  log "La construction a échoué : le site en ligne ne change pas."
  echo "$NEXT" > "$DATA/failed-commit"
  git reset --quiet --hard "$CURRENT"
  exit 1
fi

log "Démarrage de la nouvelle version"
docker compose up -d >> "$LOG" 2>&1
# A new door (deploy/Caddyfile) is read without a restart.
docker compose exec -T caddy caddy reload --config /etc/caddy/Caddyfile >> "$LOG" 2>&1 || true
healthy=""
for _ in $(seq 1 60); do
  sleep 3
  state="$(docker inspect -f '{{.State.Health.Status}}' "$(docker compose ps -q app)" 2>/dev/null || true)"
  if [ "$state" = "healthy" ]; then healthy=1; break; fi
done

if [ -z "$healthy" ]; then
  log "La nouvelle version ne démarre pas : retour à la précédente."
  docker compose logs --tail 80 app >> "$LOG" 2>&1 || true
  echo "$NEXT" > "$DATA/failed-commit"
  if docker image inspect berete-app:previous >/dev/null 2>&1; then
    docker image tag berete-app:previous berete-app:latest
    git reset --quiet --hard "$CURRENT"
    docker compose up -d --no-build app >> "$LOG" 2>&1
  fi
  exit 1
fi

echo "$NEXT" > "$DATA/deployed-commit"
rm -f "$DATA/failed-commit"
# Old images and build steps older than 3 days: the disk stays free.
docker image prune -f >> "$LOG" 2>&1 || true
docker builder prune -f --filter until=72h >> "$LOG" 2>&1 || true
log "En ligne : ${NEXT:0:7} ($(git log -1 --format=%s))"
