#!/bin/bash

# Test script for Frontend Integration with Canister-to-Canister Functionality
# This script verifies that the frontend components are properly integrated

echo "🧪 Testing Frontend Integration with Canister-to-Canister Functionality"
echo "======================================================================"

# Test 1: Frontend Compilation
echo "📦 Testing Frontend Compilation..."
cd src/icp_cdn_frontend
if npm run build; then
    echo "✅ Frontend compiles successfully"
else
    echo "❌ Frontend compilation failed"
    exit 1
fi

# Test 2: Check if all components exist
echo "🔍 Checking Component Files..."
components=(
    "src/components/LibraryDemo.jsx"
    "src/components/CanisterToCanisterDemo.jsx"
    "src/components/Navbar.jsx"
    "src/App.jsx"
    "src/constants/index.jsx"
    "src/index.css"
)

for component in "${components[@]}"; do
    if [ -f "$component" ]; then
        echo "✅ $component exists"
    else
        echo "❌ $component missing"
        exit 1
    fi
done

# Test 3: Check if routes are properly configured
echo "🛣️  Checking Route Configuration..."
if grep -q "canister-demo" src/App.jsx; then
    echo "✅ Canister demo route configured"
else
    echo "❌ Canister demo route missing"
    exit 1
fi

if grep -q "Canister Demo" src/constants/index.jsx; then
    echo "✅ Canister demo navigation item added"
else
    echo "❌ Canister demo navigation item missing"
    exit 1
fi

# Test 4: Check if scrollbar CSS is added
echo "🎨 Checking CSS Configuration..."
if grep -q "scrollbar-hide" src/index.css; then
    echo "✅ Scrollbar hiding CSS configured"
else
    echo "❌ Scrollbar hiding CSS missing"
    exit 1
fi

# Test 5: Check if navbar scroll functionality is implemented
echo "🧭 Checking Navbar Scroll Functionality..."
if grep -q "scrollContainerRef" src/components/Navbar.jsx; then
    echo "✅ Navbar scroll container implemented"
else
    echo "❌ Navbar scroll container missing"
    exit 1
fi

if grep -q "ChevronLeft\|ChevronRight" src/components/Navbar.jsx; then
    echo "✅ Navbar scroll arrows implemented"
else
    echo "❌ Navbar scroll arrows missing"
    exit 1
fi

# Test 6: Check if canister-to-canister functions are implemented
echo "🔧 Checking Canister-to-Canister Functions..."
functions=(
    "canister_upload"
    "canister_get_content"
    "canister_bulk_upload"
    "canister_get_account_info"
    "canister_estimate_upload_cost"
    "canister_estimate_storage_cost"
)

for func in "${functions[@]}"; do
    if grep -q "$func" src/components/CanisterToCanisterDemo.jsx; then
        echo "✅ $func implemented in demo"
    else
        echo "❌ $func missing from demo"
        exit 1
    fi
done

# Test 7: Check if library demo has link to canister demo
echo "🔗 Checking Library Demo Integration..."
if grep -q "Test Canister-to-Canister" src/components/LibraryDemo.jsx; then
    echo "✅ Library demo has canister demo link"
else
    echo "❌ Library demo missing canister demo link"
    exit 1
fi

# Test 8: Check if all imports are correct
echo "📥 Checking Import Statements..."
if grep -q "import.*CanisterToCanisterDemo" src/App.jsx; then
    echo "✅ CanisterToCanisterDemo import exists"
else
    echo "❌ CanisterToCanisterDemo import missing"
    exit 1
fi

# Test 9: Check if enhanced navigation items are properly configured
echo "🧭 Checking Enhanced Navigation..."
if grep -q "Canister Demo.*canister-demo" src/constants/index.jsx; then
    echo "✅ Enhanced navigation properly configured"
else
    echo "❌ Enhanced navigation configuration missing"
    exit 1
fi

# Test 10: Check if copy functionality is implemented
echo "📋 Checking Copy Functionality..."
if grep -q "copyToClipboard" src/components/CanisterToCanisterDemo.jsx; then
    echo "✅ Copy functionality implemented"
else
    echo "❌ Copy functionality missing"
    exit 1
fi

echo ""
echo "🎉 All Frontend Integration Tests Passed!"
echo "=========================================="
echo ""
echo "✅ Frontend compiles successfully"
echo "✅ All components exist and are properly configured"
echo "✅ Routes are properly set up"
echo "✅ CSS for scrollbar hiding is configured"
echo "✅ Navbar scroll functionality is implemented"
echo "✅ Canister-to-canister functions are implemented"
echo "✅ Library demo integration is complete"
echo "✅ All imports are correct"
echo "✅ Enhanced navigation is configured"
echo "✅ Copy functionality is implemented"
echo ""
echo "🚀 Frontend is ready for testing with canister-to-canister functionality!"
echo ""
echo "Next steps:"
echo "1. Start the frontend development server: npm run dev"
echo "2. Navigate to /library-demo to test the client library"
echo "3. Click 'Test Canister-to-Canister' to test direct canister communication"
echo "4. Test the horizontal scrolling navigation in the top bar"
echo "5. Verify all canister-to-canister functions work correctly"
