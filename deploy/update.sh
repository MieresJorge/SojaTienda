#!/usr/bin/env bash
#
# Publica la versión que esté en el repo. Se corre como el usuario `soja`,
# parado en el directorio de la app:
#
#   cd ~/soja-web && bash deploy/update.sh
#
# Sirve igual para el primer deploy y para cada actualización.
set -euo pipefail

cd "$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

if [[ ! -f .env ]]; then
  echo "Falta el .env. Copiá .env.example y completalo antes de seguir." >&2
  exit 1
fi

echo "==> Traigo los cambios"
if [[ -d .git ]]; then
  git pull --ff-only
fi

echo "==> Dependencias"
npm ci

echo "==> Migraciones"
npx prisma migrate deploy

# OJO: NEXT_PUBLIC_SITE_URL se hornea en el build, no se lee en runtime. Si la
# cambiás en el .env, hay que volver a pasar por acá — reiniciar no alcanza.
echo "==> Build"
npm run build

echo "==> Reinicio"
# El reinicio necesita root; el usuario `soja` lo tiene habilitado sólo para
# este servicio (ver el README).
sudo systemctl restart soja
sleep 3
systemctl --no-pager --lines=0 status soja || true

echo
echo "Listo. Logs en vivo: journalctl -u soja -f"
