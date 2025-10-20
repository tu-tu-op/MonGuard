# MonGuard: AI-Powered On-Chain Compliance & AML Analytics

## Overview
MonGuard is a decentralized, AI-driven RegTech and Anti-Money Laundering (AML) analysis system that runs natively on Monad, leveraging its EVM compatibility, parallel execution, and 10,000+ TPS throughput for detecting and preventing financial crimes in real time.

## Project Structure

```
monguard/
├── contracts/          # Smart contracts (Solidity)
│   ├── src/           # Contract source files
│   ├── test/          # Contract tests
│   ├── scripts/       # Deployment scripts
│   └── lib/           # Contract libraries
├── ml-engine/         # AI/ML Analysis Layer
│   ├── models/        # ML model implementations
│   ├── data/          # Training data and datasets
│   ├── utils/         # Utility functions
│   └── training/      # Training scripts
├── sdk/               # Integration SDKs
│   ├── js/            # JavaScript/TypeScript SDK
│   └── python/        # Python SDK
├── api/               # Backend API
│   ├── src/           # API source code
│   ├── routes/        # API routes
│   └── middleware/    # API middleware
├── frontend/          # Analytics Dashboard
│   ├── src/           # Frontend source
│   ├── components/    # React components
│   ├── pages/         # Next.js pages
│   └── utils/         # Frontend utilities
├── docs/              # Documentation
└── config/            # Configuration files
```

## Key Features

- **Real-time Compliance Alerts**: Smart contracts emit event logs upon anomalies
- **Dynamic Risk Scores**: Updated on-chain per wallet/contract
- **Immutable Audit NFTs**: Verified compliance and transaction history
- **Action Layer**: Automated on-chain actions (restrict, freeze, alert)
- **Analytics Portal**: Web dashboard for trends and AI decision explanations

## Tech Stack

- **Blockchain**: Monad (EVM-compatible)
- **Smart Contracts**: Solidity + Hardhat
- **AI/ML**: Python, PyTorch, Hugging Face
- **Storage**: IPFS/Arweave
- **Frontend**: Next.js + GraphQL
- **Wallet Integration**: Sequence SDK

## Getting Started

### Prerequisites
- Node.js v18+
- Python 3.9+
- Git

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd monguard

# Install contract dependencies
cd contracts
npm install

# Install ML engine dependencies
cd ../ml-engine
pip install -r requirements.txt

# Install frontend dependencies
cd ../frontend
npm install
```

## Development

### Smart Contracts
```bash
cd contracts
npx hardhat compile
npx hardhat test
```

### ML Engine
```bash
cd ml-engine
python -m training.train_risk_model
```

### Frontend
```bash
cd frontend
npm run dev
```

## License
MIT

## Contributing
See CONTRIBUTING.md for details.
