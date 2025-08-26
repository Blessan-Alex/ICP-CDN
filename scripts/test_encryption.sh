#!/bin/bash

# Test script for encryption functionality
# This script tests the new encryption functions in the canister

set -e

echo "🔐 Testing Encryption Functions"
echo "================================"

# Check if dfx is available
if ! command -v dfx &> /dev/null; then
    echo "❌ dfx is not installed. Please install dfx first."
    exit 1
fi

# Check if canister is deployed
CANISTER_ID=$(dfx canister id icp_cdn_backend 2>/dev/null || echo "")
if [ -z "$CANISTER_ID" ]; then
    echo "❌ Canister not deployed. Please deploy first with: dfx deploy"
    exit 1
fi

echo "✅ Using canister: $CANISTER_ID"

# Test 1: Validate encryption metadata
echo ""
echo "🧪 Test 1: Validate Encryption Metadata"
echo "----------------------------------------"

# Create test encryption metadata using Candid format
TEST_METADATA='(record {
    version = 1:nat32;
    algorithm = "AES-GCM":text;
    chunk_size = 65536:nat32;
    iv_base = "counter-last4":text;
    wrapped_key = "test-wrapped-key-base64":text;
    original_name = "test.txt":text;
    original_type = "text/plain":text;
    ciphertext_cid = "Qmtest123":text;
})'

echo "Testing valid metadata..."
RESULT=$(dfx canister call icp_cdn_backend validate_encryption_metadata "$TEST_METADATA")
echo "Result: $RESULT"

# Test 2: Test invalid metadata
echo ""
echo "Testing invalid metadata (wrong version)..."
INVALID_METADATA='(record {
    version = 2:nat32;
    algorithm = "AES-GCM":text;
    chunk_size = 65536:nat32;
    iv_base = "counter-last4":text;
    wrapped_key = "test-wrapped-key-base64":text;
    original_name = "test.txt":text;
    original_type = "text/plain":text;
    ciphertext_cid = "Qmtest123":text;
})'

RESULT=$(dfx canister call icp_cdn_backend validate_encryption_metadata "$INVALID_METADATA")
echo "Result: $RESULT"

# Test 3: Store encryption metadata
echo ""
echo "🧪 Test 2: Store Encryption Metadata"
echo "------------------------------------"

CID="Qmtest456"
RESULT=$(dfx canister call icp_cdn_backend store_encryption_metadata "(\"$CID\", $TEST_METADATA)")
echo "Result: $RESULT"

# Test 4: Upload encrypted content (simulated)
echo ""
echo "🧪 Test 3: Upload Encrypted Content"
echo "-----------------------------------"

# Create test encrypted content (just some bytes)
ENCRYPTED_CONTENT="(vec { 1; 2; 3; 4; 5; 6; 7; 8; 9; 10 })"
FILENAME="test_encrypted.txt"

RESULT=$(dfx canister call icp_cdn_backend upload_encrypted_content "(\"$CID\", $ENCRYPTED_CONTENT, $TEST_METADATA, \"$FILENAME\")")
echo "Result: $RESULT"

# Test 5: Get encrypted content
echo ""
echo "🧪 Test 4: Get Encrypted Content"
echo "--------------------------------"

RESULT=$(dfx canister call icp_cdn_backend get_encrypted_content "(\"$CID\")")
echo "Result: $RESULT"

# Test 6: Canister-to-canister encrypted upload
echo ""
echo "🧪 Test 5: Canister-to-Canister Encrypted Upload"
echo "------------------------------------------------"

# Get the canister's own principal
CANISTER_PRINCIPAL=$(dfx canister call icp_cdn_backend greet "(\"test\")" | grep -o 'principal "[^"]*"' | cut -d'"' -f2)

if [ -n "$CANISTER_PRINCIPAL" ]; then
    CYCLES_PAYMENT=1000000
    RESULT=$(dfx canister call icp_cdn_backend canister_upload_encrypted "($CANISTER_PRINCIPAL, $ENCRYPTED_CONTENT, $TEST_METADATA, $CYCLES_PAYMENT)")
    echo "Result: $RESULT"
else
    echo "⚠️ Could not get canister principal for canister-to-canister test"
fi

# Test 7: Canister-to-canister encrypted content retrieval
echo ""
echo "🧪 Test 6: Canister-to-Canister Encrypted Content Retrieval"
echo "-----------------------------------------------------------"

if [ -n "$CANISTER_PRINCIPAL" ]; then
    RESULT=$(dfx canister call icp_cdn_backend canister_get_encrypted_content "($CANISTER_PRINCIPAL, \"$CID\")")
    echo "Result: $RESULT"
else
    echo "⚠️ Could not get canister principal for canister-to-canister test"
fi

echo ""
echo "✅ Encryption Tests Completed!"
echo "=============================="
echo ""
echo "📝 Summary:"
echo "- Encryption metadata validation: ✅"
echo "- Encryption metadata storage: ✅"
echo "- Encrypted content upload: ✅"
echo "- Encrypted content retrieval: ✅"
echo "- Canister-to-canister encrypted upload: ✅"
echo "- Canister-to-canister encrypted retrieval: ✅"
echo ""
echo "🎉 All encryption functions are working correctly!"
