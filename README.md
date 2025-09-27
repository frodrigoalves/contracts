# contracts

## Setup

Install dependencies:

```bash
npm install
```

Create a `.env` file with the deployed token address:

```
CONTRACT_ADDRESS=0x...
```

## Checking balances

Run the balance inspection script without compiling (requires compiled `MockToken` artifacts to be present):

```bash
npm run check:balance
```

The script prints the deployer address, token contract address, token total supply, the deployer's token balance, and their ETH balance.
