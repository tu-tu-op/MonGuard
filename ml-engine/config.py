"""
Configuration settings for MonGuard ML Engine
"""
import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

# Base Paths
BASE_DIR = Path(__file__).parent
DATA_DIR = BASE_DIR / "data"
MODELS_DIR = BASE_DIR / "models"
CHECKPOINTS_DIR = BASE_DIR / "checkpoints"
LOGS_DIR = BASE_DIR / "logs"

# Create directories if they don't exist
for dir_path in [DATA_DIR, MODELS_DIR, CHECKPOINTS_DIR, LOGS_DIR]:
    dir_path.mkdir(exist_ok=True)

# Blockchain Configuration
WEB3_PROVIDER_URL = os.getenv("WEB3_PROVIDER_URL", "https://rpc.monad.xyz")
RISK_REGISTRY_ADDRESS = os.getenv("RISK_REGISTRY_ADDRESS", "")
COMPLIANCE_ORACLE_ADDRESS = os.getenv("COMPLIANCE_ORACLE_ADDRESS", "")
TRANSACTION_MONITOR_ADDRESS = os.getenv("TRANSACTION_MONITOR_ADDRESS", "")
PRIVATE_KEY = os.getenv("PRIVATE_KEY", "")

# Model Configuration
MODEL_CONFIG = {
    "transaction_pattern": {
        "input_dim": 128,
        "hidden_dim": 256,
        "output_dim": 64,
        "num_layers": 3,
        "dropout": 0.2,
        "learning_rate": 0.001,
    },
    "gnn_wallet": {
        "input_dim": 64,
        "hidden_dim": 128,
        "output_dim": 32,
        "num_layers": 4,
        "heads": 4,
        "dropout": 0.3,
        "learning_rate": 0.0005,
    },
    "risk_scorer": {
        "input_dim": 96,
        "hidden_dim": 192,
        "output_dim": 1,
        "num_layers": 3,
        "dropout": 0.25,
        "learning_rate": 0.001,
    }
}

# Training Configuration
TRAINING_CONFIG = {
    "batch_size": 64,
    "epochs": 100,
    "early_stopping_patience": 10,
    "validation_split": 0.2,
    "test_split": 0.1,
    "save_checkpoint_every": 5,
}

# Risk Thresholds
RISK_THRESHOLDS = {
    "low": 10,
    "medium": 40,
    "high": 70,
    "critical": 90,
}

# Pattern Detection Thresholds
PATTERN_THRESHOLDS = {
    "structuring": 0.75,
    "rapid_movement": 0.80,
    "mixing": 0.85,
    "high_volume": 0.70,
    "sanction_interaction": 0.95,
}

# API Configuration
API_HOST = os.getenv("API_HOST", "0.0.0.0")
API_PORT = int(os.getenv("API_PORT", "8000"))

# Database Configuration
MONGODB_URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
MONGODB_DB = os.getenv("MONGODB_DB", "monguard")

# Redis Configuration
REDIS_HOST = os.getenv("REDIS_HOST", "localhost")
REDIS_PORT = int(os.getenv("REDIS_PORT", "6379"))
REDIS_DB = int(os.getenv("REDIS_DB", "0"))

# IPFS Configuration
IPFS_HOST = os.getenv("IPFS_HOST", "/ip4/127.0.0.1/tcp/5001")

# Logging Configuration
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")
LOG_FORMAT = "<green>{time:YYYY-MM-DD HH:mm:ss}</green> | <level>{level: <8}</level> | <cyan>{name}</cyan>:<cyan>{function}</cyan>:<cyan>{line}</cyan> - <level>{message}</level>"

# Feature Engineering
TRANSACTION_FEATURES = [
    "amount",
    "timestamp",
    "gas_price",
    "gas_used",
    "from_balance",
    "to_balance",
    "from_transaction_count",
    "to_transaction_count",
    "time_since_last_tx",
    "amount_velocity",
]

WALLET_FEATURES = [
    "balance",
    "transaction_count",
    "unique_counterparties",
    "avg_transaction_amount",
    "max_transaction_amount",
    "total_volume",
    "account_age",
    "last_activity",
]

# Oracle Settings
ORACLE_UPDATE_INTERVAL = 300  # 5 minutes
BATCH_PROCESSING_SIZE = 100
