# MonGuard - Quick Start Guide

Get MonGuard up and running in minutes!

## 🚀 One-Command Setup

### Linux/macOS
```bash
chmod +x setup.sh
./setup.sh
```

### Windows
```bash
setup.bat
```

This will:
- ✅ Install all dependencies
- ✅ Set up smart contracts
- ✅ Configure ML engine
- ✅ Initialize API server
- ✅ Prepare frontend dashboard
- ✅ Create necessary directories

## 📋 Manual Setup (5 Steps)

### Step 1: Smart Contracts

```bash
cd contracts
npm install
npx hardhat compile

# Deploy to Monad testnet
npx hardhat run scripts/deploy.js --network monadTestnet

# Save the contract addresses from output
```

### Step 2: ML Models

```bash
cd ml-engine
pip install -r requirements.txt

# Train models with synthetic data
python -m training.train_risk_model

# Models saved to checkpoints/
```

### Step 3: API Server

```bash
cd api
npm install

# Edit .env with contract addresses
npm start
```

### Step 4: Frontend

```bash
cd frontend
npm install

# Edit .env.local with contract addresses
npm run dev
```

### Step 5: Access Dashboard

Open browser: http://localhost:3000

## 🐳 Docker Quick Start

```bash
# Start everything with Docker
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f

# Stop everything
docker-compose down
```

## 🧪 Test Your Setup

### 1. Test Contracts

```bash
cd contracts
npm test
```

### 2. Test API

```bash
cd api
npm test
```

### 3. Integration Test

```bash
cd contracts
npx hardhat test test/integration.test.js
```

## 📊 Verify Deployment

### Check Smart Contracts

```bash
npx hardhat verify --network monadTestnet <CONTRACT_ADDRESS>
```

### Check API Health

```bash
curl http://localhost:8000/health
```

### Check Frontend

Navigate to http://localhost:3000 and verify:
- Dashboard loads
- Transaction graph displays
- Risk metrics show data
- Alerts panel is visible

## 🔧 Configuration

### Environment Variables

**contracts/.env**
```env
MONAD_TESTNET_RPC_URL=https://testnet-rpc.monad.xyz
PRIVATE_KEY=your_private_key_here
```

**api/.env**
```env
RISK_REGISTRY_ADDRESS=0x...
COMPLIANCE_ORACLE_ADDRESS=0x...
TRANSACTION_MONITOR_ADDRESS=0x...
```

**frontend/.env.local**
```env
NEXT_PUBLIC_RPC_URL=https://testnet-rpc.monad.xyz
NEXT_PUBLIC_RISK_REGISTRY_ADDRESS=0x...
NEXT_PUBLIC_API_URL=http://localhost:8000
```

## 🎯 Usage Examples

### Check Address Risk

```typescript
import { MonGuardClient } from '@monguard/sdk';

const client = new MonGuardClient({
  rpcUrl: 'https://rpc.monad.xyz',
  riskRegistryAddress: '0x...',
  // ... other addresses
});

const riskScore = await client.getRiskScore(address);
console.log('Risk Score:', riskScore);
```

### Pre-Transaction Check

```typescript
const check = await client.preTransactionCheck(
  fromAddress,
  toAddress,
  amount
);

if (check.shouldProceed) {
  // Safe to proceed
} else {
  console.error('Risks:', check.risks);
}
```

### Analyze Transaction Pattern

```bash
curl -X POST http://localhost:8000/api/analysis/pattern \
  -H "Content-Type: application/json" \
  -d '{
    "transactions": [...]
  }'
```

## 📈 Monitoring

### Real-Time Statistics

```bash
curl http://localhost:8000/api/monitoring/stats
```

### Active Alerts

```bash
curl http://localhost:8000/api/monitoring/alerts
```

### Model Performance

```bash
curl http://localhost:8000/api/monitoring/models
```

## 🐛 Troubleshooting

### Contracts won't deploy

- Check your private key has testnet funds
- Verify RPC URL is correct
- Check hardhat.config.js network settings

### ML models fail to load

```bash
cd ml-engine
python -m training.train_risk_model
```

### API connection errors

- Verify contract addresses in .env
- Check RPC endpoint is accessible
- Ensure MongoDB/Redis are running (if using)

### Frontend won't build

```bash
cd frontend
rm -rf .next node_modules
npm install
npm run build
```

## 📚 Next Steps

1. **Customize Models**: Train with real transaction data
2. **Configure Oracles**: Set up OFAC/FATF API connections
3. **Add Monitoring**: Set up alerting and logging
4. **Deploy to Production**: Follow DEPLOYMENT.md guide
5. **Integrate with dApp**: Use the MonGuard SDK

## 💡 Key Features

- ✅ **Real-time Risk Assessment**: AI-powered transaction analysis
- ✅ **Sanctions Screening**: OFAC/FATF integration
- ✅ **Pattern Detection**: Identifies structuring, mixing, etc.
- ✅ **Automated Enforcement**: Smart contract-based blocking
- ✅ **Regulatory NFTs**: Immutable compliance records
- ✅ **Analytics Dashboard**: Real-time monitoring and alerts

## 🆘 Support

- 📖 [Full Documentation](DEPLOYMENT.md)
- 🐛 [GitHub Issues](https://github.com/monguard/monguard/issues)
- 💬 [Discord Community](https://discord.gg/monguard)
- 📧 [Email Support](mailto:support@monguard.xyz)

## 📝 License

MIT License - see LICENSE file

---

**Built for Monad** 🌐 | **Powered by AI** 🤖 | **Securing DeFi** 🛡️
