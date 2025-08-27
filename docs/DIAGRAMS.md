# 📊 **CanisterDrop: Architecture & User Flow Diagrams**

## 🏗️ **System Architecture**

### **High-Level Architecture**

```mermaid
graph TB
    subgraph "Frontend Layer"
        A[React Frontend<br/>Vite + Tailwind]
        B[Internet Identity<br/>Authentication]
    end
    
    subgraph "ICP Canister Layer"
        D[icp_cdn_backend<br/>Rust Canister]
        E[icp_cdn_frontend<br/>Assets Canister]
        F[Client Library<br/>Rust Library]
    end
    
    subgraph "External Services"
        G[Pinata IPFS<br/>File Storage]
        H[IPFS Gateway<br/>Content Delivery]
    end
    
    subgraph "Data Storage"
        J[LRU Cache<br/>In-Memory Storage]
        K[User Accounts<br/>Tier Management]
    end
    
    A --> D
    B --> D
    D --> G
    D --> H
    D --> J
    D --> K
    F --> D
```

---

## 🔄 **Core User Flows**

### **1. File Upload & Content Delivery Flow**

```mermaid
sequenceDiagram
    participant U as User
    participant F as Frontend
    participant B as Backend
    participant C as Cache
    participant P as Pinata
    participant I as IPFS
    
    Note over U,I: Upload Flow
    U->>F: Drag & Drop File
    F->>B: Upload Content
    B->>C: Store in LRU Cache
    B->>P: Upload to IPFS
    P->>I: Pin Content
    I->>P: Return CID
    P->>B: Return CID
    B->>F: Return Success + CID
    F->>U: Show Upload Success
    
    Note over U,I: Content Delivery Flow
    U->>F: Request Content (CID)
    F->>B: Get Content
    B->>C: Check Cache
    alt Cache Hit
        C->>B: Return Cached Content
        B->>F: Return Content
        F->>U: Display Content
    else Cache Miss
        C->>B: Cache Miss
        B->>I: HTTP Outcall to IPFS
        I->>B: Return Content
        B->>C: Store in Cache
        B->>F: Return Content
        F->>U: Display Content
    end
```

### **2. Canister-to-Canister Integration Flow**

```mermaid
sequenceDiagram
    participant C1 as Client Canister<br/>(OpenChat, Caffeine, etc.)
    participant CDN as CDN Canister
    participant C as Cache
    participant P as Pinata
    
    C1->>CDN: upload_asset(content, cycles)
    CDN->>CDN: Generate CID
    CDN->>C: Store in Cache
    CDN->>P: Upload to IPFS
    P->>CDN: Return CID
    CDN->>C1: Return CID
    
    C1->>CDN: get_asset_with_fallback(cid)
    CDN->>C: Check Cache
    alt Cache Hit
        C->>CDN: Return Content
        CDN->>C1: Return Content
    else Cache Miss
        C->>CDN: Cache Miss
        CDN->>P: Fetch from IPFS
        P->>CDN: Return Content
        CDN->>C: Store in Cache
        CDN->>C1: Return Content
    end
```

---

## 🎯 **Key System Features**

### **Tier System**
- **Free**: 20MB cache, basic upload
- **Starter**: 50MB cache, IPFS pinning (1B cycles)
- **Pro**: 100MB cache, advanced features (5B cycles)
- **Business**: 500MB cache, enterprise features (15B cycles)

### **Cache Strategy**
- **LRU Eviction**: Automatic cache management
- **Tier-Based Limits**: Different cache sizes per user
- **Performance Optimization**: Fast access to frequently used content

### **Error Handling**
- **Graceful Degradation**: Fallback to IPFS when cache misses
- **Retry Logic**: Automatic retry for failed HTTP outcalls
- **User Feedback**: Clear error messages and status updates

---

*These diagrams show the essential architecture and user flows of CanisterDrop, demonstrating how it provides a seamless decentralized CDN experience for ICP developers.*
