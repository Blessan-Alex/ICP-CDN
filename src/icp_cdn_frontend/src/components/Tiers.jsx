import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Crown, Zap, Star, Shield, CheckCircle, AlertCircle, RefreshCw, 
  TrendingUp, Database, Globe, Download, Upload, Users, Settings,
  ArrowRight, Crown as CrownIcon, Sparkles, Rocket
} from 'lucide-react';
import { useAuth } from '../AuthContext';
import { createActor, canisterId } from '../canister_id_patch';
import { HttpAgent } from '@dfinity/agent';
import { initAuth, getIdentity } from '../auth';

export default function Tiers() {
  const { principal, isLoggedIn } = useAuth();
  const [backend, setBackend] = useState(null);
  const [userTierInfo, setUserTierInfo] = useState(null);
  const [availableTiers, setAvailableTiers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [upgrading, setUpgrading] = useState(false);
  const [selectedTier, setSelectedTier] = useState(null);

  // Initialize backend connection
  useEffect(() => {
    const initBackend = async () => {
      if (isLoggedIn && principal) {
        try {
          console.log('Initializing backend for tiers...');
          await initAuth();
          const identity = await getIdentity();
          const agent = new HttpAgent({
            host: import.meta.env.VITE_DFX_REPLICA_HOST || "http://127.0.0.1:4943",
            identity
          });
          const backendInstance = createActor(canisterId, { agent });
          
          // Test the backend connection
          console.log('Testing backend connection for tiers...');
          const testResult = await backendInstance.greet("test");
          console.log('Backend test result:', testResult);
          
          setBackend(backendInstance);
          console.log('Backend initialized successfully for tiers');
        } catch (error) {
          console.error('Failed to initialize backend for tiers:', error);
          setError(`Failed to initialize backend: ${error.message}`);
        } finally {
          setLoading(false);
        }
      }
    };
    initBackend();
  }, [isLoggedIn, principal]);

  // Load tier information
  const loadTierInfo = async () => {
    if (!backend) return;

    setLoading(true);
    setError(null);

    try {
      console.log('Loading tier information...');

      // Get user's tier info
      console.log('Current principal:', principal?.toString());
      const userTierResult = await backend.get_user_tier_info();
      console.log('Raw user tier result:', userTierResult);
      
      if (userTierResult.Ok) {
        // Get current user's cache usage using the new function
        const cacheUsageResult = await backend.get_current_user_cache_usage();
        console.log('Cache usage result:', cacheUsageResult);
        
        let cacheUsageBytes = 0n;
        if (cacheUsageResult.Ok !== undefined) {
          cacheUsageBytes = cacheUsageResult.Ok;
        } else {
          console.warn('Failed to get current user cache usage, using tier info cache usage');
          cacheUsageBytes = userTierResult.Ok.cache_usage_bytes;
        }
        
        console.log('Cache usage bytes:', cacheUsageBytes);
        console.log('Cache usage type:', typeof cacheUsageBytes);
        console.log('Cache usage as number:', Number(cacheUsageBytes));
        
        // Update the user tier info with the correct cache usage
        const updatedUserTierInfo = {
          ...userTierResult.Ok,
          cache_usage_bytes: cacheUsageBytes
        };
        
        setUserTierInfo(updatedUserTierInfo);
        console.log('User tier info loaded:', updatedUserTierInfo);
      } else {
        throw new Error(userTierResult.Err || 'Failed to load user tier info');
      }

      // Get available tiers
      const tiers = await backend.get_available_tiers();
      setAvailableTiers(tiers);
      console.log('Available tiers loaded:', tiers);

      console.log('Tier information loaded successfully');
    } catch (error) {
      console.error('Failed to load tier information:', error);
      setError(`Failed to load tier information: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Auto-load data when backend is ready
  useEffect(() => {
    if (backend) {
      loadTierInfo();
    }
  }, [backend]);

  // Auto-refresh tier info every 5 seconds to show real-time cache usage
  useEffect(() => {
    if (!backend) return;

    // Initial load
    loadTierInfo();

    const interval = setInterval(() => {
      console.log('Auto-refreshing tier info...');
      loadTierInfo();
    }, 5000); // Refresh every 5 seconds

    return () => clearInterval(interval);
  }, [backend]);

  // Upgrade tier
  const upgradeTier = async (targetTier) => {
    if (!backend || upgrading) return;

    setUpgrading(true);
    setError(null);

    try {
      console.log('Upgrading tier to:', targetTier);
      
      // Extract tier name from enum object if needed
      let tierToUpgrade = targetTier;
      if (typeof targetTier === 'object' && targetTier !== null) {
        tierToUpgrade = Object.keys(targetTier)[0];
      }
      
      const result = await backend.upgrade_tier(tierToUpgrade);
      
      if (result.Ok) {
        // Reload tier information
        await loadTierInfo();
        setSelectedTier(null);
        console.log('Tier upgrade successful:', result.Ok);
      } else {
        throw new Error(result.Err || 'Upgrade failed');
      }
    } catch (error) {
      console.error('Failed to upgrade tier:', error);
      setError(`Failed to upgrade tier: ${error.message}`);
    } finally {
      setUpgrading(false);
    }
  };

  // Format cycles to human readable
  const formatCycles = (cycles) => {
    // Convert BigInt to Number if needed
    const cyclesNum = typeof cycles === 'bigint' ? Number(cycles) : cycles;
    if (cyclesNum >= 1_000_000_000) {
      return `${(cyclesNum / 1_000_000_000).toFixed(2)}B cycles`;
    } else if (cyclesNum >= 1_000_000) {
      return `${(cyclesNum / 1_000_000).toFixed(2)}M cycles`;
    } else if (cyclesNum >= 1_000) {
      return `${(cyclesNum / 1_000).toFixed(2)}K cycles`;
    } else {
      return `${cyclesNum.toLocaleString()} cycles`;
    }
  };

  // Format bytes to human readable
  const formatBytes = (bytes) => {
    // Convert BigInt to Number if needed
    const bytesNum = typeof bytes === 'bigint' ? Number(bytes) : bytes;
    if (bytesNum === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytesNum) / Math.log(k));
    return parseFloat((bytesNum / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Get tier icon
  const getTierIcon = (tier) => {
    // Extract tier name from enum object if needed
    let tierName = tier;
    if (typeof tier === 'object' && tier !== null) {
      tierName = Object.keys(tier)[0];
    }
    
    switch (tierName) {
      case 'Free':
        return <Zap className="w-6 h-6" />;
      case 'Starter':
        return <Star className="w-6 h-6" />;
      case 'Pro':
        return <Crown className="w-6 h-6" />;
      case 'Business':
        return <CrownIcon className="w-6 h-6" />;
      default:
        return <Zap className="w-6 h-6" />;
    }
  };

  // Get tier color
  const getTierColor = (tier) => {
    // Extract tier name from enum object if needed
    let tierName = tier;
    if (typeof tier === 'object' && tier !== null) {
      tierName = Object.keys(tier)[0];
    }
    
    switch (tierName) {
      case 'Free':
        return 'from-neutral-500 to-neutral-700';
      case 'Starter':
        return 'from-green-500 to-green-700';
      case 'Pro':
        return 'from-purple-500 to-purple-700';
      case 'Business':
        return 'from-orange-500 to-orange-700';
      default:
        return 'from-neutral-500 to-neutral-700';
    }
  };

  // Get tier badge color
  const getTierBadgeColor = (tier) => {
    // Extract tier name from enum object if needed
    let tierName = tier;
    if (typeof tier === 'object' && tier !== null) {
      tierName = Object.keys(tier)[0];
    }
    
    switch (tierName) {
      case 'Free':
        return 'bg-neutral-500/20 text-neutral-300 border-neutral-500/30';
      case 'Starter':
        return 'bg-green-500/20 text-green-300 border-green-500/30';
      case 'Pro':
        return 'bg-purple-500/20 text-purple-300 border-purple-500/30';
      case 'Business':
        return 'bg-orange-500/20 text-orange-300 border-orange-500/30';
      default:
        return 'bg-neutral-500/20 text-neutral-300 border-neutral-500/30';
    }
  };

  if (!isLoggedIn) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="min-h-screen bg-neutral-950 text-white pt-20"
      >
        <div className="flex items-center justify-center min-h-screen">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="text-center"
          >
            <div className="w-24 h-24 bg-gradient-to-r from-orange-500 to-orange-800 rounded-full mx-auto mb-6 flex items-center justify-center">
              <Crown className="w-12 h-12 text-white" />
            </div>
            <h1 className="text-4xl font-bold mb-4">Please Log In</h1>
            <p className="text-lg text-neutral-400 mb-8">
              You need to be logged in to view and manage tiers
            </p>
            <motion.button
              onClick={() => window.location.href = '/'}
              className="bg-gradient-to-r from-orange-500 to-orange-800 py-3 px-6 rounded-xl font-semibold transition-all duration-300 transform hover:scale-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
              whileHover={{ scale: 1.07 }}
              whileTap={{ scale: 0.97 }}
            >
              Go to Home
            </motion.button>
          </motion.div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen bg-neutral-950 text-white pt-20"
    >
      <div className="relative z-10 max-w-7xl mx-auto px-6">
        {/* Header */}
        <motion.section
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="py-10 text-center"
        >
          <motion.div className="bg-gradient-to-r from-orange-500/10 to-orange-800/10 rounded-2xl p-8 border border-orange-500/20 mb-8 shadow-xl shadow-orange-900/10">
            <h1 className="text-4xl font-bold mb-2">Choose Your Tier</h1>
            <p className="text-lg text-neutral-400 mb-2">Select the perfect plan for your dCDN needs</p>
            {principal && (
              <p className="text-sm text-neutral-500 mt-2">
                Logged in as: <span className="font-mono text-orange-400">{principal.toString()}</span>
              </p>
            )}
          </motion.div>
        </motion.section>

        {/* Refresh Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="flex justify-between items-center mb-6"
        >
          <div className="text-sm text-neutral-400">
            Cache usage updates automatically every 5 seconds
          </div>
          <motion.button
            onClick={loadTierInfo}
            disabled={loading}
            className="bg-gradient-to-r from-orange-500 to-orange-700 hover:from-orange-600 hover:to-orange-800 px-4 py-2 rounded-lg disabled:opacity-50 transition-all duration-300 flex items-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Loading...' : 'Refresh Now'}
          </motion.button>
        </motion.div>

        {/* Error Display */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="mb-6 p-4 bg-red-900/20 border border-red-500/20 text-red-400 rounded-lg flex items-center gap-2"
            >
              <AlertCircle className="w-5 h-5" />
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Current Tier Status */}
        {userTierInfo && (
          <motion.section
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mb-8"
          >
            <div className="bg-white/10 dark:bg-neutral-900/40 backdrop-blur-xl rounded-2xl p-6 border border-white/30 dark:border-neutral-700 shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold flex items-center gap-3">
                  <Crown className="w-8 h-8 text-orange-500" />
                  Current Tier
                </h2>
                <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getTierBadgeColor(userTierInfo.current_tier)}`}>
                  {typeof userTierInfo.current_tier === 'object' && userTierInfo.current_tier !== null 
                    ? Object.keys(userTierInfo.current_tier)[0] 
                    : userTierInfo.current_tier}
                </span>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-500 mb-1">
                    {formatBytes(userTierInfo.cache_usage_bytes)} / {formatBytes(userTierInfo.cache_limit_bytes)}
                  </div>
                  <div className="text-sm text-neutral-400">Cache Usage</div>
                  <div className="mt-2 w-full bg-neutral-700 rounded-full h-2">
                    <div
                      className="bg-gradient-to-r from-orange-500 to-orange-700 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${Math.min((Number(userTierInfo.cache_usage_bytes) * 100) / Number(userTierInfo.cache_limit_bytes), 100)}%` }}
                    ></div>
                  </div>
                </div>
                
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-500 mb-1">
                    {userTierInfo.pinata_enabled ? 'Enabled' : 'Disabled'}
                  </div>
                  <div className="text-sm text-neutral-400">IPFS Pinning</div>
                  <div className="text-xs text-neutral-500 mt-1">
                    {formatBytes(userTierInfo.pinata_storage_limit_bytes)} limit
                  </div>
                </div>
                
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-500 mb-1">
                    {userTierInfo.available_upgrades.length}
                  </div>
                  <div className="text-sm text-neutral-400">Available Upgrades</div>
                  <div className="text-xs text-neutral-500 mt-1">
                    {userTierInfo.available_upgrades.map(tier => {
                      // Extract the tier name from the enum object
                      if (typeof tier === 'object' && tier !== null) {
                        return Object.keys(tier)[0];
                      }
                      return tier;
                    }).join(', ')}
                  </div>
                </div>
              </div>
            </div>
          </motion.section>
        )}

        {/* Available Tiers */}
        <motion.section
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
        >
          {availableTiers.map((tier, index) => (
            <motion.div
              key={tier.name}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 + index * 0.1 }}
              className={`relative bg-white/10 dark:bg-neutral-900/40 backdrop-blur-xl rounded-2xl p-6 border transition-all duration-300 hover:scale-105 ${
                JSON.stringify(userTierInfo?.current_tier) === JSON.stringify(tier.tier)
                  ? 'border-orange-500/50 shadow-lg shadow-orange-500/20'
                  : 'border-white/30 dark:border-neutral-700 hover:border-orange-500/30'
              }`}
            >
              {/* Current Tier Badge */}
              {JSON.stringify(userTierInfo?.current_tier) === JSON.stringify(tier.tier) && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <span className="bg-orange-500 text-white px-3 py-1 rounded-full text-xs font-medium">
                    Current Plan
                  </span>
                </div>
              )}

              {/* Tier Header */}
              <div className="text-center mb-6">
                <div className={`w-16 h-16 bg-gradient-to-r ${getTierColor(tier.name)} rounded-full mx-auto mb-4 flex items-center justify-center`}>
                  {getTierIcon(tier.name)}
                </div>
                <h3 className="text-xl font-bold mb-2">{tier.name}</h3>
                <div className="text-3xl font-bold text-orange-500 mb-1">
                  {tier.price_cycles === 0 ? 'Free' : formatCycles(tier.price_cycles)}
                </div>
                {tier.price_cycles > 0 && (
                  <div className="text-sm text-neutral-400">
                    ≈ ${(Number(tier.price_cycles) / 1_000_000_000).toFixed(2)} USD
                  </div>
                )}
              </div>

              {/* Features */}
              <div className="space-y-3 mb-6">
                <div className="flex items-center gap-2">
                  <Database className="w-4 h-4 text-orange-500" />
                  <span className="text-sm">{tier.cache_limit_mb}MB dCDN Cache</span>
                </div>
                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4 text-green-500" />
                  <span className="text-sm">{tier.pinata_storage_gb}GB Pinata Storage</span>
                </div>
                <div className="flex items-center gap-2">
                  <Upload className="w-4 h-4 text-blue-500" />
                  <span className="text-sm">
                    {tier.pinata_enabled ? 'IPFS Pinning' : 'No IPFS Pinning'}
                  </span>
                </div>
                {tier.features.map((feature, featureIndex) => (
                  <div key={featureIndex} className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span className="text-sm">{feature}</span>
                  </div>
                ))}
              </div>

                             {/* Action Button */}
               {JSON.stringify(userTierInfo?.current_tier) === JSON.stringify(tier.tier) ? (
                <button
                  disabled
                  className="w-full bg-neutral-700 text-neutral-400 py-3 rounded-lg cursor-not-allowed"
                >
                  Current Plan
                </button>
                             ) : userTierInfo?.available_upgrades.some(upgrade => JSON.stringify(upgrade) === JSON.stringify(tier.tier)) ? (
                <motion.button
                  onClick={() => upgradeTier(tier.tier)}
                  disabled={upgrading}
                  className="w-full bg-gradient-to-r from-orange-500 to-orange-700 hover:from-orange-600 hover:to-orange-800 py-3 rounded-lg transition-all duration-300 flex items-center justify-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {upgrading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Upgrading...
                    </>
                  ) : (
                    <>
                      Upgrade
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </motion.button>
              ) : (
                <button
                  disabled
                  className="w-full bg-neutral-700 text-neutral-400 py-3 rounded-lg cursor-not-allowed"
                >
                  Not Available
                </button>
              )}
            </motion.div>
          ))}
        </motion.section>

        {/* Pinata Integration Info */}
        <motion.section
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="mt-12"
        >
          <div className="bg-white/10 dark:bg-neutral-900/40 backdrop-blur-xl rounded-2xl p-8 border border-white/30 dark:border-neutral-700 shadow-xl">
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
              <Globe className="w-8 h-8 text-green-500" />
              Pinata Integration
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-green-500" />
                  Free Tier
                </h3>
                <ul className="space-y-2 text-sm text-neutral-300">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    Direct upload to Pinata (1GB storage)
                  </li>
                  <li className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-orange-500" />
                    No IPFS pinning (content not persistent)
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    Basic content delivery
                  </li>
                </ul>
              </div>
              
              <div>
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Rocket className="w-5 h-5 text-purple-500" />
                  Paid Tiers
                </h3>
                <ul className="space-y-2 text-sm text-neutral-300">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    Full IPFS pinning included
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    Persistent content storage
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    Higher storage limits
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    Priority support
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </motion.section>
      </div>
    </motion.div>
  );
}
