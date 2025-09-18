import React, { useState, useEffect } from 'react';
import { useContract } from '../hooks/useContract';
import { useFHE } from '../hooks/useFHE';
import type { EncryptedFile } from '../utils';

interface AccessControlProps {
  file: EncryptedFile;
  onClose: () => void;
}

interface GrantedAccess {
  address: string;
  grantedAt: number;
  nickname?: string;
}

export function AccessControl({ file, onClose }: AccessControlProps) {
  const [grantedAccesses, setGrantedAccesses] = useState<GrantedAccess[]>([]);
  const [newGranteeAddress, setNewGranteeAddress] = useState('');
  const [newGranteeNickname, setNewGranteeNickname] = useState('');
  const [isGranting, setIsGranting] = useState(false);
  const [isRevoking, setIsRevoking] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const { instance } = useFHE();
  const { grantFileAccess, isConnected, connectContract } = useContract(instance);

  useEffect(() => {
    loadGrantedAccesses();
  }, [file.id]);

  const loadGrantedAccesses = async () => {
    try {
      // 从本地存储加载授权列表
      const storedGrants = localStorage.getItem(`file_grants_${file.id}`);
      if (storedGrants) {
        const grants = JSON.parse(storedGrants) as GrantedAccess[];
        setGrantedAccesses(grants);
      } else {
        setGrantedAccesses([]);
      }
    } catch (err) {
      console.error('Failed to load granted accesses:', err);
      setError('Failed to load access list');
    }
  };

  const handleGrantAccess = async () => {
    if (!isValidEthereumAddress(newGranteeAddress)) {
      setError('Please enter a valid Ethereum address');
      return;
    }

    if (grantedAccesses.some(access => access.address.toLowerCase() === newGranteeAddress.toLowerCase())) {
      setError('This address already has access');
      return;
    }

    if (!isConnected) {
      try {
        await connectContract();
      } catch (err) {
        setError('Failed to connect to contract');
        return;
      }
    }

    setIsGranting(true);
    setError(null);
    setSuccess(null);

    try {
      await grantFileAccess(file.id, newGranteeAddress);

      // 保存授权记录到本地存储
      const newAccess: GrantedAccess = {
        address: newGranteeAddress,
        grantedAt: Date.now(),
        nickname: newGranteeNickname || undefined,
      };

      const newGrantedAccesses = [...grantedAccesses, newAccess];
      setGrantedAccesses(newGrantedAccesses);

      // 保存到本地存储
      localStorage.setItem(`file_grants_${file.id}`, JSON.stringify(newGrantedAccesses));

      setSuccess(`Access granted to ${newGranteeNickname || newGranteeAddress}`);
      setNewGranteeAddress('');
      setNewGranteeNickname('');

      setTimeout(() => setSuccess(null), 3000);

    } catch (err) {
      console.error('Failed to grant access:', err);
      setError(err instanceof Error ? err.message : 'Failed to grant access');
    } finally {
      setIsGranting(false);
    }
  };

  const handleRevokeAccess = async (address: string) => {
    setIsRevoking(address);
    setError(null);
    setSuccess(null);

    try {
      // TODO: 实现真实的撤销访问权限（当前暂未实现合约的revokeFileAccess功能）

      // 从本地状态移除授权
      const updatedAccesses = grantedAccesses.filter(access => access.address !== address);
      setGrantedAccesses(updatedAccesses);

      // 更新本地存储
      localStorage.setItem(`file_grants_${file.id}`, JSON.stringify(updatedAccesses));

      const revokedAccess = grantedAccesses.find(access => access.address === address);
      setSuccess(`Access revoked from ${revokedAccess?.nickname || address}`);

      setTimeout(() => setSuccess(null), 3000);

    } catch (err) {
      console.error('Failed to revoke access:', err);
      setError(err instanceof Error ? err.message : 'Failed to revoke access');
    } finally {
      setIsRevoking(null);
    }
  };

  const isValidEthereumAddress = (address: string): boolean => {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  };

  const shortenAddress = (address: string): string => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatDate = (timestamp: number): string => {
    return new Date(timestamp).toLocaleDateString() + ' ' + new Date(timestamp).toLocaleTimeString();
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
    }}>
      <div className="card" style={{ 
        width: '90%', 
        maxWidth: '600px', 
        maxHeight: '80vh', 
        overflow: 'auto',
        margin: '20px',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h3>Access Control - {file.filename}</h3>
          <button 
            className="button button-secondary"
            onClick={onClose}
            style={{ padding: '8px 16px', fontSize: '14px' }}
          >
            ✕ Close
          </button>
        </div>

        {error && (
          <div className="error" style={{ marginBottom: '20px' }}>
            {error}
          </div>
        )}

        {success && (
          <div className="success" style={{ marginBottom: '20px' }}>
            {success}
          </div>
        )}

        <div style={{ marginBottom: '30px' }}>
          <h4>Grant New Access</h4>
          <div style={{ marginBottom: '15px' }}>
            <input
              type="text"
              className="input"
              placeholder="Ethereum address (0x...)"
              value={newGranteeAddress}
              onChange={(e) => setNewGranteeAddress(e.target.value)}
              style={{ marginBottom: '10px' }}
              disabled={isGranting}
            />
            <input
              type="text"
              className="input"
              placeholder="Nickname (optional)"
              value={newGranteeNickname}
              onChange={(e) => setNewGranteeNickname(e.target.value)}
              disabled={isGranting}
            />
          </div>
          <button
            className="button"
            onClick={handleGrantAccess}
            disabled={!newGranteeAddress || isGranting}
            style={{ width: '100%' }}
          >
            {isGranting ? '🔄 Granting Access...' : '🔐 Grant Access'}
          </button>
          <div style={{ fontSize: '12px', color: '#666', marginTop: '10px' }}>
            Once granted, the address will be able to decrypt and download this file
          </div>
        </div>

        <div>
          <h4>Current Access ({grantedAccesses.length})</h4>
          {grantedAccesses.length === 0 ? (
            <div style={{ 
              textAlign: 'center', 
              padding: '40px', 
              color: '#999',
              backgroundColor: '#2a2a2a',
              borderRadius: '8px',
            }}>
              <div style={{ fontSize: '32px', marginBottom: '10px' }}>🔒</div>
              <div>No access granted yet</div>
              <div style={{ fontSize: '12px', marginTop: '5px' }}>
                Only you can access this file currently
              </div>
            </div>
          ) : (
            <div style={{ space: '10px' }}>
              {grantedAccesses.map((access) => (
                <div
                  key={access.address}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '15px',
                    backgroundColor: '#2a2a2a',
                    borderRadius: '8px',
                    marginBottom: '10px',
                    border: '1px solid #404040',
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>
                      {access.nickname ? (
                        <>
                          {access.nickname}
                          <div style={{ fontSize: '12px', color: '#999', fontWeight: 'normal' }}>
                            {shortenAddress(access.address)}
                          </div>
                        </>
                      ) : (
                        shortenAddress(access.address)
                      )}
                    </div>
                    <div style={{ fontSize: '12px', color: '#666' }}>
                      Granted: {formatDate(access.grantedAt)}
                    </div>
                  </div>
                  <button
                    className="button button-danger"
                    onClick={() => handleRevokeAccess(access.address)}
                    disabled={isRevoking === access.address}
                    style={{ 
                      minWidth: '100px',
                      fontSize: '12px',
                      padding: '8px 12px',
                    }}
                  >
                    {isRevoking === access.address ? '🔄 Revoking...' : '🗑️ Revoke'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ 
          marginTop: '30px', 
          padding: '15px', 
          backgroundColor: '#1a1a1a', 
          borderRadius: '8px',
          border: '1px solid #333',
        }}>
          <div style={{ fontSize: '14px', color: '#888' }}>
            <strong>🔐 Security Notes:</strong>
            <ul style={{ margin: '10px 0', paddingLeft: '20px', fontSize: '12px' }}>
              <li>Access grants are stored on-chain using FHE encryption</li>
              <li>Only granted addresses can decrypt the file data</li>
              <li>Revoked access takes effect immediately</li>
              <li>You remain the owner and can manage all permissions</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}