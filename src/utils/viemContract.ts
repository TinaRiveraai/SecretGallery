import { ethers } from 'ethers';
import { SECRET_GALLERY_ABI } from './SecretGalleryABI';
import type { FHEInstance } from './index';

// 合约地址（已部署在Sepolia测试网）
const CONTRACT_ADDRESS = '0x0abd7c0266b5Dd044A9888F93530b1680fBeda0E' as const;

export class EthersContractService {
  private provider: ethers.BrowserProvider | null = null;
  private signer: ethers.Signer | null = null;
  private contract: ethers.Contract | null = null;
  private fheInstance: FHEInstance | null = null;
  private connected: boolean = false;

  constructor(fheInstance: FHEInstance | null = null) {
    this.fheInstance = fheInstance;
  }

  // 连接钱包
  async connect(): Promise<void> {
    try {
      if (typeof window !== 'undefined' && window.ethereum) {
        // 请求用户连接钱包
        await window.ethereum.request({ method: 'eth_requestAccounts' });

        // 创建provider和signer
        this.provider = new ethers.BrowserProvider(window.ethereum);
        this.signer = await this.provider.getSigner();

        // 验证网络
        const network = await this.provider.getNetwork();
        console.log('Connected to network:', network.name, 'chainId:', network.chainId);

        if (network.chainId !== 11155111n) { // Sepolia chainId
          throw new Error('Please switch to Sepolia testnet. Current network: ' + network.name);
        }

        // 创建合约实例
        this.contract = new ethers.Contract(CONTRACT_ADDRESS, SECRET_GALLERY_ABI, this.signer);

        // 验证账户连接
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

  // 设置FHE实例
  setFHEInstance(instance: FHEInstance): void {
    this.fheInstance = instance;
  }

  // 上传文件到合约
  async uploadFile(ipfsHashNumber: bigint, aesPassword: string): Promise<number> {
    if (!this.connected || !this.fheInstance || !this.contract || !this.signer) {
      throw new Error('Contract service not properly initialized');
    }

    try {
      console.log('Preparing FHE encrypted input...');

      // 获取用户地址
      const userAddress = await this.signer.getAddress();

      // 创建加密输入
      const input = this.fheInstance.createEncryptedInput(CONTRACT_ADDRESS, userAddress);
      input.add256(ipfsHashNumber);
      input.addAddress(aesPassword);

      // 加密输入
      const encryptedInput = await input.encrypt();
      console.log('Encrypted input created:', encryptedInput);

      // 设置gasLimit
      const gasLimit = 12_000_000n;

      // 调用合约
      const tx = await this.contract.uploadFile(
        encryptedInput.handles[0], // encrypted IPFS hash
        encryptedInput.handles[1], // encrypted AES password
        encryptedInput.inputProof,
        { gasLimit }
      );

      console.log('Transaction sent:', tx.hash);

      // 等待交易确认
      const receipt = await tx.wait();
      console.log('Transaction confirmed:', receipt);

      // 解析事件获取fileId
      const uploadEvent = receipt.logs.find((log: any) => {
        try {
          // 解析FileUploaded事件
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

  // 获取用户的文件列表
  async getUserFiles(userAddress?: string): Promise<number[]> {
    try {
      console.log('Reading user files from contract...');

      // 如果没有连接，先连接
      if (!this.connected || !this.contract || !this.signer) {
        console.log('Contract not ready, connecting...');
        await this.connect();
      }

      // 获取用户地址
      const address = userAddress || await this.signer!.getAddress();

      // 调用合约读取用户文件
      const fileIds = await this.contract!.getOwnerFiles(address);

      console.log('User files from contract:', fileIds);
      return fileIds.map((id: any) => Number(id.toString()));
    } catch (error) {
      console.error('Get user files failed:', error);
      throw error;
    }
  }

  // 获取文件的加密数据
  async getFileData(fileId: number): Promise<{ ipfsHash: string; aesPassword: string }> {
    if (!this.connected || !this.fheInstance || !this.contract || !this.signer) {
      throw new Error('Contract service not properly initialized');
    }

    try {
      console.log(`Reading encrypted file data for ID ${fileId}...`);

      // 获取用户地址
      const userAddress = await this.signer.getAddress();

      // 获取加密的文件数据
      const [encryptedIpfsHash, encryptedAesPassword] = await this.contract.getFileData(fileId);

      console.log('Encrypted data retrieved from contract');

      // 创建解密密钥对
      const keypair = this.fheInstance.generateKeypair();

      // 准备用户解密
      const handleContractPairs = [
        { handle: encryptedIpfsHash, contractAddress: CONTRACT_ADDRESS },
        { handle: encryptedAesPassword, contractAddress: CONTRACT_ADDRESS }
      ];

      const startTimeStamp = Math.floor(Date.now() / 1000).toString();
      const durationDays = "10";
      const contractAddresses = [CONTRACT_ADDRESS];

      // 创建EIP712签名
      const eip712 = this.fheInstance.createEIP712(
        keypair.publicKey,
        contractAddresses,
        startTimeStamp,
        durationDays
      );

      // 签名
      const signature = await this.signer.signTypedData(
        eip712.domain,
        eip712.types,
        eip712.message
      );

      // 执行用户解密
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

  // 获取文件元数据
  async getFileMetadata(fileId: number): Promise<{ owner: string; timestamp: number }> {
    if (!this.connected || !this.contract) {
      throw new Error('Contract not connected');
    }

    try {
      console.log(`Reading metadata for file ${fileId}...`);

      // 调用合约获取文件元数据
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

  // 授权文件访问
  async grantFileAccess(fileId: number, granteeAddress: string): Promise<void> {
    if (!this.connected || !this.contract) {
      throw new Error('Contract not connected');
    }

    try {
      console.log(`Granting access for file ${fileId} to ${granteeAddress}...`);

      // 设置gasLimit
      const gasLimit = 12_000_000n;

      // 调用合约授权文件访问
      const tx = await this.contract.grantFileAccess(fileId, granteeAddress, { gasLimit });

      console.log('Grant access transaction sent:', tx.hash);

      // 等待交易确认
      await tx.wait();
      console.log(`Access granted for file ${fileId} to ${granteeAddress}`);
    } catch (error) {
      console.error('Grant file access failed:', error);
      throw error;
    }
  }

  // 检查连接状态
  isConnected(): boolean {
    return this.connected && this.provider && this.signer && this.contract;
  }

  // 获取合约地址
  getContractAddress(): string {
    return CONTRACT_ADDRESS;
  }
}