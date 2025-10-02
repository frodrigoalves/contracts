#!/bin/bash

# ============================================================================
# SingulAI MVP - Script de Deploy para VPS
# ============================================================================

set -e

# Configurações
VPS_IP=${VPS_IP:-"your_vps_ip"}
VPS_USER=${VPS_USER:-"root"}
APP_NAME="singulai-mvp"
APP_DIR="/var/www/$APP_NAME"
DOMAIN=${DOMAIN:-"singulai.site"}

echo "🚀 Iniciando deploy do SingulAI MVP para VPS..."

# Verificar se as variáveis estão definidas
if [ "$VPS_IP" = "your_vps_ip" ]; then
    echo "❌ Configure a variável VPS_IP no arquivo .env"
    exit 1
fi

# Criar arquivo temporário com os arquivos necessários
echo "📦 Preparando arquivos para upload..."
tar -czf singulai-mvp-deploy.tar.gz \
    index.js \
    package.json \
    ecosystem.config.js \
    public/ \
    .env.example \
    README.md

# Upload para VPS
echo "📤 Enviando arquivos para VPS..."
scp singulai-mvp-deploy.tar.gz $VPS_USER@$VPS_IP:/tmp/

# Executar comandos no VPS
echo "🔧 Configurando aplicação no VPS..."
ssh $VPS_USER@$VPS_IP << 'ENDSSH'
# Atualizar sistema
apt update && apt upgrade -y

# Instalar Node.js 18, nginx, PM2 e certificados SSL
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt install -y nodejs nginx certbot python3-certbot-nginx sqlite3

# Instalar PM2 globalmente
npm install -g pm2

# Criar diretório da aplicação
mkdir -p /var/www/singulai-mvp
cd /var/www/singulai-mvp

# Extrair arquivos
tar -xzf /tmp/singulai-mvp-deploy.tar.gz

# Instalar dependências
npm install

# Configurar ambiente de produção
cp .env.example .env
echo "PORT=3000" >> .env
echo "NODE_ENV=production" >> .env

# Configurar permissões
chown -R www-data:www-data /var/www/singulai-mvp
chmod -R 755 /var/www/singulai-mvp

echo "✅ Aplicação configurada com sucesso!"
ENDSSH

# Configurar Nginx
echo "🌐 Configurando Nginx..."
ssh $VPS_USER@$VPS_IP << ENDSSH
# Criar configuração do Nginx
cat > /etc/nginx/sites-available/$DOMAIN << 'EOF'
server {
    listen 80;
    server_name $DOMAIN www.$DOMAIN;
    
    # Redirecionar para HTTPS
    return 301 https://\$server_name\$request_uri;
}

server {
    listen 443 ssl http2;
    server_name $DOMAIN www.$DOMAIN;
    
    # Logs
    access_log /var/log/nginx/${DOMAIN}.access.log;
    error_log /var/log/nginx/${DOMAIN}.error.log;
    
    # SSL (será configurado pelo Certbot)
    ssl_certificate /etc/letsencrypt/live/$DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;
    
    # Configurações SSL modernas
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;
    ssl_prefer_server_ciphers off;
    
    # Headers de segurança
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;
    
    # Proxy para aplicação Node.js
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
        
        # Timeout configurations
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
    
    # Cache para arquivos estáticos
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
EOF

# Ativar site
ln -sf /etc/nginx/sites-available/$DOMAIN /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Testar configuração do Nginx
nginx -t
ENDSSH

# Iniciar aplicação com PM2
echo "🚀 Iniciando aplicação com PM2..."
ssh $VPS_USER@$VPS_IP << 'ENDSSH'
cd /var/www/singulai-mvp

# Iniciar com PM2
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup

# Reiniciar nginx
systemctl restart nginx
systemctl enable nginx

echo "✅ Aplicação iniciada com PM2!"
ENDSSH

# Configurar SSL com Let's Encrypt
echo "🔒 Configurando SSL com Let's Encrypt..."
ssh $VPS_USER@$VPS_IP << ENDSSH
# Obter certificado SSL
certbot --nginx -d $DOMAIN -d www.$DOMAIN --non-interactive --agree-tos --email admin@$DOMAIN

# Configurar renovação automática
(crontab -l 2>/dev/null; echo "0 12 * * * /usr/bin/certbot renew --quiet") | crontab -

echo "🔒 SSL configurado com sucesso!"
ENDSSH

# Limpar arquivos temporários
rm singulai-mvp-deploy.tar.gz

echo ""
echo "🎉 Deploy concluído com sucesso!"
echo ""
echo "📍 Sua aplicação está rodando em:"
echo "   https://$DOMAIN"
echo "   https://www.$DOMAIN"
echo ""
echo "📊 Para monitorar a aplicação:"
echo "   ssh $VPS_USER@$VPS_IP"
echo "   pm2 status"
echo "   pm2 logs"
echo ""
echo "🔧 Para atualizar a aplicação:"
echo "   ./update-vps.sh"
echo ""