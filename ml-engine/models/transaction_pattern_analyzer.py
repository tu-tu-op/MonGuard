"""
Transaction Pattern Analyzer
Detects suspicious patterns in blockchain transactions using deep learning
"""

import torch
import torch.nn as nn
import torch.nn.functional as F
from typing import Dict, List, Tuple
import numpy as np

class TransactionPatternAnalyzer(nn.Module):
    """
    Neural network for analyzing transaction patterns and detecting anomalies
    """

    def __init__(
        self,
        input_dim: int = 128,
        hidden_dim: int = 256,
        output_dim: int = 64,
        num_layers: int = 3,
        dropout: float = 0.2
    ):
        super(TransactionPatternAnalyzer, self).__init__()

        self.input_dim = input_dim
        self.hidden_dim = hidden_dim
        self.output_dim = output_dim
        self.num_layers = num_layers

        # Feature extraction layers
        self.feature_extractor = nn.Sequential(
            nn.Linear(input_dim, hidden_dim),
            nn.BatchNorm1d(hidden_dim),
            nn.ReLU(),
            nn.Dropout(dropout)
        )

        # LSTM for temporal pattern detection
        self.lstm = nn.LSTM(
            hidden_dim,
            hidden_dim // 2,
            num_layers=num_layers,
            batch_first=True,
            dropout=dropout if num_layers > 1 else 0,
            bidirectional=True
        )

        # Attention mechanism
        self.attention = nn.MultiheadAttention(
            embed_dim=hidden_dim,
            num_heads=8,
            dropout=dropout,
            batch_first=True
        )

        # Pattern classification head
        self.pattern_classifier = nn.Sequential(
            nn.Linear(hidden_dim, hidden_dim // 2),
            nn.ReLU(),
            nn.Dropout(dropout),
            nn.Linear(hidden_dim // 2, 6)  # 6 pattern types
        )

        # Anomaly scoring head
        self.anomaly_scorer = nn.Sequential(
            nn.Linear(hidden_dim, hidden_dim // 2),
            nn.ReLU(),
            nn.Dropout(dropout),
            nn.Linear(hidden_dim // 2, 1),
            nn.Sigmoid()
        )

        # Embedding projection
        self.embedding_proj = nn.Linear(hidden_dim, output_dim)

    def forward(
        self,
        x: torch.Tensor,
        return_attention: bool = False
    ) -> Dict[str, torch.Tensor]:
        """
        Forward pass

        Args:
            x: Input tensor of shape (batch_size, seq_len, input_dim)
            return_attention: Whether to return attention weights

        Returns:
            Dictionary containing:
                - pattern_logits: Pattern classification logits
                - anomaly_score: Anomaly score (0-1)
                - embeddings: Transaction embeddings
                - attention_weights: Attention weights (if return_attention=True)
        """
        batch_size, seq_len, _ = x.shape

        # Feature extraction
        x_reshaped = x.reshape(-1, self.input_dim)
        features = self.feature_extractor(x_reshaped)
        features = features.reshape(batch_size, seq_len, -1)

        # Temporal modeling with LSTM
        lstm_out, (hidden, cell) = self.lstm(features)

        # Self-attention
        attn_out, attn_weights = self.attention(
            lstm_out, lstm_out, lstm_out
        )

        # Combine LSTM and attention outputs
        combined = lstm_out + attn_out

        # Global average pooling
        pooled = combined.mean(dim=1)

        # Pattern classification
        pattern_logits = self.pattern_classifier(pooled)

        # Anomaly scoring
        anomaly_score = self.anomaly_scorer(pooled).squeeze(-1)

        # Generate embeddings
        embeddings = self.embedding_proj(pooled)

        output = {
            'pattern_logits': pattern_logits,
            'anomaly_score': anomaly_score,
            'embeddings': embeddings
        }

        if return_attention:
            output['attention_weights'] = attn_weights

        return output


class TransactionFeatureExtractor:
    """
    Extracts features from raw transaction data
    """

    @staticmethod
    def extract_features(transaction: Dict) -> np.ndarray:
        """
        Extract features from a single transaction

        Args:
            transaction: Dictionary containing transaction data

        Returns:
            Feature vector as numpy array
        """
        features = []

        # Amount features
        amount = float(transaction.get('amount', 0))
        features.extend([
            amount,
            np.log1p(amount),  # Log-scaled amount
            amount ** 2,  # Squared amount
        ])

        # Time features
        timestamp = float(transaction.get('timestamp', 0))
        features.extend([
            timestamp,
            timestamp % 86400,  # Time of day
            timestamp % 604800,  # Day of week
        ])

        # Gas features
        gas_price = float(transaction.get('gas_price', 0))
        gas_used = float(transaction.get('gas_used', 0))
        features.extend([
            gas_price,
            gas_used,
            gas_price * gas_used,  # Total gas cost
        ])

        # Balance features
        from_balance = float(transaction.get('from_balance', 0))
        to_balance = float(transaction.get('to_balance', 0))
        features.extend([
            from_balance,
            to_balance,
            from_balance - amount,  # Balance after
            amount / (from_balance + 1e-10),  # Amount ratio
        ])

        # Transaction count features
        from_tx_count = float(transaction.get('from_transaction_count', 0))
        to_tx_count = float(transaction.get('to_transaction_count', 0))
        features.extend([
            from_tx_count,
            to_tx_count,
            np.log1p(from_tx_count),
            np.log1p(to_tx_count),
        ])

        # Velocity features
        time_since_last = float(transaction.get('time_since_last_tx', 0))
        features.extend([
            time_since_last,
            amount / (time_since_last + 1e-10),  # Amount velocity
            1 / (time_since_last + 1e-10),  # Transaction frequency
        ])

        # Network features
        unique_counterparties = float(transaction.get('unique_counterparties', 0))
        avg_amount = float(transaction.get('avg_transaction_amount', 0))
        features.extend([
            unique_counterparties,
            avg_amount,
            amount / (avg_amount + 1e-10),  # Deviation from average
        ])

        # Contract interaction features
        is_contract = float(transaction.get('to_is_contract', 0))
        features.append(is_contract)

        # Pad or truncate to fixed size
        features = np.array(features, dtype=np.float32)

        # Pad to 128 dimensions
        if len(features) < 128:
            features = np.pad(features, (0, 128 - len(features)))
        else:
            features = features[:128]

        return features

    @staticmethod
    def extract_sequence_features(
        transactions: List[Dict],
        seq_len: int = 10
    ) -> np.ndarray:
        """
        Extract features from a sequence of transactions

        Args:
            transactions: List of transaction dictionaries
            seq_len: Desired sequence length

        Returns:
            Feature tensor of shape (seq_len, feature_dim)
        """
        features_list = []

        for tx in transactions[-seq_len:]:
            features = TransactionFeatureExtractor.extract_features(tx)
            features_list.append(features)

        # Pad if necessary
        while len(features_list) < seq_len:
            features_list.insert(0, np.zeros(128, dtype=np.float32))

        return np.array(features_list, dtype=np.float32)


class PatternDetector:
    """
    High-level pattern detection wrapper
    """

    PATTERN_NAMES = [
        'NORMAL',
        'STRUCTURING',
        'RAPID_MOVEMENT',
        'MIXING',
        'HIGH_VOLUME',
        'SANCTION_INTERACTION'
    ]

    def __init__(self, model: TransactionPatternAnalyzer, device: str = 'cpu'):
        self.model = model
        self.device = device
        self.model.to(device)
        self.model.eval()

    def analyze_transaction(
        self,
        transaction_sequence: List[Dict],
        threshold: float = 0.5
    ) -> Dict:
        """
        Analyze a sequence of transactions

        Args:
            transaction_sequence: List of transaction dictionaries
            threshold: Anomaly threshold

        Returns:
            Dictionary containing analysis results
        """
        # Extract features
        features = TransactionFeatureExtractor.extract_sequence_features(
            transaction_sequence
        )

        # Convert to tensor
        x = torch.FloatTensor(features).unsqueeze(0).to(self.device)

        # Run inference
        with torch.no_grad():
            output = self.model(x, return_attention=True)

        # Parse results
        pattern_probs = F.softmax(output['pattern_logits'], dim=-1)[0]
        pattern_idx = pattern_probs.argmax().item()
        anomaly_score = output['anomaly_score'][0].item()

        is_suspicious = anomaly_score > threshold

        return {
            'pattern_type': self.PATTERN_NAMES[pattern_idx],
            'pattern_confidence': pattern_probs[pattern_idx].item(),
            'pattern_probabilities': {
                name: prob.item()
                for name, prob in zip(self.PATTERN_NAMES, pattern_probs)
            },
            'anomaly_score': anomaly_score,
            'is_suspicious': is_suspicious,
            'embedding': output['embeddings'][0].cpu().numpy(),
            'attention_weights': output['attention_weights'][0].cpu().numpy()
        }

    def batch_analyze(
        self,
        transaction_sequences: List[List[Dict]],
        threshold: float = 0.5
    ) -> List[Dict]:
        """
        Analyze multiple transaction sequences in batch

        Args:
            transaction_sequences: List of transaction sequence lists
            threshold: Anomaly threshold

        Returns:
            List of analysis results
        """
        results = []

        for seq in transaction_sequences:
            result = self.analyze_transaction(seq, threshold)
            results.append(result)

        return results
