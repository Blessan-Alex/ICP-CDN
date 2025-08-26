# 🚀 **ICP CDN Client Library**

A powerful Rust library for seamless integration with the CanisterDrop decentralized Content Delivery Network (dCDN) on the Internet Computer Protocol (ICP).

## 📋 **Table of Contents**
- [Overview](#overview)
- [Quick Start](#quick-start)
- [Simple User Workflow](#simple-user-workflow)
- [Complex Workflow](#complex-workflow)
- [API Reference](#api-reference)
- [Integration Examples](#integration-examples)
- [Error Handling](#error-handling)
- [Best Practices](#best-practices)

---

## 🎯 **Overview**

The **ICP CDN Client Library** provides a clean, type-safe interface for canister-to-canister communication with the CanisterDrop dCDN. It enables other ICP projects (like OpenChat, Caffeine, and custom dApps) to easily integrate content delivery capabilities.

### **Key Features**
- ✅ **Type-Safe API**: Full Rust type safety with Candid serialization
- ✅ **Canister-to-Canister**: Direct communication between canisters
- ✅ **Automatic Cycles Payment**: Built-in cycles billing and cost estimation
- ✅ **Tier Management**: User tier upgrades and account management
- ✅ **Cache Integration**: Smart caching with IPFS fallback
- ✅ **Error Handling**: Comprehensive error handling and recovery

---

## 🚀 **Quick Start**

### **Installation**
```toml
# Cargo.toml
[dependencies]
icp_cdn_client = { path = "src/icp_cdn_client" }
```

### **Basic Usage**
```rust
use icp_cdn_client::{CdnClient, UserTier};

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Create client instance
    let client = CdnClient::new(Principal::from_text("your_canister_id")?);
    
    // Upload content
    let content = b"Hello, ICP CDN!";
    let cid = client.upload_asset(
        content.to_vec(),
        "text/plain".to_string(),
        1_000_000_000, // 1B cycles
    ).await?;
    
    println!("Uploaded with CID: {}", cid);
    Ok(())
}
```

---

## 🔄 **Simple User Workflow**

### **1. Client Initialization**
```rust
// Create client with custom canister ID
let client = CdnClient::new(canister_id);

// Or use default canister ID
let client = CdnClient::default();
```

### **2. Content Upload**
```rust
// Upload file content
let cid = client.upload_asset(
    file_bytes,
    "image/jpeg".to_string(),
    cycles_payment,
).await?;
```

### **3. Content Retrieval**
```rust
// Get content from cache
let content = client.get_asset(&cid).await?;

// Get content with IPFS fallback
let content = client.get_asset_with_fallback(&cid).await?;
```

### **4. User Account Management**
```rust
// Get user account info
let account = client.get_user_account().await?;

// Upgrade user tier
client.upgrade_tier(UserTier::Pro).await?;
```

---

## 🔄 **Complex Workflow**

### **Advanced Content Management**
```rust
use icp_cdn_client::{CdnClient, UserTier, UserAccount};

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let client = CdnClient::new(canister_id);
    
    // 1. Check user account and tier
    let account: UserAccount = client.get_user_account().await?;
    println!("Current tier: {:?}", account.tier);
    println!("Cache usage: {} bytes", account.cache_usage_bytes);
    
    // 2. Estimate upload cost
    let file_size = file_bytes.len() as u64;
    let estimated_cost = client.estimate_upload_cost(file_size).await?;
    println!("Estimated cost: {} cycles", estimated_cost);
    
    // 3. Check if tier upgrade is needed
    if account.tier == UserTier::Free && file_size > 20 * 1024 * 1024 {
        println!("File too large for free tier. Upgrading to Starter...");
        client.upgrade_tier(UserTier::Starter).await?;
    }
    
    // 4. Upload with proper cycles payment
    let cid = client.upload_asset(
        file_bytes,
        content_type,
        estimated_cost,
    ).await?;
    
    // 5. Verify upload and get content
    let retrieved_content = client.get_asset_with_fallback(&cid).await?;
    assert_eq!(file_bytes, retrieved_content);
    
    // 6. Monitor account changes
    let updated_account = client.get_user_account().await?;
    println!("Updated cache usage: {} bytes", updated_account.cache_usage_bytes);
    
    Ok(())
}
```

### **Bulk Operations**
```rust
async fn bulk_upload(client: &CdnClient, files: Vec<(Vec<u8>, String)>) -> Result<Vec<String>, Box<dyn std::error::Error>> {
    let mut cids = Vec::new();
    
    for (content, content_type) in files {
        // Estimate cost for each file
        let cost = client.estimate_upload_cost(content.len() as u64).await?;
        
        // Upload with proper error handling
        match client.upload_asset(content, content_type, cost).await {
            Ok(cid) => cids.push(cid),
            Err(e) => {
                eprintln!("Failed to upload file: {}", e);
                // Continue with other files
            }
        }
    }
    
    Ok(cids)
}
```

### **Error Recovery and Retry Logic**
```rust
use std::time::Duration;
use tokio::time::sleep;

async fn upload_with_retry(
    client: &CdnClient,
    content: Vec<u8>,
    content_type: String,
    max_retries: u32,
) -> Result<String, Box<dyn std::error::Error>> {
    let mut attempts = 0;
    
    loop {
        match client.upload_asset(content.clone(), content_type.clone(), 1_000_000_000).await {
            Ok(cid) => return Ok(cid),
            Err(e) => {
                attempts += 1;
                if attempts >= max_retries {
                    return Err(e.into());
                }
                
                println!("Upload failed (attempt {}/{}): {}", attempts, max_retries, e);
                sleep(Duration::from_secs(2)).await;
            }
        }
    }
}
```

---

## 📚 **API Reference**

### **Core Methods**

#### **`upload_asset(content, content_type, cycles_payment)`**
Uploads content to the dCDN and returns a CID.

```rust
pub async fn upload_asset(
    &self,
    content: Vec<u8>,
    content_type: String,
    cycles_payment: u128,
) -> Result<String, String>
```

**Parameters:**
- `content`: File bytes to upload
- `content_type`: MIME type (e.g., "image/jpeg", "text/plain")
- `cycles_payment`: Cycles to pay for upload

**Returns:** Content Identifier (CID) string

#### **`get_asset(cid)`**
Retrieves content from cache only.

```rust
pub async fn get_asset(&self, cid: &str) -> Result<Vec<u8>, String>
```

#### **`get_asset_with_fallback(cid)`**
Retrieves content from cache, falls back to IPFS if not found.

```rust
pub async fn get_asset_with_fallback(&self, cid: &str) -> Result<Vec<u8>, String>
```

#### **`get_user_account()`**
Gets current user account information.

```rust
pub async fn get_user_account(&self) -> Result<UserAccount, String>
```

#### **`deposit_cycles(amount)`**
Deposits cycles to user account.

```rust
pub async fn deposit_cycles(&self, amount: u128) -> Result<UserAccount, String>
```

#### **`estimate_upload_cost(file_size)`**
Estimates cycles cost for file upload.

```rust
pub async fn estimate_upload_cost(&self, file_size: u64) -> Result<u128, String>
```

#### **`upgrade_tier(target_tier)`**
Upgrades user to a higher tier.

```rust
pub async fn upgrade_tier(&self, target_tier: UserTier) -> Result<UserAccount, String>
```

### **Data Structures**

#### **`UserAccount`**
```rust
pub struct UserAccount {
    pub user_principal: Principal,
    pub cycles_balance: u128,
    pub tier: UserTier,
    pub cache_usage_bytes: u64,
    pub pinata_enabled: bool,
}
```

#### **`UserTier`**
```rust
pub enum UserTier {
    Free,      // 20MB cache, no IPFS pinning
    Starter,   // 50MB cache, IPFS pinning, 1B cycles
    Pro,       // 100MB cache, IPFS pinning, 5B cycles
    Business,  // 500MB cache, IPFS pinning, 15B cycles
}
```

#### **`CacheEntry`**
```rust
pub struct CacheEntry {
    pub cid: String,
    pub content_type: String,
    pub size: u64,
    pub last_accessed_ts: u64,
    pub bytes: Vec<u8>,
}
```

---

## 🔗 **Integration Examples**

### **OpenChat Integration**
```rust
// In OpenChat canister
use icp_cdn_client::CdnClient;

pub async fn upload_chat_image(image_bytes: Vec<u8>) -> Result<String, String> {
    let cdn_client = CdnClient::new(Principal::from_text("cdn_canister_id")?);
    
    // Upload image to CDN
    let cid = cdn_client.upload_asset(
        image_bytes,
        "image/jpeg".to_string(),
        1_000_000_000,
    ).await?;
    
    // Return CID for chat message
    Ok(cid)
}
```

### **Caffeine Integration**
```rust
// In Caffeine canister
use icp_cdn_client::{CdnClient, UserTier};

pub async fn upload_video_content(video_bytes: Vec<u8>) -> Result<String, String> {
    let cdn_client = CdnClient::new(Principal::from_text("cdn_canister_id")?);
    
    // Check if user needs tier upgrade for large video
    let account = cdn_client.get_user_account().await?;
    if video_bytes.len() > 50 * 1024 * 1024 && account.tier == UserTier::Free {
        cdn_client.upgrade_tier(UserTier::Starter).await?;
    }
    
    // Upload video
    let cid = cdn_client.upload_asset(
        video_bytes,
        "video/mp4".to_string(),
        5_000_000_000,
    ).await?;
    
    Ok(cid)
}
```

### **Custom dApp Integration**
```rust
// In your custom dApp
use icp_cdn_client::CdnClient;

pub struct ContentManager {
    cdn_client: CdnClient,
}

impl ContentManager {
    pub fn new(cdn_canister_id: Principal) -> Self {
        Self {
            cdn_client: CdnClient::new(cdn_canister_id),
        }
    }
    
    pub async fn store_document(&self, document: Vec<u8>) -> Result<String, String> {
        let cost = self.cdn_client.estimate_upload_cost(document.len() as u64).await?;
        
        self.cdn_client.upload_asset(
            document,
            "application/pdf".to_string(),
            cost,
        ).await
    }
    
    pub async fn retrieve_document(&self, cid: &str) -> Result<Vec<u8>, String> {
        self.cdn_client.get_asset_with_fallback(cid).await
    }
}
```

---

## ⚠️ **Error Handling**

### **Common Error Types**
```rust
// Network/Communication errors
"HTTP outcall failed: RejectionCode::DestinationInvalid"

// Authentication errors
"User not authenticated"

// Tier limit errors
"Cache limit exceeded for current tier"

// Cycles errors
"Insufficient cycles balance"

// Content errors
"Content not found in cache or IPFS"
```

### **Error Handling Pattern**
```rust
async fn robust_upload(client: &CdnClient, content: Vec<u8>) -> Result<String, String> {
    match client.upload_asset(content, "application/octet-stream".to_string(), 1_000_000_000).await {
        Ok(cid) => Ok(cid),
        Err(e) => {
            if e.contains("Cache limit exceeded") {
                // Handle tier upgrade
                client.upgrade_tier(UserTier::Starter).await?;
                // Retry upload
                client.upload_asset(content, "application/octet-stream".to_string(), 1_000_000_000).await
            } else if e.contains("Insufficient cycles") {
                // Handle cycles deposit
                client.deposit_cycles(5_000_000_000).await?;
                // Retry upload
                client.upload_asset(content, "application/octet-stream".to_string(), 1_000_000_000).await
            } else {
                Err(e)
            }
        }
    }
}
```

---

## 💡 **Best Practices**

### **1. Cost Management**
```rust
// Always estimate costs before upload
let cost = client.estimate_upload_cost(file_size).await?;
let account = client.get_user_account().await?;

if account.cycles_balance < cost {
    // Deposit more cycles or handle insufficient balance
    client.deposit_cycles(cost * 2).await?;
}
```

### **2. Tier Optimization**
```rust
// Check tier limits before large uploads
let account = client.get_user_account().await?;
let file_size = content.len() as u64;

match account.tier {
    UserTier::Free if file_size > 20 * 1024 * 1024 => {
        // Upgrade to Starter for files > 20MB
        client.upgrade_tier(UserTier::Starter).await?;
    }
    UserTier::Starter if file_size > 50 * 1024 * 1024 => {
        // Upgrade to Pro for files > 50MB
        client.upgrade_tier(UserTier::Pro).await?;
    }
    _ => {}
}
```

### **3. Caching Strategy**
```rust
// Use cache-first approach for frequently accessed content
let content = match client.get_asset(&cid).await {
    Ok(content) => content, // Cache hit
    Err(_) => {
        // Cache miss, fetch from IPFS
        client.get_asset_with_fallback(&cid).await?
    }
};
```

### **4. Error Recovery**
```rust
// Implement exponential backoff for retries
async fn upload_with_backoff(client: &CdnClient, content: Vec<u8>) -> Result<String, String> {
    let mut delay = Duration::from_secs(1);
    let max_retries = 3;
    
    for attempt in 0..max_retries {
        match client.upload_asset(content.clone(), "text/plain".to_string(), 1_000_000_000).await {
            Ok(cid) => return Ok(cid),
            Err(e) => {
                if attempt == max_retries - 1 {
                    return Err(e);
                }
                sleep(delay).await;
                delay *= 2; // Exponential backoff
            }
        }
    }
    
    Err("Max retries exceeded".to_string())
}
```

### **5. Resource Management**
```rust
// Monitor cache usage and clean up if needed
let account = client.get_user_account().await?;
let cache_limit = match account.tier {
    UserTier::Free => 20 * 1024 * 1024,
    UserTier::Starter => 50 * 1024 * 1024,
    UserTier::Pro => 100 * 1024 * 1024,
    UserTier::Business => 500 * 1024 * 1024,
};

if account.cache_usage_bytes > cache_limit * 80 / 100 {
    // Cache is 80% full, consider cleanup or upgrade
    println!("Cache usage high: {} / {} bytes", account.cache_usage_bytes, cache_limit);
}
```

---

## 🧪 **Testing**

### **Unit Tests**
```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_upload_and_retrieve() {
        let client = CdnClient::default();
        let test_content = b"Test content for CDN";
        
        // Upload
        let cid = client.upload_asset(
            test_content.to_vec(),
            "text/plain".to_string(),
            1_000_000_000,
        ).await.unwrap();
        
        // Retrieve
        let retrieved = client.get_asset(&cid).await.unwrap();
        assert_eq!(test_content, retrieved.as_slice());
    }
}
```

### **Integration Tests**
```rust
#[tokio::test]
async fn test_tier_upgrade_flow() {
    let client = CdnClient::default();
    
    // Check initial tier
    let account = client.get_user_account().await.unwrap();
    assert_eq!(account.tier, UserTier::Free);
    
    // Upgrade tier
    let upgraded = client.upgrade_tier(UserTier::Starter).await.unwrap();
    assert_eq!(upgraded.tier, UserTier::Starter);
}
```

---

## 📞 **Support**

For questions, issues, or contributions:

- **Documentation**: See the main project README
- **Issues**: Report bugs and feature requests
- **Examples**: Check the `examples/` directory for more usage patterns

---

*The ICP CDN Client Library provides a robust, type-safe interface for integrating with the CanisterDrop dCDN. It handles all the complexity of canister-to-canister communication, cycles management, and error handling, allowing you to focus on building your dApp.*
