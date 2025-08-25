#!/bin/bash

echo "🚀 Starting CDN Client Library Demo..."
echo "======================================"

# Check if dfx is installed
if ! command -v dfx &> /dev/null; then
    echo "❌ dfx is not installed. Please install dfx first."
    exit 1
fi

# Check if we're in the right directory
if [ ! -f "dfx.json" ]; then
    echo "❌ Please run this script from the project root directory (where dfx.json is located)"
    exit 1
fi

echo "📦 Starting local replica..."
dfx start --clean --background

echo "⏳ Waiting for replica to be ready..."
sleep 5

echo "🔧 Deploying canisters..."
dfx deploy

echo "🌐 Starting frontend..."
cd src/icp_cdn_frontend
npm run dev &

echo "✅ Setup complete!"
echo ""
echo "🎯 Next steps:"
echo "1. Open your browser to: http://localhost:5173"
echo "2. Navigate to: /library-demo"
echo "3. Log in with Internet Identity"
echo "4. Test the CDN Client Library functions!"
echo ""
echo "📚 The library demo will test:"
echo "   • uploadAsset() - Upload content to dCDN"
echo "   • getAsset() - Retrieve content by CID"
echo "   • getUserAccount() - Get user account info"
echo "   • getCyclesBalance() - Check cycles balance"
echo "   • estimateUploadCost() - Estimate upload costs"
echo "   • getAssetWithFallback() - Cache + IPFS fallback"
echo "   • isCached() - Check if content is cached"
echo "   • Real file uploads"
echo ""
echo "🔗 Library Demo URL: http://localhost:5173/library-demo"
echo ""
echo "Press Ctrl+C to stop the frontend when done."
