// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

/**
 * @title RegulatoryNFT
 * @dev NFT-based immutable compliance and audit records
 * @notice Each NFT represents a verified compliance report or audit trail
 */
contract RegulatoryNFT is ERC721URIStorage, AccessControl {
    using Strings for uint256;

    bytes32 public constant AUDITOR_ROLE = keccak256("AUDITOR_ROLE");
    bytes32 public constant COMPLIANCE_OFFICER_ROLE = keccak256("COMPLIANCE_OFFICER_ROLE");

    // Report types
    enum ReportType {
        SUSPICIOUS_ACTIVITY,    // SAR - Suspicious Activity Report
        COMPLIANCE_AUDIT,       // General compliance audit
        RISK_ASSESSMENT,        // Risk assessment report
        TRANSACTION_REVIEW,     // Individual transaction review
        KYC_VERIFICATION,       // KYC verification record
        SANCTION_SCREENING      // Sanctions screening result
    }

    // Report status
    enum ReportStatus {
        DRAFT,
        SUBMITTED,
        UNDER_REVIEW,
        APPROVED,
        REJECTED,
        ARCHIVED
    }

    // Compliance report structure
    struct ComplianceReport {
        uint256 tokenId;
        ReportType reportType;
        ReportStatus status;
        address subject;        // Address being reported on
        address issuer;         // Who created the report
        uint256 timestamp;
        uint256 reviewTimestamp;
        address reviewer;
        string ipfsHash;        // IPFS hash of full report data
        bytes32 dataHash;       // Hash of report data for verification
        bool isSealed;          // Once sealed, cannot be modified
    }

    // Storage
    mapping(uint256 => ComplianceReport) public reports;
    mapping(address => uint256[]) public subjectReports;
    mapping(address => uint256[]) public issuerReports;

    uint256 private _tokenIdCounter;

    // Events
    event ReportCreated(
        uint256 indexed tokenId,
        ReportType reportType,
        address indexed subject,
        address indexed issuer
    );

    event ReportUpdated(
        uint256 indexed tokenId,
        ReportStatus newStatus,
        address updatedBy
    );

    event ReportSealed(
        uint256 indexed tokenId,
        address indexed sealedBy
    );

    event ReportReviewed(
        uint256 indexed tokenId,
        address indexed reviewer,
        ReportStatus status
    );

    constructor() ERC721("MonGuard Regulatory NFT", "MGREG") {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(AUDITOR_ROLE, msg.sender);
        _grantRole(COMPLIANCE_OFFICER_ROLE, msg.sender);
    }

    /**
     * @dev Create a new compliance report NFT
     * @param reportType Type of compliance report
     * @param subject Address being reported on
     * @param ipfsHash IPFS hash of report data
     * @param dataHash Hash of report data
     * @return tokenId The newly created token ID
     */
    function createReport(
        ReportType reportType,
        address subject,
        string calldata ipfsHash,
        bytes32 dataHash
    ) external onlyRole(COMPLIANCE_OFFICER_ROLE) returns (uint256) {
        require(subject != address(0), "Invalid subject");
        require(bytes(ipfsHash).length > 0, "IPFS hash required");
        require(dataHash != bytes32(0), "Data hash required");

        _tokenIdCounter++;
        uint256 tokenId = _tokenIdCounter;

        // Mint NFT to the compliance officer
        _safeMint(msg.sender, tokenId);

        // Create report
        reports[tokenId] = ComplianceReport({
            tokenId: tokenId,
            reportType: reportType,
            status: ReportStatus.DRAFT,
            subject: subject,
            issuer: msg.sender,
            timestamp: block.timestamp,
            reviewTimestamp: 0,
            reviewer: address(0),
            ipfsHash: ipfsHash,
            dataHash: dataHash,
            isSealed: false
        });

        // Track by subject and issuer
        subjectReports[subject].push(tokenId);
        issuerReports[msg.sender].push(tokenId);

        // Set token URI
        _setTokenURI(tokenId, _buildTokenURI(tokenId));

        emit ReportCreated(tokenId, reportType, subject, msg.sender);

        return tokenId;
    }

    /**
     * @dev Submit report for review
     * @param tokenId Report token ID
     */
    function submitReport(uint256 tokenId) external {
        ComplianceReport storage report = reports[tokenId];
        require(ownerOf(tokenId) == msg.sender, "Not report owner");
        require(report.status == ReportStatus.DRAFT, "Report already submitted");
        require(!report.isSealed, "Report is sealed");

        report.status = ReportStatus.SUBMITTED;
        emit ReportUpdated(tokenId, ReportStatus.SUBMITTED, msg.sender);
    }

    /**
     * @dev Review and approve/reject a report
     * @param tokenId Report token ID
     * @param approved Whether to approve or reject
     */
    function reviewReport(
        uint256 tokenId,
        bool approved
    ) external onlyRole(AUDITOR_ROLE) {
        ComplianceReport storage report = reports[tokenId];
        require(
            report.status == ReportStatus.SUBMITTED ||
            report.status == ReportStatus.UNDER_REVIEW,
            "Report not ready for review"
        );
        require(!report.isSealed, "Report is sealed");

        report.status = approved ? ReportStatus.APPROVED : ReportStatus.REJECTED;
        report.reviewer = msg.sender;
        report.reviewTimestamp = block.timestamp;

        emit ReportReviewed(tokenId, msg.sender, report.status);
        emit ReportUpdated(tokenId, report.status, msg.sender);
    }

    /**
     * @dev Seal a report, making it immutable
     * @param tokenId Report token ID
     */
    function sealReport(uint256 tokenId) external onlyRole(AUDITOR_ROLE) {
        ComplianceReport storage report = reports[tokenId];
        require(report.status == ReportStatus.APPROVED, "Report must be approved");
        require(!report.isSealed, "Report already sealed");

        report.isSealed = true;
        emit ReportSealed(tokenId, msg.sender);
    }

    /**
     * @dev Update report IPFS hash (only if not sealed)
     * @param tokenId Report token ID
     * @param newIpfsHash New IPFS hash
     * @param newDataHash New data hash
     */
    function updateReportData(
        uint256 tokenId,
        string calldata newIpfsHash,
        bytes32 newDataHash
    ) external {
        ComplianceReport storage report = reports[tokenId];
        require(ownerOf(tokenId) == msg.sender, "Not report owner");
        require(!report.isSealed, "Report is sealed");
        require(bytes(newIpfsHash).length > 0, "IPFS hash required");

        report.ipfsHash = newIpfsHash;
        report.dataHash = newDataHash;

        // Update token URI
        _setTokenURI(tokenId, _buildTokenURI(tokenId));

        emit ReportUpdated(tokenId, report.status, msg.sender);
    }

    /**
     * @dev Get all reports for a subject address
     * @param subject Address to query
     * @return uint256[] array of token IDs
     */
    function getSubjectReports(
        address subject
    ) external view returns (uint256[] memory) {
        return subjectReports[subject];
    }

    /**
     * @dev Get all reports created by an issuer
     * @param issuer Issuer address
     * @return uint256[] array of token IDs
     */
    function getIssuerReports(
        address issuer
    ) external view returns (uint256[] memory) {
        return issuerReports[issuer];
    }

    /**
     * @dev Get report details
     * @param tokenId Report token ID
     * @return ComplianceReport struct
     */
    function getReport(
        uint256 tokenId
    ) external view returns (ComplianceReport memory) {
        require(_ownerOf(tokenId) != address(0), "Report does not exist");
        return reports[tokenId];
    }

    /**
     * @dev Verify report data integrity
     * @param tokenId Report token ID
     * @param dataToVerify Data to verify against stored hash
     * @return bool True if data matches hash
     */
    function verifyReportData(
        uint256 tokenId,
        bytes calldata dataToVerify
    ) external view returns (bool) {
        ComplianceReport memory report = reports[tokenId];
        return keccak256(dataToVerify) == report.dataHash;
    }

    /**
     * @dev Build token URI with metadata
     * @param tokenId Token ID
     * @return string Token URI
     */
    function _buildTokenURI(uint256 tokenId) internal view returns (string memory) {
        ComplianceReport memory report = reports[tokenId];

        string memory reportTypeStr = _reportTypeToString(report.reportType);
        string memory statusStr = _reportStatusToString(report.status);

        // Basic JSON metadata
        return string(
            abi.encodePacked(
                "data:application/json;base64,",
                _encodeBase64(
                    abi.encodePacked(
                        '{"name":"MonGuard Report #',
                        tokenId.toString(),
                        '","description":"',
                        reportTypeStr,
                        ' - ',
                        statusStr,
                        '","attributes":[',
                        '{"trait_type":"Report Type","value":"',
                        reportTypeStr,
                        '"},',
                        '{"trait_type":"Status","value":"',
                        statusStr,
                        '"},',
                        '{"trait_type":"Sealed","value":"',
                        report.isSealed ? "true" : "false",
                        '"}',
                        '],"external_url":"ipfs://',
                        report.ipfsHash,
                        '"}'
                    )
                )
            )
        );
    }

    /**
     * @dev Convert ReportType to string
     */
    function _reportTypeToString(ReportType rType) internal pure returns (string memory) {
        if (rType == ReportType.SUSPICIOUS_ACTIVITY) return "SAR";
        if (rType == ReportType.COMPLIANCE_AUDIT) return "Compliance Audit";
        if (rType == ReportType.RISK_ASSESSMENT) return "Risk Assessment";
        if (rType == ReportType.TRANSACTION_REVIEW) return "Transaction Review";
        if (rType == ReportType.KYC_VERIFICATION) return "KYC Verification";
        if (rType == ReportType.SANCTION_SCREENING) return "Sanction Screening";
        return "Unknown";
    }

    /**
     * @dev Convert ReportStatus to string
     */
    function _reportStatusToString(ReportStatus status) internal pure returns (string memory) {
        if (status == ReportStatus.DRAFT) return "Draft";
        if (status == ReportStatus.SUBMITTED) return "Submitted";
        if (status == ReportStatus.UNDER_REVIEW) return "Under Review";
        if (status == ReportStatus.APPROVED) return "Approved";
        if (status == ReportStatus.REJECTED) return "Rejected";
        if (status == ReportStatus.ARCHIVED) return "Archived";
        return "Unknown";
    }

    /**
     * @dev Simple base64 encoding (placeholder - use library in production)
     */
    function _encodeBase64(bytes memory data) internal pure returns (string memory) {
        // Simplified - in production, use a proper base64 library
        return string(data);
    }

    /**
     * @dev See {IERC165-supportsInterface}
     */
    function supportsInterface(
        bytes4 interfaceId
    ) public view override(ERC721URIStorage, AccessControl) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}
