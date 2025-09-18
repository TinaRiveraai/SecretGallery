import CryptoJS from 'crypto-js';

export class FileEncryption {
  // 生成AES密码（伪造成EVM地址格式）
  static generatePassword(): string {
    // 生成40个十六进制字符作为地址
    const randomBytes = CryptoJS.lib.WordArray.random(20);
    return '0x' + randomBytes.toString(CryptoJS.enc.Hex);
  }

  // AES加密文件
  static encryptFile(fileData: string, password: string): string {
    try {
      const encrypted = CryptoJS.AES.encrypt(fileData, password).toString();
      console.log('File encrypted successfully');
      return encrypted;
    } catch (error) {
      console.error('Encryption failed:', error);
      throw new Error('Failed to encrypt file');
    }
  }

  // AES解密文件
  static decryptFile(encryptedData: string, password: string): string {
    try {
      const decrypted = CryptoJS.AES.decrypt(encryptedData, password);
      const decryptedString = decrypted.toString(CryptoJS.enc.Utf8);

      if (!decryptedString) {
        throw new Error('Invalid password or corrupted data');
      }

      console.log('File decrypted successfully');
      return decryptedString;
    } catch (error) {
      console.error('Decryption failed:', error);
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
}