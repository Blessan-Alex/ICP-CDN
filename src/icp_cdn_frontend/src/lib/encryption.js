/**
 * File Encryption Library
 * Handles client-side encryption/decryption using Web Crypto API
 * Uses AES-GCM for file encryption and RSA-OAEP for key wrapping
 */

export class FileEncryption {
  static CHUNK_SIZE = 64 * 1024; // 64KB chunks
  static ALGORITHM = 'AES-GCM';
  static KEY_WRAP_ALGORITHM = 'RSA-OAEP';
  static RSA_MODULUS_LENGTH = 4096;
  static RSA_HASH = 'SHA-256';

  /**
   * Generate a new AES-GCM key for file encryption
   */
  static async generateFileKey() {
    return await crypto.subtle.generateKey(
      {
        name: this.ALGORITHM,
        length: 256
      },
      true,
      ['encrypt', 'decrypt']
    );
  }

  /**
   * Generate RSA key pair for key wrapping
   */
  static async generateKeyPair() {
    return await crypto.subtle.generateKey(
      {
        name: this.KEY_WRAP_ALGORITHM,
        modulusLength: this.RSA_MODULUS_LENGTH,
        publicExponent: new Uint8Array([1, 0, 1]),
        hash: this.RSA_HASH
      },
      true,
      ['encrypt', 'decrypt']
    );
  }

  /**
   * Wrap an AES key with RSA public key
   */
  static async wrapKey(key, publicKey) {
    const wrappedKey = await crypto.subtle.encrypt(
      {
        name: this.KEY_WRAP_ALGORITHM
      },
      publicKey,
      await crypto.subtle.exportKey('raw', key)
    );
    
    return new Uint8Array(wrappedKey);
  }

  /**
   * Unwrap an AES key with RSA private key
   */
  static async unwrapKey(wrappedKey, privateKey) {
    const keyData = await crypto.subtle.decrypt(
      {
        name: this.KEY_WRAP_ALGORITHM
      },
      privateKey,
      wrappedKey
    );
    
    return await crypto.subtle.importKey(
      'raw',
      keyData,
      this.ALGORITHM,
      false,
      ['encrypt', 'decrypt']
    );
  }

  /**
   * Encrypt a file in chunks using AES-GCM
   */
  static async encryptFile(file, key) {
    const chunks = [];
    let chunkIndex = 0;
    
    const reader = file.stream().getReader();
    
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      // Create IV for this chunk (counter-based)
      const iv = new Uint8Array(12);
      new DataView(iv.buffer).setUint32(8, chunkIndex++);
      
      // Encrypt the chunk
      const encryptedChunk = await crypto.subtle.encrypt(
        {
          name: this.ALGORITHM,
          iv: iv
        },
        key,
        value
      );
      
      chunks.push(new Uint8Array(encryptedChunk));
    }
    
    // Combine all chunks
    const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
    const result = new Uint8Array(totalLength);
    let offset = 0;
    
    for (const chunk of chunks) {
      result.set(chunk, offset);
      offset += chunk.length;
    }
    
    return result;
  }

  /**
   * Decrypt encrypted data in chunks using AES-GCM
   */
  static async decryptFile(encryptedData, key) {
    const chunks = [];
    let chunkIndex = 0;
    let offset = 0;
    
    while (offset < encryptedData.length) {
      // Create IV for this chunk (counter-based)
      const iv = new Uint8Array(12);
      new DataView(iv.buffer).setUint32(8, chunkIndex++);
      
      // Determine chunk size (last chunk might be smaller)
      const chunkSize = Math.min(this.CHUNK_SIZE, encryptedData.length - offset);
      const chunk = encryptedData.slice(offset, offset + chunkSize);
      
      // Decrypt the chunk
      const decryptedChunk = await crypto.subtle.decrypt(
        {
          name: this.ALGORITHM,
          iv: iv
        },
        key,
        chunk
      );
      
      chunks.push(new Uint8Array(decryptedChunk));
      offset += chunkSize;
    }
    
    // Combine all chunks
    const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
    const result = new Uint8Array(totalLength);
    offset = 0;
    
    for (const chunk of chunks) {
      result.set(chunk, offset);
      offset += chunk.length;
    }
    
    return result;
  }

  /**
   * Create encryption metadata for a file
   */
  static createEncryptionMetadata(wrappedKey, originalName, originalType, ciphertextCid) {
    return {
      version: 1,
      algorithm: this.ALGORITHM,
      chunk_size: this.CHUNK_SIZE,
      iv_base: 'counter-last4',
      wrapped_key: this.arrayBufferToBase64(wrappedKey),
      original_name: originalName,
      original_type: originalType,
      ciphertext_cid: ciphertextCid
    };
  }

  /**
   * Convert ArrayBuffer to Base64 string
   */
  static arrayBufferToBase64(buffer) {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  /**
   * Convert Base64 string to ArrayBuffer
   */
  static base64ToArrayBuffer(base64) {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
  }

  /**
   * Generate a CID for content (simplified version)
   */
  static generateCID(content) {
    // Simple hash-based CID generation
    let hash = 0;
    // Convert Uint8Array to string for hashing
    const contentStr = new TextDecoder().decode(content);
    for (let i = 0; i < contentStr.length; i++) {
      const char = contentStr.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return `Qm${Math.abs(hash).toString(16)}`;
  }

  /**
   * Complete file encryption workflow
   */
  static async encryptFileComplete(file, publicKey) {
    try {
      // Generate file key
      const fileKey = await this.generateFileKey();
      
      // Encrypt the file
      const encryptedData = await this.encryptFile(file, fileKey);
      
      // Wrap the file key
      const wrappedKey = await this.wrapKey(fileKey, publicKey);
      
      // Generate CID for encrypted content
      const ciphertextCid = this.generateCID(encryptedData);
      
      // Create metadata
      const metadata = this.createEncryptionMetadata(
        wrappedKey,
        file.name,
        file.type,
        ciphertextCid
      );
      
      return {
        encryptedData: Array.from(encryptedData),
        metadata: metadata,
        cid: ciphertextCid
      };
    } catch (error) {
      throw new Error(`Encryption failed: ${error.message}`);
    }
  }

  /**
   * Complete file decryption workflow
   */
  static async decryptFileComplete(encryptedData, metadata, privateKey) {
    try {
      // Unwrap the file key
      const wrappedKey = this.base64ToArrayBuffer(metadata.wrapped_key);
      const fileKey = await this.unwrapKey(new Uint8Array(wrappedKey), privateKey);
      
      // Decrypt the file
      const decryptedData = await this.decryptFile(new Uint8Array(encryptedData), fileKey);
      
      return {
        data: decryptedData,
        originalName: metadata.original_name,
        originalType: metadata.original_type
      };
    } catch (error) {
      throw new Error(`Decryption failed: ${error.message}`);
    }
  }

  /**
   * Store keys in IndexedDB
   */
  static async storeKeys(keyPair, keyName = 'default') {
    const dbName = 'FileEncryptionDB';
    const storeName = 'keys';
    const version = 1;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(dbName, version);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const db = request.result;
        try {
          const transaction = db.transaction([storeName], 'readwrite');
          const store = transaction.objectStore(storeName);
          
          const keyData = {
            name: keyName,
            publicKey: keyPair.publicKey,
            privateKey: keyPair.privateKey,
            timestamp: Date.now()
          };
          
          const putRequest = store.put(keyData);
          putRequest.onsuccess = () => resolve(keyData);
          putRequest.onerror = () => reject(putRequest.error);
        } catch (error) {
          reject(new Error(`Failed to access IndexedDB store: ${error.message}`));
        }
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(storeName)) {
          db.createObjectStore(storeName, { keyPath: 'name' });
        }
      };
    });
  }

  /**
   * Retrieve keys from IndexedDB
   */
  static async getKeys(keyName = 'default') {
    const dbName = 'FileEncryptionDB';
    const storeName = 'keys';

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(dbName, 1);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const db = request.result;
        
        // Check if the store exists
        if (!db.objectStoreNames.contains(storeName)) {
          reject(new Error('Keys store not found'));
          return;
        }
        
        try {
          const transaction = db.transaction([storeName], 'readonly');
          const store = transaction.objectStore(storeName);
          
          const getRequest = store.get(keyName);
          getRequest.onsuccess = () => {
            if (getRequest.result) {
              resolve({
                publicKey: getRequest.result.publicKey,
                privateKey: getRequest.result.privateKey
              });
            } else {
              reject(new Error('Keys not found'));
            }
          };
          getRequest.onerror = () => reject(getRequest.error);
        } catch (error) {
          reject(new Error(`Failed to access IndexedDB store: ${error.message}`));
        }
      };
      
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(storeName)) {
          db.createObjectStore(storeName, { keyPath: 'name' });
        }
      };
    });
  }

  /**
   * Initialize encryption system (generate and store keys if needed)
   */
  static async initialize() {
    try {
      // Try to get existing keys
      const keys = await this.getKeys();
      console.log('Existing keys found and loaded');
      return keys;
    } catch (error) {
      console.log('No existing keys found or database not initialized, generating new ones...', error.message);
      // Generate new keys if none exist or database is not initialized
      const keyPair = await this.generateKeyPair();
      try {
        await this.storeKeys(keyPair);
        console.log('New keys generated and stored');
      } catch (storeError) {
        console.error('Failed to store keys, but continuing with generated keys:', storeError.message);
        // Return the keys even if storage fails
      }
      return keyPair;
    }
  }

  /**
   * Clear all stored keys (for testing/reset purposes)
   */
  static async clearKeys() {
    const dbName = 'FileEncryptionDB';
    const storeName = 'keys';

    return new Promise((resolve, reject) => {
      try {
        const request = indexedDB.deleteDatabase(dbName);
        
        request.onerror = () => {
          console.log('Database deletion failed (may not exist):', request.error);
          resolve(); // Resolve anyway since the goal is to clear keys
        };
        request.onsuccess = () => {
          console.log('Encryption keys cleared');
          resolve();
        };
      } catch (error) {
        console.log('Failed to delete database (may not exist):', error.message);
        resolve(); // Resolve anyway since the goal is to clear keys
      }
    });
  }
}

export default FileEncryption;
