#!/bin/bash
set -e

echo "🏗️  Building all Docker images..."

REGISTRY=${DOCKER_REGISTRY:-"your-registry"}
VERSION=${VERSION:-"latest"}

services=("api-principal" "sensor-service" "notification-service")

for service in "${services[@]}"; do
  echo "Building $service..."
  docker build -t $REGISTRY/$service:$VERSION ./services/$service
  echo "✅ $service built successfully"
done

echo "🎉 All images built successfully!"
