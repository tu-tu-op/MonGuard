"""
Training script for MonGuard ML models
Includes synthetic data generation for initial training
"""

import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import Dataset, DataLoader
import numpy as np
from pathlib import Path
import json
from datetime import datetime
import sys
sys.path.append(str(Path(__file__).parent.parent))

from models.transaction_pattern_analyzer import TransactionPatternAnalyzer
from models.wallet_gnn import WalletGNN
from models.risk_scorer import RiskScoringEngine
from config import MODEL_CONFIG, TRAINING_CONFIG, CHECKPOINTS_DIR, LOGS_DIR


class SyntheticTransactionDataset(Dataset):
    """Generate synthetic transaction data for training"""

    def __init__(self, num_samples: int = 10000, seq_len: int = 10):
        self.num_samples = num_samples
        self.seq_len = seq_len
        self.feature_dim = 128

        # Generate data
        self.data, self.labels, self.patterns = self._generate_data()

    def _generate_data(self):
        """Generate synthetic transaction sequences"""
        data = []
        labels = []
        patterns = []

        for i in range(self.num_samples):
            # Random pattern selection (weighted towards normal transactions)
            pattern = np.random.choice([0, 1, 2, 3, 4, 5], p=[0.65, 0.12, 0.08, 0.07, 0.05, 0.03])

            # Generate sequence based on pattern
            sequence = self._generate_pattern_sequence(pattern)

            # Generate anomaly score
            if pattern == 0:  # Normal
                anomaly_score = np.random.beta(2, 8)  # Skewed towards low scores
            elif pattern == 5:  # Sanction interaction
                anomaly_score = np.random.beta(8, 2)  # Skewed towards high scores
            else:
                anomaly_score = np.random.beta(4, 4)  # More uniform

            data.append(sequence)
            labels.append(anomaly_score)
            patterns.append(pattern)

        return (
            torch.FloatTensor(data),
            torch.FloatTensor(labels),
            torch.LongTensor(patterns)
        )

    def _generate_pattern_sequence(self, pattern: int):
        """Generate transaction sequence with specific pattern"""
        sequence = np.random.randn(self.seq_len, self.feature_dim)

        if pattern == 1:  # Structuring
            # Multiple small transactions with similar amounts
            amounts = np.random.uniform(0.8, 1.2, self.seq_len)
            sequence[:, 0] = amounts * 9.5  # Just below threshold

        elif pattern == 2:  # Rapid movement
            # Quick succession of transactions
            times = np.linspace(0, 1, self.seq_len)
            sequence[:, 3] = times  # Compressed time

        elif pattern == 3:  # Mixing
            # High number of unique counterparties
            sequence[:, 20] = np.random.randint(50, 200, self.seq_len)

        elif pattern == 4:  # High volume
            # Large transaction amounts
            sequence[:, 0] = np.random.uniform(100, 1000, self.seq_len)

        elif pattern == 5:  # Sanction interaction
            # Markers for sanctioned addresses
            sequence[:, 25] = 1.0  # Flag
            sequence[:, 0] = np.random.uniform(1, 100, self.seq_len)

        return sequence

    def __len__(self):
        return self.num_samples

    def __getitem__(self, idx):
        return {
            'sequence': self.data[idx],
            'anomaly_score': self.labels[idx],
            'pattern': self.patterns[idx]
        }


def train_pattern_analyzer():
    """Train the transaction pattern analyzer model"""
    print("Training Transaction Pattern Analyzer...")

    # Initialize model (exclude learning_rate from model config)
    model_params = {k: v for k, v in MODEL_CONFIG['transaction_pattern'].items() 
                    if k != 'learning_rate'}
    model = TransactionPatternAnalyzer(**model_params)

    # Create datasets
    train_dataset = SyntheticTransactionDataset(num_samples=8000)
    val_dataset = SyntheticTransactionDataset(num_samples=2000)

    train_loader = DataLoader(
        train_dataset,
        batch_size=TRAINING_CONFIG['batch_size'],
        shuffle=True
    )
    val_loader = DataLoader(
        val_dataset,
        batch_size=TRAINING_CONFIG['batch_size']
    )

    # Training setup
    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    model.to(device)

    optimizer = optim.Adam(
        model.parameters(),
        lr=MODEL_CONFIG['transaction_pattern']['learning_rate']
    )

    pattern_criterion = nn.CrossEntropyLoss()
    anomaly_criterion = nn.MSELoss()

    # Training loop
    best_val_loss = float('inf')
    patience_counter = 0

    for epoch in range(TRAINING_CONFIG['epochs']):
        # Training
        model.train()
        train_loss = 0

        for batch in train_loader:
            sequences = batch['sequence'].to(device)
            anomaly_scores = batch['anomaly_score'].to(device)
            patterns = batch['pattern'].to(device)

            optimizer.zero_grad()

            output = model(sequences)

            # Combined loss
            pattern_loss = pattern_criterion(output['pattern_logits'], patterns)
            anomaly_loss = anomaly_criterion(output['anomaly_score'], anomaly_scores)

            loss = pattern_loss + anomaly_loss
            loss.backward()
            optimizer.step()

            train_loss += loss.item()

        # Validation
        model.eval()
        val_loss = 0

        with torch.no_grad():
            for batch in val_loader:
                sequences = batch['sequence'].to(device)
                anomaly_scores = batch['anomaly_score'].to(device)
                patterns = batch['pattern'].to(device)

                output = model(sequences)

                pattern_loss = pattern_criterion(output['pattern_logits'], patterns)
                anomaly_loss = anomaly_criterion(output['anomaly_score'], anomaly_scores)

                loss = pattern_loss + anomaly_loss
                val_loss += loss.item()

        avg_train_loss = train_loss / len(train_loader)
        avg_val_loss = val_loss / len(val_loader)

        print(f"Epoch {epoch+1}/{TRAINING_CONFIG['epochs']} - "
              f"Train Loss: {avg_train_loss:.4f}, Val Loss: {avg_val_loss:.4f}")

        # Early stopping
        if avg_val_loss < best_val_loss:
            best_val_loss = avg_val_loss
            patience_counter = 0

            # Save best model
            checkpoint_path = CHECKPOINTS_DIR / 'pattern_analyzer_best.pt'
            torch.save({
                'epoch': epoch,
                'model_state_dict': model.state_dict(),
                'optimizer_state_dict': optimizer.state_dict(),
                'val_loss': avg_val_loss,
            }, checkpoint_path)
            print(f"✓ Saved best model (val_loss: {avg_val_loss:.4f})")
        else:
            patience_counter += 1

        if patience_counter >= TRAINING_CONFIG['early_stopping_patience']:
            print(f"Early stopping triggered at epoch {epoch+1}")
            break

    return model


def train_wallet_gnn():
    """Train the wallet GNN model"""
    print("\nTraining Wallet GNN...")

    # Initialize model (exclude learning_rate from model config)
    model_params = {k: v for k, v in MODEL_CONFIG['gnn_wallet'].items() 
                    if k != 'learning_rate'}
    model = WalletGNN(**model_params)

    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    model.to(device)

    print("✓ Wallet GNN model initialized")
    print("  Note: GNN training requires graph data - use real transaction data")

    # Save initialized model
    checkpoint_path = CHECKPOINTS_DIR / 'wallet_gnn_init.pt'
    torch.save({
        'model_state_dict': model.state_dict(),
    }, checkpoint_path)

    return model


def save_training_metadata(pattern_model, gnn_model):
    """Save training metadata and model info"""
    metadata = {
        'timestamp': datetime.now().isoformat(),
        'models': {
            'pattern_analyzer': {
                'checkpoint': 'pattern_analyzer_best.pt',
                'config': MODEL_CONFIG['transaction_pattern']
            },
            'wallet_gnn': {
                'checkpoint': 'wallet_gnn_init.pt',
                'config': MODEL_CONFIG['gnn_wallet']
            }
        },
        'training_config': TRAINING_CONFIG,
        'dataset': {
            'type': 'synthetic',
            'train_samples': 8000,
            'val_samples': 2000
        }
    }

    metadata_path = CHECKPOINTS_DIR / 'training_metadata.json'
    with open(metadata_path, 'w') as f:
        json.dump(metadata, f, indent=2)

    print(f"\n✓ Training metadata saved to {metadata_path}")


def main():
    """Main training function"""
    print("=" * 60)
    print("MonGuard ML Model Training")
    print("=" * 60)

    # Create directories
    CHECKPOINTS_DIR.mkdir(exist_ok=True)
    LOGS_DIR.mkdir(exist_ok=True)

    # Train models
    pattern_model = train_pattern_analyzer()
    gnn_model = train_wallet_gnn()

    # Save metadata
    save_training_metadata(pattern_model, gnn_model)

    print("\n" + "=" * 60)
    print("Training Complete!")
    print("=" * 60)
    print(f"Models saved to: {CHECKPOINTS_DIR}")
    print("\nNext steps:")
    print("1. Deploy smart contracts to Monad")
    print("2. Configure API endpoints")
    print("3. Run integration tests")
    print("4. Launch analytics dashboard")


if __name__ == '__main__':
    main()
