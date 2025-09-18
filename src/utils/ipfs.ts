export class FakeIPFS {
  private static storage: Map<string, string> = new Map();

  // Mock IPFS上传 - 生成假的IPFS hash并存储数据
  static async uploadToIPFS(encryptedData: string): Promise<string> {
    // 生成符合IPFS格式的假hash (Qm开头，46个字符，base58编码)
    const base58chars = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

    // 创建一个简单的hash函数
    const createHash = (input: string): string => {
      let hash = 0;
      for (let i = 0; i < input.length; i++) {
        const char = input.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // 转换为32位整数
      }
      return Math.abs(hash).toString();
    };

    // 使用数据内容、时间戳和随机数生成hash
    const seed = createHash(encryptedData + Date.now() + Math.random());

    // 生成44位base58字符串
    let fakeHash = 'Qm';
    const seedNum = parseInt(seed);

    for (let i = 0; i < 44; i++) {
      const index = (seedNum + i * 7) % base58chars.length;
      fakeHash += base58chars[index];
    }

    // 存储到内存中模拟IPFS存储
    this.storage.set(fakeHash, encryptedData);

    console.log(`Mock IPFS upload: ${fakeHash}`);

    // 模拟网络延迟
    await new Promise(resolve => setTimeout(resolve, 100));

    return fakeHash;
  }

  // Mock IPFS下载 - 从存储中获取数据
  static async downloadFromIPFS(hash: string): Promise<string> {
    // 模拟网络延迟
    await new Promise(resolve => setTimeout(resolve, 50));

    const data = this.storage.get(hash);
    if (!data) {
      throw new Error(`Mock IPFS: File not found for hash ${hash}`);
    }

    console.log(`Mock IPFS download: ${hash}`);
    return data;
  }

  static convertHashToNumber(hash: string): bigint {
    // 移除 "Qm" 前缀
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

  // 清理存储（用于测试）
  static clearStorage(): void {
    this.storage.clear();
  }

  // 获取存储状态（用于调试）
  static getStorageInfo(): { count: number; hashes: string[] } {
    return {
      count: this.storage.size,
      hashes: Array.from(this.storage.keys())
    };
  }
}