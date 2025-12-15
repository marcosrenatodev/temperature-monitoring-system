#!/bin/bash
set -e

API_URL=${API_URL:-"http://localhost:3000"}

echo "🌱 Seeding sample data..."

sensors=(
  '{"sensor_id":"sensor-office-01","name":"Escritório Central","location":"Andar 3 - Sala 301","min_temperature":18,"max_temperature":24,"min_humidity":40,"max_humidity":60}'
  '{"sensor_id":"sensor-lab-01","name":"Laboratório Principal","location":"Prédio B - Lab 1","min_temperature":15,"max_temperature":22,"min_humidity":30,"max_humidity":50}'
  '{"sensor_id":"sensor-server-01","name":"Sala de Servidores","location":"Data Center","min_temperature":16,"max_temperature":20,"min_humidity":35,"max_humidity":55}'
  '{"sensor_id":"sensor-warehouse-01","name":"Armazém Geral","location":"Galpão A","min_temperature":10,"max_temperature":30,"min_humidity":20,"max_humidity":80}'
)

for sensor in "${sensors[@]}"; do
  echo "Creating sensor: $(echo $sensor | jq -r '.name')"
  curl -s -X POST $API_URL/api/sensors \
    -H "Content-Type: application/json" \
    -d "$sensor" | jq '.'
  echo ""
done

echo "✅ Sample data seeded successfully!"
