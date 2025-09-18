import { ethers } from 'ethers';
import { SECRET_GALLERY_ABI } from './SecretGalleryABI';
import type { FHEInstance } from './index';

// Contract address (deployed on Sepolia testnet)
const CONTRACT_ADDRESS = '0xd72b2ED6708BB2AA5A31B92Ce5a3679E5834B951' as const;

export class EthersContractService {
  private provider: ethers.BrowserProvider | null = null;
  private signer: ethers.Signer | null = null;
  private contract: ethers.Contract | null = null;
  private fheInstance: FHEInstance | null = null;
  private connected: boolean = false;

  constructor(fheInstance: FHEInstance | null = null) {
    this.fheInstance = fheInstance;
  }

  // Connect wallet
  async connect(): Promise<void> {
    try {
      if (typeof window !== 'undefined' && window.ethereum) {
        // Request user to connect wallet
        await window.ethereum.request({ method: 'eth_requestAccounts' });

        // Create provider and signer
        this.provider = new ethers.BrowserProvider(window.ethereum);
        this.signer = await this.provider.getSigner();

        // Verify network
        const network = await this.provider.getNetwork();
        console.log('Connected to network:', network.name, 'chainId:', network.chainId);

        if (network.chainId !== 11155111n) { // Sepolia chainId
          throw new Error('Please switch to Sepolia testnet. Current network: ' + network.name);
        }

        // Create contract instance
        this.contract = new ethers.Contract(CONTRACT_ADDRESS, SECRET_GALLERY_ABI, this.signer);

        // Verify account connection
        const address = await this.signer.getAddress();
        console.log('Connected account:', address);
      } else {
        throw new Error('MetaMask not found. Please install MetaMask.');
      }

      this.connected = true;
      console.log('Ethers contract service connected');
    } catch (error) {
      console.error('Failed to connect ethers contract service:', error);
      this.connected = false;
      throw error;
    }
  }

  // Set FHE instance
  setFHEInstance(instance: FHEInstance): void {
    this.fheInstance = instance;
  }

  // Upload file to contract
  async uploadFile(ipfsHashNumber: bigint, aesPassword: string): Promise<number> {
    if (!this.connected || !this.fheInstance || !this.contract || !this.signer) {
      throw new Error('Contract service not properly initialized');
    }

    try {
      console.log('Preparing FHE encrypted input...');

      // Get user address
      const userAddress = await this.signer.getAddress();

      // Create encrypted input
      const input = this.fheInstance.createEncryptedInput(CONTRACT_ADDRESS, userAddress);
      input.add256(ipfsHashNumber);
      input.addAddress(aesPassword);

      // Encrypt input
      const encryptedInput = await input.encrypt();
      console.log('Encrypted input created:', encryptedInput);

      // Set gasLimit
      const gasLimit = 12_000_000n;

      // Call contract
      const tx = await this.contract.uploadFile(
        encryptedInput.handles[0], // encrypted IPFS hash
        encryptedInput.handles[1], // encrypted AES password
        encryptedInput.inputProof,
        { gasLimit }
      );

      console.log('Transaction sent:', tx.hash);

      // Wait for transaction confirmation
      const receipt = await tx.wait();
      console.log('Transaction confirmed:', receipt);

      // Parse event to get fileId
      const uploadEvent = receipt.logs.find((log: any) => {
        try {
          // Parse FileUploaded event
          const parsedLog = this.contract?.interface.parseLog(log);
          return parsedLog?.name === 'FileUploaded';
        } catch {
          return false;
        }
      });

      if (uploadEvent) {
        const parsedLog = this.contract.interface.parseLog(uploadEvent);
        const fileId = Number(parsedLog?.args?.fileId || 0);
        console.log('File uploaded with ID:', fileId);
        return fileId;
      }

      throw new Error('Failed to get file ID from transaction');
    } catch (error) {
      console.error('Upload file failed:', error);
      throw error;
    }
  }

  // Get user's file list
  async getUserFiles(userAddress?: string): Promise<number[]> {
    try {
      console.log('Reading user files from contract...');

      // If not connected, connect first
      if (!this.connected || !this.contract || !this.signer) {
        console.log('Contract not ready, connecting...');
        await this.connect();
      }

      // Get user address
      const address = userAddress || await this.signer!.getAddress();

      // Call contract to read user files
      const fileIds = await this.contract!.getOwnerFiles(address);

      console.log('User files from contract:', fileIds);
      return fileIds.map((id: any) => Number(id.toString()));
    } catch (error) {
      console.error('Get user files failed:', error);
      throw error;
    }
  }

  // Get file's encrypted data
  async getFileData(fileId: number): Promise<{ ipfsHash: string; aesPassword: string }> {
    if (!this.connected || !this.fheInstance || !this.contract || !this.signer) {
      throw new Error('Contract service not properly initialized');
    }

    try {
      console.log(`Reading encrypted file data for ID ${fileId}...`);

      // Get user address
      const userAddress = await this.signer.getAddress();

      // Get encrypted file data
      const [encryptedIpfsHash, encryptedAesPassword] = await this.contract.getFileData(fileId);

      console.log('Encrypted data retrieved from contract');

      // Create decryption keypair
      const keypair = this.fheInstance.generateKeypair();

      // Prepare user decryption
      const handleContractPairs = [
        { handle: encryptedIpfsHash, contractAddress: CONTRACT_ADDRESS },
        { handle: encryptedAesPassword, contractAddress: CONTRACT_ADDRESS }
      ];

      const startTimeStamp = Math.floor(Date.now() / 1000).toString();
      const durationDays = "10";
      const contractAddresses = [CONTRACT_ADDRESS];

      // Create EIP712 signature
      const eip712 = this.fheInstance.createEIP712(
        keypair.publicKey,
        contractAddresses,
        startTimeStamp,
        durationDays
      );

      // Sign
      const signature = await this.signer.signTypedData(
        eip712.domain,
        eip712.types,
        eip712.message
      );

      // Execute user decryption
      const decryptedData = await this.fheInstance.userDecrypt(
        handleContractPairs,
        keypair.privateKey,
        keypair.publicKey,
        signature.replace('0x', ''),
        contractAddresses,
        userAddress,
        startTimeStamp,
        durationDays
      );

      return {
        ipfsHash: decryptedData[encryptedIpfsHash],
        aesPassword: decryptedData[encryptedAesPassword]
      };
    } catch (error) {
      console.error('Get file data failed:', error);
      throw error;
    }
  }

  // Get file metadata
  async getFileMetadata(fileId: number): Promise<{ owner: string; timestamp: number }> {
    if (!this.connected || !this.contract) {
      throw new Error('Contract not connected');
    }

    try {
      console.log(`Reading metadata for file ${fileId}...`);

      // Call contract to get file metadata
      const [owner, timestamp] = await this.contract.getFileMetadata(fileId);

      return {
        owner,
        timestamp: Number(timestamp.toString())
      };
    } catch (error) {
      console.error('Get file metadata failed:', error);
      throw error;
    }
  }

  // Grant file access
  async grantFileAccess(fileId: number, granteeAddress: string): Promise<void> {
    if (!this.connected || !this.contract) {
      throw new Error('Contract not connected');
    }

    try {
      console.log(`Granting access for file ${fileId} to ${granteeAddress}...`);

      // Set gasLimit
      const gasLimit = 12_000_000n;

      // Call contract to grant file access
      const tx = await this.contract.grantFileAccess(fileId, granteeAddress, { gasLimit });

      console.log('Grant access transaction sent:', tx.hash);

      // Wait for transaction confirmation
      await tx.wait();
      console.log(`Access granted for file ${fileId} to ${granteeAddress}`);
    } catch (error) {
      console.error('Grant file access failed:', error);
      throw error;
    }
  }

  // Check connection status
  isConnected(): boolean {
    return this.connected && this.provider && this.signer && this.contract;
  }

  // Get contract address
  getContractAddress(): string {
    return CONTRACT_ADDRESS;
  }
}