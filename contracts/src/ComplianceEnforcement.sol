// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./RiskRegistry.sol";
import "./ComplianceOracle.sol";
import "./TransactionMonitor.sol";

/**
 * @title ComplianceEnforcement
 * @dev Automated enforcement and transaction blocking based on risk assessments
 * @notice Integrates with compliance systems to enforce regulatory actions
 */
contract ComplianceEnforcement is AccessControl, ReentrancyGuard {
    bytes32 public constant ENFORCER_ROLE = keccak256("ENFORCER_ROLE");
    bytes32 public constant WHITELIST_MANAGER_ROLE = keccak256("WHITELIST_MANAGER_ROLE");

    RiskRegistry public immutable riskRegistry;
    ComplianceOracle public immutable complianceOracle;
    TransactionMonitor public immutable transactionMonitor;

    // Enforcement actions
    enum EnforcementAction {
        NONE,
        WARN,           // Warning only, allow transaction
        DELAY,          // Delay transaction for review
        LIMIT,          // Limit transaction amount
        BLOCK,          // Block transaction completely
        FREEZE          // Freeze account entirely
    }

    // Account status
    struct AccountStatus {
        bool frozen;
        bool whitelisted;
        EnforcementAction defaultAction;
        uint256 dailyLimit;
        uint256 dailySpent;
        uint256 lastResetTimestamp;
        uint256 freezeTimestamp;
        address freezeInitiator;
        string freezeReason;
    }

    // Delayed transaction
    struct DelayedTransaction {
        bytes32 txId;
        address from;
        address to;
        uint256 amount;
        bytes data;
        uint256 delayUntil;
        bool executed;
        bool approved;
        address reviewer;
    }

    // Storage
    mapping(address => AccountStatus) public accountStatuses;
    mapping(bytes32 => DelayedTransaction) public delayedTransactions;
    mapping(address => bytes32[]) public accountDelayedTxs;

    uint256 public defaultDailyLimit = 1000 ether;
    uint256 public delayPeriod = 24 hours;
    bool public enforcementEnabled = true;

    // Events
    event AccountFrozen(
        address indexed account,
        address indexed initiator,
        string reason
    );

    event AccountUnfrozen(
        address indexed account,
        address indexed initiator
    );

    event TransactionBlocked(
        address indexed from,
        address indexed to,
        uint256 amount,
        string reason
    );

    event TransactionDelayed(
        bytes32 indexed txId,
        address indexed from,
        uint256 delayUntil
    );

    event TransactionApproved(
        bytes32 indexed txId,
        address indexed reviewer
    );

    event TransactionExecuted(
        bytes32 indexed txId,
        address indexed from,
        address indexed to
    );

    event DailyLimitExceeded(
        address indexed account,
        uint256 attempted,
        uint256 remaining
    );

    event AccountWhitelisted(
        address indexed account,
        address indexed whitelistedBy
    );

    constructor(
        address _riskRegistry,
        address _complianceOracle,
        address _transactionMonitor
    ) {
        require(_riskRegistry != address(0), "Invalid risk registry");
        require(_complianceOracle != address(0), "Invalid compliance oracle");
        require(_transactionMonitor != address(0), "Invalid transaction monitor");

        riskRegistry = RiskRegistry(_riskRegistry);
        complianceOracle = ComplianceOracle(_complianceOracle);
        transactionMonitor = TransactionMonitor(_transactionMonitor);

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ENFORCER_ROLE, msg.sender);
        _grantRole(WHITELIST_MANAGER_ROLE, msg.sender);
    }

    /**
     * @dev Check if transaction is allowed
     * @param from Sender address
     * @param to Receiver address
     * @param amount Transaction amount
     * @return allowed Whether transaction is allowed
     * @return action Enforcement action to take
     * @return reason Reason for action
     */
    function checkTransaction(
        address from,
        address to,
        uint256 amount
    ) external view returns (
        bool allowed,
        EnforcementAction action,
        string memory reason
    ) {
        if (!enforcementEnabled) {
            return (true, EnforcementAction.NONE, "");
        }

        AccountStatus memory fromStatus = accountStatuses[from];
        AccountStatus memory toStatus = accountStatuses[to];

        // Check whitelist
        if (fromStatus.whitelisted) {
            return (true, EnforcementAction.NONE, "Whitelisted");
        }

        // Check frozen accounts
        if (fromStatus.frozen) {
            return (false, EnforcementAction.FREEZE, "Account frozen");
        }

        if (toStatus.frozen) {
            return (false, EnforcementAction.BLOCK, "Recipient frozen");
        }

        // Check sanctions
        if (complianceOracle.isSanctioned(from)) {
            return (false, EnforcementAction.FREEZE, "Sender sanctioned");
        }

        if (complianceOracle.isSanctioned(to)) {
            return (false, EnforcementAction.BLOCK, "Recipient sanctioned");
        }

        // Check risk levels
        RiskRegistry.RiskLevel fromRisk = riskRegistry.getRiskLevel(from);
        RiskRegistry.RiskLevel toRisk = riskRegistry.getRiskLevel(to);

        if (fromRisk == RiskRegistry.RiskLevel.CRITICAL) {
            return (false, EnforcementAction.FREEZE, "Critical risk - sender");
        }

        if (toRisk == RiskRegistry.RiskLevel.CRITICAL) {
            return (false, EnforcementAction.BLOCK, "Critical risk - recipient");
        }

        if (fromRisk == RiskRegistry.RiskLevel.HIGH) {
            return (false, EnforcementAction.DELAY, "High risk - requires review");
        }

        // Check daily limits
        if (_checkDailyLimit(from, amount)) {
            return (false, EnforcementAction.LIMIT, "Daily limit exceeded");
        }

        return (true, EnforcementAction.NONE, "");
    }

    /**
     * @dev Freeze an account
     * @param account Account to freeze
     * @param reason Reason for freezing
     */
    function freezeAccount(
        address account,
        string calldata reason
    ) external onlyRole(ENFORCER_ROLE) {
        require(!accountStatuses[account].frozen, "Already frozen");

        accountStatuses[account].frozen = true;
        accountStatuses[account].freezeTimestamp = block.timestamp;
        accountStatuses[account].freezeInitiator = msg.sender;
        accountStatuses[account].freezeReason = reason;

        emit AccountFrozen(account, msg.sender, reason);
    }

    /**
     * @dev Unfreeze an account
     * @param account Account to unfreeze
     */
    function unfreezeAccount(
        address account
    ) external onlyRole(ENFORCER_ROLE) {
        require(accountStatuses[account].frozen, "Not frozen");

        accountStatuses[account].frozen = false;
        emit AccountUnfrozen(account, msg.sender);
    }

    /**
     * @dev Whitelist an account (bypass enforcement)
     * @param account Account to whitelist
     */
    function whitelistAccount(
        address account
    ) external onlyRole(WHITELIST_MANAGER_ROLE) {
        accountStatuses[account].whitelisted = true;
        emit AccountWhitelisted(account, msg.sender);
    }

    /**
     * @dev Remove account from whitelist
     * @param account Account to remove
     */
    function removeFromWhitelist(
        address account
    ) external onlyRole(WHITELIST_MANAGER_ROLE) {
        accountStatuses[account].whitelisted = false;
    }

    /**
     * @dev Create delayed transaction
     * @param from Sender
     * @param to Receiver
     * @param amount Amount
     * @param data Transaction data
     * @return txId Transaction identifier
     */
    function createDelayedTransaction(
        address from,
        address to,
        uint256 amount,
        bytes calldata data
    ) external onlyRole(ENFORCER_ROLE) returns (bytes32) {
        bytes32 txId = keccak256(
            abi.encodePacked(from, to, amount, block.timestamp)
        );

        delayedTransactions[txId] = DelayedTransaction({
            txId: txId,
            from: from,
            to: to,
            amount: amount,
            data: data,
            delayUntil: block.timestamp + delayPeriod,
            executed: false,
            approved: false,
            reviewer: address(0)
        });

        accountDelayedTxs[from].push(txId);

        emit TransactionDelayed(txId, from, block.timestamp + delayPeriod);

        return txId;
    }

    /**
     * @dev Approve delayed transaction
     * @param txId Transaction identifier
     */
    function approveDelayedTransaction(
        bytes32 txId
    ) external onlyRole(ENFORCER_ROLE) {
        DelayedTransaction storage dtx = delayedTransactions[txId];
        require(!dtx.executed, "Already executed");
        require(!dtx.approved, "Already approved");

        dtx.approved = true;
        dtx.reviewer = msg.sender;

        emit TransactionApproved(txId, msg.sender);
    }

    /**
     * @dev Execute approved delayed transaction
     * @param txId Transaction identifier
     */
    function executeDelayedTransaction(
        bytes32 txId
    ) external nonReentrant {
        DelayedTransaction storage dtx = delayedTransactions[txId];
        require(dtx.approved, "Not approved");
        require(!dtx.executed, "Already executed");
        require(block.timestamp >= dtx.delayUntil, "Still delayed");

        dtx.executed = true;

        emit TransactionExecuted(txId, dtx.from, dtx.to);
    }

    /**
     * @dev Set daily limit for account
     * @param account Account address
     * @param limit Daily transaction limit
     */
    function setDailyLimit(
        address account,
        uint256 limit
    ) external onlyRole(ENFORCER_ROLE) {
        accountStatuses[account].dailyLimit = limit;
    }

    /**
     * @dev Update enforcement enabled status
     * @param enabled Whether enforcement is enabled
     */
    function setEnforcementEnabled(
        bool enabled
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        enforcementEnabled = enabled;
    }

    /**
     * @dev Check daily limit for account
     * @param account Account to check
     * @param amount Amount to check
     * @return bool True if limit would be exceeded
     */
    function _checkDailyLimit(
        address account,
        uint256 amount
    ) internal view returns (bool) {
        AccountStatus memory status = accountStatuses[account];
        uint256 limit = status.dailyLimit > 0
            ? status.dailyLimit
            : defaultDailyLimit;

        // Reset if new day
        if (block.timestamp >= status.lastResetTimestamp + 1 days) {
            return amount > limit;
        }

        return (status.dailySpent + amount) > limit;
    }

    /**
     * @dev Update daily spending (called by integrated contracts)
     * @param account Account that spent
     * @param amount Amount spent
     */
    function recordSpending(
        address account,
        uint256 amount
    ) external onlyRole(ENFORCER_ROLE) {
        AccountStatus storage status = accountStatuses[account];

        // Reset if new day
        if (block.timestamp >= status.lastResetTimestamp + 1 days) {
            status.dailySpent = amount;
            status.lastResetTimestamp = block.timestamp;
        } else {
            status.dailySpent += amount;
        }
    }

    /**
     * @dev Get account status
     * @param account Account to query
     * @return AccountStatus struct
     */
    function getAccountStatus(
        address account
    ) external view returns (AccountStatus memory) {
        return accountStatuses[account];
    }

    /**
     * @dev Get delayed transactions for account
     * @param account Account to query
     * @return bytes32[] array of transaction IDs
     */
    function getAccountDelayedTransactions(
        address account
    ) external view returns (bytes32[] memory) {
        return accountDelayedTxs[account];
    }
}
