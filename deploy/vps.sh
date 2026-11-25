#!/usr/bin/env bash
# The VPS of the site, driven from the Mac: npm run vps -- <command>
#   install [domain]   installs everything on a new VPS (deploy/install.sh), or brings it up to date
#   status             is the site up, which version, the disk, the last and the next backups
#   update             puts the last version of GitHub online now (otherwise it happens on its own: checked every 2 minutes)
#   logs               what the site says (Ctrl+C to stop)
#   admin              the address and the password of the admin
#   set NAME=value …   changes one or several settings of .env (SMTP_…, ALERT_TO, OPENAI_API_KEY…) and restarts the
#                      site with them; NAME alone: the value is asked without being shown (a password, a key)
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

# A setting of .env (NAME=value replaces its line, or is added at the end). The value travels through the standard input,
# never on a command line, and is never shown. With other signs than letters, digits and . _ @ : / , + = - it is written
# between single quotes: docker compose takes it as it is ($, # and spaces included).
read -r -d '' SET_REMOTE <<'SH' || true
IFS= read -r line
N="${line%%=*}" L="$line" awk 'index($0, ENVIRON["N"] "=") == 1 { if (!done) print ENVIRON["L"]; done = 1; next } { print } END { if (!done) print ENVIRON["L"] }' .env > .env.new
chmod 600 .env.new && mv .env.new .env
SH
setting() {
  local name="$1" value="$2"
  [[ "$name" =~ ^[A-Z][A-Z0-9_]*$ ]] || { echo "Nom de réglage invalide : $name (ex. ALERT_TO=contact@exemple.com)"; exit 1; }
  [[ "$value" != *"'"* && "$value" != *$'\n'* ]] || { echo "La valeur de $name ne peut pas contenir d'apostrophe ' ni de retour à la ligne."; exit 1; }
  [[ "$value" =~ ^[A-Za-z0-9._@:/,+=-]*$ ]] || value="'$value'"
  printf '%s=%s\n' "$name" "$value" | run "$SET_REMOTE"
}

# The site starts again with the settings of .env: rebuilt when its address changes (it is written in the pages),
# otherwise only restarted (a few seconds; Caddy makes the visitors wait).
restart_site() {
  if [ "$HOST" = local ]; then docker compose up -d --build; return; fi
  if [ "${1:-}" = rebuild ]; then run "bash deploy/update.sh --force"; return; fi
  run 'docker compose up -d >/dev/null 2>&1
    for _ in $(seq 1 60); do curl -fsS http://127.0.0.1:3001/api/health >/dev/null 2>&1 && { echo "Site redémarré."; exit 0; }; sleep 2; done
    echo "Le site ne répond pas : npm run vps -- logs"; exit 1'
}

# The address of the server itself: <its public IPv4 with dashes>.sslip.io.
server_sslip() {
  local ip
  ip="$(on_vps "hostname -I" | tr ' ' '\n' | grep -E '^[0-9]+(\.[0-9]+){3}$' | grep -v -E '^(10|127|192\.168|172\.(1[6-9]|2[0-9]|3[01]))\.' | head -1 || true)"
  [ -z "$ip" ] || printf '%s.sslip.io' "${ip//./-}"
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
      preview="$(grep -E "^SITE_PREVIEW=" .env | cut -d= -f2-)"
      [ -z "$preview" ] || echo "Adresse du serveur (aperçu, jamais indexée) : https://$preview"
      echo "Moteurs de recherche : $(grep -q "^SITE_INDEXING=on" .env && echo ouvert || echo "fermé (noindex)")"
      filled() { grep -qE "^$1=.+" .env && ! grep -qE "^$1=(\"\"|'"''"')$" .env; }
      echo "Alertes e-mail : $(filled SMTP_HOST && filled SMTP_USER && filled SMTP_PASS && filled ALERT_TO && echo actives || echo "non configurées (SMTP_USER, SMTP_PASS, ALERT_TO)")"
      echo "Imaginez votre création : $(filled OPENAI_API_KEY && echo "active" || echo "cachée (pas de clé OPENAI_API_KEY)")"
      echo "Disque : $(df -h / | awk "NR==2 {print \$4\" libres sur \"\$2}")"
      echo "Dernières sauvegardes : $(ls -1 '"$DATA"'/backups/db 2>/dev/null | grep -v before-restore | tail -3 | tr "\n" " ")"
      echo "Prochaine sauvegarde : $(systemctl show berete-backup.timer -p NextElapseUSecRealtime --value 2>/dev/null) (3 h 30 à Dubaï)"
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
    [ $# -ge 1 ] || { echo "npm run vps -- set NOM=valeur … (ou NOM seul : la valeur est demandée sans s'afficher)"; exit 1; }
    names=()
    for arg in "$@"; do
      if [[ "$arg" == *=* ]]; then
        setting "${arg%%=*}" "${arg#*=}"
      else
        read -r -s -p "$arg (rien ne s'affiche en tapant, puis Entrée) : " value < /dev/tty
        echo
        setting "$arg" "$value"
      fi
      names+=("${arg%%=*}")
    done
    echo "Enregistré : ${names[*]}"
    if [[ " ${names[*]} " == *" SITE_DOMAIN "* ]]; then restart_site rebuild; else restart_site; fi
    ;;
  domain)
    [ -n "${1:-}" ] || { echo "npm run vps -- domain exemple.com"; exit 1; }
    domain="${1#https://}"; domain="${domain#http://}"; domain="${domain%%/*}"
    # The address of the server itself stays open beside it (never indexed), to check the server whatever the DNS says.
    preview=""
    [ "$HOST" = local ] || preview="$(server_sslip)"
    [ "$preview" != "$domain" ] || preview=""
    "$0" set "SITE_DOMAIN=$domain" "SITE_PREVIEW=$preview"
    echo "Site : https://$domain (son certificat HTTPS arrive à la première visite dès que le DNS pointe vers le VPS)."
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
    awk 'NR > 1 && /^#/ { sub(/^# ?/, ""); print; next } NR > 1 { exit }' "$0"
    exit 1
    ;;
esac
