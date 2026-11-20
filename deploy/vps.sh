#!/usr/bin/env bash
# The VPS of the site, driven from the Mac: npm run vps -- <command>
#   install [domain]   installs everything on a new VPS (deploy/install.sh), or brings it up to date
#   status             is the site up, which version, the disk, the last backups
#   update             puts the last version of GitHub online now (otherwise it happens on its own within 5 minutes)
#   logs               what the site says (Ctrl+C to stop)
#   admin              the address and the password of the admin
#   set NAME=value     changes a setting of .env (SITE_DOMAIN, SMTP_…, ALERT_TO…) and restarts the site with it
#   domain example.com the address of the site becomes example.com (once its DNS points to the VPS)
#   launch             opens the site to the search engines (SITE_INDEXING=on)
#   3d                 sends the 3D models of this Mac (local base and storage/) to the VPS
#   backup [folder]    copies the backups of the VPS to the Mac (default: the external disk)
#   private            lets the VPS read GitHub with its own key (before the repository becomes private)
#   ssh                opens a terminal on the VPS
# The VPS: the SSH name "berete-vps" (~/.ssh/config), or BERETE_VPS=root@<IP>. BERETE_VPS=local: the Docker of this Mac.
set -euo pipefail
cd "$(dirname "$0")/.."

HOST="${BERETE_VPS:-berete-vps}"
GITHUB="${BERETE_GITHUB:-MalikosDM/Berete}"
CMD="${1:-}"
[ $# -gt 0 ] && shift
if [ "$HOST" = local ]; then
  APP="$PWD"
  DATA="$PWD/.data"
  run() { (cd "$APP" && bash -c "$*"); }
  dest() { printf '%s' "$1"; }
else
  APP=/srv/berete
  DATA=/srv/berete-data
  run() { on_vps "cd $APP && $*"; }
  dest() { printf '%s:%s' "$HOST" "$1"; }
fi
# A new VPS is known at the first connection (no question to answer).
on_vps() { ssh -o StrictHostKeyChecking=accept-new "$HOST" "$@"; }
export RSYNC_RSH="ssh -o StrictHostKeyChecking=accept-new"

setting() {
  local pair="$1" name="${1%%=*}"
  [[ "$pair" == *=* && "$name" =~ ^[A-Z_]+$ ]] || { echo "Écrire NOM=valeur (ex. ALERT_TO=contact@exemple.com)"; exit 1; }
  local value="${pair#*=}"
  [[ "$value" != *"|"* && "$value" != *"'"* && "$value" != *$'\n'* ]] || { echo "La valeur ne peut pas contenir | ni '"; exit 1; }
  # For sed, & and \ are written \& and \\.
  local escaped
  escaped="$(printf '%s' "$value" | sed 's/[&\\]/\\&/g')"
  run "if grep -q '^$name=' .env; then sed -i.bak 's|^$name=.*|$name=$escaped|' .env; else echo '$name=$value' >> .env; fi; rm -f .env.bak"
}

# The key of the VPS may read the repository on GitHub (read only), with the GitHub CLI of the Mac.
allow_vps() {
  local pub
  pub="$(mktemp)"
  on_vps "cat /root/.ssh/berete_github.pub" > "$pub"
  gh repo deploy-key add "$pub" --repo "$GITHUB" --title "berete-vps"
  rm -f "$pub"
}

case "$CMD" in
  install)
    [ "$HOST" != local ] || { echo "install se lance sur le VPS."; exit 1; }
    on_vps "cat > /tmp/berete-install.sh" < deploy/install.sh
    code=0
    on_vps "bash /tmp/berete-install.sh ${1:-}" || code=$?
    if [ "$code" = 2 ]; then
      # A private repository: the key of the VPS is allowed to read it (GitHub CLI of the Mac), then the install goes on.
      allow_vps
      on_vps "bash /tmp/berete-install.sh ${1:-}"
    elif [ "$code" != 0 ]; then
      exit "$code"
    fi
    ;;
  private)
    # The repository becomes private (or is already): the VPS reads it with its own key, added to GitHub.
    [ "$HOST" != local ] || { echo "private : seulement pour le VPS."; exit 1; }
    on_vps 'KEY=/root/.ssh/berete_github; [ -f "$KEY" ] || ssh-keygen -q -t ed25519 -N "" -C berete-vps -f "$KEY"
      grep -q berete_github /root/.ssh/config 2>/dev/null || { printf "Host github.com\n  IdentityFile %s\n  IdentitiesOnly yes\n  StrictHostKeyChecking accept-new\n" "$KEY" >> /root/.ssh/config; chmod 600 /root/.ssh/config; }'
    allow_vps || true
    run "git remote set-url origin git@github.com:$GITHUB.git && git fetch --quiet --depth 1 origin main && echo 'Le VPS lit GitHub avec sa clé : le dépôt peut être privé.'"
    ;;
  status)
    run 'echo "Site : $(curl -fsS http://127.0.0.1:3001/api/health >/dev/null && echo "en ligne" || echo "NE RÉPOND PAS")"
      echo "Adresse : https://$(grep -E "^SITE_DOMAIN=" .env | cut -d= -f2-)"
      echo "Version : $(git log -1 --format="%h %s (%cr)")"
      echo "Moteurs de recherche : $(grep -q "^SITE_INDEXING=on" .env && echo ouvert || echo "fermé (noindex)")"
      echo "Alertes e-mail : $(grep -qE "^SMTP_HOST=.+" .env && echo actives || echo "non configurées")"
      echo "Disque : $(df -h / | awk "NR==2 {print \$4\" libres sur \"\$2}")"
      echo "Dernières sauvegardes : $(ls -1 '"$DATA"'/backups/db 2>/dev/null | tail -3 | tr "\n" " ")"
      tail -3 /var/log/berete-deploy.log 2>/dev/null || true'
    ;;
  update)
    [ "$HOST" != local ] || { docker compose up -d --build; exit 0; }
    run "bash deploy/update.sh --force"
    ;;
  logs)
    run "docker compose logs -f --tail 100 app"
    ;;
  admin)
    run 'echo "Admin : https://$(grep -E "^SITE_DOMAIN=" .env | cut -d= -f2-)/admin"; echo "Mot de passe : $(grep -E "^ADMIN_PASSWORD=" .env | cut -d= -f2-)"'
    ;;
  set)
    [ $# -ge 1 ] || { echo "npm run vps -- set NOM=valeur"; exit 1; }
    for pair in "$@"; do setting "$pair"; done
    if [ "$HOST" = local ]; then docker compose up -d --build; else run "bash deploy/update.sh --force"; fi
    ;;
  domain)
    [ -n "${1:-}" ] || { echo "npm run vps -- domain exemple.com"; exit 1; }
    domain="${1#https://}"; domain="${domain#http://}"; domain="${domain%%/*}"
    "$0" set "SITE_DOMAIN=$domain"
    echo "Site : https://$domain (le certificat HTTPS arrive dans la minute si le DNS pointe déjà vers le VPS)."
    ;;
  launch)
    "$0" set SITE_INDEXING=on
    echo "Le site est ouvert aux moteurs de recherche."
    ;;
  3d)
    PG_DUMP="$(command -v pg_dump || echo /opt/homebrew/opt/postgresql@17/bin/pg_dump)"
    LOCAL_DB="$(grep -E '^DATABASE_URL=' .env | cut -d= -f2- | tr -d '"')"
    # The base of this Mac, started if it was not.
    node scripts/local-db.mjs > /dev/null
    sql="$(mktemp)"
    trap 'rm -f "$sql"' EXIT
    # The models and the roles of their layers; a model already on the VPS (the test model) keeps its own.
    "$PG_DUMP" "$LOCAL_DB" --data-only --inserts --on-conflict-do-nothing --no-owner --no-privileges \
      --table='"Model3D"' --table='"LayerMemory"' > "$sql"
    echo "Envoi des fichiers 3D ($(du -sh storage/models | cut -f1))…"
    run "mkdir -p '$DATA/storage/models'"
    rsync -az --exclude 'demo-zn1242/' storage/models/ "$(dest "$DATA/storage/models/")"
    [ "$HOST" = local ] || run "chown -R 1000:1000 '$DATA/storage'"
    run "docker compose exec -T db psql -q -o /dev/null -U berete -d berete -v ON_ERROR_STOP=1" < "$sql"
    run "docker compose exec -T db psql -At -U berete -d berete -c 'select name, status from \"Model3D\" order by name'" | sed 's/|/ : /; s/^/  /'
    echo "Modèles 3D en place."
    ;;
  backup)
    disk="/Volumes/Disque externe"
    target="${1:-}"
    if [ -z "$target" ]; then
      if [ -d "$disk" ]; then target="$disk/Berete - Sauvegardes serveur"; else target=".local/sauvegardes-serveur"; fi
    fi
    mkdir -p "$target"
    rsync -az "$(dest "$DATA/backups/")" "$target/"
    echo "Sauvegardes copiées dans : $target"
    ;;
  ssh)
    [ "$HOST" != local ] || { echo "ssh : seulement pour le VPS."; exit 1; }
    ssh "$HOST"
    ;;
  *)
    sed -n '2,16p' "$0" | sed 's/^# \{0,1\}//'
    exit 1
    ;;
esac
