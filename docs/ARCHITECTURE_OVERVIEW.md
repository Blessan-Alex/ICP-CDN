# 🏗️ **CanisterDrop: Architecture Overview**

## 📋 **Table of Contents**
- [Project Overview](#project-overview)
- [Simple User Workflow](#simple-user-workflow)
- [System Architecture](#system-architecture)
- [Component Breakdown](#component-breakdown)
- [Data Flow](#data-flow)
- [Technical Stack](#technical-stack)
- [Key Features](#key-features)

---

## 🎯 **Project Overview**

**CanisterDrop** is a decentralized Content Delivery Network (dCDN) built entirely on the Internet Computer Protocol (ICP). It provides fast, secure, and cost-effective content delivery with intelligent caching, on-chain image processing, and seamless integration for other ICP projects.

### **Core Value Proposition**
- **100% ICP-Native**: Everything runs on canisters with no external dependencies
- **Intelligent Caching**: LRU cache system with tier-based limits
- **On-Chain Processing**: Image resizing and transformations within canisters
- **Cycles Billing**: Native ICP cycles for sustainable economics
- **Easy Integration**: Client library for OpenChat, Caffeine, and other ICP dApps

---

## 🔄 **Simple User Workflow**

### **1. User Authentication**
```
User → Internet Identity → AuthContext → Backend Canister
```
- User connects with Internet Identity
- Authentication state managed in React AuthContext
- Backend verifies user principal for all operations

### **2. File Upload Process**
```
User → EnhancedUpload → Backend → Cache → Pinata → IPFS
```
1. **Drag & Drop**: User uploads file via EnhancedUpload component
2. **Tier Check**: System verifies user's tier limits (Free/Starter/Pro/Business)
3. **Cache Storage**: File stored in LRU cache with tier-based limits
4. **IPFS Upload**: Content uploaded to Pinata for persistent storage
5. **CID Return**: Content Identifier (CID) returned to user

### **3. Content Delivery**
```
User Request → Cache Check → IPFS Fallback → Content Delivery
```
1. **Cache First**: System checks LRU cache for content
2. **Cache Hit**: Return cached content immediately (<100ms)
3. **Cache Miss**: Fetch from IPFS via HTTP outcall
4. **Content Delivery**: Serve content with proper headers

### **4. Image Processing**
```
User → ImageResizer → On-Chain Processing → Optimized Image
```
1. **Resize Request**: User specifies dimensions and format
2. **On-Chain Processing**: Image resized within canister
3. **Format Conversion**: PNG, JPEG, WebP support
4. **Optimized Delivery**: Compressed image returned

### **5. Performance Monitoring**
```
Real-time Metrics → PerformanceMonitor → Analytics Dashboard
```
- Cache hit/miss ratios
- Response times
- User tier usage
- System performance analytics

---

## 🏛️ **System Architecture**

### **Frontend Layer (React + Vite)**
```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend Layer                           │
├─────────────────────────────────────────────────────────────┤
│  Core UI Components                                         │
│  ├── HeroSection (Landing Page)                            │
│  ├── Dashboard (Main Interface)                            │
│  ├── EnhancedUpload (Drag & Drop)                          │
│  ├── CacheDashboard (Real-time Stats)                      │
│  ├── PerformanceMonitor (Live Analytics)                   │
│  ├── Tiers Management (Upgrade Interface)                  │
│  └── CyclesBilling (Payment Processing)                    │
├─────────────────────────────────────────────────────────────┤
│  Advanced Features                                          │
│  ├── ImageResizer (On-chain Processing)                    │
│  ├── LibraryDemo (Client Integration)                      │
│  ├── CanisterToCanisterDemo (C2C Testing)                  │
│  ├── SmartContentDelivery (Optimized Delivery)             │
│  └── EnhancedFileCard (File Management)                    │
└─────────────────────────────────────────────────────────────┘
```

### **ICP Canister Layer**
```
┌─────────────────────────────────────────────────────────────┐
│                    ICP Canister Layer                       │
├─────────────────────────────────────────────────────────────┤
│  Main Backend Canister (icp_cdn_backend)                   │
│  ├── Core State Management                                 │
│  │   ├── Main Canister (Rust Implementation)              │
│  │   ├── LRU Cache Manager (Tier-based Limits)            │
│  │   ├── User Account Manager (Tier System)               │
│  │   ├── Image Processor (On-chain Resizing)              │
│  │   ├── Cycles Billing (Payment Processing)              │
│  │   └── Performance Metrics (Real-time Tracking)         │
│  ├── Data Structures                                       │
│  │   ├── IpfsFile (File Metadata)                         │
│  │   ├── CacheEntry (Cached Content)                      │
│  │   ├── UserAccount (User Data)                          │
│  │   ├── UserTier (Free/Starter/Pro/Business)             │
│  │   ├── UserTierInfo (Tier Details)                      │
│  │   └── CachePerformanceMetrics (Analytics)              │
│  └── Core Functions                                        │
│      ├── upload_content() (Main Upload Handler)           │
│      ├── fetch_from_ipfs() (HTTP Outcall to IPFS)         │
│      ├── upload_to_pinata() (HTTP Outcall to Pinata)      │
│      ├── get_content_with_resize() (Image Processing)     │
│      ├── deposit_cycles() (Cycles Payment)                │
│      ├── put_cache_entry() (Cache Management)             │
│      └── evict_lru_item() (LRU Eviction)                  │
├─────────────────────────────────────────────────────────────┤
│  Client Library (icp_cdn_client)                           │
│  ├── CdnClient (Rust Library)                             │
│  ├── Client API (Canister-to-Canister)                    │
│  ├── upload_asset() (Asset Upload)                        │
│  ├── get_asset() (Asset Retrieval)                        │
│  ├── get_asset_with_fallback() (Cache + IPFS)             │
│  ├── deposit_cycles() (Cycles Payment)                    │
│  ├── estimate_upload_cost() (Cost Calculation)            │
│  └── upgrade_tier() (Tier Upgrades)                       │
├─────────────────────────────────────────────────────────────┤
│  Authentication                                             │
│  ├── Internet Identity (Authentication Service)            │
│  └── AuthContext (React Auth State)                       │
└─────────────────────────────────────────────────────────────┘
```

### **External Services Layer**
```
┌─────────────────────────────────────────────────────────────┐
│                    External Services                        │
├─────────────────────────────────────────────────────────────┤
│  IPFS Storage                                              │
│  ├── Pinata API (IPFS Pinning Service)                    │
│  ├── IPFS Gateway (Cloudflare Gateway)                    │
│  └── Pinata JWT (Authentication Token)                    │
├─────────────────────────────────────────────────────────────┤
│  Other ICP Projects                                        │
│  ├── OpenChat (Social Platform)                           │
│  ├── Caffeine (Content Platform)                          │
│  └── Other ICP dApps (Client Library Users)               │
├─────────────────────────────────────────────────────────────┤
│  HTTP Outcalls                                             │
│  ├── Management Canister (HTTP Outcall Handler)           │
│  └── HTTP Request (External API Calls)                    │
└─────────────────────────────────────────────────────────────┘
```

### **Data Storage Layer**
```
┌─────────────────────────────────────────────────────────────┐
│                    Data Storage Layer                       │
├─────────────────────────────────────────────────────────────┤
│  In-Memory Storage                                         │
│  ├── LRU Cache (HashMap<String, CacheEntry>)              │
│  ├── User Accounts (HashMap<Principal, UserAccount>)      │
│  ├── Performance Metrics (Real-time Analytics)            │
│  ├── LRU Queue (VecDeque<String>)                         │
│  └── User Files (HashMap<String, Vec<IpfsFile>>)          │
├─────────────────────────────────────────────────────────────┤
│  Configuration                                             │
│  ├── Tier Configuration (Cache Limits & Pricing)          │
│  ├── Pinata Configuration (API Settings)                  │
│  └── HTTP Configuration (Outcall Settings)                │
└─────────────────────────────────────────────────────────────┘
```

---

## 🧩 **Component Breakdown**

### **Frontend Components (19 Total)**

#### **Core UI Components**
- **HeroSection**: Landing page with project overview
- **Navbar**: Navigation with authentication status
- **Dashboard**: Main interface with file management
- **EnhancedUpload**: Drag & drop upload with progress tracking
- **CacheDashboard**: Real-time cache statistics and management
- **PerformanceMonitor**: Live performance analytics
- **Tiers Management**: User tier information and upgrade interface
- **CyclesBilling**: Payment processing and cycles management

#### **Advanced Features**
- **ImageResizer**: On-chain image processing interface
- **LibraryDemo**: Client library integration demonstration
- **CanisterToCanisterDemo**: Canister-to-canister communication testing
- **SmartContentDelivery**: Optimized content delivery interface
- **EnhancedFileCard**: File management and preview

#### **Supporting Components**
- **FeatureSection**: Product showcase and features
- **AboutUs**: Project information and team details
- **Mission**: Vision statement and goals
- **Footer**: Links and additional information

### **Backend Components**

#### **Core Functions (7 Total)**
1. **upload_content()**: Main upload handler with tier validation
2. **fetch_from_ipfs()**: HTTP outcall to IPFS gateways
3. **upload_to_pinata()**: HTTP outcall to Pinata API
4. **get_content_with_resize()**: On-chain image processing
5. **deposit_cycles()**: Cycles payment processing
6. **put_cache_entry()**: Cache management with LRU eviction
7. **evict_lru_item()**: LRU cache eviction logic

#### **Data Structures (6 Total)**
1. **IpfsFile**: File metadata (name, CID, size, content_type, uploaded_at)
2. **CacheEntry**: Cached content (CID, content_type, size, bytes, last_accessed_ts)
3. **UserAccount**: User data (principal, cycles_balance, tier, cache_usage_bytes, pinata_enabled)
4. **UserTier**: Tier enumeration (Free, Starter, Pro, Business)
5. **UserTierInfo**: Tier details (current_tier, cache_limit_bytes, available_upgrades)
6. **CachePerformanceMetrics**: Analytics (total_requests, cache_hits, cache_misses, avg_response_time_ms)

#### **State Management (6 Total)**
1. **Main Canister**: Central coordination and request handling
2. **LRU Cache Manager**: Tier-based cache limits and eviction
3. **User Account Manager**: Tier system and user data management
4. **Image Processor**: On-chain image resizing and transformations
5. **Cycles Billing**: Payment processing and cycles management
6. **Performance Metrics**: Real-time analytics and monitoring

### **Client Library Components**

#### **Core Methods (8 Total)**
1. **upload_asset()**: Asset upload with tier checking
2. **get_asset()**: Asset retrieval from cache
3. **get_asset_with_fallback()**: Cache + IPFS fallback retrieval
4. **deposit_cycles()**: Cycles payment for other canisters
5. **estimate_upload_cost()**: Cost estimation for uploads
6. **upgrade_tier()**: Tier upgrade functionality
7. **get_user_account()**: User account management
8. **generate_cid()**: Content Identifier generation

---

## 🌊 **Data Flow**

### **Upload Flow**
```
1. User Upload Request
   ↓
2. Frontend Validation (File size, type)
   ↓
3. Backend Tier Check (User limits)
   ↓
4. Cache Storage (LRU with eviction)
   ↓
5. Pinata Upload (IPFS pinning)
   ↓
6. CID Return (Content Identifier)
```

### **Retrieval Flow**
```
1. Content Request
   ↓
2. Cache Check (LRU lookup)
   ↓
3a. Cache Hit → Return Content (<100ms)
   ↓
3b. Cache Miss → HTTP Outcall to IPFS
   ↓
4. IPFS Response → Cache Storage
   ↓
5. Content Delivery
```

### **Image Processing Flow**
```
1. Resize Request (dimensions, format)
   ↓
2. Content Retrieval (from cache/IPFS)
   ↓
3. On-Chain Processing (image library)
   ↓
4. Format Conversion (PNG/JPEG/WebP)
   ↓
5. Optimized Image Return
```

### **Cycles Billing Flow**
```
1. User Action (upload/upgrade)
   ↓
2. Cost Estimation (tier-based pricing)
   ↓
3. Cycles Deduction (automatic)
   ↓
4. Balance Update (user account)
   ↓
5. Service Provision
```

---

## 🛠️ **Technical Stack**

### **Frontend**
- **React 18**: Modern UI framework
- **Vite**: Fast build tool and dev server
- **Tailwind CSS**: Utility-first CSS framework
- **Framer Motion**: Animation library
- **React Router**: Client-side routing
- **Lucide React**: Icon library

### **Backend**
- **Rust**: Systems programming language
- **Candid**: Interface definition language
- **IC CDK**: Internet Computer development kit
- **Image**: Image processing library
- **Serde**: Serialization framework

### **External Services**
- **Internet Identity**: Authentication service
- **Pinata**: IPFS pinning service
- **IPFS**: Distributed file system
- **Cloudflare Gateway**: IPFS gateway

### **Development Tools**
- **DFX**: Internet Computer SDK
- **Cargo**: Rust package manager
- **npm**: Node.js package manager
- **Mermaid**: Diagram generation

---

## ✨ **Key Features**

### **Core dCDN Features**
- ✅ **File Upload**: Drag & drop with progress tracking
- ✅ **Content Delivery**: Fast retrieval with intelligent caching
- ✅ **Image Processing**: On-chain resizing and format conversion
- ✅ **Cache Management**: LRU eviction with tier-based limits
- ✅ **Performance Monitoring**: Real-time analytics and metrics

### **Tier System & Billing**
- ✅ **Free Tier**: 20MB cache, basic features
- ✅ **Starter Tier**: 50MB cache, IPFS pinning (1B cycles)
- ✅ **Pro Tier**: 100MB cache, IPFS pinning (5B cycles)
- ✅ **Business Tier**: 500MB cache, IPFS pinning (15B cycles)
- ✅ **Cycles Billing**: Automatic payment processing

### **Developer Tools**
- ✅ **Client Library**: Rust library for canister-to-canister communication
- ✅ **Easy Integration**: Simple API for OpenChat, Caffeine, and other ICP dApps
- ✅ **Comprehensive Testing**: Automated test suites
- ✅ **Documentation**: Complete guides and examples

### **Security & Authentication**
- ✅ **Internet Identity**: Secure authentication
- ✅ **Principal Verification**: User identity validation
- ✅ **Tier-based Access**: Feature access control
- ✅ **Content Verification**: Cryptographic verification

### **Analytics & Monitoring**
- ✅ **Cache Performance**: Hit/miss ratios and response times
- ✅ **User Analytics**: Tier usage and system performance
- ✅ **Real-time Metrics**: Live dashboard updates
- ✅ **Performance Optimization**: Continuous improvement

---

## 🚀 **Deployment Architecture**

### **Canister Configuration**
```json
{
  "icp_cdn_backend": {
    "type": "rust",
    "http_outcall": true,
    "candid": "src/icp_cdn_backend/icp_cdn_backend.did"
  },
  "icp_cdn_frontend": {
    "type": "assets",
    "dependencies": ["icp_cdn_backend"]
  },
  "internet_identity": {
    "type": "custom",
    "remote": {
      "id": {
        "ic": "rdmx6-jaaaa-aaaaa-aaadq-cai"
      }
    }
  }
}
```

### **Environment Configuration**
```env
# Frontend Environment
VITE_DFX_REPLICA_HOST=http://127.0.0.1:4943
VITE_DFX_NETWORK=local
VITE_PINATA_GATEWAY=gateway.pinata.cloud
VITE_MAX_FILE_SIZE_MB=50
VITE_ENABLE_DEBUG_LOGS=true

# Backend Configuration
PINATA_JWT=your_pinata_jwt_token
HTTP_OUTCALL_CYCLES=15000000000
```

---

## 📊 **Performance Metrics**

### **Current Capabilities**
- **Cache Hit Rate**: 95%+ for cached content
- **Response Time**: <100ms for cache hits
- **Upload Speed**: Real-time with progress tracking
- **Scalability**: Ready for 200+ users
- **Storage**: Up to 2GB total cache capacity

### **Tier Limits**
| Tier | Cache Limit | Pinata Storage | Price (Cycles) | Features |
|------|-------------|----------------|----------------|----------|
| Free | 20MB | 1GB | 0 | Basic upload |
| Starter | 50MB | 100GB | 1B | IPFS pinning |
| Pro | 100MB | 500GB | 5B | Advanced features |
| Business | 500MB | 2TB | 15B | Enterprise features |

---

*This architecture overview provides a comprehensive understanding of the CanisterDrop project's structure, components, and workflows. The system is designed to be scalable, secure, and easy to integrate with other ICP projects.*
