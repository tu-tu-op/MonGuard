const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("=".repeat(60));
  console.log("MonGuard Smart Contract Deployment");
  console.log("=".repeat(60));

  const [deployer] = await ethers.getSigners();
  console.log("\nDeploying contracts with account:", deployer.address);
  console.log("Account balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH");

  const network = await ethers.provider.getNetwork();
  console.log("Network:", network.name, `(Chain ID: ${network.chainId})`);

  const deployedContracts = {};

  // 1. Deploy RiskRegistry
  console.log("\n" + "-".repeat(60));
  console.log("1. Deploying RiskRegistry...");
  const RiskRegistry = await ethers.getContractFactory("RiskRegistry");
  const riskRegistry = await RiskRegistry.deploy();
  await riskRegistry.waitForDeployment();
  const riskRegistryAddress = await riskRegistry.getAddress();
  console.log("✓ RiskRegistry deployed to:", riskRegistryAddress);
  deployedContracts.RiskRegistry = riskRegistryAddress;

  // 2. Deploy ComplianceOracle
  console.log("\n" + "-".repeat(60));
  console.log("2. Deploying ComplianceOracle...");
  const ComplianceOracle = await ethers.getContractFactory("ComplianceOracle");
  const complianceOracle = await ComplianceOracle.deploy(riskRegistryAddress);
  await complianceOracle.waitForDeployment();
  const complianceOracleAddress = await complianceOracle.getAddress();
  console.log("✓ ComplianceOracle deployed to:", complianceOracleAddress);
  deployedContracts.ComplianceOracle = complianceOracleAddress;

  // 3. Deploy TransactionMonitor
  console.log("\n" + "-".repeat(60));
  console.log("3. Deploying TransactionMonitor...");
  const TransactionMonitor = await ethers.getContractFactory("TransactionMonitor");
  const transactionMonitor = await TransactionMonitor.deploy(
    riskRegistryAddress,
    complianceOracleAddress
  );
  await transactionMonitor.waitForDeployment();
  const transactionMonitorAddress = await transactionMonitor.getAddress();
  console.log("✓ TransactionMonitor deployed to:", transactionMonitorAddress);
  deployedContracts.TransactionMonitor = transactionMonitorAddress;

  // 4. Deploy RegulatoryNFT
  console.log("\n" + "-".repeat(60));
  console.log("4. Deploying RegulatoryNFT...");
  const RegulatoryNFT = await ethers.getContractFactory("RegulatoryNFT");
  const regulatoryNFT = await RegulatoryNFT.deploy();
  await regulatoryNFT.waitForDeployment();
  const regulatoryNFTAddress = await regulatoryNFT.getAddress();
  console.log("✓ RegulatoryNFT deployed to:", regulatoryNFTAddress);
  deployedContracts.RegulatoryNFT = regulatoryNFTAddress;

  // 5. Deploy ComplianceEnforcement
  console.log("\n" + "-".repeat(60));
  console.log("5. Deploying ComplianceEnforcement...");
  const ComplianceEnforcement = await ethers.getContractFactory("ComplianceEnforcement");
  const enforcement = await ComplianceEnforcement.deploy(
    riskRegistryAddress,
    complianceOracleAddress,
    transactionMonitorAddress
  );
  await enforcement.waitForDeployment();
  const enforcementAddress = await enforcement.getAddress();
  console.log("✓ ComplianceEnforcement deployed to:", enforcementAddress);
  deployedContracts.ComplianceEnforcement = enforcementAddress;

  // Grant roles
  console.log("\n" + "-".repeat(60));
  console.log("Setting up roles and permissions...");

  // Oracle role for ComplianceOracle
  const ORACLE_ROLE = ethers.keccak256(ethers.toUtf8Bytes("ORACLE_ROLE"));
  await riskRegistry.grantRole(ORACLE_ROLE, complianceOracleAddress);
  console.log("✓ Granted ORACLE_ROLE to ComplianceOracle");

  await riskRegistry.grantRole(ORACLE_ROLE, transactionMonitorAddress);
  console.log("✓ Granted ORACLE_ROLE to TransactionMonitor");

  // AI Oracle role for TransactionMonitor
  const AI_ORACLE_ROLE = ethers.keccak256(ethers.toUtf8Bytes("AI_ORACLE_ROLE"));
  await transactionMonitor.grantRole(AI_ORACLE_ROLE, deployer.address);
  console.log("✓ Granted AI_ORACLE_ROLE to deployer");

  // Enforcer role
  const ENFORCER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("ENFORCER_ROLE"));
  await enforcement.grantRole(ENFORCER_ROLE, deployer.address);
  console.log("✓ Granted ENFORCER_ROLE to deployer");

  // Save deployment info
  const deploymentInfo = {
    network: network.name,
    chainId: Number(network.chainId),
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    contracts: deployedContracts,
    roles: {
      ORACLE_ROLE: ORACLE_ROLE,
      AI_ORACLE_ROLE: AI_ORACLE_ROLE,
      ENFORCER_ROLE: ENFORCER_ROLE
    }
  };

  const deploymentsDir = path.join(__dirname, "..", "deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir);
  }

  const deploymentFile = path.join(
    deploymentsDir,
    `deployment-${network.name}-${Date.now()}.json`
  );

  fs.writeFileSync(deploymentFile, JSON.stringify(deploymentInfo, null, 2));

  // Also save latest deployment
  const latestFile = path.join(deploymentsDir, `latest-${network.name}.json`);
  fs.writeFileSync(latestFile, JSON.stringify(deploymentInfo, null, 2));

  // Generate .env file content
  console.log("\n" + "=".repeat(60));
  console.log("Deployment Complete!");
  console.log("=".repeat(60));
  console.log("\nDeployed Contract Addresses:");
  console.log("-".repeat(60));
  Object.entries(deployedContracts).forEach(([name, address]) => {
    console.log(`${name.padEnd(30)} ${address}`);
  });

  console.log("\n" + "=".repeat(60));
  console.log("Environment Variables (add to .env):");
  console.log("=".repeat(60));
  console.log(`RISK_REGISTRY_ADDRESS=${deployedContracts.RiskRegistry}`);
  console.log(`COMPLIANCE_ORACLE_ADDRESS=${deployedContracts.ComplianceOracle}`);
  console.log(`TRANSACTION_MONITOR_ADDRESS=${deployedContracts.TransactionMonitor}`);
  console.log(`REGULATORY_NFT_ADDRESS=${deployedContracts.RegulatoryNFT}`);
  console.log(`ENFORCEMENT_ADDRESS=${deployedContracts.ComplianceEnforcement}`);

  console.log("\n" + "=".repeat(60));
  console.log(`Deployment info saved to: ${deploymentFile}`);
  console.log("=".repeat(60));

  // Verification command
  if (network.name !== "hardhat" && network.name !== "localhost") {
    console.log("\n" + "=".repeat(60));
    console.log("To verify contracts, run:");
    console.log("=".repeat(60));
    console.log(`npx hardhat verify --network ${network.name} ${deployedContracts.RiskRegistry}`);
    console.log(`npx hardhat verify --network ${network.name} ${deployedContracts.ComplianceOracle} ${deployedContracts.RiskRegistry}`);
    console.log(`npx hardhat verify --network ${network.name} ${deployedContracts.TransactionMonitor} ${deployedContracts.RiskRegistry} ${deployedContracts.ComplianceOracle}`);
    console.log(`npx hardhat verify --network ${network.name} ${deployedContracts.RegulatoryNFT}`);
    console.log(`npx hardhat verify --network ${network.name} ${deployedContracts.ComplianceEnforcement} ${deployedContracts.RiskRegistry} ${deployedContracts.ComplianceOracle} ${deployedContracts.TransactionMonitor}`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
