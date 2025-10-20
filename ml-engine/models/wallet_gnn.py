"""
Wallet Graph Neural Network
Analyzes relationships between wallets using graph neural networks
"""

import torch
import torch.nn as nn
import torch.nn.functional as F
from torch_geometric.nn import GATConv, global_mean_pool, global_max_pool
from torch_geometric.data import Data, Batch
import networkx as nx
from typing import Dict, List, Tuple, Optional
import numpy as np


class WalletGNN(nn.Module):
    """
    Graph Neural Network for analyzing wallet relationships and money flow patterns
    Uses Graph Attention Networks (GAT) for learning wallet embeddings
    """

    def __init__(
        self,
        input_dim: int = 64,
        hidden_dim: int = 128,
        output_dim: int = 32,
        num_layers: int = 4,
        heads: int = 4,
        dropout: float = 0.3
    ):
        super(WalletGNN, self).__init__()

        self.input_dim = input_dim
        self.hidden_dim = hidden_dim
        self.output_dim = output_dim
        self.num_layers = num_layers

        # Input projection
        self.input_proj = nn.Linear(input_dim, hidden_dim)

        # GAT layers
        self.gat_layers = nn.ModuleList()
        self.batch_norms = nn.ModuleList()

        for i in range(num_layers):
            if i == 0:
                in_channels = hidden_dim
            else:
                in_channels = hidden_dim * heads

            # Last layer has single head
            num_heads = 1 if i == num_layers - 1 else heads

            self.gat_layers.append(
                GATConv(
                    in_channels,
                    hidden_dim,
                    heads=num_heads,
                    dropout=dropout,
                    concat=(i != num_layers - 1)
                )
            )

            out_channels = hidden_dim * num_heads if i != num_layers - 1 else hidden_dim
            self.batch_norms.append(nn.BatchNorm1d(out_channels))

        # Edge feature network
        self.edge_encoder = nn.Sequential(
            nn.Linear(10, hidden_dim),  # 10 edge features
            nn.ReLU(),
            nn.Linear(hidden_dim, hidden_dim)
        )

        # Risk prediction head
        self.risk_predictor = nn.Sequential(
            nn.Linear(hidden_dim, hidden_dim // 2),
            nn.ReLU(),
            nn.Dropout(dropout),
            nn.Linear(hidden_dim // 2, 1),
            nn.Sigmoid()
        )

        # Community detection head
        self.community_classifier = nn.Sequential(
            nn.Linear(hidden_dim, hidden_dim // 2),
            nn.ReLU(),
            nn.Dropout(dropout),
            nn.Linear(hidden_dim // 2, 10)  # 10 community types
        )

        # Node embedding projection
        self.embedding_proj = nn.Linear(hidden_dim, output_dim)

        self.dropout = nn.Dropout(dropout)

    def forward(
        self,
        x: torch.Tensor,
        edge_index: torch.Tensor,
        edge_attr: Optional[torch.Tensor] = None,
        batch: Optional[torch.Tensor] = None
    ) -> Dict[str, torch.Tensor]:
        """
        Forward pass

        Args:
            x: Node features (num_nodes, input_dim)
            edge_index: Edge indices (2, num_edges)
            edge_attr: Edge features (num_edges, edge_dim)
            batch: Batch assignment vector (num_nodes,)

        Returns:
            Dictionary containing:
                - node_embeddings: Node embeddings
                - risk_scores: Risk score per node
                - community_logits: Community classification logits
                - graph_embedding: Graph-level embedding (if batch provided)
        """
        # Project input features
        x = self.input_proj(x)
        x = F.relu(x)

        # Process edge features if provided
        if edge_attr is not None:
            edge_embeddings = self.edge_encoder(edge_attr)
        else:
            edge_embeddings = None

        # Apply GAT layers
        for i, (gat_layer, bn) in enumerate(zip(self.gat_layers, self.batch_norms)):
            x_new = gat_layer(x, edge_index)
            x_new = bn(x_new)

            if i < self.num_layers - 1:
                x_new = F.elu(x_new)
                x_new = self.dropout(x_new)

            x = x_new

        # Node-level predictions
        risk_scores = self.risk_predictor(x).squeeze(-1)
        community_logits = self.community_classifier(x)
        node_embeddings = self.embedding_proj(x)

        output = {
            'node_embeddings': node_embeddings,
            'risk_scores': risk_scores,
            'community_logits': community_logits
        }

        # Graph-level aggregation if batch is provided
        if batch is not None:
            graph_embedding = global_mean_pool(x, batch)
            output['graph_embedding'] = graph_embedding

        return output


class WalletGraphBuilder:
    """
    Builds transaction graphs from wallet and transaction data
    """

    @staticmethod
    def build_graph(
        wallets: List[Dict],
        transactions: List[Dict],
        lookback_window: int = 1000
    ) -> Data:
        """
        Build a PyTorch Geometric graph from wallet and transaction data

        Args:
            wallets: List of wallet dictionaries
            transactions: List of transaction dictionaries
            lookback_window: Number of recent transactions to consider

        Returns:
            PyTorch Geometric Data object
        """
        # Create address to index mapping
        address_to_idx = {wallet['address']: idx for idx, wallet in enumerate(wallets)}

        # Build node features
        node_features = []
        for wallet in wallets:
            features = WalletGraphBuilder._extract_wallet_features(wallet)
            node_features.append(features)

        node_features = np.array(node_features, dtype=np.float32)

        # Build edges and edge features
        edge_list = []
        edge_features = []

        for tx in transactions[-lookback_window:]:
            from_addr = tx.get('from')
            to_addr = tx.get('to')

            if from_addr in address_to_idx and to_addr in address_to_idx:
                from_idx = address_to_idx[from_addr]
                to_idx = address_to_idx[to_addr]

                edge_list.append([from_idx, to_idx])

                # Extract edge features
                edge_feat = WalletGraphBuilder._extract_edge_features(tx)
                edge_features.append(edge_feat)

        if len(edge_list) == 0:
            # No edges, create self-loops
            edge_list = [[i, i] for i in range(len(wallets))]
            edge_features = [np.zeros(10, dtype=np.float32) for _ in range(len(wallets))]

        edge_index = np.array(edge_list, dtype=np.int64).T
        edge_attr = np.array(edge_features, dtype=np.float32)

        # Create PyG Data object
        data = Data(
            x=torch.FloatTensor(node_features),
            edge_index=torch.LongTensor(edge_index),
            edge_attr=torch.FloatTensor(edge_attr)
        )

        return data

    @staticmethod
    def _extract_wallet_features(wallet: Dict) -> np.ndarray:
        """Extract features for a single wallet"""
        features = []

        # Balance features
        balance = float(wallet.get('balance', 0))
        features.extend([
            balance,
            np.log1p(balance),
        ])

        # Transaction count features
        tx_count = float(wallet.get('transaction_count', 0))
        features.extend([
            tx_count,
            np.log1p(tx_count),
        ])

        # Counterparty features
        unique_counterparties = float(wallet.get('unique_counterparties', 0))
        features.append(unique_counterparties)

        # Amount statistics
        avg_amount = float(wallet.get('avg_transaction_amount', 0))
        max_amount = float(wallet.get('max_transaction_amount', 0))
        total_volume = float(wallet.get('total_volume', 0))
        features.extend([
            avg_amount,
            max_amount,
            total_volume,
            np.log1p(total_volume),
        ])

        # Temporal features
        account_age = float(wallet.get('account_age', 0))
        last_activity = float(wallet.get('last_activity', 0))
        features.extend([
            account_age,
            last_activity,
        ])

        # Pad to 64 dimensions
        features = np.array(features, dtype=np.float32)
        if len(features) < 64:
            features = np.pad(features, (0, 64 - len(features)))
        else:
            features = features[:64]

        return features

    @staticmethod
    def _extract_edge_features(transaction: Dict) -> np.ndarray:
        """Extract features for a transaction edge"""
        features = []

        # Amount features
        amount = float(transaction.get('amount', 0))
        features.extend([
            amount,
            np.log1p(amount),
        ])

        # Gas features
        gas_price = float(transaction.get('gas_price', 0))
        gas_used = float(transaction.get('gas_used', 0))
        features.extend([
            gas_price,
            gas_used,
        ])

        # Temporal features
        timestamp = float(transaction.get('timestamp', 0))
        features.append(timestamp % 86400)  # Time of day

        # Success flag
        success = float(transaction.get('success', 1))
        features.append(success)

        # Pad to 10 dimensions
        features = np.array(features, dtype=np.float32)
        if len(features) < 10:
            features = np.pad(features, (0, 10 - len(features)))
        else:
            features = features[:10]

        return features


class WalletNetworkAnalyzer:
    """
    High-level analyzer for wallet networks
    """

    COMMUNITY_TYPES = [
        'NORMAL',
        'EXCHANGE',
        'MIXER',
        'GAMBLING',
        'DEFI_PROTOCOL',
        'NFT_MARKETPLACE',
        'SCAM',
        'SANCTIONED',
        'MINING_POOL',
        'OTHER'
    ]

    def __init__(self, model: WalletGNN, device: str = 'cpu'):
        self.model = model
        self.device = device
        self.model.to(device)
        self.model.eval()

    def analyze_network(
        self,
        wallets: List[Dict],
        transactions: List[Dict]
    ) -> Dict:
        """
        Analyze a wallet network

        Args:
            wallets: List of wallet dictionaries
            transactions: List of transaction dictionaries

        Returns:
            Dictionary containing analysis results
        """
        # Build graph
        graph = WalletGraphBuilder.build_graph(wallets, transactions)
        graph = graph.to(self.device)

        # Run inference
        with torch.no_grad():
            output = self.model(
                graph.x,
                graph.edge_index,
                graph.edge_attr
            )

        # Parse results
        risk_scores = output['risk_scores'].cpu().numpy()
        embeddings = output['node_embeddings'].cpu().numpy()
        community_probs = F.softmax(output['community_logits'], dim=-1).cpu().numpy()

        # Build result for each wallet
        wallet_analyses = []
        for i, wallet in enumerate(wallets):
            community_idx = community_probs[i].argmax()

            wallet_analyses.append({
                'address': wallet['address'],
                'risk_score': float(risk_scores[i]),
                'embedding': embeddings[i],
                'community_type': self.COMMUNITY_TYPES[community_idx],
                'community_confidence': float(community_probs[i][community_idx]),
                'community_probabilities': {
                    ctype: float(prob)
                    for ctype, prob in zip(self.COMMUNITY_TYPES, community_probs[i])
                }
            })

        # Network-level statistics
        network_stats = {
            'num_wallets': len(wallets),
            'num_transactions': len(transactions),
            'avg_risk_score': float(risk_scores.mean()),
            'max_risk_score': float(risk_scores.max()),
            'high_risk_wallets': int((risk_scores > 0.7).sum()),
            'community_distribution': {
                ctype: int((community_probs.argmax(axis=1) == i).sum())
                for i, ctype in enumerate(self.COMMUNITY_TYPES)
            }
        }

        return {
            'wallet_analyses': wallet_analyses,
            'network_stats': network_stats
        }

    def detect_suspicious_clusters(
        self,
        wallets: List[Dict],
        transactions: List[Dict],
        risk_threshold: float = 0.7
    ) -> List[List[str]]:
        """
        Detect clusters of suspicious wallets

        Args:
            wallets: List of wallet dictionaries
            transactions: List of transaction dictionaries
            risk_threshold: Risk score threshold

        Returns:
            List of suspicious wallet clusters (each cluster is a list of addresses)
        """
        # Build NetworkX graph for community detection
        G = nx.DiGraph()

        address_to_idx = {wallet['address']: idx for idx, wallet in enumerate(wallets)}

        for wallet in wallets:
            G.add_node(wallet['address'])

        for tx in transactions:
            from_addr = tx.get('from')
            to_addr = tx.get('to')
            if from_addr in address_to_idx and to_addr in address_to_idx:
                G.add_edge(from_addr, to_addr)

        # Get risk scores
        analysis = self.analyze_network(wallets, transactions)

        # Filter high-risk wallets
        high_risk_addresses = [
            w['address'] for w in analysis['wallet_analyses']
            if w['risk_score'] > risk_threshold
        ]

        # Find connected components among high-risk wallets
        high_risk_graph = G.subgraph(high_risk_addresses)
        clusters = list(nx.weakly_connected_components(high_risk_graph))

        return [list(cluster) for cluster in clusters]
