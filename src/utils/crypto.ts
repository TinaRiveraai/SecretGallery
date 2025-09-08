import CryptoJS from 'crypto-js';

export class CryptoUtils {
  static generateAESPassword(): string {
    const password = CryptoJS.lib.WordArray.random(32).toString();
    return this.formatAsEVMAddress(password);
  }

  static formatAsEVMAddress(input: string): string {
    const hash = CryptoJS.SHA256(input).toString();
    return '0x' + hash.slice(0, 40);
  }

  static async encryptFile(file: File, password: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const arrayBuffer = reader.result as ArrayBuffer;
          const wordArray = CryptoJS.lib.WordArray.create(arrayBuffer);
          const encrypted = CryptoJS.AES.encrypt(wordArray, password).toString();
          resolve(encrypted);
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = () => reject(reader.error);
      reader.readAsArrayBuffer(file);
    });
  }

  static async decryptFile(encryptedData: string, password: string): Promise<ArrayBuffer> {
    try {
      const decrypted = CryptoJS.AES.decrypt(encryptedData, password);
      const wordArray = decrypted;
      
      const arrayBuffer = new ArrayBuffer(wordArray.sigBytes);
      const uint8Array = new Uint8Array(arrayBuffer);
      
      for (let i = 0; i < wordArray.sigBytes; i++) {
        uint8Array[i] = (wordArray.words[i >>> 2] >>> (24 - (i % 4) * 8)) & 0xff;
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