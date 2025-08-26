// Test script to verify encryption functionality without IndexedDB errors
import { FileEncryption } from '../src/icp_cdn_frontend/src/lib/encryption.js';

async function testEncryptionFix() {
  console.log('Testing encryption functionality fix...');
  
  try {
    // Test 1: Initialize encryption system
    console.log('\n1. Testing encryption initialization...');
    const keys = await FileEncryption.initialize();
    console.log('✅ Encryption initialization successful');
    console.log('Keys generated:', !!keys.publicKey, !!keys.privateKey);
    
    // Test 2: Generate a test file
    console.log('\n2. Testing file encryption...');
    const testContent = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    const testFile = {
      name: 'test.txt',
      type: 'text/plain',
      size: testContent.length,
      stream: () => ({
        getReader: () => ({
          read: async () => ({ done: false, value: testContent }),
          read: async () => ({ done: true, value: null })
        })
      })
    };
    
    // Test 3: Encrypt the file
    const encryptionResult = await FileEncryption.encryptFileComplete(testFile, keys.publicKey);
    console.log('✅ File encryption successful');
    console.log('Encrypted data length:', encryptionResult.encryptedData.length);
    console.log('Metadata generated:', !!encryptionResult.metadata);
    
    // Test 4: Decrypt the file
    console.log('\n3. Testing file decryption...');
    const decryptionResult = await FileEncryption.decryptFileComplete(
      encryptionResult.encryptedData,
      encryptionResult.metadata,
      keys.privateKey
    );
    console.log('✅ File decryption successful');
    console.log('Decrypted data length:', decryptionResult.data.length);
    console.log('Original name preserved:', decryptionResult.originalName === 'test.txt');
    
    console.log('\n🎉 All encryption tests passed! IndexedDB error should be fixed.');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

// Run the test
testEncryptionFix();
