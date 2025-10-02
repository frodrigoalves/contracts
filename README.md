# contracts

## Setup

Install dependencies:

```bash
npm install
```

Create a `.env` file with your private key and RPC URLs:

```
PRIVATE_KEY=0x...
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR_KEY
MUMBAI_RPC_URL=https://polygon-mumbai.infura.io/v3/YOUR_KEY
ETHERSCAN_API_KEY=...
POLYGONSCAN_API_KEY=...
```

## Deploy SGL Token to Sepolia

1. Get Sepolia ETH from faucet (https://sepoliafaucet.com/)

2. Deploy the token:
```bash
npx hardhat run scripts/deploy-sgl.js --network sepolia
```

3. Mint tokens to your wallet:
```bash
npx hardhat run scripts/mint-sgl.js --network sepolia
```
(Update the token address in mint-sgl.js first)

4. Deploy faucet contract:
```bash
npx hardhat run scripts/deploy-faucet.js --network sepolia
```
(Update addresses in deploy-faucet.js)

## Checking balances

Run the balance inspection script without compiling (requires compiled `MockToken` artifacts to be present):

```bash
npm run check:balance
```

The script prints the deployer address, token contract address, token total supply, the deployer's token balance, and their ETH balance.
