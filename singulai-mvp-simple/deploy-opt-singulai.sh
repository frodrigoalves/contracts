#!/bin/bash

# ============================================================================
# SingulAI MVP - Deploy para estrutura /opt/singulai/ existente
# ============================================================================

set -e

VPS_IP=${VPS_IP:-"72.60.147.56"}
VPS_USER=${VPS_USER:-"root"}
DOMAIN=${DOMAIN:-"singulai.site"}

echo "🚀 Deploy SingulAI MVP para estrutura /opt/singulai/ existente"
echo "🔍 Detectado: Node.js 20.19.5, PM2, PostgreSQL já configurados"
echo ""

# Verificar SSH
if ! ssh -i ~/.ssh/id_ed25519 -o ConnectTimeout=10 $VPS_USER@$VPS_IP "echo 'SSH OK'" 2>/dev/null; then
    echo "❌ SSH não funciona. Configure primeiro:"
    echo "   ./setup-vps-hostinger.sh"
    exit 1
fi

# Preparar arquivos para backend
echo "📦 Preparando arquivos do backend..."
tar -czf singulai-backend.tar.gz \
    index.js \
    package.json \
    ecosystem.config.js \
    .env.example \
    README.md

# Preparar arquivos do frontend
echo "📦 Preparando arquivos do frontend..."
tar -czf singulai-frontend.tar.gz \
    public/ \
    DEPLOY.md

# Upload para VPS
echo "📤 Enviando arquivos para VPS..."
scp -i ~/.ssh/id_ed25519 singulai-backend.tar.gz $VPS_USER@$VPS_IP:/tmp/
scp -i ~/.ssh/id_ed25519 singulai-frontend.tar.gz $VPS_USER@$VPS_IP:/tmp/

# Deploy na estrutura existente
echo "🔧 Fazendo deploy na estrutura /opt/singulai/..."
ssh -i ~/.ssh/id_ed25519 $VPS_USER@$VPS_IP << 'ENDSSH'

echo "📂 Configurando estrutura /opt/singulai/..."

# Verificar se os diretórios existem
if [ ! -d "/opt/singulai" ]; then
    echo "❌ Diretório /opt/singulai não encontrado!"
    exit 1
fi

# Backup de arquivos existentes
if [ -d "/opt/singulai/backend" ] && [ "$(ls -A /opt/singulai/backend)" ]; then
    echo "💾 Fazendo backup do backend existente..."
    cp -r /opt/singulai/backend /opt/singulai/backend.backup.$(date +%Y%m%d_%H%M%S)
fi

# Extrair backend
echo "📂 Extraindo arquivos do backend..."
mkdir -p /opt/singulai/backend
cd /opt/singulai/backend
tar -xzf /tmp/singulai-backend.tar.gz

# Extrair frontend
echo "📂 Extraindo arquivos do frontend..."
mkdir -p /opt/singulai/frontend
cd /opt/singulai/frontend
tar -xzf /tmp/singulai-frontend.tar.gz

# Configurar backend
echo "⚙️  Configurando backend..."
cd /opt/singulai/backend

# Configurar .env se não existir
if [ ! -f .env ]; then
    cp .env.example .env
    cat >> .env << 'EOF'

# Production Configuration
NODE_ENV=production
PORT=3000
DOMAIN=singulai.site

# Database Configuration
DB_PATH=./singulai_mvp.sqlite

# Blockchain Configuration (Sepolia)
SGL_TOKEN_ADDRESS=0xF281a68ae5Baf227bADC1245AC5F9B2F53b7EDe1
FAUCET_ADDRESS=0x83a7DEF4072487738979b1aa0816044B533CF2aE
EOF
    echo "✅ Arquivo .env criado"
else
    echo "✅ Arquivo .env já existe"
fi

# Instalar dependências do backend
echo "📦 Instalando dependências do backend..."
npm install --production

# Parar processos existentes
echo "⏹️  Parando processos existentes..."
pm2 stop singulai-mvp 2>/dev/null || true
pm2 delete singulai-mvp 2>/dev/null || true

# Configurar permissões
chown -R www-data:www-data /opt/singulai/ 2>/dev/null || true
chmod -R 755 /opt/singulai/

# Iniciar aplicação
echo "🚀 Iniciando aplicação SingulAI..."
cd /opt/singulai/backend
pm2 start ecosystem.config.js --name singulai-mvp --env production
pm2 save

# Verificar status
echo "📊 Status da aplicação:"
pm2 status
pm2 logs singulai-mvp --lines 10

echo ""
echo "✅ Deploy concluído!"
echo "📂 Backend: /opt/singulai/backend/"
echo "📂 Frontend: /opt/singulai/frontend/"
echo "🌐 Aplicação rodando na porta 3000"

ENDSSH

# Configurar Nginx proxy
echo "🌐 Configurando Nginx..."
ssh -i ~/.ssh/id_ed25519 $VPS_USER@$VPS_IP << 'ENDSSH'

# Verificar se Nginx está instalado
if ! command -v nginx &> /dev/null; then
    echo "📦 Instalando Nginx..."
    apt update && apt install -y nginx
fi

# Configurar proxy para SingulAI
if [ ! -f "/etc/nginx/sites-available/singulai.site" ]; then
    echo "🔧 Criando configuração Nginx para singulai.site..."
    
    cat > /etc/nginx/sites-available/singulai.site << 'EOF'
server {
    listen 80;
    server_name singulai.site www.singulai.site;
    
    # Logs
    access_log /var/log/nginx/singulai.site.access.log;
    error_log /var/log/nginx/singulai.site.error.log;
    
    # Proxy para aplicação Node.js
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeout
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
    
    # Cache para arquivos estáticos
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        root /opt/singulai/frontend;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # Headers de segurança
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
}
EOF
    
    # Ativar site
    ln -sf /etc/nginx/sites-available/singulai.site /etc/nginx/sites-enabled/
    
    # Remover configuração padrão se existir
    rm -f /etc/nginx/sites-enabled/default
    
    # Testar configuração
    if nginx -t; then
        systemctl reload nginx
        echo "✅ Nginx configurado e recarregado"
    else
        echo "❌ Erro na configuração do Nginx"
        exit 1
    fi
else
    echo "✅ Configuração Nginx já existe"
fi

ENDSSH

# Limpar arquivos temporários
rm singulai-backend.tar.gz singulai-frontend.tar.gz

echo ""
echo "🎉 Deploy concluído com sucesso!"
echo ""
echo "📍 Estrutura criada:"
echo "   📂 Backend: /opt/singulai/backend/ (Node.js + SQLite)"
echo "   📂 Frontend: /opt/singulai/frontend/ (arquivos estáticos)"
echo "   🔧 PM2: singulai-mvp rodando na porta 3000"
echo "   🌐 Nginx: proxy reverso configurado"
echo ""
echo "🌐 Acesse sua aplicação:"
echo "   http://singulai.site"
echo "   http://www.singulai.site"
echo "   http://$VPS_IP"
echo ""
echo "📊 Para monitorar:"
echo "   ssh -i ~/.ssh/id_ed25519 root@$VPS_IP"
echo "   pm2 status"
echo "   pm2 logs singulai-mvp"
echo ""
echo "🔒 Para configurar SSL (recomendado):"
echo "   ssh -i ~/.ssh/id_ed25519 root@$VPS_IP"
echo "   apt install certbot python3-certbot-nginx"
echo "   certbot --nginx -d singulai.site -d www.singulai.site"
echo ""