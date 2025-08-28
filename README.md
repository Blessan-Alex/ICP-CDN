# CanisterDrop: Decentralized CDN on ICP

**A production-ready decentralized Content Delivery Network (dCDN) built on the Internet Computer Protocol with IPFS storage, intelligent caching, and canister-to-canister communication.**

---

## 📋 Table of Contents
- [Demo & Pitch Videos](#-demo--pitch-videos)
- [Project Overview](#project-overview)
- [Architecture Overview](#architecture-overview)
- [Technology Stack](#technology-stack)
- [Project Structure](#-project-structure)
- [Quick Start](#-quick-start)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Available Scripts](#available-scripts)
- [Configuration](#configuration)
- [Environment Variables](#environment-variables)
- [Core Features](#-core-features)
- [ICP Features](#icp-features)
- [Testing & Development](#-testing--development)
- [Deployment](#-deployment)
- [Contributing](#-contributing)
- [License](#-license)
- [Acknowledgments](#-acknowledgments)

## 🎥 Demo & Pitch Videos

### Demo Video
[![Watch Demo](https://img.shields.io/badge/Watch-Demo%20Video-blue?style=for-the-badge)](https://youtu.be/3LpbRjuumyY)
*Complete walkthrough of the dCDN platform features and functionality*

### Pitch Video
[![Watch Pitch](https://img.shields.io/badge/Watch-Pitch%20Video-green?style=for-the-badge)](https://youtu.be/WtOoVQ4wno8)
*Project pitch and business model presentation*

## Project Overview

CanisterDrop is a production-ready decentralized Content Delivery Network (dCDN) built on the Internet Computer Protocol. It leverages ICP's native capabilities including HTTP outcalls, intelligent LRU caching, canister-to-canister communication, and cycles-based billing to provide a truly decentralized content delivery solution. The platform serves both as a standalone dCDN service and as a canister-to-canister communication layer for other ICP applications, offering transparent pricing through native ICP cycles.

## Architecture Overview

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend        │    │   External      │
│   (React/Vite)  │◄──►│   (Rust Canister)│◄──►│   (IPFS/Pinata) │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   User Auth     │    │   LRU Cache      │    │   IPFS Gateway  │
│   (Internet ID) │    │   Management     │    │   (Cloudflare)  │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

**Canister Roles:**
- **`icp_cdn_backend`**: Core Rust canister handling file storage, caching, HTTP outcalls, and tier management
- **`icp_cdn_frontend`**: React frontend with modern UI, authentication, and user management  
- **`internet_identity`**: Authentication service for user identity management

For detailed architecture, see [docs/ARCHITECTURE_OVERVIEW.md](docs/ARCHITECTURE_OVERVIEW.md).

## Technology Stack

![React](https://img.shields.io/badge/React-19.1.0-blue?style=flat-square&logo=react)
![Vite](https://img.shields.io/badge/Vite-6.3.5-purple?style=flat-square&logo=vite)
![Rust](https://img.shields.io/badge/Rust-2021-orange?style=flat-square&logo=rust)
![ICP](https://img.shields.io/badge/Internet_Computer-Protocol-green?style=flat-square)
![IPFS](https://img.shields.io/badge/IPFS-Pinata-yellow?style=flat-square&logo=ipfs)
![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3.4.3-38B2AC?style=flat-square&logo=tailwind-css)

**Frontend:** React 19.1.0, Vite 6.3.5, TailwindCSS 3.4.3, Framer Motion  
**Backend:** Rust 2021, Candid, IC-CDK 0.17  
**Infrastructure:** Internet Computer Protocol, DFX, IPFS/Pinata  
**Authentication:** Internet Identity  
**Development:** TypeScript, ESLint, PostCSS

## 📁 Project Structure

```
/
├── src/
│   ├── icp_cdn_frontend/          # React frontend application
│   │   ├── src/                   # Frontend source code
│   │   ├── package.json           # Frontend dependencies
│   │   └── vite.config.js         # Vite configuration
│   ├── icp_cdn_backend/           # Rust backend canister
│   │   ├── src/lib.rs             # Main backend logic
│   │   ├── Cargo.toml             # Rust dependencies
│   │   └── icp_cdn_backend.did    # Candid interface
│   └── icp_cdn_client/            # Rust client library
│       ├── src/lib.rs             # Client library code
│       └── examples/              # Integration examples
├── docs/                          # Project documentation
├── scripts/                       # Deployment and utility scripts
├── dfx.json                       # DFX configuration
├── Cargo.toml                     # Rust workspace config
├── package.json                   # Root package config
└── env.example                    # Environment template
```

## 🚀 Quick Start

Get the dCDN platform running locally in minutes. Install dependencies, start the local ICP network, deploy canisters, and launch the frontend application.

## Prerequisites

- **Node.js** (v16+) - [Download](https://nodejs.org/)
- **Rust & Cargo** - [Install](https://www.rust-lang.org/tools/install)
- **DFX (ICP SDK)** - `sh -ci "$(curl -fsSL https://internetcomputer.org/install.sh)"`
- **Git**
- **Pinata Account** - [Sign up](https://pinata.cloud/) for IPFS storage

## Installation

```bash
# 1. Clone repository
git clone <repository-url>
cd icp_cdn

# 2. Install frontend dependencies
cd src/icp_cdn_frontend && npm install

# 3. Build backend
cd ../.. && cargo build

# 4. Start local ICP network
dfx start --clean --background

# 5. Generate canister declarations
dfx generate

# 6. Deploy canisters
dfx deploy

# 7. Start frontend development server
cd src/icp_cdn_frontend && npm run dev

# 8. Access application
# Open http://localhost:5173
```

## Available Scripts

### Frontend Scripts (`src/icp_cdn_frontend/package.json`)
- `npm run dev` - Start development server with hot reload
- `npm run build` - Build production assets
- `npm run lint` - Run ESLint code analysis
- `npm run preview` - Preview production build locally

### Root Scripts (`package.json`)
- `npm run build` - Build all workspaces
- `npm run test` - Run tests across all workspaces
- `npm run deploy` - Deploy with environment setup
- `npm run deploy:quick` - Quick deployment with environment update

### Backend Commands
- `cargo build` - Build Rust backend canister
- `cargo test` - Run backend tests
- `dfx deploy` - Deploy canisters to local network
- `dfx generate` - Generate TypeScript declarations

## Configuration

**Environment Configuration:**
- **Root `.env`**: Backend configuration and secrets
- **Frontend `.env`**: Vite environment variables (VITE_ prefix only)
- **Secrets**: Store sensitive data only in root `.env` for backend

**Key Configuration Files:**
- `dfx.json` - Canister definitions and network settings
- `Cargo.toml` - Rust dependencies and workspace config
- `vite.config.js` - Frontend build configuration
- `tailwind.config.js` - CSS framework configuration

## Environment Variables

### frontend/.env.local
```bash
VITE_DFX_NETWORK=local
VITE_DFX_REPLICA_HOST=http://127.0.0.1:4943
VITE_CANISTER_ID_BACKEND=REPLACE_WITH_CANISTER_ID
VITE_CANISTER_ID_FRONTEND=REPLACE_WITH_CANISTER_ID
VITE_CANISTER_ID_INTERNET_IDENTITY=REPLACE_WITH_CANISTER_ID
VITE_PINATA_GATEWAY=your-subdomain.mypinata.cloud
VITE_UPLOAD_CHUNK_SIZE_KB=512
VITE_PINATA_STORAGE_LIMIT_BYTES=1073741824
VITE_CACHE_LIMIT_MB=20
```

### backend/.env
```bash
PINATA_JWT=<PINATA_JWT_HERE>
PINATA_API_URL=https://api.pinata.cloud
PINATA_GATEWAY=gateway.pinata.cloud
DFX_REPLICA_HOST=http://127.0.0.1:4943
CANISTER_ID_BACKEND=REPLACE_WITH_CANISTER_ID
CANISTER_ID_FRONTEND=REPLACE_WITH_CANISTER_ID
CANISTER_ID_INTERNET_IDENTITY=REPLACE_WITH_CANISTER_ID
IPFS_GATEWAY=https://cloudflare-ipfs.com
MAX_CACHE_ITEMS=1000
MAX_CACHE_SIZE_MB=20
FREE_TIER_CACHE_LIMIT_MB=20
STARTER_TIER_CACHE_LIMIT_MB=50
PRO_TIER_CACHE_LIMIT_MB=100
BUSINESS_TIER_CACHE_LIMIT_MB=500
STARTER_UPGRADE_COST_CYCLES=1000000000
PRO_UPGRADE_COST_CYCLES=5000000000
BUSINESS_UPGRADE_COST_CYCLES=15000000000
```

## 🎯 Core Features

- **File Upload & Storage** - Drag-and-drop interface with IPFS storage ([src/icp_cdn_frontend/src/components/Upload.jsx](src/icp_cdn_frontend/src/components/Upload.jsx))
- **Content Delivery** - Intelligent caching with IPFS fallback ([src/icp_cdn_backend/src/lib.rs](src/icp_cdn_backend/src/lib.rs))
- **Image Processing** - On-chain resizing and optimization ([src/icp_cdn_backend/src/lib.rs](src/icp_cdn_backend/src/lib.rs))
- **Cache Management** - LRU-based caching with automatic eviction ([src/icp_cdn_backend/src/lib.rs](src/icp_cdn_backend/src/lib.rs))
- **Tier System** - User account tiers with cycles billing ([src/icp_cdn_backend/src/lib.rs](src/icp_cdn_backend/src/lib.rs))
- **Performance Monitoring** - Real-time analytics dashboard ([src/icp_cdn_frontend/src/components/CacheDashboard.jsx](src/icp_cdn_frontend/src/components/CacheDashboard.jsx))
- **Authentication** - Internet Identity integration ([src/icp_cdn_frontend/src/auth.js](src/icp_cdn_frontend/src/auth.js))
- **Client Library** - Rust library for canister integration ([src/icp_cdn_client/src/lib.rs](src/icp_cdn_client/src/lib.rs))

## ICP Features

### HTTP Outcalls
- **IPFS Gateway Integration** - Direct HTTP calls to Cloudflare IPFS gateway
- **Pinata API Integration** - File upload and pinning via HTTP outcalls
- **Real-time Content Fetching** - Dynamic content retrieval from IPFS

### Canister-to-Canister Communication
- **Client Library** - Complete Rust library for other canisters ([src/icp_cdn_client/src/lib.rs](src/icp_cdn_client/src/lib.rs))
- **Cycles Billing** - Automatic cycles payment and management
- **Bulk Operations** - High-volume upload support

### Core Canister Methods
- `add_ipfs_file` - Upload files to IPFS ([src/icp_cdn_backend/src/lib.rs](src/icp_cdn_backend/src/lib.rs))
- `list_ipfs_files` - List uploaded files ([src/icp_cdn_backend/src/lib.rs](src/icp_cdn_backend/src/lib.rs))
- `get_cache_entry_count` - Get cache statistics ([src/icp_cdn_backend/src/lib.rs](src/icp_cdn_backend/src/lib.rs))
- `upgrade_tier` - Manage user tiers ([src/icp_cdn_backend/src/lib.rs](src/icp_cdn_backend/src/lib.rs))
- `deposit_cycles` - Handle cycles billing ([src/icp_cdn_backend/src/lib.rs](src/icp_cdn_backend/src/lib.rs))
- `http_request_handler` - Handle HTTP requests ([src/icp_cdn_backend/src/lib.rs](src/icp_cdn_backend/src/lib.rs))

## 🧪 Testing & Development

### Development Workflow
```bash
# Start local network with hot reload
dfx start --clean --background

# Deploy in development mode
dfx deploy --mode=local

# Frontend development with hot reload
cd src/icp_cdn_frontend && npm run dev

# Backend testing
cargo test

# Frontend testing
cd src/icp_cdn_frontend && npm run lint
```

### Debugging Tips
- Use `dfx canister call` for direct canister interaction
- Check canister logs with `dfx canister call icp_cdn_backend greet "test"`
- Monitor cycles usage with `dfx canister call icp_cdn_backend get_cycles_balance`
- View cache stats with `dfx canister call icp_cdn_backend get_cache_entry_count`

## 🚀 Deployment

### Local Deployment
```bash
# Deploy to local network
dfx deploy

# Update frontend environment
node scripts/update_frontend_env.cjs
```

### Mainnet Deployment
```bash
# Deploy to mainnet
dfx deploy --network ic

# Update canister IDs in environment files
# Replace <CANISTER_ID_HERE> placeholders with actual IDs
```

### Production Configuration
- Set `DFX_NETWORK=ic` for mainnet
- Configure production Pinata credentials
- Update canister IDs in environment files
- Set appropriate cache and storage limits

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

**Development Guidelines:**
- Follow Rust and React best practices
- Add tests for new functionality
- Update documentation for API changes
- Ensure all tests pass before submitting PR

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

**Major Dependencies:**
- [React](https://reactjs.org/) - Frontend framework
- [Vite](https://vitejs.dev/) - Build tool and dev server
- [Rust](https://www.rust-lang.org/) - Backend language
- [Internet Computer](https://internetcomputer.org/) - Blockchain platform
- [IPFS/Pinata](https://pinata.cloud/) - Decentralized storage
- [TailwindCSS](https://tailwindcss.com/) - CSS framework

**Inspiration:**
- Decentralized content delivery networks
- Internet Computer Protocol capabilities
- Canister-to-canister communication patterns

---

*Built with ❤️ on the Internet Computer Protocol*
