#!/bin/bash
set -e

NAMESPACE="temperature-monitoring"

usage() {
  echo ""
  echo "📜 Usage:"
  echo "  $0 <service|all> <docker|k8s>"
  echo ""
  echo "🔧 Arguments:"
  echo "  service : api-principal | sensor-service | notification-service | all"
  echo "  target  : docker | k8s"
  echo ""
  echo "📌 Examples:"
  echo "  $0 all docker"
  echo "  $0 api-principal k8s"
  echo "  $0 sensor-service docker"
  echo ""
  exit 1
}

# ---- Argument validation ---------------------------------------------------

SERVICE="$1"
TARGET="$2"

# Must provide both arguments
if [[ -z "$SERVICE" || -z "$TARGET" ]]; then
  echo "❌ Missing arguments."
  usage
fi

# Validate target
if [[ "$TARGET" != "docker" && "$TARGET" != "k8s" ]]; then
  echo "❌ Invalid target: $TARGET"
  usage
fi

# Validate service
VALID_SERVICES=("api-principal" "sensor-service" "notification-service" "all")

if [[ ! " ${VALID_SERVICES[*]} " =~ " ${SERVICE} " ]]; then
  echo "❌ Invalid service: $SERVICE"
  usage
fi

# ---- Execution -------------------------------------------------------------

echo "📜 Showing logs"
echo "   Service : $SERVICE"
echo "   Target  : $TARGET"
echo ""

if [[ "$TARGET" == "k8s" ]]; then
  echo "☸️  Kubernetes logs"

  if [[ "$SERVICE" == "all" ]]; then
    kubectl logs -f deployment/api-principal -n "$NAMESPACE" &
    kubectl logs -f deployment/sensor-service -n "$NAMESPACE" &
    kubectl logs -f deployment/notification-service -n "$NAMESPACE" &
    wait
  else
    kubectl logs -f deployment/"$SERVICE" -n "$NAMESPACE"
  fi

else
  echo "🐳 Docker logs"

  if [[ "$SERVICE" == "all" ]]; then
    docker compose logs -f
  else
    docker compose logs -f "$SERVICE"
  fi
fi
