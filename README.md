# 🌡️ Temperature Monitoring System

Sistema de monitoramento de temperatura e umidade com arquitetura de microserviços, desenvolvido em Node.js com TypeScript.

## 📋 Índice

- [Visão Geral](#visão-geral)
- [Arquitetura](#arquitetura)
- [Tecnologias](#tecnologias)
- [Pré-requisitos](#pré-requisitos)
- [Instalação Local](#instalação-local)
- [Deploy Kubernetes](#deploy-kubernetes)
- [Uso da Aplicação](#uso-da-aplicação)
- [Endpoints API](#endpoints-api)
- [Monitoramento](#monitoramento)

## 🎯 Visão Geral

Este sistema simula o monitoramento de sensores de temperatura e umidade, processando dados de forma assíncrona e gerando alertas quando limites são excedidos.

### Microserviços

1. **API Principal** (Porta 3000)
   - Gerenciamento de sensores
   - Dashboard web com DustJS
   - Endpoints REST

2. **Sensor Service** (Porta 3001)
   - Simulação de leituras de sensores
   - Publicação de dados no RabbitMQ

3. **Notification Service** (Porta 3002)
   - Consumo de mensagens do RabbitMQ
   - Validação de limites
   - Geração de alertas

## 🏗️ Arquitetura

```
┌─────────────────┐
│   Dashboard     │
│   (Browser)     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐     ┌──────────────┐
│  API Principal  │────▶│  PostgreSQL  │
│   (Port 3000)   │     │              │
└─────────────────┘     └──────────────┘
                              ▲
                              │
┌─────────────────┐     ┌─────┴────────┐     ┌────────────────────┐
│ Sensor Service  │────▶│   RabbitMQ   │────▶│ Notification Svc   │
│   (Port 3001)   │     │              │     │   (Port 3002)      │
└─────────────────┘     └──────────────┘     └────────────────────┘
                                                       │
                                                       ▼
                                                 ┌──────────────┐
                                                 │  PostgreSQL  │
                                                 └──────────────┘
```

## 🛠️ Tecnologias

- **Node.js 20** - Runtime
- **TypeScript** - Linguagem
- **Express** - Framework web
- **TinyBone** - Microframework
- **DustJS** - Template engine
- **PostgreSQL** - Banco de dados
- **RabbitMQ** - Message broker
- **Docker** - Containerização
- **Kubernetes** - Orquestração

## 📦 Pré-requisitos

### Para Execução Local (Docker Compose)
- Docker Engine 20.10+
- Docker Compose 2.0+
- Git

### Para Deploy Kubernetes
- Docker
- Kubernetes cluster (Minikube, Kind ou cloud)
- kubectl
- Nginx Ingress Controller (opcional)

## 🚀 Instalação Local

### 1. Clone o Repositório

```bash
git clone https://github.com/marcosrenatodev/temperature-monitoring-system
cd temperature-monitoring-system
```

### 2. Configure as Variáveis de Ambiente

```bash
cp .env.example .env
```

Edite o arquivo `.env` se necessário (valores padrão já funcionam).

### 3. Execute com Docker Compose

```bash
# Build e start de todos os serviços
docker compose up --build

# Ou em background
docker compose up -d --build
```

### 4. Execute as Migrations do Banco

```bash
docker compose exec api-principal npm run migrate
```

### 5. Acesse a Aplicação

- **Dashboard**: http://localhost:3000
- **RabbitMQ Management**: http://localhost:15672 (admin/admin123)
- **API Docs**: http://localhost:3000/api/sensors

### 6. Registre um Sensor

```bash
curl -X POST http://localhost:3000/api/sensors \
  -H "Content-Type: application/json" \
  -d '{
    "sensor_id": "sensor-001",
    "name": "Sala Principal",
    "location": "Andar 1",
    "min_temperature": 18,
    "max_temperature": 26,
    "min_humidity": 40,
    "max_humidity": 60
  }'
```

### 7. Parar os Serviços

```bash
docker compose down

# Remover volumes (limpar dados)
docker compose down -v
```

## ☸️ Deploy Kubernetes

### Passo 1: Setup do Kubernetes Local (Minikube)

```bash
# Instalar Minikube (se ainda não tiver)
# macOS
brew install minikube

# Linux
curl -LO https://storage.googleapis.com/minikube/releases/latest/minikube-linux-amd64
sudo install minikube-linux-amd64 /usr/local/bin/minikube

# Windows (via Chocolatey)
choco install minikube

# Iniciar cluster
minikube start --cpus=4 --memory=4096

# Habilitar Ingress
minikube addons enable ingress
```

### Passo 2: Build e Push das Imagens Docker

```bash
# Configure o registry do Docker
export DOCKER_REGISTRY=your-dockerhub-username

# Build das imagens
docker build -t $api-principal:latest ./services/api-principal
docker build -t $sensor-service:latest ./services/sensor-service
docker build -t $notification-service:latest ./services/notification-service

# Push para o registry
docker push $api-principal:latest
docker push $sensor-service:latest
docker push $notification-service:latest
```

**Nota**: Se usar Minikube localmente, você pode usar o Docker daemon do Minikube:

```bash
# Configure para usar o Docker do Minikube
eval $(minikube docker-env)

# Então faça apenas o build (sem push)
docker build -t api-principal:latest ./services/api-principal
docker build -t sensor-service:latest ./services/sensor-service
docker build -t notification-service:latest ./services/notification-service
```

### Passo 3: Atualizar Kubernetes Manifests

Se estiver usando Minikube local

```yaml
image: api-principal:latest
imagePullPolicy: Never  # Use Never para imagens locais
```

### Passo 4: Deploy no Kubernetes

```bash
# Criar namespace
kubectl apply -f kubernetes/namespace.yaml

# Criar ConfigMaps e Secrets
kubectl apply -f kubernetes/configmap.yaml
kubectl apply -f kubernetes/secrets.yaml

# Deploy PostgreSQL
kubectl apply -f kubernetes/postgres/

# Deploy RabbitMQ
kubectl apply -f kubernetes/rabbitmq/

# Aguardar PostgreSQL e RabbitMQ ficarem prontos
kubectl wait --for=condition=ready pod -l app=postgres -n temperature-monitoring --timeout=120s
kubectl wait --for=condition=ready pod -l app=rabbitmq -n temperature-monitoring --timeout=120s

# Deploy API Principal
kubectl apply -f kubernetes/api-principal/

# Deploy Sensor Service
kubectl apply -f kubernetes/sensor-service/

# Deploy Notification Service
kubectl apply -f kubernetes/notification-service/
```

### Passo 5: Verificar o Deploy

```bash
# Ver todos os pods
kubectl get pods -n temperature-monitoring

# Ver serviços
kubectl get services -n temperature-monitoring

# Ver logs
kubectl logs -f deployment/api-principal -n temperature-monitoring
kubectl logs -f deployment/sensor-service -n temperature-monitoring
kubectl logs -f deployment/notification-service -n temperature-monitoring
```

### Passo 6: Acessar a Aplicação

#### Opção A: Via Ingress (Minikube)

```bash
# Obter IP do Minikube
minikube ip

# Adicionar ao /etc/hosts
echo "$(minikube ip) temperature-monitoring.local" | sudo tee -a /etc/hosts

# Acessar via navegador
open http://temperature-monitoring.local
```

#### Opção B: Via Port Forward

```bash
# API Principal
kubectl port-forward -n temperature-monitoring service/api-principal-service 3000:3000

# RabbitMQ Management
kubectl port-forward -n temperature-monitoring service/rabbitmq-management 15672:15672

# Acessar
open http://localhost:3000
```

#### Opção C: Via NodePort (Minikube)

```bash
# Obter URL do serviço
minikube service api-principal-service -n temperature-monitoring --url
```

### Passo 7: Executar Migrations

```bash
# Executar migrations no pod da API Principal
kubectl exec -it deployment/api-principal -n temperature-monitoring -- npm run migrate
```

### Passo 8: Escalar Serviços

```bash
# Escalar API Principal
kubectl scale deployment api-principal -n temperature-monitoring --replicas=3

# Escalar Sensor Service
kubectl scale deployment sensor-service -n temperature-monitoring --replicas=3

# Escalar Notification Service
kubectl scale deployment notification-service -n temperature-monitoring --replicas=3
```

### Passo 9: Limpeza (Remover tudo)

```bash
# Deletar todos os recursos
kubectl delete namespace temperature-monitoring

# Ou deletar individualmente
kubectl delete -f kubernetes/api-principal/
kubectl delete -f kubernetes/sensor-service/
kubectl delete -f kubernetes/notification-service/
kubectl delete -f kubernetes/rabbitmq/
kubectl delete -f kubernetes/postgres/
kubectl delete -f kubernetes/configmap.yaml
kubectl delete -f kubernetes/secrets.yaml
kubectl delete -f kubernetes/namespace.yaml
```

## 📚 Uso da Aplicação

### Registrar um Novo Sensor

```bash
curl -X POST http://localhost:3000/api/sensors \
  -H "Content-Type: application/json" \
  -d '{
    "sensor_id": "sensor-lab-01",
    "name": "Laboratório Principal",
    "location": "Prédio A - Sala 101",
    "min_temperature": 15,
    "max_temperature": 25,
    "min_humidity": 30,
    "max_humidity": 70
  }'
```

### Listar Todos os Sensores

```bash
curl http://localhost:3000/api/sensors
```

### Ver Leituras de um Sensor

```bash
curl http://localhost:3000/api/sensors/sensor-lab-01/readings
```

### Ver Alertas de um Sensor

```bash
curl http://localhost:3000/api/sensors/sensor-lab-01/alerts
```

### Atualizar um Sensor

```bash
curl -X PUT http://localhost:3000/api/sensors/sensor-lab-01 \
  -H "Content-Type: application/json" \
  -d '{
    "max_temperature": 28,
    "active": true
  }'
```

### Deletar um Sensor

```bash
curl -X DELETE http://localhost:3000/api/sensors/sensor-lab-01
```

## 🔌 Endpoints API

### Sensors
- `POST /api/sensors` - Criar sensor
- `GET /api/sensors` - Listar sensores
- `GET /api/sensors/:id` - Buscar sensor
- `PUT /api/sensors/:id` - Atualizar sensor
- `DELETE /api/sensors/:id` - Deletar sensor

### Readings
- `GET /api/sensors/:id/readings` - Leituras do sensor

### Alerts
- `GET /api/sensors/:id/alerts` - Alertas do sensor

### Dashboard
- `GET /` - Dashboard web
- `GET /api/stats` - Estatísticas gerais

### Health
- `GET /health` - Health check (todos os serviços)

## 📊 Monitoramento

### Logs em Tempo Real

```bash
# Docker Compose
docker compose logs -f api-principal
docker compose logs -f sensor-service
docker compose logs -f notification-service

# Kubernetes
kubectl logs -f deployment/api-principal -n temperature-monitoring
kubectl logs -f deployment/sensor-service -n temperature-monitoring
kubectl logs -f deployment/notification-service -n temperature-monitoring
```

### RabbitMQ Management

Acesse: http://localhost:15672
- Usuário: `admin`
- Senha: `admin123`

Monitore:
- Filas
- Mensagens processadas
- Consumers ativos

### Métricas do Kubernetes

```bash
# Status dos pods
kubectl top pods -n temperature-monitoring

# Status dos nodes
kubectl top nodes

# Descrição detalhada
kubectl describe pod <pod-name> -n temperature-monitoring
```

## 🐛 Troubleshooting

### Problema: Serviços não iniciam no Docker Compose

```bash
# Verificar logs
docker compose logs

# Rebuild forçado
docker compose down -v
docker compose build --no-cache
docker compose up
```

### Problema: Migrations não rodam

```bash
# Docker Compose
docker compose exec api-principal npm run migrate

# Kubernetes
kubectl exec -it deployment/api-principal -n temperature-monitoring -- npm run migrate
```

### Problema: Sensores não geram leituras

1. Verifique se há sensores registrados: `curl http://localhost:3000/api/sensors`
2. Verifique logs do Sensor Service
3. Verifique se RabbitMQ está rodando
4. Verifique a fila no RabbitMQ Management

### Problema: Alertas não aparecem

1. Verifique logs do Notification Service
2. Verifique se as leituras excedem os limites definidos
3. Verifique tabela de alerts no banco

## 🔒 Segurança

- Containers rodando com usuários não-root (UID 1001)
- Secrets do Kubernetes para credenciais
- Resource limits configurados

## 📝 Notas Adicionais

- O Sensor Service gera leituras a cada 5 segundos (configurável)
- 10% das leituras excedem propositalmente os limites para testar alertas
- O Dashboard auto-refresh a cada 30 segundos
- Todas as réplicas podem processar mensagens do RabbitMQ simultaneamente
