// CDN Client Library - JavaScript Wrapper
// This provides the same interface as the Rust library but for JavaScript/React

import { Principal } from '@dfinity/principal';

// ===== CONSTANTS (matching the Rust library) =====
export const CYCLES_SMALL_UPLOAD = 1_000_000_000n;
export const CYCLES_MEDIUM_UPLOAD = 5_000_000_000n;
export const CYCLES_LARGE_UPLOAD = 10_000_000_000n;

// ===== TYPES (matching the Rust library) =====
export class UserTier {
    static Free = 'Free';
    static Starter = 'Starter';
    static Pro = 'Pro';
    static Business = 'Business';
}

export class UserAccount {
    constructor(user_principal, cycles_balance, tier, cache_usage_bytes, pinata_enabled) {
        this.user_principal = user_principal;
        this.cycles_balance = cycles_balance;
        this.tier = tier;
        this.cache_usage_bytes = cache_usage_bytes;
        this.pinata_enabled = pinata_enabled;
    }
}

export class CacheEntry {
    constructor(cid, content_type, size, last_accessed_ts, bytes) {
        this.cid = cid;
        this.content_type = content_type;
        this.size = size;
        this.last_accessed_ts = last_accessed_ts;
        this.bytes = bytes;
    }
}

// ===== UTILITY FUNCTIONS =====

// Convert BigInt to string for JSON serialization
function convertBigIntToString(value) {
    if (typeof value === 'bigint') {
        return value.toString();
    }
    return value;
}

// ===== MAIN CLIENT CLASS =====
export class CdnClient {
    constructor(canisterId, agent) {
        this.canisterId = canisterId;
        this.agent = agent;
        this.backend = null;
    }

    // Create a new CDN client instance
    static new(canisterId, agent) {
        return new CdnClient(canisterId, agent);
    }

    // Create a CDN client with the default dCDN canister ID
    static default(agent) {
        const defaultCanisterId = Principal.fromText(import.meta.env.VITE_CANISTER_ID_BACKEND || "rrkah-fqaaa-aaaaa-aaaaq-cai");
        return new CdnClient(defaultCanisterId, agent);
    }

    // Initialize the backend connection
    async initBackend(createActor) {
        this.backend = createActor(this.canisterId, { agent: this.agent });
        return this.backend;
    }

    // ===== CORE UPLOAD FUNCTIONALITY =====

    // Generate a CID for content (matching backend format)
    generateCid(content, contentType) {
        // Use the same format as the backend (Qm + hex hash)
        const contentHash = this.simpleHash(content);
        return `Qm${contentHash}`;
    }

    // Simple hash function for demo purposes
    simpleHash(data) {
        let hash = 0;
        if (data.length === 0) return hash.toString();
        
        // Handle different data types
        if (typeof data === 'string') {
            for (let i = 0; i < data.length; i++) {
                const char = data.charCodeAt(i);
                hash = ((hash << 5) - hash) + char;
                hash = hash & hash; // Convert to 32-bit integer
            }
        } else if (data instanceof Uint8Array || Array.isArray(data)) {
            for (let i = 0; i < data.length; i++) {
                const byte = data[i];
                hash = ((hash << 5) - hash) + byte;
                hash = hash & hash; // Convert to 32-bit integer
            }
        } else {
            // Fallback for other types
            const str = String(data);
            for (let i = 0; i < str.length; i++) {
                const char = str.charCodeAt(i);
                hash = ((hash << 5) - hash) + char;
                hash = hash & hash; // Convert to 32-bit integer
            }
        }
        return Math.abs(hash).toString(16);
    }

    // Upload content to the dCDN and get back a CID
    // This matches the Rust library's upload_asset function
    async uploadAsset(content, contentType, cyclesPayment = CYCLES_SMALL_UPLOAD) {
        if (!this.backend) {
            throw new Error("Backend not initialized. Call initBackend() first.");
        }

        try {
            const cid = this.generateCid(content, contentType);
            
            // Convert content to Uint8Array if it's not already
            let contentBytes;
            if (content instanceof Uint8Array) {
                contentBytes = Array.from(content);
            } else if (typeof content === 'string') {
                contentBytes = Array.from(new TextEncoder().encode(content));
            } else if (Array.isArray(content)) {
                contentBytes = content;
            } else {
                throw new Error("Invalid content type. Expected string, Uint8Array, or Array<number>");
            }

            console.log('Calling upload_content_with_canister_pinata with library pattern...');
            const result = await this.backend.upload_content_with_canister_pinata(cid, contentType, contentBytes, cid);

            if (result.Ok) {
                // Extract the actual CID from the result message
                const resultMessage = result.Ok;
                const cidMatch = resultMessage.match(/CID: ([A-Za-z0-9]+)/);
                if (cidMatch && cidMatch[1]) {
                    return cidMatch[1]; // Return the actual CID
                } else {
                    // Fallback: return the generated CID if we can't extract from message
                    return cid;
                }
            } else {
                throw new Error(result.Err || 'Upload failed');
            }
        } catch (error) {
            console.error('Upload failed:', error);
            throw new Error(`Upload failed: ${error.message}`);
        }
    }

    // Get content from the dCDN by CID
    // This matches the Rust library's get_asset function
    async getAsset(cid) {
        if (!this.backend) {
            throw new Error("Backend not initialized. Call initBackend() first.");
        }

        try {
            console.log('Calling get_content with library pattern...');
            // Use query call instead of update call
            const result = await this.backend.get_content(cid);

            if (result.Ok) {
                return new Uint8Array(result.Ok);
            } else {
                throw new Error(result.Err || 'Retrieval failed');
            }
        } catch (error) {
            console.error('Get asset failed:', error);
            throw new Error(`Retrieval failed: ${error.message}`);
        }
    }

    // Get content with IPFS fallback
    // This matches the Rust library's get_asset_with_fallback function
    async getAssetWithFallback(cid) {
        try {
            // First try to get from cache
            return await this.getAsset(cid);
        } catch (error) {
            console.log('Cache miss, trying IPFS fallback...');
            
            // Fallback to IPFS
            try {
                const result = await this.backend.fetch_from_ipfs(cid);
                
                if (result.Ok) {
                    return new Uint8Array(result.Ok);
                } else {
                    throw new Error(result.Err || 'IPFS fallback failed');
                }
            } catch (ipfsError) {
                throw new Error(`Both cache and IPFS failed: ${error.message}, IPFS: ${ipfsError.message}`);
            }
        }
    }

    // ===== USER MANAGEMENT =====

    // Get user account information
    // This matches the Rust library's get_user_account function
    async getUserAccount() {
        if (!this.backend) {
            throw new Error("Backend not initialized. Call initBackend() first.");
        }

        try {
            console.log('Calling get_user_account with library pattern...');
            const account = await this.backend.get_user_account();
            
            // Convert BigInt to string for serialization
            const cyclesBalance = convertBigIntToString(account.cycles_balance);
            const cacheUsageBytes = convertBigIntToString(account.cache_usage_bytes);
            
            return new UserAccount(
                account.user_principal,
                cyclesBalance,
                account.tier,
                cacheUsageBytes,
                account.pinata_enabled
            );
        } catch (error) {
            console.error('Get user account failed:', error);
            throw new Error(`User account retrieval failed: ${error.message}`);
        }
    }

    // Get cycles balance
    async getCyclesBalance() {
        if (!this.backend) {
            throw new Error("Backend not initialized. Call initBackend() first.");
        }

        try {
            const balance = await this.backend.get_cycles_balance();
            // Convert BigInt to string for serialization
            return convertBigIntToString(balance);
        } catch (error) {
            console.error('Get cycles balance failed:', error);
            throw new Error(`Cycles balance retrieval failed: ${error.message}`);
        }
    }

    // Deposit cycles
    async depositCycles(amount) {
        if (!this.backend) {
            throw new Error("Backend not initialized. Call initBackend() first.");
        }

        try {
            const result = await this.backend.deposit_cycles(amount);
            
            if (result.Ok) {
                const account = result.Ok;
                // Convert BigInt to string for serialization
                const cyclesBalance = convertBigIntToString(account.cycles_balance);
                const cacheUsageBytes = convertBigIntToString(account.cache_usage_bytes);
                
                return new UserAccount(
                    account.user_principal,
                    cyclesBalance,
                    account.tier,
                    cacheUsageBytes,
                    account.pinata_enabled
                );
            } else {
                throw new Error(result.Err || 'Deposit failed');
            }
        } catch (error) {
            console.error('Deposit cycles failed:', error);
            throw new Error(`Deposit failed: ${error.message}`);
        }
    }

    // ===== COST ESTIMATION =====

    // Estimate upload cost
    // This matches the Rust library's estimate_upload_cost function
    async estimateUploadCost(fileSize) {
        if (!this.backend) {
            throw new Error("Backend not initialized. Call initBackend() first.");
        }

        try {
            const cost = await this.backend.estimate_upload_cost(fileSize);
            // Convert BigInt to string for serialization
            return convertBigIntToString(cost);
        } catch (error) {
            console.error('Upload cost estimation failed:', error);
            throw new Error(`Upload cost estimation failed: ${error.message}`);
        }
    }

    // Estimate storage cost
    // This matches the Rust library's estimate_storage_cost function
    async estimateStorageCost(fileSize, hours) {
        if (!this.backend) {
            throw new Error("Backend not initialized. Call initBackend() first.");
        }

        try {
            const cost = await this.backend.estimate_storage_cost(fileSize, hours);
            // Convert BigInt to string for serialization
            return convertBigIntToString(cost);
        } catch (error) {
            console.error('Storage cost estimation failed:', error);
            throw new Error(`Storage cost estimation failed: ${error.message}`);
        }
    }

    // ===== UTILITY FUNCTIONS =====

    // Generate asset URL
    getAssetUrl(cid) {
        return `https://${this.canisterId.toText()}.ic0.app/${cid}`;
    }

    // Check if content is cached
    async isCached(cid) {
        if (!this.backend) {
            throw new Error("Backend not initialized. Call initBackend() first.");
        }

        try {
            // Use get_cache_entry_details to check if content is cached
            const result = await this.backend.get_cache_entry_details(cid);
            return result.Ok !== undefined; // If we get a result, it's cached
        } catch (error) {
            console.error('Cache check failed:', error);
            return false; // If there's an error, assume not cached
        }
    }

    // Get current user cache usage
    async getCurrentUserCacheUsage() {
        if (!this.backend) {
            throw new Error("Backend not initialized. Call initBackend() first.");
        }

        try {
            const result = await this.backend.get_current_user_cache_usage();
            if (result.Ok !== undefined) {
                return convertBigIntToString(result.Ok);
            } else {
                throw new Error(result.Err || 'Failed to get cache usage');
            }
        } catch (error) {
            console.error('Get current user cache usage failed:', error);
            throw new Error(`Cache usage retrieval failed: ${error.message}`);
        }
    }

    // ===== CACHE MANAGEMENT =====

    // Get cache entry details
    async getCacheEntryDetails(cid) {
        if (!this.backend) {
            throw new Error("Backend not initialized. Call initBackend() first.");
        }

        try {
            const result = await this.backend.get_cache_entry_details(cid);
            if (result.Ok) {
                const entry = result.Ok;
                return new CacheEntry(
                    entry.cid,
                    entry.content_type,
                    convertBigIntToString(entry.size),
                    convertBigIntToString(entry.last_accessed_ts),
                    entry.bytes
                );
            } else {
                throw new Error(result.Err || 'Cache entry not found');
            }
        } catch (error) {
            console.error('Get cache entry details failed:', error);
            throw new Error(`Cache entry retrieval failed: ${error.message}`);
        }
    }

    // Get detailed cache statistics
    async getCacheStatistics() {
        if (!this.backend) {
            throw new Error("Backend not initialized. Call initBackend() first.");
        }

        try {
            const stats = await this.backend.get_detailed_cache_stats();
            return {
                total_requests: convertBigIntToString(stats.total_requests),
                cache_hits: convertBigIntToString(stats.cache_hits),
                cache_misses: convertBigIntToString(stats.cache_misses),
                avg_response_time_ms: convertBigIntToString(stats.avg_response_time_ms),
                total_cache_size_bytes: convertBigIntToString(stats.total_cache_size_bytes),
                cache_utilization_percent: convertBigIntToString(stats.cache_utilization_percent)
            };
        } catch (error) {
            console.error('Get cache statistics failed:', error);
            throw new Error(`Cache statistics retrieval failed: ${error.message}`);
        }
    }

    // Get user tier information
    async getUserTierInfo() {
        if (!this.backend) {
            throw new Error("Backend not initialized. Call initBackend() first.");
        }

        try {
            const result = await this.backend.get_user_tier_info();
            if (result.Ok) {
                const tierInfo = result.Ok;
                return {
                    current_tier: tierInfo.current_tier,
                    cache_limit_bytes: convertBigIntToString(tierInfo.cache_limit_bytes),
                    cache_usage_bytes: convertBigIntToString(tierInfo.cache_usage_bytes),
                    pinata_enabled: tierInfo.pinata_enabled,
                    pinata_storage_limit_bytes: convertBigIntToString(tierInfo.pinata_storage_limit_bytes),
                    available_upgrades: tierInfo.available_upgrades
                };
            } else {
                throw new Error(result.Err || 'Failed to get tier info');
            }
        } catch (error) {
            console.error('Get user tier info failed:', error);
            throw new Error(`Tier info retrieval failed: ${error.message}`);
        }
    }

    // Upgrade user tier
    async upgradeTier(newTier) {
        if (!this.backend) {
            throw new Error("Backend not initialized. Call initBackend() first.");
        }

        try {
            const result = await this.backend.upgrade_tier(newTier);
            if (result.Ok) {
                return result.Ok;
            } else {
                throw new Error(result.Err || 'Tier upgrade failed');
            }
        } catch (error) {
            console.error('Tier upgrade failed:', error);
            throw new Error(`Tier upgrade failed: ${error.message}`);
        }
    }

    // Get available tiers
    async getAvailableTiers() {
        if (!this.backend) {
            throw new Error("Backend not initialized. Call initBackend() first.");
        }

        try {
            const tiers = await this.backend.get_available_tiers();
            return tiers.map(tier => ({
                tier: tier.tier,
                name: tier.name,
                cache_limit_mb: tier.cache_limit_mb,
                pinata_storage_gb: tier.pinata_storage_gb,
                pinata_enabled: tier.pinata_enabled,
                price_cycles: convertBigIntToString(tier.price_cycles),
                features: tier.features
            }));
        } catch (error) {
            console.error('Get available tiers failed:', error);
            throw new Error(`Available tiers retrieval failed: ${error.message}`);
        }
    }

    // Clear cache
    async clearCache() {
        if (!this.backend) {
            throw new Error("Backend not initialized. Call initBackend() first.");
        }

        try {
            const result = await this.backend.clear_cache_with_result();
            if (result.Ok) {
                return result.Ok;
            } else {
                throw new Error(result.Err || 'Cache clear failed');
            }
        } catch (error) {
            console.error('Clear cache failed:', error);
            throw new Error(`Cache clear failed: ${error.message}`);
        }
    }

    // Manual cache eviction
    async evictFromCache(cid) {
        if (!this.backend) {
            throw new Error("Backend not initialized. Call initBackend() first.");
        }

        try {
            const result = await this.backend.manual_cache_eviction(cid);
            if (result.Ok) {
                return result.Ok;
            } else {
                throw new Error(result.Err || 'Cache eviction failed');
            }
        } catch (error) {
            console.error('Cache eviction failed:', error);
            throw new Error(`Cache eviction failed: ${error.message}`);
        }
    }
}

// REMOVED: uploadAssetDefault, getAssetDefault, getAssetWithFallbackDefault
// See archived_unused/20250828-0706/src/icp_cdn_frontend/src/lib/cdnClient.js for original
