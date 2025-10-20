"""
MonGuard Python SDK
For integrating ML models with blockchain compliance contracts
"""

from web3 import Web3
from eth_account import Account
from typing import Dict, List, Optional, Tuple
import json
from dataclasses import dataclass
from enum import Enum


class RiskLevel(Enum):
    """Risk level enumeration"""
    NONE = 0
    LOW = 1
    MEDIUM = 2
    HIGH = 3
    CRITICAL = 4


class PatternType(Enum):
    """Transaction pattern types"""
    NORMAL = 0
    STRUCTURING = 1
    RAPID_MOVEMENT = 2
    MIXING = 3
    HIGH_VOLUME = 4
    SANCTION_INTERACTION = 5


@dataclass
class RiskAssessment:
    """Risk assessment data structure"""
    level: RiskLevel
    score: int
    timestamp: int
    reason: str
    assessor: str
    active: bool


@dataclass
class TransactionAnalysis:
    """Transaction analysis result"""
    tx_hash: str
    from_address: str
    to_address: str
    amount: int
    pattern: PatternType
    severity: int
    anomaly_score: int
    timestamp: int
    flagged: bool
    notes: str


class MonGuardSDK:
    """
    MonGuard SDK for Python
    Connects ML models to blockchain compliance infrastructure
    """

    def __init__(
        self,
        rpc_url: str,
        risk_registry_address: str,
        compliance_oracle_address: str,
        transaction_monitor_address: str,
        private_key: Optional[str] = None
    ):
        """
        Initialize MonGuard SDK

        Args:
            rpc_url: Monad RPC endpoint
            risk_registry_address: RiskRegistry contract address
            compliance_oracle_address: ComplianceOracle contract address
            transaction_monitor_address: TransactionMonitor contract address
            private_key: Private key for signing transactions (optional)
        """
        self.w3 = Web3(Web3.HTTPProvider(rpc_url))

        if not self.w3.is_connected():
            raise ConnectionError("Failed to connect to blockchain")

        # Set up account if private key provided
        self.account = None
        if private_key:
            self.account = Account.from_key(private_key)

        # Contract ABIs (simplified)
        risk_registry_abi = [
            {
                "inputs": [{"name": "target", "type": "address"}],
                "name": "getRiskScore",
                "outputs": [{"name": "", "type": "uint256"}],
                "stateMutability": "view",
                "type": "function"
            },
            {
                "inputs": [
                    {"name": "target", "type": "address"},
                    {"name": "level", "type": "uint8"},
                    {"name": "score", "type": "uint256"},
                    {"name": "reason", "type": "string"}
                ],
                "name": "assessRisk",
                "outputs": [],
                "stateMutability": "nonpayable",
                "type": "function"
            }
        ]

        compliance_oracle_abi = [
            {
                "inputs": [{"name": "target", "type": "address"}],
                "name": "isSanctioned",
                "outputs": [{"name": "", "type": "bool"}],
                "stateMutability": "view",
                "type": "function"
            }
        ]

        transaction_monitor_abi = [
            {
                "inputs": [
                    {"name": "txHash", "type": "bytes32"},
                    {"name": "from", "type": "address"},
                    {"name": "to", "type": "address"},
                    {"name": "amount", "type": "uint256"},
                    {"name": "pattern", "type": "uint8"},
                    {"name": "anomalyScore", "type": "uint256"},
                    {"name": "notes", "type": "string"}
                ],
                "name": "analyzeTransaction",
                "outputs": [],
                "stateMutability": "nonpayable",
                "type": "function"
            }
        ]

        # Initialize contracts
        self.risk_registry = self.w3.eth.contract(
            address=Web3.to_checksum_address(risk_registry_address),
            abi=risk_registry_abi
        )

        self.compliance_oracle = self.w3.eth.contract(
            address=Web3.to_checksum_address(compliance_oracle_address),
            abi=compliance_oracle_abi
        )

        self.transaction_monitor = self.w3.eth.contract(
            address=Web3.to_checksum_address(transaction_monitor_address),
            abi=transaction_monitor_abi
        )

    def get_risk_score(self, address: str) -> int:
        """
        Get risk score for an address

        Args:
            address: Address to check

        Returns:
            Risk score (0-100)
        """
        return self.risk_registry.functions.getRiskScore(
            Web3.to_checksum_address(address)
        ).call()

    def is_sanctioned(self, address: str) -> bool:
        """
        Check if address is sanctioned

        Args:
            address: Address to check

        Returns:
            True if sanctioned
        """
        return self.compliance_oracle.functions.isSanctioned(
            Web3.to_checksum_address(address)
        ).call()

    def assess_risk(
        self,
        address: str,
        risk_level: RiskLevel,
        score: int,
        reason: str
    ) -> str:
        """
        Submit risk assessment to blockchain

        Args:
            address: Address to assess
            risk_level: Risk level enum
            score: Risk score (0-100)
            reason: Reason for assessment

        Returns:
            Transaction hash
        """
        if not self.account:
            raise ValueError("Account not configured for transactions")

        # Build transaction
        tx = self.risk_registry.functions.assessRisk(
            Web3.to_checksum_address(address),
            risk_level.value,
            score,
            reason
        ).build_transaction({
            'from': self.account.address,
            'nonce': self.w3.eth.get_transaction_count(self.account.address),
            'gas': 200000,
            'gasPrice': self.w3.eth.gas_price
        })

        # Sign and send
        signed_tx = self.w3.eth.account.sign_transaction(tx, self.account.key)
        tx_hash = self.w3.eth.send_raw_transaction(signed_tx.rawTransaction)

        return tx_hash.hex()

    def submit_transaction_analysis(
        self,
        tx_hash: str,
        from_address: str,
        to_address: str,
        amount: int,
        pattern: PatternType,
        anomaly_score: int,
        notes: str
    ) -> str:
        """
        Submit transaction analysis to blockchain

        Args:
            tx_hash: Transaction hash
            from_address: Sender address
            to_address: Receiver address
            amount: Transaction amount
            pattern: Detected pattern type
            anomaly_score: Anomaly score (0-100)
            notes: Analysis notes

        Returns:
            Transaction hash
        """
        if not self.account:
            raise ValueError("Account not configured for transactions")

        # Convert tx_hash to bytes32
        if isinstance(tx_hash, str):
            if tx_hash.startswith('0x'):
                tx_hash = tx_hash[2:]
            tx_hash_bytes = bytes.fromhex(tx_hash)
        else:
            tx_hash_bytes = tx_hash

        # Build transaction
        tx = self.transaction_monitor.functions.analyzeTransaction(
            tx_hash_bytes,
            Web3.to_checksum_address(from_address),
            Web3.to_checksum_address(to_address),
            amount,
            pattern.value,
            anomaly_score,
            notes
        ).build_transaction({
            'from': self.account.address,
            'nonce': self.w3.eth.get_transaction_count(self.account.address),
            'gas': 300000,
            'gasPrice': self.w3.eth.gas_price
        })

        # Sign and send
        signed_tx = self.w3.eth.account.sign_transaction(tx, self.account.key)
        result_tx_hash = self.w3.eth.send_raw_transaction(signed_tx.rawTransaction)

        return result_tx_hash.hex()

    def batch_assess_risks(
        self,
        assessments: List[Tuple[str, RiskLevel, int, str]]
    ) -> List[str]:
        """
        Submit multiple risk assessments

        Args:
            assessments: List of (address, risk_level, score, reason) tuples

        Returns:
            List of transaction hashes
        """
        tx_hashes = []

        for address, risk_level, score, reason in assessments:
            try:
                tx_hash = self.assess_risk(address, risk_level, score, reason)
                tx_hashes.append(tx_hash)
            except Exception as e:
                print(f"Error assessing {address}: {e}")
                tx_hashes.append(None)

        return tx_hashes

    def wait_for_transaction(self, tx_hash: str, timeout: int = 120) -> Dict:
        """
        Wait for transaction confirmation

        Args:
            tx_hash: Transaction hash to wait for
            timeout: Timeout in seconds

        Returns:
            Transaction receipt
        """
        receipt = self.w3.eth.wait_for_transaction_receipt(
            tx_hash,
            timeout=timeout
        )
        return dict(receipt)


class MLModelIntegration:
    """
    Integration layer between ML models and blockchain
    """

    def __init__(self, sdk: MonGuardSDK):
        """
        Initialize ML integration

        Args:
            sdk: MonGuardSDK instance
        """
        self.sdk = sdk

    def process_ml_prediction(
        self,
        address: str,
        prediction: Dict,
        threshold: float = 0.7
    ) -> str:
        """
        Process ML model prediction and submit to blockchain

        Args:
            address: Address analyzed
            prediction: ML model prediction result
            threshold: Risk threshold

        Returns:
            Transaction hash
        """
        # Extract prediction data
        risk_score = int(prediction.get('risk_score', 0) * 100)
        pattern_type = PatternType[prediction.get('pattern_type', 'NORMAL')]

        # Determine risk level
        if risk_score >= 90:
            risk_level = RiskLevel.CRITICAL
        elif risk_score >= 70:
            risk_level = RiskLevel.HIGH
        elif risk_score >= 40:
            risk_level = RiskLevel.MEDIUM
        elif risk_score >= 10:
            risk_level = RiskLevel.LOW
        else:
            risk_level = RiskLevel.NONE

        # Build reason
        reason = f"ML Analysis: {pattern_type.name} - Score: {risk_score}"

        # Submit to blockchain
        return self.sdk.assess_risk(address, risk_level, risk_score, reason)

    def sync_ml_results_to_chain(
        self,
        results: List[Dict]
    ) -> List[str]:
        """
        Sync multiple ML results to blockchain

        Args:
            results: List of ML prediction results

        Returns:
            List of transaction hashes
        """
        assessments = []

        for result in results:
            address = result['address']
            risk_score = int(result['risk_score'] * 100)

            # Determine risk level
            if risk_score >= 90:
                risk_level = RiskLevel.CRITICAL
            elif risk_score >= 70:
                risk_level = RiskLevel.HIGH
            elif risk_score >= 40:
                risk_level = RiskLevel.MEDIUM
            elif risk_score >= 10:
                risk_level = RiskLevel.LOW
            else:
                risk_level = RiskLevel.NONE

            reason = f"Automated ML assessment - {result.get('model_type', 'unknown')}"

            assessments.append((address, risk_level, risk_score, reason))

        return self.sdk.batch_assess_risks(assessments)
