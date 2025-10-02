#!/bin/bash

# ============================================================================
# SingulAI MVP - Deploy com Reboot para Kernel Update
# ============================================================================

set -e

VPS_IP=${VPS_IP:-"72.60.147.56"}
VPS_USER=${VPS_USER:-"root"}
DOMAIN=${DOMAIN:-"singulai.site"}

echo "🚀 Deploy SingulAI MVP com kernel update..."

# Verificar se precisa de reboot
echo "🔍 Verificando status do kernel na VPS..."
NEEDS_REBOOT=$(ssh -i ~/.ssh/id_ed25519 $VPS_USER@$VPS_IP "[ -f /var/run/reboot-required ] && echo 'yes' || echo 'no'")

if [ "$NEEDS_REBOOT" = "yes" ]; then
    echo "⚠️  Kernel update pendente detectado!"
    echo ""
    echo "📋 Opções:"
    echo "1. Fazer deploy e reiniciar automaticamente"
    echo "2. Fazer deploy sem reiniciar (pode funcionar)"
    echo "3. Reiniciar agora e fazer deploy depois"
    echo ""
    read -p "Escolha uma opção (1/2/3): " choice
    
    case $choice in
        1)
            echo "✅ Deploy com reboot automático selecionado"
            AUTO_REBOOT=true
            ;;
        2)
            echo "✅ Deploy sem reboot selecionado"
            AUTO_REBOOT=false
            ;;
        3)
            echo "🔄 Reiniciando VPS agora..."
            ssh -i ~/.ssh/id_ed25519 $VPS_USER@$VPS_IP "reboot"
            echo "⏳ Aguarde 2-3 minutos e execute o deploy novamente"
            exit 0
            ;;
        *)
            echo "❌ Opção inválida"
            exit 1
            ;;
    esac
else
    echo "✅ Sistema atualizado, sem necessidade de reboot"
    AUTO_REBOOT=false
fi

# Executar deploy normal
echo ""
echo "🚀 Iniciando deploy normal..."
./deploy-vps.sh

# Reiniciar se necessário
if [ "$AUTO_REBOOT" = "true" ]; then
    echo ""
    echo "🔄 Reiniciando VPS para aplicar kernel update..."
    ssh -i ~/.ssh/id_ed25519 $VPS_USER@$VPS_IP "reboot"
    
    echo "⏳ Aguardando VPS reiniciar (60 segundos)..."
    sleep 60
    
    # Verificar se voltou
    echo "🔍 Verificando se VPS voltou online..."
    for i in {1..12}; do
        if ssh -i ~/.ssh/id_ed25519 -o ConnectTimeout=5 $VPS_USER@$VPS_IP "echo 'VPS online'" 2>/dev/null; then
            echo "✅ VPS online novamente!"
            break
        else
            echo "⏳ Tentativa $i/12 - aguardando..."
            sleep 10
        fi
    done
    
    # Verificar status da aplicação
    echo "📊 Verificando status da aplicação..."
    ssh -i ~/.ssh/id_ed25519 $VPS_USER@$VPS_IP << 'ENDSSH'
cd /var/www/singulai-mvp
pm2 status
pm2 restart ecosystem.config.js
echo "✅ Aplicação reiniciada após reboot"
ENDSSH
fi

echo ""
echo "🎉 Deploy concluído!"
echo "🌐 Acesse: https://$DOMAIN"
echo ""