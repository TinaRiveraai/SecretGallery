import { createPublicClient, createWalletClient, http, custom } from 'viem';
import { sepolia } from 'viem/chains';
import { SECRET_GALLERY_ABI } from './SecretGalleryABI';
import type { FHEInstance } from './index';

// 合约地址（需要部署后更新）
const CONTRACT_ADDRESS = '0x0000000000000000000000000000000000000000' as const; // TODO: 更新为实际部署地址

export class ViemContractService {
  private publicClient: any;
  private walletClient: any;
  private fheInstance: FHEInstance | null = null;
  private connected: boolean = false;

  constructor(fheInstance: FHEInstance | null = null) {
    this.fheInstance = fheInstance;

    // 创建public client
    this.publicClient = createPublicClient({
      chain: sepolia,
      transport: http()
    });
  }

  // 连接钱包
  async connect(): Promise<void> {
    try {
      if (typeof window !== 'undefined' && window.ethereum) {
        this.walletClient = createWalletClient({
          chain: sepolia,
          transport: custom(window.ethereum)
        });
      }

      this.connected = true;
      console.log('Viem contract service connected');
    } catch (error) {
      console.error('Failed to connect viem contract service:', error);
      throw error;
    }
  }

  // 设置FHE实例
  setFHEInstance(instance: FHEInstance): void {
    this.fheInstance = instance;
  }

  // 上传文件到合约
  async uploadFile(ipfsHashNumber: bigint, aesPassword: string): Promise<number> {
    if (!this.connected || !this.fheInstance || !this.walletClient) {
      throw new Error('Contract service not properly initialized');
    }

    try {
      console.log('Preparing FHE encrypted input...');

      // 获取用户地址
      const [userAddress] = await this.walletClient.getAddresses();

      // 创建加密输入
      const input = this.fheInstance.createEncryptedInput(CONTRACT_ADDRESS, userAddress);
      input.add256(ipfsHashNumber);
      input.addAddress(aesPassword);

      // 加密输入
      const encryptedInput = await input.encrypt();
      console.log('Encrypted input created:', encryptedInput);

      // 调用合约
      const hash = await this.walletClient.writeContract({
        address: CONTRACT_ADDRESS,
        abi: SECRET_GALLERY_ABI,
        functionName: 'uploadFile',
        args: [
          encryptedInput.handles[0], // encrypted IPFS hash
          encryptedInput.handles[1], // encrypted AES password
          encryptedInput.inputProof
        ],
      });

      console.log('Transaction sent:', hash);

      // 等待交易确认
      const receipt = await this.publicClient.waitForTransactionReceipt({ hash });
      console.log('Transaction confirmed:', receipt);

      // 解析事件获取fileId
      const uploadEvent = receipt.logs.find((log: any) => {
        // 解析日志以获取FileUploaded事件
        try {
          // 这里需要解析日志获取fileId
          return log.topics[0] === '0x...' // FileUploaded事件的topic
        } catch {
          return false;
        }
      });

      if (uploadEvent) {
        // 从事件中提取fileId
        const fileId = parseInt(uploadEvent.data); // 简化处理
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
    if (!this.connected || !this.walletClient) {
      throw new Error('Contract service not connected');
    }

    try {
      console.log('Reading user files from contract...');

      // 获取用户地址
      const address = userAddress || (await this.walletClient.getAddresses())[0];

      // 调用合约读取用户文件
      const fileIds = await this.publicClient.readContract({
        address: CONTRACT_ADDRESS,
        abi: SECRET_GALLERY_ABI,
        functionName: 'getOwnerFiles',
        args: [address],
      });

      console.log('User files from contract:', fileIds);
      return fileIds.map((id: any) => parseInt(id.toString()));
    } catch (error) {
      console.error('Get user files failed:', error);
      throw error;
    }
  }

  // 获取文件的加密数据
  async getFileData(fileId: number): Promise<{ ipfsHash: string; aesPassword: string }> {
    if (!this.connected || !this.fheInstance || !this.walletClient) {
      throw new Error('Contract service not properly initialized');
    }

    try {
      console.log(`Reading encrypted file data for ID ${fileId}...`);

      // 获取用户地址
      const [userAddress] = await this.walletClient.getAddresses();

      // 获取加密的文件数据
      const [encryptedIpfsHash, encryptedAesPassword] = await this.publicClient.readContract({
        address: CONTRACT_ADDRESS,
        abi: SECRET_GALLERY_ABI,
        functionName: 'getFileData',
        args: [fileId],
      });

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
      const signature = await this.walletClient.signTypedData({
        domain: eip712.domain,
        types: eip712.types,
        primaryType: 'UserDecryptRequestVerification',
        message: eip712.message,
      });

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
    if (!this.connected) {
      throw new Error('Contract not connected');
    }

    try {
      console.log(`Reading metadata for file ${fileId}...`);

      // 调用合约获取文件元数据
      const [owner, timestamp] = await this.publicClient.readContract({
        address: CONTRACT_ADDRESS,
        abi: SECRET_GALLERY_ABI,
        functionName: 'getFileMetadata',
        args: [fileId],
      });

      return {
        owner,
        timestamp: parseInt(timestamp.toString())
      };
    } catch (error) {
      console.error('Get file metadata failed:', error);
      throw error;
    }
  }

  // 授权文件访问
  async grantFileAccess(fileId: number, granteeAddress: string): Promise<void> {
    if (!this.connected || !this.walletClient) {
      throw new Error('Contract not connected');
    }

    try {
      console.log(`Granting access for file ${fileId} to ${granteeAddress}...`);

      // 调用合约授权文件访问
      const hash = await this.walletClient.writeContract({
        address: CONTRACT_ADDRESS,
        abi: SECRET_GALLERY_ABI,
        functionName: 'grantFileAccess',
        args: [fileId, granteeAddress],
      });

      console.log('Grant access transaction sent:', hash);

      // 等待交易确认
      await this.publicClient.waitForTransactionReceipt({ hash });
      console.log(`Access granted for file ${fileId} to ${granteeAddress}`);
    } catch (error) {
      console.error('Grant file access failed:', error);
      throw error;
    }
  }

  // 检查连接状态
  isConnected(): boolean {
    return this.connected;
  }

  // 获取合约地址
  getContractAddress(): string {
    return CONTRACT_ADDRESS;
  }
}