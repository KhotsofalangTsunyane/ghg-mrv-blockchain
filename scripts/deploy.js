const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();

  console.log("Deploying with account:", deployer.address);
  console.log("Account balance:", (await hre.ethers.provider.getBalance(deployer.address)).toString());

  const EmissionsMRV = await hre.ethers.getContractFactory("EmissionsMRV");
  const mrv = await EmissionsMRV.deploy();
  await mrv.waitForDeployment();

  const address = await mrv.getAddress();
  const deployTx = mrv.deploymentTransaction();

  console.log("\n=== EmissionsMRV deployed ===");
  console.log("Contract address:", address);
  console.log("Deployment tx hash:", deployTx.hash);
  console.log("==============================\n");

  // --- Optional: seed some demo data so the contract has activity to show
  //     in your 5-minute demonstration video. Comment out if you'd rather
  //     do this interactively via Remix/Etherscan during the recording. ---

  console.log("Registering a demo facility...");
  const registerTx = await mrv.registerFacility("Johannesburg Steel Plant", deployer.address);
  await registerTx.wait();
  console.log("Facility registered. Tx:", registerTx.hash);

  console.log("Adding deployer as a verifier...");
  const verifierTx = await mrv.addVerifier(deployer.address);
  await verifierTx.wait();
  console.log("Verifier added. Tx:", verifierTx.hash);

  console.log("\nSave the contract address and deployment tx hash above for your report.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});