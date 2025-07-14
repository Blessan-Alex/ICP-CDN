# CanisterDrop: Decentralized CDN on ICP + Pinata

A decentralized Content Delivery Network (CDN) built on the Internet Computer Protocol (ICP) with IPFS storage via Pinata. Upload, share, and manage files securely and globally.

---

## 🎥 Demo Video

[![Watch the demo](https://cdn.loom.com/sessions/thumbnails/33b3fb6b09954c6fa4a6527c32323342-with-play.jpg)](https://www.loom.com/share/33b3fb6b09954c6fa4a6527c32323342?sid=04a7f0f0-458a-496f-824d-99a77dfa60a8)

▶️ [Watch the Loom Demo](https://www.loom.com/share/33b3fb6b09954c6fa4a6527c32323342?sid=04a7f0f0-458a-496f-824d-99a77dfa60a8)

---

## 🏁 Beginner Installation & Deployment Guide

### 1. **Install Prerequisites**
- **Node.js** (v16+): [Download](https://nodejs.org/)
- **npm** (comes with Node.js)
- **Rust & Cargo**: [Install](https://www.rust-lang.org/tools/install)
- **DFX (ICP SDK):**
  ```bash
  sh -ci "$(curl -fsSL https://internetcomputer.org/install.sh)"
  # Or see: https://internetcomputer.org/docs/current/developer-docs/setup/install/
  ```
- **Git**
- **Pinata Account** (for IPFS storage): [Sign up](https://pinata.cloud/)

### 2. **Clone the Repository**
```bash
git clone <repository-url>
cd icp_cdn
```

### 3. **Install npm Dependencies**
```bash
# Frontend
cd src/icp_cdn_frontend && npm install
cd ../../..
# Backend
cd pinata_backend && npm install
cd ..
# Rust dependencies
cargo build
```

### 4. **Give Permission to Deployment Script**
```bash
chmod +x ./scripts/deployment/full_deploy.sh
```

### 5. **Set Up Pinata Credentials & .env Files**
Run the deployment script (it will prompt for your Pinata JWT and Gateway):
```bash
./scripts/deployment/full_deploy.sh
```

### 6. **Start the Local ICP Network**
```bash
dfx start --background
# If you encounter issues, try:
dfx start --clean --background
# Or, if you see replica errors:
export DFX_REPLICA_MODE=replica && dfx start --background
```

### 7. **Deploy Canisters**
```bash
./scripts/deployment/full_deploy.sh
# If you see errors about missing declarations, run:
dfx generate
# Then re-run the deploy script.
```

### 8. **Start Backend Server**
```bash
cd pinata_backend
node server.js
```

### 9. **Start Frontend**
```bash
cd src/icp_cdn_frontend
npm run dev
```

### 10. **Open the App**
- Visit [http://localhost:5173](http://localhost:5173) in your browser.
- Login with Internet Identity.
- Upload and manage files!

---

## 🚀 Quick Start (For Experienced Users)

See the [Beginner Installation & Deployment Guide](#-beginner-installation--deployment-guide) above for full details and troubleshooting.

### 1. **Clone the Repo**
```bash
git clone <repository-url>
cd icp_cdn
```

### 2. **Install Prerequisites**
- Node.js (v16+)
- npm or yarn
- DFX (ICP SDK)
- Rust & Cargo
- Git
- Pinata Account (for IPFS storage)

### 3. **Install Dependencies**
```bash
cd src/icp_cdn_frontend && npm install
cd ../../pinata_backend && npm install
cd .. && cargo build
```

### 4. **Set Up Environment Variables**
```bash
./scripts/deployment/full_deploy.sh
```
- This script will prompt for your Pinata JWT and Gateway, and set up all required `.env` files.

### 5. **Start Local ICP Network**
```bash
dfx start --background
```

### 6. **Deploy Canisters**
```bash
./scripts/deployment/full_deploy.sh
```

### 7. **Start Backend Server**
```bash
cd pinata_backend
node server.js
```

### 8. **Start Frontend**
```bash
cd src/icp_cdn_frontend
npm run dev
```

---

## 📝 Usage
- Open the app in your browser (usually at http://localhost:5173)
- Login with Internet Identity
- Upload files (choose public or private/encrypted)
- Manage and share files via IPFS gateway links

---

## 📦 Project Structure
```
icp_cdn/
├── src/
│   ├── icp_cdn_backend/     # Rust backend canister
│   └── icp_cdn_frontend/    # React frontend
├── pinata_backend/          # Express backend server
├── scripts/                 # Deployment and utility scripts
```

---

## 🛠️ Troubleshooting
- If you change `.env` files, always restart the frontend (`npm run dev`).
- If you change canister code, redeploy with `./scripts/deployment/full_deploy.sh`.
- For Internet Identity issues, ensure the canister ID in `.env` matches `dfx canister id internet_identity`.

---

**That’s it! You’re ready to use and develop CanisterDrop.**
