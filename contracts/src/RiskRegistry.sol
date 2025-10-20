// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title RiskRegistry
 * @dev Manages risk scores for addresses on-chain
 * @notice This contract stores and manages risk assessments for wallets and contracts
 */
contract RiskRegistry is AccessControl, ReentrancyGuard {
    bytes32 public constant ORACLE_ROLE = keccak256("ORACLE_ROLE");
    bytes32 public constant AUDITOR_ROLE = keccak256("AUDITOR_ROLE");

    // Risk levels
    enum RiskLevel {
        NONE,       // 0 - No risk identified
        LOW,        // 1 - Low risk
        MEDIUM,     // 2 - Medium risk
        HIGH,       // 3 - High risk
        CRITICAL    // 4 - Critical risk (sanctioned/blocked)
    }

    // Risk assessment structure
    struct RiskAssessment {
        RiskLevel level;
        uint256 score;          // 0-100 numerical risk score
        uint256 timestamp;
        string reason;
        address assessor;
        bool active;
    }

    // Address => RiskAssessment mapping
    mapping(address => RiskAssessment) private riskAssessments;

    // Track addresses by risk level for efficient querying
    mapping(RiskLevel => address[]) private addressesByRisk;

    // Total assessments counter
    uint256 public totalAssessments;

    // Events
    event RiskAssessed(
        address indexed target,
        RiskLevel level,
        uint256 score,
        string reason,
        address indexed assessor
    );

    event RiskUpdated(
        address indexed target,
        RiskLevel oldLevel,
        RiskLevel newLevel,
        uint256 newScore
    );

    event RiskCleared(address indexed target, address indexed clearedBy);

    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ORACLE_ROLE, msg.sender);
        _grantRole(AUDITOR_ROLE, msg.sender);
    }

    /**
     * @dev Assess risk for a target address
     * @param target The address to assess
     * @param level Risk level enum
     * @param score Numerical score 0-100
     * @param reason Description of risk factors
     */
    function assessRisk(
        address target,
        RiskLevel level,
        uint256 score,
        string calldata reason
    ) external onlyRole(ORACLE_ROLE) {
        require(target != address(0), "Invalid target address");
        require(score <= 100, "Score must be 0-100");
        require(bytes(reason).length > 0, "Reason required");

        RiskAssessment storage assessment = riskAssessments[target];
        RiskLevel oldLevel = assessment.level;

        // Update assessment
        assessment.level = level;
        assessment.score = score;
        assessment.timestamp = block.timestamp;
        assessment.reason = reason;
        assessment.assessor = msg.sender;
        assessment.active = true;

        // Track by risk level
        addressesByRisk[level].push(target);

        if (oldLevel == RiskLevel.NONE) {
            totalAssessments++;
            emit RiskAssessed(target, level, score, reason, msg.sender);
        } else {
            emit RiskUpdated(target, oldLevel, level, score);
        }
    }

    /**
     * @dev Update risk score for existing assessment
     * @param target The address to update
     * @param newScore New risk score
     */
    function updateRiskScore(
        address target,
        uint256 newScore
    ) external onlyRole(ORACLE_ROLE) {
        require(newScore <= 100, "Score must be 0-100");
        RiskAssessment storage assessment = riskAssessments[target];
        require(assessment.active, "No active assessment");

        RiskLevel oldLevel = assessment.level;
        assessment.score = newScore;
        assessment.timestamp = block.timestamp;

        // Recalculate level based on score
        RiskLevel newLevel = _scoreToLevel(newScore);
        if (newLevel != oldLevel) {
            assessment.level = newLevel;
            addressesByRisk[newLevel].push(target);
            emit RiskUpdated(target, oldLevel, newLevel, newScore);
        }
    }

    /**
     * @dev Clear risk assessment for an address
     * @param target The address to clear
     */
    function clearRisk(address target) external onlyRole(AUDITOR_ROLE) {
        RiskAssessment storage assessment = riskAssessments[target];
        require(assessment.active, "No active assessment");

        assessment.active = false;
        emit RiskCleared(target, msg.sender);
    }

    /**
     * @dev Get risk assessment for an address
     * @param target The address to query
     * @return RiskAssessment struct
     */
    function getRiskAssessment(
        address target
    ) external view returns (RiskAssessment memory) {
        return riskAssessments[target];
    }

    /**
     * @dev Check if address is high risk or critical
     * @param target The address to check
     * @return bool True if high risk or critical
     */
    function isHighRisk(address target) external view returns (bool) {
        RiskAssessment memory assessment = riskAssessments[target];
        return assessment.active &&
               (assessment.level == RiskLevel.HIGH ||
                assessment.level == RiskLevel.CRITICAL);
    }

    /**
     * @dev Get risk level for an address
     * @param target The address to check
     * @return RiskLevel enum
     */
    function getRiskLevel(address target) external view returns (RiskLevel) {
        return riskAssessments[target].active
            ? riskAssessments[target].level
            : RiskLevel.NONE;
    }

    /**
     * @dev Get numerical risk score for an address
     * @param target The address to check
     * @return uint256 score (0-100)
     */
    function getRiskScore(address target) external view returns (uint256) {
        return riskAssessments[target].active
            ? riskAssessments[target].score
            : 0;
    }

    /**
     * @dev Get all addresses at a specific risk level
     * @param level The risk level to query
     * @return address[] array of addresses
     */
    function getAddressesByRiskLevel(
        RiskLevel level
    ) external view returns (address[] memory) {
        return addressesByRisk[level];
    }

    /**
     * @dev Internal function to convert score to risk level
     * @param score Numerical score 0-100
     * @return RiskLevel enum
     */
    function _scoreToLevel(uint256 score) internal pure returns (RiskLevel) {
        if (score >= 90) return RiskLevel.CRITICAL;
        if (score >= 70) return RiskLevel.HIGH;
        if (score >= 40) return RiskLevel.MEDIUM;
        if (score >= 10) return RiskLevel.LOW;
        return RiskLevel.NONE;
    }
}
