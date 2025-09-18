import React, { useState, useEffect } from 'react';
import { CryptoUtils } from '../utils/crypto';
import { IPFSUtils } from '../utils/ipfs';
import { useSecretGallery } from '../hooks/useSecretGallery';
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

  const { getUserFiles } = useSecretGallery();

  useEffect(() => {
    loadUserFiles();
  }, [refreshTrigger]);

  const loadUserFiles = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const mockFiles: EncryptedFile[] = [];
      
      for (let i = 1; i <= 5; i++) {
        const savedMetadata = localStorage.getItem(`file_meta_${i}`);
        if (savedMetadata) {
          const metadata = JSON.parse(savedMetadata);
          mockFiles.push({
            id: i,
            encryptedData: metadata.encryptedData,
            ipfsHash: metadata.ipfsHash,
            aesPassword: metadata.aesPassword,
            owner: '0x' + '0'.repeat(40),
            timestamp: metadata.uploadTime || Date.now() - Math.random() * 86400000 * 7,
            filename: metadata.filename,
            fileType: metadata.fileType,
            fileSize: metadata.fileSize,
          });
        }
      }
      
      if (mockFiles.length === 0) {
        const sampleFiles: EncryptedFile[] = [
          {
            id: 1,
            encryptedData: 'encrypted_sample_1',
            ipfsHash: 'QmSampleHash1234567890123456789012345678901234',
            aesPassword: '0x1234567890123456789012345678901234567890',
            owner: '0x' + '0'.repeat(40),
            timestamp: Date.now() - 86400000 * 2,
            filename: 'vacation.jpg',
            fileType: 'image/jpeg',
            fileSize: 1024567,
          },
          {
            id: 2,
            encryptedData: 'encrypted_sample_2', 
            ipfsHash: 'QmSampleHash5678901234567890123456789012345678',
            aesPassword: '0x5678901234567890123456789012345678901234',
            owner: '0x' + '0'.repeat(40),
            timestamp: Date.now() - 86400000 * 5,
            filename: 'document.pdf',
            fileType: 'application/pdf',
            fileSize: 2048000,
          },
          {
            id: 3,
            encryptedData: 'encrypted_sample_3',
            ipfsHash: 'QmSampleHash9012345678901234567890123456789012', 
            aesPassword: '0x9012345678901234567890123456789012345678',
            owner: '0x' + '0'.repeat(40),
            timestamp: Date.now() - 86400000 * 1,
            filename: 'notes.txt',
            fileType: 'text/plain',
            fileSize: 5120,
          }
        ];
        mockFiles.push(...sampleFiles);
      }

      setFiles(mockFiles);
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
      let encryptedData = file.encryptedData;
      
      if (encryptedData === 'encrypted_sample_1' || encryptedData === 'encrypted_sample_2' || encryptedData === 'encrypted_sample_3') {
        encryptedData = 'U2FsdGVkX1+mock-encrypted-data-for-demo-' + file.id;
      }
      
      if (file.fileType.startsWith('image/')) {
        const sampleImageData = await fetch('/api/placeholder/300/200').then(r => r.arrayBuffer()).catch(() => {
          return new ArrayBuffer(0);
        });
        
        if (sampleImageData.byteLength > 0) {
          const blobUrl = CryptoUtils.createBlobURL(sampleImageData, file.fileType);
          setDecryptedPreviews(prev => new Map(prev).set(file.id, blobUrl));
        } else {
          const canvas = document.createElement('canvas');
          canvas.width = 300;
          canvas.height = 200;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            const gradient = ctx.createLinearGradient(0, 0, 300, 200);
            gradient.addColorStop(0, '#667eea');
            gradient.addColorStop(1, '#764ba2');
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, 300, 200);
            
            ctx.fillStyle = 'white';
            ctx.font = '20px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('🖼️', 150, 90);
            ctx.fillText(file.filename, 150, 130);
          }
          
          canvas.toBlob((blob) => {
            if (blob) {
              const url = URL.createObjectURL(blob);
              setDecryptedPreviews(prev => new Map(prev).set(file.id, url));
            }
          });
        }
      }
      
    } catch (err) {
      console.error('Failed to decrypt file:', err);
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
      console.log('Downloading file:', file.filename);
      
      let encryptedData = file.encryptedData;
      if (encryptedData.startsWith('encrypted_sample_')) {
        const mockContent = `Mock content for file: ${file.filename}\nFile ID: ${file.id}\nType: ${file.fileType}\nSize: ${file.fileSize} bytes\nUploaded: ${new Date(file.timestamp).toLocaleString()}`;
        const blob = new Blob([mockContent], { type: file.fileType });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = file.filename;
        a.click();
        
        URL.revokeObjectURL(url);
        return;
      }
      
      const decryptedBuffer = await CryptoUtils.decryptFile(encryptedData, file.aesPassword);
      const blob = new Blob([decryptedBuffer], { type: file.fileType });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = file.filename;
      a.click();
      
      URL.revokeObjectURL(url);
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