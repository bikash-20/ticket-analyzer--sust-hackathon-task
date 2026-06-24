#!/usr/bin/env bash
# Deploy Ticket Analyzer on a cloud VM using the DockerHub images.
# Usage:
#   chmod +x deploy.sh
#   ./deploy.sh
set -euo pipefail

echo "==> Pulling latest images from DockerHub..."
docker compose -f docker-compose.prod.yml pull

echo "==> Starting the stack..."
docker compose -f docker-compose.prod.yml up -d

echo "==> Waiting for backend to become healthy..."
for i in {1..30}; do
  if docker exec ticket-analyzer-backend python -c "import urllib.request; print(urllib.request.urlopen('http://localhost:8000/health').read().decode())" >/dev/null 2>&1; then
    echo "✅ Backend is healthy."
    break
  fi
  sleep 2
done

echo "==> Stack status:"
docker compose -f docker-compose.prod.yml ps

echo ""
echo "✅ Deployment complete."
echo "   - Frontend: http://<VM-PUBLIC-IP>/"
echo "   - Health:   http://<VM-PUBLIC-IP>:8000/health   (if 8000 is exposed)"
