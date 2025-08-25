use candid::{CandidType, Deserialize, Principal};
use ic_cdk::api::call::call_with_payment128;

// ===== BASIC TYPES =====

#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct UserAccount {
    pub user_principal: Principal,
    pub cycles_balance: u128,
    pub tier: UserTier,
    pub cache_usage_bytes: u64,
    pub pinata_enabled: bool,
}

impl Default for UserAccount {
    fn default() -> Self {
        Self {
            user_principal: Principal::anonymous(),
            cycles_balance: 0,
            tier: UserTier::Free,
            cache_usage_bytes: 0,
            pinata_enabled: false,
        }
    }
}

#[derive(CandidType, Deserialize, Clone, Debug, PartialEq)]
pub enum UserTier {
    Free,
    Starter,
    Pro,
    Business,
}

#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct CacheEntry {
    pub cid: String,
    pub content_type: String,
    pub size: u64,
    pub last_accessed_ts: u64,
    pub bytes: Vec<u8>,
}

impl Default for CacheEntry {
    fn default() -> Self {
        Self {
            cid: String::new(),
            content_type: String::new(),
            size: 0,
            last_accessed_ts: 0,
            bytes: Vec::new(),
        }
    }
}

// ===== MAIN CLIENT STRUCT =====

#[derive(Clone)]
pub struct CdnClient {
    pub canister_id: Principal,
}

impl CdnClient {
    /// Create a new CDN client instance
    pub fn new(canister_id: Principal) -> Self {
        Self { canister_id }
    }

    /// Create a CDN client with the default dCDN canister ID
    pub fn default() -> Self {
        let default_canister_id = Principal::from_text("rrkah-fqaaa-aaaaa-aaaaq-cai")
            .expect("Invalid default canister ID");
        Self::new(default_canister_id)
    }

    // ===== CORE UPLOAD FUNCTIONALITY =====

    /// Upload content to the dCDN and get back a CID
    /// This uses the main upload_content function which handles caching and Pinata integration
    pub async fn upload_asset(
        &self,
        content: Vec<u8>,
        content_type: String,
        cycles_payment: u128,
    ) -> Result<String, String> {
        let cid = self.generate_cid(&content, &content_type);
        
        // Call the backend's upload_content function (the main upload function)
        let result: Result<(Result<String, String>,), (ic_cdk::api::call::RejectionCode, String)> = call_with_payment128(
            self.canister_id,
            "upload_content",
            (cid.clone(), content_type, content),
            cycles_payment,
        )
        .await;

        match result {
            Ok((upload_result,)) => {
                match upload_result {
                    Ok(cid) => Ok(cid),
                    Err(msg) => Err(msg)
                }
            }
            Err((code, msg)) => Err(format!("Upload failed: {:?} - {}", code, msg))
        }
    }

    /// Get content from the dCDN by CID
    /// This uses the main get_content function which handles cache/IPFS fallback
    pub async fn get_asset(&self, cid: String) -> Result<Vec<u8>, String> {
        let result: Result<(Result<Vec<u8>, String>,), (ic_cdk::api::call::RejectionCode, String)> = ic_cdk::api::call::call(
            self.canister_id,
            "get_content",
            (cid,),
        )
        .await;

        match result {
            Ok((content_result,)) => {
                match content_result {
                    Ok(content) => Ok(content),
                    Err(msg) => Err(msg)
                }
            }
            Err((code, msg)) => Err(format!("Get content failed: {:?} - {}", code, msg))
        }
    }

    /// Get content with automatic IPFS fallback
    /// This uses fetch_from_ipfs for direct IPFS access
    pub async fn get_asset_with_fallback(&self, cid: String) -> Result<Vec<u8>, String> {
        // First try to get from cache
        match self.get_asset(cid.clone()).await {
            Ok(content) => Ok(content),
            Err(_) => {
                // If cache miss, try to fetch from IPFS
                let result: Result<(Result<Vec<u8>, String>,), (ic_cdk::api::call::RejectionCode, String)> = ic_cdk::api::call::call(
                    self.canister_id,
                    "fetch_from_ipfs",
                    (cid,),
                )
                .await;

                match result {
                    Ok((ipfs_result,)) => {
                        match ipfs_result {
                            Ok(content) => Ok(content),
                            Err(msg) => Err(msg)
                        }
                    }
                    Err((code, msg)) => Err(format!("IPFS fetch failed: {:?} - {}", code, msg))
                }
            }
        }
    }

    // ===== USER MANAGEMENT =====

    /// Get user account information
    pub async fn get_user_account(&self) -> Result<UserAccount, String> {
        let result: Result<(UserAccount,), (ic_cdk::api::call::RejectionCode, String)> = ic_cdk::api::call::call(
            self.canister_id,
            "get_user_account",
            (),
        )
        .await;

        result.map(|(account,)| account).map_err(|(code, msg)| format!("Get user account failed: {:?} - {}", code, msg))
    }

    /// Get user's cycles balance
    pub async fn get_cycles_balance(&self) -> Result<u128, String> {
        let result: Result<(u128,), (ic_cdk::api::call::RejectionCode, String)> = ic_cdk::api::call::call(
            self.canister_id,
            "get_cycles_balance",
            (),
        )
        .await;

        result.map(|(balance,)| balance).map_err(|(code, msg)| format!("Get cycles balance failed: {:?} - {}", code, msg))
    }

    /// Deposit cycles into user account
    pub async fn deposit_cycles(&self, cycles_amount: u128) -> Result<UserAccount, String> {
        let result: Result<(UserAccount,), (ic_cdk::api::call::RejectionCode, String)> = call_with_payment128(
            self.canister_id,
            "deposit_cycles",
            (),
            cycles_amount,
        )
        .await;

        result.map(|(account,)| account).map_err(|(code, msg)| format!("Deposit cycles failed: {:?} - {}", code, msg))
    }

    // ===== COST ESTIMATION =====

    /// Estimate upload cost for a file
    pub async fn estimate_upload_cost(&self, file_size_bytes: u64) -> Result<u128, String> {
        let result: Result<(u128,), (ic_cdk::api::call::RejectionCode, String)> = ic_cdk::api::call::call(
            self.canister_id,
            "estimate_upload_cost",
            (file_size_bytes,),
        )
        .await;

        result.map(|(cost,)| cost).map_err(|(code, msg)| format!("Estimate upload cost failed: {:?} - {}", code, msg))
    }

    /// Estimate storage cost for a file
    pub async fn estimate_storage_cost(&self, file_size_bytes: u64, hours: u64) -> Result<u128, String> {
        let result: Result<(u128,), (ic_cdk::api::call::RejectionCode, String)> = ic_cdk::api::call::call(
            self.canister_id,
            "estimate_storage_cost",
            (file_size_bytes, hours),
        )
        .await;

        result.map(|(cost,)| cost).map_err(|(code, msg)| format!("Estimate storage cost failed: {:?} - {}", code, msg))
    }

    // ===== UTILITY FUNCTIONS =====

    /// Get the public gateway URL for a CID
    pub fn get_asset_url(&self, cid: String) -> String {
        format!("https://{}.ic0.app/{}", self.canister_id, cid)
    }

    /// Check if content exists in the dCDN cache
    pub async fn is_cached(&self, cid: String) -> Result<bool, String> {
        match self.get_asset(cid).await {
            Ok(_) => Ok(true),
            Err(_) => Ok(false),
        }
    }

    /// Generate a unique CID for content
    pub fn generate_cid(&self, content: &[u8], content_type: &str) -> String {
        use std::collections::hash_map::DefaultHasher;
        use std::hash::{Hash, Hasher};
        
        let mut hasher = DefaultHasher::new();
        content.hash(&mut hasher);
        content_type.hash(&mut hasher);
        
        // Try to get time from ic_cdk, fallback to system time for tests
        let timestamp = match std::panic::catch_unwind(|| ic_cdk::api::time()) {
            Ok(time) => time,
            Err(_) => {
                // Fallback for test environments
                std::time::SystemTime::now()
                    .duration_since(std::time::UNIX_EPOCH)
                    .unwrap_or_default()
                    .as_nanos() as u64
            }
        };
        timestamp.hash(&mut hasher);
        
        format!("Qm{:x}", hasher.finish())
    }
}

// ===== CANISTER-TO-CANISTER CLIENT =====

/// Client for canister-to-canister communication with the dCDN
/// This is the main interface that other canisters should use
#[derive(Clone)]
pub struct CdnCanisterClient {
    pub canister_id: Principal,
}

impl CdnCanisterClient {
    /// Create a new CDN canister client instance
    pub fn new(canister_id: Principal) -> Self {
        Self { canister_id }
    }

    /// Create a CDN canister client with the default dCDN canister ID
    pub fn default() -> Self {
        let default_canister_id = Principal::from_text("rrkah-fqaaa-aaaaa-aaaaq-cai")
            .expect("Invalid default canister ID");
        Self::new(default_canister_id)
    }

    // ===== CORE UPLOAD FUNCTIONALITY =====

    /// Upload content to the dCDN via canister-to-canister call
    pub async fn upload_content(
        &self,
        content: Vec<u8>,
        content_type: String,
        cycles_payment: u128,
    ) -> Result<String, String> {
        let result: Result<(Result<String, String>,), (ic_cdk::api::call::RejectionCode, String)> = call_with_payment128(
            self.canister_id,
            "canister_upload",
            (ic_cdk::api::caller(), content, content_type, cycles_payment),
            cycles_payment,
        )
        .await;

        match result {
            Ok((upload_result,)) => upload_result,
            Err((code, msg)) => Err(format!("Upload failed: {:?} - {}", code, msg))
        }
    }

    /// Get content from the dCDN via canister-to-canister call
    pub async fn get_content(&self, cid: String) -> Result<Vec<u8>, String> {
        let result: Result<(Result<Vec<u8>, String>,), (ic_cdk::api::call::RejectionCode, String)> = ic_cdk::api::call::call(
            self.canister_id,
            "canister_get_content",
            (ic_cdk::api::caller(), cid),
        )
        .await;

        match result {
            Ok((content_result,)) => content_result,
            Err((code, msg)) => Err(format!("Get content failed: {:?} - {}", code, msg))
        }
    }

    /// Get content with automatic IPFS fallback via canister-to-canister call
    pub async fn get_content_with_fallback(&self, cid: String) -> Result<Vec<u8>, String> {
        let result: Result<(Result<Vec<u8>, String>,), (ic_cdk::api::call::RejectionCode, String)> = ic_cdk::api::call::call(
            self.canister_id,
            "canister_get_content_with_fallback",
            (ic_cdk::api::caller(), cid),
        )
        .await;

        match result {
            Ok((content_result,)) => content_result,
            Err((code, msg)) => Err(format!("Get content with fallback failed: {:?} - {}", code, msg))
        }
    }

    /// Upload multiple files in bulk via canister-to-canister call
    pub async fn bulk_upload(
        &self,
        files: Vec<(Vec<u8>, String)>,
        cycles_payment: u128,
    ) -> Result<Vec<String>, String> {
        let result: Result<(Result<Vec<String>, String>,), (ic_cdk::api::call::RejectionCode, String)> = call_with_payment128(
            self.canister_id,
            "canister_bulk_upload",
            (ic_cdk::api::caller(), files, cycles_payment),
            cycles_payment,
        )
        .await;

        match result {
            Ok((upload_result,)) => upload_result,
            Err((code, msg)) => Err(format!("Bulk upload failed: {:?} - {}", code, msg))
        }
    }

    // ===== ACCOUNT MANAGEMENT =====

    /// Get account information for the calling canister
    pub async fn get_account_info(&self) -> Result<UserAccount, String> {
        let result: Result<(UserAccount,), (ic_cdk::api::call::RejectionCode, String)> = ic_cdk::api::call::call(
            self.canister_id,
            "canister_get_account_info",
            (ic_cdk::api::caller(),),
        )
        .await;

        result.map(|(account,)| account).map_err(|(code, msg)| format!("Get account info failed: {:?} - {}", code, msg))
    }

    /// Deposit cycles to the canister's account
    pub async fn deposit_cycles(&self, cycles_amount: u128) -> Result<UserAccount, String> {
        let result: Result<(UserAccount,), (ic_cdk::api::call::RejectionCode, String)> = call_with_payment128(
            self.canister_id,
            "canister_deposit_cycles",
            (ic_cdk::api::caller(), cycles_amount),
            cycles_amount,
        )
        .await;

        result.map(|(account,)| account).map_err(|(code, msg)| format!("Deposit cycles failed: {:?} - {}", code, msg))
    }

    // ===== COST ESTIMATION =====

    /// Estimate upload cost for a file
    pub async fn estimate_upload_cost(&self, file_size_bytes: u64) -> Result<u128, String> {
        let result: Result<(u128,), (ic_cdk::api::call::RejectionCode, String)> = ic_cdk::api::call::call(
            self.canister_id,
            "canister_estimate_upload_cost",
            (file_size_bytes,),
        )
        .await;

        result.map(|(cost,)| cost).map_err(|(code, msg)| format!("Estimate upload cost failed: {:?} - {}", code, msg))
    }

    /// Estimate storage cost for a file
    pub async fn estimate_storage_cost(&self, file_size_bytes: u64, hours: u64) -> Result<u128, String> {
        let result: Result<(u128,), (ic_cdk::api::call::RejectionCode, String)> = ic_cdk::api::call::call(
            self.canister_id,
            "canister_estimate_storage_cost",
            (file_size_bytes, hours),
        )
        .await;

        result.map(|(cost,)| cost).map_err(|(code, msg)| format!("Estimate storage cost failed: {:?} - {}", code, msg))
    }

    // ===== UTILITY FUNCTIONS =====

    /// Get the public gateway URL for a CID
    pub fn get_asset_url(&self, cid: String) -> String {
        format!("https://{}.ic0.app/{}", self.canister_id, cid)
    }

    /// Check if content exists in the dCDN cache
    pub async fn is_cached(&self, cid: String) -> Result<bool, String> {
        match self.get_content(cid).await {
            Ok(_) => Ok(true),
            Err(_) => Ok(false),
        }
    }
}

// ===== CONVENIENCE FUNCTIONS =====

/// Upload content using the default CDN client
pub async fn upload_asset_default(
    content: Vec<u8>,
    content_type: String,
    cycles_payment: u128,
) -> Result<String, String> {
    let client = CdnClient::default();
    client.upload_asset(content, content_type, cycles_payment).await
}

/// Get content using the default CDN client
pub async fn get_asset_default(cid: String) -> Result<Vec<u8>, String> {
    let client = CdnClient::default();
    client.get_asset(cid).await
}

/// Get content with fallback using the default CDN client
pub async fn get_asset_with_fallback_default(cid: String) -> Result<Vec<u8>, String> {
    let client = CdnClient::default();
    client.get_asset_with_fallback(cid).await
}

// ===== CONVENIENCE FUNCTIONS FOR CANISTER CLIENT =====

/// Upload content using the default CDN canister client
pub async fn upload_content_default(
    content: Vec<u8>,
    content_type: String,
    cycles_payment: u128,
) -> Result<String, String> {
    let client = CdnCanisterClient::default();
    client.upload_content(content, content_type, cycles_payment).await
}

/// Get content using the default CDN canister client
pub async fn get_content_default(cid: String) -> Result<Vec<u8>, String> {
    let client = CdnCanisterClient::default();
    client.get_content(cid).await
}

/// Get content with fallback using the default CDN canister client
pub async fn get_content_with_fallback_default(cid: String) -> Result<Vec<u8>, String> {
    let client = CdnCanisterClient::default();
    client.get_content_with_fallback(cid).await
}

/// Bulk upload using the default CDN canister client
pub async fn bulk_upload_default(
    files: Vec<(Vec<u8>, String)>,
    cycles_payment: u128,
) -> Result<Vec<String>, String> {
    let client = CdnCanisterClient::default();
    client.bulk_upload(files, cycles_payment).await
}

// ===== CONSTANTS =====

/// Recommended cycles for small file uploads (< 1MB)
pub const CYCLES_SMALL_UPLOAD: u128 = 1_000_000_000; // 1B cycles

/// Recommended cycles for medium file uploads (1-10MB)
pub const CYCLES_MEDIUM_UPLOAD: u128 = 5_000_000_000; // 5B cycles

/// Recommended cycles for large file uploads (> 10MB)
pub const CYCLES_LARGE_UPLOAD: u128 = 10_000_000_000; // 10B cycles
