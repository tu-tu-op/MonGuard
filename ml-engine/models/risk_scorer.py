"""
Risk Scoring Engine
Combines transaction pattern analysis and wallet network analysis for comprehensive risk assessment
"""

import torch
import torch.nn as nn
from typing import Dict, List, Optional
import numpy as np
from .transaction_pattern_analyzer import TransactionPatternAnalyzer, PatternDetector
from .wallet_gnn import WalletGNN, WalletNetworkAnalyzer


class RiskScoringEngine(nn.Module):
    """
    Unified risk scoring engine that combines multiple AI models
    """

    def __init__(
        self,
        pattern_model: TransactionPatternAnalyzer,
        network_model: WalletGNN,
        fusion_dim: int = 96,
        hidden_dim: int = 192
    ):
        super(RiskScoringEngine, self).__init__()

        self.pattern_model = pattern_model
        self.network_model = network_model

        # Feature fusion network
        # Combines pattern embeddings (64) + network embeddings (32)
        embedding_dim = 64 + 32

        self.fusion_network = nn.Sequential(
            nn.Linear(embedding_dim, fusion_dim),
            nn.BatchNorm1d(fusion_dim),
            nn.ReLU(),
            nn.Dropout(0.25),
            nn.Linear(fusion_dim, hidden_dim),
            nn.ReLU(),
            nn.Dropout(0.25),
        )

        # Final risk scorer
        self.risk_head = nn.Sequential(
            nn.Linear(hidden_dim, hidden_dim // 2),
            nn.ReLU(),
            nn.Linear(hidden_dim // 2, 1),
            nn.Sigmoid()
        )

        # Risk level classifier (LOW, MEDIUM, HIGH, CRITICAL)
        self.risk_level_classifier = nn.Sequential(
            nn.Linear(hidden_dim, hidden_dim // 2),
            nn.ReLU(),
            nn.Linear(hidden_dim // 2, 4)
        )

        # Confidence estimator
        self.confidence_estimator = nn.Sequential(
            nn.Linear(hidden_dim, hidden_dim // 2),
            nn.ReLU(),
            nn.Linear(hidden_dim // 2, 1),
            nn.Sigmoid()
        )

    def forward(
        self,
        transaction_features: torch.Tensor,
        node_features: torch.Tensor,
        edge_index: torch.Tensor,
        edge_attr: Optional[torch.Tensor] = None
    ) -> Dict[str, torch.Tensor]:
        """
        Forward pass

        Args:
            transaction_features: Transaction sequence features
            node_features: Wallet node features
            edge_index: Transaction graph edge indices
            edge_attr: Edge attributes

        Returns:
            Dictionary containing risk predictions
        """
        # Get pattern embeddings
        pattern_output = self.pattern_model(transaction_features)
        pattern_embeddings = pattern_output['embeddings']

        # Get network embeddings
        network_output = self.network_model(
            node_features,
            edge_index,
            edge_attr
        )
        network_embeddings = network_output['node_embeddings']

        # For transaction-level scoring, we need to align dimensions
        # Take mean network embedding as context
        network_context = network_embeddings.mean(dim=0, keepdim=True)
        network_context = network_context.expand(pattern_embeddings.size(0), -1)

        # Fuse embeddings
        fused = torch.cat([pattern_embeddings, network_context], dim=-1)
        fused_features = self.fusion_network(fused)

        # Generate predictions
        risk_score = self.risk_head(fused_features).squeeze(-1)
        risk_level_logits = self.risk_level_classifier(fused_features)
        confidence = self.confidence_estimator(fused_features).squeeze(-1)

        return {
            'risk_score': risk_score,
            'risk_level_logits': risk_level_logits,
            'confidence': confidence,
            'pattern_embeddings': pattern_embeddings,
            'network_embeddings': network_embeddings,
            'fused_features': fused_features
        }


class ComprehensiveRiskAssessor:
    """
    High-level risk assessment system that combines all models
    """

    RISK_LEVELS = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']

    def __init__(
        self,
        pattern_detector: PatternDetector,
        network_analyzer: WalletNetworkAnalyzer,
        device: str = 'cpu'
    ):
        self.pattern_detector = pattern_detector
        self.network_analyzer = network_analyzer
        self.device = device

    def assess_transaction_risk(
        self,
        transaction_sequence: List[Dict],
        wallet_context: Dict,
        network_data: Optional[Dict] = None
    ) -> Dict:
        """
        Comprehensive risk assessment for a transaction

        Args:
            transaction_sequence: Sequence of transactions
            wallet_context: Context about the wallet
            network_data: Optional network context (wallets, transactions)

        Returns:
            Comprehensive risk assessment
        """
        # Pattern analysis
        pattern_result = self.pattern_detector.analyze_transaction(
            transaction_sequence
        )

        # Network analysis if data available
        if network_data:
            network_result = self.network_analyzer.analyze_network(
                network_data['wallets'],
                network_data['transactions']
            )

            # Find wallet in network results
            wallet_address = wallet_context.get('address')
            wallet_network_data = next(
                (w for w in network_result['wallet_analyses']
                 if w['address'] == wallet_address),
                None
            )
        else:
            network_result = None
            wallet_network_data = None

        # Combine risk scores
        risk_scores = []
        risk_factors = []

        # Pattern-based risk
        pattern_risk = pattern_result['anomaly_score']
        risk_scores.append(pattern_risk)
        if pattern_risk > 0.5:
            risk_factors.append({
                'factor': 'Suspicious Pattern',
                'type': pattern_result['pattern_type'],
                'confidence': pattern_result['pattern_confidence'],
                'weight': 0.4
            })

        # Network-based risk
        if wallet_network_data:
            network_risk = wallet_network_data['risk_score']
            risk_scores.append(network_risk)
            if network_risk > 0.5:
                risk_factors.append({
                    'factor': 'Network Risk',
                    'type': wallet_network_data['community_type'],
                    'confidence': wallet_network_data['community_confidence'],
                    'weight': 0.3
                })

        # Historical behavior risk
        historical_risk = self._calculate_historical_risk(wallet_context)
        risk_scores.append(historical_risk)
        if historical_risk > 0.5:
            risk_factors.append({
                'factor': 'Historical Behavior',
                'weight': 0.3
            })

        # Calculate weighted final risk score
        if len(risk_scores) > 0:
            final_risk_score = np.mean(risk_scores)
        else:
            final_risk_score = 0.0

        # Determine risk level
        risk_level = self._score_to_level(final_risk_score)

        # Generate recommendations
        recommendations = self._generate_recommendations(
            final_risk_score,
            risk_level,
            pattern_result,
            wallet_network_data
        )

        return {
            'risk_score': float(final_risk_score),
            'risk_level': risk_level,
            'risk_factors': risk_factors,
            'pattern_analysis': pattern_result,
            'network_analysis': wallet_network_data,
            'recommendations': recommendations,
            'requires_review': final_risk_score > 0.7,
            'should_block': final_risk_score > 0.9
        }

    def assess_wallet_risk(
        self,
        wallet_address: str,
        wallets: List[Dict],
        transactions: List[Dict]
    ) -> Dict:
        """
        Assess overall risk for a wallet

        Args:
            wallet_address: Address to assess
            wallets: List of all wallets in network
            transactions: List of transactions

        Returns:
            Wallet risk assessment
        """
        # Network analysis
        network_result = self.network_analyzer.analyze_network(
            wallets,
            transactions
        )

        # Find wallet
        wallet_data = next(
            (w for w in network_result['wallet_analyses']
             if w['address'] == wallet_address),
            None
        )

        if not wallet_data:
            return {
                'error': 'Wallet not found in network'
            }

        # Get wallet's transactions
        wallet_txs = [
            tx for tx in transactions
            if tx.get('from') == wallet_address or tx.get('to') == wallet_address
        ]

        # Pattern analysis on recent transactions
        if len(wallet_txs) > 0:
            pattern_result = self.pattern_detector.analyze_transaction(
                wallet_txs[-10:]  # Last 10 transactions
            )
        else:
            pattern_result = None

        # Calculate comprehensive risk
        risk_components = {
            'network_risk': wallet_data['risk_score'],
            'pattern_risk': pattern_result['anomaly_score'] if pattern_result else 0.0,
            'community_risk': self._community_risk_score(
                wallet_data['community_type']
            )
        }

        final_risk = np.mean(list(risk_components.values()))
        risk_level = self._score_to_level(final_risk)

        return {
            'address': wallet_address,
            'risk_score': float(final_risk),
            'risk_level': risk_level,
            'risk_components': risk_components,
            'network_data': wallet_data,
            'pattern_data': pattern_result,
            'transaction_count': len(wallet_txs),
            'requires_monitoring': final_risk > 0.5
        }

    def _calculate_historical_risk(self, wallet_context: Dict) -> float:
        """Calculate risk based on historical behavior"""
        risk = 0.0

        # High transaction velocity
        tx_count = wallet_context.get('transaction_count', 0)
        account_age = wallet_context.get('account_age', 1)
        if account_age > 0:
            velocity = tx_count / account_age
            if velocity > 100:  # More than 100 tx per day
                risk += 0.3

        # Large volume movements
        total_volume = wallet_context.get('total_volume', 0)
        balance = wallet_context.get('balance', 1)
        if balance > 0:
            volume_ratio = total_volume / balance
            if volume_ratio > 100:  # Turnover ratio
                risk += 0.3

        # Diverse counterparty interaction
        unique_counterparties = wallet_context.get('unique_counterparties', 0)
        if unique_counterparties > 1000:
            risk += 0.2

        # Recent activity spike
        last_activity = wallet_context.get('last_activity', 0)
        if last_activity < 86400:  # Active in last 24h
            recent_activity = wallet_context.get('recent_activity_level', 0)
            if recent_activity > 0.8:
                risk += 0.2

        return min(risk, 1.0)

    def _community_risk_score(self, community_type: str) -> float:
        """Get risk score based on community type"""
        risk_scores = {
            'NORMAL': 0.1,
            'EXCHANGE': 0.2,
            'MIXER': 0.9,
            'GAMBLING': 0.6,
            'DEFI_PROTOCOL': 0.3,
            'NFT_MARKETPLACE': 0.2,
            'SCAM': 1.0,
            'SANCTIONED': 1.0,
            'MINING_POOL': 0.1,
            'OTHER': 0.5
        }
        return risk_scores.get(community_type, 0.5)

    def _score_to_level(self, score: float) -> str:
        """Convert score to risk level"""
        if score >= 0.9:
            return 'CRITICAL'
        elif score >= 0.7:
            return 'HIGH'
        elif score >= 0.4:
            return 'MEDIUM'
        else:
            return 'LOW'

    def _generate_recommendations(
        self,
        risk_score: float,
        risk_level: str,
        pattern_result: Dict,
        network_data: Optional[Dict]
    ) -> List[str]:
        """Generate actionable recommendations"""
        recommendations = []

        if risk_score > 0.9:
            recommendations.append("BLOCK: Immediate transaction blocking recommended")
            recommendations.append("REPORT: File Suspicious Activity Report (SAR)")

        if risk_score > 0.7:
            recommendations.append("DELAY: Hold transaction for manual review")
            recommendations.append("INVESTIGATE: Deep dive into transaction history")

        if pattern_result['pattern_type'] == 'STRUCTURING':
            recommendations.append("Monitor for structured transaction patterns")

        if pattern_result['pattern_type'] == 'MIXING':
            recommendations.append("Investigate potential use of mixing services")

        if network_data and network_data['community_type'] in ['MIXER', 'SCAM', 'SANCTIONED']:
            recommendations.append(f"High-risk community detected: {network_data['community_type']}")

        if risk_score > 0.5:
            recommendations.append("ENHANCE: Request additional KYC documentation")

        if not recommendations:
            recommendations.append("PROCEED: Transaction appears normal")

        return recommendations
