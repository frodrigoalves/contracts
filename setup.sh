#!/bin/bash
set -euo pipefail

echo "🚀 Iniciando setup do ambiente SingulAI MVP..."

# Verificar Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js não encontrado. Por favor, instale o Node.js v18 ou superior"
    exit 1
fi

# Instalar dependências
echo "📦 Instalando dependências..."
npm install

# Configurar variáveis de ambiente
if [ ! -f .env ]; then
    echo "🔑 Criando arquivo .env..."
    cat > .env << EOF
SEPOLIA_RPC_URL=${SEPOLIA_RPC_URL:-"https://sepolia.infura.io/v3/0665699b0f4345759cffb80a5acdc45c"}
MUMBAI_RPC_URL=${MUMBAI_RPC_URL:-"https://polygon-mumbai.infura.io/v3/0665699b0f4345759cffb80a5acdc45c"}
PRIVATE_KEY=${PRIVATE_KEY:-"48b40349f0d00dc2bf8b39b1c647ac647ad47c11172fd6451b48fda785773ec4"}
ETHERSCAN_API_KEY=${ETHERSCAN_API_KEY:-"8XG2YA3VKWUK1M34QN1PE7JV2XD2ACFIFU"}
POLYGONSCAN_API_KEY=${POLYGONSCAN_API_KEY:-"1qBGYwerwX1xC9pdDPD6b_eAUXZlTKY0"}
CONTRACT_ADDRESS=
NEW_ADDRESS=0x3d3C2E249f9F94e7cfAFC5430f07223ec10AD3bb
TOKEN_ADDRESS=
EOF
    chmod 600 .env
fi

# Compilar contratos
echo "🔨 Compilando contratos..."
npx hardhat compile

# Deploy na Sepolia
echo "🚀 Iniciando deploy na Sepolia..."
npx hardhat run scripts/deploy-and-verify.js --network sepolia

# Verificar se o deploy foi bem sucedido
if [ -f .env ] && grep -q "CONTRACT_ADDRESS=" .env; then
    echo "✅ Deploy concluído! Contrato verificado no Etherscan"
    echo "📝 Execute 'npx hardhat run scripts/check-balance.js --network sepolia' para verificar os saldos"
else
    echo "⚠️ Atenção: CONTRACT_ADDRESS não encontrado no .env"
    echo "   Por favor, atualize manualmente após o deploy"
fi

echo "🎉 Setup concluído!"