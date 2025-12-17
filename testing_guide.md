# 🧪 Guia de Testes e Validação

## 1. Teste de Instalação Local (Docker Compose)

### 1.1 Preparação

```bash
# Clone e entre no diretório
git clone <repo-url>
cd temperature-monitoring-system

# Copie o .env
cp .env.example .env
```

### 1.2 Build e Start

```bash
# Build todas as imagens
docker compose build

# Suba todos os serviços
docker compose up -d

# Aguarde os serviços ficarem prontos (30-60 segundos)
sleep 30
```

### 1.3 Verifique Status

```bash
# Todos devem estar "Up"
docker compose ps

# Verificar logs (não deve ter erros críticos)
docker compose logs --tail=50
```

### 1.4 Execute Migrations

```bash
docker compose exec api-principal npm run migrate
```

**✅ Resultado esperado:**
```
Starting database migrations...
Running migration 1/7
Running migration 2/7
...
All migrations completed successfully
```

### 1.5 Teste Health Checks

```bash
# API Principal
curl http://localhost:3000/health
# Esperado: {"status":"ok","service":"api-principal","timestamp":"..."}

# Sensor Service
curl http://localhost:3001/health
# Esperado: {"status":"ok","service":"sensor-service","timestamp":"..."}

# Notification Service
curl http://localhost:3002/health
# Esperado: {"status":"ok","service":"notification-service","timestamp":"..."}
```

### 1.6 Teste Dashboard

```bash
# Abrir no navegador
open http://localhost:3000

# Ou via curl
curl http://localhost:3000
```

**✅ Resultado esperado:**
- Página HTML carrega
- Título "Temperature Monitoring Dashboard"
- Mensagem "No sensors registered" (inicialmente)

### 1.7 Teste Criação de Sensor

```bash
curl -X POST http://localhost:3000/api/sensors \
  -H "Content-Type: application/json" \
  -d '{
    "sensor_id": "test-001",
    "name": "Test Sensor",
    "location": "Test Location",
    "min_temperature": 18,
    "max_temperature": 26,
    "min_humidity": 40,
    "max_humidity": 60
  }'
```

**✅ Resultado esperado:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "sensor_id": "test-001",
    "name": "Test Sensor",
    "location": "Test Location",
    "min_temperature": 18,
    "max_temperature": 26,
    "min_humidity": 40,
    "max_humidity": 60,
    "active": true,
    "created_at": "...",
    "updated_at": "..."
  }
}
```

### 1.8 Aguarde Leituras (5-10 segundos)

```bash
# Verifique logs do Sensor Service
docker compose logs sensor-service | tail -20
```

**✅ Resultado esperado:**
```
sensor-service  | Reading published for sensor test-001: 22.45°C, 52.3%
```

### 1.9 Verifique Leituras no Dashboard

```bash
# Refresh no navegador ou
curl http://localhost:3000

# Ou via API
curl http://localhost:3000/api/sensors/test-001/readings
```

**✅ Resultado esperado:**
- Dashboard mostra o sensor com leituras recentes
- Valores de temperatura e umidade aparecem

### 1.10 Verifique Alertas

```bash
# Ver logs do Notification Service
docker compose logs notification-service | grep -i alert

# Ver alertas via API
curl http://localhost:3000/api/sensors/test-001/alerts
```

**✅ Resultado esperado (após alguns minutos):**
- Eventualmente alguma leitura excederá limites
- Alerta aparecerá nos logs
- Alerta aparecerá no dashboard

### 1.11 Teste RabbitMQ Management

```bash
# Abrir no navegador
open http://localhost:15672

# Login: admin / admin123
```

**✅ Verificações:**
- [ ] Queue "sensor_data" existe
- [ ] Há 1 consumer (Notification Service)
- [ ] Mensagens estão sendo processadas (Ready = 0, Total > 0)

### 1.12 Teste PostgreSQL

```bash
# Conectar ao banco
docker compose exec postgres psql -U admin -d temperature_monitoring

# Ver tabelas
\dt

# Ver sensores
SELECT * FROM sensors;

# Ver leituras recentes
SELECT * FROM sensor_readings ORDER BY timestamp DESC LIMIT 10;

# Ver alertas
SELECT * FROM alerts ORDER BY created_at DESC LIMIT 10;

# Sair
\q
```

---

## 2. Teste de Deploy Kubernetes

### 2.1 Setup Minikube

```bash
# Iniciar cluster
minikube start --cpus=4 --memory=4096

# Habilitar ingress
minikube addons enable ingress

# Verificar status
minikube status
```

### 2.2 Build Imagens (Localmente)

```bash
# Usar Docker do Minikube
eval $(minikube docker-env)

# Build
docker build -t api-principal:latest -f services/api-principal/Dockerfile .
docker build -t sensor-service:latest ./services/sensor-service
docker build -t notification-service:latest ./services/notification-service

# Verificar
docker images | grep -E "api-principal|sensor-service|notification-service"
```

### 2.3 Deploy

```bash
# Criar namespace
kubectl apply -f kubernetes/namespace.yaml

# Aplicar configs
kubectl apply -f kubernetes/configmap.yaml
kubectl apply -f kubernetes/secrets.yaml

# Deploy infraestrutura
kubectl apply -f kubernetes/postgres/
kubectl apply -f kubernetes/rabbitmq/

# Aguardar
kubectl wait --for=condition=ready pod -l app=postgres -n temperature-monitoring --timeout=120s
kubectl wait --for=condition=ready pod -l app=rabbitmq -n temperature-monitoring --timeout=120s

# Deploy serviços
kubectl apply -f kubernetes/api-principal/
kubectl apply -f kubernetes/sensor-service/
kubectl apply -f kubernetes/notification-service/
```

### 2.4 Verificar Deploy

```bash
# Ver todos pods (todos devem estar Running)
kubectl get pods -n temperature-monitoring

# Ver serviços
kubectl get svc -n temperature-monitoring

# Ver ingress
kubectl get ingress -n temperature-monitoring
```

**✅ Resultado esperado:**
```
NAME                       READY   STATUS    RESTARTS   AGE
api-principal-xxx-yyy      1/1     Running   0          2m
api-principal-xxx-zzz      1/1     Running   0          2m
notification-service-...   1/1     Running   0          2m
notification-service-...   1/1     Running   0          2m
postgres-xxx-yyy           1/1     Running   0          5m
rabbitmq-xxx-yyy           1/1     Running   0          5m
sensor-service-xxx-yyy     1/1     Running   0          2m
sensor-service-xxx-zzz     1/1     Running   0          2m
```

### 2.5 Executar Migrations

```bash
POD=$(kubectl get pod -n temperature-monitoring -l app=api-principal -o jsonpath="{.items[0].metadata.name}")
kubectl exec -it $POD -n temperature-monitoring -- npm run migrate
```

### 2.6 Acessar via Port Forward

```bash
# API Principal
kubectl port-forward -n temperature-monitoring service/api-principal-service 3000:3000 &

# RabbitMQ
kubectl port-forward -n temperature-monitoring service/rabbitmq-management 15672:15672 &

# Aguarde 2 segundos
sleep 2
```

### 2.7 Teste via Port Forward

```bash
# Health check
curl http://localhost:3000/health

# Dashboard
open http://localhost:3000

# Criar sensor
curl -X POST http://localhost:3000/api/sensors \
  -H "Content-Type: application/json" \
  -d '{
    "sensor_id": "k8s-test-001",
    "name": "K8s Test Sensor",
    "location": "Kubernetes Cluster",
    "min_temperature": 15,
    "max_temperature": 25,
    "min_humidity": 30,
    "max_humidity": 70
  }'
```

### 2.8 Teste Escalabilidade

```bash
# Escalar API Principal para 3 réplicas
kubectl scale deployment api-principal -n temperature-monitoring --replicas=3

# Verificar
kubectl get pods -n temperature-monitoring -l app=api-principal

# Aguardar todos ficarem Running
kubectl wait --for=condition=ready pod -l app=api-principal -n temperature-monitoring --timeout=60s

# Testar load balance (fazer várias requests)
for i in {1..10}; do
  curl -s http://localhost:3000/health | jq '.timestamp'
  sleep 1
done
```

### 2.9 Teste Resiliência

```bash
# Deletar um pod da API
POD=$(kubectl get pod -n temperature-monitoring -l app=api-principal -o jsonpath="{.items[0].metadata.name}")
kubectl delete pod $POD -n temperature-monitoring

# Verificar se novo pod sobe automaticamente
kubectl get pods -n temperature-monitoring -l app=api-principal -w
# Ctrl+C após ver novo pod Running

# API deve continuar funcionando
curl http://localhost:3000/health
```

### 2.10 Teste Ingress (Opcional)

```bash
# Adicionar ao hosts
echo "$(minikube ip) temperature-monitoring.local" | sudo tee -a /etc/hosts

# Acessar
open http://temperature-monitoring.local

# Ou via curl
curl http://temperature-monitoring.local/health
```

---

## 3. Testes de Integração

### 3.1 Fluxo Completo End-to-End

```bash
#!/bin/bash
set -e

echo "🧪 Running E2E Tests..."

API_URL="http://localhost:3000"

# 1. Criar sensor
echo "1. Creating sensor..."
RESPONSE=$(curl -s -X POST $API_URL/api/sensors \
  -H "Content-Type: application/json" \
  -d '{
    "sensor_id": "e2e-test",
    "name": "E2E Test Sensor",
    "location": "Test Lab",
    "min_temperature": 20,
    "max_temperature": 22,
    "min_humidity": 45,
    "max_humidity": 55
  }')

if echo $RESPONSE | jq -e '.success' > /dev/null; then
  echo "✅ Sensor created successfully"
else
  echo "❌ Failed to create sensor"
  exit 1
fi

# 2. Aguardar leituras (15 segundos)
echo "2. Waiting for readings (15s)..."
sleep 15

# 3. Verificar leituras
echo "3. Checking readings..."
READINGS=$(curl -s $API_URL/api/sensors/e2e-test/readings)
COUNT=$(echo $READINGS | jq '.count')

if [ "$COUNT" -gt 0 ]; then
  echo "✅ Readings found: $COUNT"
else
  echo "❌ No readings found"
  exit 1
fi

# 4. Aguardar mais para possíveis alertas (30 segundos)
echo "4. Waiting for potential alerts (30s)..."
sleep 30

# 5. Verificar alertas (pode não ter)
echo "5. Checking alerts..."
ALERTS=$(curl -s $API_URL/api/sensors/e2e-test/alerts)
ALERT_COUNT=$(echo $ALERTS | jq '.count')
echo "ℹ️  Alerts found: $ALERT_COUNT"

# 6. Verificar dashboard
echo "6. Checking dashboard..."
DASHBOARD=$(curl -s $API_URL)
if echo $DASHBOARD | grep -q "E2E Test Sensor"; then
  echo "✅ Dashboard showing sensor"
else
  echo "❌ Sensor not in dashboard"
  exit 1
fi

# 7. Atualizar sensor
echo "7. Updating sensor..."
UPDATE=$(curl -s -X PUT $API_URL/api/sensors/e2e-test \
  -H "Content-Type: application/json" \
  -d '{"name":"E2E Updated"}')

if echo $UPDATE | jq -e '.success' > /dev/null; then
  echo "✅ Sensor updated successfully"
else
  echo "❌ Failed to update sensor"
  exit 1
fi

# 8. Deletar sensor
echo "8. Deleting sensor..."
DELETE=$(curl -s -X DELETE $API_URL/api/sensors/e2e-test)

if echo $DELETE | jq -e '.success' > /dev/null; then
  echo "✅ Sensor deleted successfully"
else
  echo "❌ Failed to delete sensor"
  exit 1
fi

echo ""
echo "🎉 All E2E tests passed!"
```

### 3.2 Teste de Carga (Opcional)

```bash
# Instalar Apache Bench (se necessário)
# macOS: já vem instalado
# Ubuntu: sudo apt-get install apache2-utils

# Teste de carga
ab -n 1000 -c 10 http://localhost:3000/health

# Resultado esperado:
# - Requests per second > 100
# - 100% success rate
# - Mean time per request < 100ms
```

---

## 4. Checklist Final de Validação

### Docker Compose

- [ ] `docker compose up` funciona sem erros
- [ ] Todos containers ficam "Up" e healthy
- [ ] Migrations executam com sucesso
- [ ] Dashboard carrega em http://localhost:3000
- [ ] Sensor pode ser criado via API
- [ ] Leituras aparecem após 5-10 segundos
- [ ] Alertas são gerados quando limites excedem
- [ ] RabbitMQ Management acessível em http://localhost:15672
- [ ] Fila "sensor_data" existe e processa mensagens
- [ ] PostgreSQL persistindo dados
- [ ] Logs não mostram erros críticos

### Kubernetes

- [ ] `kubectl apply` de todos manifests funciona
- [ ] Todos pods ficam "Running"
- [ ] Migrations executam via initContainer ou manual
- [ ] Port-forward permite acessar dashboard
- [ ] Sensores podem ser criados
- [ ] Leituras são geradas e processadas
- [ ] Alertas funcionam
- [ ] Scaling funciona (aumentar réplicas)
- [ ] Pods se recuperam após delete (resiliência)
- [ ] Ingress funciona (se configurado)
- [ ] Resources limits configurados
- [ ] Probes funcionando

### Qualidade do Código

- [ ] TypeScript compila sem erros
- [ ] Código organizado e modular
- [ ] Tratamento de erros implementado
- [ ] Logging estruturado em todos serviços
- [ ] Dockerfiles com non-root user
- [ ] Sem credenciais hardcoded
- [ ] .gitignore configurado corretamente

### Documentação

- [ ] README completo e claro
- [ ] Instruções de instalação testadas
- [ ] Exemplos de API funcionam
- [ ] Arquitetura documentada
- [ ] Troubleshooting útil

---

## 5. Métricas de Sucesso

### Performance

- API responde em < 100ms para requests simples
- Dashboard carrega em < 2 segundos
- Sensor Service publica 1 leitura a cada 5 segundos por sensor
- Notification Service processa mensagens em < 1 segundo
- Banco suporta 100+ sensores sem degradação

### Confiabilidade

- Zero erros em operação normal
- Recuperação automática de falhas
- Mensagens não são perdidas (durability do RabbitMQ)
- Dados persistem após restart

### Escalabilidade

- Múltiplas réplicas funcionam sem conflito
- Load balancing entre réplicas
- Performance não degrada com mais réplicas
- Horizontal scaling testado

---

## 6. Comandos Rápidos de Teste

```bash
# Test everything locally
./scripts/health-check.sh

# Create sample data
./scripts/seed-data.sh

# Watch logs
./scripts/logs.sh all

# Scale service
./scripts/scale.sh api-principal 5

# Port forward K8s
./scripts/port-forward.sh
```

---

## ✅ Status Final

Após completar todos os testes:

```
✅ Docker Compose funcionando
✅ Kubernetes deploy funcionando
✅ Todos microserviços comunicando
✅ RabbitMQ processando mensagens
✅ PostgreSQL persistindo dados
✅ Dashboard renderizando corretamente
✅ Alertas sendo gerados
✅ Escalabilidade testada
✅ Documentação completa
```

**🎉 Projeto pronto para entrega!**
