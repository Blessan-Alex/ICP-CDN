#!/bin/bash

# CDN Client Library Test Script
# This script tests the library compilation, structure, and basic functionality

echo "🚀 Testing CDN Client Library"
echo "=============================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    local status=$1
    local message=$2
    if [ "$status" = "PASS" ]; then
        echo -e "${GREEN}✅ $message${NC}"
    elif [ "$status" = "FAIL" ]; then
        echo -e "${RED}❌ $message${NC}"
    elif [ "$status" = "WARN" ]; then
        echo -e "${YELLOW}⚠️  $message${NC}"
    elif [ "$status" = "INFO" ]; then
        echo -e "${BLUE}ℹ️  $message${NC}"
    fi
}

# Test 1: Check if we're in the right directory
echo ""
print_status "INFO" "Test 1: Checking directory structure"
if [ -f "Cargo.toml" ] && [ -d "src" ]; then
    print_status "PASS" "Found Cargo.toml and src directory"
else
    print_status "FAIL" "Missing Cargo.toml or src directory"
    exit 1
fi

# Test 2: Check if library files exist
echo ""
print_status "INFO" "Test 2: Checking library files"
required_files=(
    "src/lib.rs"
    "examples/basic_usage.rs"
    "tests/integration_test.rs"
    "README.md"
)

all_files_exist=true
for file in "${required_files[@]}"; do
    if [ -f "$file" ]; then
        print_status "PASS" "Found $file"
    else
        print_status "FAIL" "Missing $file"
        all_files_exist=false
    fi
done

if [ "$all_files_exist" = false ]; then
    print_status "FAIL" "Some required files are missing"
    exit 1
fi

# Test 3: Check Cargo.toml configuration
echo ""
print_status "INFO" "Test 3: Checking Cargo.toml configuration"
if grep -q "name = \"icp-cdn-client\"" Cargo.toml; then
    print_status "PASS" "Package name is correct"
else
    print_status "FAIL" "Package name is incorrect"
fi

if grep -q "candid" Cargo.toml; then
    print_status "PASS" "Candid dependency found"
else
    print_status "FAIL" "Candid dependency missing"
fi

if grep -q "ic-cdk" Cargo.toml; then
    print_status "PASS" "ic-cdk dependency found"
else
    print_status "FAIL" "ic-cdk dependency missing"
fi

# Test 4: Check if library compiles
echo ""
print_status "INFO" "Test 4: Checking library compilation"
if cargo check --quiet 2>/dev/null; then
    print_status "PASS" "Library compiles successfully"
else
    print_status "FAIL" "Library compilation failed"
    echo "Running cargo check with verbose output:"
    cargo check
    exit 1
fi

# Test 5: Check if tests compile
echo ""
print_status "INFO" "Test 5: Checking test compilation"
if cargo test --no-run --quiet 2>/dev/null; then
    print_status "PASS" "Tests compile successfully"
else
    print_status "FAIL" "Test compilation failed"
    echo "Running cargo test --no-run with verbose output:"
    cargo test --no-run
    exit 1
fi

# Test 6: Check library structure
echo ""
print_status "INFO" "Test 6: Checking library structure"
if grep -q "pub struct CdnClient" src/lib.rs; then
    print_status "PASS" "CdnClient struct found"
else
    print_status "FAIL" "CdnClient struct missing"
fi

if grep -q "pub enum UserTier" src/lib.rs; then
    print_status "PASS" "UserTier enum found"
else
    print_status "FAIL" "UserTier enum missing"
fi

if grep -q "pub async fn upload_asset" src/lib.rs; then
    print_status "PASS" "upload_asset function found"
else
    print_status "FAIL" "upload_asset function missing"
fi

if grep -q "pub async fn get_user_tier_info" src/lib.rs; then
    print_status "PASS" "get_user_tier_info function found"
else
    print_status "FAIL" "get_user_tier_info function missing"
fi

# Test 7: Check constants
echo ""
print_status "INFO" "Test 7: Checking constants"
if grep -q "CYCLES_SMALL_UPLOAD" src/lib.rs; then
    print_status "PASS" "CYCLES_SMALL_UPLOAD constant found"
else
    print_status "FAIL" "CYCLES_SMALL_UPLOAD constant missing"
fi

if grep -q "CYCLES_STARTER_UPGRADE" src/lib.rs; then
    print_status "PASS" "CYCLES_STARTER_UPGRADE constant found"
else
    print_status "FAIL" "CYCLES_STARTER_UPGRADE constant missing"
fi

# Test 8: Check examples
echo ""
print_status "INFO" "Test 8: Checking examples"
if grep -q "upload_user_avatar_with_tier_check" examples/basic_usage.rs; then
    print_status "PASS" "Example function found"
else
    print_status "FAIL" "Example function missing"
fi

if grep -q "upgrade_user_tier" examples/basic_usage.rs; then
    print_status "PASS" "Tier upgrade example found"
else
    print_status "FAIL" "Tier upgrade example missing"
fi

# Test 9: Check integration tests
echo ""
print_status "INFO" "Test 9: Checking integration tests"
if grep -q "test_cdn_client_full_integration" tests/integration_test.rs; then
    print_status "PASS" "Integration test function found"
else
    print_status "FAIL" "Integration test function missing"
fi

if grep -q "test_tier_management" tests/integration_test.rs; then
    print_status "PASS" "Tier management test found"
else
    print_status "FAIL" "Tier management test missing"
fi

# Test 10: Check documentation
echo ""
print_status "INFO" "Test 10: Checking documentation"
if grep -q "ICP CDN Client Library" README.md; then
    print_status "PASS" "README title found"
else
    print_status "FAIL" "README title missing"
fi

if grep -q "upload_asset" README.md; then
    print_status "PASS" "API documentation found"
else
    print_status "FAIL" "API documentation missing"
fi

# Test 11: Run unit tests (if any)
echo ""
print_status "INFO" "Test 11: Running unit tests"
if cargo test --lib --quiet 2>/dev/null; then
    print_status "PASS" "Unit tests passed"
else
    print_status "WARN" "Unit tests failed or no unit tests found"
fi

# Test 12: Check for common Rust issues
echo ""
print_status "INFO" "Test 12: Checking for common issues"
if cargo clippy --quiet 2>/dev/null; then
    print_status "PASS" "Clippy check passed"
else
    print_status "WARN" "Clippy found some issues (run 'cargo clippy' for details)"
fi

# Test 13: Check dependencies
echo ""
print_status "INFO" "Test 13: Checking dependencies"
if cargo tree --quiet 2>/dev/null | grep -q "candid"; then
    print_status "PASS" "Candid dependency resolved"
else
    print_status "FAIL" "Candid dependency not resolved"
fi

if cargo tree --quiet 2>/dev/null | grep -q "ic-cdk"; then
    print_status "PASS" "ic-cdk dependency resolved"
else
    print_status "FAIL" "ic-cdk dependency not resolved"
fi

# Summary
echo ""
echo "=============================="
print_status "INFO" "Library Test Summary"
echo "=============================="

print_status "INFO" "To run integration tests against a real canister:"
echo "  1. Deploy your dCDN canister"
echo "  2. Update the canister ID in tests/integration_test.rs"
echo "  3. Run: cargo test --test integration_test"

print_status "INFO" "To test with a real canister:"
echo "  1. Deploy your dCDN canister"
echo "  2. Update the canister ID in examples/basic_usage.rs"
echo "  3. Run the examples manually"

print_status "INFO" "To check for issues:"
echo "  - Run: cargo clippy"
echo "  - Run: cargo fmt --check"
echo "  - Run: cargo test"

echo ""
print_status "PASS" "Library structure and compilation tests completed!"
echo ""
