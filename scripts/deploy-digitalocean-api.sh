#!/usr/bin/env bash
# Deploy Roomate API on a DigitalOcean droplet (git pull + build + PM2 restart).
# Run from your Mac/Linux (needs SSH access to the droplet).
#
# Usage:
#   ./scripts/deploy-digitalocean-api.sh
#
# Optional overrides:
#   DROPLET_HOST=157.230.188.157 DROPLET_USER=deploy \
#   REMOTE_BACKEND_DIR=/home/deploy/apps/roomate/backend PM2_NAME=roomate-api \
#   ./scripts/deploy-digitalocean-api.sh
#
set -euo pipefail

DROPLET_HOST="${DROPLET_HOST:-157.230.188.157}"
DROPLET_USER="${DROPLET_USER:-deploy}"
REMOTE_BACKEND_DIR="${REMOTE_BACKEND_DIR:-/home/deploy/apps/roomate/backend}"
PM2_NAME="${PM2_NAME:-roomate-api}"

echo "→ SSH ${DROPLET_USER}@${DROPLET_HOST}"
echo "→ cd ${REMOTE_BACKEND_DIR} && git pull && npm ci && npm run build && pm2 restart ${PM2_NAME}"
echo ""

ssh "${DROPLET_USER}@${DROPLET_HOST}" bash -lc "$(cat <<EOF
set -euo pipefail
cd '${REMOTE_BACKEND_DIR}'
git pull
npm ci
npm run build
pm2 restart '${PM2_NAME}'
echo ''
echo 'Done. Recent logs:'
pm2 logs '${PM2_NAME}' --lines 25 --nostream
EOF
)"

echo ""
echo "→ Optional: curl https://api.roomate.us/health"
