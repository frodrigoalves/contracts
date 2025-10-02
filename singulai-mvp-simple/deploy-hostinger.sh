#!/bin/bash

# ============================================================================
# SingulAI MVP - Deploy Adaptado para VPS Hostinger com Setup Existente
# ============================================================================

set -e

VPS_IP=${VPS_IP:-"72.60.147.56"}
VPS_USER=${VPS_USER:-"root"}
DOMAIN=${DOMAIN:-"singulai.site"}
APP_NAME="singulai-mvp"

echo "🚀 Deploy SingulAI MVP - Adaptado para setup existente..."
echo "🌐 VPS: $VPS_IP ($VPS_USER@srv993737.hstgr.cloud)"

# Verificar conectividade
echo "🔍 Testando conectividade..."
if ! ssh -i ~/.ssh/id_ed25519 -o ConnectTimeout=10 $VPS_USER@$VPS_IP "echo 'SSH OK'" 2>/dev/null; then
    echo "❌ SSH não funciona. Execute primeiro:"
    echo "   ./setup-vps-hostinger.sh"
    exit 1
fi

# Preparar arquivos para upload
echo "📦 Preparando arquivos para upload..."
tar -czf singulai-mvp.tar.gz \
    index.js \
    package.json \
    ecosystem.config.js \
    public/ \
    .env.example \
    README.md \
    DEPLOY.md

# Upload para VPS
echo "📤 Enviando arquivos para VPS..."
scp -i ~/.ssh/id_ed25519 singulai-mvp.tar.gz $VPS_USER@$VPS_IP:/tmp/

# Deploy na VPS
echo "🔧 Fazendo deploy na VPS..."
ssh -i ~/.ssh/id_ed25519 $VPS_USER@$VPS_IP << 'ENDSSH'

echo "🔍 Detectando ambiente existente..."

# Verificar se há PostgreSQL rodando
if systemctl is-active --quiet postgresql 2>/dev/null; then
    echo "✅ PostgreSQL detectado - adaptando para usar SQLite também"
    DB_MODE="mixed"
else
    echo "📦 Usando SQLite como banco principal"
    DB_MODE="sqlite"
fi

# Verificar Node.js
if command -v node &> /dev/null; then
    echo "✅ Node.js $(node --version) detectado"
else
    echo "❌ Node.js não encontrado"
    exit 1
fi

# Verificar PM2
if command -v pm2 &> /dev/null; then
    echo "✅ PM2 $(pm2 --version) detectado"
else
    echo "📦 Instalando PM2..."
    npm install -g pm2
fi

# Configurar diretório da aplicação
APP_DIR="/var/www/singulai-mvp"
mkdir -p $APP_DIR
cd $APP_DIR

# Backup de configurações existentes
if [ -f .env ]; then
    echo "💾 Fazendo backup de .env existente"
    cp .env .env.backup.$(date +%Y%m%d_%H%M%S)
fi

# Parar aplicação existente
echo "⏹️  Parando aplicação existente..."
pm2 stop singulai-mvp 2>/dev/null || true
pm2 delete singulai-mvp 2>/dev/null || true

# Extrair novos arquivos
echo "📂 Extraindo arquivos da aplicação..."
tar -xzf /tmp/singulai-mvp.tar.gz -C $APP_DIR

# Configurar ambiente
echo "⚙️  Configurando ambiente..."
if [ ! -f .env ]; then
    cp .env.example .env
    echo "PORT=3000" >> .env
    echo "NODE_ENV=production" >> .env
    echo "DOMAIN=singulai.site" >> .env
fi

# Instalar dependências
echo "📦 Instalando dependências..."
npm install --production

# Configurar permissões
chown -R www-data:www-data $APP_DIR
chmod -R 755 $APP_DIR

# Iniciar aplicação com PM2
echo "🚀 Iniciando aplicação..."
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup systemd -u root --hp /root

echo "✅ Deploy concluído!"
echo "📊 Status da aplicação:"
pm2 status

ENDSSH

# Configurar Nginx se necessário
echo "🌐 Configurando Nginx..."
ssh -i ~/.ssh/id_ed25519 $VPS_USER@$VPS_IP << ENDSSH

# Verificar se já há configuração do Nginx
if [ -f "/etc/nginx/sites-available/$DOMAIN" ]; then
    echo "✅ Configuração Nginx para $DOMAIN já existe"
else
    echo "🔧 Criando configuração Nginx..."
    
    # Criar configuração básica
    cat > /etc/nginx/sites-available/$DOMAIN << 'EOF'
server {
    listen 80;
    server_name singulai.site www.singulai.site;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
    
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
EOF
    
    # Ativar site
    ln -sf /etc/nginx/sites-available/$DOMAIN /etc/nginx/sites-enabled/
    
    # Testar e recarregar Nginx
    nginx -t && systemctl reload nginx
    
    echo "✅ Nginx configurado"
fi

ENDSSH

# Limpar arquivos temporários
rm singulai-mvp.tar.gz

echo ""
echo "🎉 Deploy concluído com sucesso!"
echo ""
echo "🌐 Acesse sua aplicação em:"
echo "   http://singulai.site"
echo "   http://www.singulai.site"
echo ""
echo "📊 Para monitorar:"
echo "   ssh -i ~/.ssh/id_ed25519 root@$VPS_IP"
echo "   pm2 status"
echo "   pm2 logs singulai-mvp"
echo ""
echo "🔒 Para configurar SSL:"
echo "   ssh -i ~/.ssh/id_ed25519 root@$VPS_IP"
echo "   certbot --nginx -d singulai.site -d www.singulai.site"
echo ""