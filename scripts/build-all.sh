#!/bin/bash
set -euo pipefail

echo "🏗️  Building all Docker images..."

VERSION="${VERSION:-latest}"
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

build_api_principal() {
  echo "Building api-principal..."
  docker build \
    -t "api-principal:${VERSION}" \
    -f "${ROOT_DIR}/services/api-principal/Dockerfile" \
    "${ROOT_DIR}"
  echo "✅ api-principal built successfully"
}

build_service_simple() {
  local service="$1"
  echo "Building ${service}..."
  docker build \
    -t "${service}:${VERSION}" \
    "${ROOT_DIR}/services/${service}"
  echo "✅ ${service} built successfully"
}

build_api_principal
build_service_simple "sensor-service"
build_service_simple "notification-service"

echo "🎉 All images built successfully!"
