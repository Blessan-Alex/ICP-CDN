# 🚀 ICP CDN Client Library - Usage Guide

## 📖 Overview

The **ICP CDN Client Library** is a comprehensive JavaScript/TypeScript library that provides easy access to the dCDN (decentralized Content Delivery Network) backend. It enables other ICP projects (like OpenChat, Caffeine, etc.) to integrate IPFS-based content delivery with caching, tier management, and cost estimation.

## 🎯 Key Features

### ✅ **Core Functionality**
- **Upload Assets** - Upload content to IPFS and get CIDs
- **Retrieve Assets** - Get content by CID with cache fallback
- **IPFS Integration** - Seamless IPFS upload and retrieval
- **Cache Management** - LRU cache with automatic eviction
- **Tier System** - Free, Starter, Pro, Business tiers
- **Cost Estimation** - Upload and storage cost calculations
- **User Management** - Account and balance management

### ✅ **Advanced Features**
- **Cache Statistics** - Performance metrics and hit rates
- **Tier Upgrades** - Upgrade user tiers dynamically
- **Cache Control** - Manual cache eviction and clearing
- **BigInt Handling** - Automatic BigInt to string conversion
- **Error Handling** - Comprehensive error management

## 🛠️ Installation & Setup

### 1. **Install Dependencies**
```bash
npm install @dfinity/agent @dfinity/principal
```

### 2. **Import the Library**
```javascript
import { 
  CdnClient, 
  UserTier, 
  UserAccount, 
  CacheEntry,
  CYCLES_SMALL_UPLOAD, 
  CYCLES_MEDIUM_UPLOAD, 
  CYCLES_LARGE_UPLOAD 
} from './lib/cdnClient';
```

### 3. **Initialize the Client**
```javascript
import { HttpAgent } from '@dfinity/agent';
import { Principal } from '@dfinity/principal';

// Create agent with your identity
const agent = new HttpAgent({
  host: "https://ic0.app", // or your local replica
  identity: yourIdentity
});

// Create CDN client
const cdnClient = CdnClient.new(
  Principal.fromText("your-canister-id"), 
  agent
);

// Initialize backend connection
await cdnClient.initBackend(createActor);
```

## 📚 **API Reference**

### 🔧 **Core Upload & Retrieval**

#### `uploadAsset(content, contentType, cyclesPayment)`
Upload content to IPFS and get back a CID.

```javascript
// Upload text content
const cid = await cdnClient.uploadAsset(
  "Hello World!", 
  "text/plain", 
  CYCLES_SMALL_UPLOAD
);

// Upload binary content
const fileBytes = new Uint8Array([...]);
const cid = await cdnClient.uploadAsset(
  fileBytes, 
  "image/png", 
  CYCLES_MEDIUM_UPLOAD
);
```

#### `getAsset(cid)`
Retrieve content from cache by CID.

```javascript
const content = await cdnClient.getAsset(cid);
const text = new TextDecoder().decode(content);
```

#### `getAssetWithFallback(cid)`
Retrieve content with IPFS fallback if not in cache.

```javascript
const content = await cdnClient.getAssetWithFallback(cid);
```

### 👤 **User Management**

#### `getUserAccount()`
Get current user account information.

```javascript
const account = await cdnClient.getUserAccount();
console.log(`Tier: ${account.tier}`);
console.log(`Balance: ${account.cycles_balance} cycles`);
console.log(`Cache Usage: ${account.cache_usage_bytes} bytes`);
```

#### `getCyclesBalance()`
Get current cycles balance.

```javascript
const balance = await cdnClient.getCyclesBalance();
console.log(`Balance: ${balance} cycles`);
```

#### `depositCycles(amount)`
Deposit cycles to user account.

```javascript
const newAccount = await cdnClient.depositCycles(1000000000n);
```

### 💰 **Cost Estimation**

#### `estimateUploadCost(fileSize)`
Estimate upload cost for a file size.

```javascript
const cost = await cdnClient.estimateUploadCost(1024); // 1KB
console.log(`Upload cost: ${cost} cycles`);
```

#### `estimateStorageCost(fileSize, hours)`
Estimate storage cost for a file size and duration.

```javascript
const cost = await cdnClient.estimateStorageCost(1024, 24); // 1KB for 24 hours
console.log(`Storage cost: ${cost} cycles`);
```

### 🗄️ **Cache Management**

#### `isCached(cid)`
Check if content is cached.

```javascript
const cached = await cdnClient.isCached(cid);
console.log(`Cached: ${cached}`);
```

#### `getCacheEntryDetails(cid)`
Get detailed cache entry information.

```javascript
const entry = await cdnClient.getCacheEntryDetails(cid);
console.log(`Size: ${entry.size} bytes`);
console.log(`Last accessed: ${entry.last_accessed_ts}`);
```

#### `getCacheStatistics()`
Get cache performance statistics.

```javascript
const stats = await cdnClient.getCacheStatistics();
console.log(`Hit rate: ${stats.cache_hits}/${stats.total_requests}`);
console.log(`Cache utilization: ${stats.cache_utilization_percent}%`);
```

#### `clearCache()`
Clear all cached content.

```javascript
await cdnClient.clearCache();
```

#### `evictFromCache(cid)`
Manually evict specific content from cache.

```javascript
await cdnClient.evictFromCache(cid);
```

### 👑 **Tier Management**

#### `getUserTierInfo()`
Get current user tier information.

```javascript
const tierInfo = await cdnClient.getUserTierInfo();
console.log(`Current tier: ${tierInfo.current_tier}`);
console.log(`Cache limit: ${tierInfo.cache_limit_bytes} bytes`);
console.log(`Available upgrades: ${tierInfo.available_upgrades}`);
```

#### `getAvailableTiers()`
Get all available tiers.

```javascript
const tiers = await cdnClient.getAvailableTiers();
tiers.forEach(tier => {
  console.log(`${tier.name}: ${tier.price_cycles} cycles`);
});
```

#### `upgradeTier(newTier)`
Upgrade user to a new tier.

```javascript
await cdnClient.upgradeTier(UserTier.Pro);
```

### 🔗 **Utility Functions**

#### `getAssetUrl(cid)`
Generate asset URL for direct access.

```javascript
const url = cdnClient.getAssetUrl(cid);
console.log(`Asset URL: ${url}`);
```

## 🌟 **Real-World Integration Examples**

### **Example 1: OpenChat Integration**
```javascript
// In OpenChat's image upload feature
class OpenChatImageUploader {
  constructor() {
    this.cdnClient = CdnClient.new(canisterId, agent);
  }

  async uploadImage(imageFile) {
    const imageBytes = await this.readFileAsBytes(imageFile);
    const cid = await this.cdnClient.uploadAsset(
      imageBytes, 
      imageFile.type, 
      CYCLES_MEDIUM_UPLOAD
    );
    
    // Store CID in OpenChat's database
    await this.storeImageReference(cid, imageFile.name);
    
    return cid;
  }

  async getImageUrl(cid) {
    return this.cdnClient.getAssetUrl(cid);
  }
}
```

### **Example 2: Caffeine Integration**
```javascript
// In Caffeine's video streaming feature
class CaffeineVideoStreamer {
  constructor() {
    this.cdnClient = CdnClient.new(canisterId, agent);
  }

  async uploadVideo(videoFile) {
    const videoBytes = await this.readFileAsBytes(videoFile);
    const cid = await this.cdnClient.uploadAsset(
      videoBytes, 
      videoFile.type, 
      CYCLES_LARGE_UPLOAD
    );
    
    return cid;
  }

  async streamVideo(cid) {
    try {
      // Try cache first
      const content = await this.cdnClient.getAsset(cid);
      return content;
    } catch (error) {
      // Fallback to IPFS
      const content = await this.cdnClient.getAssetWithFallback(cid);
      return content;
    }
  }
}
```

### **Example 3: Social Media App**
```javascript
// In a social media app's content management
class SocialMediaContentManager {
  constructor() {
    this.cdnClient = CdnClient.new(canisterId, agent);
  }

  async uploadPostContent(content, mediaFiles) {
    const mediaCids = [];
    
    // Upload media files
    for (const file of mediaFiles) {
      const fileBytes = await this.readFileAsBytes(file);
      const cid = await this.cdnClient.uploadAsset(
        fileBytes, 
        file.type, 
        CYCLES_MEDIUM_UPLOAD
      );
      mediaCids.push(cid);
    }
    
    // Upload text content
    const textCid = await this.cdnClient.uploadAsset(
      content, 
      "text/plain", 
      CYCLES_SMALL_UPLOAD
    );
    
    return { textCid, mediaCids };
  }

  async getPostContent(textCid, mediaCids) {
    const text = await this.cdnClient.getAssetWithFallback(textCid);
    const media = await Promise.all(
      mediaCids.map(cid => this.cdnClient.getAssetWithFallback(cid))
    );
    
    return { text, media };
  }
}
```

## 🔧 **Configuration & Constants**

### **Cycles Payment Constants**
```javascript
CYCLES_SMALL_UPLOAD  // 1,000,000,000 cycles (1B)
CYCLES_MEDIUM_UPLOAD // 5,000,000,000 cycles (5B)
CYCLES_LARGE_UPLOAD  // 10,000,000,000 cycles (10B)
```

### **User Tiers**
```javascript
UserTier.Free      // Free tier with basic features
UserTier.Starter   // Starter tier with more storage
UserTier.Pro       // Pro tier with advanced features
UserTier.Business  // Business tier with enterprise features
```

## 🚨 **Error Handling**

The library provides comprehensive error handling:

```javascript
try {
  const cid = await cdnClient.uploadAsset(content, contentType);
  console.log(`Upload successful: ${cid}`);
} catch (error) {
  if (error.message.includes('insufficient cycles')) {
    // Handle insufficient cycles
    await cdnClient.depositCycles(1000000000n);
  } else if (error.message.includes('cache full')) {
    // Handle cache full
    await cdnClient.clearCache();
  } else {
    // Handle other errors
    console.error('Upload failed:', error.message);
  }
}
```

## 📊 **Performance Optimization**

### **Best Practices**
1. **Use appropriate cycles payment** based on file size
2. **Check cache before uploading** to avoid duplicates
3. **Use IPFS fallback** for better availability
4. **Monitor cache statistics** for optimization
5. **Upgrade tiers** for better performance

### **Cache Strategy**
```javascript
// Check if content exists before uploading
const existingCid = await this.findExistingContent(content);
if (existingCid) {
  return existingCid;
}

// Upload new content
const cid = await this.cdnClient.uploadAsset(content, contentType);
return cid;
```

## 🔒 **Security Considerations**

1. **Identity Management** - Use proper ICP identity
2. **Cycles Management** - Monitor cycles balance
3. **Content Validation** - Validate content before upload
4. **Access Control** - Implement proper access controls
5. **Error Handling** - Handle errors gracefully

## 📈 **Monitoring & Analytics**

### **Cache Performance**
```javascript
const stats = await cdnClient.getCacheStatistics();
const hitRate = (stats.cache_hits / stats.total_requests) * 100;
console.log(`Cache hit rate: ${hitRate}%`);
```

### **User Usage**
```javascript
const account = await cdnClient.getUserAccount();
const tierInfo = await cdnClient.getUserTierInfo();
const usagePercent = (account.cache_usage_bytes / tierInfo.cache_limit_bytes) * 100;
console.log(`Cache usage: ${usagePercent}%`);
```

## 🎯 **Integration Checklist**

- [ ] Install required dependencies
- [ ] Initialize CDN client with proper identity
- [ ] Implement upload functionality
- [ ] Implement retrieval functionality
- [ ] Add error handling
- [ ] Add cache management
- [ ] Add tier management
- [ ] Add cost estimation
- [ ] Test with various file types
- [ ] Monitor performance metrics

## 🆘 **Support & Troubleshooting**

### **Common Issues**
1. **BigInt serialization errors** - Already handled by library
2. **Insufficient cycles** - Deposit more cycles
3. **Cache full** - Clear cache or upgrade tier
4. **Network errors** - Check ICP network connectivity

### **Debug Mode**
```javascript
// Enable debug logging
console.log('CDN Client initialized:', cdnClient);
console.log('Backend connected:', cdnClient.backend);
```

## 🚀 **Future Enhancements**

- **Batch uploads** - Upload multiple files at once
- **Streaming uploads** - Stream large files
- **Image processing** - On-chain image resizing
- **Video processing** - Video compression and formats
- **CDN analytics** - Advanced analytics dashboard
- **Multi-region** - Geographic distribution
- **Edge caching** - Edge node caching

---

## 📞 **Contact & Support**

For questions, issues, or contributions:
- **GitHub Issues**: [Repository Issues](https://github.com/your-repo/issues)
- **Documentation**: [Full Documentation](https://docs.your-cdn.com)
- **Discord**: [Community Discord](https://discord.gg/your-community)

---

**🎉 Happy integrating with ICP CDN! 🎉**
