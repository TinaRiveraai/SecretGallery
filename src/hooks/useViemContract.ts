import { useState, useEffect } from 'react';
import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { EthersContractService } from '../utils/viemContract';
import type { FHEInstance } from '../utils';

export function useViemContract(fheInstance: FHEInstance | null) {
  const [contractService, setContractService] = useState<EthersContractService | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();

  useEffect(() => {
    if (fheInstance) {
      const service = new EthersContractService(fheInstance);
      setContractService(service);
    }
  }, [fheInstance]);

  const connectContract = async () => {
    if (!contractService) {
      setError('Contract service not initialized');
      return;
    }

    try {
      setIsConnecting(true);
      setError(null);

      // 连接钱包
      if (!isConnected) {
        const connector = connectors[0]; // 使用第一个可用的连接器
        if (connector) {
          connect({ connector });
        }
      }

      // 连接合约服务
      await contractService.connect();
      console.log('Viem contract connected successfully');
    } catch (err) {
      console.error('Failed to connect viem contract:', err);
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
    if (!contractService) {
      throw new Error('Contract service not initialized');
    }

    try {
      // 直接尝试调用，让EthersContractService内部处理连接
      return await contractService.getUserFiles(userAddress || address);
    } catch (err) {
      // 如果失败，尝试连接然后重试
      console.log('First attempt failed, trying to connect...');
      await connectContract();
      return await contractService.getUserFiles(userAddress || address);
    }
  };

  const getFileData = async (fileId: number) => {
    if (!contractService?.isConnected()) {
      await connectContract();
    }
    if (!contractService?.isConnected()) {
      throw new Error('Contract not connected');
    }
    return contractService.getFileData(fileId);
  };

  const getFileMetadata = async (fileId: number) => {
    if (!contractService?.isConnected()) {
      await connectContract();
    }
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
    walletConnected: isConnected,
    address,
    connectContract,
    disconnect,
    uploadFile,
    getUserFiles,
    getFileData,
    getFileMetadata,
    grantFileAccess,
  };
}