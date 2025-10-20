#!/bin/bash

# MonGuard Setup Script
# Automated setup for the entire MonGuard platform

set -e

echo "======================================================================"
echo "MonGuard - AI-Powered On-Chain Compliance & AML Analytics"
echo "======================================================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check prerequisites
echo "Checking prerequisites..."
command -v node >/dev/null 2>&1 || { echo -e "${RED}Error: Node.js is not installed${NC}"; exit 1; }
command -v python3 >/dev/null 2>&1 || { echo -e "${RED}Error: Python3 is not installed${NC}"; exit 1; }
command -v git >/dev/null 2>&1 || { echo -e "${RED}Error: Git is not installed${NC}"; exit 1; }

echo -e "${GREEN}✓ All prerequisites met${NC}"
echo ""

# Setup Contracts
echo "======================================================================"
echo "1. Setting up Smart Contracts"
echo "======================================================================"
cd contracts

if [ ! -f ".env" ]; then
    echo "Creating .env file from example..."
    cp .env.example .env
    echo -e "${YELLOW}⚠ Please edit contracts/.env with your configuration${NC}"
fi

echo "Installing dependencies..."
npm install

echo "Compiling contracts..."
npm run compile

echo -e "${GREEN}✓ Contracts setup complete${NC}"
cd ..
echo ""

# Setup ML Engine
echo "======================================================================"
echo "2. Setting up ML Engine"
echo "======================================================================"
cd ml-engine

if [ ! -f ".env" ]; then
    echo "Creating .env file from example..."
    cp .env.example .env
    echo -e "${YELLOW}⚠ Please edit ml-engine/.env with your configuration${NC}"
fi

echo "Creating virtual environment..."
python3 -m venv venv

echo "Activating virtual environment..."
source venv/bin/activate || . venv/Scripts/activate

echo "Installing Python dependencies..."
pip install -r requirements.txt

echo "Installing package..."
pip install -e .

echo -e "${GREEN}✓ ML Engine setup complete${NC}"
deactivate || true
cd ..
echo ""

# Setup API
echo "======================================================================"
echo "3. Setting up API Server"
echo "======================================================================"
cd api

if [ ! -f ".env" ]; then
    echo "Creating .env file from example..."
    cp .env.example .env
    echo -e "${YELLOW}⚠ Please edit api/.env with your configuration${NC}"
fi

echo "Installing dependencies..."
npm install

echo -e "${GREEN}✓ API setup complete${NC}"
cd ..
echo ""

# Setup Frontend
echo "======================================================================"
echo "4. Setting up Frontend Dashboard"
echo "======================================================================"
cd frontend

if [ ! -f ".env.local" ]; then
    echo "Creating .env.local file from example..."
    cp .env.example .env.local
    echo -e "${YELLOW}⚠ Please edit frontend/.env.local with your configuration${NC}"
fi

echo "Installing dependencies..."
npm install

echo -e "${GREEN}✓ Frontend setup complete${NC}"
cd ..
echo ""

# Setup SDK
echo "======================================================================"
echo "5. Setting up SDKs"
echo "======================================================================"
cd sdk/js

echo "Installing JS SDK dependencies..."
npm install

cd ../..
echo -e "${GREEN}✓ SDKs setup complete${NC}"
echo ""

# Create necessary directories
echo "======================================================================"
echo "6. Creating necessary directories"
echo "======================================================================"
mkdir -p ml-engine/checkpoints
mkdir -p ml-engine/logs
mkdir -p ml-engine/data
mkdir -p contracts/deployments
mkdir -p docs/_build

echo -e "${GREEN}✓ Directories created${NC}"
echo ""

# Summary
echo "======================================================================"
echo "Setup Complete!"
echo "======================================================================"
echo ""
echo "Next Steps:"
echo ""
echo "1. Configure Environment Variables:"
echo "   - Edit contracts/.env with your Monad RPC URL and private key"
echo "   - Edit ml-engine/.env with contract addresses (after deployment)"
echo "   - Edit api/.env with contract addresses and API keys"
echo "   - Edit frontend/.env.local with contract addresses and API URL"
echo ""
echo "2. Deploy Smart Contracts:"
echo "   cd contracts"
echo "   npx hardhat run scripts/deploy.js --network monadTestnet"
echo ""
echo "3. Train ML Models:"
echo "   cd ml-engine"
echo "   source venv/bin/activate"
echo "   python -m training.train_risk_model"
echo ""
echo "4. Start Services:"
echo "   # Option A: Using Docker"
echo "   docker-compose up -d"
echo ""
echo "   # Option B: Manually"
echo "   # Terminal 1 - API"
echo "   cd api && npm start"
echo ""
echo "   # Terminal 2 - Frontend"
echo "   cd frontend && npm run dev"
echo ""
echo "5. Access Dashboard:"
echo "   Open http://localhost:3000"
echo ""
echo "For detailed deployment instructions, see DEPLOYMENT.md"
echo ""
echo -e "${GREEN}Happy Building with MonGuard! 🚀${NC}"
