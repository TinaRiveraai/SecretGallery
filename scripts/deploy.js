const { ethers } = require("hardhat");

async function main() {
  console.log("Deploying SecretGallery contract to Sepolia...");

  // Get the signer
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with account:", deployer.address);

  // Get account balance
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", ethers.formatEther(balance), "ETH");

  // Deploy SecretGallery contract
  console.log("Deploying SecretGallery...");
  const SecretGallery = await ethers.getContractFactory("SecretGallery");
  const secretGallery = await SecretGallery.deploy();

  console.log("Waiting for deployment...");
  await secretGallery.waitForDeployment();

  const contractAddress = await secretGallery.getAddress();
  console.log("SecretGallery deployed to:", contractAddress);

  // Verify deployment
  console.log("Verifying deployment...");
  const currentFileId = await secretGallery.getCurrentFileId();
  console.log("Initial file ID counter:", currentFileId.toString());

  console.log("\nDeployment completed successfully!");
  console.log("Contract address:", contractAddress);
  console.log("Network: Sepolia");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });