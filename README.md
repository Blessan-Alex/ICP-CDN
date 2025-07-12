# CanisterDrop: Decentralized CDN on ICP + Pinata

A decentralized Content Delivery Network (CDN) built on the Internet Computer Protocol (ICP) with IPFS storage via Pinata. Upload, share, and manage files securely and globally.

---

## 🚀 Quick Start (For New Users)

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
