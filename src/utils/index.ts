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
}