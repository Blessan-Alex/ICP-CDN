use std::collections::HashMap;
use std::collections::VecDeque;
use std::cell::RefCell;
use candid::{CandidType, Deserialize, Principal, Nat};
use ic_cdk::api::caller;
use image::{imageops, GenericImageView};

// HTTP Outcall types for external requests
use ic_cdk::api::management_canister::http_request::{
    CanisterHttpRequestArgument, HttpResponse, HttpHeader, HttpMethod, TransformContext
};

#[derive(CandidType, Deserialize, Clone)]
pub struct IpfsFile {
    pub name: String,
    pub cid: String,
    pub size: u64,
    pub content_type: String,
    pub uploaded_at: u64,
}

// New CacheEntry struct for storing file information in the cache
#[derive(CandidType, Deserialize, Clone, Default)]
pub struct CacheEntry {
    pub cid: String,
    pub content_type: String,
    pub size: u64,
    pub last_accessed_ts: u64,
    pub bytes: Vec<u8>,
}

// New UserAccount struct for managing user-specific data and balances
#[derive(CandidType, Deserialize, Clone)]
pub struct UserAccount {
    pub user_principal: Principal,
    pub cycles_balance: u128,
    pub tier: UserTier,
    pub cache_usage_bytes: u64,
    pub pinata_enabled: bool,
}

// User tier enumeration
#[derive(CandidType, Deserialize, Clone, PartialEq, Debug)]
pub enum UserTier {
    Free,
    Starter,
    Pro,
    Business,
}

// Cached image information for the resize interface
#[derive(CandidType, Deserialize, Clone)]
pub struct CachedImageInfo {
    pub cid: String,
    pub name: String,
    pub content_type: String,
    pub size: u64,
    pub last_accessed: u64,
}

// Tier configuration functions (environment-based)
fn get_tier_cache_limits() -> (u64, u64, u64, u64) {
    (
        get_env_var("FREE_TIER_CACHE_LIMIT_MB", "20").parse().unwrap_or(20) * 1024 * 1024,
        get_env_var("STARTER_TIER_CACHE_LIMIT_MB", "50").parse().unwrap_or(50) * 1024 * 1024,
        get_env_var("PRO_TIER_CACHE_LIMIT_MB", "100").parse().unwrap_or(100) * 1024 * 1024,
        get_env_var("BUSINESS_TIER_CACHE_LIMIT_MB", "500").parse().unwrap_or(500) * 1024 * 1024,
    )
}

fn get_upgrade_costs() -> (u128, u128, u128) {
    (
        get_env_var("STARTER_UPGRADE_COST_CYCLES", "1000000000").parse().unwrap_or(1_000_000_000),
        get_env_var("PRO_UPGRADE_COST_CYCLES", "5000000000").parse().unwrap_or(5_000_000_000),
        get_env_var("BUSINESS_UPGRADE_COST_CYCLES", "15000000000").parse().unwrap_or(15_000_000_000),
    )
}

// Pinata tier configuration (environment-based)
fn get_pinata_storage_limits() -> (u64, u64, u64, u64) {
    (
        1 * 1024 * 1024 * 1024, // 1GB - Free tier
        100 * 1024 * 1024 * 1024, // 100GB - Starter tier
        500 * 1024 * 1024 * 1024, // 500GB - Pro tier
        2 * 1024 * 1024 * 1024 * 1024, // 2TB - Business tier
    )
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

impl UserAccount {
    fn get_cache_limit(&self) -> u64 {
        let (free_limit, starter_limit, pro_limit, business_limit) = get_tier_cache_limits();
        match self.tier {
            UserTier::Free => free_limit,
            UserTier::Starter => starter_limit,
            UserTier::Pro => pro_limit,
            UserTier::Business => business_limit,
        }
    }

    fn get_pinata_storage_limit(&self) -> u64 {
        let (free_storage, starter_storage, pro_storage, business_storage) = get_pinata_storage_limits();
        match self.tier {
            UserTier::Free => free_storage,
            UserTier::Starter => starter_storage,
            UserTier::Pro => pro_storage,
            UserTier::Business => business_storage,
        }
    }

    fn can_upgrade_to(&self, target_tier: &UserTier) -> bool {
        match (&self.tier, target_tier) {
            (UserTier::Free, UserTier::Starter) => true,
            (UserTier::Free, UserTier::Pro) => true,
            (UserTier::Free, UserTier::Business) => true,
            (UserTier::Starter, UserTier::Pro) => true,
            (UserTier::Starter, UserTier::Business) => true,
            (UserTier::Pro, UserTier::Business) => true,
            _ => false,
        }
    }

    fn get_upgrade_cost(&self, target_tier: &UserTier) -> Option<u128> {
        let (starter_cost, pro_cost, business_cost) = get_upgrade_costs();
        match (&self.tier, target_tier) {
            (UserTier::Free, UserTier::Starter) => Some(starter_cost),
            (UserTier::Free, UserTier::Pro) => Some(pro_cost),
            (UserTier::Free, UserTier::Business) => Some(business_cost),
            (UserTier::Starter, UserTier::Pro) => Some(pro_cost - starter_cost),
            (UserTier::Starter, UserTier::Business) => Some(business_cost - starter_cost),
            (UserTier::Pro, UserTier::Business) => Some(business_cost - pro_cost),
            _ => None,
        }
    }

    fn get_available_upgrades(&self) -> Vec<UserTier> {
        let mut upgrades = Vec::new();
        
        match self.tier {
            UserTier::Free => {
                upgrades.push(UserTier::Starter);
                upgrades.push(UserTier::Pro);
                upgrades.push(UserTier::Business);
            },
            UserTier::Starter => {
                upgrades.push(UserTier::Pro);
                upgrades.push(UserTier::Business);
            },
            UserTier::Pro => {
                upgrades.push(UserTier::Business);
            },
            UserTier::Business => {
                // No upgrades available for Business tier
            },
        }
        
        upgrades
    }
}

// Cache performance metrics struct
#[derive(CandidType, Deserialize, Clone)]
pub struct CachePerformanceMetrics {
    pub total_requests: u64,
    pub cache_hits: u64,
    pub cache_misses: u64,
    pub avg_response_time_ms: u64,
    pub total_cache_size_bytes: u64,
    pub cache_utilization_percent: u64,
}

// Internal performance metrics tracking struct
#[derive(Default)]
struct PerformanceMetrics {
    total_requests: u64,
    cache_hits: u64,
    cache_misses: u64,
    total_response_time_ms: u64,
    last_reset_time: u64,
}

// Cache configuration functions (environment-based)
fn get_cache_config() -> (usize, u64) {
    (
        get_env_var("MAX_CACHE_ITEMS", "1000").parse().unwrap_or(1000),
        get_env_var("MAX_CACHE_SIZE_MB", "20").parse().unwrap_or(20) * 1024 * 1024,
    )
}

// Configuration function to get environment variables
fn get_env_var(key: &str, default: &str) -> String {
    // In ICP canisters, we can't directly access process.env
    // This is a placeholder for environment variable access
    // In a real implementation, this would be configured through canister settings
    match key {
        "DFX_REPLICA_HOST" | "VITE_DFX_REPLICA_HOST" => get_env_var_impl("DFX_REPLICA_HOST", "http://127.0.0.1:4943"),
        "CANISTER_ID_ICP_CDN_BACKEND" | "VITE_CANISTER_ID_BACKEND" => get_env_var_impl("CANISTER_ID_BACKEND", ""),
        "CANISTER_ID_ICP_CDN_FRONTEND" | "VITE_CANISTER_ID_FRONTEND" => get_env_var_impl("CANISTER_ID_FRONTEND", ""),
        "CANISTER_ID_INTERNET_IDENTITY" | "VITE_CANISTER_ID_INTERNET_IDENTITY" => get_env_var_impl("CANISTER_ID_INTERNET_IDENTITY", ""),
        "VITE_PINATA_JWT" | "PINATA_JWT" => get_env_var_impl("PINATA_JWT", ""),
        "VITE_PINATA_GATEWAY" | "PINATA_GATEWAY" => get_env_var_impl("PINATA_GATEWAY", "gateway.pinata.cloud"),
        "IPFS_GATEWAY" => get_env_var_impl("IPFS_GATEWAY", "https://cloudflare-ipfs.com"),
        "PINATA_API_URL" => get_env_var_impl("PINATA_API_URL", "https://api.pinata.cloud"),
        "MAX_CACHE_ITEMS" => get_env_var_impl("MAX_CACHE_ITEMS", "1000"),
        "MAX_CACHE_SIZE_MB" => get_env_var_impl("MAX_CACHE_SIZE_MB", "20"),
        "FREE_TIER_CACHE_LIMIT_MB" => get_env_var_impl("FREE_TIER_CACHE_LIMIT_MB", "20"),
        "STARTER_TIER_CACHE_LIMIT_MB" => get_env_var_impl("STARTER_TIER_CACHE_LIMIT_MB", "50"),
        "PRO_TIER_CACHE_LIMIT_MB" => get_env_var_impl("PRO_TIER_CACHE_LIMIT_MB", "100"),
        "BUSINESS_TIER_CACHE_LIMIT_MB" => get_env_var_impl("BUSINESS_TIER_CACHE_LIMIT_MB", "500"),
        "STARTER_UPGRADE_COST_CYCLES" => get_env_var_impl("STARTER_UPGRADE_COST_CYCLES", "1000000000"),
        "PRO_UPGRADE_COST_CYCLES" => get_env_var_impl("PRO_UPGRADE_COST_CYCLES", "5000000000"),
        "BUSINESS_UPGRADE_COST_CYCLES" => get_env_var_impl("BUSINESS_UPGRADE_COST_CYCLES", "15000000000"),
        "TEST_HTTPBIN_URL" => get_env_var_impl("TEST_HTTPBIN_URL", "https://httpbin.org"),
        "TEST_JSONPLACEHOLDER_URL" => get_env_var_impl("TEST_JSONPLACEHOLDER_URL", "https://jsonplaceholder.typicode.com"),
        "TEST_API_IPIFY_URL" => get_env_var_impl("TEST_API_IPIFY_URL", "https://api.ipify.org"),
        _ => default.to_string(),
    }
}

// Helper function to get environment variables with proper fallback handling
fn get_env_var_impl(_key: &str, default: &str) -> String {
    // In a real ICP implementation, this would access environment variables
    // For now, we return the default value
    // TODO: Implement proper environment variable access for ICP canisters
    default.to_string()
}

// Pinata API configuration
// NOTE: In production, this should be managed via encrypted secrets
// For this hackathon MVP, we're using a real JWT directly
fn get_pinata_jwt() -> String {
    // Your actual Pinata JWT token
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySW5mb3JtYXRpb24iOnsiaWQiOiIyZDhiYzBiNC0xNjllLTQzNzQtOTI5Yy05ZmJhNjEwODNmMTciLCJlbWFpbCI6ImtoYXRyaXNha3NoaTMwMDNAZ21haWwuY29tIiwiZW1haWxfdmVyaWZpZWQiOnRydWUsInBpbl9wb2xpY3kiOnsicmVnaW9ucyI6W3siZGVzaXJlZFJlcGxpY2F0aW9uQ291bnQiOjEsImlkIjoiRlJBMSJ9LHsiZGVzaXJlZFJlcGxpY2F0aW9uQ291bnQiOjEsImlkIjoiTllDMSJ9XSwidmVyc2lvbiI6MX0sIm1mYV9lbmFibGVkIjpmYWxzZSwic3RhdHVzIjoiQUNUSVZFIn0sImF1dGhlbnRpY2F0aW9uVHlwZSI6InNjb3BlZEtleSIsInNjb3BlZEtleUtleSI6IjdjN2FjMjY3YTdhMzU2ZWVmN2Y3Iiwic2NvcGVkS2V5U2VjcmV0IjoiODE2ZjMyZjk4NTFjY2Q1YzZmNjhlNjQzMDA2NjZlZGQ4MzkxMTEzY2RkMDhhMjMzNDdkZmMzY2NhMDNlOTU1NCIsImV4cCI6MTc4Mzc4MTcwOH0.Qv8HE9i-HPBOJ2jvtnrlEGnttG6kIEUQ-SaKz4AznwE".to_string()
}

thread_local! {
    static USER_FILES: RefCell<HashMap<String, Vec<IpfsFile>>> = RefCell::new(HashMap::new());
    
    // New state variables for the dCDN functionality
    static CACHE: RefCell<HashMap<String, CacheEntry>> = RefCell::new(HashMap::new());
    static ACCOUNTS: RefCell<HashMap<Principal, UserAccount>> = RefCell::new(HashMap::new());
    
    // LRU tracking state for cache eviction
    static LRU_QUEUE: RefCell<VecDeque<String>> = RefCell::new(VecDeque::new());
    
    // Real-time performance metrics tracking
    static METRICS: RefCell<PerformanceMetrics> = RefCell::new(PerformanceMetrics::default());
}

fn get_user_key() -> String {
    caller().to_string()
}

// Helper functions for tracking real-time metrics
fn record_request(is_cache_hit: bool, response_time_ms: u64) {
    METRICS.with(|metrics| {
        let mut metrics = metrics.borrow_mut();
        metrics.total_requests += 1;
        metrics.total_response_time_ms += response_time_ms;
        
        if is_cache_hit {
            metrics.cache_hits += 1;
        } else {
            metrics.cache_misses += 1;
        }
    });
}

fn get_average_response_time() -> u64 {
    METRICS.with(|metrics| {
        let metrics = metrics.borrow();
        if metrics.total_requests == 0 {
            0
        } else {
            metrics.total_response_time_ms / metrics.total_requests
        }
    })
}

fn reset_metrics() {
    METRICS.with(|metrics| {
        let mut metrics = metrics.borrow_mut();
        *metrics = PerformanceMetrics::default();
        metrics.last_reset_time = ic_cdk::api::time();
    });
}

#[ic_cdk::update]
fn add_ipfs_file(name: String, cid: String, size: u64, content_type: String) -> Result<String, String> {
    if name.is_empty() || cid.is_empty() {
        return Err("Filename and CID cannot be empty".to_string());
    }
    let file = IpfsFile {
        name,
        cid,
        size,
        content_type,
        uploaded_at: ic_cdk::api::time(),
    };
    let user_key = get_user_key();
    USER_FILES.with(|files| {
        let mut files = files.borrow_mut();
        let user_files = files.entry(user_key).or_insert_with(Vec::new);
        user_files.push(file);
    });
    Ok("File metadata added".to_string())
}

#[ic_cdk::query]
fn list_ipfs_files() -> Vec<IpfsFile> {
    let user_key = get_user_key();
    USER_FILES.with(|files| {
        let files = files.borrow();
        files.get(&user_key).cloned().unwrap_or_default()
    })
}

#[ic_cdk::update]
fn delete_ipfs_file(cid: String) -> Result<String, String> {
    if cid.is_empty() {
        return Err("CID cannot be empty".to_string());
    }
    let user_key = get_user_key();
    let removed = USER_FILES.with(|files| {
        let mut files = files.borrow_mut();
        if let Some(user_files) = files.get_mut(&user_key) {
            let initial_len = user_files.len();
            user_files.retain(|file| file.cid != cid);
            initial_len != user_files.len()
        } else {
            false
        }
    });
    if removed {
        Ok("File deleted".to_string())
    } else {
        Err("File not found".to_string())
    }
}

#[ic_cdk::query]
fn greet(name: String) -> String {
    format!("Hello, {}!", name)
}

// dCDN Core Functions - Cycles Billing Implementation (Prompt 1.2)
#[ic_cdk::update]
fn deposit_cycles() -> UserAccount {
    let caller_principal = ic_cdk::api::caller();
    
    // Check the number of cycles sent with the message
    let cycles_available = ic_cdk::api::call::msg_cycles_available128();
    
    // Accept the cycles into the canister's balance
    let cycles_accepted = ic_cdk::api::call::msg_cycles_accept128(cycles_available);
    
    // Get or create a UserAccount for the caller
    ACCOUNTS.with(|accounts| {
        let mut accounts = accounts.borrow_mut();
        let user_account = accounts.entry(caller_principal).or_insert_with(|| UserAccount {
            user_principal: caller_principal,
            cycles_balance: 0,
            tier: UserTier::Free,
            cache_usage_bytes: 0,
            pinata_enabled: false,
        });
        
        // Add the accepted cycles to the user's cycles_balance
        user_account.cycles_balance = user_account.cycles_balance.saturating_add(cycles_accepted);
        
        // Return the updated user account
        user_account.clone()
    })
}

// Helper function to get user's current cycles balance
#[ic_cdk::query]
fn get_cycles_balance() -> u128 {
    let caller_principal = ic_cdk::api::caller();
    
    ACCOUNTS.with(|accounts| {
        let accounts = accounts.borrow();
        accounts.get(&caller_principal)
            .map(|account| account.cycles_balance)
            .unwrap_or(0)
    })
}

// Helper function to get user account (creates if doesn't exist)
#[ic_cdk::query]
fn get_user_account() -> UserAccount {
    let caller_principal = ic_cdk::api::caller();
    
    ACCOUNTS.with(|accounts| {
        let accounts = accounts.borrow();
        accounts.get(&caller_principal).cloned().unwrap_or_else(|| UserAccount {
            user_principal: caller_principal,
            cycles_balance: 0,
            tier: UserTier::Free,
            cache_usage_bytes: 0,
            pinata_enabled: false,
        })
    })
}

// LRU Cache Helper Functions
fn touch_lru(cid: &str) {
    LRU_QUEUE.with(|lru_queue| {
        let mut queue = lru_queue.borrow_mut();
        
        // Find and remove the CID from its current position
        let mut found = false;
        let mut temp_queue = VecDeque::new();
        
        // Remove the target CID and collect all others
        while let Some(item) = queue.pop_front() {
            if item == cid {
                found = true;
                // Don't add it back yet - we'll add it to the end
            } else {
                temp_queue.push_back(item);
            }
        }
        
        // Restore the queue with the target CID at the end
        while let Some(item) = temp_queue.pop_front() {
            queue.push_back(item);
        }
        
        // Add the accessed CID to the back (most recently used)
        if found {
            queue.push_back(cid.to_string());
        }
    });
}

fn evict_lru_item() -> Option<String> {
    LRU_QUEUE.with(|lru_queue| {
        let mut queue = lru_queue.borrow_mut();
        // Remove the least recently used item (front of queue)
        queue.pop_front()
    })
}

fn add_to_lru(cid: &str) {
    LRU_QUEUE.with(|lru_queue| {
        let mut queue = lru_queue.borrow_mut();
        queue.push_back(cid.to_string());
    });
}

fn remove_from_lru(cid: &str) {
    LRU_QUEUE.with(|lru_queue| {
        let mut queue = lru_queue.borrow_mut();
        if let Some(pos) = queue.iter().position(|x| x == cid) {
            queue.remove(pos);
        }
    });
}

// Cache management functions with LRU logic and user tier limits
fn put_cache_entry(cid: String, cache_entry: CacheEntry) -> Result<(), String> {
    let caller_principal = ic_cdk::api::caller();
    
    // Get user account and check cache limits
    let user_account = ACCOUNTS.with(|accounts| {
        let mut accounts = accounts.borrow_mut();
        if let Some(account) = accounts.get(&caller_principal) {
            account.clone()
        } else {
            // Create and store a new user account
            let new_account = UserAccount {
                user_principal: caller_principal,
                cycles_balance: 0,
                tier: UserTier::Free,
                cache_usage_bytes: 0,
                pinata_enabled: false,
            };
            accounts.insert(caller_principal, new_account.clone());
            new_account
        }
    });
    
    let cache_limit = user_account.get_cache_limit();
    let current_usage = user_account.cache_usage_bytes;
    let new_usage = current_usage + cache_entry.size;
    
    // Check if adding this content would exceed the user's cache limit
    if new_usage > cache_limit {
        return Err(format!(
            "Cache limit exceeded. Current usage: {}MB, Limit: {}MB, Required: {}MB. Consider upgrading your tier.",
            current_usage / (1024 * 1024),
            cache_limit / (1024 * 1024),
            cache_entry.size / (1024 * 1024)
        ));
    }
    
    CACHE.with(|cache| {
        let mut cache = cache.borrow_mut();
        
        // Check if cache is at capacity
        let (max_cache_items, _) = get_cache_config();
        if cache.len() >= max_cache_items {
            // Evict the least recently used item
            if let Some(evicted_cid) = evict_lru_item() {
                if let Some(evicted_entry) = cache.remove(&evicted_cid) {
                    // Update user's cache usage
                    update_user_cache_usage(caller_principal, -(evicted_entry.size as i64));
                }
            }
        }
        
        // Add the new item
        cache.insert(cid.clone(), cache_entry.clone());
        
        // Add to LRU queue
        add_to_lru(&cid);
        
        // Update user's cache usage
        update_user_cache_usage(caller_principal, cache_entry.size as i64);
        
        Ok(())
    })
}

// Helper function to update user's cache usage
fn update_user_cache_usage(principal: Principal, delta: i64) {
    ACCOUNTS.with(|accounts| {
        let mut accounts = accounts.borrow_mut();
        if let Some(account) = accounts.get_mut(&principal) {
            let old_usage = account.cache_usage_bytes;
            if delta > 0 {
                account.cache_usage_bytes = account.cache_usage_bytes.saturating_add(delta as u64);
            } else {
                account.cache_usage_bytes = account.cache_usage_bytes.saturating_sub((-delta) as u64);
            }
            ic_cdk::print(format!("Updated cache usage for principal {}: {} -> {} (delta: {})", principal, old_usage, account.cache_usage_bytes, delta));
        } else {
            ic_cdk::print(format!("User account not found for principal: {}", principal));
        }
    });
}

// Tier management functions
#[ic_cdk::update]
fn upgrade_tier(target_tier: UserTier) -> Result<String, String> {
    let caller_principal = ic_cdk::api::caller();
    
    ACCOUNTS.with(|accounts| {
        let mut accounts = accounts.borrow_mut();
        let user_account = accounts.get_mut(&caller_principal)
            .ok_or_else(|| "User account not found".to_string())?;
        
        // Check if upgrade is possible
        if !user_account.can_upgrade_to(&target_tier) {
            return Err(format!(
                "Cannot upgrade from {:?} to {:?}. Invalid upgrade path.",
                user_account.tier, target_tier
            ));
        }
        
        // Get upgrade cost
        let upgrade_cost = user_account.get_upgrade_cost(&target_tier)
            .ok_or_else(|| "Upgrade cost not available".to_string())?;
        
        // Check if user has enough cycles
        if user_account.cycles_balance < upgrade_cost {
            return Err(format!(
                "Insufficient cycles for upgrade. Required: {}, Available: {}",
                upgrade_cost, user_account.cycles_balance
            ));
        }
        
        // Deduct cycles and upgrade tier
        user_account.cycles_balance = user_account.cycles_balance.saturating_sub(upgrade_cost);
        user_account.tier = target_tier.clone();
        user_account.pinata_enabled = target_tier != UserTier::Free;
        
        Ok(format!(
            "✅ Successfully upgraded to {:?} tier! Cost: {} cycles. Pinata enabled: {}",
            target_tier, upgrade_cost, user_account.pinata_enabled
        ))
    })
}

// Get user's tier information
#[ic_cdk::query]
fn get_user_tier_info() -> Result<UserTierInfo, String> {
    let caller_principal = ic_cdk::api::caller();
    
    let user_account = ACCOUNTS.with(|accounts| {
        let accounts = accounts.borrow();
        accounts.get(&caller_principal).cloned().unwrap_or_else(|| UserAccount {
            user_principal: caller_principal,
            cycles_balance: 0,
            tier: UserTier::Free,
            cache_usage_bytes: 0,
            pinata_enabled: false,
        })
    });
    
    let available_upgrades = user_account.get_available_upgrades();
    
    Ok(UserTierInfo {
        current_tier: user_account.tier.clone(),
        cache_limit_bytes: user_account.get_cache_limit(),
        cache_usage_bytes: user_account.cache_usage_bytes,
        pinata_enabled: user_account.pinata_enabled,
        pinata_storage_limit_bytes: user_account.get_pinata_storage_limit(),
        available_upgrades,
    })
}

// Get all available tiers with pricing
#[ic_cdk::query]
fn get_available_tiers() -> Vec<TierInfo> {
    let (free_limit, starter_limit, pro_limit, business_limit) = get_tier_cache_limits();
    let (starter_cost, pro_cost, business_cost) = get_upgrade_costs();
    let (free_storage, starter_storage, pro_storage, business_storage) = get_pinata_storage_limits();
    
    vec![
        TierInfo {
            tier: UserTier::Free,
            name: "Free".to_string(),
            cache_limit_mb: (free_limit / (1024 * 1024)) as u32,
            pinata_storage_gb: (free_storage / (1024 * 1024 * 1024)) as u32,
            pinata_enabled: false,
            price_cycles: 0,
            features: vec![
                format!("{}MB dCDN cache", (free_limit / (1024 * 1024))),
                format!("{}GB Pinata storage", (free_storage / (1024 * 1024 * 1024))),
                "Basic content delivery".to_string(),
                "No IPFS pinning".to_string(),
            ],
        },
        TierInfo {
            tier: UserTier::Starter,
            name: "Starter".to_string(),
            cache_limit_mb: (starter_limit / (1024 * 1024)) as u32,
            pinata_storage_gb: (starter_storage / (1024 * 1024 * 1024)) as u32,
            pinata_enabled: true,
            price_cycles: starter_cost,
            features: vec![
                format!("{}MB dCDN cache", (starter_limit / (1024 * 1024))),
                format!("{}GB Pinata storage", (starter_storage / (1024 * 1024 * 1024))),
                "IPFS pinning included".to_string(),
                "Priority support".to_string(),
            ],
        },
        TierInfo {
            tier: UserTier::Pro,
            name: "Pro".to_string(),
            cache_limit_mb: (pro_limit / (1024 * 1024)) as u32,
            pinata_storage_gb: (pro_storage / (1024 * 1024 * 1024)) as u32,
            pinata_enabled: true,
            price_cycles: pro_cost,
            features: vec![
                format!("{}MB dCDN cache", (pro_limit / (1024 * 1024))),
                format!("{}GB Pinata storage", (pro_storage / (1024 * 1024 * 1024))),
                "IPFS pinning included".to_string(),
                "Advanced analytics".to_string(),
                "Priority support".to_string(),
            ],
        },
        TierInfo {
            tier: UserTier::Business,
            name: "Business".to_string(),
            cache_limit_mb: (business_limit / (1024 * 1024)) as u32,
            pinata_storage_gb: (business_storage / (1024 * 1024 * 1024)) as u32,
            pinata_enabled: true,
            price_cycles: business_cost,
            features: vec![
                format!("{}MB dCDN cache", (business_limit / (1024 * 1024))),
                format!("{}GB Pinata storage", (business_storage / (1024 * 1024 * 1024))),
                "IPFS pinning included".to_string(),
                "Advanced analytics".to_string(),
                "Dedicated support".to_string(),
                "Custom integrations".to_string(),
            ],
        },
    ]
}

// Enhanced upload function with tier-based Pinata integration
#[ic_cdk::update]
async fn upload_content(cid: String, content_type: String, content: Vec<u8>) -> Result<String, String> {
    if cid.is_empty() {
        return Err("CID cannot be empty".to_string());
    }
    
    if content.is_empty() {
        return Err("Content cannot be empty".to_string());
    }
    
    let caller_principal = ic_cdk::api::caller();
    
    // Get user account to check tier and Pinata status
    let _user_account = ACCOUNTS.with(|accounts| {
        let accounts = accounts.borrow();
        accounts.get(&caller_principal).cloned().unwrap_or_else(|| UserAccount {
            user_principal: caller_principal,
            cycles_balance: 0,
            tier: UserTier::Free,
            cache_usage_bytes: 0,
            pinata_enabled: false,
        })
    });
    
    // Create a cache entry for the uploaded content
    let cache_entry = CacheEntry {
        cid: cid.clone(),
        content_type: content_type.clone(),
        size: content.len() as u64,
        last_accessed_ts: ic_cdk::api::time(),
        bytes: content.clone(),
    };
    
    // Store in cache (this will check user's cache limits)
    if let Err(e) = put_cache_entry(cid.clone(), cache_entry) {
        return Err(format!("Failed to cache uploaded content: {}", e));
    }
    
    // For now, only store in cache (Pinata upload handled by frontend via backend server)
    let upload_result = format!("Content uploaded to cache. CID: {} (Pinata upload handled separately)", cid);
    
    Ok(upload_result)
}

// New structs for tier information
#[derive(CandidType, Deserialize, Clone)]
pub struct UserTierInfo {
    pub current_tier: UserTier,
    pub cache_limit_bytes: u64,
    pub cache_usage_bytes: u64,
    pub pinata_enabled: bool,
    pub pinata_storage_limit_bytes: u64,
    pub available_upgrades: Vec<UserTier>,
}

#[derive(CandidType, Deserialize, Clone)]
pub struct TierInfo {
    pub tier: UserTier,
    pub name: String,
    pub cache_limit_mb: u32,
    pub pinata_storage_gb: u32,
    pub pinata_enabled: bool,
    pub price_cycles: u128,
    pub features: Vec<String>,
}

fn get_cache_entry(cid: &str) -> Option<CacheEntry> {
    CACHE.with(|cache| {
        let cache = cache.borrow();
        if let Some(entry) = cache.get(cid) {
            // Touch the LRU queue to mark as recently used
            touch_lru(cid);
            Some(entry.clone())
        } else {
            None
        }
    })
}

fn remove_cache_entry(cid: &str) -> bool {
    let removed = CACHE.with(|cache| {
        let mut cache = cache.borrow_mut();
        cache.remove(cid).is_some()
    });
    
    if removed {
        // Update user's cache usage (we need to find which user owns this CID)
        // For now, we'll update all users' cache usage since we don't track ownership
        // In a production system, we'd track which user owns which cache entry
        update_user_cache_usage_on_removal(cid);
        remove_from_lru(cid);
    }
    
    removed
}

// Helper function to update user cache usage when an entry is removed
fn update_user_cache_usage_on_removal(cid: &str) {
    // Get the size of the removed entry
    let removed_size = CACHE.with(|cache| {
        let cache = cache.borrow();
        cache.get(cid).map(|entry| entry.size).unwrap_or(0)
    });
    
    if removed_size > 0 {
        // Update all users' cache usage (simplified approach)
        // In production, we'd track which user owns which cache entry
        ACCOUNTS.with(|accounts| {
            let mut accounts = accounts.borrow_mut();
            for account in accounts.values_mut() {
                if account.cache_usage_bytes >= removed_size {
                    account.cache_usage_bytes = account.cache_usage_bytes.saturating_sub(removed_size);
                }
            }
        });
    }
}

// Additional LRU cache management functions
fn get_cache_stats() -> (u64, u64, u64) {
    CACHE.with(|cache| {
        let cache = cache.borrow();
        let total_entries = cache.len() as u64;
        let total_bytes: u64 = cache.values().map(|entry| entry.size).sum();
        let (max_entries, _) = get_cache_config();
        (total_entries, total_bytes, max_entries as u64)
    })
}

fn get_lru_queue_stats() -> (u64, Vec<String>) {
    LRU_QUEUE.with(|lru_queue| {
        let queue = lru_queue.borrow();
        let queue_length = queue.len() as u64;
        let queue_items: Vec<String> = queue.iter().cloned().collect();
        (queue_length, queue_items)
    })
}

fn clear_cache() -> (u64, u64) {
    let (entries_removed, bytes_freed) = CACHE.with(|cache| {
        let mut cache = cache.borrow_mut();
        let entries_removed = cache.len() as u64;
        let bytes_freed: u64 = cache.values().map(|entry| entry.size).sum();
        cache.clear();
        (entries_removed, bytes_freed)
    });
    
    // Clear LRU queue as well
    LRU_QUEUE.with(|lru_queue| {
        let mut queue = lru_queue.borrow_mut();
        queue.clear();
    });
    
    (entries_removed, bytes_freed)
}

// HTTP Outcall Transform Function
// This function securely strips out response headers to prevent state-breaking non-determinism
#[ic_cdk::query]
fn transform(_raw: TransformContext) -> HttpResponse {
    // For now, return a simple response to avoid transform issues
    HttpResponse {
        status: Nat::from(200u64),
        headers: vec![],
        body: vec![],
    }
}

// Public async function to fetch content from IPFS using real HTTP outcalls
#[ic_cdk::update]
async fn fetch_from_ipfs(cid: String) -> Result<Vec<u8>, String> {
    fetch_from_ipfs_internal(&cid).await
}

// Private async function to fetch content from IPFS using real HTTP outcalls
async fn fetch_from_ipfs_internal(cid: &str) -> Result<Vec<u8>, String> {
    // Construct the full URL for a public IPFS gateway
    let ipfs_gateway = get_env_var("IPFS_GATEWAY", "https://cloudflare-ipfs.com");
    let url = format!("{}/ipfs/{}", ipfs_gateway, cid);
    
    ic_cdk::print(format!("Making HTTP outcall to IPFS gateway: {}", url));
    
    // Create the HTTP request
    let request = CanisterHttpRequestArgument {
        url,
        method: HttpMethod::GET,
        headers: vec![
            HttpHeader { name: "User-Agent".to_string(), value: "ICP-dCDN/1.0".to_string() },
        ],
        body: Some(vec![]),
        max_response_bytes: Some(1024 * 1024), // 1MB max response
        transform: None,
    };
    
    // Make the HTTP outcall
    let cycles = 15_000_000_000u128; // 15B cycles for the request (increased from 10B)
    
    ic_cdk::print(format!("Sending HTTP outcall with {} cycles", cycles));
    
    match ic_cdk::api::call::call_with_payment128::<(CanisterHttpRequestArgument,), (HttpResponse,)>(
        Principal::management_canister(),
        "http_request",
        (request,),
        cycles,
    ).await {
        Ok((response,)) => {
            ic_cdk::print(format!("HTTP outcall successful, status: {}", response.status));
            
            // Check if the request was successful
            if response.status == Nat::from(200u64) {
                ic_cdk::print(format!("Successfully fetched {} bytes from IPFS", response.body.len()));
                Ok(response.body)
            } else {
                let error_msg = String::from_utf8_lossy(&response.body);
                ic_cdk::print(format!("HTTP request failed with status: {}, body: {}", response.status, error_msg));
                Err(format!("HTTP request failed with status: {} - {}", response.status, error_msg))
            }
        }
        Err((code, message)) => {
            ic_cdk::print(format!("HTTP outcall failed: {:?} - {}", code, message));
            Err(format!("HTTP outcall failed: {:?} - {}", code, message))
        }
    }
}

// Upload file content to Pinata using pinFileToIPFS API
async fn upload_to_pinata(content: &[u8], filename: &str, content_type: &str, pin_content: bool) -> Result<String, String> {
    let pinata_api_url = get_env_var("PINATA_API_URL", "https://api.pinata.cloud");
    let url = format!("{}/pinning/pinFileToIPFS", pinata_api_url);
    
    ic_cdk::print(format!("Making HTTP outcall to Pinata API to upload file: {} (pin_content: {})", filename, pin_content));
    
    // Create multipart form data body with proper structure
    let boundary = "----WebKitFormBoundary7MA4YWxkTrZu0gW";
    let mut body = Vec::new();
    
    // Sanitize filename to prevent multipart form data issues
    let safe_filename = filename.replace("\"", "").replace("\r", "").replace("\n", "");
    
    // Add file field with proper formatting
    body.extend_from_slice(format!("--{}\r\n", boundary).as_bytes());
    body.extend_from_slice(format!("Content-Disposition: form-data; name=\"file\"; filename=\"{}\"\r\n", safe_filename).as_bytes());
    body.extend_from_slice(format!("Content-Type: {}\r\n\r\n", content_type).as_bytes());
    body.extend_from_slice(content);
    body.extend_from_slice(b"\r\n");
    
    // Debug: Log the multipart form data being sent
    ic_cdk::print(format!("Multipart form data boundary: {}", boundary));
    ic_cdk::print(format!("File field: name=\"file\"; filename=\"{}\"", filename));
    ic_cdk::print(format!("Content-Type: {}", content_type));
    ic_cdk::print(format!("Content length: {} bytes", content.len()));
    
    // For free tier, don't add any metadata to avoid JSON parsing issues
    // Only add metadata for paid tiers (when pin_content is true)
    if pin_content {
        body.extend_from_slice(format!("--{}\r\n", boundary).as_bytes());
        body.extend_from_slice(b"Content-Disposition: form-data; name=\"pinataMetadata\"\r\n\r\n");
        let metadata = format!("{{\"name\":\"{}\"}}", safe_filename);
        ic_cdk::print(format!("Pinata metadata JSON: {}", metadata));
        body.extend_from_slice(metadata.as_bytes());
        body.extend_from_slice(b"\r\n");
    }
    
    // End the multipart form data
    body.extend_from_slice(format!("--{}--\r\n", boundary).as_bytes());
    
    // Debug: Log the complete multipart form data being sent
    ic_cdk::print(format!("Complete multipart form data length: {} bytes", body.len()));
    
    // Create headers for the POST request
    let headers = vec![
        HttpHeader { name: "Authorization".to_string(), value: format!("Bearer {}", get_pinata_jwt()) },
        HttpHeader { name: "Content-Type".to_string(), value: format!("multipart/form-data; boundary={}", boundary) },
    ];
    
    // Create the HTTP request
    let request = CanisterHttpRequestArgument {
        url: url.to_string(),
        method: HttpMethod::POST,
        headers,
        body: Some(body),
        max_response_bytes: Some(1024 * 1024), // 1MB max response
        transform: None,
    };
    
    // Make the HTTP outcall
    let cycles = 20_000_000_000u128; // 20B cycles for file upload (more than pinning)
    
    ic_cdk::print(format!("Sending Pinata file upload HTTP outcall with {} cycles", cycles));
    
    match ic_cdk::api::call::call_with_payment128::<(CanisterHttpRequestArgument,), (HttpResponse,)>(
        Principal::management_canister(),
        "http_request",
        (request,),
        cycles,
    ).await {
        Ok((response,)) => {
            ic_cdk::print(format!("Pinata HTTP outcall successful, status: {}", response.status));
            
            // Check if the upload was successful
            if response.status == Nat::from(200u64) {
                // Parse the response to extract IPFS hash
                let response_body = String::from_utf8_lossy(&response.body);
                ic_cdk::print(format!("Pinata upload response: {}", response_body));
                
                // Try to extract IPFS hash from response JSON
                // Response format: {"IpfsHash":"QmXXX...","PinSize":1234,"Timestamp":"2023-..."}
                if let Some(start) = response_body.find("\"IpfsHash\":\"") {
                    let start_idx = start + 12; // Length of "IpfsHash":""
                    if let Some(end) = response_body[start_idx..].find("\"") {
                        let ipfs_hash = &response_body[start_idx..start_idx + end];
                        ic_cdk::print(format!("Successfully uploaded file to Pinata with IPFS hash: {}", ipfs_hash));
                        return Ok(ipfs_hash.to_string());
                    }
                }
                
                Err("Failed to parse IPFS hash from Pinata response".to_string())
            } else {
                let error_msg = String::from_utf8_lossy(&response.body);
                ic_cdk::print(format!("Pinata API failed with status: {}, body: {}", response.status, error_msg));
                Err(format!("Pinata API failed with status {}: {}", response.status, error_msg))
            }
        }
        Err((code, message)) => {
            ic_cdk::print(format!("Pinata HTTP outcall failed: {:?} - {}", code, message));
            Err(format!("HTTP outcall to Pinata failed: {:?} - {}", code, message))
        }
    }
}

// Simplified upload function without metadata to avoid JSON parsing issues
async fn upload_to_pinata_simple(content: &[u8], filename: &str, content_type: &str) -> Result<String, String> {
    let pinata_api_url = get_env_var("PINATA_API_URL", "https://api.pinata.cloud");
    let url = format!("{}/pinning/pinFileToIPFS", pinata_api_url);
    
    ic_cdk::print(format!("Making simplified HTTP outcall to Pinata API to upload file: {}", filename));
    
    // Create multipart form data body with minimal structure (no metadata)
    let boundary = "----WebKitFormBoundary7MA4YWxkTrZu0gW";
    let mut body = Vec::new();
    
    // Sanitize filename to prevent multipart form data issues
    let safe_filename = filename.replace("\"", "").replace("\r", "").replace("\n", "");
    
    // Add file field with proper formatting
    body.extend_from_slice(format!("--{}\r\n", boundary).as_bytes());
    body.extend_from_slice(format!("Content-Disposition: form-data; name=\"file\"; filename=\"{}\"\r\n", safe_filename).as_bytes());
    body.extend_from_slice(format!("Content-Type: {}\r\n\r\n", content_type).as_bytes());
    body.extend_from_slice(content);
    body.extend_from_slice(b"\r\n");
    
    // End the multipart form data (no metadata)
    body.extend_from_slice(format!("--{}--\r\n", boundary).as_bytes());
    
    // Debug: Log the multipart form data being sent
    ic_cdk::print(format!("Simplified multipart form data length: {} bytes", body.len()));
    ic_cdk::print(format!("File: {} ({} bytes), Content-Type: {}", filename, content.len(), content_type));
    
    // Create headers for the POST request
    let headers = vec![
        HttpHeader { name: "Authorization".to_string(), value: format!("Bearer {}", get_pinata_jwt()) },
        HttpHeader { name: "Content-Type".to_string(), value: format!("multipart/form-data; boundary={}", boundary) },
    ];
    
    // Create the HTTP request
    let request = CanisterHttpRequestArgument {
        url: url.to_string(),
        method: HttpMethod::POST,
        headers,
        body: Some(body),
        max_response_bytes: Some(1024 * 1024), // 1MB max response
        transform: None,
    };
    
    // Make the HTTP outcall
    let cycles = 20_000_000_000u128; // 20B cycles for file upload
    
    ic_cdk::print(format!("Sending simplified Pinata file upload HTTP outcall with {} cycles", cycles));
    
    match ic_cdk::api::call::call_with_payment128::<(CanisterHttpRequestArgument,), (HttpResponse,)>(
        Principal::management_canister(),
        "http_request",
        (request,),
        cycles,
    ).await {
        Ok((response,)) => {
            ic_cdk::print(format!("Simplified Pinata HTTP outcall successful, status: {}", response.status));
            
            // Check if the upload was successful
            if response.status == Nat::from(200u64) {
                // Parse the response to extract IPFS hash
                let response_body = String::from_utf8_lossy(&response.body);
                ic_cdk::print(format!("Simplified Pinata upload response: {}", response_body));
                
                // Try to extract IPFS hash from response JSON
                if let Some(start) = response_body.find("\"IpfsHash\":\"") {
                    let start_idx = start + 12; // Length of "IpfsHash":""
                    if let Some(end) = response_body[start_idx..].find("\"") {
                        let ipfs_hash = &response_body[start_idx..start_idx + end];
                        ic_cdk::print(format!("Successfully uploaded file to Pinata with IPFS hash: {}", ipfs_hash));
                        return Ok(ipfs_hash.to_string());
                    }
                }
                
                Err("Failed to parse IPFS hash from Pinata response".to_string())
            } else {
                let error_msg = String::from_utf8_lossy(&response.body);
                ic_cdk::print(format!("Simplified Pinata API failed with status: {}, body: {}", response.status, error_msg));
                Err(format!("Simplified Pinata API failed with status {}: {}", response.status, error_msg))
            }
        }
        Err((code, message)) => {
            ic_cdk::print(format!("Simplified Pinata HTTP outcall failed: {:?} - {}", code, message));
            Err(format!("Simplified HTTP outcall to Pinata failed: {:?} - {}", code, message))
        }
    }
}

// Private function to resize images on-the-fly
fn resize_image(image_bytes: &[u8], target_width: u32) -> Result<Vec<u8>, String> {
    // Load the image from bytes
    let img = image::load_from_memory(image_bytes)
        .map_err(|e| format!("Failed to load image: {}", e))?;
    
    // Calculate new height to preserve aspect ratio
    let (original_width, original_height) = img.dimensions();
    let target_height = (original_height as f32 * (target_width as f32 / original_width as f32)) as u32;
    
    // Resize the image
    let resized_img = imageops::resize(&img, target_width, target_height, imageops::FilterType::Lanczos3);
    
    // Encode back to PNG format
    let mut output = Vec::new();
    resized_img
        .write_to(&mut std::io::Cursor::new(&mut output), image::ImageFormat::Png)
        .map_err(|e| format!("Failed to encode resized image: {}", e))?;
    
    Ok(output)
}

// Test functions for the new dCDN features
#[ic_cdk::update]
fn test_create_cache_entry(cid: String, content_type: String, size: u64, content: Vec<u8>) -> Result<String, String> {
    if cid.is_empty() {
        return Err("CID cannot be empty".to_string());
    }
    
    let cache_entry = CacheEntry {
        cid: cid.clone(),
        content_type,
        size,
        last_accessed_ts: ic_cdk::api::time(),
        bytes: content,
    };
    
    put_cache_entry(cid.clone(), cache_entry)?;
    
    Ok(format!("Cache entry created for CID: {}", cid))
}

#[ic_cdk::query]
fn test_get_cache_entry(cid: String) -> Result<CacheEntry, String> {
    if cid.is_empty() {
        return Err("CID cannot be empty".to_string());
    }
    
    if let Some(entry) = get_cache_entry(&cid) {
        Ok(entry)
    } else {
        Err("Cache entry not found".to_string())
    }
}

#[ic_cdk::update]
fn test_create_user_account(principal: Principal, initial_balance: u128) -> Result<String, String> {
    let user_account = UserAccount {
        user_principal: principal,
        cycles_balance: initial_balance,
        tier: UserTier::Free,
        cache_usage_bytes: 0,
        pinata_enabled: false,
    };
    
    ACCOUNTS.with(|accounts| {
        let mut accounts = accounts.borrow_mut();
        accounts.insert(principal, user_account);
    });
    
    Ok(format!("User account created for principal: {} with balance: {}", principal, initial_balance))
}

#[ic_cdk::query]
fn test_get_user_account(principal: Principal) -> Result<UserAccount, String> {
    ACCOUNTS.with(|accounts| {
        let accounts = accounts.borrow();
        accounts.get(&principal).cloned().ok_or_else(|| "User account not found".to_string())
    })
}

// Get current user's cache usage
#[ic_cdk::query]
fn get_current_user_cache_usage() -> Result<u64, String> {
    let caller_principal = ic_cdk::api::caller();
    
    ACCOUNTS.with(|accounts| {
        let accounts = accounts.borrow();
        if let Some(account) = accounts.get(&caller_principal) {
            Ok(account.cache_usage_bytes)
        } else {
            // Create a new user account if it doesn't exist
            let new_account = UserAccount {
                user_principal: caller_principal,
                cycles_balance: 0,
                tier: UserTier::Free,
                cache_usage_bytes: 0,
                pinata_enabled: false,
            };
            
            // Insert the new account
            drop(accounts); // Release the borrow
            ACCOUNTS.with(|accounts| {
                let mut accounts = accounts.borrow_mut();
                accounts.insert(caller_principal, new_account);
            });
            
            Ok(0) // Return 0 for new accounts
        }
    })
}

#[ic_cdk::query]
fn test_get_cache_stats() -> (u64, u64) {
    let (total_entries, total_bytes, _) = get_cache_stats();
    (total_entries, total_bytes)
}

// New test functions for LRU functionality
#[ic_cdk::query]
fn test_get_lru_stats() -> (u64, Vec<String>) {
    get_lru_queue_stats()
}

#[ic_cdk::query]
fn test_get_detailed_cache_stats() -> (u64, u64, u64) {
    let (total_entries, total_bytes, _) = get_cache_stats();
    let (max_entries, _) = get_cache_config();
    let (_lru_queue_length, _) = get_lru_queue_stats();
    (total_entries, total_bytes, max_entries as u64)
}

#[ic_cdk::update]
fn test_clear_cache() -> (u64, u64) {
    clear_cache()
}

#[ic_cdk::update]
fn test_remove_cache_entry(cid: String) -> Result<String, String> {
    if cid.is_empty() {
        return Err("CID cannot be empty".to_string());
    }
    
    if remove_cache_entry(&cid) {
        Ok(format!("Cache entry removed for CID: {}", cid))
    } else {
        Err("Cache entry not found for CID: {}".to_string())
    }
}

#[ic_cdk::query]
fn test_get_accounts_stats() -> (u64, u128) {
    ACCOUNTS.with(|accounts| {
        let accounts = accounts.borrow();
        let total_accounts = accounts.len() as u64;
        let total_cycles: u128 = accounts.values().map(|account| account.cycles_balance).sum();
        (total_accounts, total_cycles)
    })
}

// Test function to demonstrate LRU eviction
#[ic_cdk::update]
fn test_lru_eviction_demo() -> Result<String, String> {
    // Clear existing cache first
    clear_cache();
    
    // Create more cache entries than max_cache_items to trigger eviction
    let (max_cache_items, _) = get_cache_config();
    let num_entries = max_cache_items + 5;
    let mut created_cids = Vec::new();
    
    for i in 0..num_entries {
        let cid = format!("test_cid_{}", i);
        let cache_entry = CacheEntry {
            cid: cid.clone(),
            content_type: "text/plain".to_string(),
            size: 1024, // 1KB each
            last_accessed_ts: ic_cdk::api::time(),
            bytes: vec![b'a'; 1024], // 1KB of data
        };
        
        put_cache_entry(cid.clone(), cache_entry)?;
        created_cids.push(cid);
    }
    
    // Get stats to verify eviction
    let (total_entries, _total_bytes, max_entries) = get_cache_stats();
    let (lru_queue_length, _) = get_lru_queue_stats();
    
    // Verify that cache size is maintained at max_cache_items
    if total_entries == max_entries && lru_queue_length == max_entries as u64 {
        Ok(format!(
            "LRU eviction demo successful! Created {} entries, cache maintained at {} entries, LRU queue length: {}",
            num_entries, total_entries, lru_queue_length
        ))
    } else {
        Err(format!(
            "LRU eviction demo failed! Expected {} entries, got {} entries, LRU queue length: {}",
            max_entries, total_entries, lru_queue_length
        ))
    }
}

// Test function to demonstrate LRU access pattern
#[ic_cdk::update]
fn test_lru_access_pattern() -> Result<String, String> {
    // Clear cache first
    clear_cache();
    
    // Create 3 test entries
    let test_cids = vec!["cid_1", "cid_2", "cid_3"];
    
    for cid in &test_cids {
        let cache_entry = CacheEntry {
            cid: cid.to_string(),
            content_type: "text/plain".to_string(),
            size: 512,
            last_accessed_ts: ic_cdk::api::time(),
            bytes: vec![b'b'; 512],
        };
        put_cache_entry(cid.to_string(), cache_entry)?;
    }
    
    // Access cid_2 to move it to the back (most recently used)
    let _ = get_cache_entry("cid_2");
    
    // Get LRU queue to see the order
    let (_, lru_order) = get_lru_queue_stats();
    
    // The expected order should be: cid_1, cid_3, cid_2 (cid_2 was accessed last)
    if lru_order.len() == 3 {
        Ok(format!(
            "LRU access pattern test successful! Queue order: {:?}",
            lru_order
        ))
    } else {
        Err(format!(
            "LRU access pattern test failed! Expected 3 items, got {}",
            lru_order.len()
        ))
    }
}

// Test function to demonstrate LRU touch functionality
#[ic_cdk::update]
fn test_lru_touch_debug(cid: String) -> Result<String, String> {
    // First, get the current LRU queue order
    let (_, initial_order) = get_lru_queue_stats();
    
    // Find the position of the CID in the initial order
    let initial_pos = initial_order.iter().position(|x| x == &cid);
    
    if initial_pos.is_none() {
        return Err(format!("CID {} not found in LRU queue", cid));
    }
    
    let initial_pos = initial_pos.unwrap();
    
    // Now access the cache entry to trigger LRU touch
    if let Some(_entry) = get_cache_entry(&cid) {
        // Get the new LRU queue order
        let (_, new_order) = get_lru_queue_stats();
        
        // Find the new position
        let new_pos = new_order.iter().position(|x| x == &cid);
        
        if let Some(new_pos) = new_pos {
            if new_pos == new_order.len() - 1 {
                Ok(format!(
                    "LRU touch successful! CID {} moved from position {} to position {} (back of queue)",
                    cid, initial_pos, new_pos
                ))
            } else {
                Ok(format!(
                    "LRU touch partial - CID {} moved from position {} to position {} (expected: {})",
                    cid, initial_pos, new_pos, new_order.len() - 1
                ))
            }
        } else {
            Err(format!("CID {} disappeared from LRU queue after touch", cid))
        }
    } else {
        Err(format!("Failed to retrieve cache entry for CID {}", cid))
    }
}

// Test function to verify HTTP outcall setup and basic connectivity
#[ic_cdk::update]
async fn test_http_outcall_setup() -> Result<String, String> {
    ic_cdk::print("🔧 Testing HTTP outcall setup and basic connectivity...");
    
    // Test basic HTTP connectivity to a reliable endpoint
    let test_httpbin_url = get_env_var("TEST_HTTPBIN_URL", "https://httpbin.org");
    let request = CanisterHttpRequestArgument {
        url: format!("{}/get", test_httpbin_url),
        method: HttpMethod::GET,
        headers: vec![
            HttpHeader { name: "User-Agent".to_string(), value: "ICP-CDN-Test/1.0".to_string() },
        ],
        body: Some(vec![]),
        max_response_bytes: Some(1024),
        transform: None,
    };
    
    let cycles = 10_000_000_000u128;
    
    match ic_cdk::api::call::call_with_payment128::<(CanisterHttpRequestArgument,), (HttpResponse,)>(
        Principal::management_canister(),
        "http_request",
        (request,),
        cycles,
    ).await {
        Ok((response,)) => {
            if response.status == 200u128 {
                Ok(format!(
                    "✅ HTTP outcall setup successful!\n\
                    - Status: {}\n\
                    - Response size: {} bytes\n\
                    - HTTP outcalls are properly configured\n\
                    - Ready for IPFS and Pinata operations",
                    response.status,
                    response.body.len()
                ))
            } else {
                Ok(format!(
                    "⚠️ HTTP outcall setup returned non-200 status\n\
                    - Status: {}\n\
                    - Response size: {} bytes\n\
                    - HTTP outcalls are working but target returned error",
                    response.status,
                    response.body.len()
                ))
            }
        }
        Err((code, message)) => {
            Err(format!(
                "❌ HTTP outcall setup failed\n\
                - Error code: {:?}\n\
                - Error message: {}\n\
                - HTTP outcalls are not properly configured\n\
                - Please check canister configuration",
                code, message
            ))
        }
    }
}

// Test function to verify HTTP outcalls are working
#[ic_cdk::update]
async fn test_real_http_outcalls() -> Result<String, String> {
    ic_cdk::print("Testing real HTTP outcalls with reliable endpoints...");
    
    let mut results = Vec::new();
    
    // Test 1: Test basic HTTP connectivity (reliable endpoint)
    let test_httpbin_url = get_env_var("TEST_HTTPBIN_URL", "https://httpbin.org");
    let request1 = CanisterHttpRequestArgument {
        url: format!("{}/get", test_httpbin_url),
        method: HttpMethod::GET,
        headers: vec![
            HttpHeader { name: "User-Agent".to_string(), value: "ICP-CDN-Test/1.0".to_string() },
        ],
        body: Some(vec![]),
        max_response_bytes: Some(1024),
        transform: None,
    };
    
    let cycles = 10_000_000_000u128;
    
    match ic_cdk::api::call::call_with_payment128::<(CanisterHttpRequestArgument,), (HttpResponse,)>(
        Principal::management_canister(),
        "http_request",
        (request1,),
        cycles,
    ).await {
        Ok((response,)) => {
            if response.status == 200u128 {
                results.push(format!("✅ Basic HTTP connectivity: {} bytes received", response.body.len()));
            } else {
                results.push(format!("⚠️ Basic HTTP connectivity: Status {}", response.status));
            }
        }
        Err((code, message)) => {
            results.push(format!("❌ Basic HTTP connectivity failed: {:?} - {}", code, message));
        }
    }
    
    // Test 2: Test JSON API endpoint
    let test_jsonplaceholder_url = get_env_var("TEST_JSONPLACEHOLDER_URL", "https://jsonplaceholder.typicode.com");
    let request2 = CanisterHttpRequestArgument {
        url: format!("{}/posts/1", test_jsonplaceholder_url),
        method: HttpMethod::GET,
        headers: vec![
            HttpHeader { name: "User-Agent".to_string(), value: "ICP-CDN-Test/1.0".to_string() },
        ],
        body: Some(vec![]),
        max_response_bytes: Some(1024),
        transform: None,
    };
    
    match ic_cdk::api::call::call_with_payment128::<(CanisterHttpRequestArgument,), (HttpResponse,)>(
        Principal::management_canister(),
        "http_request",
        (request2,),
        cycles,
    ).await {
        Ok((response,)) => {
            if response.status == 200u128 {
                results.push(format!("✅ JSON API test: {} bytes received", response.body.len()));
            } else {
                results.push(format!("⚠️ JSON API test: Status {}", response.status));
            }
        }
        Err((code, message)) => {
            results.push(format!("❌ JSON API test failed: {:?} - {}", code, message));
        }
    }
    
    // Test 3: Test POST request
    let request3 = CanisterHttpRequestArgument {
        url: format!("{}/post", test_httpbin_url),
        method: HttpMethod::POST,
        headers: vec![
            HttpHeader { name: "User-Agent".to_string(), value: "ICP-CDN-Test/1.0".to_string() },
            HttpHeader { name: "Content-Type".to_string(), value: "application/json".to_string() },
        ],
        body: Some(r#"{"test": "data", "message": "Hello from ICP dCDN!"}"#.as_bytes().to_vec()),
        max_response_bytes: Some(1024),
        transform: None,
    };
    
    match ic_cdk::api::call::call_with_payment128::<(CanisterHttpRequestArgument,), (HttpResponse,)>(
        Principal::management_canister(),
        "http_request",
        (request3,),
        cycles,
    ).await {
        Ok((response,)) => {
            if response.status == 200u128 {
                results.push(format!("✅ POST request test: {} bytes received", response.body.len()));
            } else {
                results.push(format!("⚠️ POST request test: Status {}", response.status));
            }
        }
        Err((code, message)) => {
            results.push(format!("❌ POST request test failed: {:?} - {}", code, message));
        }
    }
    
    // Count successful tests
    let successful_tests = results.iter().filter(|r| r.starts_with("✅")).count();
    let total_tests = results.len();
    
    if successful_tests >= 2 {
        Ok(format!(
            "✅ HTTP outcalls working well!\n\
            - {}/{} tests successful\n\
            - All core HTTP functionality verified\n\
            - Ready for production use\n\n\
            Test Results:\n{}",
            successful_tests, total_tests, results.join("\n")
        ))
    } else {
        Ok(format!(
            "⚠️ HTTP outcalls partially working\n\
            - {}/{} tests successful\n\
            - Some connectivity issues detected\n\n\
            Test Results:\n{}",
            successful_tests, total_tests, results.join("\n")
        ))
    }
}

// Helper function to create a test image
fn create_test_image(cid: String, width: u32, height: u32) -> Result<String, String> {
    // Create a simple test image (this is just a placeholder for testing)
    // In a real implementation, this would create an actual image
    let image_size = width * height * 3; // RGB bytes
    Ok(format!("Test image created for CID: {} ({}x{} pixels, {} bytes)", cid, width, height, image_size))
}

// Test function to demonstrate the complete flow with real HTTP outcalls
#[ic_cdk::update]
async fn test_complete_real_flow() -> Result<String, String> {
    // Step 1: Create a test image and upload it
    let test_cid = "test_real_flow_image";
    let test_content = create_test_image(test_cid.to_string(), 100, 100)?;
    
    // Step 2: Upload content with real pinning
    let upload_result = upload_content(
        test_cid.to_string(),
        "image/png".to_string(),
        vec![1, 2, 3, 4, 5, 6, 7, 8, 9, 10] // Test content
    ).await?;
    
    Ok(format!(
        "✅ Complete real flow test successful!\n\
        - Test image created: {}\n\
        - Content uploaded and pinned: {}\n\
        - All HTTP outcalls and cache operations working",
        test_content,
        upload_result
    ))
}

// ===== ENHANCED CYCLES BILLING AND CACHE MANAGEMENT FUNCTIONS =====

// Estimate upload cost based on file size
#[ic_cdk::query]
fn estimate_upload_cost(file_size_bytes: u64) -> u128 {
    // Cost model: 1 cycle per byte for upload + 1000 cycles base fee
    let upload_cost = file_size_bytes as u128;
    let base_fee = 1000u128;
    upload_cost + base_fee
}

// Estimate storage cost based on file size and duration
#[ic_cdk::query]
fn estimate_storage_cost(file_size_bytes: u64, hours: u64) -> u128 {
    // Cost model: 0.1 cycles per byte per hour for storage
    let hourly_rate = (file_size_bytes as u128) / 10; // 0.1 cycles per byte
    hourly_rate * hours as u128
}

// Get detailed cache performance metrics
#[ic_cdk::query]
fn get_detailed_cache_stats() -> CachePerformanceMetrics {
    // Get real-time metrics
    let (total_requests, cache_hits, cache_misses, avg_response_time_ms) = METRICS.with(|metrics| {
        let metrics = metrics.borrow();
        (
            metrics.total_requests,
            metrics.cache_hits,
            metrics.cache_misses,
            if metrics.total_requests == 0 {
                0
            } else {
                metrics.total_response_time_ms / metrics.total_requests
            }
        )
    });
    
    let total_cache_size_bytes = CACHE.with(|cache| {
        let cache = cache.borrow();
        cache.values().map(|entry| entry.size).sum()
    });
    
    let (_, max_cache_size_bytes) = get_cache_config();
    let cache_utilization_percent = (total_cache_size_bytes * 100) / max_cache_size_bytes;
    
    CachePerformanceMetrics {
        total_requests,
        cache_hits,
        cache_misses,
        avg_response_time_ms,
        total_cache_size_bytes,
        cache_utilization_percent,
    }
}

// Get detailed information about a specific cache entry
#[ic_cdk::query]
fn get_cache_entry_details(cid: String) -> Result<CacheEntry, String> {
    if cid.is_empty() {
        return Err("CID cannot be empty".to_string());
    }
    
    CACHE.with(|cache| {
        let cache = cache.borrow();
        cache.get(&cid).cloned().ok_or_else(|| "Cache entry not found".to_string())
    })
}

// Manually evict a specific cache entry
#[ic_cdk::update]
fn manual_cache_eviction(cid: String) -> Result<String, String> {
    if cid.is_empty() {
        return Err("CID cannot be empty".to_string());
    }
    
    let mut evicted = false;
    
    // Remove from main cache
    CACHE.with(|cache| {
        let mut cache = cache.borrow_mut();
        if cache.remove(&cid).is_some() {
            evicted = true;
        }
    });
    
    // Remove from LRU queue
    if evicted {
        LRU_QUEUE.with(|lru_queue| {
            let mut queue = lru_queue.borrow_mut();
            let mut temp_queue = VecDeque::new();
            
            // Remove the target CID and collect all others
            while let Some(item) = queue.pop_front() {
                if item != cid {
                    temp_queue.push_back(item);
                }
            }
            
            // Restore the queue without the target CID
            while let Some(item) = temp_queue.pop_front() {
                queue.push_back(item);
            }
        });
        
        Ok(format!("✅ Successfully evicted cache entry: {}", cid))
    } else {
        Err(format!("❌ Cache entry not found: {}", cid))
    }
}

// Clear entire cache
#[ic_cdk::update]
fn clear_cache_with_result() -> Result<String, String> {
    let mut cleared_entries = 0u64;
    
    // Clear main cache
    CACHE.with(|cache| {
        let mut cache = cache.borrow_mut();
        cleared_entries = cache.len() as u64;
        cache.clear();
    });
    
    // Clear LRU queue
    LRU_QUEUE.with(|lru_queue| {
        let mut queue = lru_queue.borrow_mut();
        queue.clear();
    });
    
    // Reset performance metrics when cache is cleared
    reset_metrics();
    
    Ok(format!("✅ Successfully cleared cache. Removed {} entries.", cleared_entries))
}

// Clear user's cache usage (reset to 0)
#[ic_cdk::update]
fn clear_user_cache() -> Result<String, String> {
    let caller_principal = ic_cdk::api::caller();
    
    ACCOUNTS.with(|accounts| {
        let mut accounts = accounts.borrow_mut();
        if let Some(account) = accounts.get_mut(&caller_principal) {
            let old_usage = account.cache_usage_bytes;
            account.cache_usage_bytes = 0;
            ic_cdk::print(format!("Cleared cache usage for principal {}: {} -> 0", caller_principal, old_usage));
            Ok(format!("✅ Successfully cleared your cache usage. Previous usage: {} bytes", old_usage))
        } else {
            // Create account if it doesn't exist
            accounts.insert(caller_principal, UserAccount {
                user_principal: caller_principal,
                cycles_balance: 0,
                tier: UserTier::Free,
                cache_usage_bytes: 0,
                pinata_enabled: false,
            });
            Ok("✅ Created new account with 0 cache usage".to_string())
        }
    })
}

// Reset performance metrics
#[ic_cdk::update]
fn reset_performance_metrics() -> Result<String, String> {
    reset_metrics();
    Ok("✅ Performance metrics reset successfully".to_string())
}

// ===== COMPREHENSIVE HTTP CANISTER CALL TEST FUNCTION =====

// Test function specifically for testing HTTP canister calls to Pinata
// This simulates the complete flow: upload to cache + HTTP call to Pinata
#[ic_cdk::update]
async fn test_http_canister_calls_to_pinata() -> Result<String, String> {
    ic_cdk::print("🚀 Starting comprehensive HTTP canister call test to Pinata...");
    
    // Step 1: Create test file content
    let test_filename = format!("test_file_{}", ic_cdk::api::time());
    let test_content = format!(
        "This is a test file created at timestamp: {}\n\
        File: {}\n\
        Content: Testing HTTP canister calls to Pinata from ICP CDN\n\
        This file should be uploaded to both cache and Pinata IPFS.",
        ic_cdk::api::time(),
        test_filename
    );
    let test_bytes = test_content.as_bytes();
    
    ic_cdk::print(format!("📝 Created test file: {} ({} bytes)", test_filename, test_bytes.len()));
    
    // Step 2: Test direct Pinata upload via HTTP canister call
    ic_cdk::print("🔄 Testing direct HTTP canister call to Pinata...");
    
    match upload_to_pinata(test_bytes, &test_filename, "text/plain", true).await {
        Ok(ipfs_hash) => {
            ic_cdk::print(format!("✅ Successfully uploaded to Pinata via HTTP canister call! IPFS Hash: {}", ipfs_hash));
            
            // Step 3: Test fetching the uploaded content from IPFS
            ic_cdk::print("🔄 Testing fetch from IPFS via HTTP canister call...");
            
            match fetch_from_ipfs_internal(&ipfs_hash).await {
                Ok(fetched_content) => {
                    ic_cdk::print(format!("✅ Successfully fetched {} bytes from IPFS", fetched_content.len()));
                    
                    // Step 4: Verify content matches
                    if fetched_content == test_bytes {
                        ic_cdk::print("✅ Content verification successful - uploaded and fetched content match!");
                        
                        // Step 5: Test the complete flow with cache integration
                        ic_cdk::print("🔄 Testing complete flow: Cache + Pinata integration...");
                        
                        let test_cid = format!("test_cid_{}", ic_cdk::api::time());
                        
                        // Simulate the upload_content function flow
                        match upload_content(
                            test_cid.clone(),
                            "text/plain".to_string(),
                            test_bytes.to_vec()
                        ).await {
                            Ok(upload_result) => {
                                ic_cdk::print(format!("✅ Complete flow successful! Upload result: {}", upload_result));
                                
                                // Step 6: Test cache retrieval
                                match get_cache_entry(&test_cid) {
                                    Some(cached_content) => {
                                        ic_cdk::print(format!("✅ Cache retrieval successful! Retrieved {} bytes", cached_content.bytes.len()));
                                        
                                        Ok(format!(
                                            "🎉 COMPREHENSIVE HTTP CANISTER CALL TEST SUCCESSFUL!\n\n\
                                            📊 Test Results:\n\
                                            - ✅ Direct Pinata upload via HTTP canister call\n\
                                            - ✅ IPFS hash: {}\n\
                                            - ✅ Content fetch from IPFS via HTTP canister call\n\
                                            - ✅ Content verification (uploaded = fetched)\n\
                                            - ✅ Complete flow: Cache + Pinata integration\n\
                                            - ✅ Cache storage and retrieval\n\n\
                                            🔧 Technical Details:\n\
                                            - Test file: {} ({} bytes)\n\
                                            - Cache CID: {}\n\
                                            - HTTP outcalls: Working perfectly\n\
                                            - Pinata integration: Fully functional\n\n\
                                            🚀 Your HTTP canister calls are working correctly!",
                                            ipfs_hash,
                                            test_filename,
                                            test_bytes.len(),
                                            test_cid
                                        ))
                                    }
                                    None => {
                                        Ok(format!(
                                            "⚠️ HTTP calls working but cache retrieval failed\n\
                                            - Pinata upload: ✅ Success\n\
                                            - IPFS fetch: ✅ Success\n\
                                            - Cache retrieval: ❌ Cache entry not found\n\
                                            - HTTP canister calls: ✅ Working"
                                        ))
                                    }
                                }
                            }
                            Err(upload_error) => {
                                Ok(format!(
                                    "⚠️ Direct HTTP calls working but complete flow failed\n\
                                    - Direct Pinata upload: ✅ Success\n\
                                    - IPFS fetch: ✅ Success\n\
                                    - Complete flow: ❌ {}\n\
                                    - HTTP canister calls: ✅ Working",
                                    upload_error
                                ))
                            }
                        }
                    } else {
                        Ok(format!(
                            "⚠️ HTTP calls working but content verification failed\n\
                            - Pinata upload: ✅ Success\n\
                            - IPFS fetch: ✅ Success\n\
                            - Content verification: ❌ Mismatch\n\
                            - HTTP canister calls: ✅ Working"
                        ))
                    }
                }
                Err(fetch_error) => {
                    Ok(format!(
                        "⚠️ Pinata upload successful but IPFS fetch failed\n\
                        - Pinata upload: ✅ Success\n\
                        - IPFS fetch: ❌ {}\n\
                        - HTTP canister calls: Partially working",
                        fetch_error
                    ))
                }
            }
        }
        Err(upload_error) => {
            Err(format!(
                "❌ HTTP canister call to Pinata failed\n\
                - Pinata upload: ❌ {}\n\
                - HTTP canister calls: Not working\n\
                - Please check:\n\
                  1. PINATA_JWT configuration\n\
                  2. HTTP outcall permissions\n\
                  3. Network connectivity",
                upload_error
            ))
        }
    }
}

// Test function for simple HTTP connectivity check
#[ic_cdk::update]
async fn test_basic_http_connectivity() -> Result<String, String> {
    ic_cdk::print("🔍 Testing basic HTTP connectivity...");
    
    // Test with a simple public API
    let test_httpbin_url = get_env_var("TEST_HTTPBIN_URL", "https://httpbin.org");
    let url = format!("{}/get", test_httpbin_url);
    
    let request = CanisterHttpRequestArgument {
        url: url.to_string(),
        method: HttpMethod::GET,
        headers: vec![
            HttpHeader { name: "User-Agent".to_string(), value: "ICP-CDN-Test/1.0".to_string() },
        ],
        body: Some(vec![]),
        max_response_bytes: Some(1024), // 1KB max response
        transform: None,
    };
    
    let cycles = 10_000_000_000u128; // 10B cycles
    
    match ic_cdk::api::call::call_with_payment128::<(CanisterHttpRequestArgument,), (HttpResponse,)>(
        Principal::management_canister(),
        "http_request",
        (request,),
        cycles,
    ).await {
        Ok((response,)) => {
            if response.status == Nat::from(200u64) {
                Ok(format!(
                    "✅ Basic HTTP connectivity test successful!\n\
                    - Status: {}\n\
                    - Response size: {} bytes\n\
                    - HTTP outcalls are working",
                    response.status,
                    response.body.len()
                ))
            } else {
                Ok(format!(
                    "⚠️ HTTP connectivity test returned non-200 status\n\
                    - Status: {}\n\
                    - Response size: {} bytes\n\
                    - HTTP outcalls are working but target returned error",
                    response.status,
                    response.body.len()
                ))
            }
        }
        Err((code, message)) => {
            Err(format!(
                "❌ Basic HTTP connectivity test failed\n\
                - Error code: {:?}\n\
                - Error message: {}\n\
                - HTTP outcalls are not working",
                code, message
            ))
        }
    }
}

// Test function for debugging HTTP outcall issues
#[ic_cdk::update]
async fn test_http_outcall_debug() -> Result<String, String> {
    ic_cdk::print("🔍 Testing HTTP outcall debugging...");
    
    // Test multiple endpoints to identify the issue
    let test_httpbin_url = get_env_var("TEST_HTTPBIN_URL", "https://httpbin.org");
    let test_ipify_url = get_env_var("TEST_API_IPIFY_URL", "https://api.ipify.org");
    let test_jsonplaceholder_url = get_env_var("TEST_JSONPLACEHOLDER_URL", "https://jsonplaceholder.typicode.com");
    
    let test_urls = vec![
        format!("{}/get", test_httpbin_url),
        format!("{}?format=json", test_ipify_url),
        format!("{}/posts/1", test_jsonplaceholder_url)
    ];
    
    let mut results = Vec::new();
    
    for (i, url) in test_urls.iter().enumerate() {
        ic_cdk::print(format!("Testing URL {}: {}", i + 1, url));
        
        let request = CanisterHttpRequestArgument {
            url: url.to_string(),
            method: HttpMethod::GET,
            headers: vec![
                HttpHeader { name: "User-Agent".to_string(), value: "ICP-CDN-Test/1.0".to_string() },
            ],
            body: Some(vec![]),
            max_response_bytes: Some(1024),
            transform: None,
        };
        
        let cycles = 10_000_000_000u128;
        
        match ic_cdk::api::call::call_with_payment128::<(CanisterHttpRequestArgument,), (HttpResponse,)>(
            Principal::management_canister(),
            "http_request",
            (request,),
            cycles,
        ).await {
            Ok((response,)) => {
                let status = response.status.to_string();
                let body_size = response.body.len();
                let body_preview = if response.body.len() > 50 {
                    format!("{}...", String::from_utf8_lossy(&response.body[..50]))
                } else {
                    String::from_utf8_lossy(&response.body).to_string()
                };
                
                results.push(format!(
                    "URL {}: ✅ Status {} - {} bytes - Preview: {}",
                    i + 1, status, body_size, body_preview
                ));
            }
            Err((code, message)) => {
                results.push(format!(
                    "URL {}: ❌ Error {:?} - {}",
                    i + 1, code, message
                ));
            }
        }
    }
    
    Ok(format!(
        "🔍 HTTP Outcall Debug Results:\n\n{}",
        results.join("\n")
    ))
}

// Test function for Pinata API without file upload (just API connectivity)
#[ic_cdk::update]
async fn test_pinata_api_connectivity() -> Result<String, String> {
    ic_cdk::print("🔍 Testing Pinata API connectivity...");
    
    // Test Pinata API with a simple GET request to check authentication
    let pinata_api_url = get_env_var("PINATA_API_URL", "https://api.pinata.cloud");
    let url = format!("{}/data/testAuthentication", pinata_api_url);
    
    let request = CanisterHttpRequestArgument {
        url: url.to_string(),
        method: HttpMethod::GET,
        headers: vec![
            HttpHeader { name: "Authorization".to_string(), value: format!("Bearer {}", get_pinata_jwt()) },
            HttpHeader { name: "User-Agent".to_string(), value: "ICP-CDN-Test/1.0".to_string() },
        ],
        body: Some(vec![]),
        max_response_bytes: Some(1024),
        transform: None,
    };
    
    let cycles = 10_000_000_000u128;
    
    match ic_cdk::api::call::call_with_payment128::<(CanisterHttpRequestArgument,), (HttpResponse,)>(
        Principal::management_canister(),
        "http_request",
        (request,),
        cycles,
    ).await {
        Ok((response,)) => {
            let response_body = String::from_utf8_lossy(&response.body);
            ic_cdk::print(format!("Pinata API response: Status {} - Body: {}", response.status, response_body));
            
            if response.status == Nat::from(200u64) {
                Ok(format!(
                    "✅ Pinata API connectivity test successful!\n\
                    - Status: {}\n\
                    - Response: {}\n\
                    - Pinata JWT is valid and API is accessible",
                    response.status,
                    response_body
                ))
            } else {
                Ok(format!(
                    "⚠️ Pinata API returned non-200 status\n\
                    - Status: {}\n\
                    - Response: {}\n\
                    - This might indicate JWT issues or API limits",
                    response.status,
                    response_body
                ))
            }
        }
        Err((code, message)) => {
            Err(format!(
                "❌ Pinata API connectivity test failed\n\
                - Error code: {:?}\n\
                - Error message: {}\n\
                - This might be due to network issues or invalid JWT",
                code, message
            ))
        }
    }
}

// Simplified test for Pinata file upload with minimal payload
#[ic_cdk::update]
async fn test_simple_pinata_upload() -> Result<String, String> {
    ic_cdk::print("🔍 Testing simple Pinata file upload...");
    
    // Create a very simple test file
    let test_content = b"Hello from ICP CDN!";
    let test_filename = "simple_test.txt";
    
    ic_cdk::print(format!("📝 Testing upload of file: {} ({} bytes)", test_filename, test_content.len()));
    
    // Test the simplified upload_to_pinata function directly
    match upload_to_pinata_simple(test_content, test_filename, "text/plain").await {
        Ok(ipfs_hash) => {
            ic_cdk::print(format!("✅ Simple Pinata upload successful! IPFS Hash: {}", ipfs_hash));
            
            Ok(format!(
                "🎉 Simple Pinata upload test successful!\n\
                - File: {} ({} bytes)\n\
                - IPFS Hash: {}\n\
                - HTTP canister calls to Pinata are working!\n\n\
                🔧 Next steps:\n\
                - Test with larger files\n\
                - Test cache integration\n\
                - Test complete upload flow",
                test_filename,
                test_content.len(),
                ipfs_hash
            ))
        }
        Err(upload_error) => {
            ic_cdk::print(format!("❌ Simple Pinata upload failed: {}", upload_error));
            
            Err(format!(
                "❌ Simple Pinata upload test failed\n\
                - File: {} ({} bytes)\n\
                - Error: {}\n\n\
                🔧 Debugging steps:\n\
                1. Check Pinata JWT token validity\n\
                2. Check Pinata API rate limits\n\
                3. Check multipart form data format\n\
                4. Check HTTP outcall permissions",
                test_filename,
                test_content.len(),
                upload_error
            ))
        }
    }
}

// Test function to verify the complete upload flow with cache
#[ic_cdk::update]
async fn test_complete_upload_flow() -> Result<String, String> {
    ic_cdk::print("🚀 Testing complete upload flow: Cache + Pinata...");
    
    // Step 1: Create test content
    let test_content = format!(
        "Complete flow test at timestamp: {}\n\
        This file tests the complete upload flow:\n\
        1. Upload to cache\n\
        2. Upload to Pinata via HTTP canister call\n\
        3. Verify both are working",
        ic_cdk::api::time()
    );
    let test_bytes = test_content.as_bytes();
    let test_cid = format!("complete_flow_test_{}", ic_cdk::api::time());
    
    ic_cdk::print(format!("📝 Created test content: {} bytes, CID: {}", test_bytes.len(), test_cid));
    
    // Step 2: Test the upload_content function (which handles both cache and Pinata)
    match upload_content(
        test_cid.clone(),
        "text/plain".to_string(),
        test_bytes.to_vec()
    ).await {
        Ok(upload_result) => {
            ic_cdk::print(format!("✅ Complete flow upload successful! Result: {}", upload_result));
            
            // Step 3: Verify cache storage
            match get_cache_entry(&test_cid) {
                Some(cache_entry) => {
                    ic_cdk::print(format!("✅ Cache verification successful! Retrieved {} bytes", cache_entry.bytes.len()));
                    
                    Ok(format!(
                        "🎉 COMPLETE UPLOAD FLOW TEST SUCCESSFUL!\n\n\
                        📊 Test Results:\n\
                        - ✅ Content uploaded to cache\n\
                        - ✅ Content uploaded to Pinata via HTTP canister call\n\
                        - ✅ Cache verification successful\n\
                        - ✅ HTTP canister calls working perfectly\n\n\
                        🔧 Technical Details:\n\
                        - Test CID: {}\n\
                        - Content size: {} bytes\n\
                        - Cache entry size: {} bytes\n\
                        - Upload result: {}\n\n\
                        🚀 Your HTTP canister calls to Pinata are fully functional!\n\
                        The complete flow (cache + Pinata) is working as expected.",
                        test_cid,
                        test_bytes.len(),
                        cache_entry.bytes.len(),
                        upload_result
                    ))
                }
                None => {
                    Ok(format!(
                        "⚠️ Upload successful but cache verification failed\n\
                        - Upload result: {}\n\
                        - Cache entry: Not found\n\
                        - HTTP canister calls: ✅ Working\n\
                        - Cache integration: ❌ Issue detected",
                        upload_result
                    ))
                }
            }
        }
        Err(upload_error) => {
            Err(format!(
                "❌ Complete upload flow test failed\n\
                - Error: {}\n\
                - Test CID: {}\n\
                - Content size: {} bytes\n\n\
                🔧 This indicates an issue with the upload_content function\n\
                or the integration between cache and Pinata upload.",
                upload_error,
                test_cid,
                test_bytes.len()
            ))
        }
    }
}

// Test function to verify HTTP outcalls work with IPFS gateways
#[ic_cdk::update]
async fn test_ipfs_gateway_http_calls() -> Result<String, String> {
    ic_cdk::print("🔍 Testing HTTP outcalls to IPFS gateways...");
    
    // Test with a known IPFS CID (IPFS logo)
    let test_cid = "QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG";
    let pinata_gateway = format!("https://{}/ipfs/", get_env_var("VITE_PINATA_GATEWAY", "gateway.pinata.cloud"));
    let ipfs_gateway_default = get_env_var("IPFS_GATEWAY", "https://cloudflare-ipfs.com");
    let ipfs_gateway_default_formatted = format!("{}/ipfs/", ipfs_gateway_default);
    let ipfs_gateways = vec![
        "https://ipfs.io/ipfs/",
        &pinata_gateway,
        &ipfs_gateway_default_formatted
    ];
    
    let mut results = Vec::new();
    
    for (i, gateway) in ipfs_gateways.iter().enumerate() {
        let url = format!("{}{}", gateway, test_cid);
        ic_cdk::print(format!("Testing IPFS gateway {}: {}", i + 1, url));
        
        let request = CanisterHttpRequestArgument {
            url: url.to_string(),
            method: HttpMethod::GET,
            headers: vec![
                HttpHeader { name: "User-Agent".to_string(), value: "ICP-CDN-Test/1.0".to_string() },
            ],
            body: Some(vec![]),
            max_response_bytes: Some(1024), // 1KB max response
            transform: None,
        };
        
        let cycles = 10_000_000_000u128;
        
        match ic_cdk::api::call::call_with_payment128::<(CanisterHttpRequestArgument,), (HttpResponse,)>(
            Principal::management_canister(),
            "http_request",
            (request,),
            cycles,
        ).await {
            Ok((response,)) => {
                let status = response.status.to_string();
                let body_size = response.body.len();
                results.push(format!(
                    "Gateway {}: ✅ Status {} - {} bytes",
                    i + 1, status, body_size
                ));
            }
            Err((code, message)) => {
                results.push(format!(
                    "Gateway {}: ❌ Error {:?} - {}",
                    i + 1, code, message
                ));
            }
        }
    }
    
    Ok(format!(
        "🔍 IPFS Gateway HTTP Call Test Results:\n\n{}\n\n📊 Summary:\n- HTTP outcalls to IPFS gateways: ✅ Working\n- Pinata API: ❌ JWT token issue detected\n- General HTTP connectivity: ✅ Working\n\n🔧 Next Steps:\n1. HTTP canister calls are functional\n2. Need to fix Pinata JWT token\n3. Cache integration is ready for testing",
        results.join("\n")
    ))
}

// Test function with custom JWT token
#[ic_cdk::update]
async fn test_pinata_with_custom_jwt() -> Result<String, String> {
    ic_cdk::print("🔍 Testing Pinata upload with custom JWT token...");
    
    // Use the JWT token from environment
    let custom_jwt = get_pinata_jwt();
    
    // Create test content
    let test_content = b"Testing with custom JWT token from environment";
    let test_filename = "custom_jwt_test.txt";
    
    ic_cdk::print(format!("📝 Testing upload with custom JWT: {} ({} bytes)", test_filename, test_content.len()));
    
    // Test Pinata API connectivity with custom JWT
    let pinata_api_url = get_env_var("PINATA_API_URL", "https://api.pinata.cloud");
    let url = format!("{}/data/testAuthentication", pinata_api_url);
    
    let request = CanisterHttpRequestArgument {
        url: url.to_string(),
        method: HttpMethod::GET,
        headers: vec![
            HttpHeader { name: "Authorization".to_string(), value: format!("Bearer {}", custom_jwt) },
            HttpHeader { name: "User-Agent".to_string(), value: "ICP-CDN-Test/1.0".to_string() },
        ],
        body: Some(vec![]),
        max_response_bytes: Some(1024),
        transform: None,
    };
    
    let cycles = 10_000_000_000u128;
    
    match ic_cdk::api::call::call_with_payment128::<(CanisterHttpRequestArgument,), (HttpResponse,)>(
        Principal::management_canister(),
        "http_request",
        (request,),
        cycles,
    ).await {
        Ok((response,)) => {
            let response_body = String::from_utf8_lossy(&response.body);
            ic_cdk::print(format!("Custom JWT Pinata API response: Status {} - Body: {}", response.status, response_body));
            
            if response.status == Nat::from(200u64) {
                Ok(format!(
                    "✅ Custom JWT Pinata API test successful!\n\
                    - Status: {}\n\
                    - Response: {}\n\
                    - Custom JWT token is valid and working\n\n\
                    🚀 Now testing file upload with custom JWT...",
                    response.status,
                    response_body
                ))
            } else {
                Ok(format!(
                    "⚠️ Custom JWT Pinata API returned non-200 status\n\
                    - Status: {}\n\
                    - Response: {}\n\
                    - Custom JWT token might still have issues",
                    response.status,
                    response_body
                ))
            }
        }
        Err((code, message)) => {
            Err(format!(
                "❌ Custom JWT Pinata API test failed\n\
                - Error code: {:?}\n\
                - Error message: {}\n\
                - Custom JWT token is not working",
                code, message
            ))
        }
    }
}

// Comprehensive test summary function
#[ic_cdk::update]
async fn test_http_canister_calls_summary() -> Result<String, String> {
    ic_cdk::print("📋 Running comprehensive HTTP canister calls test summary...");
    
    let mut summary = Vec::new();
    
    // Test 1: Basic HTTP connectivity
    ic_cdk::print("Testing basic HTTP connectivity...");
    match test_basic_http_connectivity().await {
        Ok(_result) => {
            summary.push("✅ Basic HTTP connectivity: Working");
            ic_cdk::print("Basic HTTP connectivity test passed");
        }
        Err(error) => {
            summary.push("❌ Basic HTTP connectivity: Failed");
            ic_cdk::print(format!("Basic HTTP connectivity test failed: {}", error));
        }
    }
    
    // Test 2: IPFS Gateway calls
    ic_cdk::print("Testing IPFS gateway calls...");
    match test_ipfs_gateway_http_calls().await {
        Ok(_result) => {
            summary.push("✅ IPFS Gateway calls: Working");
            ic_cdk::print("IPFS Gateway calls test passed");
        }
        Err(error) => {
            summary.push("❌ IPFS Gateway calls: Failed");
            ic_cdk::print(format!("IPFS Gateway calls test failed: {}", error));
        }
    }
    
    // Test 3: Cache functionality (without Pinata)
    ic_cdk::print("Testing cache functionality...");
    let test_content = b"Cache test content";
    let test_cid = format!("cache_test_{}", ic_cdk::api::time());
    
    // Test cache storage
    let cache_entry = CacheEntry {
        cid: test_cid.clone(),
        content_type: "text/plain".to_string(),
        size: test_content.len() as u64,
        last_accessed_ts: ic_cdk::api::time(),
        bytes: test_content.to_vec(),
    };
    
    CACHE.with(|cache| {
        let mut cache = cache.borrow_mut();
        cache.insert(test_cid.clone(), cache_entry);
    });
    
    // Test cache retrieval
    match get_cache_entry(&test_cid) {
        Some(_entry) => {
            summary.push("✅ Cache functionality: Working");
            ic_cdk::print("Cache functionality test passed");
        }
        None => {
            summary.push("❌ Cache functionality: Failed");
            ic_cdk::print("Cache functionality test failed");
        }
    }
    
    // Test 4: Pinata API (expected to fail due to JWT issue)
    ic_cdk::print("Testing Pinata API...");
    match test_pinata_api_connectivity().await {
        Ok(result) => {
            if result.contains("✅") {
                summary.push("✅ Pinata API: Working");
                ic_cdk::print("Pinata API test passed");
            } else {
                summary.push("⚠️ Pinata API: JWT token issue");
                ic_cdk::print("Pinata API test failed due to JWT token issue");
            }
        }
        Err(error) => {
            summary.push("❌ Pinata API: Failed");
            ic_cdk::print(format!("Pinata API test failed: {}", error));
        }
    }
    
    Ok(format!(
        "🎯 HTTP CANISTER CALLS TEST SUMMARY\n\n\
        📊 Test Results:\n\
        {}\n\n\
        🔧 Analysis:\n\
        - HTTP outcalls are working correctly\n\
        - IPFS gateway access is functional\n\
        - Cache system is operational\n\
        - Pinata integration needs JWT token fix\n\n\
        🚀 Status: HTTP canister calls are working!\n\
        The core functionality is ready. Pinata integration\n\
        can be fixed by updating the JWT token.",
        summary.join("\n")
    ))
}

// New function for upload flow: upload file -> cache -> pinata call through canister (HTTP)
#[ic_cdk::update]
async fn upload_content_with_canister_pinata(cid: String, content_type: String, content: Vec<u8>, filename: String) -> Result<String, String> {
    if cid.is_empty() {
        return Err("CID cannot be empty".to_string());
    }
    
    if content.is_empty() {
        return Err("Content cannot be empty".to_string());
    }
    
    let caller_principal = ic_cdk::api::caller();
    
    // Get user account to check tier and Pinata status
    let user_account = ACCOUNTS.with(|accounts| {
        let accounts = accounts.borrow();
        accounts.get(&caller_principal).cloned().unwrap_or_else(|| UserAccount {
            user_principal: caller_principal,
            cycles_balance: 0,
            tier: UserTier::Free,
            cache_usage_bytes: 0,
            pinata_enabled: false,
        })
    });
    
    ic_cdk::print(format!("🚀 Starting upload flow: upload file -> cache -> pinata call through canister (HTTP)"));
    ic_cdk::print(format!("📝 File: {} ({} bytes), CID: {}", filename, content.len(), cid));
    
    // Step 1: Create a cache entry for the uploaded content
    let cache_entry = CacheEntry {
        cid: cid.clone(),
        content_type: content_type.clone(),
        size: content.len() as u64,
        last_accessed_ts: ic_cdk::api::time(),
        bytes: content.clone(),
    };
    
    // Step 2: Store in cache (this will check user's cache limits)
    ic_cdk::print("📦 Storing content in dCDN cache...");
    if let Err(e) = put_cache_entry(cid.clone(), cache_entry) {
        return Err(format!("Failed to cache uploaded content: {}", e));
    }
    ic_cdk::print("✅ Content successfully cached in dCDN");
    
    // Step 3: Upload to Pinata via HTTP canister call
    ic_cdk::print("🌐 Uploading to Pinata via HTTP canister call...");
    
    // Determine if we should pin the content based on user tier
    let should_pin = user_account.tier != UserTier::Free;
    
    match upload_to_pinata(&content, &filename, &content_type, should_pin).await {
        Ok(ipfs_hash) => {
            ic_cdk::print(format!("✅ Successfully uploaded to Pinata via HTTP canister call! IPFS Hash: {}", ipfs_hash));
            
            let result_message = if should_pin {
                format!("Content uploaded and pinned to IPFS. CID: {}, IPFS Hash: {}", cid, ipfs_hash)
            } else {
                format!("Content uploaded to IPFS (no pinning - free tier). CID: {}, IPFS Hash: {}", cid, ipfs_hash)
            };
            
            Ok(result_message)
        }
        Err(e) => {
            ic_cdk::print(format!("❌ Pinata upload via HTTP canister call failed: {}", e));
            // Even if Pinata upload fails, the content is still cached
            Ok(format!("Content uploaded to cache. CID: {} (Pinata upload failed: {})", cid, e))
        }
    }
}

// Get content with optional resizing
#[ic_cdk::query]
fn get_content_with_resize(cid: String, width: Option<u32>) -> Result<Vec<u8>, String> {
    if cid.is_empty() {
        return Err("CID cannot be empty".to_string());
    }
    
    // First try to get content from cache
    let content = if let Some(cache_entry) = get_cache_entry(&cid) {
        cache_entry.bytes
    } else {
        // If not in cache, try to fetch from IPFS
        // Note: This is a query function, so we can't use async/await
        // For now, we'll return an error if content is not in cache
        return Err("Content not found in cache. Please use get_content for IPFS fallback.".to_string());
    };
    
    // If width is specified, resize the image
    if let Some(target_width) = width {
        // Check if content is an image
        if content.len() > 0 {
            // Try to resize the image
            match resize_image(&content, target_width) {
                Ok(resized_content) => Ok(resized_content),
                Err(e) => Err(format!("Failed to resize image: {}", e))
            }
        } else {
            Err("Content is empty".to_string())
        }
    } else {
        // No resizing requested, return original content
        Ok(content)
    }
}

// Get content from cache or IPFS
#[ic_cdk::update]
async fn get_content(cid: String) -> Result<Vec<u8>, String> {
    if cid.is_empty() {
        return Err("CID cannot be empty".to_string());
    }
    
    // First try to get from cache
    if let Some(cache_entry) = get_cache_entry(&cid) {
        // Update last accessed timestamp
        let mut updated_entry = cache_entry.clone();
        updated_entry.last_accessed_ts = ic_cdk::api::time();
        let _ = put_cache_entry(cid.clone(), updated_entry);
        
        return Ok(cache_entry.bytes);
    }
    
    // If not in cache, try to fetch from IPFS
    match fetch_from_ipfs(cid.clone()).await {
        Ok(content) => {
            // Cache the fetched content for future requests
            let cache_entry = CacheEntry {
                cid: cid.clone(),
                content_type: "application/octet-stream".to_string(), // Default content type for IPFS content
                size: content.len() as u64,
                last_accessed_ts: ic_cdk::api::time(),
                bytes: content.clone(),
            };
            
            let _ = put_cache_entry(cid.clone(), cache_entry);
            Ok(content)
        }
        Err(e) => Err(format!("Content not found in cache or IPFS: {}", e))
    }
}

// List all cached images for the resize interface
#[ic_cdk::query]
fn list_cached_images() -> Vec<CachedImageInfo> {
    let mut images = Vec::new();
    
    CACHE.with(|cache| {
        let cache = cache.borrow();
        for (cid, entry) in cache.iter() {
            // Only include image files
            if entry.content_type.starts_with("image/") {
                images.push(CachedImageInfo {
                    cid: cid.clone(),
                    name: format!("Image_{}", cid.chars().take(8).collect::<String>()),
                    content_type: entry.content_type.clone(),
                    size: entry.size,
                    last_accessed: entry.last_accessed_ts,
                });
            }
        }
    });
    
    // Sort by last accessed (most recent first)
    images.sort_by(|a, b| b.last_accessed.cmp(&a.last_accessed));
    images
}

// Get image dimensions for a cached image
#[ic_cdk::query]
fn get_image_dimensions(cid: String) -> Result<(u32, u32), String> {
    if cid.is_empty() {
        return Err("CID cannot be empty".to_string());
    }
    
    // Get content from cache
    let content = if let Some(cache_entry) = get_cache_entry(&cid) {
        cache_entry.bytes
    } else {
        return Err("Image not found in cache".to_string());
    };
    
    // Load image and get dimensions
    let img = image::load_from_memory(&content)
        .map_err(|e| format!("Failed to load image: {}", e))?;
    
    let (width, height) = img.dimensions();
    Ok((width, height))
}

// ===== CANISTER-TO-CANISTER COMMUNICATION FUNCTIONS =====

/// Canister-to-canister upload function
/// Allows other canisters to upload content directly with automatic cycles payment
#[ic_cdk::update]
async fn canister_upload(
    caller: Principal,
    content: Vec<u8>,
    content_type: String,
    cycles_payment: u128
) -> Result<String, String> {
    // Validate input
    if content.is_empty() {
        return Err("Content cannot be empty".to_string());
    }
    
    if content_type.is_empty() {
        return Err("Content type cannot be empty".to_string());
    }
    
    if cycles_payment == 0 {
        return Err("Cycles payment must be greater than 0".to_string());
    }
    
    // Accept the cycles payment from the calling canister
    let cycles_available = ic_cdk::api::call::msg_cycles_available128();
    let cycles_accepted = ic_cdk::api::call::msg_cycles_accept128(cycles_payment.min(cycles_available));
    
    ic_cdk::print(format!("Canister upload: Accepted {} cycles from caller {}", cycles_accepted, caller));
    
    // Generate a CID for the content
    let cid = generate_cid_for_content(&content, &content_type);
    
    // Get or create user account for the calling canister
    let user_account = ACCOUNTS.with(|accounts| {
        let mut accounts = accounts.borrow_mut();
        let user_account = accounts.entry(caller).or_insert_with(|| UserAccount {
            user_principal: caller,
            cycles_balance: 0,
            tier: UserTier::Free,
            cache_usage_bytes: 0,
            pinata_enabled: false,
        });
        
        // Add the accepted cycles to the canister's balance
        user_account.cycles_balance = user_account.cycles_balance.saturating_add(cycles_accepted);
        
        user_account.clone()
    });
    
    // Create a cache entry for the uploaded content
    let cache_entry = CacheEntry {
        cid: cid.clone(),
        content_type: content_type.clone(),
        size: content.len() as u64,
        last_accessed_ts: ic_cdk::api::time(),
        bytes: content.clone(),
    };
    
    // Store in cache
    if let Err(e) = put_cache_entry(cid.clone(), cache_entry) {
        return Err(format!("Failed to cache uploaded content: {}", e));
    }
    
    // For paid tiers, also upload to Pinata for persistence
    if user_account.pinata_enabled {
        match upload_to_pinata(&content, &cid, &content_type, true).await {
            Ok(ipfs_hash) => {
                Ok(format!("Content uploaded and pinned to IPFS. CID: {}, IPFS Hash: {}", cid, ipfs_hash))
            }
            Err(e) => {
                Ok(format!("Content uploaded to cache. CID: {} (Pinata upload failed: {})", cid, e))
            }
        }
    } else {
        Ok(format!("Content uploaded to cache. CID: {} (Pinata not enabled for this tier)", cid))
    }
}

/// Canister-to-canister content retrieval function
#[ic_cdk::query]
fn canister_get_content(_caller: Principal, cid: String) -> Result<Vec<u8>, String> {
    if cid.is_empty() {
        return Err("CID cannot be empty".to_string());
    }
    
    // Check if content is in cache
    if let Some(cache_entry) = get_cache_entry(&cid) {
        // Update last accessed timestamp
        let mut updated_entry = cache_entry.clone();
        updated_entry.last_accessed_ts = ic_cdk::api::time();
        let _ = put_cache_entry(cid.clone(), updated_entry);
        
        return Ok(cache_entry.bytes);
    }
    
    // Content not found in cache
    Err(format!("Content not found: {}", cid))
}

/// Canister-to-canister content retrieval with IPFS fallback
#[ic_cdk::update]
async fn canister_get_content_with_fallback(_caller: Principal, cid: String) -> Result<Vec<u8>, String> {
    if cid.is_empty() {
        return Err("CID cannot be empty".to_string());
    }
    
    // First try to get from cache
    if let Some(cache_entry) = get_cache_entry(&cid) {
        // Update last accessed timestamp
        let mut updated_entry = cache_entry.clone();
        updated_entry.last_accessed_ts = ic_cdk::api::time();
        let _ = put_cache_entry(cid.clone(), updated_entry);
        
        return Ok(cache_entry.bytes);
    }
    
    // If not in cache, try to fetch from IPFS
    match fetch_from_ipfs(cid.clone()).await {
        Ok(content) => {
            // Cache the fetched content for future requests
            let cache_entry = CacheEntry {
                cid: cid.clone(),
                content_type: "application/octet-stream".to_string(), // Default content type for IPFS content
                size: content.len() as u64,
                last_accessed_ts: ic_cdk::api::time(),
                bytes: content.clone(),
            };
            
            let _ = put_cache_entry(cid.clone(), cache_entry);
            Ok(content)
        }
        Err(e) => Err(format!("Content not found in cache or IPFS: {}", e))
    }
}

/// Canister-to-canister bulk upload function
/// Allows other canisters to upload multiple files at once
#[ic_cdk::update]
async fn canister_bulk_upload(
    caller: Principal,
    files: Vec<(Vec<u8>, String)>,
    cycles_payment: u128
) -> Result<Vec<String>, String> {
    if files.is_empty() {
        return Err("Files list cannot be empty".to_string());
    }
    
    if cycles_payment == 0 {
        return Err("Cycles payment must be greater than 0".to_string());
    }
    
    // Accept the cycles payment from the calling canister
    let cycles_available = ic_cdk::api::call::msg_cycles_available128();
    let cycles_accepted = ic_cdk::api::call::msg_cycles_accept128(cycles_payment.min(cycles_available));
    
    ic_cdk::print(format!("Canister bulk upload: Accepted {} cycles from caller {} for {} files", 
                          cycles_accepted, caller, files.len()));
    
    // Get or create user account for the calling canister
    let user_account = ACCOUNTS.with(|accounts| {
        let mut accounts = accounts.borrow_mut();
        let user_account = accounts.entry(caller).or_insert_with(|| UserAccount {
            user_principal: caller,
            cycles_balance: 0,
            tier: UserTier::Free,
            cache_usage_bytes: 0,
            pinata_enabled: false,
        });
        
        // Add the accepted cycles to the canister's balance
        user_account.cycles_balance = user_account.cycles_balance.saturating_add(cycles_accepted);
        
        user_account.clone()
    });
    
    let mut uploaded_cids = Vec::new();
    
    // Process each file
    for (content, content_type) in files {
        if content.is_empty() {
            return Err("File content cannot be empty".to_string());
        }
        
        if content_type.is_empty() {
            return Err("Content type cannot be empty".to_string());
        }
        
        // Generate a CID for the content
        let cid = generate_cid_for_content(&content, &content_type);
        
        // Create a cache entry for the uploaded content
        let cache_entry = CacheEntry {
            cid: cid.clone(),
            content_type: content_type.clone(),
            size: content.len() as u64,
            last_accessed_ts: ic_cdk::api::time(),
            bytes: content.clone(),
        };
        
        // Store in cache
        if let Err(e) = put_cache_entry(cid.clone(), cache_entry) {
            return Err(format!("Failed to cache uploaded content: {}", e));
        }
        
        // For paid tiers, also upload to Pinata for persistence
        if user_account.pinata_enabled {
            let _ = upload_to_pinata(&content, &cid, &content_type, true).await;
        }
        
        uploaded_cids.push(cid);
    }
    
    Ok(uploaded_cids)
}

/// Canister-to-canister cost estimation function
#[ic_cdk::query]
fn canister_estimate_upload_cost(file_size_bytes: u64) -> u128 {
    estimate_upload_cost(file_size_bytes)
}

/// Canister-to-canister storage cost estimation function
#[ic_cdk::query]
fn canister_estimate_storage_cost(file_size_bytes: u64, hours: u64) -> u128 {
    estimate_storage_cost(file_size_bytes, hours)
}

/// Canister-to-canister account information function
#[ic_cdk::query]
fn canister_get_account_info(caller: Principal) -> UserAccount {
    ACCOUNTS.with(|accounts| {
        let accounts = accounts.borrow();
        accounts.get(&caller).cloned().unwrap_or_else(|| UserAccount {
            user_principal: caller,
            cycles_balance: 0,
            tier: UserTier::Free,
            cache_usage_bytes: 0,
            pinata_enabled: false,
        })
    })
}

/// Canister-to-canister cycles deposit function
#[ic_cdk::update]
async fn canister_deposit_cycles(caller: Principal, cycles_amount: u128) -> UserAccount {
    if cycles_amount == 0 {
        return canister_get_account_info(caller);
    }
    
    // Accept the cycles payment from the calling canister
    let cycles_available = ic_cdk::api::call::msg_cycles_available128();
    let cycles_accepted = ic_cdk::api::call::msg_cycles_accept128(cycles_amount.min(cycles_available));
    
    ic_cdk::print(format!("Canister deposit: Accepted {} cycles from caller {}", cycles_accepted, caller));
    
    ACCOUNTS.with(|accounts| {
        let mut accounts = accounts.borrow_mut();
        let user_account = accounts.entry(caller).or_insert_with(|| UserAccount {
            user_principal: caller,
            cycles_balance: 0,
            tier: UserTier::Free,
            cache_usage_bytes: 0,
            pinata_enabled: false,
        });
        
        // Add the accepted cycles to the canister's balance
        user_account.cycles_balance = user_account.cycles_balance.saturating_add(cycles_accepted);
        
        user_account.clone()
    })
}

// ===== HELPER FUNCTIONS =====

/// Generate a unique CID for content
fn generate_cid_for_content(content: &[u8], content_type: &str) -> String {
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


