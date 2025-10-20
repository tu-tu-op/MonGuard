const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("MonGuard Integration Tests", function () {
  let riskRegistry;
  let complianceOracle;
  let transactionMonitor;
  let regulatoryNFT;
  let enforcement;
  let owner, oracle, user1, user2, sanctioned;

  beforeEach(async function () {
    [owner, oracle, user1, user2, sanctioned] = await ethers.getSigners();

    // Deploy all contracts
    const RiskRegistry = await ethers.getContractFactory("RiskRegistry");
    riskRegistry = await RiskRegistry.deploy();
    await riskRegistry.waitForDeployment();

    const ComplianceOracle = await ethers.getContractFactory("ComplianceOracle");
    complianceOracle = await ComplianceOracle.deploy(await riskRegistry.getAddress());
    await complianceOracle.waitForDeployment();

    const TransactionMonitor = await ethers.getContractFactory("TransactionMonitor");
    transactionMonitor = await TransactionMonitor.deploy(
      await riskRegistry.getAddress(),
      await complianceOracle.getAddress()
    );
    await transactionMonitor.waitForDeployment();

    const RegulatoryNFT = await ethers.getContractFactory("RegulatoryNFT");
    regulatoryNFT = await RegulatoryNFT.deploy();
    await regulatoryNFT.waitForDeployment();

    const ComplianceEnforcement = await ethers.getContractFactory("ComplianceEnforcement");
    enforcement = await ComplianceEnforcement.deploy(
      await riskRegistry.getAddress(),
      await complianceOracle.getAddress(),
      await transactionMonitor.getAddress()
    );
    await enforcement.waitForDeployment();

    // Setup roles
    const ORACLE_ROLE = ethers.keccak256(ethers.toUtf8Bytes("ORACLE_ROLE"));
    const AI_ORACLE_ROLE = ethers.keccak256(ethers.toUtf8Bytes("AI_ORACLE_ROLE"));
    const ORACLE_UPDATER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("ORACLE_UPDATER_ROLE"));

    await riskRegistry.grantRole(ORACLE_ROLE, await complianceOracle.getAddress());
    await riskRegistry.grantRole(ORACLE_ROLE, await transactionMonitor.getAddress());
    await transactionMonitor.grantRole(AI_ORACLE_ROLE, owner.address);
    await complianceOracle.grantRole(ORACLE_UPDATER_ROLE, owner.address);
  });

  describe("End-to-End Risk Assessment Flow", function () {
    it("Should complete full risk assessment workflow", async function () {
      // 1. Check initial state
      let riskScore = await riskRegistry.getRiskScore(user1.address);
      expect(riskScore).to.equal(0);

      // 2. Oracle assesses risk
      await riskRegistry.assessRisk(
        user1.address,
        2, // MEDIUM
        55,
        "Suspicious pattern detected"
      );

      // 3. Verify risk was recorded
      riskScore = await riskRegistry.getRiskScore(user1.address);
      expect(riskScore).to.equal(55);

      const riskLevel = await riskRegistry.getRiskLevel(user1.address);
      expect(riskLevel).to.equal(2); // MEDIUM

      // 4. Check if high risk
      const isHighRisk = await riskRegistry.isHighRisk(user1.address);
      expect(isHighRisk).to.be.false;
    });

    it("Should escalate to high risk and trigger enforcement", async function () {
      // 1. Set high risk score
      await riskRegistry.assessRisk(
        user1.address,
        3, // HIGH
        85,
        "High risk activity detected"
      );

      // 2. Verify high risk status
      const isHighRisk = await riskRegistry.isHighRisk(user1.address);
      expect(isHighRisk).to.be.true;

      // 3. Check transaction enforcement
      const [allowed, action, reason] = await enforcement.checkTransaction(
        user1.address,
        user2.address,
        ethers.parseEther("1")
      );

      expect(allowed).to.be.false;
      expect(action).to.equal(2); // DELAY
      expect(reason).to.include("High risk");
    });
  });

  describe("Sanctions and Compliance Flow", function () {
    it("Should detect and block sanctioned addresses", async function () {
      // 1. Register data source
      const tx = await complianceOracle.registerDataSource("OFAC", "https://ofac.treasury.gov");
      const receipt = await tx.wait();

      // Get sourceId from event
      const event = receipt.logs.find(
        log => log.fragment && log.fragment.name === "DataSourceRegistered"
      );
      const sourceId = event.args[0];

      // 2. Sanction an address
      await complianceOracle.sanctionAddress(
        sanctioned.address,
        sourceId,
        "OFAC sanctioned entity"
      );

      // 3. Verify sanctioned status
      const isSanctioned = await complianceOracle.isSanctioned(sanctioned.address);
      expect(isSanctioned).to.be.true;

      // 4. Check enforcement blocks transaction
      const [allowed, action, reason] = await enforcement.checkTransaction(
        sanctioned.address,
        user2.address,
        ethers.parseEther("1")
      );

      expect(allowed).to.be.false;
      expect(action).to.equal(5); // FREEZE
      expect(reason).to.include("sanction");
    });

    it("Should perform compliance check and update risk", async function () {
      // Register data source first and capture the sourceId
      const tx = await complianceOracle.registerDataSource("FATF", "https://fatf-gafi.org");
      const receipt = await tx.wait();

      // Get sourceId from event
      const event = receipt.logs.find(
        log => log.fragment && log.fragment.name === "DataSourceRegistered"
      );
      const sourceId = event.args[0];

      // Perform compliance check
      await complianceOracle.performComplianceCheck(
        user1.address,
        "US",
        true, // isPEP
        sourceId
      );

      // Check compliance result
      const complianceCheck = await complianceOracle.getComplianceCheck(user1.address);
      expect(complianceCheck.isPEP).to.be.true;
      expect(complianceCheck.jurisdiction).to.equal("US");
    });
  });

  describe("Transaction Monitoring Flow", function () {
    it("Should analyze and flag suspicious transaction", async function () {
      const txHash = ethers.randomBytes(32);

      // Analyze transaction with high anomaly score
      await transactionMonitor.analyzeTransaction(
        txHash,
        user1.address,
        user2.address,
        ethers.parseEther("10"),
        3, // MIXING pattern
        85, // High anomaly score
        "Potential mixing service usage"
      );

      // Get analysis result
      const analysis = await transactionMonitor.getTransactionAnalysis(txHash);
      expect(analysis.flagged).to.be.true;
      expect(analysis.pattern).to.equal(3);
      expect(analysis.anomalyScore).to.equal(85);
    });

    it("Should track flagged transaction count", async function () {
      const initialCount = await transactionMonitor.flaggedTransactionCount();

      // Add flagged transaction
      const txHash = ethers.randomBytes(32);
      await transactionMonitor.analyzeTransaction(
        txHash,
        user1.address,
        user2.address,
        ethers.parseEther("5"),
        1, // STRUCTURING
        75,
        "Structuring detected"
      );

      const newCount = await transactionMonitor.flaggedTransactionCount();
      expect(newCount).to.equal(initialCount + BigInt(1));
    });
  });

  describe("Regulatory NFT Flow", function () {
    it("Should create and seal compliance report", async function () {
      const COMPLIANCE_OFFICER_ROLE = ethers.keccak256(
        ethers.toUtf8Bytes("COMPLIANCE_OFFICER_ROLE")
      );
      await regulatoryNFT.grantRole(COMPLIANCE_OFFICER_ROLE, owner.address);

      // Create report
      const ipfsHash = "QmTest123";
      const dataHash = ethers.keccak256(ethers.toUtf8Bytes("test data"));

      await regulatoryNFT.createReport(
        0, // SUSPICIOUS_ACTIVITY
        user1.address,
        ipfsHash,
        dataHash
      );

      // Get report
      const report = await regulatoryNFT.getReport(1);
      expect(report.subject).to.equal(user1.address);
      expect(report.ipfsHash).to.equal(ipfsHash);
      expect(report.isSealed).to.be.false;

      // Submit for review
      await regulatoryNFT.submitReport(1);

      // Grant auditor role and approve
      const AUDITOR_ROLE = ethers.keccak256(ethers.toUtf8Bytes("AUDITOR_ROLE"));
      await regulatoryNFT.grantRole(AUDITOR_ROLE, owner.address);

      await regulatoryNFT.reviewReport(1, true);

      // Seal report
      await regulatoryNFT.sealReport(1);

      const sealedReport = await regulatoryNFT.getReport(1);
      expect(sealedReport.isSealed).to.be.true;
      expect(sealedReport.status).to.equal(3); // APPROVED
    });
  });

  describe("Account Enforcement Flow", function () {
    it("Should freeze account and block transactions", async function () {
      const ENFORCER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("ENFORCER_ROLE"));
      await enforcement.grantRole(ENFORCER_ROLE, owner.address);

      // Freeze account
      await enforcement.freezeAccount(user1.address, "Critical risk detected");

      // Verify account is frozen
      const accountStatus = await enforcement.getAccountStatus(user1.address);
      expect(accountStatus.frozen).to.be.true;
      expect(accountStatus.freezeReason).to.equal("Critical risk detected");

      // Try transaction - should be blocked
      const [allowed, action, reason] = await enforcement.checkTransaction(
        user1.address,
        user2.address,
        ethers.parseEther("1")
      );

      expect(allowed).to.be.false;
      expect(action).to.equal(5); // FREEZE
    });

    it("Should enforce daily limits", async function () {
      const ENFORCER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("ENFORCER_ROLE"));
      await enforcement.grantRole(ENFORCER_ROLE, owner.address);

      // Set daily limit
      await enforcement.setDailyLimit(user1.address, ethers.parseEther("100"));

      // Check transaction within limit
      let [allowed] = await enforcement.checkTransaction(
        user1.address,
        user2.address,
        ethers.parseEther("50")
      );
      expect(allowed).to.be.true;

      // Record spending
      await enforcement.recordSpending(user1.address, ethers.parseEther("95"));

      // Check transaction over limit
      [allowed, , reason] = await enforcement.checkTransaction(
        user1.address,
        user2.address,
        ethers.parseEther("10")
      );
      expect(allowed).to.be.false;
      expect(reason).to.include("limit");
    });

    it("Should whitelist address to bypass checks", async function () {
      const WHITELIST_MANAGER_ROLE = ethers.keccak256(
        ethers.toUtf8Bytes("WHITELIST_MANAGER_ROLE")
      );
      await enforcement.grantRole(WHITELIST_MANAGER_ROLE, owner.address);

      // First, make user high risk
      await riskRegistry.assessRisk(user1.address, 4, 95, "Critical risk");

      // Whitelist user
      await enforcement.whitelistAccount(user1.address);

      // Check transaction - should be allowed despite high risk
      const [allowed, action, reason] = await enforcement.checkTransaction(
        user1.address,
        user2.address,
        ethers.parseEther("1")
      );

      expect(allowed).to.be.true;
      expect(action).to.equal(0); // NONE
    });
  });
});
