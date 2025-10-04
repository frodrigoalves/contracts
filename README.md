# SingulAI Contracts

Smart contracts for the SingulAI ecosystem - a revolutionary platform for digital avatars, AI companions, and digital legacy management.

## 🌟 Overview

This repository contains the Solidity smart contracts that power the SingulAI platform, including:

- **SGL Token**: The official SingulAI token with role-based access control and burn mechanics
- **MockToken (tSGL)**: Test token for MVP validation
- **Avatar System**: Digital avatar creation and management
- **TimeCapsule**: Time-locked message and asset storage
- **DigitalLegacy**: Beneficiary and inheritance management
- **Device Integration**: Hardware authentication and biometric validation
- **Institutional Gateway**: Enterprise-grade compliance and oracle integration

## 🚀 Quick Start

### Prerequisites

- Node.js v20 or higher
- npm or yarn
- A wallet with testnet ETH (for deployment)

### Installation

Install dependencies:

```bash
npm install
```

### Configuration

Create a `.env` file based on `.env.template`:

```bash
cp .env.template .env
```

Then configure your environment variables:

```env
SEPOLIA_RPC_URL=https://...
MUMBAI_RPC_URL=https://...
PRIVATE_KEY=0x...
ETHERSCAN_API_KEY=...
POLYGONSCAN_API_KEY=...
CONTRACT_ADDRESS=0x...
```

**Note**: Never commit your `.env` file or expose your private keys!

## 🛠️ Development

### Compile Contracts

```bash
npx hardhat compile
```

### Run Tests

```bash
npm test
```

### Deploy Contracts

For MVP test deployment:

```bash
npx hardhat run scripts/deploy-mvp.js --network sepolia
```

For production deployment:

```bash
npx hardhat run scripts/deploy-all.js --network sepolia
```

### Verify Contracts

Contracts are automatically verified during deployment. To manually verify:

```bash
npx hardhat verify --network sepolia <CONTRACT_ADDRESS> <CONSTRUCTOR_ARGS>
```

## 📋 Available Scripts

- `npm test` - Run the test suite
- `npm run check:balance` - Check token balances

## 🏗️ Contract Architecture

### Core Tokens
- **SGLToken**: Production token with 2% burn on transfers
- **MockToken**: Test token for MVP validation

### Avatar System
- **AvatarBase**: Core avatar NFT functionality
- **AvatarWalletLink**: Link avatars to user wallets
- **AvatarPro**: Premium avatar features

### Legacy & Storage
- **TimeCapsule**: Time-locked content storage
- **DigitalLegacy**: Inheritance and beneficiary management
- **Message**: On-chain messaging system

### DeFi Components
- **StakingPool**: Token staking mechanisms
- **EscrowContract**: Secure escrow services
- **FeeManager**: Fee collection and distribution

### Enterprise Features
- **InstitutionalGateway**: KYC/AML compliance
- **ProofValidator**: Proof verification system
- **OracleRegistry**: Oracle management

### Device Integration
- **DeviceRegistry**: Hardware device management
- **DeviceAuth**: Device authentication
- **BiometricValidator**: Biometric verification
- **AccessController**: Access control management

## 🧪 Testing

The project includes comprehensive test coverage:

```bash
# Run all tests
npm test

# Run specific test file
npx hardhat test test/SGLToken.test.js

# Run with gas reporting
REPORT_GAS=true npm test
```

## 📚 Documentation

- [Quick Start Guide](README-short.md) - Testnet deployment checklist
- [Infrastructure Setup](docs/infrastructure/) - VPS and hosting setup
- [Roadmap](docs/ROADMAP.md) - Project roadmap and milestones
- [Module Documentation](docs/modules/) - Detailed module specifications

## 🔒 Security

- All contracts use OpenZeppelin libraries for security best practices
- Role-based access control for privileged operations
- Pausable functionality for emergency stops
- Comprehensive test coverage

**Bug Bounty**: We take security seriously. Please report vulnerabilities responsibly.

## ⚠️ MVP Testing

The current deployment uses **MockToken (tSGL)** for testing purposes. The official SGL token will be deployed after MVP validation and feedback.

Test contract addresses are stored in the `.env` file after deployment.

## 🤝 Contributing

This is a private repository. For internal contributors:

1. Create a feature branch
2. Make your changes with tests
3. Ensure all tests pass
4. Submit a pull request

## 📄 License

ISC License - See LICENSE file for details

## 👥 Team

**Author**: Rodrigo Alves Ferreira

**Project**: SingulAI - Digital Avatars & AI Companions

---

For more information, visit our platform at [singulai.site](https://singulai.site)
