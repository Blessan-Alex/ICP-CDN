#!/bin/bash
set -e

# 1. Prompt for Pinata JWT and Gateway if not set
if [ -z "$VITE_PINATA_JWT" ]; then
  read -p "Enter your Pinata JWT: " pinata_jwt
else
  pinata_jwt="$VITE_PINATA_JWT"
fi
if [ -z "$VITE_PINATA_GATEWAY" ]; then
  read -p "Enter your Pinata Gateway (e.g. mygateway.mypinata.cloud): " pinata_gateway
else
  pinata_gateway="$VITE_PINATA_GATEWAY"
fi

# 2. Update root .env
cat > .env <<EOF
VITE_PINATA_JWT=$pinata_jwt
VITE_PINATA_GATEWAY=$pinata_gateway
EOF

echo "Updated root .env file."

# 3. Deploy canisters
if [ -f dfx.json ]; then
  echo "Deploying canisters..."
  dfx deploy
else
  echo "dfx.json not found. Please run from project root."
  exit 1
fi

# 4. Update frontend .env
node scripts/update_frontend_env.cjs

# Add Pinata vars to frontend .env if not present
frontend_env="src/icp_cdn_frontend/.env"
grep -q VITE_PINATA_JWT $frontend_env || echo "VITE_PINATA_JWT=$pinata_jwt" >> $frontend_env
grep -q VITE_PINATA_GATEWAY $frontend_env || echo "VITE_PINATA_GATEWAY=$pinata_gateway" >> $frontend_env

echo "Updated frontend .env file."

# 5. Print next steps
echo "\n✅ Deployment complete!"
echo "Next steps:"
echo "1. Start backend server: cd pinata_backend && node server.js"
echo "2. Start frontend: cd src/icp_cdn_frontend && npm run dev" 