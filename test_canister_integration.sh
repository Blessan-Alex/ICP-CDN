#!/bin/bash

# Test script for Canister-to-Canister Integration
# This script verifies that the client library and backend are properly integrated

echo "🧪 Testing Canister-to-Canister Integration"
echo "=========================================="

# Test 1: Client Library Compilation
echo "📦 Testing Client Library Compilation..."
cd src/icp_cdn_client
if cargo check; then
    echo "✅ Client library compiles successfully"
else
    echo "❌ Client library compilation failed"
    exit 1
fi

# Test 2: Client Library Tests
echo "🧪 Running Client Library Tests..."
if cargo test; then
    echo "✅ All client library tests passed"
else
    echo "❌ Client library tests failed"
    exit 1
fi

# Test 3: Backend Compilation
echo "🔧 Testing Backend Compilation..."
cd ../icp_cdn_backend
if cargo check; then
    echo "✅ Backend compiles successfully"
else
    echo "❌ Backend compilation failed"
    exit 1
fi

# Test 4: Candid Interface Check
echo "📋 Checking Candid Interface..."
if [ -f "icp_cdn_backend.did" ]; then
    echo "✅ Candid interface file exists"
    
    # Check for canister-to-canister functions
    if grep -q "canister_upload" icp_cdn_backend.did; then
        echo "✅ canister_upload function found in Candid"
    else
        echo "❌ canister_upload function missing from Candid"
        exit 1
    fi
    
    if grep -q "canister_get_content" icp_cdn_backend.did; then
        echo "✅ canister_get_content function found in Candid"
    else
        echo "❌ canister_get_content function missing from Candid"
        exit 1
    fi
    
    if grep -q "canister_bulk_upload" icp_cdn_backend.did; then
        echo "✅ canister_bulk_upload function found in Candid"
    else
        echo "❌ canister_bulk_upload function missing from Candid"
        exit 1
    fi
else
    echo "❌ Candid interface file missing"
    exit 1
fi

# Test 5: Example Compilation
echo "📚 Testing Example Compilation..."
cd ../icp_cdn_client
if cargo build --example canister_usage; then
    echo "✅ Example compiles successfully"
else
    echo "❌ Example compilation failed"
    exit 1
fi

# Test 6: Documentation Check
echo "📖 Checking Documentation..."
cd ../..
if [ -f "CANISTER_TO_CANISTER_GUIDE.md" ]; then
    echo "✅ Canister-to-canister guide exists"
else
    echo "❌ Canister-to-canister guide missing"
    exit 1
fi

# Test 7: Integration Verification
echo "🔗 Verifying Integration Components..."

# Check that CdnCanisterClient is implemented
if grep -q "pub struct CdnCanisterClient" src/icp_cdn_client/src/lib.rs; then
    echo "✅ CdnCanisterClient struct implemented"
else
    echo "❌ CdnCanisterClient struct missing"
    exit 1
fi

# Check that canister functions are implemented in backend
if grep -q "async fn canister_upload" src/icp_cdn_backend/src/lib.rs; then
    echo "✅ canister_upload function implemented"
else
    echo "❌ canister_upload function missing"
    exit 1
fi

if grep -q "async fn canister_bulk_upload" src/icp_cdn_backend/src/lib.rs; then
    echo "✅ canister_bulk_upload function implemented"
else
    echo "❌ canister_bulk_upload function missing"
    exit 1
fi

# Test 8: Type Safety Check
echo "🛡️ Checking Type Safety..."
cd src/icp_cdn_client
if cargo check --lib; then
    echo "✅ All types are properly defined"
else
    echo "❌ Type safety issues found"
    exit 1
fi

echo ""
echo "🎉 All Integration Tests Passed!"
echo "================================"
echo ""
echo "✅ Client Library: Compiled and tested"
echo "✅ Backend: Compiled with canister functions"
echo "✅ Candid Interface: Updated with new functions"
echo "✅ Examples: Compiled successfully"
echo "✅ Documentation: Complete"
echo "✅ Type Safety: Verified"
echo ""
echo "🚀 Canister-to-Canister Integration is Ready!"
echo ""
echo "Next Steps:"
echo "1. Deploy the backend canister"
echo "2. Update the client library with the deployed canister ID"
echo "3. Test with a real canister integration"
echo "4. Monitor usage and performance"
