const { run } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const network = await ethers.provider.getNetwork();
  const networkName = network.name;

  console.log("=".repeat(60));
  console.log("MonGuard Contract Verification");
  console.log("=".repeat(60));
  console.log(`Network: ${networkName}`);

  // Load latest deployment
  const deploymentFile = path.join(
    __dirname,
    "..",
    "deployments",
    `latest-${networkName}.json`
  );

  if (!fs.existsSync(deploymentFile)) {
    console.error(`❌ No deployment found for network: ${networkName}`);
    process.exit(1);
  }

  const deployment = JSON.parse(fs.readFileSync(deploymentFile, "utf8"));
  const contracts = deployment.contracts;

  console.log("\nVerifying contracts...\n");

  // 1. Verify RiskRegistry
  try {
    console.log("1. Verifying RiskRegistry...");
    await run("verify:verify", {
      address: contracts.RiskRegistry,
      constructorArguments: [],
    });
    console.log("✓ RiskRegistry verified\n");
  } catch (error) {
    console.log("⚠ RiskRegistry:", error.message, "\n");
  }

  // 2. Verify ComplianceOracle
  try {
    console.log("2. Verifying ComplianceOracle...");
    await run("verify:verify", {
      address: contracts.ComplianceOracle,
      constructorArguments: [contracts.RiskRegistry],
    });
    console.log("✓ ComplianceOracle verified\n");
  } catch (error) {
    console.log("⚠ ComplianceOracle:", error.message, "\n");
  }

  // 3. Verify TransactionMonitor
  try {
    console.log("3. Verifying TransactionMonitor...");
    await run("verify:verify", {
      address: contracts.TransactionMonitor,
      constructorArguments: [contracts.RiskRegistry, contracts.ComplianceOracle],
    });
    console.log("✓ TransactionMonitor verified\n");
  } catch (error) {
    console.log("⚠ TransactionMonitor:", error.message, "\n");
  }

  // 4. Verify RegulatoryNFT
  try {
    console.log("4. Verifying RegulatoryNFT...");
    await run("verify:verify", {
      address: contracts.RegulatoryNFT,
      constructorArguments: [],
    });
    console.log("✓ RegulatoryNFT verified\n");
  } catch (error) {
    console.log("⚠ RegulatoryNFT:", error.message, "\n");
  }

  // 5. Verify ComplianceEnforcement
  try {
    console.log("5. Verifying ComplianceEnforcement...");
    await run("verify:verify", {
      address: contracts.ComplianceEnforcement,
      constructorArguments: [
        contracts.RiskRegistry,
        contracts.ComplianceOracle,
        contracts.TransactionMonitor,
      ],
    });
    console.log("✓ ComplianceEnforcement verified\n");
  } catch (error) {
    console.log("⚠ ComplianceEnforcement:", error.message, "\n");
  }

  console.log("=".repeat(60));
  console.log("Verification complete!");
  console.log("=".repeat(60));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
