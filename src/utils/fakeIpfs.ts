// 伪IPFS实现 - 用于演示，实际项目中替换为真实IPFS
export class FakeIPFS {
  private static storage = new Map<string, string>();

  // 生成伪IPFS哈希
  static generateHash(data: string): string {
    // 简单的哈希生成（实际应用中使用真实IPFS哈希）
    const hash = btoa(data).replace(/[^a-zA-Z0-9]/g, '').substr(0, 46);
    return `Qm${hash}`;
  }

  // 伪上传文件到IPFS
  static async upload(data: string): Promise<string> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const hash = this.generateHash(data);
        this.storage.set(hash, data);
        console.log(`Fake IPFS: Uploaded data with hash ${hash}`);
        resolve(hash);
      }, 500 + Math.random() * 1000); // 模拟网络延迟
    });
  }

  // 伪从IPFS下载文件
  static async download(hash: string): Promise<string> {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        const data = this.storage.get(hash);
        if (data) {
          console.log(`Fake IPFS: Downloaded data for hash ${hash}`);
          resolve(data);
        } else {
          reject(new Error(`File not found for hash: ${hash}`));
        }
      }, 300 + Math.random() * 700); // 模拟网络延迟
    });
  }

  // 检查文件是否存在
  static exists(hash: string): boolean {
    return this.storage.has(hash);
  }

  // 获取存储的文件数量（调试用）
  static getStorageSize(): number {
    return this.storage.size;
  }

  // 清空存储（调试用）
  static clearStorage(): void {
    this.storage.clear();
  }
}