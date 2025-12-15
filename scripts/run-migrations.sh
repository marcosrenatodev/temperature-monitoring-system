#!/bin/bash
set -e

echo "🔄 Running database migrations..."

if [ "$1" == "docker" ]; then
  echo "Running migrations via Docker Compose..."
  docker compose exec api-principal npm run migrate
elif [ "$1" == "k8s" ]; then
  echo "Running migrations via Kubernetes..."
  POD=$(kubectl get pod -n temperature-monitoring -l app=api-principal -o jsonpath="{.items[0].metadata.name}")
  kubectl exec -it $POD -n temperature-monitoring -- npm run migrate
else
  echo "Usage: $0 [docker|k8s]"
  exit 1
fi

echo "✅ Migrations completed!"
