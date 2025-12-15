#!/bin/bash
set -e

echo "☸️  Deploying to Kubernetes..."

# Create namespace
echo "Creating namespace..."
kubectl apply -f kubernetes/namespace.yaml

# Apply configs and secrets
echo "Applying ConfigMaps and Secrets..."
kubectl apply -f kubernetes/configmap.yaml
kubectl apply -f kubernetes/secrets.yaml

# Deploy database
echo "Deploying PostgreSQL..."
kubectl apply -f kubernetes/postgres/

# Deploy message broker
echo "Deploying RabbitMQ..."
kubectl apply -f kubernetes/rabbitmq/

# Wait for dependencies
echo "Waiting for PostgreSQL..."
kubectl wait --for=condition=ready pod -l app=postgres -n temperature-monitoring --timeout=120s

echo "Waiting for RabbitMQ..."
kubectl wait --for=condition=ready pod -l app=rabbitmq -n temperature-monitoring --timeout=120s

# Deploy services
echo "Deploying API Principal..."
kubectl apply -f kubernetes/api-principal/

echo "Deploying Sensor Service..."
kubectl apply -f kubernetes/sensor-service/

echo "Deploying Notification Service..."
kubectl apply -f kubernetes/notification-service/

echo "✅ Deployment complete!"

# Show status
echo ""
echo "📊 Deployment Status:"
kubectl get pods -n temperature-monitoring
