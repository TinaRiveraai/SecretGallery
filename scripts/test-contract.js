const { ethers } = require("hardhat");

async function main() {
  console.log("Testing deployed SecretGallery contract...");

  const contractAddress = "0xe5B3c8461Be5F6114Fd847Cb1F0660b367c8E6df";

  // Get provider
  const provider = new ethers.JsonRpcProvider("https://sepolia.infura.io/v3/c501d55ad9924cf5905ae1954ec6f7f3");

  // Check if contract exists
  const code = await provider.getCode(contractAddress);
  console.log("Contract exists:", code !== "0x");

  if (code === "0x") {
    console.error("No contract found at address:", contractAddress);
    return;
  }

  // Test basic contract calls
  const contract = new ethers.Contract(contractAddress, [
    "function getCurrentFileId() external view returns (uint256)",
    "function getOwnerFiles(address owner) external view returns (uint256[] memory)"
  ], provider);

  try {
    // Test getCurrentFileId
    const currentFileId = await contract.getCurrentFileId();
    console.log("Current file ID:", currentFileId.toString());

    // Test getOwnerFiles with deployer address
    const deployerAddress = "0x609a6Fa3B64e26184C9570F4b47D1DD80783465B";
    console.log("Testing getOwnerFiles for:", deployerAddress);

    const files = await contract.getOwnerFiles(deployerAddress);
    console.log("Files owned:", files.length);
    console.log("File IDs:", files.map(id => id.toString()));

  } catch (error) {
    console.error("Contract call failed:", error.message);
    console.error("Error details:", error);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });