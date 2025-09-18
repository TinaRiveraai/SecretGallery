import { task } from "hardhat/config";
import type { TaskArguments } from "hardhat/types";
import { FhevmType } from "@fhevm/hardhat-plugin";

task("task:uploadFile")
  .addParam("contract", "SecretGallery contract address")
  .addParam("ipfshash", "IPFS hash as number (string)")
  .addParam("password", "AES password as address format")
  .setAction(async function (taskArguments: TaskArguments, { ethers, network,fhevm }) {
    const { contract: contractAddress, ipfshash, password } = taskArguments;
    // const { fhevm } = await import("hardhat");

    await fhevm.initializeCLIApi();

    const signers = await ethers.getSigners();

    const secretGallery = await ethers.getContractAt("SecretGallery", contractAddress);

    console.log("Network:", network.name);
    console.log("SecretGallery contract:", contractAddress);
    console.log("Signer address:", signers[0].address);

    // Create encrypted input
    const input = fhevm.createEncryptedInput(contractAddress, signers[0].address);
    input.add256(BigInt(ipfshash));  // IPFS hash as number
    input.addAddress(password);      // AES password as address
    const encryptedInput = await input.encrypt();

    // Upload file
    console.log("Uploading file...");
    const transaction = await secretGallery.uploadFile(
      encryptedInput.handles[0], // encrypted IPFS hash
      encryptedInput.handles[1], // encrypted password
      encryptedInput.inputProof
    );

    console.log("Transaction hash:", transaction.hash);
    await transaction.wait();
    console.log("File uploaded successfully!");

    // Get current file ID
    const currentFileId = await secretGallery.getCurrentFileId();
    console.log("Current file ID:", currentFileId.toString());
  });

task("task:grantAccess")
  .addParam("contract", "SecretGallery contract address")
  .addParam("fileid", "File ID to grant access to")
  .addParam("grantee", "Address to grant access to")
  .setAction(async function (taskArguments: TaskArguments, { ethers, network }) {
    const { contract: contractAddress, fileid, grantee } = taskArguments;
    const signers = await ethers.getSigners();

    const secretGalleryABI = [
      "function grantFileAccess(uint256 fileId, address grantee) external",
      "function hasFileAccess(uint256 fileId, address accessor) external view returns (bool)",
    ];

    const secretGallery = new ethers.Contract(contractAddress, secretGalleryABI, signers[0]);

    console.log("Network:", network.name);
    console.log("SecretGallery contract:", contractAddress);
    console.log("Signer address:", signers[0].address);
    console.log("File ID:", fileid);
    console.log("Grantee:", grantee);

    // Grant access
    console.log("Granting access...");
    const transaction = await secretGallery.grantFileAccess(parseInt(fileid), grantee);

    console.log("Transaction hash:", transaction.hash);
    await transaction.wait();
    console.log("Access granted successfully!");

    // Verify access
    const hasAccess = await secretGallery.hasFileAccess(parseInt(fileid), grantee);
    console.log("Grantee has access:", hasAccess);
  });

task("task:getFileData")
  .addParam("contract", "SecretGallery contract address")
  .addParam("fileid", "File ID to get data for")
  .setAction(async function (taskArguments: TaskArguments, { ethers, network }) {
    const { contract: contractAddress, fileid } = taskArguments;
    const signers = await ethers.getSigners();

    const secretGalleryABI = [
      "function getFileData(uint256 fileId) external view returns (uint256 ipfsHash, uint160 aesPassword)",
      "function getFileMetadata(uint256 fileId) external view returns (address owner, uint256 timestamp)",
    ];

    const secretGallery = new ethers.Contract(contractAddress, secretGalleryABI, signers[0]);

    console.log("Network:", network.name);
    console.log("SecretGallery contract:", contractAddress);
    console.log("Signer address:", signers[0].address);
    console.log("File ID:", fileid);

    try {
      // Get encrypted file data
      console.log("Getting encrypted file data...");
      const [encryptedIpfsHash, encryptedPassword] = await secretGallery.getFileData(parseInt(fileid));
      console.log("Encrypted IPFS hash handle:", encryptedIpfsHash);
      console.log("Encrypted password handle:", encryptedPassword);

      // Get file metadata
      console.log("Getting file metadata...");
      const [owner, timestamp] = await secretGallery.getFileMetadata(parseInt(fileid));
      console.log("File owner:", owner);
      console.log("Upload timestamp:", new Date(Number(timestamp) * 1000).toISOString());

      // Note: To decrypt the data, you would need to use the relayer SDK
      console.log("\nNote: To decrypt the encrypted data, use the relayer SDK with user decryption.");
      console.log("The handles above can be used with the relayer to decrypt the actual IPFS hash and password.");
    } catch (error) {
      console.error("Error getting file data:", error);
    }
  });

task("task:listOwnerFiles")
  .addParam("contract", "SecretGallery contract address")
  .addOptionalParam("owner", "Owner address (defaults to signer)")
  .setAction(async function (taskArguments: TaskArguments, { ethers, network }) {
    const { contract: contractAddress, owner } = taskArguments;
    const signers = await ethers.getSigners();

    const ownerAddress = owner || signers[0].address;

    const secretGalleryABI = [
      "function getOwnerFiles(address owner) external view returns (uint256[] memory)",
      "function getFileMetadata(uint256 fileId) external view returns (address owner, uint256 timestamp)",
      "function hasFileAccess(uint256 fileId, address accessor) external view returns (bool)",
    ];

    const secretGallery = new ethers.Contract(contractAddress, secretGalleryABI, signers[0]);

    console.log("Network:", network.name);
    console.log("SecretGallery contract:", contractAddress);
    console.log("Owner address:", ownerAddress);

    try {
      // Get owner's files
      const fileIds = await secretGallery.getOwnerFiles(ownerAddress);
      console.log("Number of files owned:", fileIds.length);

      if (fileIds.length === 0) {
        console.log("No files found for this owner.");
        return;
      }

      console.log("\nFiles owned:");
      for (let i = 0; i < fileIds.length; i++) {
        const fileId = fileIds[i];
        try {
          const [fileOwner, timestamp] = await secretGallery.getFileMetadata(fileId);
          const hasAccess = await secretGallery.hasFileAccess(fileId, signers[0].address);

          console.log(`\nFile ID: ${fileId}`);
          console.log(`  Owner: ${fileOwner}`);
          console.log(`  Upload time: ${new Date(Number(timestamp) * 1000).toISOString()}`);
          console.log(`  Can access: ${hasAccess}`);
        } catch (error) {
          console.log(`\nFile ID: ${fileId}`);
          console.log(`  Error getting metadata: ${error}`);
        }
      }
    } catch (error) {
      console.error("Error listing owner files:", error);
    }
  });

task("task:createGallery")
  .addParam("factory", "SecretGalleryFactory contract address")
  .setAction(async function (taskArguments: TaskArguments, { ethers, network }) {
    const { factory: factoryAddress } = taskArguments;
    const signers = await ethers.getSigners();

    const factoryABI = [
      "function createGallery() external returns (address gallery)",
      "function getOwnerGalleries(address owner) external view returns (address[] memory)",
      "function getGalleryCount() external view returns (uint256)",
    ];

    const factory = new ethers.Contract(factoryAddress, factoryABI, signers[0]);

    console.log("Network:", network.name);
    console.log("SecretGalleryFactory contract:", factoryAddress);
    console.log("Signer address:", signers[0].address);

    console.log("Creating new gallery...");
    const transaction = await factory.createGallery();

    console.log("Transaction hash:", transaction.hash);
    const receipt = await transaction.wait();

    // Find the gallery address from events
    const events = receipt.logs;
    let galleryAddress = null;

    for (const log of events) {
      try {
        const parsed = factory.interface.parseLog(log);
        if (parsed && parsed.name === "GalleryCreated") {
          galleryAddress = parsed.args.gallery;
          break;
        }
      } catch (e) {
        // Skip unparseable logs
      }
    }

    console.log("Gallery created successfully!");
    if (galleryAddress) {
      console.log("New gallery address:", galleryAddress);
    }

    // Get total gallery count
    const totalGalleries = await factory.getGalleryCount();
    console.log("Total galleries created:", totalGalleries.toString());

    // Get owner's galleries
    const ownerGalleries = await factory.getOwnerGalleries(signers[0].address);
    console.log("Your galleries:", ownerGalleries);
  });

task("task:listGalleries")
  .addParam("factory", "SecretGalleryFactory contract address")
  .addOptionalParam("owner", "Owner address (defaults to signer)")
  .setAction(async function (taskArguments: TaskArguments, { ethers, network }) {
    const { factory: factoryAddress, owner } = taskArguments;
    const signers = await ethers.getSigners();

    const ownerAddress = owner || signers[0].address;

    const factoryABI = [
      "function getAllGalleries() external view returns (address[] memory)",
      "function getOwnerGalleries(address owner) external view returns (address[] memory)",
      "function getGalleryInfo(address galleryAddress) external view returns (bool isValid, uint256 fileCount)",
    ];

    const factory = new ethers.Contract(factoryAddress, factoryABI, signers[0]);

    console.log("Network:", network.name);
    console.log("SecretGalleryFactory contract:", factoryAddress);

    try {
      // Get all galleries
      const allGalleries = await factory.getAllGalleries();
      console.log("Total galleries:", allGalleries.length);

      if (owner) {
        // Get specific owner's galleries
        const ownerGalleries = await factory.getOwnerGalleries(ownerAddress);
        console.log(`\nGalleries owned by ${ownerAddress}:`, ownerGalleries.length);

        for (let i = 0; i < ownerGalleries.length; i++) {
          const galleryAddr = ownerGalleries[i];
          try {
            const [isValid, fileCount] = await factory.getGalleryInfo(galleryAddr);
            console.log(`\nGallery ${i + 1}: ${galleryAddr}`);
            console.log(`  Valid: ${isValid}`);
            console.log(`  File count: ${fileCount}`);
          } catch (error) {
            console.log(`\nGallery ${i + 1}: ${galleryAddr}`);
            console.log(`  Error getting info: ${error}`);
          }
        }
      } else {
        // List all galleries with info
        console.log("\nAll galleries:");
        for (let i = 0; i < allGalleries.length; i++) {
          const galleryAddr = allGalleries[i];
          try {
            const [isValid, fileCount] = await factory.getGalleryInfo(galleryAddr);
            console.log(`\nGallery ${i + 1}: ${galleryAddr}`);
            console.log(`  Valid: ${isValid}`);
            console.log(`  File count: ${fileCount}`);
          } catch (error) {
            console.log(`\nGallery ${i + 1}: ${galleryAddr}`);
            console.log(`  Error getting info: ${error}`);
          }
        }
      }
    } catch (error) {
      console.error("Error listing galleries:", error);
    }
  });