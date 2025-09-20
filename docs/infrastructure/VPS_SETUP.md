# SingulAI VPS Infrastructure Setup

## Requisitos do Sistema

### Hardware Mínimo
- CPU: 4 vCPUs
- RAM: 8GB
- SSD: 160GB
- Bandwidth: 4TB/mês

### Hardware Recomendado
- CPU: 8 vCPUs
- RAM: 16GB
- SSD: 320GB
- Bandwidth: 6TB/mês

### Software Base
- Ubuntu Server 22.04 LTS
- Node.js 18.x LTS
- Docker 24.x
- NGINX 1.18+
- PM2 5.x

## Configuração de Segurança

### Firewall (UFW)
```bash
# Portas necessárias
22/tcp    # SSH
80/tcp    # HTTP
443/tcp   # HTTPS
8545/tcp  # Ethereum Node
9090/tcp  # Prometheus
3000/tcp  # Grafana
```

### SSL/TLS
- Certificados Let's Encrypt
- Automatic renewal
- Strong cipher suites

### Monitoramento
- Prometheus
- Grafana
- Node Exporter
- Alert Manager

## Arquitetura do Sistema

### Componentes
1. Blockchain Node
   - Ethereum Node (Geth/OpenEthereum)
   - Private Network Support
   - Archive Node Capability

2. API Layer
   - Express.js API
   - GraphQL Endpoint
   - WebSocket Support

3. Database Layer
   - PostgreSQL
   - Redis Cache
   - Event Store

4. Monitoring Stack
   - Logs Aggregation
   - Metrics Collection
   - Alert System

### Network Architecture
```
Internet → Cloudflare → NGINX → API/WebSocket/GraphQL
                              → Blockchain Node
                              → Monitoring Stack
```

## Deployment Pipeline

### Continuous Integration
1. GitHub Actions
2. Automated Testing
3. Security Scans
4. Docker Build

### Continuous Deployment
1. Automated Deployment
2. Zero-downtime Updates
3. Rollback Capability
4. Health Checks

## Ambiente de Produção

### Directory Structure
```
/opt/singulai/
├── apps/
│   ├── api/
│   ├── blockchain/
│   └── monitoring/
├── data/
│   ├── blockchain/
│   ├── postgres/
│   └── redis/
├── logs/
├── ssl/
└── scripts/
```

### Environment Setup
```bash
# Sistema Base
NODE_ENV=production
NETWORK=mainnet
LOG_LEVEL=info

# Blockchain
ETH_NETWORK=mainnet
ETH_NODE_URL=http://localhost:8545
CHAIN_ID=1

# API
API_PORT=3000
API_HOST=0.0.0.0
RATE_LIMIT=100

# Database
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
REDIS_HOST=localhost
REDIS_PORT=6379

# Monitoramento
PROMETHEUS_PORT=9090
GRAFANA_PORT=3000
```

## Scripts de Instalação

### 1. System Setup
```bash
#!/bin/bash
# Update system
apt update && apt upgrade -y

# Install dependencies
apt install -y curl git build-essential

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt install -y nodejs

# Install Docker
curl -fsSL https://get.docker.com | sh

# Install NGINX
apt install -y nginx
```

### 2. Security Setup
```bash
#!/bin/bash
# Configure UFW
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow http
ufw allow https
ufw enable

# Setup fail2ban
apt install -y fail2ban
cp /etc/fail2ban/jail.conf /etc/fail2ban/jail.local
```

### 3. Application Setup
```bash
#!/bin/bash
# Create directories
mkdir -p /opt/singulai/{apps,data,logs,ssl,scripts}

# Setup permissions
chown -R singulai:singulai /opt/singulai
chmod -R 755 /opt/singulai
```

## Monitoramento e Manutenção

### Health Checks
- Sistema base (CPU, RAM, Disk)
- Node.js applications
- Blockchain node
- Database services
- Network connectivity

### Backup Strategy
1. Database Dumps
2. Blockchain Data
3. Configuration Files
4. SSL Certificates
5. Application State

### Alert Rules
1. High CPU/Memory Usage
2. Disk Space Low
3. Service Downtime
4. Failed Transactions
5. Security Events

## Procedimentos de Recuperação

### Service Recovery
1. Automated Restart
2. Manual Intervention
3. Data Recovery
4. State Sync

### Disaster Recovery
1. Backup Restore
2. System Rebuild
3. Data Migration
4. Network Recovery

## Próximos Passos

1. **Instalação Inicial**
   - Setup do sistema base
   - Configuração de segurança
   - Instalação de dependências

2. **Configuração de Aplicação**
   - Deploy de contratos
   - Setup da API
   - Configuração do banco de dados

3. **Monitoramento**
   - Setup Prometheus/Grafana
   - Configuração de alertas
   - Testes de carga

4. **Documentação Final**
   - Procedimentos operacionais
   - Guias de troubleshooting
   - Planos de recuperação