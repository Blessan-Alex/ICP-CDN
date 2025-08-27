# Scripts Directory

This directory contains utility scripts for managing the ICP CDN project.

## Files

### `update_frontend_env.cjs`
Updates the frontend `.env` file with the latest canister IDs from DFX.
- **Usage**: Run after `dfx deploy` to update frontend environment variables
- **Location**: Automatically updates `src/icp_cdn_frontend/.env`

## Deployment Scripts

### `deployment/full_deploy.sh`
Complete deployment script that handles the entire deployment process.
- **Usage**: `./scripts/deployment/full_deploy.sh`
- **What it does**: 
  - Prompts for Pinata JWT and Gateway credentials
  - Updates environment variables
  - Deploys canisters to local network
  - Updates frontend environment with canister IDs
  - Provides next steps for frontend startup

## Environment Variables Required

The project requires these environment variables:

### Frontend (.env in src/icp_cdn_frontend/)
```
VITE_DFX_REPLICA_HOST=http://127.0.0.1:4943
VITE_CANISTER_ID_BACKEND=<backend_canister_id>
VITE_CANISTER_ID_FRONTEND=<frontend_canister_id>
VITE_CANISTER_ID_INTERNET_IDENTITY=be2us-64aaa-aaaaa-qaabq-cai
VITE_PINATA_JWT=<your_pinata_jwt>
VITE_PINATA_GATEWAY=<your_gateway_domain.mypinata.cloud>
```

### Backend (.env in root)
```
VITE_PINATA_JWT=<your_pinata_jwt>
VITE_PINATA_GATEWAY=<your_gateway_domain.mypinata.cloud>
```

## Quick Start

1. Set up environment variables:
   ```bash
   ./scripts/deployment/setup_env.sh
   ```

2. Deploy the project:
   ```bash
   ./scripts/deployment/deploy_with_env.sh
   ```

3. Start the frontend:
   ```bash
   cd src/icp_cdn_frontend
   npm run dev
   ``` 