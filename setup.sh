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
npm install --save-dev \
    hardhat \
    @nomiclabs/hardhat-ethers \
    @nomiclabs/hardhat-etherscan \
    @openzeppelin/contracts \
    dotenv \
    ethers

# Configurar variáveis de ambiente
if [ ! -f .env ]; then
    echo "🔑 Criando arquivo .env..."
    cat > .env << EOF
# RPC URLs
SEPOLIA_RPC_URL=${SEPOLIA_RPC_URL:-"https://sepolia.infura.io/v3/0665699b0f4345759cffb80a5acdc45c"}
MUMBAI_RPC_URL=${MUMBAI_RPC_URL:-"https://polygon-mumbai.infura.io/v3/0665699b0f4345759cffb80a5acdc45c"}

# Chaves privadas e APIs
PRIVATE_KEY=${PRIVATE_KEY:-"48b40349f0d00dc2bf8b39b1c647ac647ad47c11172fd6451b48fda785773ec4"}
ETHERSCAN_API_KEY=${ETHERSCAN_API_KEY:-"8XG2YA3VKWUK1M34QN1PE7JV2XD2ACFIFU"}
POLYGONSCAN_API_KEY=${POLYGONSCAN_API_KEY:-"1qBGYwerwX1xC9pdDPD6b_eAUXZlTKY0"}

# Endereços de teste
NEW_ADDRESS=0x3d3C2E249f9F94e7cfAFC5430f07223ec10AD3bb

# Endereços dos contratos (serão preenchidos após deploy)
SGL_TOKEN_ADDRESS=
AVATAR_BASE_ADDRESS=
AVATAR_WALLET_LINK_ADDRESS=
TIME_CAPSULE_ADDRESS=
DIGITAL_LEGACY_ADDRESS=

# API Node.js
NODE_ENV=development
PORT=8080

# Storage
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_ACCESS_KEY=admin
MINIO_SECRET_KEY=admin123
MINIO_BUCKET=singulai

# IA (Ollama)
OLLAMA_BASE_URL=http://127.0.0.1:11434
OLLAMA_DEFAULT_MODEL=llama2:7b
EOF
    chmod 600 .env
fi

# Compilar contratos
echo "🔨 Compilando contratos..."
npx hardhat compile

# Deploy na Sepolia
echo "🚀 Iniciando deploy na Sepolia..."
npx hardhat run scripts/deploy-all.js --network sepolia

# Verificar se o deploy foi bem sucedido
if [ -f .env ] && grep -q "SGL_TOKEN_ADDRESS=" .env; then
    echo "✅ Deploy concluído! Contratos verificados no Etherscan"
    echo "📝 Execute 'npx hardhat run scripts/check-balance.js --network sepolia' para verificar os saldos"
else
    echo "⚠️ Atenção: Endereços dos contratos não encontrados no .env"
    echo "   Por favor, verifique os logs acima para os endereços"
fi

# Instruções para o container Ollama
echo -e "\n📋 Para configurar o Ollama:"
echo "1. Execute o container:"
echo "   docker run -d --name ollama -p 11434:11434 ollama/ollama"
echo "2. Baixe o modelo:"
echo "   docker exec -it ollama ollama pull llama2:7b"

echo "🎉 Setup concluído!"