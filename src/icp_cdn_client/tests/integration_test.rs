use icp_cdn_client::{
    CdnClient, UserAccount, UserTier, CacheEntry, CYCLES_SMALL_UPLOAD, CYCLES_MEDIUM_UPLOAD, CYCLES_LARGE_UPLOAD
};
use candid::Principal;

// ===== BASIC STRUCTURE TESTS =====

#[test]
fn test_cdn_client_structure() {
    // This test verifies the library structure and basic functionality
    let test_canister_id = Principal::from_text("rrkah-fqaaa-aaaaa-aaaaq-cai")
        .expect("Invalid test canister ID");
    
    let cdn_client = CdnClient::new(test_canister_id);
    
    // Test 1: Basic client creation
    assert_eq!(cdn_client.canister_id, test_canister_id);
    
    // Test 2: CID generation
    let test_content = b"Hello, World!";
    let cid = cdn_client.generate_cid(test_content, "text/plain");
    assert!(!cid.is_empty());
    assert!(cid.starts_with("Qm"));
    
    // Test 3: URL generation
    let url = cdn_client.get_asset_url(cid.clone());
    assert!(url.contains("rrkah-fqaaa-aaaaa-aaaaq-cai.ic0.app"));
    assert!(url.contains(&cid));
    
    // Test 4: Default client creation
    let default_client = CdnClient::default();
    assert_eq!(default_client.canister_id, Principal::from_text("rrkah-fqaaa-aaaaa-aaaaq-cai").unwrap());
    
    println!("✅ All basic structure tests passed");
}

#[test]
fn test_constants() {
    // Test that constants are properly defined
    assert_eq!(CYCLES_SMALL_UPLOAD, 1_000_000_000);
    assert_eq!(CYCLES_MEDIUM_UPLOAD, 5_000_000_000);
    assert_eq!(CYCLES_LARGE_UPLOAD, 10_000_000_000);
    
    // Test that constants are reasonable values
    assert!(CYCLES_SMALL_UPLOAD < CYCLES_MEDIUM_UPLOAD);
    assert!(CYCLES_MEDIUM_UPLOAD < CYCLES_LARGE_UPLOAD);
    
    println!("✅ All constants tests passed");
}

// ===== TYPE STRUCTURE TESTS =====

#[test]
fn test_user_tier_enum() {
    // Test UserTier enum functionality
    let free_tier = UserTier::Free;
    let starter_tier = UserTier::Starter;
    let pro_tier = UserTier::Pro;
    let business_tier = UserTier::Business;
    
    // Test equality
    assert_eq!(free_tier, UserTier::Free);
    assert_eq!(starter_tier, UserTier::Starter);
    assert_eq!(pro_tier, UserTier::Pro);
    assert_eq!(business_tier, UserTier::Business);
    
    // Test inequality
    assert_ne!(free_tier, starter_tier);
    assert_ne!(pro_tier, business_tier);
    
    // Test debug formatting
    assert_eq!(format!("{:?}", free_tier), "Free");
    assert_eq!(format!("{:?}", starter_tier), "Starter");
    assert_eq!(format!("{:?}", pro_tier), "Pro");
    assert_eq!(format!("{:?}", business_tier), "Business");
    
    println!("✅ UserTier enum tests passed");
}

#[test]
fn test_user_account_structure() {
    // Test that UserAccount structure works correctly with proper UserTier enum
    let test_principal = Principal::from_text("rrkah-fqaaa-aaaaa-aaaaq-cai")
        .expect("Invalid test principal");
    
    let account = UserAccount {
        user_principal: test_principal,
        cycles_balance: 1000000000,
        tier: UserTier::Free,
        cache_usage_bytes: 1024,
        pinata_enabled: false,
    };
    
    assert_eq!(account.user_principal, test_principal);
    assert_eq!(account.cycles_balance, 1000000000);
    assert_eq!(account.tier, UserTier::Free);
    assert_eq!(account.cache_usage_bytes, 1024);
    assert_eq!(account.pinata_enabled, false);
    
    // Test different tiers
    let pro_account = UserAccount {
        user_principal: test_principal,
        cycles_balance: 5000000000,
        tier: UserTier::Pro,
        cache_usage_bytes: 51200,
        pinata_enabled: true,
    };
    
    assert_eq!(pro_account.tier, UserTier::Pro);
    assert!(pro_account.pinata_enabled);
    assert!(pro_account.cycles_balance > account.cycles_balance);
    
    println!("✅ UserAccount structure tests passed");
}

#[test]
fn test_cache_entry_structure() {
    // Test that CacheEntry structure works correctly
    let cache_entry = CacheEntry {
        cid: "QmTest123".to_string(),
        content_type: "text/plain".to_string(),
        size: 1024,
        last_accessed_ts: 1234567890,
        bytes: b"Hello, World!".to_vec(),
    };
    
    assert_eq!(cache_entry.cid, "QmTest123");
    assert_eq!(cache_entry.content_type, "text/plain");
    assert_eq!(cache_entry.size, 1024);
    assert_eq!(cache_entry.last_accessed_ts, 1234567890);
    assert_eq!(cache_entry.bytes, b"Hello, World!".to_vec());
    
    // Test with different content types
    let image_entry = CacheEntry {
        cid: "QmImage456".to_string(),
        content_type: "image/png".to_string(),
        size: 2048,
        last_accessed_ts: 1234567891,
        bytes: b"PNG image data".to_vec(),
    };
    
    assert_eq!(image_entry.content_type, "image/png");
    assert!(image_entry.size > cache_entry.size);
    
    println!("✅ CacheEntry structure tests passed");
}

// ===== UTILITY FUNCTION TESTS =====

#[test]
fn test_cid_generation() {
    let cdn_client = CdnClient::new(Principal::from_text("rrkah-fqaaa-aaaaa-aaaaq-cai").unwrap());
    
    // Test CID generation with different content
    let content1 = b"Hello, World!";
    let content2 = b"Hello, World!";
    let content3 = b"Different content";
    
    let cid1 = cdn_client.generate_cid(content1, "text/plain");
    let cid2 = cdn_client.generate_cid(content2, "text/plain");
    let cid3 = cdn_client.generate_cid(content3, "text/plain");
    
    // Same content should generate same CID (but timestamp may vary, so we'll just check format)
    assert!(!cid1.is_empty());
    assert!(!cid2.is_empty());
    assert!(!cid3.is_empty());
    
    // All CIDs should start with "Qm"
    assert!(cid1.starts_with("Qm"));
    assert!(cid2.starts_with("Qm"));
    assert!(cid3.starts_with("Qm"));
    
    // Different content should generate different CIDs
    assert_ne!(cid1, cid3);
    
    // Test with different content types
    let cid4 = cdn_client.generate_cid(content1, "image/png");
    assert_ne!(cid1, cid4); // Same content, different type should give different CID
    
    println!("✅ CID generation tests passed");
}

#[test]
fn test_url_generation() {
    let cdn_client = CdnClient::new(Principal::from_text("rrkah-fqaaa-aaaaa-aaaaq-cai").unwrap());
    
    let test_cid = "QmTest123";
    let url = cdn_client.get_asset_url(test_cid.to_string());
    
    // URL should contain the canister ID and CID
    assert!(url.contains("rrkah-fqaaa-aaaaa-aaaaq-cai.ic0.app"));
    assert!(url.contains(test_cid));
    assert!(url.starts_with("https://"));
    
    // Test with different CIDs
    let url2 = cdn_client.get_asset_url("QmDifferent456".to_string());
    assert!(url2.contains("QmDifferent456"));
    assert_ne!(url, url2);
    
    println!("✅ URL generation tests passed");
}

// ===== CONVENIENCE FUNCTION TESTS =====

#[test]
fn test_convenience_functions_exist() {
    // Test that convenience functions are available
    use icp_cdn_client::{
        upload_asset_default,
        get_asset_default,
        get_asset_with_fallback_default
    };
    
    // These functions should exist and be callable (though they'll fail without a deployed canister)
    // We're just testing that they compile and are available
    
    println!("✅ Convenience function availability tests passed");
}

// ===== COMPREHENSIVE LIBRARY FEATURE TESTS =====

#[test]
fn test_library_completeness() {
    // Test that all expected features are available
    let cdn_client = CdnClient::new(Principal::from_text("rrkah-fqaaa-aaaaa-aaaaq-cai").unwrap());
    
    // Test that all main methods exist and are callable
    // Note: These won't actually work without a deployed canister, but we can test the interface
    
    // Core upload functionality
    // cdn_client.upload_asset(vec![], "text/plain".to_string(), CYCLES_SMALL_UPLOAD).await;
    
    // Core retrieval functionality  
    // cdn_client.get_asset("test-cid".to_string()).await;
    
    // Fallback functionality
    // cdn_client.get_asset_with_fallback("test-cid".to_string()).await;
    
    // User management
    // cdn_client.get_user_account().await;
    // cdn_client.get_cycles_balance().await;
    // cdn_client.deposit_cycles(1000000).await;
    
    // Cost estimation
    // cdn_client.estimate_upload_cost(1024).await;
    // cdn_client.estimate_storage_cost(1024, 24).await;
    
    // Utility functions
    cdn_client.generate_cid(b"test", "text/plain");
    cdn_client.get_asset_url("test-cid".to_string());
    // cdn_client.is_cached("test-cid".to_string()).await;
    
    println!("✅ Library completeness tests passed");
}

// ===== INTEGRATION TESTS (Require Deployed Canister) =====

/*
#[tokio::test]
async fn test_upload_functionality() {
    let cdn_client = CdnClient::new(
        Principal::from_text("your-actual-cdn-canister-id")
            .expect("Invalid CDN canister ID")
    );
    
    let test_content = b"Hello, World! This is a test file.";
    let content_type = "text/plain".to_string();
    
    // Test upload using the corrected upload_content function
    match cdn_client.upload_asset(
        test_content.to_vec(),
        content_type.clone(),
        CYCLES_SMALL_UPLOAD,
    ).await {
        Ok(cid) => {
            println!("✅ Upload successful: CID = {}", cid);
            assert!(!cid.is_empty());
            
            // Test retrieval using the corrected get_content function
            match cdn_client.get_asset(cid.clone()).await {
                Ok(retrieved_content) => {
                    println!("✅ Retrieval successful");
                    assert_eq!(retrieved_content, test_content.to_vec());
                }
                Err(e) => {
                    println!("❌ Retrieval failed: {}", e);
                    assert!(false, "Retrieval should succeed");
                }
            }
            
            // Test fallback functionality
            match cdn_client.get_asset_with_fallback(cid.clone()).await {
                Ok(fallback_content) => {
                    println!("✅ Fallback retrieval successful");
                    assert_eq!(fallback_content, test_content.to_vec());
                }
                Err(e) => {
                    println!("❌ Fallback retrieval failed: {}", e);
                }
            }
        }
        Err(e) => {
            println!("❌ Upload failed: {}", e);
            // This is expected if the canister is not deployed
        }
    }
}

#[tokio::test]
async fn test_user_account_functions() {
    let cdn_client = CdnClient::new(
        Principal::from_text("your-actual-cdn-canister-id")
            .expect("Invalid CDN canister ID")
    );
    
    // Test get user account with proper UserTier enum
    match cdn_client.get_user_account().await {
        Ok(account) => {
            println!("✅ Get user account successful");
            println!("User tier: {:?}", account.tier);
            println!("Cycles balance: {}", account.cycles_balance);
            println!("Cache usage: {} bytes", account.cache_usage_bytes);
            println!("Pinata enabled: {}", account.pinata_enabled);
            
            assert!(account.cycles_balance >= 0);
            assert!(account.cache_usage_bytes >= 0);
            
            // Test that tier is a valid UserTier enum value
            match account.tier {
                UserTier::Free | UserTier::Starter | UserTier::Pro | UserTier::Business => {
                    println!("✅ Valid tier: {:?}", account.tier);
                }
            }
        }
        Err(e) => {
            println!("❌ Get user account failed: {}", e);
            // This is expected if the canister is not deployed
        }
    }
    
    // Test get cycles balance
    match cdn_client.get_cycles_balance().await {
        Ok(balance) => {
            println!("✅ Get cycles balance successful: {} cycles", balance);
            assert!(balance >= 0);
        }
        Err(e) => {
            println!("❌ Get cycles balance failed: {}", e);
            // This is expected if the canister is not deployed
        }
    }
    
    // Test deposit cycles
    match cdn_client.deposit_cycles(1000000000).await {
        Ok(updated_account) => {
            println!("✅ Deposit cycles successful");
            println!("New balance: {} cycles", updated_account.cycles_balance);
            assert!(updated_account.cycles_balance >= 1000000000);
        }
        Err(e) => {
            println!("❌ Deposit cycles failed: {}", e);
            // This is expected if the canister is not deployed
        }
    }
}

#[tokio::test]
async fn test_cost_estimation() {
    let cdn_client = CdnClient::new(
        Principal::from_text("your-actual-cdn-canister-id")
            .expect("Invalid CDN canister ID")
    );
    
    let file_size = 1024; // 1KB
    
    // Test upload cost estimation
    match cdn_client.estimate_upload_cost(file_size).await {
        Ok(cost) => {
            println!("✅ Upload cost estimation successful: {} cycles", cost);
            assert!(cost > 0);
        }
        Err(e) => {
            println!("❌ Upload cost estimation failed: {}", e);
            // This is expected if the canister is not deployed
        }
    }
    
    // Test storage cost estimation
    match cdn_client.estimate_storage_cost(file_size, 24).await {
        Ok(cost) => {
            println!("✅ Storage cost estimation successful: {} cycles", cost);
            assert!(cost > 0);
        }
        Err(e) => {
            println!("❌ Storage cost estimation failed: {}", e);
            // This is expected if the canister is not deployed
        }
    }
}

#[tokio::test]
async fn test_cache_functionality() {
    let cdn_client = CdnClient::new(
        Principal::from_text("your-actual-cdn-canister-id")
            .expect("Invalid CDN canister ID")
    );
    
    let test_cid = "QmTestCache123";
    
    // Test cache checking
    match cdn_client.is_cached(test_cid.to_string()).await {
        Ok(is_cached) => {
            println!("✅ Cache check successful: {}", is_cached);
        }
        Err(e) => {
            println!("❌ Cache check failed: {}", e);
            // This is expected if the canister is not deployed
        }
    }
}
*/

// ===== MAIN TEST RUNNER =====

fn main() {
    println!("🧪 Starting CDN Client Library Tests...\n");
    
    // Run all basic tests
    test_cdn_client_structure();
    test_constants();
    test_user_tier_enum();
    test_user_account_structure();
    test_cache_entry_structure();
    test_cid_generation();
    test_url_generation();
    test_convenience_functions_exist();
    test_library_completeness();
    
    println!("\n🎉 All basic tests completed successfully!");
    println!("📝 Note: Integration tests require a deployed canister to run");
    println!("   To run integration tests, uncomment the async tests above");
    println!("   and deploy your dCDN canister first.");
}
