#!/bin/bash

SERVICE=${1:-"all"}

if [ "$2" == "k8s" ]; then
  echo "📜 Showing Kubernetes logs for: $SERVICE"
  if [ "$SERVICE" == "all" ]; then
    kubectl logs -f deployment/api-principal -n temperature-monitoring &
    kubectl logs -f deployment/sensor-service -n temperature-monitoring &
    kubectl logs -f deployment/notification-service -n temperature-monitoring &
    wait
  else
    kubectl logs -f deployment/$SERVICE -n temperature-monitoring
  fi
else
  echo "📜 Showing Docker logs for: $SERVICE"
  if [ "$SERVICE" == "all" ]; then
    docker compose logs -f
  else
    docker compose logs -f $SERVICE
  fi
fi
