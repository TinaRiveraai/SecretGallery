import React, { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { ethers } from 'ethers';
import { FakeIPFS, FileEncryption } from '../utils';
import { useFHE } from '../hooks/useFHE';
import { SECRET_GALLERY_ABI } from '../utils/SecretGalleryABI';
import type { EncryptedFile } from '../utils';

interface FileGalleryProps {
  onFileSelect?: (file: EncryptedFile) => void;
  refreshTrigger?: number;
  fheInstance?: any; // FHE实例从父组件传入
}

export function FileGallery({ onFileSelect, refreshTrigger, fheInstance }: FileGalleryProps) {
  const [files, setFiles] = useState<EncryptedFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [decryptingFiles, setDecryptingFiles] = useState<Set<number>>(new Set());
  const [decryptedPreviews, setDecryptedPreviews] = useState<Map<number, string>>(new Map());

  // 使用wagmi检查钱包连接状态
  const { isConnected: walletConnected, address: walletAddress } = useAccount();

  // 使用传入的FHE实例，如果没有则使用hook
  const { instance: hookInstance } = useFHE();
  const instance = fheInstance || hookInstance;

  const CONTRACT_ADDRESS = '0x0abd7c0266b5Dd044A9888F93530b1680fBeda0E';

  useEffect(() => {
    if (instance) {
      loadUserFiles();
    }
  }, [refreshTrigger, instance]);

  const getFileData = async (fileId: number) => {
    if (!window.ethereum) {
      throw new Error('MetaMask not found');
    }

    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    const contract = new ethers.Contract(CONTRACT_ADDRESS, SECRET_GALLERY_ABI, signer);
    const userAddress = await signer.getAddress();

    // 获取加密的文件数据
    const [encryptedIpfsHash, encryptedAesPassword] = await contract.getFileData(fileId);

    // 创建解密密钥对
    const keypair = instance.generateKeypair();

    // 准备用户解密
    const handleContractPairs = [
      { handle: encryptedIpfsHash, contractAddress: CONTRACT_ADDRESS },
      { handle: encryptedAesPassword, contractAddress: CONTRACT_ADDRESS }
    ];

    const startTimeStamp = Math.floor(Date.now() / 1000).toString();
    const durationDays = "10";
    const contractAddresses = [CONTRACT_ADDRESS];

    // 创建EIP712签名
    const eip712 = instance.createEIP712(
      keypair.publicKey,
      contractAddresses,
      startTimeStamp,
      durationDays
    );

    // 签名
    const signature = await signer.signTypedData(
      eip712.domain,
      eip712.types,
      eip712.message
    );

    // 执行用户解密
    const decryptedData = await instance.userDecrypt(
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
  };

  const loadUserFiles = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('Loading user files...');

      // 直接从合约读取
      if (!window.ethereum) {
        throw new Error('MetaMask not found');
      }

      const provider = new ethers.BrowserProvider(window.ethereum);
      const contract = new ethers.Contract(CONTRACT_ADDRESS, SECRET_GALLERY_ABI, provider);

      let userAddress = walletAddress;
      if (!userAddress) {
        const signer = await provider.getSigner();
        userAddress = await signer.getAddress();
      }

      console.log('Reading files for user:', userAddress);
      const fileIds = await contract.getOwnerFiles(userAddress);
      console.log('User file IDs:', fileIds);

      // 转换文件ID为EncryptedFile对象
      const filePromises = fileIds.map(async (fileId: any) => {
        try {
          const id = Number(fileId.toString());

          // 获取文件元数据
          const [owner, timestamp] = await contract.getFileMetadata(id);

          // 从本地存储获取缓存的元数据（如果有）
          const cachedMetaStr = localStorage.getItem(`file_meta_${fileId}`);
          const cachedMeta = cachedMetaStr ? JSON.parse(cachedMetaStr) : null;

          const encryptedFile: EncryptedFile = {
            id: fileId,
            encryptedData: cachedMeta?.encryptedData || '',
            ipfsHash: cachedMeta?.ipfsHash || '',
            aesPassword: cachedMeta?.aesPassword || '',
            owner: owner,
            timestamp: Number(timestamp.toString()) * 1000, // 转换为毫秒
            filename: cachedMeta?.filename || `File ${fileId}`,
            fileType: cachedMeta?.fileType || 'application/octet-stream',
            fileSize: cachedMeta?.fileSize || 0,
          };

          return encryptedFile;
        } catch (err) {
          console.error(`Failed to load file ${fileId}:`, err);
          return null;
        }
      });

      const loadedFiles = (await Promise.all(filePromises)).filter(Boolean) as EncryptedFile[];
      setFiles(loadedFiles);
    } catch (err) {
      console.error('Failed to load files:', err);

      let errorMessage = 'Failed to load files';
      if (err instanceof Error) {
        errorMessage = err.message;
      }

      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const decryptAndPreview = async (file: EncryptedFile) => {
    if (decryptingFiles.has(file.id)) return;

    setDecryptingFiles(prev => new Set(prev).add(file.id));

    try {
      let ipfsHash, aesPassword;

      // 如果本地有缓存，直接使用
      if (file.ipfsHash && file.aesPassword) {
        ipfsHash = file.ipfsHash;
        aesPassword = file.aesPassword;
      } else {
        // 从合约获取加密的文件数据
        const fileData = await getFileData(file.id);
        ipfsHash = FileEncryption.numberToHash(BigInt(fileData.ipfsHash));
        aesPassword = fileData.aesPassword;
      }

      // 从伪IPFS下载加密数据
      const encryptedData = await FakeIPFS.downloadFromIPFS(ipfsHash);

      // 解密文件数据
      const decryptedBase64 = FileEncryption.decryptFile(encryptedData, aesPassword);

      // 为图片创建预览URL
      if (file.fileType.startsWith('image/')) {
        setDecryptedPreviews(prev => new Map(prev).set(file.id, decryptedBase64));
      }
    } catch (err) {
      console.error('Failed to decrypt file:', err);
      alert('Failed to decrypt file: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setDecryptingFiles(prev => {
        const next = new Set(prev);
        next.delete(file.id);
        return next;
      });
    }
  };

  const downloadFile = async (file: EncryptedFile) => {
    try {
      let ipfsHash, aesPassword;

      // 如果本地有缓存，直接使用
      if (file.ipfsHash && file.aesPassword) {
        ipfsHash = file.ipfsHash;
        aesPassword = file.aesPassword;
      } else {
        // 从合约获取加密的文件数据
        const fileData = await getFileData(file.id);
        ipfsHash = FileEncryption.numberToHash(BigInt(fileData.ipfsHash));
        aesPassword = fileData.aesPassword;
      }

      // 从伪IPFS下载加密数据
      const encryptedData = await FakeIPFS.downloadFromIPFS(ipfsHash);

      // 解密文件数据
      const decryptedBase64 = FileEncryption.decryptFile(encryptedData, aesPassword);

      // 创建Blob并触发下载
      const blob = FileEncryption.base64ToBlob(decryptedBase64, file.fileType);
      const url = URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = url;
      a.download = file.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      console.log('File downloaded successfully');
    } catch (err) {
      console.error('Failed to download file:', err);
      alert('Failed to download file: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) return '🖼️';
    if (fileType === 'application/pdf') return '📄';
    if (fileType.startsWith('text/')) return '📝';
    return '📁';
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString() + ' ' + new Date(timestamp).toLocaleTimeString();
  };


  if (loading) {
    return (
      <div className="loading">
        <div>Loading your encrypted files...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error">
        {error}
      </div>
    );
  }

  if (files.length === 0) {
    return (
      <div className="card">
        <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
          <div style={{ fontSize: '48px', marginBottom: '20px' }}>📂</div>
          <div>No files uploaded yet</div>
          <div style={{ fontSize: '14px', marginTop: '10px' }}>
            Upload your first encrypted file to get started
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <h3>Your Encrypted Files ({files.length})</h3>
      
      <div className="gallery-grid">
        {files.map(file => (
          <div key={file.id} className="file-item">
            <div style={{ marginBottom: '15px', textAlign: 'center' }}>
              {file.fileType.startsWith('image/') && decryptedPreviews.has(file.id) ? (
                <img 
                  src={decryptedPreviews.get(file.id)} 
                  alt={file.filename}
                  style={{ 
                    maxWidth: '100%', 
                    maxHeight: '200px', 
                    borderRadius: '8px',
                    objectFit: 'cover'
                  }}
                />
              ) : (
                <div style={{ 
                  height: '200px', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  backgroundColor: '#333',
                  borderRadius: '8px',
                  flexDirection: 'column',
                }}>
                  <div style={{ fontSize: '48px', marginBottom: '10px' }}>
                    {getFileIcon(file.fileType)}
                  </div>
                  {file.fileType.startsWith('image/') && (
                    <button 
                      className="button button-secondary"
                      onClick={() => decryptAndPreview(file)}
                      disabled={decryptingFiles.has(file.id)}
                      style={{ fontSize: '12px', padding: '6px 12px' }}
                    >
                      {decryptingFiles.has(file.id) ? 'Decrypting...' : 'Preview'}
                    </button>
                  )}
                </div>
              )}
            </div>
            
            <div style={{ marginBottom: '10px' }}>
              <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>
                {file.filename}
              </div>
              <div style={{ fontSize: '12px', color: '#999' }}>
                {formatFileSize(file.fileSize)} • {formatDate(file.timestamp)}
              </div>
              <div style={{ fontSize: '12px', color: '#666' }}>
                File #{file.id} • {file.fileType}
              </div>
            </div>
            
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <button 
                className="button"
                onClick={() => downloadFile(file)}
                style={{ flex: 1, minWidth: '80px', fontSize: '12px', padding: '8px' }}
              >
                📥 Download
              </button>
              {onFileSelect && (
                <button 
                  className="button button-secondary"
                  onClick={() => onFileSelect(file)}
                  style={{ flex: 1, minWidth: '80px', fontSize: '12px', padding: '8px' }}
                >
                  ⚙️ Manage
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}