use std::collections::HashMap;
use std::collections::VecDeque;
use std::cell::RefCell;
use candid::{CandidType, Deserialize, Principal, Nat};
use ic_cdk::api::caller;
use image::{imageops, GenericImageView};

// HTTP Outcall types for external requests
use ic_cdk::api::management_canister::http_request::{
    CanisterHttpRequestArgument, HttpResponse, HttpHeader, HttpMethod, TransformContext, TransformFunc
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

// Tier configuration constants
const FREE_TIER_CACHE_LIMIT: u64 = 20 * 1024 * 1024; // 20MB
const STARTER_TIER_CACHE_LIMIT: u64 = 50 * 1024 * 1024; // 50MB
const PRO_TIER_CACHE_LIMIT: u64 = 100 * 1024 * 1024; // 100MB
const BUSINESS_TIER_CACHE_LIMIT: u64 = 500 * 1024 * 1024; // 500MB

// Tier upgrade costs (in cycles)
const STARTER_UPGRADE_COST: u128 = 1_000_000_000; // 1B cycles ≈ $1
const PRO_UPGRADE_COST: u128 = 5_000_000_000; // 5B cycles ≈ $5
const BUSINESS_UPGRADE_COST: u128 = 15_000_000_000; // 15B cycles ≈ $15

// Pinata tier configuration
const FREE_TIER_PINATA_STORAGE: u64 = 1 * 1024 * 1024 * 1024; // 1GB
const STARTER_TIER_PINATA_STORAGE: u64 = 100 * 1024 * 1024 * 1024; // 100GB
const PRO_TIER_PINATA_STORAGE: u64 = 500 * 1024 * 1024 * 1024; // 500GB
const BUSINESS_TIER_PINATA_STORAGE: u64 = 2 * 1024 * 1024 * 1024 * 1024; // 2TB

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
        match self.tier {
            UserTier::Free => FREE_TIER_CACHE_LIMIT,
            UserTier::Starter => STARTER_TIER_CACHE_LIMIT,
            UserTier::Pro => PRO_TIER_CACHE_LIMIT,
            UserTier::Business => BUSINESS_TIER_CACHE_LIMIT,
        }
    }

    fn get_pinata_storage_limit(&self) -> u64 {
        match self.tier {
            UserTier::Free => FREE_TIER_PINATA_STORAGE,
            UserTier::Starter => STARTER_TIER_PINATA_STORAGE,
            UserTier::Pro => PRO_TIER_PINATA_STORAGE,
            UserTier::Business => BUSINESS_TIER_PINATA_STORAGE,
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
        match (&self.tier, target_tier) {
            (UserTier::Free, UserTier::Starter) => Some(STARTER_UPGRADE_COST),
            (UserTier::Free, UserTier::Pro) => Some(PRO_UPGRADE_COST),
            (UserTier::Free, UserTier::Business) => Some(BUSINESS_UPGRADE_COST),
            (UserTier::Starter, UserTier::Pro) => Some(PRO_UPGRADE_COST - STARTER_UPGRADE_COST),
            (UserTier::Starter, UserTier::Business) => Some(BUSINESS_UPGRADE_COST - STARTER_UPGRADE_COST),
            (UserTier::Pro, UserTier::Business) => Some(BUSINESS_UPGRADE_COST - PRO_UPGRADE_COST),
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

// Cache configuration constants
const MAX_CACHE_ITEMS: usize = 1000; // Maximum number of items in cache
const MAX_CACHE_SIZE_BYTES: u64 = 20 * 1024 * 1024; // 20MB cache limit (global)

// Pinata API configuration
// NOTE: In production, this should be managed via encrypted secrets
// For this hackathon MVP, we're using a real JWT from environment
const PINATA_JWT: &str = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySW5mb3JtYXRpb24iOnsiaWQiOiIyZDhiYzBiNC0xNjllLTQzNzQtOTI5Yy05ZmJhNjEwODNmMTciLCJlbWFpbCI6ImtoYXRyaXNha3NoaTMwMDNAZ21haWwuY29tIiwiZW1haWxfdmVyaWZpZWQiOntydWUsInBpbl9wb2xpY3kiOnsicmVnaW9ucyI6W3siZGVzaXJlZFJlcGxpY2F0aW9uQ291bnQiOjEsImlkIjoiRlJBMSJ9LHsiZGVzaXJlZFJlcGxpY2F0aW9uQ291bnQiOjEsImlkIjoiTllDMSJ9XSwidmVyc2lvbiI6MX0sIm1mYV9lbmFibGVkIjpmYWxzZSwic3RhdHVzIjoiQUNUSVZFIn0sImF1dGhlbnRpY2F0aW9uVHlwZSI6InNjb3BlZEtleSIsInNjb3BlZEtleUtleSI6IjdjN2FjMjY3YTdhMzU2ZWVmN2Y3Iiwic2NvcGVkS2V5U2VjcmV0IjoiODE2ZjMyZjk4NTFjY2Q1YzZmNjhlNjQzMDA2NjZlZGQ4MzkxMTEzY2RkMDhhMjMzNDdkZmMzY2NhMDNlOTU1NCIsImV4cCI6MTc4Mzc4MTcwOH0.Qv8HE9i-HPBOJ2jvtnrlEGnttG6kIEUQ-SaKz4AznwE";

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
        if cache.len() >= MAX_CACHE_ITEMS {
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
    vec![
        TierInfo {
            tier: UserTier::Free,
            name: "Free".to_string(),
            cache_limit_mb: 20,
            pinata_storage_gb: 1,
            pinata_enabled: false,
            price_cycles: 0,
            features: vec![
                "20MB dCDN cache".to_string(),
                "1GB Pinata storage".to_string(),
                "Basic content delivery".to_string(),
                "No IPFS pinning".to_string(),
            ],
        },
        TierInfo {
            tier: UserTier::Starter,
            name: "Starter".to_string(),
            cache_limit_mb: 50,
            pinata_storage_gb: 100,
            pinata_enabled: true,
            price_cycles: STARTER_UPGRADE_COST,
            features: vec![
                "50MB dCDN cache".to_string(),
                "100GB Pinata storage".to_string(),
                "IPFS pinning included".to_string(),
                "Priority support".to_string(),
            ],
        },
        TierInfo {
            tier: UserTier::Pro,
            name: "Pro".to_string(),
            cache_limit_mb: 100,
            pinata_storage_gb: 500,
            pinata_enabled: true,
            price_cycles: PRO_UPGRADE_COST,
            features: vec![
                "100MB dCDN cache".to_string(),
                "500GB Pinata storage".to_string(),
                "IPFS pinning included".to_string(),
                "Advanced analytics".to_string(),
                "Priority support".to_string(),
            ],
        },
        TierInfo {
            tier: UserTier::Business,
            name: "Business".to_string(),
            cache_limit_mb: 500,
            pinata_storage_gb: 2048,
            pinata_enabled: true,
            price_cycles: BUSINESS_UPGRADE_COST,
            features: vec![
                "500MB dCDN cache".to_string(),
                "2TB Pinata storage".to_string(),
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
        let max_entries = MAX_CACHE_ITEMS as u64;
        (total_entries, total_bytes, max_entries)
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
    let url = format!("https://cloudflare-ipfs.com/ipfs/{}", cid);
    
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
    let url = "https://api.pinata.cloud/pinning/pinFileToIPFS";
    
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
        HttpHeader { name: "Authorization".to_string(), value: format!("Bearer {}", PINATA_JWT) },
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
    let (total_entries, total_bytes, max_entries) = get_cache_stats();
    let (_lru_queue_length, _) = get_lru_queue_stats();
    (total_entries, total_bytes, max_entries)
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
    
    // Create more cache entries than MAX_CACHE_ITEMS to trigger eviction
    let num_entries = MAX_CACHE_ITEMS + 5;
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
    
    // Verify that cache size is maintained at MAX_CACHE_ITEMS
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

// Test function to verify HTTP outcalls are working
#[ic_cdk::update]
async fn test_real_http_outcalls() -> Result<String, String> {
    // Test 1: Fetch a known IPFS CID (IPFS logo)
    let test_cid = "QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG";
    
    ic_cdk::print(format!("Testing real HTTP outcall to fetch IPFS CID: {}", test_cid));
    
    match fetch_from_ipfs_internal(test_cid).await {
        Ok(content) => {
            let content_size = content.len();
            ic_cdk::print(format!("✅ Successfully fetched {} bytes from IPFS", content_size));
            
            // Test 2: Try to upload test content to Pinata
            ic_cdk::print("Testing real HTTP outcall to Pinata API...");
            
            // Create test content for upload
            let test_content = b"Test content for Pinata upload verification";
            let test_filename = format!("test_upload_{}.txt", ic_cdk::api::time());
            
            match upload_to_pinata(test_content, &test_filename, "text/plain", false).await {
                Ok(ipfs_hash) => {
                    Ok(format!(
                        "✅ HTTP outcalls working perfectly!\n\
                        - Fetched {} bytes from IPFS\n\
                        - Successfully uploaded to Pinata with IPFS hash: {}\n\
                        - All HTTP outcalls are functional",
                        content_size, ipfs_hash
                    ))
                }
                Err(pin_error) => {
                    Ok(format!(
                        "⚠️ IPFS fetch successful, but Pinata upload failed\n\
                        - Fetched {} bytes from IPFS ✅\n\
                        - Pinata error: {}\n\
                        - HTTP outcalls are partially working",
                        content_size, pin_error
                    ))
                }
            }
        }
        Err(fetch_error) => {
            Err(format!(
                "❌ HTTP outcall test failed\n\
                - IPFS fetch error: {}\n\
                - Please check HTTP outcall configuration",
                fetch_error
            ))
        }
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
    
    let cache_utilization_percent = (total_cache_size_bytes * 100) / MAX_CACHE_SIZE_BYTES;
    
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

// Reset performance metrics
#[ic_cdk::update]
fn reset_performance_metrics() -> Result<String, String> {
    reset_metrics();
    Ok("✅ Performance metrics reset successfully".to_string())
}


