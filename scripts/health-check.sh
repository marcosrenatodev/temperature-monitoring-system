#!/bin/bash

API_URL=${API_URL:-"http://localhost:3000"}

echo "🏥 Running health checks..."

services=("api-principal:3000" "sensor-service:3001" "notification-service:3002")

for service in "${services[@]}"; do
  name=$(echo $service | cut -d':' -f1)
  port=$(echo $service | cut -d':' -f2)
  url="http://localhost:$port/health"

  echo -n "Checking $name... "

  response=$(curl -s -o /dev/null -w "%{http_code}" $url 2>/dev/null)

  if [ "$response" == "200" ]; then
    echo "✅ OK"
  else
    echo "❌ FAILED (HTTP $response)"
  fi
done

echo ""
echo "🔍 Checking dashboard..."
response=$(curl -s -o /dev/null -w "%{http_code}" $API_URL 2>/dev/null)
if [ "$response" == "200" ]; then
  echo "✅ Dashboard OK"
else
  echo "❌ Dashboard FAILED (HTTP $response)"
fi
