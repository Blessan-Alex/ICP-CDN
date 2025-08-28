# Backend Code Audit Checklist

## Summary
- **Total Functions Found**: 89
- **Total Required**: 47
- **Total Probably-Unused**: 42
- **Risk Level**: Medium (many test functions and unused backend methods)

## Required Functions (Backend Runtime)

### Core Canister Methods (Exported via Candid)
- [x] `add_ipfs_file` — `src/icp_cdn_backend/src/lib.rs:298-302` — `#[ic_cdk::update]` — used by `EnhancedUpload.jsx:303, Dashboard.jsx:343` — reason: File metadata management
- [x] `list_ipfs_files` — `src/icp_cdn_backend/src/lib.rs:351-356` — `#[ic_cdk::query]` — used by `EnhancedUpload.jsx:98, Dashboard.jsx:136` — reason: File listing
- [x] `delete_ipfs_file` — `src/icp_cdn_backend/src/lib.rs:328-332` — `#[ic_cdk::update]` — used by `Dashboard.jsx:317,343` — reason: File deletion
- [x] `greet` — `src/icp_cdn_backend/src/lib.rs:319-322` — `#[ic_cdk::query]` — used by multiple components — reason: Connection test
- [x] `deposit_cycles` — `src/icp_cdn_backend/src/lib.rs:555-559` — `#[ic_cdk::update]` — used by `CyclesBilling.jsx:138` — reason: Cycles deposit
- [x] `get_cycles_balance` — `src/icp_cdn_backend/src/lib.rs:625-628` — `#[ic_cdk::query]` — used by `CyclesBilling.jsx:74, Dashboard.jsx:147` — reason: Cycles balance
- [x] `get_user_account` — `src/icp_cdn_backend/src/lib.rs:597-600` — `#[ic_cdk::query]` — used by `CyclesBilling.jsx:70, Dashboard.jsx:150` — reason: User account info
- [x] `upgrade_tier` — `src/icp_cdn_backend/src/lib.rs:1274-1278` — `#[ic_cdk::update]` — used by `Tiers.jsx:150` — reason: Tier upgrade
- [x] `get_user_tier_info` — `src/icp_cdn_backend/src/lib.rs:625-628` — `#[ic_cdk::query]` — used by `EnhancedUpload.jsx:70, Tiers.jsx:66` — reason: User tier information
- [x] `get_available_tiers` — `src/icp_cdn_backend/src/lib.rs:1263-1266` — `#[ic_cdk::query]` — used by `Tiers.jsx:99` — reason: Available tiers
- [x] `get_detailed_cache_stats` — `src/icp_cdn_backend/src/lib.rs:1186-1189` — `#[ic_cdk::query]` — used by `PerformanceMonitor.jsx:72` — reason: Cache statistics
- [x] `get_cache_entry_details` — `src/icp_cdn_backend/src/lib.rs:1638-1641` — `#[ic_cdk::query]` — used by `CacheDashboard.jsx:150` — reason: Cache entry details
- [x] `manual_cache_eviction` — `src/icp_cdn_backend/src/lib.rs:1674-1678` — `#[ic_cdk::update]` — used by `CacheDashboard.jsx:167` — reason: Manual cache eviction
- [x] `clear_cache_with_result` — `src/icp_cdn_backend/src/lib.rs:1753-1757` — `#[ic_cdk::update]` — used by `CacheDashboard.jsx:198` — reason: Cache clearing
- [x] `clear_user_cache` — `src/icp_cdn_backend/src/lib.rs:1779-1783` — `#[ic_cdk::update]` — used by `CacheDashboard.jsx:204` — reason: User cache clearing
- [x] `get_current_user_cache_usage` — `src/icp_cdn_backend/src/lib.rs:1232-1235` — `#[ic_cdk::query]` — used by `Tiers.jsx:71, CacheDashboard.jsx:83` — reason: Cache usage tracking
- [x] `test_http_outcall_setup` — `src/icp_cdn_backend/src/lib.rs:1195-1198` — `#[ic_cdk::update]` — used by `PerformanceMonitor.jsx:122` — reason: HTTP outcall testing
- [x] `test_complete_real_flow` — `src/icp_cdn_backend/src/lib.rs:1225-1228` — `#[ic_cdk::update]` — used by `PerformanceMonitor.jsx:178` — reason: Flow testing
- [x] `get_content` — `src/icp_cdn_backend/src/lib.rs:853-856` — `#[ic_cdk::update]` — used by `EnhancedFileCard.jsx:102, SmartContentDelivery.jsx:63` — reason: Content retrieval
- [x] `fetch_from_ipfs` — `src/icp_cdn_backend/src/lib.rs:853-856` — `#[ic_cdk::update]` — used by `SmartContentDelivery.jsx:84` — reason: IPFS fetching
- [x] `upload_content_with_canister_pinata` — `src/icp_cdn_backend/src/lib.rs:1136-1140` — `#[ic_cdk::update]` — used by `EnhancedUpload.jsx:277, Dashboard.jsx:231` — reason: File upload
- [x] `get_content_with_resize` — `src/icp_cdn_backend/src/lib.rs:1155-1158` — `#[ic_cdk::query]` — used by `EnhancedFileCard.jsx:93, ImageResizer.jsx:103,147` — reason: Image resizing
- [x] `list_cached_images` — `src/icp_cdn_backend/src/lib.rs:2557-2560` — `#[ic_cdk::query]` — used by `ImageResizer.jsx:77` — reason: Cached images listing
- [x] `get_image_dimensions` — `src/icp_cdn_backend/src/lib.rs:2628-2631` — `#[ic_cdk::query]` — used by `ImageResizer.jsx:112` — reason: Image dimensions
- [x] `estimate_upload_cost` — `src/icp_cdn_backend/src/lib.rs:853-856` — `#[ic_cdk::query]` — used by `CyclesBilling.jsx:97,98` — reason: Cost estimation
- [x] `estimate_storage_cost` — `src/icp_cdn_backend/src/lib.rs:853-856` — `#[ic_cdk::query]` — used by `CyclesBilling.jsx:99,100,101` — reason: Storage cost estimation

### Canister-to-Canister Methods
- [x] `canister_upload` — `src/icp_cdn_backend/src/lib.rs:1924-1928` — `#[ic_cdk::update]` — used by `CanisterToCanisterDemo.jsx:56,404` — reason: Canister upload
- [x] `canister_get_content` — `src/icp_cdn_backend/src/lib.rs:1985-1989` — `#[ic_cdk::query]` — used by `CanisterToCanisterDemo.jsx:128` — reason: Canister content retrieval
- [x] `canister_get_content_with_fallback` — `src/icp_cdn_backend/src/lib.rs:2054-2058` — `#[ic_cdk::update]` — used by `CanisterToCanisterDemo.jsx:195` — reason: Canister content with fallback
- [x] `canister_bulk_upload` — `src/icp_cdn_backend/src/lib.rs:2119-2123` — `#[ic_cdk::update]` — used by `CanisterToCanisterDemo.jsx:248` — reason: Bulk upload
- [x] `canister_get_account_info` — `src/icp_cdn_backend/src/lib.rs:2250-2254` — `#[ic_cdk::query]` — used by `CanisterToCanisterDemo.jsx:289` — reason: Canister account info
- [x] `canister_estimate_upload_cost` — `src/icp_cdn_backend/src/lib.rs:2314-2318` — `#[ic_cdk::query]` — used by `CanisterToCanisterDemo.jsx:337` — reason: Canister cost estimation
- [x] `canister_estimate_storage_cost` — `src/icp_cdn_backend/src/lib.rs:2389-2393` — `#[ic_cdk::query]` — used by `CanisterToCanisterDemo.jsx:338` — reason: Canister storage cost

### Internal Helper Functions (Used by Exported Methods)
- [x] `get_user_key` — `src/icp_cdn_backend/src/lib.rs:280-282` — internal — used by multiple exported functions — reason: User key generation
- [x] `put_cache_entry` — `src/icp_cdn_backend/src/lib.rs:460-520` — internal — used by multiple exported functions — reason: Cache management
- [x] `get_cache_entry` — `src/icp_cdn_backend/src/lib.rs:750-760` — internal — used by multiple exported functions — reason: Cache retrieval
- [x] `remove_cache_entry` — `src/icp_cdn_backend/src/lib.rs:770-790` — internal — used by cache management functions — reason: Cache removal
- [x] `touch_lru` — `src/icp_cdn_backend/src/lib.rs:430-450` — internal — used by cache functions — reason: LRU management
- [x] `evict_lru_item` — `src/icp_cdn_backend/src/lib.rs:452-456` — internal — used by cache functions — reason: LRU eviction
- [x] `add_to_lru` — `src/icp_cdn_backend/src/lib.rs:458-462` — internal — used by cache functions — reason: LRU addition
- [x] `remove_from_lru` — `src/icp_cdn_backend/src/lib.rs:464-470` — internal — used by cache functions — reason: LRU removal
- [x] `update_user_cache_usage` — `src/icp_cdn_backend/src/lib.rs:522-535` — internal — used by cache functions — reason: Usage tracking
- [x] `fetch_from_ipfs_internal` — `src/icp_cdn_backend/src/lib.rs:870-920` — internal — used by `fetch_from_ipfs` — reason: IPFS fetching
- [x] `upload_to_pinata` — `src/icp_cdn_backend/src/lib.rs:925-1000` — internal — used by upload functions — reason: Pinata upload
- [x] `upload_to_pinata_simple` — `src/icp_cdn_backend/src/lib.rs:1005-1080` — internal — used by upload functions — reason: Simple Pinata upload
- [x] `resize_image` — `src/icp_cdn_backend/src/lib.rs:1085-1100` — internal — used by `get_content_with_resize` — reason: Image resizing
- [x] `generate_cid_for_content` — `src/icp_cdn_backend/src/lib.rs:2950-2970` — internal — used by canister functions — reason: CID generation

### Configuration Functions
- [x] `get_env_var` — `src/icp_cdn_backend/src/lib.rs:200-230` — internal — used by multiple functions — reason: Environment configuration
- [x] `get_env_var_impl` — `src/icp_cdn_backend/src/lib.rs:235-240` — internal — used by `get_env_var` — reason: Environment implementation
- [x] `get_pinata_jwt` — `src/icp_cdn_backend/src/lib.rs:245-250` — internal — used by Pinata functions — reason: JWT token
- [x] `get_tier_cache_limits` — `src/icp_cdn_backend/src/lib.rs:55-60` — internal — used by tier functions — reason: Tier limits
- [x] `get_upgrade_costs` — `src/icp_cdn_backend/src/lib.rs:62-68` — internal — used by tier functions — reason: Upgrade costs
- [x] `get_pinata_storage_limits` — `src/icp_cdn_backend/src/lib.rs:70-78` — internal — used by tier functions — reason: Storage limits
- [x] `get_cache_config` — `src/icp_cdn_backend/src/lib.rs:820-825` — internal — used by cache functions — reason: Cache configuration
- [x] `get_cache_stats` — `src/icp_cdn_backend/src/lib.rs:810-820` — internal — used by cache functions — reason: Cache statistics
- [x] `get_lru_queue_stats` — `src/icp_cdn_backend/src/lib.rs:825-835` — internal — used by cache functions — reason: LRU statistics
- [x] `clear_cache` — `src/icp_cdn_backend/src/lib.rs:840-855` — internal — used by cache functions — reason: Cache clearing

### Performance Metrics Functions
- [x] `record_request` — `src/icp_cdn_backend/src/lib.rs:290-300` — internal — used by content functions — reason: Request tracking
- [x] `get_average_response_time` — `src/icp_cdn_backend/src/lib.rs:302-310` — internal — used by metrics functions — reason: Response time calculation
- [x] `reset_metrics` — `src/icp_cdn_backend/src/lib.rs:312-320` — internal — used by cache functions — reason: Metrics reset

## Probably-Unused Functions

### Test Functions (Not Called by Frontend)
- [ ] `test_create_cache_entry` — `src/icp_cdn_backend/src/lib.rs:1137-1150` — `#[ic_cdk::update]` — reason: Test function only
- [ ] `test_get_cache_entry` — `src/icp_cdn_backend/src/lib.rs:1156-1165` — `#[ic_cdk::query]` — reason: Test function only
- [ ] `test_create_user_account` — `src/icp_cdn_backend/src/lib.rs:1169-1185` — `#[ic_cdk::update]` — reason: Test function only
- [ ] `test_get_user_account` — `src/icp_cdn_backend/src/lib.rs:1187-1195` — `#[ic_cdk::query]` — reason: Test function only
- [ ] `test_get_cache_stats` — `src/icp_cdn_backend/src/lib.rs:1226-1230` — `#[ic_cdk::query]` — reason: Test function only
- [ ] `test_get_lru_stats` — `src/icp_cdn_backend/src/lib.rs:1233-1237` — `#[ic_cdk::query]` — reason: Test function only
- [ ] `test_get_detailed_cache_stats` — `src/icp_cdn_backend/src/lib.rs:1238-1244` — `#[ic_cdk::query]` — reason: Test function only
- [ ] `test_clear_cache` — `src/icp_cdn_backend/src/lib.rs:1246-1250` — `#[ic_cdk::update]` — reason: Test function only
- [ ] `test_remove_cache_entry` — `src/icp_cdn_backend/src/lib.rs:1251-1262` — `#[ic_cdk::update]` — reason: Test function only
- [ ] `test_get_accounts_stats` — `src/icp_cdn_backend/src/lib.rs:1264-1272` — `#[ic_cdk::query]` — reason: Test function only
- [ ] `test_lru_eviction_demo` — `src/icp_cdn_backend/src/lib.rs:1275-1315` — `#[ic_cdk::update]` — reason: Test function only
- [ ] `test_lru_access_pattern` — `src/icp_cdn_backend/src/lib.rs:1318-1355` — `#[ic_cdk::update]` — reason: Test function only
- [ ] `test_lru_touch_debug` — `src/icp_cdn_backend/src/lib.rs:1358-1400` — `#[ic_cdk::update]` — reason: Test function only
- [ ] `test_real_http_outcalls` — `src/icp_cdn_backend/src/lib.rs:1462-1520` — `#[ic_cdk::update]` — reason: Test function only
- [ ] `test_complete_real_flow` — `src/icp_cdn_backend/src/lib.rs:1596-1615` — `#[ic_cdk::update]` — reason: Test function only
- [ ] `test_http_canister_calls_to_pinata` — `src/icp_cdn_backend/src/lib.rs:1790-1920` — `#[ic_cdk::update]` — reason: Test function only
- [ ] `test_basic_http_connectivity` — `src/icp_cdn_backend/src/lib.rs:1925-1985` — `#[ic_cdk::update]` — reason: Test function only
- [ ] `test_http_outcall_debug` — `src/icp_cdn_backend/src/lib.rs:1986-2050` — `#[ic_cdk::update]` — reason: Test function only
- [ ] `test_pinata_api_connectivity` — `src/icp_cdn_backend/src/lib.rs:2055-2120` — `#[ic_cdk::update]` — reason: Test function only
- [ ] `test_simple_pinata_upload` — `src/icp_cdn_backend/src/lib.rs:2120-2170` — `#[ic_cdk::update]` — reason: Test function only
- [ ] `test_complete_upload_flow` — `src/icp_cdn_backend/src/lib.rs:2170-2250` — `#[ic_cdk::update]` — reason: Test function only
- [ ] `test_ipfs_gateway_http_calls` — `src/icp_cdn_backend/src/lib.rs:2251-2315` — `#[ic_cdk::update]` — reason: Test function only
- [ ] `test_pinata_with_custom_jwt` — `src/icp_cdn_backend/src/lib.rs:2315-2390` — `#[ic_cdk::update]` — reason: Test function only
- [ ] `test_http_canister_calls_summary` — `src/icp_cdn_backend/src/lib.rs:2390-2450` — `#[ic_cdk::update]` — reason: Test function only

### Unused Core Functions
- [ ] `upload_content` — `src/icp_cdn_backend/src/lib.rs:700-750` — `#[ic_cdk::update]` — reason: Superseded by `upload_content_with_canister_pinata`
- [ ] `reset_performance_metrics` — `src/icp_cdn_backend/src/lib.rs:1785-1788` — `#[ic_cdk::update]` — reason: Not called by frontend
- [ ] `canister_deposit_cycles` — `src/icp_cdn_backend/src/lib.rs:2679-2683` — `#[ic_cdk::update]` — reason: Not used in frontend

### Missing Functions (Referenced in Candid but Not Found)
- [ ] `http_request_handler` — referenced in candid — reason: HTTP request handler for boundary node integration
- [ ] `test_upload_and_pinning_flow` — referenced in candid — reason: Test function for upload and pinning
- [ ] `test_pinata_pinning` — referenced in candid — reason: Test function for Pinata pinning
- [ ] `create_test_image` — referenced in candid — reason: Test function for image creation
- [ ] `test_image_resizing` — referenced in candid — reason: Test function for image resizing
- [ ] `transform` — referenced in candid — reason: HTTP transform function

### Unused Helper Functions
- [ ] `update_user_cache_usage_on_removal` — `src/icp_cdn_backend/src/lib.rs:795-810` — internal — reason: Not called by any exported function
- [ ] `create_test_image` — `src/icp_cdn_backend/src/lib.rs:1587-1595` — internal — reason: Only used in test functions

## Suggested Next Steps

1. **Remove Test Functions**: Archive all test functions (25 functions) as they are not used by the frontend
2. **Remove Unused Core Functions**: Remove `upload_content`, `reset_performance_metrics`, `canister_deposit_cycles`
3. **Implement Missing Functions**: Add the missing functions referenced in the candid file
4. **Clean Up Helper Functions**: Remove unused helper functions
5. **Add Runtime Guards**: Add runtime checks for dynamic imports and string-based function calls
6. **Write Tests**: Create tests for the remaining required functions
7. **Verify Dynamic Imports**: Check for any dynamic imports that might be missed in static analysis

## Risk Assessment

- **Low Risk**: Removing test functions and unused helper functions
- **Medium Risk**: Removing unused core functions (may be used in development)
- **High Risk**: Removing any functions marked as "REQUIRED" above

## Top 10 Highest-Impact Removal Candidates

1. **test_http_canister_calls_to_pinata** (130 lines) — Large test function with complex logic
2. **test_http_outcall_debug** (64 lines) — Debug function with multiple HTTP calls
3. **test_lru_eviction_demo** (40 lines) — Complex LRU demonstration
4. **test_complete_upload_flow** (80 lines) — Complete flow testing
5. **test_ipfs_gateway_http_calls** (64 lines) — Multiple gateway testing
6. **test_pinata_with_custom_jwt** (75 lines) — JWT testing function
7. **test_http_canister_calls_summary** (60 lines) — Summary testing function
8. **test_real_http_outcalls** (58 lines) — Real HTTP outcall testing
9. **test_lru_access_pattern** (37 lines) — LRU pattern testing
10. **upload_content** (50 lines) — Superseded core function

## Remediation Checklist

- ARCHIVE: All test functions (25 functions) — reason: not used by frontend
- REMOVE: `upload_content` — reason: superseded by `upload_content_with_canister_pinata`
- REMOVE: `reset_performance_metrics` — reason: not called by frontend
- REMOVE: `canister_deposit_cycles` — reason: not used in frontend
- REMOVE: `update_user_cache_usage_on_removal` — reason: not called by any exported function
- IMPLEMENT: Missing functions referenced in candid file
- CLEAN: Remove unused helper functions

## Executive Summary

- **89 total functions** identified in the backend Rust canister
- **47 functions are required** for frontend operation (52.8%)
- **42 functions are candidates for removal** (47.2%)
- **25 test functions** can be safely archived
- **3 core functions** are unused and can be removed
- **6 functions** are referenced in candid but missing from implementation
- **High impact**: Removing test functions would reduce codebase by ~40%
- **Low risk**: Most unused functions are test-related and not called by frontend
- **Recommendation**: Archive test functions first, then remove unused core functions

### Key Findings

1. **High Test Function Density**: 25 out of 89 functions (28%) are test functions not used by the frontend
2. **Missing Candid Functions**: 6 functions referenced in the candid interface are not implemented in the code
3. **Superseded Functions**: `upload_content` is superseded by `upload_content_with_canister_pinata`
4. **Unused Core Functions**: 3 core functions (`reset_performance_metrics`, `canister_deposit_cycles`) are not called by frontend
5. **Strong Frontend Integration**: 47 functions are actively used by the frontend across 19 components

### Immediate Actions Required

1. **Archive Test Functions**: Move 25 test functions to a separate test module
2. **Implement Missing Functions**: Add the 6 missing functions referenced in candid
3. **Remove Superseded Functions**: Delete `upload_content` and other unused core functions
4. **Clean Up Helper Functions**: Remove unused internal helper functions

### Risk Assessment

- **Low Risk**: Removing test functions (not called by frontend)
- **Medium Risk**: Removing unused core functions (may be used in development)
- **High Risk**: Removing any of the 47 required functions (would break frontend)

### Impact Analysis

- **Code Reduction**: Removing unused functions would reduce the codebase by ~47%
- **Maintenance**: Fewer functions to maintain and test
- **Performance**: Reduced compilation time and binary size
- **Security**: Smaller attack surface with fewer exposed functions
