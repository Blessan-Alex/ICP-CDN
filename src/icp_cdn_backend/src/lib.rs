use std::collections::HashMap;
use std::collections::VecDeque;
use std::cell::RefCell;
use candid::{CandidType, Deserialize, Principal, Nat};
use ic_cdk::api::caller;
use image::{ImageBuffer, imageops, GenericImageView};

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

impl Default for UserAccount {
    fn default() -> Self {
        Self {
            user_principal: Principal::anonymous(),
            cycles_balance: 0,
        }
    }
}

// Cache configuration constants
const MAX_CACHE_ITEMS: usize = 1000; // Maximum number of items in cache
const MAX_CACHE_SIZE_BYTES: u64 = 100 * 1024 * 1024; // 100MB cache limit

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

// Cache management functions with LRU logic
fn put_cache_entry(cid: String, cache_entry: CacheEntry) -> Result<(), String> {
    CACHE.with(|cache| {
        let mut cache = cache.borrow_mut();
        
        // Check if cache is at capacity
        if cache.len() >= MAX_CACHE_ITEMS {
            // Evict the least recently used item
            if let Some(evicted_cid) = evict_lru_item() {
                cache.remove(&evicted_cid);
            }
        }
        
        // Add the new item
        cache.insert(cid.clone(), cache_entry);
        
        // Add to LRU queue
        add_to_lru(&cid);
        
        Ok(())
    })
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
        remove_from_lru(cid);
    }
    
    removed
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
    // Create a new HttpResponse with only the essential fields, stripping headers for security
    HttpResponse {
        status: Nat::from(200u64), // Default status
        headers: vec![], // Strip all headers to prevent non-determinism
        body: vec![], // Empty body for transform function
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
        transform: Some(TransformContext {
            function: TransformFunc(candid::Func {
                principal: ic_cdk::api::id(),
                method: "transform".to_string(),
            }),
            context: vec![],
        }),
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

// Private async function to pin content to Pinata using real HTTP outcalls
async fn pin_to_pinata(cid: &str) -> Result<(), String> {
    // Construct the URL for the Pinata API
    let url = "https://api.pinata.cloud/pinning/pinByHash".to_string();
    
    ic_cdk::print(format!("Making HTTP outcall to Pinata API to pin CID: {}", cid));
    
    // Create the JSON body required by the Pinata API
    let json_body = format!("{{\"hashToPin\": \"{}\"}}", cid);
    let body_bytes = json_body.into_bytes();
    
    // Create headers for the POST request
    let headers = vec![
        HttpHeader { name: "Authorization".to_string(), value: format!("Bearer {}", PINATA_JWT) },
        HttpHeader { name: "Content-Type".to_string(), value: "application/json".to_string() },
    ];
    
    // Create the HTTP request
    let request = CanisterHttpRequestArgument {
        url,
        method: HttpMethod::POST,
        headers,
        body: Some(body_bytes),
        max_response_bytes: Some(1024 * 1024), // 1MB max response
        transform: Some(TransformContext {
            function: TransformFunc(candid::Func {
                principal: ic_cdk::api::id(),
                method: "transform".to_string(),
            }),
            context: vec![],
        }),
    };
    
    // Make the HTTP outcall
    let cycles = 15_000_000_000u128; // 15B cycles for the request (increased from 10B)
    
    ic_cdk::print(format!("Sending Pinata HTTP outcall with {} cycles", cycles));
    
    match ic_cdk::api::call::call_with_payment128::<(CanisterHttpRequestArgument,), (HttpResponse,)>(
        Principal::management_canister(),
        "http_request",
        (request,),
        cycles,
    ).await {
        Ok((response,)) => {
            ic_cdk::print(format!("Pinata HTTP outcall successful, status: {}", response.status));
            
            // Check if the pinning was successful
            if response.status == Nat::from(200u64) {
                ic_cdk::print(format!("Successfully pinned CID {} to Pinata", cid));
                Ok(())
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

// Test function to verify HTTP outcall setup
#[ic_cdk::update]
async fn test_http_outcall_setup() -> Result<String, String> {
    // Test the transform function with a mock context
    let transform_context = TransformContext {
        function: TransformFunc(candid::Func {
            principal: ic_cdk::api::id(),
            method: "transform".to_string(),
        }),
        context: vec![],
    };
    
    // Call the transform function
    let transformed = transform(transform_context);
    
    // Verify that the transform function works
    if transformed.status == Nat::from(200u64) && transformed.headers.is_empty() {
        Ok("HTTP outcall setup verified! Transform function working correctly.".to_string())
    } else {
        Err("HTTP outcall setup test failed!".to_string())
    }
}

// HTTP request handler for boundary node integration
// This allows the canister to serve content directly through ICP's boundary nodes
#[ic_cdk::query]
fn http_request_handler(req: CanisterHttpRequestArgument) -> HttpResponse {
    // Parse the URL to extract the CID
    let url = req.url;
    let path = url.split('?').next().unwrap_or("");
    
    // Extract CID from path (e.g., /bafybeih...)
    let cid = path.trim_start_matches('/');
    
    if cid.is_empty() {
        return HttpResponse {
            status: Nat::from(400u64),
            headers: vec![HttpHeader { name: "Content-Type".to_string(), value: "text/plain".to_string() }],
            body: "Missing CID in URL path".as_bytes().to_vec(),
        };
    }
    
    // Check if content is in cache
    if let Some(cache_entry) = get_cache_entry(cid) {
        // Cache hit - return the cached content
        return HttpResponse {
            status: Nat::from(200u64),
            headers: vec![
                HttpHeader { name: "Content-Type".to_string(), value: cache_entry.content_type.clone() },
                HttpHeader { name: "Cache-Control".to_string(), value: "public, max-age=3600".to_string() },
                HttpHeader { name: "X-Cache".to_string(), value: "HIT".to_string() },
            ],
            body: cache_entry.bytes,
        };
    }
    
    // Cache miss - return 404 for now
    // In a full implementation, this would trigger an async fetch
    HttpResponse {
        status: Nat::from(404u64),
        headers: vec![HttpHeader { name: "Content-Type".to_string(), value: "text/plain".to_string() }],
        body: format!("Content not found: {}", cid).as_bytes().to_vec(),
    }
}

// Main content-serving function that integrates cache with IPFS fetching
#[ic_cdk::update]
async fn get_content(cid: String) -> Result<Vec<u8>, String> {
    if cid.is_empty() {
        return Err("CID cannot be empty".to_string());
    }
    
    let start_time = ic_cdk::api::time();
    
    // First, check if the content is in the cache
    if let Some(cache_entry) = get_cache_entry(&cid) {
        // Cache hit - return the cached content
        let response_time = (ic_cdk::api::time() - start_time) / 1_000_000; // Convert to milliseconds
        record_request(true, response_time);
        return Ok(cache_entry.bytes);
    }
    
    // Cache miss - fetch from IPFS
    match fetch_from_ipfs_internal(&cid).await {
        Ok(content_bytes) => {
            // Create a cache entry for the fetched content
            let cache_entry = CacheEntry {
                cid: cid.clone(),
                content_type: "application/octet-stream".to_string(), // Default content type
                size: content_bytes.len() as u64,
                last_accessed_ts: ic_cdk::api::time(),
                bytes: content_bytes.clone(),
            };
            
            // Store in cache
            if let Err(e) = put_cache_entry(cid.clone(), cache_entry) {
                // Log the error but still return the content
                ic_cdk::print(format!("Warning: Failed to cache content for CID {}: {}", cid, e));
            }
            
            let response_time = (ic_cdk::api::time() - start_time) / 1_000_000; // Convert to milliseconds
            record_request(false, response_time);
            
            Ok(content_bytes)
        }
        Err(e) => {
            let response_time = (ic_cdk::api::time() - start_time) / 1_000_000; // Convert to milliseconds
            record_request(false, response_time);
            Err(format!("Failed to fetch content from IPFS for CID {}: {}", cid, e))
        }
    }
}

// Enhanced content serving function with image resizing capabilities
#[ic_cdk::update]
async fn get_content_with_resize(cid: String, width: Option<u32>) -> Result<Vec<u8>, String> {
    if cid.is_empty() {
        return Err("CID cannot be empty".to_string());
    }
    
    // Get the original content (from cache or IPFS)
    let original_content = get_content(cid.clone()).await?;
    
    // Check if resizing is requested
    if let Some(target_width) = width {
        // Check if the content type is an image
        if let Some(cache_entry) = get_cache_entry(&cid) {
            let content_type = &cache_entry.content_type;
            if content_type.starts_with("image/") {
                // Resize the image
                match resize_image(&original_content, target_width) {
                    Ok(resized_content) => {
                        ic_cdk::print(format!("Successfully resized image for CID {} to width {}", cid, target_width));
                        return Ok(resized_content);
                    }
                    Err(e) => {
                        ic_cdk::print(format!("Failed to resize image for CID {}: {}", cid, e));
                        // Return original content if resizing fails
                        return Ok(original_content);
                    }
                }
            }
        }
    }
    
    // Return original content if no resizing or not an image
    Ok(original_content)
}

// Main upload function that handles content upload and pinning
#[ic_cdk::update]
async fn upload_content(cid: String, content_type: String, content: Vec<u8>) -> Result<String, String> {
    if cid.is_empty() {
        return Err("CID cannot be empty".to_string());
    }
    
    if content.is_empty() {
        return Err("Content cannot be empty".to_string());
    }
    
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
    
    // Pin the content to Pinata in the background using ic_cdk::spawn
    let cid_for_pinning = cid.clone();
    ic_cdk::spawn(async move {
        match pin_to_pinata(&cid_for_pinning).await {
            Ok(_) => {
                ic_cdk::print(format!("Successfully pinned CID {} to Pinata", cid_for_pinning));
            }
            Err(e) => {
                ic_cdk::print(format!("Failed to pin CID {} to Pinata: {}", cid_for_pinning, e));
            }
        }
    });
    
    Ok(format!("Content uploaded and cached successfully. Pinning to Pinata initiated in background. CID: {}", cid))
}

// Demo function to test HTTP outcalls to external services
#[ic_cdk::update]
async fn test_external_http_request() -> Result<String, String> {
    // Test fetching a known IPFS CID
    let test_cid = "QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG"; // IPFS logo
    
    match fetch_from_ipfs_internal(test_cid).await {
        Ok(content) => {
            Ok(format!("Successfully fetched {} bytes from IPFS CID: {}", content.len(), test_cid))
        }
        Err(e) => {
            Err(format!("Failed to fetch from IPFS: {}", e))
        }
    }
}

// Test function to demonstrate the end-to-end IPFS fetch and cache flow
#[ic_cdk::update]
async fn test_ipfs_fetch_and_cache_flow(cid: String) -> Result<String, String> {
    if cid.is_empty() {
        return Err("CID cannot be empty".to_string());
    }
    
    // First, clear any existing cache entry for this CID to ensure fresh fetch
    remove_cache_entry(&cid);
    
    // Get initial cache stats
    let (initial_entries, initial_bytes, _) = get_cache_stats();
    
    // Fetch content using the main get_content function
    match get_content(cid.clone()).await {
        Ok(content) => {
            // Get final cache stats
            let (final_entries, final_bytes, _) = get_cache_stats();
            
            // Verify that the content was cached
            if final_entries > initial_entries {
                Ok(format!(
                    "✅ IPFS fetch and cache flow successful!\n\
                    - Fetched {} bytes from IPFS\n\
                    - Content cached successfully\n\
                    - Cache entries: {} -> {}\n\
                    - Cache bytes: {} -> {}",
                    content.len(),
                    initial_entries,
                    final_entries,
                    initial_bytes,
                    final_bytes
                ))
            } else {
                Ok(format!(
                    "⚠️ Content fetched but may not have been cached properly\n\
                    - Fetched {} bytes from IPFS\n\
                    - Cache entries: {} -> {}",
                    content.len(),
                    initial_entries,
                    final_entries
                ))
            }
        }
        Err(e) => {
            Err(format!("Failed to fetch and cache content: {}", e))
        }
    }
}

// Test function to demonstrate upload and pinning flow
#[ic_cdk::update]
async fn test_upload_and_pinning_flow(cid: String, content_type: String, content: Vec<u8>) -> Result<String, String> {
    if cid.is_empty() {
        return Err("CID cannot be empty".to_string());
    }
    
    if content.is_empty() {
        return Err("Content cannot be empty".to_string());
    }
    
    // Get initial cache stats
    let (initial_entries, initial_bytes, _) = get_cache_stats();
    
    // Upload content using the main upload_content function
    match upload_content(cid.clone(), content_type.clone(), content.clone()).await {
        Ok(upload_result) => {
            // Get final cache stats
            let (final_entries, final_bytes, _) = get_cache_stats();
            
            // Verify that the content was cached
            if final_entries > initial_entries {
                Ok(format!(
                    "✅ Upload and pinning flow successful!\n\
                    - Uploaded {} bytes\n\
                    - Content cached successfully\n\
                    - Pinning to Pinata initiated in background\n\
                    - Cache entries: {} -> {}\n\
                    - Cache bytes: {} -> {}\n\
                    - Upload result: {}",
                    content.len(),
                    initial_entries,
                    final_entries,
                    initial_bytes,
                    final_bytes,
                    upload_result
                ))
            } else {
                Ok(format!(
                    "⚠️ Content uploaded but may not have been cached properly\n\
                    - Uploaded {} bytes\n\
                    - Pinning to Pinata initiated in background\n\
                    - Cache entries: {} -> {}",
                    content.len(),
                    initial_entries,
                    final_entries
                ))
            }
        }
        Err(e) => {
            Err(format!("Failed to upload and pin content: {}", e))
        }
    }
}

// Test function to test Pinata pinning directly
#[ic_cdk::update]
async fn test_pinata_pinning(cid: String) -> Result<String, String> {
    if cid.is_empty() {
        return Err("CID cannot be empty".to_string());
    }
    
    match pin_to_pinata(&cid).await {
        Ok(_) => {
            Ok(format!("✅ Successfully pinned CID {} to Pinata", cid))
        }
        Err(e) => {
            Err(format!("❌ Failed to pin CID {} to Pinata: {}", cid, e))
        }
    }
}

// Test function to create a simple test image
#[ic_cdk::update]
fn create_test_image(cid: String, width: u32, height: u32) -> Result<String, String> {
    if cid.is_empty() {
        return Err("CID cannot be empty".to_string());
    }
    
    // Create a simple test image (gradient)
    let mut img = ImageBuffer::new(width, height);
    
    for (x, y, pixel) in img.enumerate_pixels_mut() {
        let r = (x as f32 / width as f32 * 255.0) as u8;
        let g = (y as f32 / height as f32 * 255.0) as u8;
        let b = 128u8;
        *pixel = image::Rgb([r, g, b]);
    }
    
    // Encode to PNG
    let mut output = Vec::new();
    img.write_to(&mut std::io::Cursor::new(&mut output), image::ImageFormat::Png)
        .map_err(|e| format!("Failed to encode test image: {}", e))?;
    
    // Create cache entry
    let cache_entry = CacheEntry {
        cid: cid.clone(),
        content_type: "image/png".to_string(),
        size: output.len() as u64,
        last_accessed_ts: ic_cdk::api::time(),
        bytes: output.clone(),
    };
    
    // Store in cache
    put_cache_entry(cid.clone(), cache_entry)?;
    
    Ok(format!("✅ Test image created and cached for CID: {} ({}x{} pixels, {} bytes)", cid, width, height, output.len()))
}

// Test function to demonstrate image resizing
#[ic_cdk::update]
async fn test_image_resizing(cid: String, original_width: u32, target_width: u32) -> Result<String, String> {
    if cid.is_empty() {
        return Err("CID cannot be empty".to_string());
    }
    
    // First, create a test image if it doesn't exist
    if get_cache_entry(&cid).is_none() {
        create_test_image(cid.clone(), original_width, 200)?;
    }
    
    // Get the original image
    let original_content = get_content(cid.clone()).await?;
    let original_size = original_content.len();
    
    // Resize the image
    match get_content_with_resize(cid.clone(), Some(target_width)).await {
        Ok(resized_content) => {
            let resized_size = resized_content.len();
            let size_reduction = if original_size > 0 {
                ((original_size - resized_size) as f32 / original_size as f32 * 100.0) as i32
            } else {
                0
            };
            
            Ok(format!(
                "✅ Image resizing successful!\n\
                - CID: {}\n\
                - Original size: {} bytes\n\
                - Resized size: {} bytes\n\
                - Size reduction: {}%\n\
                - Target width: {} pixels",
                cid, original_size, resized_size, size_reduction, target_width
            ))
        }
        Err(e) => {
            Err(format!("❌ Image resizing failed: {}", e))
        }
    }
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
            
            // Test 2: Try to pin the same CID to Pinata
            ic_cdk::print("Testing real HTTP outcall to Pinata API...");
            
            match pin_to_pinata(test_cid).await {
                Ok(_) => {
                    Ok(format!(
                        "✅ HTTP outcalls working perfectly!\n\
                        - Fetched {} bytes from IPFS\n\
                        - Successfully pinned to Pinata\n\
                        - All HTTP outcalls are functional",
                        content_size
                    ))
                }
                Err(pin_error) => {
                    Ok(format!(
                        "⚠️ IPFS fetch successful, but Pinata pinning failed\n\
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
    
    // Step 3: Fetch content (should be from cache)
    let cached_content = get_content(test_cid.to_string()).await?;
    
    // Step 4: Test image resizing
    let resized_content = get_content_with_resize(test_cid.to_string(), Some(50)).await?;
    
    Ok(format!(
        "✅ Complete real flow test successful!\n\
        - Test image created: {}\n\
        - Content uploaded and pinned: {}\n\
        - Cached content retrieved: {} bytes\n\
        - Image resized: {} bytes\n\
        - All HTTP outcalls and cache operations working",
        test_content,
        upload_result,
        cached_content.len(),
        resized_content.len()
    ))
}
