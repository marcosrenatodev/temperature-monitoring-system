#!/bin/bash
set -e

PROJECT_NAME="temperature-monitoring-system"

echo "🧹 Cleaning up Docker resources for project: $PROJECT_NAME"

# Derruba containers, redes e volumes SOMENTE do compose atual
docker compose down --volumes --remove-orphans

# Remove apenas imagens do projeto
echo "🗑️  Removing project images..."
docker images \
  | awk '/api-principal|sensor-service|notification-service/ {print $3}' \
  | sort -u \
  | xargs -r docker rmi -f

# Limpa apenas cache de build (seguro)
docker builder prune -f

echo "✅ Docker cleanup complete"
