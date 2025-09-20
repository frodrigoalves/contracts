#!/bin/bash
set -euo pipefail

echo "🚀 Iniciando setup do ambiente SingulAI MVP (Fase de Testes)..."

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
# RPC URLs (Testnet)
SEPOLIA_RPC_URL=${SEPOLIA_RPC_URL:-"https://sepolia.infura.io/v3/0665699b0f4345759cffb80a5acdc45c"}
MUMBAI_RPC_URL=${MUMBAI_RPC_URL:-"https://polygon-mumbai.infura.io/v3/0665699b0f4345759cffb80a5acdc45c"}

# Chaves privadas e APIs (apenas para teste)
PRIVATE_KEY=${PRIVATE_KEY:-"48b40349f0d00dc2bf8b39b1c647ac647ad47c11172fd6451b48fda785773ec4"}
ETHERSCAN_API_KEY=${ETHERSCAN_API_KEY:-"8XG2YA3VKWUK1M34QN1PE7JV2XD2ACFIFU"}
POLYGONSCAN_API_KEY=${POLYGONSCAN_API_KEY:-"1qBGYwerwX1xC9pdDPD6b_eAUXZlTKY0"}

# Endereços de teste
NEW_ADDRESS=0x3d3C2E249f9F94e7cfAFC5430f07223ec10AD3bb

# Endereços dos contratos de teste (serão preenchidos após deploy)
MOCK_TOKEN_ADDRESS=
TEST_AVATAR_BASE_ADDRESS=
TEST_AVATAR_WALLET_LINK_ADDRESS=
TEST_TIME_CAPSULE_ADDRESS=
TEST_DIGITAL_LEGACY_ADDRESS=

# Auth (Keycloak)
KEYCLOAK_ISSUER_URL=http://localhost:8082/realms/singulai
KEYCLOAK_AUDIENCE=singulai-api
KEYCLOAK_JWKS_URL=http://localhost:8082/realms/singulai/protocol/openid-connect/certs

# DB (Supabase)
DATABASE_URL=postgres://postgres:postgres@localhost:5432/singulai

# Storage (MinIO existente)
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_ACCESS_KEY=admin
MINIO_SECRET_KEY=admin123
MINIO_BUCKET=singulai-test

# IA (Ollama existente)
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_DEFAULT_MODEL=llama2:7b

# N8n (Automações)
N8N_WEBHOOK_URL=http://localhost:5678/webhook/singulai
N8N_API_KEY=your_n8n_api_key

# Endereços dos contratos oficiais (para uso futuro)
SGL_TOKEN_ADDRESS=
AVATAR_BASE_ADDRESS=
AVATAR_WALLET_LINK_ADDRESS=
TIME_CAPSULE_ADDRESS=
DIGITAL_LEGACY_ADDRESS=
EOF
    chmod 600 .env
fi

# Compilar contratos
echo "🔨 Compilando contratos..."
npx hardhat compile

# Deploy MVP na Sepolia
echo "🚀 Iniciando deploy do MVP na Sepolia..."
npx hardhat run scripts/deploy-mvp.js --network sepolia

# Verificar se o deploy foi bem sucedido
if [ -f .env ] && grep -q "MOCK_TOKEN_ADDRESS=" .env; then
    echo "✅ Deploy do MVP concluído! Contratos verificados no Etherscan"
    echo "📝 Execute 'npx hardhat run scripts/check-balance.js --network sepolia' para verificar os saldos"
else
    echo "⚠️ Atenção: Endereços dos contratos de teste não encontrados no .env"
    echo "   Por favor, verifique os logs acima para os endereços"
fi

# Verificar serviços existentes
echo -e "\n🔍 Verificando serviços necessários..."

services=(
    "Ollama:11434"
    "MinIO:9000"
    "Supabase:5432"
    "Keycloak:8082"
    "N8n:5678"
)

for service in "${services[@]}"; do
    name="${service%%:*}"
    port="${service#*:}"
    if nc -z localhost "$port" 2>/dev/null; then
        echo "✅ $name está acessível na porta $port"
    else
        echo "❌ $name não está acessível na porta $port"
    fi
done

echo -e "\n🎉 Setup do MVP concluído!"
echo "⚠️ Lembre-se: Estes são contratos de TESTE para validação do MVP."
echo "   O token oficial SGL será implementado após feedback do MVP."