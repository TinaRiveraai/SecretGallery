import React, { useState, useRef } from 'react';
import { CryptoUtils } from '../utils/crypto';
import { IPFSUtils } from '../utils/ipfs';
import { useSecretGallery } from '../hooks/useSecretGallery';
import type { UploadProgress } from '../types';

interface FileUploadProps {
  onUploadComplete?: (fileId: number) => void;
}

export function FileUpload({ onUploadComplete }: FileUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<UploadProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const { uploadFile } = useSecretGallery();

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
    try {
      setUploading(true);
      setError(null);
      
      setProgress({ stage: 'encrypting', progress: 0 });
      
      const aesPassword = CryptoUtils.generateAESPassword();
      console.log('Generated AES password:', aesPassword);
      
      setProgress({ stage: 'encrypting', progress: 30 });
      
      const encryptedData = await CryptoUtils.encryptFile(file, aesPassword);
      console.log('File encrypted, size:', encryptedData.length);
      
      setProgress({ stage: 'uploading', progress: 0 });
      
      const ipfsHash = await IPFSUtils.uploadToIPFS(encryptedData);
      console.log('Uploaded to IPFS:', ipfsHash);
      
      setProgress({ stage: 'uploading', progress: 70 });
      
      setProgress({ stage: 'storing', progress: 0 });
      
      const fileId = await uploadFile(ipfsHash, aesPassword);
      console.log('Stored in contract, fileId:', fileId);
      
      setProgress({ stage: 'storing', progress: 90 });
      
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