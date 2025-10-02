#!/bin/bash

# ============================================================================
# SingulAI MVP - Script de Atualização para VPS
# ============================================================================

set -e

# Configurações
VPS_IP=${VPS_IP:-"your_vps_ip"}
VPS_USER=${VPS_USER:-"root"}
APP_NAME="singulai-mvp"
APP_DIR="/var/www/$APP_NAME"

echo "🔄 Atualizando SingulAI MVP na VPS..."

# Verificar se as variáveis estão definidas
if [ "$VPS_IP" = "your_vps_ip" ]; then
    echo "❌ Configure a variável VPS_IP no arquivo .env"
    exit 1
fi

# Criar backup da aplicação atual
echo "💾 Criando backup..."
ssh $VPS_USER@$VPS_IP << 'ENDSSH'
cd /var/www
if [ -d "singulai-mvp" ]; then
    cp -r singulai-mvp singulai-mvp-backup-$(date +%Y%m%d_%H%M%S)
    echo "✅ Backup criado"
fi
ENDSSH

# Preparar arquivos atualizados
echo "📦 Preparando arquivos atualizados..."
tar -czf singulai-mvp-update.tar.gz \
    index.js \
    package.json \
    ecosystem.config.js \
    public/ \
    README.md

# Upload para VPS
echo "📤 Enviando arquivos atualizados..."
scp singulai-mvp-update.tar.gz $VPS_USER@$VPS_IP:/tmp/

# Atualizar aplicação no VPS
echo "🔧 Atualizando aplicação..."
ssh $VPS_USER@$VPS_IP << 'ENDSSH'
cd /var/www/singulai-mvp

# Parar aplicação
pm2 stop ecosystem.config.js

# Fazer backup do .env e banco de dados
cp .env .env.backup
cp singulai_mvp.sqlite singulai_mvp.sqlite.backup 2>/dev/null || true

# Extrair arquivos atualizados
tar -xzf /tmp/singulai-mvp-update.tar.gz

# Restaurar configurações
mv .env.backup .env
mv singulai_mvp.sqlite.backup singulai_mvp.sqlite 2>/dev/null || true

# Atualizar dependências
npm install

# Reconfigurar permissões
chown -R www-data:www-data /var/www/singulai-mvp
chmod -R 755 /var/www/singulai-mvp

# Reiniciar aplicação
pm2 reload ecosystem.config.js --env production

echo "✅ Aplicação atualizada com sucesso!"
ENDSSH

# Limpar arquivos temporários
rm singulai-mvp-update.tar.gz

echo ""
echo "🎉 Atualização concluída!"
echo ""
echo "📊 Status da aplicação:"
ssh $VPS_USER@$VPS_IP "pm2 status"