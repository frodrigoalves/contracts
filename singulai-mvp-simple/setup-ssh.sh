#!/bin/bash

# ============================================================================
# SingulAI MVP - Configuração SSH para Deploy VPS
# ============================================================================

echo "🔑 Configurando SSH para deploy na VPS..."

# Verificar se a chave privada existe
if [ ! -f ~/.ssh/id_ed25519 ]; then
    echo "❌ Chave privada não encontrada em ~/.ssh/id_ed25519"
    echo "📝 Instruções para configurar a chave:"
    echo ""
    echo "1. Criar a chave privada correspondente à sua chave pública:"
    echo "   ssh-keygen -t ed25519 -C 'f.rodrigoalves12@gmail.com'"
    echo ""
    echo "2. Ou se você já tem a chave privada, copiá-la para ~/.ssh/id_ed25519"
    echo ""
    echo "3. Configurar permissões:"
    echo "   chmod 600 ~/.ssh/id_ed25519"
    echo "   chmod 644 ~/.ssh/id_ed25519.pub"
    echo ""
    exit 1
fi

# Verificar permissões da chave
chmod 600 ~/.ssh/id_ed25519
chmod 644 ~/.ssh/id_ed25519.pub 2>/dev/null || true

# Configurar SSH config se não existir
if [ ! -f ~/.ssh/config ]; then
    echo "📝 Criando arquivo ~/.ssh/config..."
    cp ssh-config ~/.ssh/config
    chmod 600 ~/.ssh/config
    echo "✅ Arquivo ~/.ssh/config criado"
else
    echo "📁 Arquivo ~/.ssh/config já existe"
    echo "💡 Para adicionar configuração da VPS, anexe o conteúdo de ssh-config"
fi

# Verificar se podemos ler a chave pública
if [ -f ~/.ssh/id_ed25519.pub ]; then
    echo ""
    echo "🔑 Sua chave pública SSH:"
    cat ~/.ssh/id_ed25519.pub
    echo ""
    echo "📋 Esta chave deve estar autorizada na VPS em ~/.ssh/authorized_keys"
else
    echo "📝 Criando chave pública a partir da privada..."
    ssh-keygen -y -f ~/.ssh/id_ed25519 > ~/.ssh/id_ed25519.pub
    chmod 644 ~/.ssh/id_ed25519.pub
    echo "✅ Chave pública criada"
fi

echo ""
echo "✅ Configuração SSH concluída!"
echo ""
echo "🚀 Próximos passos:"
echo "1. Configure o IP da VPS no arquivo .env:"
echo "   VPS_IP=SEU_IP_AQUI"
echo ""
echo "2. Certifique-se de que sua chave pública está na VPS:"
echo "   ssh-copy-id -i ~/.ssh/id_ed25519.pub root@SEU_IP"
echo ""
echo "3. Execute o deploy:"
echo "   ./deploy-vps.sh"
echo ""