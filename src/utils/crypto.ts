export class CryptoUtils {
  // 生成AES密码（Mock - 伪造成EVM地址格式）
  static generatePassword(): string {
    const randomHex = Math.random().toString(16).substr(2, 40);
    return '0x' + randomHex.padEnd(40, '0');
  }

  static generateAESPassword(): string {
    return this.generatePassword();
  }

  static formatAsEVMAddress(input: string): string {
    // Mock格式化为EVM地址
    const hash = input.replace(/[^0-9a-f]/gi, '').toLowerCase();
    return '0x' + hash.substr(0, 40).padEnd(40, '0');
  }

  // Mock AES加密文件（使用简单编码模拟）
  static encryptFile(fileData: string, password: string): string {
    try {
      // Mock加密：简单的base64编码 + 密码前缀
      const base64Data = btoa(fileData);
      const mockEncrypted = `mock_encrypted_${password.slice(-8)}_${base64Data}`;
      console.log('File encrypted successfully (mock)');
      return mockEncrypted;
    } catch (error) {
      console.error('Mock encryption failed:', error);
      throw new Error('Failed to encrypt file');
    }
  }

  // Mock AES解密文件
  static decryptFile(encryptedData: string, password: string): string {
    try {
      // Mock解密：检查密码并解码base64
      const passwordSuffix = password.slice(-8);
      const prefix = `mock_encrypted_${passwordSuffix}_`;

      if (!encryptedData.startsWith(prefix)) {
        throw new Error('Invalid password or corrupted data');
      }

      const base64Data = encryptedData.substring(prefix.length);
      const decryptedString = atob(base64Data);

      if (!decryptedString) {
        throw new Error('Invalid password or corrupted data');
      }

      console.log('File decrypted successfully (mock)');
      return decryptedString;
    } catch (error) {
      console.error('Mock decryption failed:', error);
      throw new Error('Failed to decrypt file');
    }
  }

  // 将文件转换为Base64字符串
  static fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result);
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  }

  // 将Base64字符串转换为Blob
  static base64ToBlob(base64: string, type: string): Blob {
    const byteCharacters = atob(base64.split(',')[1]);
    const byteNumbers = new Array(byteCharacters.length);

    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }

    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type });
  }

  // IPFS哈希转换为数字（简化版）
  static hashToNumber(hash: string): bigint {
    // 移除 "Qm" 前缀并转换为数字
    const hashWithoutPrefix = hash.replace(/^Qm/, '');

    // 使用简单的字符编码转换为数字
    let result = BigInt(0);
    for (let i = 0; i < Math.min(hashWithoutPrefix.length, 30); i++) {
      const charCode = BigInt(hashWithoutPrefix.charCodeAt(i));
      result = result * BigInt(256) + charCode;
    }

    return result;
  }

  // 数字转换回IPFS哈希
  static numberToHash(num: bigint): string {
    let remaining = num;
    let chars = '';

    while (remaining > 0) {
      chars = String.fromCharCode(Number(remaining % BigInt(256))) + chars;
      remaining = remaining / BigInt(256);
    }

    return 'Qm' + chars;
  }

  // 兼容原有的接口
  static async encryptFileAsync(file: File, password: string): Promise<string> {
    const base64 = await this.fileToBase64(file);
    return this.encryptFile(base64, password);
  }

  static async decryptFileAsync(encryptedData: string, password: string): Promise<ArrayBuffer> {
    try {
      const decryptedBase64 = this.decryptFile(encryptedData, password);
      const binaryString = atob(decryptedBase64.split(',')[1] || decryptedBase64);
      const arrayBuffer = new ArrayBuffer(binaryString.length);
      const uint8Array = new Uint8Array(arrayBuffer);

      for (let i = 0; i < binaryString.length; i++) {
        uint8Array[i] = binaryString.charCodeAt(i);
      }

      return arrayBuffer;
    } catch (error) {
      throw new Error('Failed to decrypt file: ' + error);
    }
  }

  static createBlobURL(arrayBuffer: ArrayBuffer, mimeType: string): string {
    const blob = new Blob([arrayBuffer], { type: mimeType });
    return URL.createObjectURL(blob);
  }
}