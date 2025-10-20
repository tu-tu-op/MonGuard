# MonGuard Deployment Guide

Complete guide to deploying MonGuard on Monad blockchain.

## Prerequisites

- Node.js v18+
- Python 3.9+
- Docker & Docker Compose (for containerized deployment)
- Git
- Monad wallet with testnet/mainnet funds

## Quick Start with Docker

```bash
# Clone repository
git clone <repository-url>
cd monguard

# Copy environment files
cp frontend/.env.example frontend/.env
cp contracts/.env.example contracts/.env
cp ml-engine/.env.example ml-engine/.env

# Edit .env files with your configuration

# Start all services
docker-compose up -d

# Check status
docker-compose ps
```

## Manual Deployment

### 1. Deploy Smart Contracts

```bash
cd contracts

# Install dependencies
npm install

# Compile contracts
npm run compile

# Deploy to Monad testnet
npx hardhat run scripts/deploy.js --network monadTestnet

# Save deployment addresses to .env file
# The script will output addresses - copy them

# Verify contracts
npm run verify -- --network monadTestnet
```

### 2. Train ML Models

```bash
cd ml-engine

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Train models
python -m training.train_risk_model

# Models will be saved to checkpoints/ directory
```

### 3. Start API Server

```bash
cd api

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with contract addresses and settings

# Start server
npm start

# For development with auto-reload
npm run dev
```

### 4. Launch Frontend Dashboard

```bash
cd frontend

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Add contract addresses and API URL

# Build for production
npm run build

# Start production server
npm start

# For development
npm run dev
```

## Production Deployment

### Cloud Deployment (AWS/GCP/Azure)

#### 1. Provision Infrastructure

```bash
# Example using Terraform (not included)
terraform init
terraform plan
terraform apply
```

#### 2. Deploy with Docker

```bash
# Build images
docker-compose build

# Push to registry
docker-compose push

# Deploy to cloud
# Use your cloud provider's deployment tools
```

#### 3. Configure Load Balancer

- Frontend: Port 3000
- API: Port 8000
- Set up SSL/TLS certificates
- Configure domain names

### Environment-Specific Configuration

#### Testnet

```env
# contracts/.env
MONAD_TESTNET_RPC_URL=https://testnet-rpc.monad.xyz
PRIVATE_KEY=<your-testnet-private-key>

# frontend/.env
NEXT_PUBLIC_RPC_URL=https://testnet-rpc.monad.xyz
NEXT_PUBLIC_CHAIN_ID=41454
```

#### Mainnet

```env
# contracts/.env
MONAD_MAINNET_RPC_URL=https://rpc.monad.xyz
PRIVATE_KEY=<your-mainnet-private-key>

# frontend/.env
NEXT_PUBLIC_RPC_URL=https://rpc.monad.xyz
NEXT_PUBLIC_CHAIN_ID=4145
```

## Post-Deployment Steps

### 1. Configure Oracle Feeds

```bash
# Update oracle with OFAC/FATF data
curl -X POST http://your-api-url/api/oracle/update-sanctions \
  -H "X-API-Key: your-admin-key"
```

### 2. Grant Roles

```javascript
// Grant necessary roles to API server and ML engine
const AI_ORACLE_ROLE = ethers.keccak256(ethers.toUtf8Bytes("AI_ORACLE_ROLE"));
await transactionMonitor.grantRole(AI_ORACLE_ROLE, apiServerAddress);
```

### 3. Initial Data Sync

```bash
# Sync historical transaction data
cd ml-engine
python scripts/sync_blockchain_data.py --from-block 0
```

### 4. Start Monitoring

```bash
# Enable real-time monitoring
# Check dashboard at https://your-domain.com
# Verify alerts are being generated
```

## Testing Deployment

### 1. Run Contract Tests

```bash
cd contracts
npm test
```

### 2. Run API Tests

```bash
cd api
npm test
```

### 3. Integration Tests

```bash
# Test end-to-end flow
cd contracts
npx hardhat test test/integration.test.js
```

### 4. Health Checks

```bash
# API health
curl http://your-api-url/health

# Frontend
curl http://your-frontend-url

# Check contract deployment
npx hardhat verify --network monad <contract-address>
```

## Monitoring & Maintenance

### Logs

```bash
# API logs
docker-compose logs -f api

# Frontend logs
docker-compose logs -f frontend

# ML engine logs
docker-compose logs -f ml-engine
```

### Database Backups

```bash
# MongoDB backup
docker exec monguard-mongo mongodump --out /backup

# Redis backup
docker exec monguard-redis redis-cli BGSAVE
```

### Model Updates

```bash
# Retrain models with new data
cd ml-engine
python -m training.train_risk_model

# Deploy updated models
# Restart ML engine service
docker-compose restart ml-engine
```

## Scaling

### Horizontal Scaling

```bash
# Scale API servers
docker-compose up -d --scale api=3

# Use load balancer to distribute traffic
```

### Database Sharding

- Configure MongoDB replica set
- Set up Redis cluster for caching
- Use read replicas for queries

## Security Checklist

- [ ] Rotate API keys regularly
- [ ] Enable HTTPS/SSL
- [ ] Configure firewall rules
- [ ] Set up DDoS protection
- [ ] Enable rate limiting
- [ ] Implement access controls
- [ ] Regular security audits
- [ ] Monitor for vulnerabilities
- [ ] Backup private keys securely
- [ ] Use hardware security modules (HSM)

## Troubleshooting

### Common Issues

**Contract deployment fails**
```bash
# Check network connection
npx hardhat run --network monadTestnet scripts/check-connection.js

# Verify gas settings in hardhat.config.js
```

**API connection errors**
```bash
# Check environment variables
cat api/.env

# Verify contract addresses are correct
# Check RPC endpoint is accessible
```

**Frontend not loading**
```bash
# Check build output
npm run build

# Verify environment variables
cat frontend/.env.local
```

**ML models not loading**
```bash
# Check checkpoints directory
ls -la ml-engine/checkpoints/

# Retrain if necessary
python -m training.train_risk_model
```

## Support

- Documentation: https://docs.monguard.xyz
- GitHub Issues: https://github.com/monguard/monguard/issues
- Discord: https://discord.gg/monguard
- Email: support@monguard.xyz

## License

MIT License - see LICENSE file for details
