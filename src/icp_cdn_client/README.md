# ICP CDN Client Library

A clean, minimal Rust library for ICP canisters to integrate with the dCDN (decentralized Content Delivery Network) service with full tier system support.

## 🎯 Overview

This library provides a simple interface for other ICP canisters (like OpenChat, Caffeine, etc.) to:
- Upload images/assets to IPFS via the dCDN
- Get CIDs back for storage in their infrastructure
- Retrieve content with automatic IPFS fallback
- Resize images on-the-fly
- Use the dCDN for global content delivery
- **Manage user tiers and upgrades**
- **Track cache usage and limits**
- **Estimate costs before operations**
- **Handle cycles billing automatically**

## 📦 Installation

Add this to your canister's `Cargo.toml`:

```toml
[dependencies]
icp-cdn-client = { path = "../icp-cdn-client" }
```

## 🚀 Quick Start

### Basic Upload with Tier Check

```rust
use icp_cdn_client::{CdnClient, CYCLES_SMALL_UPLOAD};

#[ic_cdk::update]
async fn upload_avatar(avatar_bytes: Vec<u8>) -> Result<String, String> {
    let cdn_client = CdnClient::new(
        Principal::from_text("your-cdn-canister-id")
            .expect("Invalid CDN canister ID")
    );
    
    // Check tier limits before uploading
    let tier_info = cdn_client.get_user_tier_info().await?;
    if tier_info.cache_usage_bytes + avatar_bytes.len() as u64 > tier_info.cache_limit_bytes {
        return Err("Upload would exceed cache limit".to_string());
    }
    
    // Estimate cost
    let upload_cost = cdn_client.estimate_upload_cost(avatar_bytes.len() as u64).await?;
    
    let result = cdn_client
        .upload_asset(
            avatar_bytes,
            "image/png".to_string(),
            upload_cost,
        )
        .await?;
    
    Ok(result.cid)
}
```

### Get Content with Fallback

```rust
#[ic_cdk::query]
async fn get_avatar(cid: String) -> Result<Vec<u8>, String> {
    let cdn_client = CdnClient::new(
        Principal::from_text("your-cdn-canister-id")
            .expect("Invalid CDN canister ID")
    );
    
    // Automatically falls back to IPFS if not in cache
    cdn_client.get_asset_with_fallback(cid).await
}
```

### Tier Management

```rust
#[ic_cdk::update]
async fn upgrade_to_pro() -> Result<String, String> {
    let cdn_client = CdnClient::new(
        Principal::from_text("your-cdn-canister-id")
            .expect("Invalid CDN canister ID")
    );
    
    // Upgrade to Pro tier
    cdn_client.upgrade_tier(UserTier::Pro).await
}
```

## 📚 API Reference

### CdnClient

The main client struct for interacting with the dCDN service.

#### Core Methods

##### `upload_asset(content, content_type, cycles_payment)`
Upload content to the dCDN and get back a CID.

**Parameters:**
- `content: Vec<u8>` - File content as bytes
- `content_type: String` - MIME type (e.g., "image/png")
- `cycles_payment: u128` - Cycles to pay for upload

**Returns:** `UploadResult` with CID, IPFS hash, and gateway URL

##### `get_asset(cid)`
Get content from the dCDN cache.

**Parameters:**
- `cid: String` - Content identifier

**Returns:** Content bytes if found in cache

##### `get_asset_with_fallback(cid)`
Get content with automatic IPFS fallback.

**Parameters:**
- `cid: String` - Content identifier

**Returns:** Content bytes (from cache or IPFS)

##### `resize_image(cid, width, cycles_payment)`
Resize an image and get back the resized bytes.

**Parameters:**
- `cid: String` - Original image CID
- `width: u32` - Target width in pixels
- `cycles_payment: u128` - Cycles to pay for processing

**Returns:** Resized image bytes

#### Tier Management Methods

##### `get_user_tier_info()`
Get current user's tier information including limits and usage.

**Returns:** `UserTierInfo` with tier, cache limits, and usage

##### `get_available_tiers()`
Get all available tiers with pricing and features.

**Returns:** `Vec<TierInfo>` with all tier options

##### `upgrade_tier(target_tier)`
Upgrade user's tier to a higher level.

**Parameters:**
- `target_tier: UserTier` - The tier to upgrade to

**Returns:** Success message

##### `get_user_account()`
Get user account information including cycles balance.

**Returns:** `UserAccount` with principal, balance, and tier

##### `get_cycles_balance()`
Get user's current cycles balance.

**Returns:** Current cycles balance

##### `deposit_cycles(cycles_amount)`
Deposit cycles into user account.

**Parameters:**
- `cycles_amount: u128` - Amount of cycles to deposit

**Returns:** Updated user account

#### Cost Estimation Methods

##### `estimate_upload_cost(file_size_bytes)`
Estimate upload cost for a file.

**Parameters:**
- `file_size_bytes: u64` - Size of file in bytes

**Returns:** Estimated cost in cycles

##### `estimate_storage_cost(file_size_bytes, hours)`
Estimate storage cost for a file over time.

**Parameters:**
- `file_size_bytes: u64` - Size of file in bytes
- `hours: u64` - Number of hours to store

**Returns:** Estimated cost in cycles

#### Utility Methods

##### `is_cached(cid)`
Check if content exists in the dCDN cache.

**Parameters:**
- `cid: String` - Content identifier

**Returns:** `true` if content is cached

##### `generate_cid(content, content_type)`
Generate a unique CID for content.

**Parameters:**
- `content: &[u8]` - File content
- `content_type: &str` - MIME type

**Returns:** Generated CID string

### Convenience Functions

For simple use cases, you can use these global functions:

- `upload_asset_default(content, content_type, cycles_payment)`
- `get_asset_default(cid)`
- `resize_image_default(cid, width, cycles_payment)`
- `get_user_tier_info_default()`
- `upgrade_tier_default(target_tier)`

### Constants

Predefined cycle amounts for different operations:

- `CYCLES_SMALL_UPLOAD` - 1B cycles for small files (< 1MB)
- `CYCLES_MEDIUM_UPLOAD` - 5B cycles for medium files (1-10MB)
- `CYCLES_LARGE_UPLOAD` - 10B cycles for large files (> 10MB)
- `CYCLES_IMAGE_RESIZE` - 2B cycles for image resizing
- `CYCLES_STARTER_UPGRADE` - 1B cycles for Starter tier
- `CYCLES_PRO_UPGRADE` - 5B cycles for Pro tier
- `CYCLES_BUSINESS_UPGRADE` - 15B cycles for Business tier

## 🔧 Configuration

### Setting Up the CDN Canister ID

Replace `"your-cdn-canister-id"` with your actual deployed dCDN canister ID:

```rust
let cdn_client = CdnClient::new(
    Principal::from_text("rrkah-fqaaa-aaaaa-aaaaq-cai") // Your actual canister ID
        .expect("Invalid CDN canister ID")
);
```

### Using Default Client

For simple cases, you can use the default client (requires setting the default canister ID in the library):

```rust
let result = icp_cdn_client::upload_asset_default(
    content,
    "image/png".to_string(),
    CYCLES_SMALL_UPLOAD,
).await?;
```

## 📝 Examples

### Smart Upload with Tier Awareness

```rust
#[ic_cdk::update]
async fn smart_upload_with_tier_check(content: Vec<u8>, content_type: String) -> Result<String, String> {
    let cdn_client = CdnClient::new(
        Principal::from_text("your-cdn-canister-id")
            .expect("Invalid CDN canister ID")
    );
    
    // Get user's tier information
    let tier_info = cdn_client.get_user_tier_info().await?;
    
    // Check cache limits
    if tier_info.cache_usage_bytes + content.len() as u64 > tier_info.cache_limit_bytes {
        return Err("Upload would exceed cache limit".to_string());
    }
    
    // Estimate costs
    let upload_cost = cdn_client.estimate_upload_cost(content.len() as u64).await?;
    
    // Upload content
    let upload_result = cdn_client
        .upload_asset(content, content_type, upload_cost)
        .await?;
    
    Ok(upload_result.cid)
}
```

### Tier Upgrade Flow

```rust
#[ic_cdk::update]
async fn upgrade_user_tier(target_tier: UserTier) -> Result<String, String> {
    let cdn_client = CdnClient::new(
        Principal::from_text("your-cdn-canister-id")
            .expect("Invalid CDN canister ID")
    );
    
    // Get current tier info
    let current_tier_info = cdn_client.get_user_tier_info().await?;
    
    // Get available tiers to check pricing
    let available_tiers = cdn_client.get_available_tiers().await?;
    let target_tier_info = available_tiers.iter()
        .find(|tier| tier.tier == target_tier)
        .ok_or("Target tier not found")?;
    
    // Check if user has enough cycles
    let user_account = cdn_client.get_user_account().await?;
    if user_account.cycles_balance < target_tier_info.price_cycles {
        return Err("Insufficient cycles for upgrade".to_string());
    }
    
    // Perform the upgrade
    cdn_client.upgrade_tier(target_tier).await
}
```

### Batch Upload with Limits

```rust
#[ic_cdk::update]
async fn batch_upload_with_tier_limits(files: Vec<(String, Vec<u8>, String)>) -> Result<Vec<String>, String> {
    let cdn_client = CdnClient::new(
        Principal::from_text("your-cdn-canister-id")
            .expect("Invalid CDN canister ID")
    );
    
    // Get user's tier information
    let tier_info = cdn_client.get_user_tier_info().await?;
    
    // Calculate total size
    let total_size: u64 = files.iter().map(|(_, content, _)| content.len() as u64).sum();
    
    // Check if batch upload would exceed cache limit
    if tier_info.cache_usage_bytes + total_size > tier_info.cache_limit_bytes {
        return Err("Batch upload would exceed cache limit".to_string());
    }
    
    let mut cids = Vec::new();
    
    for (filename, content, content_type) in files {
        let upload_cost = cdn_client.estimate_upload_cost(content.len() as u64).await?;
        let upload_result = cdn_client
            .upload_asset(content, content_type, upload_cost)
            .await?;
        
        cids.push(upload_result.cid);
    }
    
    Ok(cids)
}
```

### Deposit and Upgrade

```rust
#[ic_cdk::update]
async fn deposit_and_upgrade(cycles_to_deposit: u128, target_tier: UserTier) -> Result<String, String> {
    let cdn_client = CdnClient::new(
        Principal::from_text("your-cdn-canister-id")
            .expect("Invalid CDN canister ID")
    );
    
    // First deposit cycles
    let updated_account = cdn_client.deposit_cycles(cycles_to_deposit).await?;
    
    // Then upgrade tier
    let upgrade_result = cdn_client.upgrade_tier(target_tier).await?;
    
    Ok(format!("Deposited {} cycles and upgraded tier. {}", cycles_to_deposit, upgrade_result))
}
```

## 🔒 Security Considerations

- Always validate file types and sizes before uploading
- Use appropriate cycle amounts for your use case
- Store CIDs securely in your canister's state
- Consider implementing access control for sensitive content
- **Check tier limits before operations**
- **Validate user permissions for tier upgrades**

## 🚨 Error Handling

The library returns `Result<T, String>` for all operations. Common error scenarios:

- **Upload failures**: Insufficient cycles, invalid content, network issues
- **Cache misses**: Content not found in cache (use `get_asset_with_fallback`)
- **IPFS failures**: Content not available on IPFS network
- **Resize failures**: Invalid image format, processing errors
- **Tier limit exceeded**: Cache usage would exceed user's tier limit
- **Insufficient cycles**: Not enough cycles for tier upgrade or operation

## 📈 Performance Tips

1. **Use appropriate cycle amounts** - Don't overpay for small files
2. **Cache CIDs locally** - Store CIDs in your canister to avoid re-uploads
3. **Use batch operations** - Upload multiple files in sequence
4. **Check cache first** - Use `is_cached()` before uploading
5. **Resize on-demand** - Only resize images when needed
6. **Monitor tier usage** - Check cache limits before large uploads
7. **Estimate costs** - Use cost estimation before operations

## 🤝 Integration Examples

### OpenChat Integration
```rust
// In OpenChat canister
#[ic_cdk::update]
async fn upload_chat_image(image_bytes: Vec<u8>) -> Result<String, String> {
    let cdn_client = CdnClient::new(CDN_CANISTER_ID);
    
    // Check tier limits
    let tier_info = cdn_client.get_user_tier_info().await?;
    if tier_info.cache_usage_bytes + image_bytes.len() as u64 > tier_info.cache_limit_bytes {
        return Err("Image upload would exceed cache limit".to_string());
    }
    
    let upload_cost = cdn_client.estimate_upload_cost(image_bytes.len() as u64).await?;
    let result = cdn_client.upload_asset(image_bytes, "image/jpeg", upload_cost).await?;
    Ok(result.cid)
}
```

### Caffeine Integration
```rust
// In Caffeine canister
#[ic_cdk::update]
async fn upload_game_asset(asset_bytes: Vec<u8>, asset_type: String) -> Result<String, String> {
    let cdn_client = CdnClient::new(CDN_CANISTER_ID);
    
    // Smart upload with tier checking
    let tier_info = cdn_client.get_user_tier_info().await?;
    let cid = cdn_client.generate_cid(&asset_bytes, &asset_type);
    
    if cdn_client.is_cached(cid.clone()).await? {
        return Ok(cid); // Already cached
    }
    
    if tier_info.cache_usage_bytes + asset_bytes.len() as u64 > tier_info.cache_limit_bytes {
        return Err("Asset upload would exceed cache limit".to_string());
    }
    
    let upload_cost = cdn_client.estimate_upload_cost(asset_bytes.len() as u64).await?;
    let result = cdn_client.upload_asset(asset_bytes, asset_type, upload_cost).await?;
    Ok(result.cid)
}
```

## 📞 Support

For questions or issues with the library, please refer to the main dCDN project documentation or create an issue in the repository.
