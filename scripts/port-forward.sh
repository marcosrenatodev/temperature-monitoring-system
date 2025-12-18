#!/bin/bash

echo "🔌 Setting up port forwarding..."

kubectl port-forward -n temperature-monitoring service/api-principal 3000:3000 &
kubectl port-forward -n temperature-monitoring service/rabbitmq 15672:15672 &

echo "✅ Port forwarding active:"
echo "   - API Principal: http://localhost:3000"
echo "   - RabbitMQ Management: http://localhost:15672"
echo ""
echo "Press Ctrl+C to stop"
wait
