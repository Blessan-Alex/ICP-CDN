# 🌐 CanisterDrop - Decentralized CDN on Internet Computer

**CanisterDrop** is a revolutionary decentralized Content Delivery Network (CDN) built on the Internet Computer Protocol (ICP) with IPFS storage via Pinata. It provides lightning-fast, secure, and globally distributed content delivery without the traditional bottlenecks of centralized infrastructure.

## 🚀 Features

### 🔐 **Decentralized File Storage**
- Store files securely on IPFS via Pinata
- Cryptographic verification ensures tamper-proof content
- Distributed across multiple IPFS nodes for maximum reliability
- Global accessibility with no single point of failure

### 🛡️ **User Authentication & Isolation**
- Built-in Internet Identity authentication
- Complete data privacy and user isolation
- Cryptographically separated user data
- Prevents unauthorized access and maintains privacy

### ⚡ **Secure File Upload**
- Files uploaded through secure backend proxy
- No direct frontend-to-Pinata communication (JWT protection)
- Progress tracking and cancellation support
- Automatic content type detection

### 🌍 **Global IPFS Distribution**
- IPFS gateway distribution for fast global access
- Worldwide content availability with minimal latency
- Maximum reliability through distributed IPFS network
- No geographical restrictions or bottlenecks

### 📁 **Comprehensive File Management**
- Upload, view, delete, and share files with unique IPFS links
- Support for images, videos, documents, web assets, and fonts
- Automatic content type detection and management
- Intuitive file organization and sharing

### 📊 **Real-time Dashboard**
- Monitor CDN usage with intuitive dashboard
- Track file counts, storage usage, and network statistics
- Real-time performance monitoring
- Comprehensive analytics and insights

## 🏗️ Architecture

CanisterDrop is built with a modern, secure architecture:

- **Frontend Canister**: React application with Internet Identity authentication
- **Backend Canister**: Rust-based smart contract handling user data and file metadata
- **Express Backend Server**: Secure proxy for Pinata uploads (protects JWT)
- **Pinata**: IPFS pinning service for decentralized file storage
- **Internet Identity**: Secure authentication system for user management

### Data Flow
1. **User** uploads file through React frontend
2. **Frontend** sends file to Express backend server
3. **Backend Server** uploads to Pinata (IPFS) using secure JWT
4. **Pinata** returns IPFS hash and gateway URL
5. **Backend Server** returns metadata to frontend
6. **Frontend** stores metadata in ICP backend canister
7. **Files** are served via IPFS gateway URLs

## 🛠️ Technology Stack

- **Blockchain**: Internet Computer Protocol (ICP)
- **Backend Canister**: Rust with Candid interface
- **Frontend**: React + Vite + Tailwind CSS
- **Backend Server**: Node.js + Express
- **File Storage**: IPFS via Pinata
- **Authentication**: Internet Identity
- **HTTP Gateway**: Pinata Gateway

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v16 or higher)
- **npm** or **yarn**
- **DFX** (Internet Computer SDK)
- **Rust** and **Cargo**
- **Git**
- **Pinata Account** (for IPFS storage)

## 🚀 Installation

### 1. Clone the Repository
```bash
git clone <repository-url>
cd icp_cdn
```

### 2. Install Dependencies
```bash
# Install frontend dependencies
cd src/icp_cdn_frontend
npm install

# Install backend server dependencies
cd ../../pinata_backend
npm install

# Install backend canister dependencies (from project root)
cd ..
cargo build
```

### 3. Set Up Environment Variables
```bash
# Run the setup script
./scripts/deployment/setup_env.sh
```

This will prompt you for:
- **Pinata JWT**: Your Pinata API JWT token
- **Pinata Gateway**: Your Pinata gateway domain

### 4. Start Local Internet Computer
```bash
dfx start --background
```

### 5. Deploy Canisters
```bash
# Deploy with environment setup
./scripts/deployment/deploy_with_env.sh
```

### 6. Start Backend Server
```bash
# In a new terminal
cd pinata_backend
node server.js
```

### 7. Start Development Server
```bash
# In another terminal
cd src/icp_cdn_frontend
npm run dev
```

## 🌐 Usage

### Getting Started

1. **Access the Application**
   - Open your browser and navigate to the deployed frontend URL
   - The application will be available at the URL provided by `dfx deploy`

2. **Authentication**
   - Click "Login" to authenticate with Internet Identity
   - Create an account or use an existing Internet Identity

3. **Upload Files**
   - Navigate to the Dashboard
   - Select a file to upload
   - Click "Upload" to store your file on IPFS via Pinata

4. **Manage Content**
   - View all uploaded files in the dashboard
   - Copy shareable IPFS gateway links for your assets
   - Delete files when no longer needed (removes from metadata, unpins from IPFS)

### File Types Supported

- **Images**: PNG, JPG, GIF, SVG, WebP
- **Videos**: MP4, WebM, MOV
- **Documents**: PDF, DOC, DOCX, TXT
- **Web Assets**: HTML, CSS, JavaScript, JSON
- **Fonts**: WOFF, TTF, OTF
- **Archives**: ZIP, RAR, 7Z

### API Integration

Use your uploaded assets in web applications:

```html
<!-- Image example -->
<img src="https://your-gateway.mypinata.cloud/ipfs/QmYourIPFSHash" />

<!-- Video example -->
<video src="https://your-gateway.mypinata.cloud/ipfs/QmYourIPFSHash" />
```

## 🔧 Development

### Project Structure
```
icp_cdn/
├── src/
│   ├── icp_cdn_backend/     # Rust backend canister
│   └── icp_cdn_frontend/    # React frontend
├── pinata_backend/          # Express backend server
├── scripts/
│   ├── deployment/          # Deployment scripts
│   ├── pinataguide.txt      # Pinata best practices
│   └── update_frontend_env.cjs
├── dfx.json                 # DFX configuration
├── Cargo.toml              # Rust dependencies
└── package.json            # Node.js dependencies
```

### Available Scripts

```bash
# Deployment
./scripts/deployment/setup_env.sh      # Set up environment variables
./scripts/deployment/deploy.sh         # Deploy canisters
./scripts/deployment/deploy_with_env.sh # Deploy with environment setup

# Frontend development
cd src/icp_cdn_frontend
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build

# Backend development
dfx build            # Build canisters
dfx deploy           # Deploy to local network
dfx canister call    # Call canister methods

# Backend server
cd pinata_backend
node server.js       # Start Express backend server
```

### Environment Variables

#### Frontend (.env in src/icp_cdn_frontend/)
```env
VITE_DFX_REPLICA_HOST=http://127.0.0.1:4943
VITE_CANISTER_ID_BACKEND=<backend_canister_id>
VITE_CANISTER_ID_FRONTEND=<frontend_canister_id>
VITE_CANISTER_ID_INTERNET_IDENTITY=be2us-64aaa-aaaaa-qaabq-cai
VITE_PINATA_JWT=<your_pinata_jwt>
VITE_PINATA_GATEWAY=<your_gateway_domain.mypinata.cloud>
```

#### Backend Server (.env in root)
```env
VITE_PINATA_JWT=<your_pinata_jwt>
VITE_PINATA_GATEWAY=<your_gateway_domain.mypinata.cloud>
```

## 🌟 Key Benefits

### **Decentralization**
- No single point of failure
- Censorship-resistant content delivery
- Community-owned infrastructure
- IPFS-based distributed storage

### **Security**
- JWT tokens never exposed to frontend
- Secure backend proxy for all Pinata operations
- User data isolation and privacy
- Tamper-proof file storage on IPFS

### **Performance**
- Global IPFS distribution with minimal latency
- Automatic load balancing through IPFS
- Optimized content delivery via Pinata gateway
- No traditional CDN costs

### **Cost-Effective**
- No traditional CDN costs
- Pay-per-use model with Pinata
- Reduced infrastructure overhead
- Shared IPFS network benefits

## 🤝 Contributing

We welcome contributions! Please see our contributing guidelines for details.

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

- **Documentation**: Check the project wiki
- **Issues**: Report bugs and feature requests on GitHub
- **Discussions**: Join our community discussions
- **Discord**: Connect with the team on Discord

## 🔮 Future Works & Advanced Features

### 🚀 **Enhanced IPFS Integration**
- **IPFS Cluster**: Multi-node IPFS cluster for enhanced reliability
- **Content Addressing**: Advanced content-addressed storage strategies
- **IPFS Pinning**: Intelligent pinning strategies for popular content
- **Cross-Gateway Support**: Multiple IPFS gateway support

### 🔐 **Advanced Security & Privacy**
- **End-to-End Encryption**: Client-side encryption before upload
- **Access Control Lists (ACLs)**: Granular permissions for file sharing
- **Time-based Access**: Expiring links and temporary access tokens
- **Audit Logging**: Comprehensive access and modification tracking
- **Zero-Knowledge Proofs**: Privacy-preserving file verification

### 📊 **Analytics & Monitoring**
- **Real-time Analytics**: Detailed usage statistics and performance metrics
- **Bandwidth Monitoring**: Track data transfer and optimize costs
- **Performance Insights**: Latency analysis and optimization recommendations
- **User Behavior Analytics**: Understand content consumption patterns
- **Predictive Scaling**: AI-powered resource allocation

### 🌐 **Advanced CDN Features**
- **Edge Computing**: Deploy serverless functions at the edge
- **Image Processing**: On-the-fly image resizing, compression, and format conversion
- **Video Streaming**: Adaptive bitrate streaming with multiple quality options
- **Cache Optimization**: Intelligent caching strategies for popular content
- **DDoS Protection**: Built-in protection against distributed attacks

### 🔗 **Integration & APIs**
- **RESTful API**: Comprehensive API for third-party integrations
- **Webhook Support**: Real-time notifications for file events
- **SDK Libraries**: Client libraries for JavaScript, Python, Rust, and Go
- **CLI Tool**: Command-line interface for bulk operations
- **Git Integration**: Direct deployment from Git repositories

### 💰 **Tokenomics & Incentives**
- **ICP Token Integration**: Pay-per-use model with ICP tokens
- **Staking Rewards**: Earn rewards for providing storage capacity
- **Content Monetization**: Revenue sharing for popular content creators
- **Referral System**: Incentivize network growth through referrals
- **Premium Features**: Advanced features for premium subscribers

### 🤖 **AI & Machine Learning**
- **Content Classification**: Automatic categorization of uploaded files
- **Duplicate Detection**: Identify and manage duplicate content
- **Content Moderation**: AI-powered inappropriate content filtering
- **Smart Compression**: ML-optimized file compression algorithms
- **Predictive Caching**: AI-driven content popularity prediction

### 📱 **Mobile & Cross-Platform**
- **Mobile SDK**: Native iOS and Android libraries
- **Progressive Web App**: Offline-capable web application
- **Desktop Client**: Native desktop applications
- **Browser Extension**: Direct integration with web browsers
- **IoT Integration**: Support for IoT device content delivery

### 🌍 **Global Infrastructure**
- **Multi-Region Deployment**: Deploy across multiple ICP subnets
- **Inter-Canister Communication**: Seamless data transfer between canisters
- **Fault Tolerance**: Automatic failover and recovery mechanisms
- **Disaster Recovery**: Comprehensive backup and restoration systems
- **Compliance**: GDPR, CCPA, and other regulatory compliance features

### 🔧 **Developer Experience**
- **Visual Studio Code Extension**: Integrated development experience
- **Templates & Boilerplates**: Pre-built templates for common use cases
- **Testing Framework**: Comprehensive testing tools and utilities
- **Documentation Generator**: Auto-generated API documentation
- **Community Marketplace**: Share and discover custom integrations

### 🎯 **Enterprise Features**
- **Multi-Tenancy**: Support for multiple organizations and teams
- **SSO Integration**: Single Sign-On with enterprise identity providers
- **Advanced Reporting**: Custom reports and analytics dashboards
- **Compliance Dashboard**: Regulatory compliance monitoring
- **White-label Solutions**: Customizable branding and deployment options

## 🔗 Links

- **Live Demo**: [CanisterDrop Demo](comingsoon)
- **Documentation**: [Project Wiki](comingsoon)
- **Internet Computer**: [ICP Documentation](https://internetcomputer.org/docs)
- **DFX**: [DFX Documentation](https://internetcomputer.org/docs/current/developer-docs/setup/install/)
- **Pinata**: [Pinata Documentation](https://docs.pinata.cloud/)

---

**Built with ❤️ on the Internet Computer Protocol + IPFS**

*Empowering the future of decentralized content delivery*
