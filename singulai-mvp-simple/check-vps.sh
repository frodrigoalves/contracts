#!/bin/bash

# ============================================================================
# SingulAI MVP - Verificação Pré-Deploy
# ============================================================================

VPS_IP="72.60.147.56"
VPS_USER="root"

echo "🔍 Verificação pré-deploy - Hostinger VPS"
echo "=========================================="
echo ""

# 1. Testar conectividade
echo "1️⃣  Testando conectividade..."
if curl -s --connect-timeout 5 http://$VPS_IP > /dev/null; then
    echo "✅ VPS acessível via HTTP"
else
    echo "❌ VPS não acessível via HTTP"
fi

# 2. Testar SSH
echo ""
echo "2️⃣  Testando SSH..."
if ssh -i ~/.ssh/id_ed25519 -o ConnectTimeout=10 -o StrictHostKeyChecking=no $VPS_USER@$VPS_IP "echo 'SSH OK'" 2>/dev/null; then
    echo "✅ SSH funcionando"
else
    echo "❌ SSH não funciona - configure a chave primeiro"
    echo "💡 Execute: ./setup-vps-hostinger.sh"
    exit 1
fi

# 3. Verificar sistema
echo ""
echo "3️⃣  Verificando sistema..."
ssh -i ~/.ssh/id_ed25519 $VPS_USER@$VPS_IP << 'ENDSSH'
echo "📊 Sistema:"
echo "OS: $(lsb_release -d 2>/dev/null | cut -f2 || echo 'Ubuntu/Debian')"
echo "Kernel: $(uname -r)"
echo "Uptime: $(uptime -p 2>/dev/null || uptime)"

echo ""
echo "💾 Recursos:"
df -h / | tail -1 | awk '{print "Disk: " $3 "/" $2 " (" $5 " usado)"}'
free -h | grep Mem | awk '{print "RAM: " $3 "/" $2 " usado"}'

echo ""
echo "🔄 Status de updates:"
if [ -f /var/run/reboot-required ]; then
    echo "⚠️  REBOOT NECESSÁRIO (kernel update pendente)"
    echo "Arquivo: $(cat /var/run/reboot-required 2>/dev/null || echo 'Kernel update')"
else
    echo "✅ Sem reboot pendente"
fi

echo ""
echo "📦 Software instalado:"
which node 2>/dev/null && echo "✅ Node.js: $(node --version)" || echo "❌ Node.js"
which nginx 2>/dev/null && echo "✅ Nginx: $(nginx -v 2>&1 | cut -d' ' -f3)" || echo "❌ Nginx"
which pm2 2>/dev/null && echo "✅ PM2: $(pm2 --version)" || echo "❌ PM2"
which sqlite3 2>/dev/null && echo "✅ SQLite: $(sqlite3 --version | cut -d' ' -f1)" || echo "❌ SQLite"

echo ""
echo "🌐 Portas em uso:"
netstat -tlnp 2>/dev/null | grep ':80 \|:443 \|:3000' || echo "Nenhuma porta web ocupada"
ENDSSH

echo ""
echo "=========================================="
echo "4️⃣  Recomendações:"
echo ""

# Verificar se precisa reboot
NEEDS_REBOOT=$(ssh -i ~/.ssh/id_ed25519 $VPS_USER@$VPS_IP "[ -f /var/run/reboot-required ] && echo 'yes' || echo 'no'")

if [ "$NEEDS_REBOOT" = "yes" ]; then
    echo "⚠️  AÇÃO REQUERIDA: Kernel update pendente"
    echo ""
    echo "Opções:"
    echo "• ./deploy-with-reboot.sh  # Deploy com reboot automático"
    echo "• ssh root@$VPS_IP 'reboot' && sleep 120  # Reiniciar manualmente"
    echo ""
else
    echo "✅ Sistema pronto para deploy"
    echo ""
    echo "Execute:"
    echo "• ./deploy-vps.sh  # Deploy normal"
    echo ""
fi

echo "🔧 Se precisar configurar SSH:"
echo "• ./setup-vps-hostinger.sh"
echo ""