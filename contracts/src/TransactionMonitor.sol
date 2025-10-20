// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./RiskRegistry.sol";
import "./ComplianceOracle.sol";

/**
 * @title TransactionMonitor
 * @dev Monitors and analyzes blockchain transactions for suspicious patterns
 * @notice Integrates with AI/ML backend for real-time anomaly detection
 */
contract TransactionMonitor is AccessControl, ReentrancyGuard {
    bytes32 public constant MONITOR_ROLE = keccak256("MONITOR_ROLE");
    bytes32 public constant AI_ORACLE_ROLE = keccak256("AI_ORACLE_ROLE");

    RiskRegistry public immutable riskRegistry;
    ComplianceOracle public immutable complianceOracle;

    // Transaction pattern types
    enum PatternType {
        NORMAL,
        STRUCTURING,        // Breaking up large transactions
        RAPID_MOVEMENT,     // Quick transfers through multiple wallets
        MIXING,             // Using mixer/tumbler services
        HIGH_VOLUME,        // Unusually high transaction volume
        SANCTION_INTERACTION // Interaction with sanctioned addresses
    }

    // Alert severity levels
    enum AlertSeverity {
        INFO,
        LOW,
        MEDIUM,
        HIGH,
        CRITICAL
    }

    // Transaction analysis result
    struct TransactionAnalysis {
        bytes32 txHash;
        address from;
        address to;
        uint256 amount;
        PatternType pattern;
        AlertSeverity severity;
        uint256 anomalyScore;  // 0-100
        uint256 timestamp;
        bool flagged;
        string notes;
    }

    // Alert structure
    struct Alert {
        uint256 id;
        address target;
        PatternType pattern;
        AlertSeverity severity;
        string description;
        uint256 timestamp;
        bool resolved;
        address resolver;
    }

    // Storage
    mapping(bytes32 => TransactionAnalysis) public transactionAnalyses;
    mapping(address => bytes32[]) public addressTransactions;
    mapping(uint256 => Alert) public alerts;

    uint256 public alertCounter;
    uint256 public flaggedTransactionCount;

    // Thresholds
    uint256 public highRiskThreshold = 70;
    uint256 public criticalRiskThreshold = 90;
    uint256 public rapidMovementWindow = 1 hours;
    uint256 public highVolumeThreshold = 100 ether;

    // Events
    event TransactionAnalyzed(
        bytes32 indexed txHash,
        address indexed from,
        address indexed to,
        PatternType pattern,
        uint256 anomalyScore
    );

    event AlertCreated(
        uint256 indexed alertId,
        address indexed target,
        AlertSeverity severity,
        PatternType pattern
    );

    event AlertResolved(
        uint256 indexed alertId,
        address indexed resolver
    );

    event ThresholdUpdated(
        string thresholdType,
        uint256 oldValue,
        uint256 newValue
    );

    event SuspiciousPatternDetected(
        address indexed target,
        PatternType pattern,
        uint256 score
    );

    constructor(address _riskRegistry, address _complianceOracle) {
        require(_riskRegistry != address(0), "Invalid registry");
        require(_complianceOracle != address(0), "Invalid oracle");

        riskRegistry = RiskRegistry(_riskRegistry);
        complianceOracle = ComplianceOracle(_complianceOracle);

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(MONITOR_ROLE, msg.sender);
        _grantRole(AI_ORACLE_ROLE, msg.sender);
    }

    /**
     * @dev Analyze and record a transaction
     * @param txHash Transaction hash
     * @param from Sender address
     * @param to Receiver address
     * @param amount Transaction amount
     * @param pattern Detected pattern type
     * @param anomalyScore AI-generated anomaly score
     * @param notes Additional analysis notes
     */
    function analyzeTransaction(
        bytes32 txHash,
        address from,
        address to,
        uint256 amount,
        PatternType pattern,
        uint256 anomalyScore,
        string calldata notes
    ) external onlyRole(AI_ORACLE_ROLE) {
        require(anomalyScore <= 100, "Invalid anomaly score");

        AlertSeverity severity = _calculateSeverity(anomalyScore, pattern);
        bool flagged = anomalyScore >= highRiskThreshold ||
                       pattern != PatternType.NORMAL;

        TransactionAnalysis memory analysis = TransactionAnalysis({
            txHash: txHash,
            from: from,
            to: to,
            amount: amount,
            pattern: pattern,
            severity: severity,
            anomalyScore: anomalyScore,
            timestamp: block.timestamp,
            flagged: flagged,
            notes: notes
        });

        transactionAnalyses[txHash] = analysis;
        addressTransactions[from].push(txHash);
        addressTransactions[to].push(txHash);

        if (flagged) {
            flaggedTransactionCount++;
            _createAlert(from, pattern, severity, notes);
            _updateRiskScores(from, to, anomalyScore);
        }

        emit TransactionAnalyzed(txHash, from, to, pattern, anomalyScore);

        if (pattern != PatternType.NORMAL) {
            emit SuspiciousPatternDetected(from, pattern, anomalyScore);
        }
    }

    /**
     * @dev Create an alert for suspicious activity
     * @param target Address under suspicion
     * @param pattern Pattern detected
     * @param severity Alert severity
     * @param description Alert description
     */
    function _createAlert(
        address target,
        PatternType pattern,
        AlertSeverity severity,
        string memory description
    ) internal {
        alertCounter++;

        alerts[alertCounter] = Alert({
            id: alertCounter,
            target: target,
            pattern: pattern,
            severity: severity,
            description: description,
            timestamp: block.timestamp,
            resolved: false,
            resolver: address(0)
        });

        emit AlertCreated(alertCounter, target, severity, pattern);
    }

    /**
     * @dev Update risk scores in the registry
     * @param from Sender address
     * @param to Receiver address
     * @param anomalyScore Detected anomaly score
     */
    function _updateRiskScores(
        address from,
        address to,
        uint256 anomalyScore
    ) internal {
        // Update sender risk
        uint256 currentFromRisk = riskRegistry.getRiskScore(from);
        uint256 newFromRisk = (currentFromRisk + anomalyScore) / 2; // Average

        riskRegistry.assessRisk(
            from,
            _scoreToRiskLevel(newFromRisk),
            newFromRisk,
            "Automated risk update from transaction monitoring"
        );

        // Check if receiver is sanctioned
        if (complianceOracle.isSanctioned(to)) {
            riskRegistry.assessRisk(
                from,
                RiskRegistry.RiskLevel.CRITICAL,
                100,
                "Interaction with sanctioned address"
            );
        }
    }

    /**
     * @dev Resolve an alert
     * @param alertId Alert identifier
     */
    function resolveAlert(uint256 alertId) external onlyRole(MONITOR_ROLE) {
        Alert storage alert = alerts[alertId];
        require(!alert.resolved, "Alert already resolved");

        alert.resolved = true;
        alert.resolver = msg.sender;

        emit AlertResolved(alertId, msg.sender);
    }

    /**
     * @dev Update risk thresholds
     * @param newHighRisk New high risk threshold
     * @param newCritical New critical risk threshold
     */
    function updateThresholds(
        uint256 newHighRisk,
        uint256 newCritical
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(newHighRisk < newCritical, "Invalid thresholds");
        require(newCritical <= 100, "Threshold too high");

        emit ThresholdUpdated("highRisk", highRiskThreshold, newHighRisk);
        emit ThresholdUpdated("critical", criticalRiskThreshold, newCritical);

        highRiskThreshold = newHighRisk;
        criticalRiskThreshold = newCritical;
    }

    /**
     * @dev Get transaction analysis
     * @param txHash Transaction hash
     * @return TransactionAnalysis struct
     */
    function getTransactionAnalysis(
        bytes32 txHash
    ) external view returns (TransactionAnalysis memory) {
        return transactionAnalyses[txHash];
    }

    /**
     * @dev Get all transactions for an address
     * @param account Address to query
     * @return bytes32[] array of transaction hashes
     */
    function getAddressTransactions(
        address account
    ) external view returns (bytes32[] memory) {
        return addressTransactions[account];
    }

    /**
     * @dev Get alert details
     * @param alertId Alert identifier
     * @return Alert struct
     */
    function getAlert(uint256 alertId) external view returns (Alert memory) {
        return alerts[alertId];
    }

    /**
     * @dev Calculate severity from score and pattern
     * @param score Anomaly score
     * @param pattern Pattern type
     * @return AlertSeverity enum
     */
    function _calculateSeverity(
        uint256 score,
        PatternType pattern
    ) internal view returns (AlertSeverity) {
        if (pattern == PatternType.SANCTION_INTERACTION || score >= criticalRiskThreshold) {
            return AlertSeverity.CRITICAL;
        }
        if (pattern == PatternType.MIXING || score >= highRiskThreshold) {
            return AlertSeverity.HIGH;
        }
        if (pattern == PatternType.RAPID_MOVEMENT || score >= 50) {
            return AlertSeverity.MEDIUM;
        }
        if (pattern != PatternType.NORMAL || score >= 25) {
            return AlertSeverity.LOW;
        }
        return AlertSeverity.INFO;
    }

    /**
     * @dev Convert score to risk level
     * @param score Numerical score
     * @return RiskLevel enum
     */
    function _scoreToRiskLevel(
        uint256 score
    ) internal pure returns (RiskRegistry.RiskLevel) {
        if (score >= 90) return RiskRegistry.RiskLevel.CRITICAL;
        if (score >= 70) return RiskRegistry.RiskLevel.HIGH;
        if (score >= 40) return RiskRegistry.RiskLevel.MEDIUM;
        if (score >= 10) return RiskRegistry.RiskLevel.LOW;
        return RiskRegistry.RiskLevel.NONE;
    }
}
