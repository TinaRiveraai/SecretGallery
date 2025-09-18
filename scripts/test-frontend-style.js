const { ethers } = require("hardhat");

async function main() {
  console.log("Testing contract with frontend-style calls...");

  const contractAddress = "0xd72b2ED6708BB2AA5A31B92Ce5a3679E5834B951";

  // 使用和前端相同的方式创建provider - 通过RPC URL而不是hardhat provider
  const provider = new ethers.JsonRpcProvider("https://sepolia.infura.io/v3/c501d55ad9924cf5905ae1954ec6f7f3");

  // 检查网络
  const network = await provider.getNetwork();
  console.log('Network:', network.name, 'chainId:', network.chainId);

  if (network.chainId !== 11155111n) {
    console.error('Wrong network! Expected Sepolia (11155111)');
    return;
  }

  // 使用完整的ABI而不是简化版本
  const abi = [
    "function getCurrentFileId() external view returns (uint256)",
    "function getOwnerFiles(address owner) external view returns (uint256[] memory)"
  ];

  const contract = new ethers.Contract(contractAddress, abi, provider);

  try {
    console.log("Testing getCurrentFileId...");
    const currentFileId = await contract.getCurrentFileId();
    console.log("Current file ID:", currentFileId.toString());

    console.log("Testing getOwnerFiles...");
    const testAddress = "0x609a6Fa3B64e26184C9570F4b47D1DD80783465B";
    const files = await contract.getOwnerFiles(testAddress);
    console.log("Files for", testAddress, ":", files.length);
    console.log("Raw result:", files);

  } catch (error) {
    console.error("Frontend-style call failed:", error.message);
    console.error("Full error:", error);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });