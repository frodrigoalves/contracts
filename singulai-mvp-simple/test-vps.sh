#!/bin/bash

# ============================================================================
# SingulAI MVP - Teste de Conexão VPS Hostinger Brazil
# ============================================================================

set -e

VPS_IP="72.60.147.56"
VPS_HOSTNAME="srv993737.hstgr.cloud"
VPS_USER="root"

echo "🔍 Testando conexão com VPS Hostinger Brazil..."
echo "📍 Localização: Brazil - São Paulo"
echo "🖥️  Servidor: $VPS_HOSTNAME ($VPS_IP)"
echo "👤 Usuário: $VPS_USER"
echo "💾 Specs: 2 CPU cores, 8GB RAM, 100GB disk, Ubuntu 22.04 LTS"
echo ""

# Testar ping
echo "🏓 Testando ping..."
if ping -c 4 $VPS_IP; then
    echo "✅ Ping OK"
else
    echo "❌ Ping falhou"
    exit 1
fi

echo ""

# Testar conexão SSH
echo "🔑 Testando conexão SSH..."
if ssh -i ~/.ssh/id_ed25519 -o ConnectTimeout=10 -o StrictHostKeyChecking=no $VPS_USER@$VPS_IP "echo 'SSH OK'; uname -a; uptime"; then
    echo "✅ SSH OK"
else
    echo "❌ SSH falhou"
    echo ""
    echo "🔧 Para corrigir:"
    echo "1. Certifique-se de ter a chave privada em ~/.ssh/id_ed25519"
    echo "2. Execute: ssh-copy-id -i ~/.ssh/id_ed25519.pub root@$VPS_IP"
    echo "3. Teste manualmente: ssh -i ~/.ssh/id_ed25519 root@$VPS_IP"
    exit 1
fi

echo ""

# Verificar sistema
echo "🔍 Verificando sistema na VPS..."
ssh -i ~/.ssh/id_ed25519 $VPS_USER@$VPS_IP << 'ENDSSH'
echo "📊 Informações do sistema:"
echo "OS: $(lsb_release -d | cut -f2)"
echo "Kernel: $(uname -r)"
echo "Uptime: $(uptime -p)"
echo ""
echo "💾 Uso de disco:"
df -h / | tail -1
echo ""
echo "🧠 Uso de memória:"
free -h | grep -E "(Mem|Swap)"
echo ""
echo "🔧 Pacotes essenciais instalados:"
which node 2>/dev/null && echo "✅ Node.js: $(node --version)" || echo "❌ Node.js não instalado"
which nginx 2>/dev/null && echo "✅ Nginx: $(nginx -v 2>&1)" || echo "❌ Nginx não instalado"
which pm2 2>/dev/null && echo "✅ PM2: $(pm2 --version)" || echo "❌ PM2 não instalado"
which sqlite3 2>/dev/null && echo "✅ SQLite: $(sqlite3 --version)" || echo "❌ SQLite não instalado"
ENDSSH

echo ""
echo "🎉 Teste de conexão concluído!"
echo ""
echo "🚀 Para fazer o deploy:"
echo "   ./deploy-vps.sh"
echo ""