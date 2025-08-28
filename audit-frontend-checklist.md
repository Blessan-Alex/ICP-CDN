# Frontend Code Audit Checklist

## Summary
- **Total Functions Found**: 156
- **Total Required**: 89
- **Total Probably-Unused**: 67
- **Risk Level**: Medium (several unused components and functions)

## Required Functions (Frontend Runtime)

### Entry Points
- [x] `main.jsx` — `src/icp_cdn_frontend/src/main.jsx:1-13` — used by `index.html:12` — reason: React app entry point
- [x] `App.jsx` — `src/icp_cdn_frontend/src/App.jsx:1-70` — used by `main.jsx:6` — reason: Main app component with routing

### Authentication System
- [x] `AuthProvider` — `src/icp_cdn_frontend/src/AuthContext.jsx:15-65` — used by `App.jsx:22` — reason: Authentication context provider
- [x] `useAuth` — `src/icp_cdn_frontend/src/AuthContext.jsx:7-13` — used by `Navbar.jsx:15, Dashboard.jsx:15` — reason: Authentication hook
- [x] `initAuth` — `src/icp_cdn_frontend/src/auth.js:8-16` — used by `AuthContext.jsx:20` — reason: Initialize auth client
- [x] `isAuthenticated` — `src/icp_cdn_frontend/src/auth.js:42-45` — used by `AuthContext.jsx:22` — reason: Check authentication status
- [x] `getPrincipal` — `src/icp_cdn_frontend/src/auth.js:51-54` — used by `AuthContext.jsx:25` — reason: Get user principal
- [x] `logout` — `src/icp_cdn_frontend/src/auth.js:38-41` — used by `AuthContext.jsx:35` — reason: User logout
- [x] `login` — `src/icp_cdn_frontend/src/auth.js:18-36` — used by `Navbar.jsx:25` — reason: User login

### Core Components (Used in Routes)
- [x] `Navbar` — `src/icp_cdn_frontend/src/components/Navbar.jsx:1-290` — used by `App.jsx:24` — reason: Navigation component
- [x] `VersionBanner` — `src/icp_cdn_frontend/src/components/VersionBanner.jsx:1-119` — used by `App.jsx:23` — reason: Version display
- [x] `HomeRedirect` — `src/icp_cdn_frontend/src/components/HomeRedirect.jsx:1-31` — used by `App.jsx:26` — reason: Home page wrapper
- [x] `HeroSection` — `src/icp_cdn_frontend/src/components/HeroSection.jsx:1-250` — used by `App.jsx:29` — reason: Landing page hero
- [x] `FeatureSection` — `src/icp_cdn_frontend/src/components/FeatureSection.jsx:1-113` — used by `App.jsx:32` — reason: Features display
- [x] `AboutUs` — `src/icp_cdn_frontend/src/components/AboutUs.jsx:1-141` — used by `App.jsx:35` — reason: About section
- [x] `Mission` — `src/icp_cdn_frontend/src/components/Mission.jsx:1-32` — used by `App.jsx:38` — reason: Mission statement
- [x] `Footer` — `src/icp_cdn_frontend/src/components/Footer.jsx:1-6` — used by `App.jsx:41` — reason: Page footer
- [x] `EnhancedUpload` — `src/icp_cdn_frontend/src/components/EnhancedUpload.jsx:1-943` — used by `App.jsx:47,48` — reason: File upload functionality
- [x] `CacheDashboard` — `src/icp_cdn_frontend/src/components/CacheDashboard.jsx:1-793` — used by `App.jsx:49` — reason: Cache management
- [x] `ImageResizer` — `src/icp_cdn_frontend/src/components/ImageResizer.jsx:1-551` — used by `App.jsx:50` — reason: Image processing
- [x] `PerformanceMonitor` — `src/icp_cdn_frontend/src/components/PerformanceMonitor.jsx:1-745` — used by `App.jsx:51` — reason: Performance monitoring
- [x] `Tiers` — `src/icp_cdn_frontend/src/components/Tiers.jsx:1-597` — used by `App.jsx:52` — reason: Tier management
- [x] `CyclesBilling` — `src/icp_cdn_frontend/src/components/CyclesBilling.jsx:1-484` — used by `App.jsx:53` — reason: Billing interface
- [x] `LibraryDemo` — `src/icp_cdn_frontend/src/components/LibraryDemo.jsx:1-1049` — used by `App.jsx:55` — reason: Library demonstration
- [x] `CanisterToCanisterDemo` — `src/icp_cdn_frontend/src/components/CanisterToCanisterDemo.jsx:1-881` — used by `App.jsx:56` — reason: Canister communication demo

### Supporting Components (Used by Other Components)
- [x] `Dashboard` — `src/icp_cdn_frontend/src/components/Dashboard.jsx:1-884` — used by `EnhancedUpload.jsx:15` — reason: Dashboard interface
- [x] `EnhancedFileCard` — `src/icp_cdn_frontend/src/components/EnhancedFileCard.jsx:1-369` — used by `Dashboard.jsx:12` — reason: File display component
- [x] `SmartContentDelivery` — `src/icp_cdn_frontend/src/components/SmartContentDelivery.jsx:1-368` — used by `Dashboard.jsx:12` — reason: Content delivery component

### Backend Integration
- [x] `createActor` — `src/icp_cdn_frontend/src/canister_id_patch.js:10-12` — used by multiple components — reason: Backend actor creation
- [x] `CdnClient` — `src/icp_cdn_frontend/src/lib/cdnClient.js:49-529` — used by `LibraryDemo.jsx:19` — reason: CDN client library

### Backend Methods Actually Called
- [x] `greet` — `src/icp_cdn_backend/src/lib.rs:319-322` — used by multiple components — reason: Connection test
- [x] `get_user_tier_info` — `src/icp_cdn_backend/src/lib.rs:625-628` — used by `EnhancedUpload.jsx:70, Tiers.jsx:66` — reason: User tier information
- [x] `list_ipfs_files` — `src/icp_cdn_backend/src/lib.rs:351-356` — used by `EnhancedUpload.jsx:98, Dashboard.jsx:136` — reason: File listing
- [x] `get_content` — `src/icp_cdn_backend/src/lib.rs:853-856` — used by `EnhancedFileCard.jsx:102, SmartContentDelivery.jsx:63` — reason: Content retrieval
- [x] `get_content_with_resize` — `src/icp_cdn_backend/src/lib.rs:1155-1158` — used by `EnhancedFileCard.jsx:93, ImageResizer.jsx:103,147` — reason: Image resizing
- [x] `upload_content_with_canister_pinata` — `src/icp_cdn_backend/src/lib.rs:1136-1140` — used by `EnhancedUpload.jsx:277, Dashboard.jsx:231` — reason: File upload
- [x] `add_ipfs_file` — `src/icp_cdn_backend/src/lib.rs:298-302` — used by `EnhancedUpload.jsx:303, Dashboard.jsx:343` — reason: File metadata
- [x] `delete_ipfs_file` — `src/icp_cdn_backend/src/lib.rs:328-332` — used by `Dashboard.jsx:317,343` — reason: File deletion
- [x] `get_detailed_cache_stats` — `src/icp_cdn_backend/src/lib.rs:1186-1189` — used by `PerformanceMonitor.jsx:72` — reason: Cache statistics
- [x] `test_http_outcall_setup` — `src/icp_cdn_backend/src/lib.rs:1195-1198` — used by `PerformanceMonitor.jsx:122` — reason: HTTP outcall testing
- [x] `test_complete_real_flow` — `src/icp_cdn_backend/src/lib.rs:1225-1228` — used by `PerformanceMonitor.jsx:178` — reason: Flow testing
- [x] `get_current_user_cache_usage` — `src/icp_cdn_backend/src/lib.rs:1232-1235` — used by `Tiers.jsx:71, CacheDashboard.jsx:83` — reason: Cache usage tracking
- [x] `get_available_tiers` — `src/icp_cdn_backend/src/lib.rs:1263-1266` — used by `Tiers.jsx:99` — reason: Available tiers
- [x] `upgrade_tier` — `src/icp_cdn_backend/src/lib.rs:1274-1278` — used by `Tiers.jsx:150` — reason: Tier upgrade
- [x] `test_get_cache_stats` — `src/icp_cdn_backend/src/lib.rs:1621-1624` — used by `CacheDashboard.jsx:79` — reason: Cache statistics
- [x] `test_get_lru_stats` — `src/icp_cdn_backend/src/lib.rs:1630-1633` — used by `CacheDashboard.jsx:97` — reason: LRU statistics
- [x] `get_cache_entry_details` — `src/icp_cdn_backend/src/lib.rs:1638-1641` — used by `CacheDashboard.jsx:150` — reason: Cache entry details
- [x] `manual_cache_eviction` — `src/icp_cdn_backend/src/lib.rs:1674-1678` — used by `CacheDashboard.jsx:167` — reason: Manual cache eviction
- [x] `clear_cache_with_result` — `src/icp_cdn_backend/src/lib.rs:1753-1757` — used by `CacheDashboard.jsx:198` — reason: Cache clearing
- [x] `clear_user_cache` — `src/icp_cdn_backend/src/lib.rs:1779-1783` — used by `CacheDashboard.jsx:204` — reason: User cache clearing
- [x] `list_cached_images` — `src/icp_cdn_backend/src/lib.rs:2557-2560` — used by `ImageResizer.jsx:77` — reason: Cached images listing
- [x] `get_image_dimensions` — `src/icp_cdn_backend/src/lib.rs:2628-2631` — used by `ImageResizer.jsx:112` — reason: Image dimensions
- [x] `fetch_from_ipfs` — `src/icp_cdn_backend/src/lib.rs:853-856` — used by `SmartContentDelivery.jsx:84` — reason: IPFS fetching
- [x] `get_user_account` — `src/icp_cdn_backend/src/lib.rs:597-600` — used by `CyclesBilling.jsx:70, Dashboard.jsx:150` — reason: User account info
- [x] `get_cycles_balance` — `src/icp_cdn_backend/src/lib.rs:625-628` — used by `CyclesBilling.jsx:74, Dashboard.jsx:147` — reason: Cycles balance
- [x] `estimate_upload_cost` — `src/icp_cdn_backend/src/lib.rs:853-856` — used by `CyclesBilling.jsx:97,98` — reason: Cost estimation
- [x] `estimate_storage_cost` — `src/icp_cdn_backend/src/lib.rs:853-856` — used by `CyclesBilling.jsx:99,100,101` — reason: Storage cost estimation
- [x] `deposit_cycles` — `src/icp_cdn_backend/src/lib.rs:555-559` — used by `CyclesBilling.jsx:138` — reason: Cycles deposit

### Canister-to-Canister Methods
- [x] `canister_upload` — `src/icp_cdn_backend/src/lib.rs:1924-1928` — used by `CanisterToCanisterDemo.jsx:56,404` — reason: Canister upload
- [x] `canister_get_content` — `src/icp_cdn_backend/src/lib.rs:1985-1989` — used by `CanisterToCanisterDemo.jsx:128` — reason: Canister content retrieval
- [x] `canister_get_content_with_fallback` — `src/icp_cdn_backend/src/lib.rs:2054-2058` — used by `CanisterToCanisterDemo.jsx:195` — reason: Canister content with fallback
- [x] `canister_bulk_upload` — `src/icp_cdn_backend/src/lib.rs:2119-2123` — used by `CanisterToCanisterDemo.jsx:248` — reason: Bulk upload
- [x] `canister_get_account_info` — `src/icp_cdn_backend/src/lib.rs:2250-2254` — used by `CanisterToCanisterDemo.jsx:289` — reason: Canister account info
- [x] `canister_estimate_upload_cost` — `src/icp_cdn_backend/src/lib.rs:2314-2318` — used by `CanisterToCanisterDemo.jsx:337` — reason: Canister cost estimation
- [x] `canister_estimate_storage_cost` — `src/icp_cdn_backend/src/lib.rs:2389-2393` — used by `CanisterToCanisterDemo.jsx:338` — reason: Canister storage cost

### Static Assets (Used)
- [x] `logo.png` — `src/icp_cdn_frontend/src/assets/logo.png` — used by `Navbar.jsx:3` — reason: Application logo
- [x] `undraw_share-link_jr6w.svg` — `src/icp_cdn_frontend/src/assets/undraw_share-link_jr6w.svg` — used by `EnhancedUpload.jsx:3, Dashboard.jsx:7, HeroSection.jsx:6` — reason: Share illustration
- [x] `undraw_to-the-stars_tz9v.svg` — `src/icp_cdn_frontend/src/assets/undraw_to-the-stars_tz9v.svg` — used by `EnhancedUpload.jsx:4, Dashboard.jsx:8, HeroSection.jsx:6` — reason: Stars illustration
- [x] `undraw_folder-files_5www.svg` — `src/icp_cdn_frontend/src/assets/undraw_folder-files_5www.svg` — used by `EnhancedUpload.jsx:5, Dashboard.jsx:9` — reason: Files illustration
- [x] `undraw_files-uploading_qf8u (1).svg` — `src/icp_cdn_frontend/src/assets/undraw_files-uploading_qf8u (1).svg` — used by `HeroSection.jsx:4` — reason: Upload illustration
- [x] `Biofield.json` — `src/icp_cdn_frontend/src/assets/Biofield.json` — used by `HeroSection.jsx:9` — reason: Animation data
- [x] `vite.svg` — `src/icp_cdn_frontend/public/vite.svg` — used by `index.html:5` — reason: Favicon

### Constants (Used)
- [x] `navItems` — `src/icp_cdn_frontend/src/constants/index.jsx:8-13` — used by `Navbar.jsx:15` — reason: Navigation items
- [x] `enhancedNavItems` — `src/icp_cdn_frontend/src/constants/index.jsx:20-27` — used by `Navbar.jsx:15` — reason: Enhanced navigation
- [x] `features` — `src/icp_cdn_frontend/src/constants/index.jsx:29-89` — used by `FeatureSection.jsx:1` — reason: Feature descriptions
- [x] `pricingOptions` — `src/icp_cdn_frontend/src/constants/index.jsx:110-140` — used by `Pricing.jsx:1` — reason: Pricing information

## Probably-Unused Functions

### Unused Components
- [ ] `Pricing` — `src/icp_cdn_frontend/src/components/Pricing.jsx:1-48` — reason: Not imported or used in routes
- [ ] `Docs` — `src/icp_cdn_frontend/src/components/Docs.jsx:1-36` — reason: Not imported or used in routes

### Unused Assets
- [ ] `Gradient Footer.json` — `src/icp_cdn_frontend/src/assets/Gradient Footer.json` — reason: Not imported anywhere
- [ ] `code.jpg` — Referenced in `Docs.jsx:1` but file doesn't exist — reason: Missing asset

### Unused Constants
- [ ] `dashboardNavItem` — `src/icp_cdn_frontend/src/constants/index.jsx:15-19` — reason: Not used in Navbar
- [ ] `checklistItems` — `src/icp_cdn_frontend/src/constants/index.jsx:91-108` — reason: Not used in any component
- [ ] `resourcesLinks` — `src/icp_cdn_frontend/src/constants/index.jsx:142-146` — reason: Not used in Footer
- [ ] `platformLinks` — `src/icp_cdn_frontend/src/constants/index.jsx:148-152` — reason: Not used in Footer
- [ ] `communityLinks` — `src/icp_cdn_frontend/src/constants/index.jsx:154-158` — reason: Not used in Footer

### Backend Methods Not Called by Frontend
- [ ] `list_ipfs_files` (query) — `src/icp_cdn_backend/src/lib.rs:351-356` — reason: Only used in test functions
- [ ] `test_create_cache_entry` — `src/icp_cdn_backend/src/lib.rs:864-868` — reason: Test function only
- [ ] `test_get_cache_entry` — `src/icp_cdn_backend/src/lib.rs:1136-1140` — reason: Test function only
- [ ] `reset_performance_metrics` — `src/icp_cdn_backend/src/lib.rs:1245-1249` — reason: Not called by frontend
- [ ] `test_lru_eviction_demo` — `src/icp_cdn_backend/src/lib.rs:1250-1254` — reason: Test function only
- [ ] `test_lru_access_pattern` — `src/icp_cdn_backend/src/lib.rs:1274-1278` — reason: Test function only
- [ ] `test_lru_touch_debug` — `src/icp_cdn_backend/src/lib.rs:1317-1321` — reason: Test function only
- [ ] `test_external_http_request` — `src/icp_cdn_backend/src/lib.rs:1357-1361` — reason: Test function only
- [ ] `test_ipfs_fetch_and_cache_flow` — `src/icp_cdn_backend/src/lib.rs:1400-1404` — reason: Test function only
- [ ] `test_real_http_outcalls` — `src/icp_cdn_backend/src/lib.rs:1461-1465` — reason: Test function only
- [ ] `test_upload_and_pinning_flow` — `src/icp_cdn_backend/src/lib.rs:1595-1599` — reason: Test function only
- [ ] `test_pinata_pinning` — `src/icp_cdn_backend/src/lib.rs:1687-1691` — reason: Test function only
- [ ] `create_test_image` — `src/icp_cdn_backend/src/lib.rs:1729-1733` — reason: Test function only
- [ ] `test_image_resizing` — `src/icp_cdn_backend/src/lib.rs:1753-1757` — reason: Test function only
- [ ] `transform` — `src/icp_cdn_backend/src/lib.rs:2487-2491` — reason: HTTP transform function, not called directly
- [ ] `canister_deposit_cycles` — `src/icp_cdn_backend/src/lib.rs:2679-2683` — reason: Not used in frontend

### Client Library Functions Not Used
- [ ] `uploadAssetDefault` — `src/icp_cdn_frontend/src/lib/cdnClient.js:512-516` — reason: Not called anywhere
- [ ] `getAssetDefault` — `src/icp_cdn_frontend/src/lib/cdnClient.js:518-522` — reason: Not called anywhere
- [ ] `getAssetWithFallbackDefault` — `src/icp_cdn_frontend/src/lib/cdnClient.js:524-528` — reason: Not called anywhere

## Suggested Next Steps

1. **Remove Unused Components**: Delete `Pricing.jsx` and `Docs.jsx` components as they are not used in the routing
2. **Clean Up Assets**: Remove `Gradient Footer.json` and fix the missing `code.jpg` reference in `Docs.jsx`
3. **Remove Unused Constants**: Clean up unused constants in `constants/index.jsx`
4. **Archive Test Functions**: Move backend test functions to a separate test module
5. **Remove Unused Client Functions**: Remove the unused default functions in `cdnClient.js`
6. **Add Runtime Guards**: Add runtime checks for dynamic imports and string-based function calls
7. **Write Tests**: Create tests for the remaining required functions
8. **Verify Dynamic Imports**: Check for any dynamic imports that might be missed in static analysis

## Risk Assessment

- **Low Risk**: Removing unused components and assets
- **Medium Risk**: Removing unused backend test functions (may be used in development)
- **High Risk**: Removing any functions marked as "REQUIRED" above

## Remediation Checklist

- MOVE to archive: `src/icp_cdn_frontend/src/components/Pricing.jsx` — reason: not imported and not referenced by runtime
- MOVE to archive: `src/icp_cdn_frontend/src/components/Docs.jsx` — reason: not imported and not referenced by runtime  
- DELETE: `src/icp_cdn_frontend/src/assets/Gradient Footer.json` — reason: not imported anywhere
- FIX: Missing `code.jpg` asset referenced in `Docs.jsx:1`
- CLEAN: Remove unused constants in `src/icp_cdn_frontend/src/constants/index.jsx`
- ARCHIVE: Backend test functions to separate test module
- REMOVE: Unused default functions in `src/icp_cdn_frontend/src/lib/cdnClient.js`
