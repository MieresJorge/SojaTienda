#!/usr/bin/env bash
#
# Prepara un VPS Ubuntu (22.04 o 24.04) recién comprado para correr SOJA.
# Se corre UNA sola vez y como root:
#
#   bash setup-vps.sh
#
# Deja instalado Node 22, Postgres, nginx y el servicio de systemd, pero NO
# baja el código ni arranca la app: eso va en el paso siguiente, porque hace
# falta el .env (ver la sección "Deploy en un VPS" del README).
set -euo pipefail

APP_USER="soja"
APP_DIR="/home/${APP_USER}/soja-web"
DB_NAME="soja"
DB_USER="soja"
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [[ "${EUID}" -ne 0 ]]; then
  echo "Corré esto como root (o con sudo)." >&2
  exit 1
fi

echo "==> Paquetes base"
export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get install -y curl ca-certificates git nginx postgresql postgresql-contrib ufw openssl

echo "==> Node 22"
if ! command -v node >/dev/null || [[ "$(node -v)" != v22.* ]]; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt-get install -y nodejs
fi
node -v

# `next build` es goloso de memoria. En los planes de 1-2 GB se muere sin swap.
echo "==> Swap"
TOTAL_MB="$(free -m | awk '/^Mem:/ {print $2}')"
if [[ "${TOTAL_MB}" -lt 4000 && ! -f /swapfile ]]; then
  fallocate -l 2G /swapfile
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  echo "/swapfile none swap sw 0 0" >> /etc/fstab
  echo "   swap de 2 GB creado (RAM detectada: ${TOTAL_MB} MB)"
else
  echo "   no hace falta (RAM: ${TOTAL_MB} MB)"
fi

echo "==> Usuario de la aplicación"
# La app no corre como root: si alguien se escapa por /api/upload, que no
# tenga la máquina entera.
if ! id -u "${APP_USER}" >/dev/null 2>&1; then
  adduser --disabled-password --gecos "" "${APP_USER}"
fi

echo "==> Base de datos"
if ! sudo -u postgres psql -tAc "SELECT 1 FROM pg_roles WHERE rolname='${DB_USER}'" | grep -q 1; then
  DB_PASS="$(openssl rand -hex 16)"
  sudo -u postgres psql -c "CREATE ROLE ${DB_USER} LOGIN PASSWORD '${DB_PASS}';"
  sudo -u postgres createdb -O "${DB_USER}" "${DB_NAME}"

  # La cadena queda en un archivo del usuario de la app: es el único lugar
  # donde vas a poder volver a leer la contraseña.
  install -o "${APP_USER}" -g "${APP_USER}" -m 600 /dev/null "/home/${APP_USER}/DATABASE_URL.txt"
  echo "postgresql://${DB_USER}:${DB_PASS}@localhost:5432/${DB_NAME}" \
    > "/home/${APP_USER}/DATABASE_URL.txt"
  echo "   base creada. La cadena de conexión quedó en /home/${APP_USER}/DATABASE_URL.txt"
else
  echo "   el rol '${DB_USER}' ya existía, no toco nada"
fi

echo "==> nginx"
install -m 644 "${HERE}/nginx-soja.conf" /etc/nginx/sites-available/soja
ln -sf /etc/nginx/sites-available/soja /etc/nginx/sites-enabled/soja
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl reload nginx

echo "==> Firewall"
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw --force enable

echo "==> Servicio systemd"
install -m 644 "${HERE}/soja.service" /etc/systemd/system/soja.service
systemctl daemon-reload
systemctl enable soja

# deploy/update.sh termina reiniciando el servicio, y eso pide root. En vez de
# deployar como root, le damos al usuario de la app permiso para exactamente
# ese comando y nada más.
cat > /etc/sudoers.d/soja-deploy <<SUDO
${APP_USER} ALL=(root) NOPASSWD: /usr/bin/systemctl restart soja, /usr/bin/systemctl status soja
SUDO
chmod 440 /etc/sudoers.d/soja-deploy
visudo -c -f /etc/sudoers.d/soja-deploy

IP="$(curl -fsS --max-time 5 https://api.ipify.org || hostname -I | awk '{print $1}')"
cat <<FIN

-------------------------------------------------------------------
Servidor listo. IP pública: ${IP}

Falta subir el código y arrancar. Como usuario ${APP_USER}:

  sudo -iu ${APP_USER}
  git clone <URL-DEL-REPO> ${APP_DIR}
  cd ${APP_DIR}
  cp .env.example .env
  nano .env          # ver el README: DATABASE_URL, NEXT_PUBLIC_SITE_URL, admin
  bash deploy/update.sh

DATABASE_URL     -> /home/${APP_USER}/DATABASE_URL.txt
SITE_URL         -> http://${IP}
-------------------------------------------------------------------
FIN
