// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./RiskRegistry.sol";

/**
 * @title ComplianceOracle
 * @dev Oracle for connecting off-chain compliance data (FATF, OFAC, etc.) to on-chain
 * @notice Acts as a bridge between external regulatory databases and blockchain
 */
contract ComplianceOracle is AccessControl, ReentrancyGuard {
    bytes32 public constant ORACLE_UPDATER_ROLE = keccak256("ORACLE_UPDATER_ROLE");
    bytes32 public constant VALIDATOR_ROLE = keccak256("VALIDATOR_ROLE");

    RiskRegistry public immutable riskRegistry;

    // Sanctioned addresses (OFAC, FATF blacklists, etc.)
    mapping(address => bool) public sanctionedAddresses;

    // Country-based compliance data
    mapping(string => bool) public sanctionedJurisdictions;

    // Data source tracking
    struct DataSource {
        string name;
        string endpoint;
        uint256 lastUpdate;
        bool active;
    }

    mapping(bytes32 => DataSource) public dataSources;
    bytes32[] public dataSourceIds;

    // Compliance check results cache
    struct ComplianceCheck {
        bool isSanctioned;
        bool isPEP;  // Politically Exposed Person
        string jurisdiction;
        uint256 timestamp;
        bytes32 dataSourceId;
    }

    mapping(address => ComplianceCheck) private complianceChecks;

    // Events
    event AddressSanctioned(
        address indexed target,
        bytes32 indexed dataSourceId,
        string reason
    );

    event AddressCleared(
        address indexed target,
        address indexed clearedBy
    );

    event DataSourceRegistered(
        bytes32 indexed sourceId,
        string name,
        string endpoint
    );

    event DataSourceUpdated(
        bytes32 indexed sourceId,
        uint256 timestamp
    );

    event ComplianceCheckPerformed(
        address indexed target,
        bool isSanctioned,
        bool isPEP,
        bytes32 indexed dataSourceId
    );

    constructor(address _riskRegistry) {
        require(_riskRegistry != address(0), "Invalid registry address");
        riskRegistry = RiskRegistry(_riskRegistry);

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ORACLE_UPDATER_ROLE, msg.sender);
        _grantRole(VALIDATOR_ROLE, msg.sender);
    }

    /**
     * @dev Register a new compliance data source
     * @param name Data source name (e.g., "OFAC", "FATF")
     * @param endpoint API endpoint or identifier
     */
    function registerDataSource(
        string calldata name,
        string calldata endpoint
    ) external onlyRole(DEFAULT_ADMIN_ROLE) returns (bytes32) {
        bytes32 sourceId = keccak256(abi.encodePacked(name, block.timestamp));

        dataSources[sourceId] = DataSource({
            name: name,
            endpoint: endpoint,
            lastUpdate: block.timestamp,
            active: true
        });

        dataSourceIds.push(sourceId);

        emit DataSourceRegistered(sourceId, name, endpoint);
        return sourceId;
    }

    /**
     * @dev Add address to sanctions list
     * @param target Address to sanction
     * @param dataSourceId Source of sanctions data
     * @param reason Reason for sanctioning
     */
    function sanctionAddress(
        address target,
        bytes32 dataSourceId,
        string calldata reason
    ) external onlyRole(ORACLE_UPDATER_ROLE) {
        require(target != address(0), "Invalid address");
        require(dataSources[dataSourceId].active, "Invalid data source");

        sanctionedAddresses[target] = true;

        // Update risk registry
        riskRegistry.assessRisk(
            target,
            RiskRegistry.RiskLevel.CRITICAL,
            100,
            reason
        );

        emit AddressSanctioned(target, dataSourceId, reason);
    }

    /**
     * @dev Remove address from sanctions list
     * @param target Address to clear
     */
    function clearSanction(
        address target
    ) external onlyRole(VALIDATOR_ROLE) {
        require(sanctionedAddresses[target], "Address not sanctioned");

        sanctionedAddresses[target] = false;
        emit AddressCleared(target, msg.sender);
    }

    /**
     * @dev Perform compliance check on address
     * @param target Address to check
     * @param jurisdiction Country/jurisdiction code
     * @param isPEP Whether address is politically exposed person
     * @param dataSourceId Source of compliance data
     */
    function performComplianceCheck(
        address target,
        string calldata jurisdiction,
        bool isPEP,
        bytes32 dataSourceId
    ) external onlyRole(ORACLE_UPDATER_ROLE) {
        require(dataSources[dataSourceId].active, "Invalid data source");

        bool isSanctioned = sanctionedAddresses[target] ||
                           sanctionedJurisdictions[jurisdiction];

        complianceChecks[target] = ComplianceCheck({
            isSanctioned: isSanctioned,
            isPEP: isPEP,
            jurisdiction: jurisdiction,
            timestamp: block.timestamp,
            dataSourceId: dataSourceId
        });

        // Update data source timestamp
        dataSources[dataSourceId].lastUpdate = block.timestamp;
        emit DataSourceUpdated(dataSourceId, block.timestamp);

        // Auto-assess risk if sanctioned or PEP
        if (isSanctioned || isPEP) {
            uint256 riskScore = isSanctioned ? 100 : 75;
            RiskRegistry.RiskLevel level = isSanctioned
                ? RiskRegistry.RiskLevel.CRITICAL
                : RiskRegistry.RiskLevel.HIGH;

            riskRegistry.assessRisk(
                target,
                level,
                riskScore,
                isSanctioned ? "Sanctioned entity" : "PEP identified"
            );
        }

        emit ComplianceCheckPerformed(target, isSanctioned, isPEP, dataSourceId);
    }

    /**
     * @dev Add jurisdiction to sanctions list
     * @param jurisdiction Country/jurisdiction code
     */
    function sanctionJurisdiction(
        string calldata jurisdiction
    ) external onlyRole(ORACLE_UPDATER_ROLE) {
        sanctionedJurisdictions[jurisdiction] = true;
    }

    /**
     * @dev Check if address is sanctioned
     * @param target Address to check
     * @return bool True if sanctioned
     */
    function isSanctioned(address target) external view returns (bool) {
        return sanctionedAddresses[target];
    }

    /**
     * @dev Get full compliance check results
     * @param target Address to check
     * @return ComplianceCheck struct
     */
    function getComplianceCheck(
        address target
    ) external view returns (ComplianceCheck memory) {
        return complianceChecks[target];
    }

    /**
     * @dev Check if address passes compliance
     * @param target Address to check
     * @return bool True if compliant (not sanctioned)
     */
    function isCompliant(address target) external view returns (bool) {
        ComplianceCheck memory check = complianceChecks[target];
        return !check.isSanctioned &&
               !sanctionedJurisdictions[check.jurisdiction];
    }

    /**
     * @dev Get all registered data sources
     * @return bytes32[] array of source IDs
     */
    function getDataSources() external view returns (bytes32[] memory) {
        return dataSourceIds;
    }

    /**
     * @dev Get data source details
     * @param sourceId Data source identifier
     * @return DataSource struct
     */
    function getDataSource(
        bytes32 sourceId
    ) external view returns (DataSource memory) {
        return dataSources[sourceId];
    }
}
