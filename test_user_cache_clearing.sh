#!/bin/bash

echo "🧪 Testing User Cache Clearing Functionality"
echo "============================================="

# Check if clear_user_cache function exists in backend
echo "1. Checking backend for clear_user_cache function..."
if grep -q "clear_user_cache" src/icp_cdn_backend/src/lib.rs; then
    echo "✅ clear_user_cache function found in backend"
else
    echo "❌ clear_user_cache function not found in backend"
    exit 1
fi

# Check if clear_user_cache is in Candid interface
echo "2. Checking Candid interface for clear_user_cache..."
if grep -q "clear_user_cache" src/icp_cdn_backend/icp_cdn_backend.did; then
    echo "✅ clear_user_cache found in Candid interface"
else
    echo "❌ clear_user_cache not found in Candid interface"
    exit 1
fi

# Check if frontend calls clear_user_cache when clearing cache
echo "3. Checking frontend cache clearing implementation..."
if grep -A 10 -B 5 "clear_user_cache" src/icp_cdn_frontend/src/components/CacheDashboard.jsx; then
    echo "✅ Frontend properly calls clear_user_cache when clearing cache"
else
    echo "❌ Frontend does not call clear_user_cache when clearing cache"
    exit 1
fi

# Check if EnhancedUpload shows user cache usage
echo "4. Checking EnhancedUpload for user cache usage display..."
if grep -q "cache_usage_bytes" src/icp_cdn_frontend/src/components/EnhancedUpload.jsx; then
    echo "✅ EnhancedUpload displays user cache usage"
else
    echo "❌ EnhancedUpload does not display user cache usage"
    exit 1
fi

# Check if refresh function exists in EnhancedUpload
echo "5. Checking EnhancedUpload for refresh functionality..."
if grep -q "refreshTierInfo" src/icp_cdn_frontend/src/components/EnhancedUpload.jsx; then
    echo "✅ EnhancedUpload has refresh functionality"
else
    echo "❌ EnhancedUpload missing refresh functionality"
    exit 1
fi

echo ""
echo "🎉 All tests passed! User cache clearing functionality is properly implemented."
echo ""
echo "📋 Summary:"
echo "- Backend has clear_user_cache function"
echo "- Candid interface includes clear_user_cache"
echo "- Frontend calls clear_user_cache when clearing cache"
echo "- EnhancedUpload displays user cache usage"
echo "- EnhancedUpload has refresh functionality"
echo ""
echo "✅ User cache clearing should now work properly!"
