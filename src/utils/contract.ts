import { ethers } from 'ethers';
import type { FHEInstance } from './index';

// 合约ABI（根据SecretGallery.sol生成）
const SECRET_GALLERY_ABI = [
  {
    "inputs": [
      {
        "internalType": "externalEuint256",
        "name": "encryptedIpfsHash",
        "type": "bytes32"
      },
      {
        "internalType": "externalEaddress",
        "name": "encryptedPassword",
        "type": "bytes32"
      },
      {
        "internalType": "bytes",
        "name": "inputProof",
        "type": "bytes"
      }
    ],
    "name": "uploadFile",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "fileId",
        "type": "uint256"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "fileId",
        "type": "uint256"
      }
    ],
    "name": "getFileData",
    "outputs": [
      {
        "internalType": "euint256",
        "name": "ipfsHash",
        "type": "bytes32"
      },
      {
        "internalType": "eaddress",
        "name": "aesPassword",
        "type": "bytes32"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "owner",
        "type": "address"
      }
    ],
    "name": "getOwnerFiles",
    "outputs": [
      {
        "internalType": "uint256[]",
        "name": "",
        "type": "uint256[]"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "fileId",
        "type": "uint256"
      },
      {
        "internalType": "address",
        "name": "grantee",
        "type": "address"
      }
    ],
    "name": "grantFileAccess",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "fileId",
        "type": "uint256"
      }
    ],
    "name": "getFileMetadata",
    "outputs": [
      {
        "internalType": "address",
        "name": "owner",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "timestamp",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  }
];

// 合约地址（模拟地址用于演示）
const CONTRACT_ADDRESS = '0x1234567890123456789012345678901234567890'; // 模拟合约地址

export class ContractService {
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
      // 模拟连接成功
      console.log('Contract service connected (simulated)');
      this.connected = true;
    } catch (error) {
      console.error('Failed to connect contract service:', error);
      throw error;
    }
  }

  // 设置FHE实例
  setFHEInstance(instance: FHEInstance): void {
    this.fheInstance = instance;
  }

  // 上传文件到合约（模拟）
  async uploadFile(ipfsHashNumber: bigint, aesPassword: string): Promise<number> {
    if (!this.connected) {
      throw new Error('Contract service not connected');
    }

    try {
      // 模拟上传过程
      await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));

      // 生成模拟的文件ID
      const fileId = Date.now() % 1000000;

      console.log(`File uploaded (simulated): ID ${fileId}, IPFS hash: ${ipfsHashNumber.toString()}, Password: ${aesPassword}`);

      return fileId;
    } catch (error) {
      console.error('Upload file failed:', error);
      throw error;
    }
  }

  // 获取用户的文件列表（模拟）
  async getUserFiles(userAddress?: string): Promise<number[]> {
    if (!this.connected) {
      throw new Error('Contract service not connected');
    }

    try {
      // 从本地存储获取用户文件
      const files: number[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('file_meta_')) {
          const fileId = parseInt(key.replace('file_meta_', ''));
          if (!isNaN(fileId)) {
            files.push(fileId);
          }
        }
      }
      return files.sort((a, b) => b - a); // 最新的在前
    } catch (error) {
      console.error('Get user files failed:', error);
      throw error;
    }
  }

  // 获取文件的加密数据（模拟）
  async getFileData(fileId: number): Promise<{ ipfsHash: string; aesPassword: string }> {
    if (!this.connected) {
      throw new Error('Contract service not connected');
    }

    try {
      // 从本地存储获取文件元数据
      const cachedMetaStr = localStorage.getItem(`file_meta_${fileId}`);
      if (!cachedMetaStr) {
        throw new Error('File not found');
      }

      const cachedMeta = JSON.parse(cachedMetaStr);
      return {
        ipfsHash: cachedMeta.ipfsHash,
        aesPassword: cachedMeta.aesPassword
      };
    } catch (error) {
      console.error('Get file data failed:', error);
      throw error;
    }
  }

  // 获取文件元数据（模拟）
  async getFileMetadata(fileId: number): Promise<{ owner: string; timestamp: number }> {
    if (!this.connected) {
      throw new Error('Contract not connected');
    }

    try {
      // 从本地存储获取文件元数据
      const cachedMetaStr = localStorage.getItem(`file_meta_${fileId}`);
      if (!cachedMetaStr) {
        throw new Error('File not found');
      }

      const cachedMeta = JSON.parse(cachedMetaStr);
      return {
        owner: '0x1234567890123456789012345678901234567890', // 模拟用户地址
        timestamp: Math.floor(cachedMeta.uploadTime / 1000)
      };
    } catch (error) {
      console.error('Get file metadata failed:', error);
      throw error;
    }
  }

  // 授权文件访问（模拟）
  async grantFileAccess(fileId: number, granteeAddress: string): Promise<void> {
    if (!this.connected) {
      throw new Error('Contract not connected');
    }

    try {
      // 模拟授权过程
      await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000));
      console.log(`Access granted for file ${fileId} to ${granteeAddress} (simulated)`);
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