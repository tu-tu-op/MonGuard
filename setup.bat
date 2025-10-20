@echo off
REM MonGuard Setup Script for Windows
REM Automated setup for the entire MonGuard platform

echo ======================================================================
echo MonGuard - AI-Powered On-Chain Compliance ^& AML Analytics
echo ======================================================================
echo.

REM Check prerequisites
echo Checking prerequisites...
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo Error: Node.js is not installed
    exit /b 1
)

where python >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo Error: Python is not installed
    exit /b 1
)

where git >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo Error: Git is not installed
    exit /b 1
)

echo [OK] All prerequisites met
echo.

REM Setup Contracts
echo ======================================================================
echo 1. Setting up Smart Contracts
echo ======================================================================
cd contracts

if not exist .env (
    echo Creating .env file from example...
    copy .env.example .env
    echo [WARNING] Please edit contracts\.env with your configuration
)

echo Installing dependencies...
call npm install

echo Compiling contracts...
call npm run compile

echo [OK] Contracts setup complete
cd ..
echo.

REM Setup ML Engine
echo ======================================================================
echo 2. Setting up ML Engine
echo ======================================================================
cd ml-engine

if not exist .env (
    echo Creating .env file from example...
    copy .env.example .env
    echo [WARNING] Please edit ml-engine\.env with your configuration
)

echo Creating virtual environment...
python -m venv venv

echo Activating virtual environment...
call venv\Scripts\activate.bat

echo Installing Python dependencies...
pip install -r requirements.txt

echo Installing package...
pip install -e .

echo [OK] ML Engine setup complete
call deactivate
cd ..
echo.

REM Setup API
echo ======================================================================
echo 3. Setting up API Server
echo ======================================================================
cd api

if not exist .env (
    echo Creating .env file from example...
    copy .env.example .env
    echo [WARNING] Please edit api\.env with your configuration
)

echo Installing dependencies...
call npm install

echo [OK] API setup complete
cd ..
echo.

REM Setup Frontend
echo ======================================================================
echo 4. Setting up Frontend Dashboard
echo ======================================================================
cd frontend

if not exist .env.local (
    echo Creating .env.local file from example...
    copy .env.example .env.local
    echo [WARNING] Please edit frontend\.env.local with your configuration
)

echo Installing dependencies...
call npm install

echo [OK] Frontend setup complete
cd ..
echo.

REM Setup SDK
echo ======================================================================
echo 5. Setting up SDKs
echo ======================================================================
cd sdk\js

echo Installing JS SDK dependencies...
call npm install

cd ..\..
echo [OK] SDKs setup complete
echo.

REM Create necessary directories
echo ======================================================================
echo 6. Creating necessary directories
echo ======================================================================
if not exist ml-engine\checkpoints mkdir ml-engine\checkpoints
if not exist ml-engine\logs mkdir ml-engine\logs
if not exist ml-engine\data mkdir ml-engine\data
if not exist contracts\deployments mkdir contracts\deployments
if not exist docs\_build mkdir docs\_build

echo [OK] Directories created
echo.

REM Summary
echo ======================================================================
echo Setup Complete!
echo ======================================================================
echo.
echo Next Steps:
echo.
echo 1. Configure Environment Variables:
echo    - Edit contracts\.env with your Monad RPC URL and private key
echo    - Edit ml-engine\.env with contract addresses (after deployment)
echo    - Edit api\.env with contract addresses and API keys
echo    - Edit frontend\.env.local with contract addresses and API URL
echo.
echo 2. Deploy Smart Contracts:
echo    cd contracts
echo    npx hardhat run scripts\deploy.js --network monadTestnet
echo.
echo 3. Train ML Models:
echo    cd ml-engine
echo    venv\Scripts\activate
echo    python -m training.train_risk_model
echo.
echo 4. Start Services:
echo    REM Option A: Using Docker
echo    docker-compose up -d
echo.
echo    REM Option B: Manually
echo    REM Terminal 1 - API
echo    cd api ^&^& npm start
echo.
echo    REM Terminal 2 - Frontend
echo    cd frontend ^&^& npm run dev
echo.
echo 5. Access Dashboard:
echo    Open http://localhost:3000
echo.
echo For detailed deployment instructions, see DEPLOYMENT.md
echo.
echo Happy Building with MonGuard!
echo.

pause
