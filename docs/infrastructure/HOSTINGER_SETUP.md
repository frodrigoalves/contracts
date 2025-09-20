# Hostinger VPS Setup Guide - SingulAI

## 1. Plano Recomendado

### Configuração Ideal na Hostinger
- Plano: VPS 6 ou Superior
- CPU: 6 vCPUs
- RAM: 8GB
- SSD: 200GB
- Bandwidth: 6TB
- IPv4 Dedicado

## 2. Acesso Inicial

```bash
# Conectar via SSH (substitua IP_DO_SERVIDOR)
ssh root@IP_DO_SERVIDOR

# Alterar senha root imediatamente
passwd

# Atualizar sistema
apt update && apt upgrade -y
```

## 3. Configuração Básica de Segurança

```bash
# Criar usuário não-root
adduser singulai
usermod -aG sudo singulai

# Configurar SSH
nano /etc/ssh/sshd_config

# Modificar as seguintes linhas:
PermitRootLogin no
PasswordAuthentication no
Port 2345  # Porta personalizada para SSH

# Configurar chaves SSH
mkdir -p /home/singulai/.ssh
chmod 700 /home/singulai/.ssh
nano /home/singulai/.ssh/authorized_keys
chmod 600 /home/singulai/.ssh/authorized_keys
chown -R singulai:singulai /home/singulai/.ssh

# Reiniciar SSH
systemctl restart sshd
```

## 4. Firewall (UFW)

```bash
# Instalar UFW
apt install ufw

# Configurar regras
ufw default deny incoming
ufw default allow outgoing
ufw allow 2345/tcp  # SSH (porta personalizada)
ufw allow 80/tcp    # HTTP
ufw allow 443/tcp   # HTTPS
ufw allow 8545/tcp  # Ethereum Node
ufw allow 9090/tcp  # Prometheus
ufw allow 3000/tcp  # Grafana

# Ativar firewall
ufw enable
```

## 5. Instalação de Dependências

```bash
# Instalar ferramentas essenciais
apt install -y curl git build-essential

# Instalar Node.js 18.x
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt install -y nodejs

# Instalar PM2
npm install -g pm2

# Instalar Docker
curl -fsSL https://get.docker.com | sh
systemctl enable docker
systemctl start docker

# Instalar Docker Compose
curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose
```

## 6. Configuração do NGINX

```bash
# Instalar NGINX
apt install -y nginx

# Configurar SSL com Certbot
apt install -y certbot python3-certbot-nginx
```

## 7. Estrutura de Diretórios

```bash
# Criar estrutura
mkdir -p /opt/singulai/{apps,data,logs,ssl,scripts}
chown -R singulai:singulai /opt/singulai
chmod -R 755 /opt/singulai
```

## 8. Docker Compose Setup

```yaml
# /opt/singulai/docker-compose.yml
version: '3.8'

services:
  ethereum-node:
    image: ethereum/client-go:stable
    container_name: geth-node
    volumes:
      - /opt/singulai/data/ethereum:/root/.ethereum
    ports:
      - "8545:8545"
    command: --http --http.addr "0.0.0.0" --http.port "8545" --http.api "eth,net,web3"

  postgres:
    image: postgres:14
    container_name: singulai-db
    environment:
      POSTGRES_USER: singulai
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_DB: singulai
    volumes:
      - /opt/singulai/data/postgres:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  redis:
    image: redis:7
    container_name: singulai-cache
    volumes:
      - /opt/singulai/data/redis:/data
    ports:
      - "6379:6379"

  prometheus:
    image: prom/prometheus
    container_name: singulai-prometheus
    volumes:
      - /opt/singulai/data/prometheus:/prometheus
    ports:
      - "9090:9090"

  grafana:
    image: grafana/grafana
    container_name: singulai-grafana
    depends_on:
      - prometheus
    volumes:
      - /opt/singulai/data/grafana:/var/lib/grafana
    ports:
      - "3000:3000"
```

## 9. Scripts de Manutenção

### Backup Script
```bash
#!/bin/bash
# /opt/singulai/scripts/backup.sh

BACKUP_DIR="/opt/singulai/backups"
DATE=$(date +%Y%m%d)

# Backup PostgreSQL
docker exec singulai-db pg_dump -U singulai > $BACKUP_DIR/db_$DATE.sql

# Backup Redis
docker exec singulai-cache redis-cli save
cp /opt/singulai/data/redis/dump.rdb $BACKUP_DIR/redis_$DATE.rdb

# Backup Ethereum node data (opcional)
tar -czf $BACKUP_DIR/eth_$DATE.tar.gz /opt/singulai/data/ethereum

# Limpar backups antigos (manter últimos 7 dias)
find $BACKUP_DIR -type f -mtime +7 -delete
```

### Monitoramento Script
```bash
#!/bin/bash
# /opt/singulai/scripts/monitor.sh

# Verificar serviços
services=("geth-node" "singulai-db" "singulai-cache" "singulai-prometheus" "singulai-grafana")

for service in "${services[@]}"
do
    if ! docker ps | grep -q $service; then
        echo "ALERTA: $service não está rodando"
        # Adicionar lógica de notificação (e.g., enviar email)
    fi
done

# Verificar uso de disco
DISK_USAGE=$(df -h / | awk 'NR==2 {print $5}' | sed 's/%//')
if [ $DISK_USAGE -gt 80 ]; then
    echo "ALERTA: Uso de disco acima de 80%"
fi

# Verificar uso de memória
MEM_USAGE=$(free | awk '/Mem/{printf("%.2f"), $3/$2*100}')
if [ ${MEM_USAGE%.*} -gt 90 ]; then
    echo "ALERTA: Uso de memória acima de 90%"
fi
```

## 10. NGINX Configuration

```nginx
# /etc/nginx/sites-available/singulai
server {
    listen 80;
    server_name seu-dominio.com;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## 11. Monitoramento com Prometheus/Grafana

### Prometheus Config
```yaml
# /opt/singulai/data/prometheus/prometheus.yml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'node'
    static_configs:
      - targets: ['localhost:9100']
  
  - job_name: 'api'
    static_configs:
      - targets: ['localhost:3001']
```

### Grafana Dashboards
- Node Exporter Full
- Ethereum Node Metrics
- API Performance Metrics
- System Resource Usage

## 12. Procedimentos de Deploy

### Deploy de Contratos
```bash
# /opt/singulai/scripts/deploy-contracts.sh
cd /opt/singulai/apps/contracts
npm install
npx hardhat run scripts/deploy.js --network mainnet
```

### Deploy de API
```bash
# /opt/singulai/scripts/deploy-api.sh
cd /opt/singulai/apps/api
git pull
npm install
pm2 restart api
```

## 13. Verificações Pós-Setup

- [ ] Teste de conectividade SSH
- [ ] Verificação de firewalls
- [ ] Teste de SSL/TLS
- [ ] Verificação de backups
- [ ] Teste de monitoramento
- [ ] Verificação de logs
- [ ] Teste de deploy
- [ ] Verificação de performance

## 14. Manutenção Regular

1. **Diária**
   - Verificar logs
   - Monitorar recursos
   - Backup de dados

2. **Semanal**
   - Atualizar dependências
   - Verificar segurança
   - Limpar dados temporários

3. **Mensal**
   - Atualizar sistema
   - Verificar certificados
   - Teste de recuperação

## 15. Contatos de Suporte

- Hostinger Support: support.hostinger.com
- Emergency Contact: [Número de emergência]
- Team Lead: [Contato]