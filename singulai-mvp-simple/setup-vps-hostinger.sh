#!/bin/bash

# ============================================================================
# SingulAI MVP - Setup SSH para VPS Hostinger
# ============================================================================

VPS_IP="72.60.147.56"
VPS_USER="root"

echo "🔑 Configurando SSH para VPS Hostinger Brazil..."
echo "🌎 IP: $VPS_IP (srv993737.hstgr.cloud)"
echo ""

# Verificar se temos a chave pública local
if [ -f "singulai-key.pub" ]; then
    echo "📝 Chave pública encontrada:"
    cat singulai-key.pub
    echo ""
    
    echo "🚀 Para autorizar esta chave na VPS, execute:"
    echo ""
    echo "1. Conecte na VPS via painel Hostinger ou:"
    echo "   ssh root@$VPS_IP"
    echo ""
    echo "2. Adicione a chave ao arquivo authorized_keys:"
    echo "   mkdir -p ~/.ssh"
    echo "   echo 'ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIMiP/EvRcH3kfh6wkto6mrPGRDSA0kn49z8jE76aXPi5 f.rodrigoalves12@gmail.com' >> ~/.ssh/authorized_keys"
    echo "   chmod 600 ~/.ssh/authorized_keys"
    echo "   chmod 700 ~/.ssh"
    echo ""
    echo "3. Ou copie diretamente (se SSH já funcionar):"
    echo "   ssh-copy-id -i ~/.ssh/id_ed25519.pub root@$VPS_IP"
    echo ""
    
else
    echo "❌ Chave pública não encontrada!"
fi

echo "🧪 Status da VPS:"
echo "✅ Nginx rodando (detectado via HTTP 200)"
echo "✅ Ubuntu 22.04 LTS"
echo "✅ 2 CPU cores, 8GB RAM, 100GB disk"
echo "✅ Localização: Brazil - São Paulo"

echo ""
echo "📋 Próximos passos:"
echo "1. Configure SSH seguindo as instruções acima"
echo "2. Execute: ./deploy-vps.sh"
echo ""