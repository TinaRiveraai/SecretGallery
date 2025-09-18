import React, { useState, useEffect } from 'react';
import { FakeIPFS, FileEncryption } from '../utils';
import { useViemContract } from '../hooks/useViemContract';
import { useFHE } from '../hooks/useFHE';
import type { EncryptedFile, FileMetadata } from '../utils';

interface FileGalleryProps {
  onFileSelect?: (file: EncryptedFile) => void;
  refreshTrigger?: number;
}

export function FileGallery({ onFileSelect, refreshTrigger }: FileGalleryProps) {
  const [files, setFiles] = useState<EncryptedFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [decryptingFiles, setDecryptingFiles] = useState<Set<number>>(new Set());
  const [decryptedPreviews, setDecryptedPreviews] = useState<Map<number, string>>(new Map());

  const { instance } = useFHE();
  const { getUserFiles, getFileData, getFileMetadata, isConnected, connectContract } = useViemContract(instance);

  useEffect(() => {
    loadUserFiles();
  }, [refreshTrigger]);

  const loadUserFiles = async () => {
    if (!isConnected) {
      try {
        await connectContract();
      } catch (err) {
        setError('Failed to connect to contract');
        setLoading(false);
        return;
      }
    }

    try {
      setLoading(true);
      setError(null);

      // 获取用户的文件ID列表
      const fileIds = await getUserFiles();
      console.log('User file IDs:', fileIds);

      // 转换文件ID为EncryptedFile对象
      const filePromises = fileIds.map(async (fileId: number) => {
        try {
          // 获取文件元数据
          const metadata = await getFileMetadata(fileId);

          // 从本地存储获取缓存的元数据（如果有）
          const cachedMetaStr = localStorage.getItem(`file_meta_${fileId}`);
          const cachedMeta = cachedMetaStr ? JSON.parse(cachedMetaStr) : null;

          const encryptedFile: EncryptedFile = {
            id: fileId,
            encryptedData: cachedMeta?.encryptedData || '',
            ipfsHash: cachedMeta?.ipfsHash || '',
            aesPassword: cachedMeta?.aesPassword || '',
            owner: metadata.owner,
            timestamp: metadata.timestamp * 1000, // 转换为毫秒
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
      setError('Failed to load files');
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
      const encryptedData = await FakeIPFS.download(ipfsHash);

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
      const encryptedData = await FakeIPFS.download(ipfsHash);

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