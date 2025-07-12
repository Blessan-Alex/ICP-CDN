# Deployment Guide

This guide explains how to deploy the ICP CDN project with proper environment variable management.

## Quick Deployment

### Option 1: Full Deployment with Environment Setup
```bash
npm run deploy
```
This runs the comprehensive deployment script that:
- Starts DFX
- Deploys all canisters
- Sets up environment variables
- Rebuilds frontend
- Redeploys frontend

### Option 2: Quick Deployment
```bash
npm run deploy:quick
```
This deploys canisters and sets up environment variables without rebuilding.

### Option 3: Environment Setup Only
```bash
npm run deploy:env
```
This only sets up environment variables without deploying.

## Manual Deployment Steps

### 1. Start DFX
```bash
dfx start --background
```

### 2. Deploy Canisters
```bash
dfx deploy
```

### 3. Setup Environment Variables
```bash
./setup_env.sh
```

### 4. Build Frontend
```bash
cd src/icp_cdn_frontend
npm run build
cd ../..
```

### 5. Deploy Frontend
```bash
dfx deploy icp_cdn_frontend
```

## Environment Variables

The following environment variables are automatically added to your `.env` file:

| Variable | Description | Default Value |
|----------|-------------|---------------|
| `VITE_PINATA_JWT` | Pinata API JWT token | Your JWT token |
| `VITE_PINATA_GATEWAY` | Pinata gateway domain | `black-defensive-zebra-94.mypinata.cloud` |
| `VITE_BACKEND_SERVER_URL` | Backend server for presigned URLs | `http://localhost:8787` |
| `VITE_ENCRYPTION_ENABLED` | Enable client-side encryption | `true` |

## Customizing Environment Variables

To customize the environment variables, edit the `setup_env.sh` script:

```bash
# Edit the script to change default values
nano setup_env.sh
```

Or manually edit the `.env` file after running `./setup_env.sh`:

```bash
# Edit environment variables
nano .env
```

## Security Notes

- The `.env` file is automatically added to `.gitignore`
- Never commit your real JWT tokens to version control
- Use different JWT tokens for development and production
- Consider using a secrets manager for production deployments

## Troubleshooting

### Environment Variables Not Loading
1. Check that the `.env` file exists in the project root
2. Verify that variables start with `VITE_` for frontend access
3. Restart the development server after changing environment variables
4. Rebuild the frontend after changing environment variables

### Deployment Issues
1. Ensure DFX is running: `dfx start --background`
2. Check canister status: `dfx canister status icp_cdn_backend`
3. View deployment logs: `dfx deploy --verbose`

## Production Deployment

For production deployment:

1. Set up production environment variables
2. Use production Pinata credentials
3. Deploy to mainnet: `dfx deploy --network ic`
4. Update environment variables for production

## Scripts Overview

| Script | Purpose |
|--------|---------|
| `deploy.sh` | Original deployment script (backend only) |
| `deploy_with_env.sh` | Comprehensive deployment with environment setup |
| `setup_env.sh` | Environment variable management |
| `check_pinata_account.js` | Check Pinata account status and usage |
| `test_pinata_backend.js` | Test Pinata integration | 