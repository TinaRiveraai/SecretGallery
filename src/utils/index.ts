// 数据类型定义
export interface EncryptedFile {
  id: number;
  encryptedData: string;
  ipfsHash: string;
  aesPassword: string;
  owner: string;
  timestamp: number;
  filename: string;
  fileType: string;
  fileSize: number;
}

export interface FileMetadata {
  owner: string;
  timestamp: number;
  filename: string;
  fileType: string;
  fileSize: number;
}

export interface UploadProgress {
  stage: 'encrypting' | 'uploading' | 'storing' | 'completed';
  progress: number;
}

export interface ContractConfig {
  address: string;
  chainId: number;
}

export interface FHEInstance {
  createEncryptedInput: (contractAddress: string, userAddress: string) => any;
  generateKeypair: () => { publicKey: string; privateKey: string };
  userDecrypt: (...args: any[]) => Promise<any>;
  createEIP712: (publicKey: string, contractAddresses: string[], startTimeStamp: string, durationDays: string) => any;
}

// 导出工具类
export { FakeIPFS } from './ipfs';
export { CryptoUtils } from './crypto';
export { CryptoUtils as FileEncryption } from './crypto'; // 兼容性别名
export { EthersContractService } from './viemContract';