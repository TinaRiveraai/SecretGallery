// Mock IPFS implementation - for demonstration, replace with real IPFS in actual projects
export class FakeIPFS {
  private static storage = new Map<string, string>();

  // Generate mock IPFS hash
  static generateHash(data: string): string {
    // Simple hash generation (use real IPFS hash in actual applications)
    const hash = btoa(data).replace(/[^a-zA-Z0-9]/g, '').substr(0, 46);
    return `Qm${hash}`;
  }

  // Mock upload file to IPFS
  static async upload(data: string): Promise<string> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const hash = this.generateHash(data);
        this.storage.set(hash, data);
        console.log(`Fake IPFS: Uploaded data with hash ${hash}`);
        resolve(hash);
      }, 500 + Math.random() * 1000); // Simulate network delay
    });
  }

  // Mock download file from IPFS
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
      }, 300 + Math.random() * 700); // Simulate network delay
    });
  }

  // Check if file exists
  static exists(hash: string): boolean {
    return this.storage.has(hash);
  }

  // Get number of stored files (for debugging)
  static getStorageSize(): number {
    return this.storage.size;
  }

  // Clear storage (for debugging)
  static clearStorage(): void {
    this.storage.clear();
  }
}