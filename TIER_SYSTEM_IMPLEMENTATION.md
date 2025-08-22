# Tier System Implementation for dCDN

## Overview

This document outlines the comprehensive tier system implementation for the dCDN (decentralized Content Delivery Network) with Pinata integration. The system provides different levels of service based on user tiers, with cache limits and Pinata features varying by tier.

## Tier Structure

### 1. Free Tier
- **Cache Limit**: 20MB
- **Pinata Storage**: 1GB
- **IPFS Pinning**: ❌ Disabled
- **Cost**: Free
- **Features**:
  - Basic content delivery
  - Direct upload to Pinata (no pinning)
  - Content not persistent in IPFS

### 2. Starter Tier
- **Cache Limit**: 50MB
- **Pinata Storage**: 100GB
- **IPFS Pinning**: ✅ Enabled
- **Cost**: 1B cycles (~$1 USD)
- **Features**:
  - IPFS pinning included
  - Priority support
  - Persistent content storage

### 3. Pro Tier
- **Cache Limit**: 100MB
- **Pinata Storage**: 500GB
- **IPFS Pinning**: ✅ Enabled
- **Cost**: 5B cycles (~$5 USD)
- **Features**:
  - IPFS pinning included
  - Advanced analytics
  - Priority support

### 4. Business Tier
- **Cache Limit**: 500MB
- **Pinata Storage**: 2TB
- **IPFS Pinning**: ✅ Enabled
- **Cost**: 15B cycles (~$15 USD)
- **Features**:
  - IPFS pinning included
  - Advanced analytics
  - Dedicated support
  - Custom integrations

## Pinata Integration

### Free Tier Behavior
- Content is uploaded directly to Pinata
- No IPFS pinning occurs
- Content is not persistent in the IPFS network
- Users get 1GB of Pinata storage

### Paid Tier Behavior
- Content is uploaded to Pinata
- Automatic IPFS pinning is performed
- Content becomes persistent in the IPFS network
- Higher storage limits based on tier

## Technical Implementation

### Backend Changes

#### 1. User Account Structure
```rust
pub struct UserAccount {
    pub user_principal: Principal,
    pub cycles_balance: u128,
    pub tier: UserTier,
    pub cache_usage_bytes: u64,
    pub pinata_enabled: bool,
}

pub enum UserTier {
    Free,
    Starter,
    Pro,
    Business,
}
```

#### 2. Cache Management with Tier Limits
- Each user has a cache limit based on their tier
- Cache usage is tracked per user
- LRU eviction respects user limits
- Uploads are rejected if they exceed user's cache limit

#### 3. Tier Upgrade System
- Users can upgrade tiers using cycles
- Upgrade costs are tiered (Free → Starter: 1B cycles, etc.)
- Pinata integration is automatically enabled for paid tiers

### Frontend Changes

#### 1. New Tiers Page
- Displays all available tiers with pricing
- Shows user's current tier and usage
- Allows tier upgrades
- Displays Pinata integration status

#### 2. Enhanced Upload Component
- Respects user's cache limits
- Shows tier-specific upload behavior
- Indicates Pinata pinning status

#### 3. Cache Dashboard Updates
- Shows user-specific cache usage
- Displays tier limits
- Indicates upgrade recommendations

## API Endpoints

### Tier Management
- `get_user_tier_info()` - Get current user's tier information
- `get_available_tiers()` - Get all available tiers with pricing
- `upgrade_tier(target_tier)` - Upgrade user's tier

### Enhanced Upload
- `upload_content(cid, content_type, content)` - Upload with tier-based Pinata integration

## Pinata Pricing Integration

### Current Pinata Pricing (2024)
- **Free**: 1GB storage, 100 files, no pinning
- **Starter ($15/month)**: 100GB storage, 10,000 files, pinning included
- **Pro ($50/month)**: 500GB storage, 50,000 files, pinning included
- **Business ($150/month)**: 2TB storage, 200,000 files, pinning included

### Our Tier Mapping
- **Free Tier**: Uses Pinata free tier (1GB, no pinning)
- **Starter Tier**: Maps to Pinata Starter ($15/month equivalent)
- **Pro Tier**: Maps to Pinata Pro ($50/month equivalent)
- **Business Tier**: Maps to Pinata Business ($150/month equivalent)

## User Experience

### Free Tier Users
- Can upload content up to 20MB cache limit
- Content is stored in Pinata but not pinned to IPFS
- Content may not be persistent
- Basic content delivery functionality

### Paid Tier Users
- Higher cache limits (50MB, 100MB, 500MB)
- Full IPFS pinning included
- Content is persistent in the IPFS network
- Priority support and advanced features

## Cost Structure

### Upgrade Costs (in cycles)
- Free → Starter: 1B cycles (~$1)
- Free → Pro: 5B cycles (~$5)
- Free → Business: 15B cycles (~$15)
- Starter → Pro: 4B cycles (~$4)
- Starter → Business: 14B cycles (~$14)
- Pro → Business: 10B cycles (~$10)

### Ongoing Costs
- Cache storage: 0.1 cycles per byte per hour
- Upload fees: 1 cycle per byte + 1000 cycles base fee
- Pinata integration: Included in tier cost

## Security Considerations

### User Isolation
- Each user's cache usage is tracked separately
- Cache limits are enforced per user
- Tier upgrades require sufficient cycles

### Pinata Integration
- Real JWT token used for API calls
- Tier-based access control
- Automatic pinning only for paid tiers

## Future Enhancements

### Planned Features
1. **User-specific cache ownership tracking**
2. **Automatic tier downgrades for inactive users**
3. **Usage analytics and reporting**
4. **Custom tier configurations**
5. **Bulk upload discounts**

### Scalability Considerations
1. **Multi-canister architecture for cache distribution**
2. **Sharded storage for large-scale deployments**
3. **CDN edge node integration**
4. **Global load balancing**

## Testing

### Tier System Tests
- User tier creation and management
- Cache limit enforcement
- Tier upgrade functionality
- Pinata integration by tier

### Integration Tests
- End-to-end upload flow with tier limits
- Cache eviction with user limits
- Pinata pinning based on tier
- Upgrade flow with cycles deduction

## Deployment Notes

### Environment Variables
- `PINATA_JWT`: Real Pinata JWT token for API access
- Tier limits and costs are configurable constants

### Monitoring
- Track tier upgrade rates
- Monitor cache usage by tier
- Pinata API usage metrics
- User satisfaction and retention

## Conclusion

The tier system provides a scalable monetization model for the dCDN while ensuring fair resource allocation. The Pinata integration offers users the choice between free basic service and paid premium features with persistent IPFS storage.

The implementation is production-ready with proper user isolation, cache management, and tier-based feature access. Users can easily upgrade their tiers using cycles, and the system automatically adjusts their capabilities and limits accordingly.
