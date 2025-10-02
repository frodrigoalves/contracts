# SingulAI Contracts

Este repositório contém os contratos inteligentes do ecossistema SingulAI, incluindo tokens SGL, sistema de avatares evolutivos, dispositivos IoT, e infraestrutura institucional.

## 🚀 Contratos Deployados na Sepolia

- **SGLToken**: `0xF281a68ae5Baf227bADC1245AC5F9B2F53b7EDe1`
- **TokenFaucet**: `0x83a7DEF4072487738979b1aa0816044B533CF2aE`

## 📋 Estrutura do Projeto

### Contratos Principais
- `SGLToken.sol` - Token ERC20 com burn e controle de acesso
- `TokenFaucet.sol` - Distribuição automática de tokens para testes
- `AvatarBase.sol` / `AvatarPro.sol` - Sistema de avatares evolutivos
- `TimeCapsule.sol` - Cápsulas temporais para mensagens
- `DigitalLegacy.sol` - Herança digital

### Dispositivos IoT
- `DeviceRegistry.sol` - Registro de dispositivos
- `DeviceAuth.sol` - Autenticação de dispositivos
- `BiometricValidator.sol` - Validação biométrica
- `AccessController.sol` - Controle de acesso

### Infraestrutura Institucional
- `InstitutionalGateway.sol` - Gateway para instituições
- `ComplianceRegistry.sol` - Registro de compliance
- `ProofValidator.sol` - Validação de provas
- `OracleRegistry.sol` - Registro de oráculos

## ⚙️ Configuração

### Instalação
```bash
npm install
```

### Arquivo .env
Crie um arquivo `.env` com suas credenciais:
```
PRIVATE_KEY=0x...
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR_KEY
MUMBAI_RPC_URL=https://polygon-mumbai.infura.io/v3/YOUR_KEY
ETHERSCAN_API_KEY=...
POLYGONSCAN_API_KEY=...
```

## 🔧 Deploy

### 1. Deploy SGL Token
```bash
npx hardhat run scripts/deploy-sgl.js --network sepolia
```

### 2. Mint Tokens
```bash
npx hardhat run scripts/mint-sgl.js --network sepolia
```

### 3. Deploy Faucet
```bash
npx hardhat run scripts/deploy-faucet.js --network sepolia
```

## 🧪 Testes

### Executar testes
```bash
npx hardhat test
```

### Verificar balanços
```bash
npm run check:balance
```

### Console interativo
```bash
npx hardhat console --network sepolia
```

Exemplo de uso no console:
```javascript
const SGL = await ethers.getContractAt("SGLToken", "0xF281a68ae5Baf227bADC1245AC5F9B2F53b7EDe1");
const Faucet = await ethers.getContractAt("TokenFaucet", "0x83a7DEF4072487738979b1aa0816044B533CF2aE");

// Verificar supply total
(await SGL.totalSupply()).toString();

// Verificar saldo
(await SGL.balanceOf("0x043bd4333C85288258d30546856ed891ee4644e3")).toString();

// Solicitar tokens do faucet
await Faucet.requestTokens();
```

## 📱 Frontend MVP

O projeto inclui um MVP simplificado em `singulai-mvp-simple/` com:
- Interface web para solicitar tokens SGL
- Integração com MetaMask
- API para interagir com os contratos

Para executar o frontend:
```bash
cd singulai-mvp-simple
npm install
npm start
```

## 🌐 Links Úteis

- [Sepolia Faucet](https://sepoliafaucet.com/) - Para obter ETH de teste
- [Sepolia Explorer](https://sepolia.etherscan.io/) - Para verificar transações
- [OpenZeppelin Docs](https://docs.openzeppelin.com/) - Documentação dos contratos base

## 🔐 Segurança

- Todos os contratos usam OpenZeppelin v5.x
- Implementam controles de acesso adequados
- Testados com cobertura abrangente
- Auditados para padrões de segurança

## 📝 Licença

Este projeto está licenciado sob a licença ISC.
