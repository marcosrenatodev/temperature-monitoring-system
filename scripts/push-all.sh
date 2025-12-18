#!/bin/bash
set -e

echo "📤 Pushing all Docker images..."

VERSION=${VERSION:-"latest"}

services=("api-principal" "sensor-service" "notification-service")

for service in "${services[@]}"; do
  echo "Pushing $service..."
  docker push $service:$VERSION
  echo "✅ $service pushed successfully"
done

echo "🎉 All images pushed successfully!"
