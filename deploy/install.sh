#!/usr/bin/env bash
# Installs the whole site on a new VPS (Ubuntu 22.04, 24.04 or 26.04), in one go: the site with its admin, 3D viewer and client
# space, its base, HTTPS, the firewall, the updates from GitHub (every 2 minutes) and the nightly backups.
# Can be run again at any time (it keeps what is there: base, passwords, 3D files).
#
# From the Mac:   npm run vps -- install [domain]
# On the VPS:     bash /srv/berete/deploy/install.sh [domain]
# Without a domain, the site answers at <IP with dashes>.sslip.io (with HTTPS) until the domain of the house points here.
# Nothing secret is ever printed (the password of the admin: npm run vps -- admin).
set -euo pipefail

DOMAIN_ARG="${1:-}"
GITHUB="${BERETE_GITHUB:-MalikosDM/Berete}"
APP=/srv/berete
DATA=/srv/berete-data

say() { printf '\n\033[1;35m==> %s\033[0m\n' "$*"; }
fail() { printf '\n\033[1;31mArrêt : %s\033[0m\n' "$*" >&2; exit 1; }

[ "$(id -u)" -eq 0 ] || fail "à lancer en root (ssh root@<IP>)."
. /etc/os-release
[ "${ID:-}" = "ubuntu" ] || fail "prévu pour Ubuntu 22.04, 24.04 ou 26.04 (ici : ${PRETTY_NAME:-inconnu})."
case "${VERSION_ID:-}" in
  22.04 | 24.04 | 26.04) ;;
  *) echo "Attention : Ubuntu ${VERSION_ID:-?} n'a pas été essayé (prévu pour 22.04, 24.04 ou 26.04) ; on continue." ;;
esac
export DEBIAN_FRONTEND=noninteractive NEEDRESTART_MODE=a GIT_TERMINAL_PROMPT=0
APT=(apt-get -y -q -o Dpkg::Options::=--force-confdef -o Dpkg::Options::=--force-confold)

# Ports 80 and 443 must be free (or already ours: a new run of this script).
if ss -ltnpH '( sport = :80 or sport = :443 )' 2>/dev/null | grep -v -q -E 'docker-proxy|"caddy"'; then
  ss -ltnp '( sport = :80 or sport = :443 )' || true
  fail "un autre programme utilise déjà les ports 80/443 (un autre site ?). Ce serveur doit être réservé au site Berete."
fi

say "Mise à jour du système et outils"
# needrestart (installed by default since 24.04) restarts the services it must on its own and never asks anything,
# here and during the automatic security updates.
mkdir -p /etc/needrestart/conf.d
printf "\$nrconf{restart} = 'a';\n\$nrconf{kernelhints} = 0;\n" > /etc/needrestart/conf.d/90-berete.conf
apt-get update -q
"${APT[@]}" upgrade
"${APT[@]}" install git curl ca-certificates openssl rsync ufw fail2ban unattended-upgrades

say "Docker"
# The packages of Ubuntu (docker.io, docker-compose-v2, docker-buildx: 24.04 and 26.04), otherwise the official script.
if ! docker compose version >/dev/null 2>&1; then
  "${APT[@]}" install docker.io docker-compose-v2 docker-buildx \
    || "${APT[@]}" install docker.io docker-compose-v2 \
    || curl -fsSL https://get.docker.com | sh
fi
systemctl enable --now docker
docker compose version >/dev/null || fail "Docker Compose ne s'est pas installé."

say "Mémoire de secours (swap)"
if [ -z "$(swapon --show --noheadings)" ]; then
  fallocate -l 4G /swapfile 2>/dev/null || dd if=/dev/zero of=/swapfile bs=1M count=4096 status=none
  chmod 600 /swapfile && mkswap /swapfile >/dev/null && swapon /swapfile
  grep -q '^/swapfile ' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi

say "Pare-feu (SSH, HTTP, HTTPS)"
# The port(s) of SSH as they are (never locked out).
for port in $(sshd -T 2>/dev/null | awk '$1 == "port" {print $2}' | sort -u); do ufw allow "$port/tcp" >/dev/null; done
ufw allow OpenSSH >/dev/null
ufw allow 80/tcp >/dev/null
ufw allow 443/tcp >/dev/null
ufw allow 443/udp >/dev/null
ufw --force enable >/dev/null

say "Sécurité : mises à jour automatiques, blocage des attaques SSH"
printf 'APT::Periodic::Update-Package-Lists "1";\nAPT::Periodic::Unattended-Upgrade "1";\n' > /etc/apt/apt.conf.d/20auto-upgrades
# fail2ban: 5 wrong SSH logins in 10 minutes = 1 hour away. It reads the journal of the system (systemd) when there is
# no /var/log/auth.log (Ubuntu without rsyslog).
backend=auto
[ -s /var/log/auth.log ] || backend=systemd
printf '[sshd]\nenabled = true\nbackend = %s\nmaxretry = 5\nfindtime = 10m\nbantime = 1h\n' "$backend" > /etc/fail2ban/jail.d/90-berete.conf
systemctl enable unattended-upgrades fail2ban >/dev/null 2>&1 || true
systemctl restart fail2ban >/dev/null 2>&1 || true
systemctl start unattended-upgrades >/dev/null 2>&1 || true
# Password logins over SSH are closed only when a key already opens the server (never locked out).
if [ -s /root/.ssh/authorized_keys ]; then
  printf 'PasswordAuthentication no\nKbdInteractiveAuthentication no\nPermitRootLogin prohibit-password\n' > /etc/ssh/sshd_config.d/10-berete.conf
  if sshd -t 2>/dev/null; then systemctl reload ssh 2>/dev/null || systemctl reload sshd 2>/dev/null || true; else rm -f /etc/ssh/sshd_config.d/10-berete.conf; fi
fi

say "Code du site (GitHub $GITHUB)"
# Public repository: read as it is. Private: through a key of this server allowed to read it ("deploy key").
REPO="https://github.com/$GITHUB.git"
if ! git ls-remote "$REPO" >/dev/null 2>&1; then
  KEY=/root/.ssh/berete_github
  [ -f "$KEY" ] || ssh-keygen -q -t ed25519 -N "" -C "berete-vps" -f "$KEY"
  if ! grep -q 'berete_github' /root/.ssh/config 2>/dev/null; then
    printf 'Host github.com\n  IdentityFile %s\n  IdentitiesOnly yes\n  StrictHostKeyChecking accept-new\n' "$KEY" >> /root/.ssh/config
    chmod 600 /root/.ssh/config
  fi
  REPO="git@github.com:$GITHUB.git"
  if ! git ls-remote "$REPO" >/dev/null 2>&1; then
    echo "Le dépôt GitHub est privé : ajouter cette clé dans GitHub ($GITHUB > Settings > Deploy keys), puis relancer."
    echo "(npm run vps -- install le fait tout seul.)"
    cat "$KEY.pub"
    exit 2
  fi
fi
if [ -d "$APP/.git" ]; then
  git -C "$APP" remote set-url origin "$REPO"
  git -C "$APP" fetch --quiet --depth 1 origin main
  git -C "$APP" reset --quiet --hard FETCH_HEAD
else
  git clone --quiet --depth 1 --branch main "$REPO" "$APP"
fi
cd "$APP"

say "Réglages (.env)"
NEW_PASSWORD=""
# The address of the server itself (<IP with dashes>.sslip.io): the site until the domain points here, then its preview
# address (SITE_PREVIEW, never indexed).
ip="$(hostname -I | tr ' ' '\n' | grep -E '^[0-9]+(\.[0-9]+){3}$' | grep -v -E '^(10|127|192\.168|172\.(1[6-9]|2[0-9]|3[01]))\.' | head -1 || true)"
SSLIP="${ip:+${ip//./-}.sslip.io}"
if [ ! -f .env ]; then
  domain="${DOMAIN_ARG:-$SSLIP}"
  [ -n "$domain" ] || fail "adresse IP publique introuvable : relancer avec le domaine (install.sh exemple.com)."
  preview=""
  [ "$domain" = "$SSLIP" ] || preview="$SSLIP"
  NEW_PASSWORD="$(openssl rand -base64 24 | tr -dc 'A-Za-z0-9' | cut -c1-20)"
  sed -e "s|^SITE_DOMAIN=.*|SITE_DOMAIN=$domain|" \
    -e "s|^SITE_PREVIEW=.*|SITE_PREVIEW=$preview|" \
    -e "s|^ADMIN_PASSWORD=.*|ADMIN_PASSWORD=$NEW_PASSWORD|" \
    -e "s|^POSTGRES_PASSWORD=.*|POSTGRES_PASSWORD=$(openssl rand -hex 24)|" \
    -e "s|^DATA_DIR=.*|DATA_DIR=$DATA|" deploy/env.example > .env
elif [ -n "$DOMAIN_ARG" ]; then
  sed -i "s|^SITE_DOMAIN=.*|SITE_DOMAIN=$DOMAIN_ARG|" .env
fi
chmod 600 .env
DOMAIN="$(grep -E '^SITE_DOMAIN=' .env | cut -d= -f2-)"

say "Dossiers des fichiers 3D et des sauvegardes ($DATA)"
mkdir -p "$DATA/storage" "$DATA/backups"
# The site runs as the user "node" (1000) in its container.
chown -R 1000:1000 "$DATA/storage"

say "Construction et démarrage du site (quelques minutes la première fois)"
docker compose up -d --build
printf 'Démarrage'
for _ in $(seq 1 120); do
  if curl -fsS http://127.0.0.1:3001/api/health >/dev/null 2>&1; then ok=1; break; fi
  printf '.'; sleep 3
done
echo
[ "${ok:-}" = 1 ] || { docker compose logs --tail 60 app; fail "le site ne répond pas (journal ci-dessus)."; }
# The door (Caddy) reads its Caddyfile without error.
docker compose exec -T caddy caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile >/dev/null 2>&1 \
  || { docker compose logs --tail 30 caddy; fail "Caddy ne lit pas deploy/Caddyfile (journal ci-dessus)."; }
docker image prune -f >/dev/null

say "Mises à jour automatiques depuis GitHub et sauvegardes de nuit"
install -m 644 deploy/systemd/berete-update.service deploy/systemd/berete-update.timer deploy/systemd/berete-backup.service deploy/systemd/berete-backup.timer /etc/systemd/system/
systemctl daemon-reload
systemctl enable --now berete-update.timer berete-backup.timer >/dev/null
git rev-parse HEAD > "$DATA/deployed-commit"

say "Terminé"
echo "Site     : https://$DOMAIN"
echo "Admin    : https://$DOMAIN/admin"
if [ -n "$NEW_PASSWORD" ]; then echo "Mot de passe de l'admin : créé (npm run vps -- admin le donne)"; fi
echo "Chaque envoi sur GitHub (main) est en ligne ici quelques minutes après ; sauvegarde chaque nuit dans $DATA/backups."
