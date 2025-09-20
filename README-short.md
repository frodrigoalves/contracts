# SingulAI Testnet Deployment Checklist

## Preparação de ambiente
1. Garanta Node.js v20 e npm atualizado.
2. Configure as variáveis de ambiente com seus valores reais (substitua os placeholders):
   ```bash
   export SEPOLIA_RPC_URL="https://..."
   export MUMBAI_RPC_URL="https://..."
   export PRIVATE_KEY="0x..."
   export ETHERSCAN_API_KEY="..."
   export POLYGONSCAN_API_KEY="..."
   export CONTRACT_ADDRESS="0x..."   # atualize após o deploy
   export NEW_ADDRESS="0x..."
   export TOKEN_ADDRESS="0x..."
   ```
   *No Codex, utilize Secrets/Environment Variables do workspace para armazenar esses valores.*

## Fluxo sugerido
1. Instale as dependências:
   ```bash
   npm install
   ```
2. Compile os contratos (requer acesso à internet para baixar o compilador):
   ```bash
   npx hardhat compile
   ```
3. Gere o arquivo `.env` a partir das variáveis do processo (sem expor segredos):
   ```bash
   bash scripts/write-env-from-envvars.sh
   ```
4. Faça o deploy e a verificação na Sepolia:
   ```bash
   npx hardhat run scripts/deploy-and-verify.js --network sepolia
   ```
5. Consulte o totalSupply e o saldo do deployer (atualize CONTRACT_ADDRESS antes):
   ```bash
   npx hardhat run scripts/check-balance.js --network sepolia
   ```

> Ajuste a variável `CONTRACT_ADDRESS` e regenere o `.env` após o deploy para que os scripts reflitam o endereço mais recente.
