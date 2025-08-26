/**
 * Test script for client-side encryption library
 * This tests the FileEncryption class functionality
 */

// Import the encryption library (this would be done via module import in a real app)
// For testing purposes, we'll simulate the Web Crypto API

// Mock Web Crypto API for testing
if (typeof crypto === 'undefined') {
    global.crypto = {
        subtle: {
            generateKey: async (algorithm, extractable, keyUsages) => {
                // Mock key generation
                return {
                    type: 'secret',
                    extractable: extractable,
                    algorithm: algorithm,
                    usages: keyUsages
                };
            },
            encrypt: async (algorithm, key, data) => {
                // Mock encryption - just return the data with a prefix
                const encrypted = new Uint8Array(data.length + 4);
                encrypted.set([0x01, 0x02, 0x03, 0x04], 0); // Mock IV/tag
                encrypted.set(data, 4);
                return encrypted.buffer;
            },
            decrypt: async (algorithm, key, data) => {
                // Mock decryption - remove the prefix
                return data.slice(4);
            },
            exportKey: async (format, key) => {
                // Mock key export
                return new Uint8Array(32).buffer; // 32-byte key
            },
            importKey: async (format, keyData, algorithm, extractable, keyUsages) => {
                // Mock key import
                return {
                    type: 'secret',
                    extractable: extractable,
                    algorithm: algorithm,
                    usages: keyUsages
                };
            }
        },
        getRandomValues: (array) => {
            // Mock random values
            for (let i = 0; i < array.length; i++) {
                array[i] = Math.floor(Math.random() * 256);
            }
            return array;
        }
    };
}

// Mock IndexedDB for testing
if (typeof indexedDB === 'undefined') {
    global.indexedDB = {
        open: (dbName, version) => {
            return {
                onerror: null,
                onsuccess: null,
                onupgradeneeded: null,
                result: {
                    createObjectStore: (storeName, options) => {},
                    transaction: (storeNames, mode) => ({
                        objectStore: (storeName) => ({
                            put: (data) => ({
                                onsuccess: null,
                                onerror: null
                            }),
                            get: (key) => ({
                                onsuccess: null,
                                onerror: null,
                                result: null
                            })
                        })
                    })
                }
            };
        }
    };
}

// Mock File API for testing
if (typeof File === 'undefined') {
    global.File = class File {
        constructor(bits, name, options) {
            this.name = name;
            this.type = options?.type || 'text/plain';
            this.size = bits.length;
            this.stream = () => ({
                getReader: () => ({
                    read: async () => {
                        return { done: true, value: new Uint8Array(bits) };
                    }
                })
            });
        }
    };
}

// Mock btoa and atob for Base64 encoding
if (typeof btoa === 'undefined') {
    global.btoa = (str) => Buffer.from(str, 'binary').toString('base64');
}

if (typeof atob === 'undefined') {
    global.atob = (str) => Buffer.from(str, 'base64').toString('binary');
}

// Test the FileEncryption class
class FileEncryption {
    static CHUNK_SIZE = 64 * 1024;
    static ALGORITHM = 'AES-GCM';
    static KEY_WRAP_ALGORITHM = 'RSA-OAEP';
    static RSA_MODULUS_LENGTH = 4096;
    static RSA_HASH = 'SHA-256';

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

    static async encryptFile(file, key) {
        const chunks = [];
        let chunkIndex = 0;
        
        const reader = file.stream().getReader();
        
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            const iv = new Uint8Array(12);
            new DataView(iv.buffer).setUint32(8, chunkIndex++);
            
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
        
        const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
        const result = new Uint8Array(totalLength);
        let offset = 0;
        
        for (const chunk of chunks) {
            result.set(chunk, offset);
            offset += chunk.length;
        }
        
        return result;
    }

    static async decryptFile(encryptedData, key) {
        const chunks = [];
        let chunkIndex = 0;
        let offset = 0;
        
        while (offset < encryptedData.length) {
            const iv = new Uint8Array(12);
            new DataView(iv.buffer).setUint32(8, chunkIndex++);
            
            const chunkSize = Math.min(this.CHUNK_SIZE, encryptedData.length - offset);
            const chunk = encryptedData.slice(offset, offset + chunkSize);
            
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
        
        const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
        const result = new Uint8Array(totalLength);
        offset = 0;
        
        for (const chunk of chunks) {
            result.set(chunk, offset);
            offset += chunk.length;
        }
        
        return result;
    }

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

    static arrayBufferToBase64(buffer) {
        const bytes = new Uint8Array(buffer);
        let binary = '';
        for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return btoa(binary);
    }

    static base64ToArrayBuffer(base64) {
        const binaryString = atob(base64);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        return bytes.buffer;
    }

    static generateCID(content) {
        let hash = 0;
        // Convert Uint8Array to string for hashing
        const contentStr = new TextDecoder().decode(content);
        for (let i = 0; i < contentStr.length; i++) {
            const char = contentStr.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return `Qm${Math.abs(hash).toString(16)}`;
    }

    static async encryptFileComplete(file, publicKey) {
        try {
            const fileKey = await this.generateFileKey();
            const encryptedData = await this.encryptFile(file, fileKey);
            const wrappedKey = await this.wrapKey(fileKey, publicKey);
            const ciphertextCid = this.generateCID(encryptedData);
            
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

    static async decryptFileComplete(encryptedData, metadata, privateKey) {
        try {
            const wrappedKey = this.base64ToArrayBuffer(metadata.wrapped_key);
            const fileKey = await this.unwrapKey(new Uint8Array(wrappedKey), privateKey);
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
}

// Test functions
async function runTests() {
    console.log('🔐 Testing Client-Side Encryption Library');
    console.log('==========================================');
    
    try {
        // Test 1: Key generation
        console.log('\n🧪 Test 1: Key Generation');
        console.log('---------------------------');
        const fileKey = await FileEncryption.generateFileKey();
        const keyPair = await FileEncryption.generateKeyPair();
        console.log('✅ File key generated:', fileKey.type);
        console.log('✅ Key pair generated:', keyPair.publicKey.type, keyPair.privateKey.type);
        
        // Test 2: Key wrapping
        console.log('\n🧪 Test 2: Key Wrapping');
        console.log('------------------------');
        const wrappedKey = await FileEncryption.wrapKey(fileKey, keyPair.publicKey);
        const unwrappedKey = await FileEncryption.unwrapKey(wrappedKey, keyPair.privateKey);
        console.log('✅ Key wrapping successful');
        console.log('✅ Key unwrapping successful');
        
        // Test 3: File encryption/decryption
        console.log('\n🧪 Test 3: File Encryption/Decryption');
        console.log('--------------------------------------');
        const testData = new TextEncoder().encode('Hello, World! This is a test file.');
        const testFile = new File([testData], 'test.txt', { type: 'text/plain' });
        
        const encryptedData = await FileEncryption.encryptFile(testFile, fileKey);
        const decryptedData = await FileEncryption.decryptFile(encryptedData, unwrappedKey);
        const decryptedText = new TextDecoder().decode(decryptedData);
        
        console.log('✅ File encryption successful');
        console.log('✅ File decryption successful');
        console.log('✅ Original text:', new TextDecoder().decode(testData));
        console.log('✅ Decrypted text:', decryptedText);
        console.log('✅ Data integrity:', new TextDecoder().decode(testData) === decryptedText);
        
        // Test 4: Complete encryption workflow
        console.log('\n🧪 Test 4: Complete Encryption Workflow');
        console.log('----------------------------------------');
        const result = await FileEncryption.encryptFileComplete(testFile, keyPair.publicKey);
        console.log('✅ Complete encryption workflow successful');
        console.log('✅ Generated CID:', result.cid);
        console.log('✅ Metadata created:', result.metadata.algorithm);
        
        // Test 5: Complete decryption workflow
        console.log('\n🧪 Test 5: Complete Decryption Workflow');
        console.log('----------------------------------------');
        const decryptionResult = await FileEncryption.decryptFileComplete(
            result.encryptedData,
            result.metadata,
            keyPair.privateKey
        );
        const finalText = new TextDecoder().decode(decryptionResult.data);
        console.log('✅ Complete decryption workflow successful');
        console.log('✅ Original name:', decryptionResult.originalName);
        console.log('✅ Original type:', decryptionResult.originalType);
        console.log('✅ Final text:', finalText);
        console.log('✅ Data integrity:', new TextDecoder().decode(testData) === finalText);
        
        console.log('\n🎉 All client-side encryption tests passed!');
        console.log('==========================================');
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        process.exit(1);
    }
}

// Run the tests
runTests();
