# 📊 **CanisterDrop: Architecture & User Flow Diagrams**

## 🏗️ **System Architecture Diagrams**

### **1. High-Level System Architecture**

```mermaid
graph TB
    subgraph "Frontend Layer"
        A[React Frontend<br/>Vite + Tailwind]
        B[Internet Identity<br/>Authentication]
        C[User Interface<br/>Dashboard, Upload, Cache]
    end
    
    subgraph "ICP Canister Layer"
        D[icp_cdn_backend<br/>Rust Canister]
        E[icp_cdn_frontend<br/>Assets Canister]
        F[Client Library<br/>Rust Library]
    end
    
    subgraph "External Services"
        G[Pinata IPFS<br/>File Storage]
        H[IPFS Gateway<br/>Content Delivery]
        I[Cloudflare Gateway<br/>Fallback]
    end
    
    subgraph "Data Storage"
        J[LRU Cache<br/>In-Memory Storage]
        K[User Accounts<br/>Tier Management]
        L[Performance Metrics<br/>Analytics]
    end
    
    A --> D
    A --> E
    B --> D
    C --> D
    D --> G
    D --> H
    D --> I
    D --> J
    D --> K
    D --> L
    F --> D
```

### **2. Detailed Canister Architecture**

```mermaid
graph LR
    subgraph "Backend Canister (icp_cdn_backend)"
        A1[HTTP Outcalls<br/>Manager]
        A2[LRU Cache<br/>Manager]
        A3[User Account<br/>Manager]
        A4[Image Processing<br/>Engine]
        A5[Cycles Billing<br/>Manager]
        A6[Performance<br/>Monitor]
    end
    
    subgraph "State Management"
        B1[Cache Storage<br/>HashMap<String, CacheEntry>]
        B2[User Accounts<br/>HashMap<Principal, UserAccount>]
        B3[LRU Queue<br/>VecDeque<String>]
        B4[Metrics<br/>PerformanceMetrics]
    end
    
    subgraph "External APIs"
        C1[Pinata API<br/>File Upload]
        C2[IPFS Gateway<br/>Content Fetch]
        C3[HTTP Transform<br/>Response Handler]
    end
    
    A1 --> C1
    A1 --> C2
    A1 --> C3
    A2 --> B1
    A2 --> B3
    A3 --> B2
    A4 --> B1
    A5 --> B2
    A6 --> B4
```

### **3. Data Flow Architecture**

```mermaid
flowchart TD
    A[User Upload] --> B[Frontend Validation]
    B --> C[Backend Tier Check]
    C --> D[Cache Storage]
    D --> E[IPFS Upload]
    E --> F[CID Return]
    
    G[Content Request] --> H[Cache Check]
    H --> I{Cache Hit?}
    I -->|Yes| J[Return Cached Content]
    I -->|No| K[HTTP Outcall to IPFS]
    K --> L[Fetch from IPFS]
    L --> M[Store in Cache]
    M --> N[Return Content]
    
    O[Image Resize Request] --> P[Get Original Image]
    P --> Q[On-Chain Processing]
    Q --> R[Format Conversion]
    R --> S[Return Optimized Image]
```

---

## 🔄 **User Flow Diagrams**

### **1. User Authentication Flow**

```mermaid
sequenceDiagram
    participant U as User
    participant F as Frontend
    participant II as Internet Identity
    participant B as Backend Canister
    
    U->>F: Access Application
    F->>U: Show Login Button
    U->>F: Click Login
    F->>II: Request Authentication
    II->>U: Show Identity Provider
    U->>II: Authenticate
    II->>F: Return Principal
    F->>B: Verify Principal
    B->>F: Return User Account
    F->>U: Show Dashboard
```

### **2. File Upload Flow**

```mermaid
sequenceDiagram
    participant U as User
    participant F as Frontend
    participant B as Backend
    participant C as Cache
    participant P as Pinata
    participant I as IPFS
    
    U->>F: Drag & Drop File
    F->>F: Validate File Size/Type
    F->>B: Upload Content
    B->>B: Check User Tier
    B->>C: Store in LRU Cache
    B->>P: Upload to IPFS
    P->>I: Pin Content
    I->>P: Return CID
    P->>B: Return CID
    B->>F: Return Success + CID
    F->>U: Show Upload Success
```

### **3. Content Delivery Flow**

```mermaid
sequenceDiagram
    participant U as User
    participant F as Frontend
    participant B as Backend
    participant C as Cache
    participant I as IPFS Gateway
    
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

### **4. Image Processing Flow**

```mermaid
sequenceDiagram
    participant U as User
    participant F as Frontend
    participant B as Backend
    participant I as Image Processor
    
    U->>F: Request Image Resize
    F->>B: Resize Request (CID, dimensions)
    B->>B: Get Original Image
    B->>I: Process Image
    I->>I: Load Image
    I->>I: Resize to Dimensions
    I->>I: Convert Format
    I->>B: Return Processed Image
    B->>F: Return Optimized Image
    F->>U: Display Resized Image
```

### **5. Tier Upgrade Flow**

```mermaid
sequenceDiagram
    participant U as User
    participant F as Frontend
    participant B as Backend
    
    U->>F: Request Tier Upgrade
    F->>B: Get Available Upgrades
    B->>F: Return Upgrade Options
    F->>U: Show Upgrade Options
    U->>F: Select Tier
    F->>B: Upgrade Request
    B->>B: Check Cycles Balance
    B->>B: Deduct Cycles
    B->>B: Update User Tier
    B->>F: Return Updated Account
    F->>U: Show Upgrade Success
```

### **6. Canister-to-Canister Communication Flow**

```mermaid
sequenceDiagram
    participant C1 as Client Canister
    participant CDN as CDN Canister
    participant C as Cache
    participant P as Pinata
    
    C1->>CDN: upload_asset(content, cycles)
    CDN->>CDN: Generate CID
    CDN->>C: Store in Cache
    CDN->>P: Upload to IPFS
    P->>CDN: Return CID
    CDN->>C1: Return CID
    
    C1->>CDN: get_asset(cid)
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

## 📊 **Component Interaction Diagrams**

### **1. Cache Management Flow**

```mermaid
flowchart TD
    A[New Content] --> B[Check Cache Size]
    B --> C{Cache Full?}
    C -->|No| D[Add to Cache]
    C -->|Yes| E[Evict LRU Item]
    E --> F[Remove from LRU Queue]
    F --> G[Remove from Cache]
    G --> D
    D --> H[Add to LRU Queue]
    H --> I[Update Cache Stats]
```

### **2. HTTP Outcall Flow**

```mermaid
flowchart TD
    A[HTTP Request] --> B[Format Request]
    B --> C[Add Headers]
    C --> D[Set Transform Function]
    D --> E[Send Request]
    E --> F[Wait for Response]
    F --> G[Transform Response]
    G --> H[Return Processed Data]
```

### **3. Performance Monitoring Flow**

```mermaid
flowchart TD
    A[Request Received] --> B[Start Timer]
    B --> C[Process Request]
    C --> D[End Timer]
    D --> E[Update Metrics]
    E --> F[Check Cache Hit/Miss]
    F --> G[Update Cache Stats]
    G --> H[Store Performance Data]
```

---

## 🎯 **Key System Interactions**

### **1. Multi-Tier Support**
- **Free Tier**: Basic upload, 20MB cache limit
- **Starter Tier**: IPFS pinning, 50MB cache limit
- **Pro Tier**: Advanced features, 100MB cache limit
- **Business Tier**: Enterprise features, 500MB cache limit

### **2. Cache Strategy**
- **LRU Eviction**: Least Recently Used items removed first
- **Tier-Based Limits**: Different cache sizes per user tier
- **Automatic Management**: No manual intervention required
- **Performance Optimization**: Fast access to frequently used content

### **3. Error Handling**
- **Graceful Degradation**: Fallback to IPFS when cache misses
- **Retry Logic**: Automatic retry for failed HTTP outcalls
- **User Feedback**: Clear error messages and status updates
- **Logging**: Comprehensive error logging for debugging

---

*These diagrams provide a comprehensive view of the CanisterDrop system architecture and user flows, showing how all components work together to deliver a seamless decentralized CDN experience.*
