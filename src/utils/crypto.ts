export class CryptoUtils {
  // Generate AES password (Mock - formatted as EVM address)
  static generatePassword(): string {
    const randomHex = Math.random().toString(16).substr(2, 40);
    return '0x' + randomHex.padEnd(40, '0');
  }

  static generateAESPassword(): string {
    return this.generatePassword();
  }

  static formatAsEVMAddress(input: string): string {
    // Mock format as EVM address
    const hash = input.replace(/[^0-9a-f]/gi, '').toLowerCase();
    return '0x' + hash.substr(0, 40).padEnd(40, '0');
  }

  // Mock AES encrypt file (using simple encoding simulation)
  static encryptFile(fileData: string, password: string): string {
    try {
      // Mock encryption: simple base64 encoding + password prefix
      const base64Data = btoa(fileData);
      const mockEncrypted = `mock_encrypted_${password.slice(-8)}_${base64Data}`;
      console.log('File encrypted successfully (mock)');
      return mockEncrypted;
    } catch (error) {
      console.error('Mock encryption failed:', error);
      throw new Error('Failed to encrypt file');
    }
  }

  // Mock AES decrypt file
  static decryptFile(encryptedData: string, password: string): string {
    try {
      // Mock decryption: check password and decode base64
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

  // Convert file to Base64 string
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

  // Convert Base64 string to Blob
  static base64ToBlob(base64: string, type: string): Blob {
    const byteCharacters = atob(base64.split(',')[1]);
    const byteNumbers = new Array(byteCharacters.length);

    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }

    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type });
  }

  // Convert IPFS hash to number (simplified version)
  static hashToNumber(hash: string): bigint {
    // Remove "Qm" prefix and convert to number
    const hashWithoutPrefix = hash.replace(/^Qm/, '');

    // Use simple character encoding to convert to number
    let result = BigInt(0);
    for (let i = 0; i < Math.min(hashWithoutPrefix.length, 30); i++) {
      const charCode = BigInt(hashWithoutPrefix.charCodeAt(i));
      result = result * BigInt(256) + charCode;
    }

    return result;
  }

  // Convert number back to IPFS hash
  static numberToHash(num: bigint): string {
    let remaining = num;
    let chars = '';

    while (remaining > 0) {
      chars = String.fromCharCode(Number(remaining % BigInt(256))) + chars;
      remaining = remaining / BigInt(256);
    }

    return 'Qm' + chars;
  }

  // Compatible with original interface
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