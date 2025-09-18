import React, { useState, useEffect } from 'react';
import { FileUpload } from './components/FileUpload';
import { FileGallery } from './components/FileGallery';
import { AccessControl } from './components/AccessControl';
import { useFHE } from './hooks/useFHE';
import type { EncryptedFile } from './utils';

function App() {
  const [activeTab, setActiveTab] = useState<'upload' | 'gallery'>('gallery');
  const [selectedFile, setSelectedFile] = useState<EncryptedFile | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [isConnected, setIsConnected] = useState(false);

  const { instance, isInitializing, isInitialized, error: fheError, initializeFHE } = useFHE();

  useEffect(() => {
    const checkConnection = () => {
      setIsConnected(!!window.ethereum);
    };
    
    checkConnection();
    window.addEventListener('load', checkConnection);
    
    if (window.ethereum) {
      window.ethereum.on('accountsChanged', checkConnection);
      window.ethereum.on('chainChanged', checkConnection);
    }
    
    return () => {
      window.removeEventListener('load', checkConnection);
      if (window.ethereum) {
        window.ethereum.removeListener('accountsChanged', checkConnection);
        window.ethereum.removeListener('chainChanged', checkConnection);
      }
    };
  }, []);

  const handleUploadComplete = (fileId: number) => {
    setRefreshTrigger(prev => prev + 1);
    setActiveTab('gallery');
  };

  const handleFileSelect = (file: EncryptedFile) => {
    setSelectedFile(file);
  };

  const connectWallet = async () => {
    if (window.ethereum) {
      try {
        await window.ethereum.request({ method: 'eth_requestAccounts' });
        setIsConnected(true);
      } catch (error) {
        console.error('Failed to connect wallet:', error);
      }
    } else {
      alert('Please install MetaMask or another Web3 wallet');
    }
  };

  if (isInitializing) {
    return (
      <div className="container">
        <div className="loading">
          <div>🔐 Initializing FHE System...</div>
          <div style={{ fontSize: '14px', color: '#999', marginTop: '10px' }}>
            Loading FHE encryption system, please wait...
          </div>
        </div>
      </div>
    );
  }

  if (fheError) {
    return (
      <div className="container">
        <div className="error">
          <div>❌ Failed to initialize FHE System</div>
          <div style={{ fontSize: '14px', marginTop: '10px' }}>
            Error: {fheError}
          </div>
          <button
            className="button"
            onClick={initializeFHE}
            style={{ marginTop: '15px' }}
          >
            🔄 Retry
          </button>
        </div>
      </div>
    );
  }

  if (!isInitialized) {
    return (
      <div className="container">
        <header className="header">
          <h1>🔐 Secret Gallery</h1>
          <p>Your private encrypted file storage on the blockchain</p>
        </header>

        <div style={{
          textAlign: 'center',
          padding: '40px 20px',
          background: '#1a1a1a',
          borderRadius: '10px',
          border: '1px solid #333'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '20px' }}>🔒</div>
          <h3 style={{ marginBottom: '15px', color: '#fff' }}>Initialize FHE System</h3>
          <p style={{ marginBottom: '25px', color: '#ccc', lineHeight: '1.5' }}>
            Secret Gallery uses Fully Homomorphic Encryption (FHE) to protect your files.<br/>
            Click the button below to initialize the encryption system.
          </p>
          <button
            className="button"
            onClick={initializeFHE}
            style={{ fontSize: '16px', padding: '12px 24px' }}
          >
            🚀 Initialize FHE System
          </button>
        </div>

        <div style={{
          marginTop: '40px',
          padding: '20px',
          background: '#0f0f0f',
          borderRadius: '8px',
          border: '1px solid #222'
        }}>
          <h4 style={{ color: '#888', marginBottom: '15px', textAlign: 'center' }}>What is FHE?</h4>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '15px',
            fontSize: '14px',
            color: '#ccc'
          }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '24px', marginBottom: '8px' }}>🔐</div>
              <strong>Private by Design</strong>
              <p style={{ fontSize: '12px', marginTop: '5px' }}>
                Compute on encrypted data without revealing it
              </p>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '24px', marginBottom: '8px' }}>⛓️</div>
              <strong>On-Chain Security</strong>
              <p style={{ fontSize: '12px', marginTop: '5px' }}>
                Smart contracts work with encrypted values
              </p>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '24px', marginBottom: '8px' }}>🔑</div>
              <strong>Access Control</strong>
              <p style={{ fontSize: '12px', marginTop: '5px' }}>
                Grant selective access to encrypted data
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <header className="header">
        <h1>🔐 Secret Gallery</h1>
        <p>Your private encrypted file storage on the blockchain</p>
        
        <div style={{ marginTop: '20px' }}>
          {!isConnected ? (
            <button className="button" onClick={connectWallet}>
              🔗 Connect Wallet
            </button>
          ) : (
            <div style={{ 
              display: 'inline-block',
              background: '#28a745',
              padding: '8px 16px',
              borderRadius: '20px',
              fontSize: '14px',
              color: 'white'
            }}>
              ✅ Wallet Connected
            </div>
          )}
        </div>
      </header>

      <nav style={{ 
        display: 'flex', 
        gap: '10px', 
        marginBottom: '30px',
        justifyContent: 'center',
        flexWrap: 'wrap'
      }}>
        <button
          className={`button ${activeTab === 'gallery' ? '' : 'button-secondary'}`}
          onClick={() => setActiveTab('gallery')}
        >
          📂 My Files
        </button>
        <button
          className={`button ${activeTab === 'upload' ? '' : 'button-secondary'}`}
          onClick={() => setActiveTab('upload')}
        >
          📤 Upload
        </button>
      </nav>

      <main>
        {activeTab === 'upload' && (
          <FileUpload onUploadComplete={handleUploadComplete} />
        )}
        
        {activeTab === 'gallery' && (
          <FileGallery 
            onFileSelect={handleFileSelect}
            refreshTrigger={refreshTrigger}
          />
        )}
      </main>

      {selectedFile && (
        <AccessControl
          file={selectedFile}
          onClose={() => setSelectedFile(null)}
        />
      )}

      <footer style={{ 
        textAlign: 'center', 
        marginTop: '60px', 
        padding: '40px 0',
        borderTop: '1px solid #333',
        color: '#666'
      }}>
        <div style={{ marginBottom: '20px' }}>
          <h4 style={{ color: '#888', marginBottom: '15px' }}>How it works</h4>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: '20px',
            maxWidth: '800px',
            margin: '0 auto'
          }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '32px', marginBottom: '10px' }}>🔒</div>
              <h5 style={{ color: '#999', marginBottom: '8px' }}>1. Client-side Encryption</h5>
              <p style={{ fontSize: '12px' }}>Files are encrypted with AES-256 before leaving your device</p>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '32px', marginBottom: '10px' }}>🌐</div>
              <h5 style={{ color: '#999', marginBottom: '8px' }}>2. IPFS Storage</h5>
              <p style={{ fontSize: '12px' }}>Encrypted files are stored on the decentralized IPFS network</p>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '32px', marginBottom: '10px' }}>⛓️</div>
              <h5 style={{ color: '#999', marginBottom: '8px' }}>3. FHE Contracts</h5>
              <p style={{ fontSize: '12px' }}>IPFS hashes and passwords are encrypted on-chain with Zama FHE</p>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '32px', marginBottom: '10px' }}>🤝</div>
              <h5 style={{ color: '#999', marginBottom: '8px' }}>4. Access Control</h5>
              <p style={{ fontSize: '12px' }}>Grant encrypted access to specific addresses using FHE grants</p>
            </div>
          </div>
        </div>
        
        <div style={{ fontSize: '12px' }}>
          <p>Built with ❤️ using React + Vite + Zama FHE + IPFS</p>
          <p style={{ marginTop: '10px' }}>
            🔗 <strong>Sepolia Testnet</strong> • 
            🔐 <strong>End-to-End Encrypted</strong> • 
            🌐 <strong>Decentralized Storage</strong>
          </p>
        </div>
      </footer>
    </div>
  );
}

export default App;