import React, { useState, useRef } from 'react';
import { FakeIPFS, FileEncryption } from '../utils';
import { useViemContract } from '../hooks/useViemContract';
import { useFHE } from '../hooks/useFHE';
import type { UploadProgress } from '../utils';

interface FileUploadProps {
  onUploadComplete?: (fileId: number) => void;
}

export function FileUpload({ onUploadComplete }: FileUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<UploadProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const { instance } = useFHE();
  const { uploadFile, isConnected, connectContract } = useViemContract(instance);

  const handleFileSelect = (files: FileList) => {
    if (files.length === 0) return;
    
    const file = files[0];
    if (file.size > 50 * 1024 * 1024) {
      setError('File size must be less than 50MB');
      return;
    }
    
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf', 'text/plain'];
    if (!allowedTypes.includes(file.type)) {
      setError('Unsupported file type. Please upload images, PDFs, or text files.');
      return;
    }
    
    processFile(file);
  };

  const processFile = async (file: File) => {
    if (!isConnected) {
      try {
        await connectContract();
      } catch (err) {
        setError('Failed to connect to contract. Please try again.');
        return;
      }
    }

    try {
      setUploading(true);
      setError(null);

      setProgress({ stage: 'encrypting', progress: 10 });

      // 生成AES密码（EVM地址格式）
      const aesPassword = FileEncryption.generatePassword();
      console.log('Generated AES password:', aesPassword);

      setProgress({ stage: 'encrypting', progress: 30 });

      // 将文件转换为Base64并加密
      const fileBase64 = await FileEncryption.fileToBase64(file);
      const encryptedData = FileEncryption.encryptFile(fileBase64, aesPassword);
      console.log('File encrypted, size:', encryptedData.length);

      setProgress({ stage: 'uploading', progress: 0 });

      // 上传到伪IPFS
      const ipfsHash = await FakeIPFS.uploadToIPFS(encryptedData);
      console.log('Uploaded to Fake IPFS:', ipfsHash);

      setProgress({ stage: 'uploading', progress: 70 });

      setProgress({ stage: 'storing', progress: 0 });

      // 转换IPFS哈希为数字
      const ipfsHashNumber = FileEncryption.hashToNumber(ipfsHash);
      console.log('IPFS hash as number:', ipfsHashNumber.toString());

      // 上传到合约
      const fileId = await uploadFile(ipfsHashNumber, aesPassword);
      console.log('Stored in contract, fileId:', fileId);

      setProgress({ stage: 'storing', progress: 90 });

      // 保存文件元数据到本地存储
      const fileMetadata = {
        filename: file.name,
        fileType: file.type,
        fileSize: file.size,
        encryptedData,
        ipfsHash,
        aesPassword,
        uploadTime: Date.now(),
      };

      localStorage.setItem(`file_meta_${fileId}`, JSON.stringify(fileMetadata));

      setProgress({ stage: 'completed', progress: 100 });

      setTimeout(() => {
        setProgress(null);
        if (onUploadComplete) {
          onUploadComplete(fileId);
        }
      }, 1000);

    } catch (err) {
      console.error('File upload failed:', err);
      setError(err instanceof Error ? err.message : 'Upload failed');
      setProgress(null);
    } finally {
      setUploading(false);
    }
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    
    const files = e.dataTransfer.files;
    handleFileSelect(files);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFileSelect(e.target.files);
    }
  };

  const openFileDialog = () => {
    fileInputRef.current?.click();
  };

  const getStageText = (stage: string) => {
    switch (stage) {
      case 'encrypting':
        return 'Encrypting file...';
      case 'uploading':
        return 'Uploading to IPFS...';
      case 'storing':
        return 'Storing on blockchain...';
      case 'completed':
        return 'Upload completed!';
      default:
        return 'Processing...';
    }
  };

  return (
    <div className="card">
      <h3>Upload Encrypted File</h3>
      
      {error && (
        <div className="error">
          {error}
        </div>
      )}
      
      {progress && (
        <div style={{ marginBottom: '20px' }}>
          <div style={{ marginBottom: '10px' }}>{getStageText(progress.stage)}</div>
          <div style={{ 
            width: '100%', 
            height: '8px', 
            backgroundColor: '#333', 
            borderRadius: '4px',
            overflow: 'hidden'
          }}>
            <div 
              style={{
                width: `${progress.progress}%`,
                height: '100%',
                backgroundColor: progress.stage === 'completed' ? '#28a745' : '#007bff',
                transition: 'width 0.3s ease',
              }}
            />
          </div>
          <div style={{ fontSize: '14px', color: '#999', marginTop: '5px' }}>
            {progress.progress}%
          </div>
        </div>
      )}
      
      <div 
        className={`upload-area ${dragOver ? 'dragover' : ''}`}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={!uploading ? openFileDialog : undefined}
        style={{ 
          cursor: uploading ? 'not-allowed' : 'pointer',
          opacity: uploading ? 0.6 : 1,
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          className="file-input"
          onChange={handleInputChange}
          accept="image/*,.pdf,.txt"
          disabled={uploading}
        />
        
        {uploading ? (
          <div>
            <div>⏳ Processing...</div>
            <div style={{ fontSize: '14px', color: '#999', marginTop: '10px' }}>
              Please wait while your file is being encrypted and uploaded
            </div>
          </div>
        ) : (
          <div>
            <div style={{ fontSize: '48px', marginBottom: '20px' }}>📁</div>
            <div>Drop files here or click to browse</div>
            <div style={{ fontSize: '14px', color: '#999', marginTop: '10px' }}>
              Supports images, PDFs, and text files (max 50MB)
            </div>
          </div>
        )}
      </div>
      
      <div style={{ marginTop: '15px', fontSize: '14px', color: '#888' }}>
        <strong>🔒 Privacy Notice:</strong>
        <ul style={{ margin: '10px 0', paddingLeft: '20px' }}>
          <li>Files are encrypted with AES-256 before upload</li>
          <li>Only you can decrypt and view your files</li>
          <li>You can grant access to specific addresses</li>
          <li>IPFS hashes and passwords are encrypted on-chain</li>
        </ul>
      </div>
    </div>
  );
}