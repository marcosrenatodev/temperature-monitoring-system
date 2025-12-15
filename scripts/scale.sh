#!/bin/bash

SERVICE=$1
REPLICAS=${2:-2}

if [ -z "$SERVICE" ]; then
  echo "Usage: $0 <service> [replicas]"
  echo "Services: api-principal, sensor-service, notification-service"
  exit 1
fi

echo "⚖️  Scaling $SERVICE to $REPLICAS replicas..."

kubectl scale deployment $SERVICE -n temperature-monitoring --replicas=$REPLICAS

echo "✅ Scaled successfully!"
kubectl get pods -n temperature-monitoring -l app=$SERVICE
