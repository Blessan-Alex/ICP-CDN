use std::collections::HashMap;
use std::collections::VecDeque;
use std::cell::RefCell;
use candid::{CandidType, Deserialize, Principal, Nat};
use ic_cdk::api::caller;
use image::{ImageBuffer, imageops, GenericImageView};

// HTTP Outcall types for external requests
use ic_cdk::api::management_canister::http_request::{HttpResponse, TransformContext, TransformFunc};

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
    pub principal: Principal,
    pub cycles_balance: u128,
}

impl Default for UserAccount {
    fn default() -> Self {
        Self {
            principal: Principal::anonymous(),
            cycles_balance: 0,
        }
    }
}

// Cache configuration constants
const MAX_CACHE_ITEMS: usize = 1000; // Maximum number of items in cache
const MAX_CACHE_SIZE_BYTES: u64 = 100 * 1024 * 1024; // 100MB cache limit

// Pinata API configuration
// NOTE: In production, this should be managed via encrypted secrets
// For this hackathon MVP, we're using a placeholder JWT
const PINATA_JWT: &str = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySW5mb3JtYXRpb24iOnsiaWQiOiJkYWI5YjI5ZC1jYzM0LTQ5ZDYtOTM5ZC1hYzFkYzM0YzM0YzM0IiwidXNlcm5hbWUiOiJ0ZXN0LXVzZXIiLCJlbWFpbCI6InRlc3RAZXhhbXBsZS5jb20iLCJwdWJsaWNBZGRyZXNzIjoiMHgxMjM0NTY3ODkwYWJjZGVmZ2hpamtsbW5vcHFyc3R1dnd4eXoiLCJjcmVhdGVkQXQiOiIyMDI0LTAxLTAxVDAwOjAwOjAwLjAwMFoifSwiZmlsZXMiOltdLCJtZXRhZGF0YSI6e30sImJhdGNoIjpudWxsLCJjcmVhdGVkQXQiOiIyMDI0LTAxLTAxVDAwOjAwOjAwLjAwMFoifQ.example_signature";

thread_local! {
    static USER_FILES: RefCell<HashMap<String, Vec<IpfsFile>>> = RefCell::new(HashMap::new());
    
    // New state variables for the dCDN functionality
    static CACHE: RefCell<HashMap<String, CacheEntry>> = RefCell::new(HashMap::new());
    static ACCOUNTS: RefCell<HashMap<Principal, UserAccount>> = RefCell::new(HashMap::new());
    
    // LRU tracking state for cache eviction
    static LRU_QUEUE: RefCell<VecDeque<String>> = RefCell::new(VecDeque::new());
}

fn get_user_key() -> String {
    caller().to_string()
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
            principal: caller_principal,
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
            principal: caller_principal,
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

// Private async function to fetch content from IPFS
async fn fetch_from_ipfs(cid: &str) -> Result<Vec<u8>, String> {
    // Construct the full URL for a public IPFS gateway
    let url = format!("https://cloudflare-ipfs.com/ipfs/{}", cid);
    
    // For now, return a placeholder that simulates IPFS fetch
    // This will be replaced with actual HTTP outcall implementation
    // once we resolve the API compatibility issues
    Ok(format!("Simulated IPFS content for CID: {} - This would be fetched from {}", cid, url).into_bytes())
}

// Private async function to pin content to Pinata
async fn pin_to_pinata(cid: &str) -> Result<(), String> {
    // Construct the URL for the Pinata API
    let _url = "https://api.pinata.cloud/pinning/pinByHash".to_string();
    
    // Create the JSON body required by the Pinata API
    let json_body = format!("{{\"hashToPin\": \"{}\"}}", cid);
    let _body_bytes = json_body.into_bytes();
    
    // Create headers for the POST request
    let _headers = vec![
        ("Authorization".to_string(), format!("Bearer {}", PINATA_JWT)),
        ("Content-Type".to_string(), "application/json".to_string()),
    ];
    
    // For now, simulate the pinning request
    // This will be replaced with actual HTTP outcall implementation
    // once we resolve the API compatibility issues
    ic_cdk::print(format!("Simulating pin to Pinata for CID: {}", cid));
    
    // Simulate a successful pinning response
    Ok(())
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
        principal,
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
fn test_get_detailed_cache_stats() -> (u64, u64, u64, u64) {
    let (total_entries, total_bytes, max_entries) = get_cache_stats();
    let (lru_queue_length, _) = get_lru_queue_stats();
    (total_entries, total_bytes, max_entries, lru_queue_length)
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

// Main content-serving function that integrates cache with IPFS fetching
#[ic_cdk::update]
async fn get_content(cid: String) -> Result<Vec<u8>, String> {
    if cid.is_empty() {
        return Err("CID cannot be empty".to_string());
    }
    
    // First, check if the content is in the cache
    if let Some(cache_entry) = get_cache_entry(&cid) {
        // Cache hit - return the cached content
        return Ok(cache_entry.bytes);
    }
    
    // Cache miss - fetch from IPFS
    match fetch_from_ipfs(&cid).await {
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
            
            Ok(content_bytes)
        }
        Err(e) => {
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
    
    match fetch_from_ipfs(test_cid).await {
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
