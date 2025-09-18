import { useState, useEffect } from 'react';
import { ContractService } from '../utils';
import type { FHEInstance } from '../utils';

export function useContract(fheInstance: FHEInstance | null) {
  const [contractService, setContractService] = useState<ContractService | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (fheInstance && !contractService) {
      const service = new ContractService(fheInstance);
      setContractService(service);
    }
  }, [fheInstance, contractService]);

  const connectContract = async () => {
    if (!contractService) {
      setError('Contract service not initialized');
      return;
    }

    try {
      setIsConnecting(true);
      setError(null);

      await contractService.connect();
      console.log('Contract connected successfully');
    } catch (err) {
      console.error('Failed to connect contract:', err);
      setError(err instanceof Error ? err.message : 'Failed to connect to contract');
    } finally {
      setIsConnecting(false);
    }
  };

  const uploadFile = async (ipfsHashNumber: bigint, aesPassword: string): Promise<number> => {
    if (!contractService?.isConnected()) {
      throw new Error('Contract not connected');
    }
    return contractService.uploadFile(ipfsHashNumber, aesPassword);
  };

  const getUserFiles = async (userAddress?: string): Promise<number[]> => {
    if (!contractService?.isConnected()) {
      throw new Error('Contract not connected');
    }
    return contractService.getUserFiles(userAddress);
  };

  const getFileData = async (fileId: number) => {
    if (!contractService?.isConnected()) {
      throw new Error('Contract not connected');
    }
    return contractService.getFileData(fileId);
  };

  const getFileMetadata = async (fileId: number) => {
    if (!contractService?.isConnected()) {
      throw new Error('Contract not connected');
    }
    return contractService.getFileMetadata(fileId);
  };

  const grantFileAccess = async (fileId: number, granteeAddress: string) => {
    if (!contractService?.isConnected()) {
      throw new Error('Contract not connected');
    }
    return contractService.grantFileAccess(fileId, granteeAddress);
  };

  return {
    contractService,
    isConnecting,
    error,
    isConnected: contractService?.isConnected() || false,
    connectContract,
    uploadFile,
    getUserFiles,
    getFileData,
    getFileMetadata,
    grantFileAccess,
  };
}