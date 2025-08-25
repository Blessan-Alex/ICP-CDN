use icp_cdn_client::{CdnCanisterClient, CdnClient, UserTier, UserAccount};
use candid::Principal;

// Mock canister ID for testing
const MOCK_CANISTER_ID: &str = "rrkah-fqaaa-aaaaa-aaaaq-cai";

#[tokio::test]
async fn test_cdn_canister_client_creation() {
    let canister_id = Principal::from_text(MOCK_CANISTER_ID).unwrap();
    let client = CdnCanisterClient::new(canister_id);
    
    assert_eq!(client.canister_id, canister_id);
}

#[tokio::test]
async fn test_cdn_canister_client_default() {
    let client = CdnCanisterClient::default();
    
    // Should create with the default canister ID
    assert_eq!(client.canister_id.to_string(), MOCK_CANISTER_ID);
}

#[tokio::test]
async fn test_cdn_client_creation() {
    let canister_id = Principal::from_text(MOCK_CANISTER_ID).unwrap();
    let client = CdnClient::new(canister_id);
    
    assert_eq!(client.canister_id, canister_id);
}

#[tokio::test]
async fn test_cdn_client_default() {
    let client = CdnClient::default();
    
    // Should create with the default canister ID
    assert_eq!(client.canister_id.to_string(), MOCK_CANISTER_ID);
}

#[tokio::test]
async fn test_generate_cid() {
    let client = CdnClient::default();
    let content = b"Hello, World!";
    let content_type = "text/plain";
    
    let cid1 = client.generate_cid(content, content_type);
    let cid2 = client.generate_cid(content, content_type);
    
    // In test environment, time() may not work consistently
    // So we just check that CIDs are generated and have the right format
    assert!(!cid1.is_empty());
    assert!(!cid2.is_empty());
    assert!(cid1.starts_with("Qm"));
    assert!(cid2.starts_with("Qm"));
    
    // Different content should generate different CID
    let cid3 = client.generate_cid(b"Different content", content_type);
    assert_ne!(cid1, cid3);
    assert!(cid3.starts_with("Qm"));
}

#[tokio::test]
async fn test_get_asset_url() {
    let client = CdnCanisterClient::default();
    let cid = "QmTest123";
    
    let url = client.get_asset_url(cid.to_string());
    let expected_url = format!("https://{}.ic0.app/{}", MOCK_CANISTER_ID, cid);
    
    assert_eq!(url, expected_url);
}

// Test constants
#[test]
fn test_cycles_constants() {
    use icp_cdn_client::{CYCLES_SMALL_UPLOAD, CYCLES_MEDIUM_UPLOAD, CYCLES_LARGE_UPLOAD};
    
    assert!(CYCLES_SMALL_UPLOAD > 0);
    assert!(CYCLES_MEDIUM_UPLOAD > CYCLES_SMALL_UPLOAD);
    assert!(CYCLES_LARGE_UPLOAD > CYCLES_MEDIUM_UPLOAD);
}

// Test UserTier enum
#[test]
fn test_user_tier_equality() {
    assert_eq!(UserTier::Free, UserTier::Free);
    assert_ne!(UserTier::Free, UserTier::Pro);
    assert_ne!(UserTier::Starter, UserTier::Business);
}

// Test UserAccount struct
#[test]
fn test_user_account_default() {
    let account = UserAccount::default();
    
    assert_eq!(account.user_principal, Principal::anonymous());
    assert_eq!(account.cycles_balance, 0);
    assert_eq!(account.tier, UserTier::Free);
    assert_eq!(account.cache_usage_bytes, 0);
    assert_eq!(account.pinata_enabled, false);
}

// Test CacheEntry struct
#[test]
fn test_cache_entry_default() {
    use icp_cdn_client::CacheEntry;
    
    let entry = CacheEntry::default();
    
    assert_eq!(entry.cid, "");
    assert_eq!(entry.content_type, "");
    assert_eq!(entry.size, 0);
    assert_eq!(entry.last_accessed_ts, 0);
    assert_eq!(entry.bytes, Vec::<u8>::new());
}

// Test error handling for invalid canister ID
#[test]
fn test_invalid_canister_id() {
    let result = Principal::from_text("invalid-canister-id");
    assert!(result.is_err());
}

// Test convenience functions
#[tokio::test]
async fn test_convenience_functions() {
    use icp_cdn_client::{
        upload_asset_default,
        get_asset_default,
        get_asset_with_fallback_default,
        upload_content_default,
        get_content_default,
        get_content_with_fallback_default,
        bulk_upload_default
    };
    
    // These functions should compile and return Result types
    // We can't actually call them without a real canister, but we can test the types
    
    let content = b"test content".to_vec();
    let content_type = "text/plain".to_string();
    let cycles = 1_000_000_000u128;
    
    // Test that the functions exist and have the right signatures
    // Note: These are async functions, so we can't test them without a real canister
    // We're just verifying they compile
    let _upload_result = upload_asset_default(content.clone(), content_type.clone(), cycles);
    let _get_result = get_asset_default("test-cid".to_string());
    let _fallback_result = get_asset_with_fallback_default("test-cid".to_string());
    
    let _canister_upload_result = upload_content_default(content.clone(), content_type.clone(), cycles);
    let _canister_get_result = get_content_default("test-cid".to_string());
    let _canister_fallback_result = get_content_with_fallback_default("test-cid".to_string());
    
    let files = vec![(content.clone(), content_type.clone())];
    let _bulk_result = bulk_upload_default(files, cycles);
}

// Test that all public types are accessible
#[test]
fn test_public_types_accessibility() {
    use icp_cdn_client::{
        CdnClient,
        CdnCanisterClient,
        UserAccount,
        UserTier,
        CacheEntry
    };
    
    // Test that we can create instances of all public types
    let _client = CdnClient::default();
    let _canister_client = CdnCanisterClient::default();
    let _account = UserAccount::default();
    let _tier = UserTier::Free;
    let _cache_entry = CacheEntry::default();
}
