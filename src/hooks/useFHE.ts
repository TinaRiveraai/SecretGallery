import { useState } from 'react';
import { initSDK, createInstance, SepoliaConfig } from '@zama-fhe/relayer-sdk/bundle';
import type { FHEInstance } from '../utils';

// 添加window类型声明
declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: any[] }) => Promise<any>;
      on: (event: string, handler: Function) => void;
      removeListener: (event: string, handler: Function) => void;
    };
  }
}

export function useFHE() {
  const [instance, setInstance] = useState<FHEInstance | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  const initializeFHE = async () => {
    try {
      setIsInitializing(true);
      setError(null);

      console.log('Loading FHE WASM...');
      await initSDK();

      console.log('Creating FHE instance...');
      const config = {
        ...SepoliaConfig,
        network: (typeof window !== 'undefined' && window.ethereum) || 'https://sepolia.infura.io/v3/YOUR_INFURA_KEY'
      };

      const fheInstance = await createInstance(config);

      setInstance(fheInstance as FHEInstance);
      setIsInitialized(true);
      console.log('FHE initialized successfully');

    } catch (err) {
      console.error('Failed to initialize FHE:', err);
      setError(err instanceof Error ? err.message : 'Failed to initialize FHE');
    } finally {
      setIsInitializing(false);
    }
  };

  const createEncryptedInput = (contractAddress: string, userAddress: string) => {
    if (!instance) {
      throw new Error('FHE instance not initialized');
    }
    return instance.createEncryptedInput(contractAddress, userAddress);
  };

  const generateKeypair = () => {
    if (!instance) {
      throw new Error('FHE instance not initialized');
    }
    return instance.generateKeypair();
  };

  const userDecrypt = async (
    handleContractPairs: Array<{ handle: string; contractAddress: string }>,
    privateKey: string,
    publicKey: string,
    signature: string,
    contractAddresses: string[],
    userAddress: string,
    startTimeStamp: string,
    durationDays: string
  ) => {
    if (!instance) {
      throw new Error('FHE instance not initialized');
    }
    return instance.userDecrypt(
      handleContractPairs,
      privateKey,
      publicKey,
      signature,
      contractAddresses,
      userAddress,
      startTimeStamp,
      durationDays
    );
  };

  return {
    instance,
    isInitializing,
    isInitialized,
    error,
    initializeFHE,
    createEncryptedInput,
    generateKeypair,
    userDecrypt,
  };
}