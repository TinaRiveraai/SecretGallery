export class IPFSUtils {
  static async uploadToIPFS(encryptedData: string): Promise<string> {
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));
    
    const mockHash = this.generateMockIPFSHash(encryptedData);
    console.log('Mock IPFS upload:', mockHash);
    return mockHash;
  }

  static async downloadFromIPFS(hash: string): Promise<string> {
    await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1500));
    
    const storedData = localStorage.getItem(`ipfs_${hash}`);
    if (!storedData) {
      throw new Error('File not found in IPFS (mock storage)');
    }
    
    console.log('Mock IPFS download:', hash);
    return storedData;
  }

  static convertHashToNumber(hash: string): bigint {
    let result = BigInt(0);
    for (let i = 0; i < hash.length; i++) {
      const charCode = BigInt(hash.charCodeAt(i));
      result = result * BigInt(256) + charCode;
    }
    return result;
  }

  static convertNumberToHash(num: bigint): string {
    let result = '';
    let remaining = num;
    
    while (remaining > 0) {
      const charCode = Number(remaining % BigInt(256));
      result = String.fromCharCode(charCode) + result;
      remaining = remaining / BigInt(256);
    }
    
    return result;
  }

  private static generateMockIPFSHash(data: string): string {
    const hash = this.simpleHash(data);
    const ipfsHash = `Qm${hash.padEnd(44, '0').slice(0, 44)}`;
    
    localStorage.setItem(`ipfs_${ipfsHash}`, data);
    
    return ipfsHash;
  }

  private static simpleHash(input: string): string {
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
      const char = input.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }

  static isValidIPFSHash(hash: string): boolean {
    return /^Qm[1-9A-HJ-NP-Za-km-z]{44}$/.test(hash);
  }
}