export class FakeIPFS {
  private static storage: Map<string, string> = new Map();

  // Mock IPFS upload - generate fake IPFS hash and store data
  static async uploadToIPFS(encryptedData: string): Promise<string> {
    // Generate fake hash in IPFS format (starts with Qm, 46 characters, base58 encoded)
    const base58chars = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

    // Create a simple hash function
    const createHash = (input: string): string => {
      let hash = 0;
      for (let i = 0; i < input.length; i++) {
        const char = input.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32-bit integer
      }
      return Math.abs(hash).toString();
    };

    // Use data content, timestamp and random number to generate hash
    const seed = createHash(encryptedData + Date.now() + Math.random());

    // Generate 44-character base58 string
    let fakeHash = 'Qm';
    const seedNum = parseInt(seed);

    for (let i = 0; i < 44; i++) {
      const index = (seedNum + i * 7) % base58chars.length;
      fakeHash += base58chars[index];
    }

    // Store in memory to simulate IPFS storage
    this.storage.set(fakeHash, encryptedData);

    console.log(`Mock IPFS upload: ${fakeHash}`);

    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 100));

    return fakeHash;
  }

  // Mock IPFS download - get data from storage or return fake data
  static async downloadFromIPFS(hash: string): Promise<string> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 50));

    const data = this.storage.get(hash);
    if (!data) {
      // If file not found, return fake encrypted data instead of throwing error
      console.log(`Mock IPFS: File not found for hash ${hash}, returning fake data`);

      // Generate fake encrypted data (simple base64 encoded text)
      const fakeContent = `This is fake encrypted data for hash ${hash}`;
      const fakeEncryptedData = btoa(fakeContent);
      return fakeEncryptedData;
    }

    console.log(`Mock IPFS download: ${hash}`);
    return data;
  }

  static convertHashToNumber(hash: string): bigint {
    // Remove "Qm" prefix
    const hashWithoutPrefix = hash.replace(/^Qm/, '');

    let result = BigInt(0);
    for (let i = 0; i < Math.min(hashWithoutPrefix.length, 30); i++) {
      const charCode = BigInt(hashWithoutPrefix.charCodeAt(i));
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

    return 'Qm' + result;
  }

  static isValidIPFSHash(hash: string): boolean {
    return /^Qm[1-9A-HJ-NP-Za-km-z]{44}$/.test(hash);
  }

  // Clear storage (for testing)
  static clearStorage(): void {
    this.storage.clear();
  }

  // Get storage status (for debugging)
  static getStorageInfo(): { count: number; hashes: string[] } {
    return {
      count: this.storage.size,
      hashes: Array.from(this.storage.keys())
    };
  }
}