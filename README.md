# CanisterDrop: Decentralized CDN on ICP

**A production-ready decentralized Content Delivery Network (dCDN) built on the Internet Computer Protocol with IPFS storage, intelligent caching, and canister-to-canister communication.**

---

## 📋 Summary & Problem Statement

Traditional CDNs are centralized, expensive, and create single points of failure. CanisterDrop solves this by leveraging **ICP's native capabilities** to provide a truly decentralized Content Delivery Network:

### 🚀 **ICP Native Features at Core**
- **HTTP Outcalls**: Direct integration with IPFS gateways and Pinata API
- **Intelligent Caching**: LRU-based on-chain caching with automatic eviction
- **Canister-to-Canister**: Seamless communication between ICP canisters
- **Cycles Management**: Native ICP cycles for billing and resource allocation
- **Decentralized Storage**: IPFS integration via Pinata for distributed content

### 🎯 **Key Advantages**
- **100% On-Chain Logic**: All caching and business logic runs on ICP
- **No External Dependencies**: Pure ICP native implementation
- **Cost-Effective**: Transparent cycles-based pricing
- **Developer-Ready**: Complete client library for easy integration
- **Production Scale**: Handles real-world CDN workloads

The platform serves as both a standalone dCDN service and a canister-to-canister communication layer for other ICP applications.

---

## ✨ Complete Feature Set

### 🚀 **Core dCDN Features**
- **File Upload & Storage**: Drag-and-drop interface with IPFS storage
- **Content Delivery**: Intelligent caching with IPFS fallback
- **Image Processing**: On-chain resizing, format conversion, and optimization
- **Cache Management**: LRU-based caching with automatic eviction
- **Performance Monitoring**: Real-time analytics and metrics dashboard

### 💳 **Tier System & Billing**
- **Free Tier**: 20MB cache, 1GB storage, basic features
- **Starter Tier**: 50MB cache, 100GB storage, $1 equivalent in cycles
- **Pro Tier**: 100MB cache, 500GB storage, $5 equivalent in cycles
- **Business Tier**: 500MB cache, 2TB storage, $15 equivalent in cycles
- **Cycles Billing**: Native ICP cycles for transparent pricing

For detailed business model and pricing strategy, see [docs/BUSINESS_MODEL.md](docs/BUSINESS_MODEL.md).

### 🔧 **Developer Tools**
- **Client Library**: Complete Rust library for canister integration
- **Canister-to-Canister**: Seamless communication between ICP canisters
- **API Documentation**: Comprehensive function documentation
- **Example Implementations**: Ready-to-use code examples
- **Bulk Operations**: High-volume upload and processing support
- **Easy Integration**: Open source library for projects like OpenChat, Caffeine, and any ICP dApp

### 🔐 **Security & Authentication**
- **Internet Identity**: Native ICP authentication
- **Principal-based Access**: User-specific data isolation
- **Content Verification**: Cryptographic content integrity checks
- **Secure HTTP Outcalls**: Encrypted communication with external APIs

### 📊 **Analytics & Monitoring**
- **Cache Performance**: Hit/miss ratios and response times
- **User Analytics**: Usage patterns and tier statistics
- **System Health**: Real-time canister performance metrics
- **Cost Tracking**: Cycles usage and billing analytics

### 🔗 **Library Integration**
- **Open Source Library**: Complete Rust client library available for integration
- **Universal Compatibility**: Works with any ICP project (OpenChat, Caffeine, etc.)
- **Simple Integration**: Just add the library dependency and start using dCDN services
- **Production Ready**: Battle-tested library used in our own implementation
- **Documentation**: Comprehensive examples and API documentation included

For future development plans and roadmap, see [docs/FUTURE_ROADMAP.md](docs/FUTURE_ROADMAP.md).

---

## 🎥 Demo

### Demo Video
[![Watch Demo](https://img.shields.io/badge/Watch-Demo%20Video-blue?style=for-the-badge)](https://www.loom.com/share/33b3fb6b09954c6fa4a6527c32323342)

### Quick Demo Steps
1. **Start Local Network**: `dfx start --background`
2. **Deploy Canisters**: `./scripts/deployment/full_deploy.sh`
3. **Launch Frontend**: `cd src/icp_cdn_frontend && npm run dev`
4. **Access App**: Visit `http://localhost:5173`
5. **Login**: Use Internet Identity authentication
6. **Upload & Test**: Upload files, test caching, explore tier management

---

## 🏗️ Architecture

For a detailed technical architecture overview, see [docs/ARCHITECTURE_OVERVIEW.md](docs/ARCHITECTURE_OVERVIEW.md).

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
         │                       │                       │
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Tier System   │    │   HTTP Outcalls  │    │   Pinata API    │
│   (Free→Business)│    │   (IPFS/Pinata)  │    │   (File Storage)│
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

### Canister Roles

- **`icp_cdn_backend`**: Core Rust canister handling file storage, caching, HTTP outcalls, and tier management
- **`icp_cdn_frontend`**: React frontend with modern UI, authentication, and user management
- **`internet_identity`**: Authentication service for user identity management

---

## 🛠️ Build & Local Development

### 📋 Prerequisites
- **Node.js** (v16+): [Download](https://nodejs.org/)
- **Rust & Cargo**: [Install](https://www.rust-lang.org/tools/install)
- **DFX (ICP SDK)**: `sh -ci "$(curl -fsSL https://internetcomputer.org/install.sh)"`
- **Git**
- **Pinata Account**: [Sign up](https://pinata.cloud/) (for IPFS storage)
- **Frontend Dependencies**: See [requirements.txt](requirements.txt) for complete list of npm packages

### 🚀 Quick Setup (Recommended)
```bash
# 1. Clone repository
git clone <repository-url>
cd icp_cdn

# 2. Install dependencies
cd src/icp_cdn_frontend && npm install
cd ../.. && cargo build

# 3. Set permissions
chmod +x ./scripts/deployment/full_deploy.sh

# 4. Start local ICP network (clean start)
dfx start --clean --background

# 5. If network issues occur, try:
export DFX_REPLICA_MODE=replica && dfx start --clean --background

# 6. Generate canister declarations
dfx generate

# 7. Deploy canisters (prompts for Pinata credentials)
dfx deploy

# 8. Start frontend
cd src/icp_cdn_frontend && npm run dev

# 9. Access at http://localhost:5173
```

### 🔧 Alternative Setup (If Issues)
```bash
# If you encounter deployment issues:
dfx stop
dfx start --clean --background
dfx generate
dfx build
dfx deploy

# If replica errors persist:
export DFX_REPLICA_MODE=replica
dfx start --clean --background
dfx generate
dfx deploy
```

### ⚙️ Environment Setup
The deployment script will prompt you for:
- **Pinata JWT Token**: Your Pinata API authentication token
- **Pinata Gateway**: Your custom IPFS gateway URL

These will be automatically configured in:
- `src/icp_cdn_frontend/.env`
- Root `.env` file
- Frontend environment variables

---

## 🚀 Deploy

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

### Canister ID Configuration
Update these files with your deployed canister IDs:
- `src/icp_cdn_frontend/.env`: Frontend environment variables
- `src/icp_cdn_frontend/src/canister_id_patch.js`: Canister ID references
- `src/icp_cdn_client/examples/canister_usage.rs`: Client library examples

**Placeholder Format**: `<CANISTER_ID_HERE>` - Replace with actual canister IDs from `dfx canister id <canister_name>`

---

## 🔧 ICP Features Used

### ✅ HTTP Outcalls (Core Feature)
- **IPFS Gateway Integration**: Direct HTTP calls to Cloudflare IPFS gateway
- **Pinata API Integration**: File upload and pinning via HTTP outcalls
- **Real-time Content Fetching**: Dynamic content retrieval from IPFS
- **On-Chain HTTP Requests**: All external API calls happen within canisters

### ✅ Canister-to-Canister Communication
- **Client Library**: Complete Rust library for other canisters
- **Cycles Billing**: Automatic cycles payment and management
- **Bulk Operations**: High-volume upload support
- **Seamless Integration**: Other canisters can use our dCDN as a service
- **Universal Compatibility**: Works with OpenChat, Caffeine, and any ICP dApp

### ✅ Advanced Features
- **LRU Cache System**: Intelligent on-chain content caching with eviction
- **Tier Management**: User account tiers (Free, Starter, Pro, Business)
- **Image Processing**: On-chain image resizing and optimization
- **Performance Metrics**: Real-time analytics and monitoring
- **Cycles Management**: Native ICP cycles for billing and resource allocation
- **Principal-based Authentication**: Internet Identity integration



---

## 🆕 What's New This Round

### Recent Features (Last 20 Commits)
- **Backend Optimization**: Enhanced Rust canister performance and error handling
- **Documentation Cleanup**: Consolidated project documentation and summaries
- **User Cache Management**: Fixed cache clearing and usage tracking issues
- **Library Demo**: Added canister-to-canister communication demonstration
- **Image Resizing**: Implemented on-chain image processing with custom dimensions
- **File Viewing**: Enhanced upload page with file preview capabilities
- **HTTP Canister Calls**: Improved canister communication reliability
- **Cache Settings**: Added cache management to library settings
- **Client Library**: Complete Rust client library for easy integration
- **Tier System**: Comprehensive user tier management and billing
- **Pinata Integration**: Fixed IPFS storage integration issues
- **Library Integration**: Open source library for OpenChat, Caffeine, and any ICP dApp

### Implementation Checklist
- [x] HTTP outcalls to IPFS gateways
- [x] Pinata API integration
- [x] LRU cache system
- [x] User tier management
- [x] Canister-to-canister communication
- [x] Image processing capabilities
- [x] Performance monitoring
- [x] Client library development
- [x] Modern React frontend
- [x] Internet Identity authentication

---

## 🤝 Contributing & License

### Contributing
1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

### Development Challenges
For insights into the challenges faced during development and hackathon experience, see [docs/HACKATHON_CHALLENGES.md](docs/HACKATHON_CHALLENGES.md).

### License
This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 📚 Documentation

### 📋 **Project Documentation**
- **[Architecture Overview](docs/ARCHITECTURE_OVERVIEW.md)**: Detailed technical architecture and system design
- **[Business Model](docs/BUSINESS_MODEL.md)**: Complete business strategy, pricing, and market analysis
- **[Future Roadmap](docs/FUTURE_ROADMAP.md)**: Development plans and upcoming features
- **[Hackathon Challenges](docs/HACKATHON_CHALLENGES.md)**: Development challenges and solutions

### 🛠️ **Setup & Deployment**
- **[Requirements.txt](requirements.txt)**: Complete list of frontend dependencies
- **[Deployment Scripts](scripts/)**: Automated deployment and setup scripts
- **[Environment Configuration](env.example)**: Environment variable templates

### 📖 **Additional Resources**
- **[Integration Guide](src/icp_cdn_client/README.md)**: Client library usage and examples
- **[API Documentation](src/icp_cdn_backend/icp_cdn_backend.did)**: Candid interface definitions
- **[Test Examples](src/icp_cdn_client/examples/)**: Code examples and integration patterns

---

## 📞 Contact & BUIDL Profile

### Team Contact
- **Email**: [Your Email]
- **GitHub**: [Your GitHub Profile]
- **Discord**: [Your Discord Handle]

### BUIDL Profile
- **DoraHacks Profile**: [Your BUIDL Profile Link]
- **Project Repository**: [GitHub Repository URL]

### Social Links
- **Twitter**: [@YourHandle]
- **LinkedIn**: [Your LinkedIn Profile]
- **Website**: [Your Website]

---

## 🏆 Hackathon Submission

**Project**: CanisterDrop - Decentralized CDN on ICP  
**Track**: Infrastructure & Developer Tools  
**Team**: [Your Team Name]  
**Submission**: WCHL25 - World Computer Hackathon

*Built with ❤️ on the Internet Computer Protocol*
