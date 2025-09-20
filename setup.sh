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
KEYCLOAK_ISSUER_URL=https://id.singulai.site/realms/singulai
KEYCLOAK_AUDIENCE=singulai-api
KEYCLOAK_JWKS_URL=https://id.singulai.site/realms/singulai/protocol/openid-connect/certs

# DB (Supabase)
SUPABASE_URL=https://sb.singulai.site
SUPABASE_API_KEY=your_supabase_api_key
SUPABASE_DB_URL=postgres://postgres:postgres@localhost:5432/singulai

# Storage (MinIO)
MINIO_ENDPOINT=mi.singulai.site
MINIO_PORT=443
MINIO_USE_SSL=true
MINIO_ACCESS_KEY=admin
MINIO_SECRET_KEY=admin123
MINIO_BUCKET=singulai-test

# IA (Ollama)
OLLAMA_BASE_URL=https://ol.singulai.site
OLLAMA_DEFAULT_MODEL=llama2:7b

# CMS (Directus)
DIRECTUS_URL=https://cm.singulai.site
DIRECTUS_API_KEY=your_directus_api_key

# Automação (n8n)
N8N_WEBHOOK_URL=https://n8.singulai.site/webhook/singulai
N8N_API_KEY=your_n8n_api_key

# Chatbot (Typebot)
TYPEBOT_URL=https://tb.singulai.site
TYPEBOT_API_KEY=your_typebot_api_key

# Eventos (Webhook Server)
EVENT_WEBHOOK_URL=https://ev.singulai.site/webhook
EVENT_API_KEY=your_event_api_key

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

# Verificar serviços necessários
echo -e "\n🔍 Verificando serviços..."

declare -A services=(
    ["Keycloak"]="id.singulai.site"
    ["MinIO"]="mi.singulai.site"
    ["Supabase"]="sb.singulai.site"
    ["Ollama"]="ol.singulai.site"
    ["n8n"]="n8.singulai.site"
    ["Directus"]="cm.singulai.site"
    ["Typebot"]="tb.singulai.site"
    ["Events"]="ev.singulai.site"
)

for service in "${!services[@]}"; do
    domain="${services[$service]}"
    if curl -s -o /dev/null -w "%{http_code}" "https://$domain" | grep -q "^[23]"; then
        echo "✅ $service está acessível em $domain"
    else
        echo "❌ $service não está acessível em $domain"
    fi
done

echo -e "\n📋 Próximos passos:"
echo "1. Configure as APIs keys no arquivo .env"
echo "2. Configure o realm 'singulai' no Keycloak (id.singulai.site)"
echo "3. Crie o bucket 'singulai-test' no MinIO (mi.singulai.site)"
echo "4. Configure os webhooks no n8n (n8.singulai.site)"
echo "5. Configure o modelo do chatbot no Typebot (tb.singulai.site)"
echo "6. Prepare as coleções no Directus CMS (cm.singulai.site)"
echo "7. Configure as tabelas no Supabase (sb.singulai.site)"

echo -e "\n🎉 Setup do MVP concluído!"
echo "⚠️ Lembre-se: Estes são contratos de TESTE para validação do MVP."
echo "   O token oficial SGL será implementado após feedback do MVP."
echo -e "\nURL do Frontend: https://singulai.site"