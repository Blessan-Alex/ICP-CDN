import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Database, TrendingUp, Clock, Activity, RefreshCw, BarChart3, Zap, AlertTriangle,
  Trash2, Eye, Settings, Target, Gauge, AlertCircle, CheckCircle, Info
} from 'lucide-react';
import { useAuth } from '../AuthContext';
import { createActor, canisterId } from '../canister_id_patch';
import { HttpAgent } from '@dfinity/agent';
import { initAuth, getIdentity } from '../auth';

export default function CacheDashboard() {
  const { principal, isLoggedIn } = useAuth();
  const [backend, setBackend] = useState(null);
  const [cacheStats, setCacheStats] = useState(null);
  const [lruStats, setLruStats] = useState(null);
  const [detailedStats, setDetailedStats] = useState({
    totalRequests: 0,
    cacheHits: 0,
    cacheMisses: 0,
    avgResponseTime: 0,
    totalCacheSize: 0,
    cacheUtilization: 0
  });
  const [selectedCid, setSelectedCid] = useState(null);
  const [cacheEntryDetails, setCacheEntryDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastRefresh, setLastRefresh] = useState(null);
  const [isEvicting, setIsEvicting] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [displayedCount, setDisplayedCount] = useState(24);
  const [itemsPerPage] = useState(25);

  // Initialize backend connection
  useEffect(() => {
    const initBackend = async () => {
      if (isLoggedIn && principal) {
        try {
          console.log('Initializing backend for cache dashboard...');
          await initAuth();
          const identity = getIdentity();
          const agent = new HttpAgent({
            host: import.meta.env.VITE_DFX_REPLICA_HOST || "http://127.0.0.1:4943",
            identity
          });
          const backendInstance = createActor(canisterId, { agent });
          
          // Test the backend connection
          console.log('Testing backend connection for cache dashboard...');
          const testResult = await backendInstance.greet("test");
          console.log('Backend test result:', testResult);
          
          setBackend(backendInstance);
          console.log('Backend initialized successfully for cache dashboard');
        } catch (error) {
          console.error('Failed to initialize backend for cache dashboard:', error);
          setError(`Failed to initialize backend: ${error.message}`);
        }
      }
    };
    initBackend();
  }, [isLoggedIn, principal]);

  // Load cache statistics
  const loadCacheStats = async () => {
    if (!backend) {
      console.log('Backend not available for cache stats');
      return;
    }

    setLoading(true);
    setError(null);
    resetPagination(); // Reset pagination when loading new stats

    try {
      console.log('Loading cache statistics...');
      
      // Get basic cache statistics
      const stats = await backend.test_get_cache_stats();
      console.log('Cache stats result:', stats);
      
      setCacheStats({
        entries: Number(stats[0]),
        totalBytes: Number(stats[1])
      });

      // Get LRU statistics
      const lru = await backend.test_get_lru_stats();
      console.log('LRU stats result:', lru);
      
      setLruStats({
        queueLength: Number(lru[0]),
        queueItems: lru[1]
      });

      // Get detailed performance metrics
      try {
        const detailed = await backend.get_detailed_cache_stats();
        console.log('Detailed stats result:', detailed);
        
        setDetailedStats({
          totalRequests: Number(detailed.total_requests) || 0,
          cacheHits: Number(detailed.cache_hits) || 0,
          cacheMisses: Number(detailed.cache_misses) || 0,
          avgResponseTime: Number(detailed.avg_response_time_ms) || 0,
          totalCacheSize: Number(detailed.total_cache_size_bytes) || 0,
          cacheUtilization: Number(detailed.cache_utilization_percent) || 0
        });
      } catch (detailedError) {
        console.warn('Failed to load detailed stats:', detailedError);
        // Reset to default values on error
        setDetailedStats({
          totalRequests: 0,
          cacheHits: 0,
          cacheMisses: 0,
          avgResponseTime: 0,
          totalCacheSize: 0,
          cacheUtilization: 0
        });
      }

      setLastRefresh(new Date());
      console.log('Cache stats loaded successfully');
    } catch (error) {
      console.error('Failed to load cache stats:', error);
      setError(`Failed to load cache statistics: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Load cache entry details
  const loadCacheEntryDetails = async (cid) => {
    if (!backend || !cid) return;

    setSelectedCid(cid);
    setCacheEntryDetails(null);

    try {
      console.log('Loading cache entry details for:', cid);
      const details = await backend.get_cache_entry_details(cid);
      setCacheEntryDetails(details);
    } catch (error) {
      console.error('Failed to load cache entry details:', error);
      setError(`Failed to load entry details: ${error.message}`);
    }
  };

  // Manually evict a cache entry
  const evictCacheEntry = async (cid) => {
    if (!backend || !cid || isEvicting) return;

    setIsEvicting(true);
    setError(null);

    try {
      console.log('Evicting cache entry:', cid);
      const result = await backend.manual_cache_eviction(cid);
      
      if (result.Ok) {
        // Reload cache stats
        await loadCacheStats();
        setSelectedCid(null);
        setCacheEntryDetails(null);
      } else {
        throw new Error(result.Err || 'Failed to evict cache entry');
      }
    } catch (error) {
      console.error('Failed to evict cache entry:', error);
      setError(`Failed to evict entry: ${error.message}`);
    } finally {
      setIsEvicting(false);
    }
  };

  // Clear entire cache
  const clearCache = async () => {
    if (!backend || isClearing) return;

    if (!window.confirm('Are you sure you want to clear the entire cache? This action cannot be undone.')) {
      return;
    }

    setIsClearing(true);
    setError(null);

    try {
      console.log('Clearing entire cache...');
      const result = await backend.clear_cache_with_result();
      
      if (result.Ok) {
        // Reload cache stats
        await loadCacheStats();
        setSelectedCid(null);
        setCacheEntryDetails(null);
        resetPagination(); // Reset pagination
      } else {
        throw new Error(result.Err || 'Failed to clear cache');
      }
    } catch (error) {
      console.error('Failed to clear cache:', error);
      setError(`Failed to clear cache: ${error.message}`);
    } finally {
      setIsClearing(false);
    }
  };

  // Auto-refresh every 30 seconds
  useEffect(() => {
    if (backend) {
      loadCacheStats();
      const interval = setInterval(loadCacheStats, 30000);
      return () => clearInterval(interval);
    }
  }, [backend]);

  // Format bytes to human readable
  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Get cache health status
  const getCacheHealth = () => {
    if (!cacheStats) return 'unknown';
    const utilization = (cacheStats.entries / 1000) * 100;
    if (utilization < 70) return 'healthy';
    if (utilization < 90) return 'warning';
    return 'critical';
  };

  // Calculate cache hit rate
  const getCacheHitRate = () => {
    if (!detailedStats || !detailedStats.totalRequests || detailedStats.totalRequests === 0) return 0;
    const hitRate = Math.round((detailedStats.cacheHits / detailedStats.totalRequests) * 100);
    return isNaN(hitRate) ? 0 : hitRate;
  };

  // Get displayed items for pagination
  const getDisplayedItems = () => {
    if (!lruStats?.queueItems) return [];
    return lruStats.queueItems.slice(0, displayedCount);
  };

  // Check if there are more items to show
  const hasMoreItems = () => {
    return lruStats?.queueItems && lruStats.queueItems.length > displayedCount;
  };

  // Load more items
  const loadMoreItems = () => {
    const newCount = Math.min(displayedCount + itemsPerPage, lruStats.queueItems.length);
    setDisplayedCount(newCount);
  };

  // Reset pagination
  const resetPagination = () => {
    setDisplayedCount(24);
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
              <Database className="w-12 h-12 text-white" />
            </div>
            <h1 className="text-4xl font-bold mb-4">Please Log In</h1>
            <p className="text-lg text-neutral-400 mb-8">
              You need to be logged in to access the Cache Dashboard
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
            <h1 className="text-4xl font-bold mb-2">Cache Dashboard</h1>
            <p className="text-lg text-neutral-400 mb-2">Monitor and manage your dCDN cache in real-time</p>
            {principal && (
              <p className="text-sm text-neutral-500 mt-2">
                Logged in as: <span className="font-mono text-orange-400">{principal.toString()}</span>
              </p>
            )}
          </motion.div>
        </motion.section>

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="flex justify-between items-center mb-6"
        >
          <div className="flex gap-3">
            <motion.button
              onClick={clearCache}
              disabled={isClearing || loading}
              className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg disabled:opacity-50 transition-all duration-300 flex items-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {isClearing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Clearing...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4" />
                  Clear Cache
                </>
              )}
            </motion.button>
          </div>

          <motion.button
            onClick={loadCacheStats}
            disabled={loading}
            className="bg-gradient-to-r from-orange-500 to-orange-700 hover:from-orange-600 hover:to-orange-800 px-4 py-2 rounded-lg disabled:opacity-50 transition-all duration-300 flex items-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Refreshing...' : 'Refresh Stats'}
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

        {/* Cache Statistics Grid */}
        <motion.section
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8"
        >
          {/* Cache Entries */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
            className="bg-white/10 dark:bg-neutral-900/40 backdrop-blur-xl rounded-2xl p-6 border border-white/30 dark:border-neutral-700 shadow-xl"
          >
            <div className="flex items-center justify-between mb-4">
              <Database className="w-8 h-8 text-orange-500" />
              <div className={`w-3 h-3 rounded-full ${
                getCacheHealth() === 'healthy' ? 'bg-green-500' : 
                getCacheHealth() === 'warning' ? 'bg-yellow-500' : 'bg-red-500'
              }`}></div>
            </div>
            <h3 className="text-2xl font-bold mb-2">
              {loading ? '...' : cacheStats?.entries?.toLocaleString() || 0}
            </h3>
            <p className="text-neutral-400 text-sm">Cache Entries</p>
            <div className="mt-3 text-xs text-neutral-500">
              Status: {getCacheHealth()}
            </div>
          </motion.div>

          {/* Total Size */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4 }}
            className="bg-white/10 dark:bg-neutral-900/40 backdrop-blur-xl rounded-2xl p-6 border border-white/30 dark:border-neutral-700 shadow-xl"
          >
            <div className="flex items-center justify-between mb-4">
              <BarChart3 className="w-8 h-8 text-orange-500" />
            </div>
            <h3 className="text-2xl font-bold mb-2">
              {loading ? '...' : formatBytes(cacheStats?.totalBytes || 0)}
            </h3>
            <p className="text-neutral-400 text-sm">Total Size</p>
            <div className="mt-3">
              <div className="w-full bg-neutral-700 rounded-full h-2 mb-1">
                <div
                  className="bg-gradient-to-r from-orange-500 to-orange-700 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${Math.min((cacheStats?.totalBytes || 0) / (100 * 1024 * 1024) * 100, 100)}%` }}
                ></div>
              </div>
              <div className="text-xs text-neutral-500">
                {Math.round((cacheStats?.totalBytes || 0) / (100 * 1024 * 1024) * 100)}% of 100MB limit
              </div>
            </div>
          </motion.div>

          {/* Cache Hit Rate */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5 }}
            className="bg-white/10 dark:bg-neutral-900/40 backdrop-blur-xl rounded-2xl p-6 border border-white/30 dark:border-neutral-700 shadow-xl"
          >
            <div className="flex items-center justify-between mb-4">
              <Target className="w-8 h-8 text-orange-500" />
            </div>
            <h3 className="text-2xl font-bold mb-2">
              {loading ? '...' : `${getCacheHitRate()}%`}
            </h3>
            <p className="text-neutral-400 text-sm">Cache Hit Rate</p>
            <div className="mt-3">
              <div className="w-full bg-neutral-700 rounded-full h-2 mb-1">
                <div
                  className="bg-gradient-to-r from-green-500 to-green-700 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${getCacheHitRate()}%` }}
                ></div>
              </div>
              <div className="text-xs text-neutral-500">
                {detailedStats?.cacheHits || 0} hits / {detailedStats?.totalRequests || 0} requests
              </div>
            </div>
          </motion.div>

          {/* Average Response Time */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.6 }}
            className="bg-white/10 dark:bg-neutral-900/40 backdrop-blur-xl rounded-2xl p-6 border border-white/30 dark:border-neutral-700 shadow-xl"
          >
            <div className="flex items-center justify-between mb-4">
              <Gauge className="w-8 h-8 text-orange-500" />
            </div>
            <h3 className="text-2xl font-bold mb-2">
              {loading ? '...' : `${detailedStats?.avgResponseTime || 0}ms`}
            </h3>
            <p className="text-neutral-400 text-sm">Avg Response Time</p>
            <div className="mt-3 text-xs text-neutral-500">
              {detailedStats?.avgResponseTime < 100 ? 'Excellent' : 
               detailedStats?.avgResponseTime < 500 ? 'Good' : 'Needs Improvement'}
            </div>
          </motion.div>
        </motion.section>

        {/* Cache Entry Details Modal */}
        <AnimatePresence>
          {selectedCid && cacheEntryDetails && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
              onClick={() => setSelectedCid(null)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-neutral-900 border border-neutral-700 rounded-2xl p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold flex items-center gap-2">
                    <Eye className="w-6 h-6 text-orange-500" />
                    Cache Entry Details
                  </h3>
                  <button
                    onClick={() => setSelectedCid(null)}
                    className="text-neutral-400 hover:text-white transition-colors"
                  >
                    ✕
                  </button>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-neutral-400 text-sm">CID:</span>
                      <div className="font-mono text-sm text-white break-all">
                        {cacheEntryDetails.cid}
                      </div>
                    </div>
                    <div>
                      <span className="text-neutral-400 text-sm">Content Type:</span>
                      <div className="text-white">{cacheEntryDetails.content_type}</div>
                    </div>
                    <div>
                      <span className="text-neutral-400 text-sm">Size:</span>
                      <div className="text-white">{formatBytes(cacheEntryDetails.size)}</div>
                    </div>
                    <div>
                      <span className="text-neutral-400 text-sm">Last Accessed:</span>
                      <div className="text-white">
                        {new Date(Number(cacheEntryDetails.last_accessed_ts) / 1000000).toLocaleString()}
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-3 pt-4 border-t border-neutral-700">
                    <motion.button
                      onClick={() => evictCacheEntry(cacheEntryDetails.cid)}
                      disabled={isEvicting}
                      className="flex-1 bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg disabled:opacity-50 transition-all duration-300 flex items-center justify-center gap-2"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      {isEvicting ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          Evicting...
                        </>
                      ) : (
                        <>
                          <Trash2 className="w-4 h-4" />
                          Evict Entry
                        </>
                      )}
                    </motion.button>
                    <motion.button
                      onClick={() => setSelectedCid(null)}
                      className="flex-1 bg-neutral-600 hover:bg-neutral-700 px-4 py-2 rounded-lg transition-all duration-300"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      Close
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* LRU Queue */}
        <motion.section
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white/10 dark:bg-neutral-900/40 backdrop-blur-xl rounded-2xl p-8 border border-white/30 dark:border-neutral-700 shadow-xl mb-8"
        >
          <h2 className="text-2xl font-semibold mb-6 flex items-center gap-2">
            <Clock className="w-6 h-6 text-orange-500" />
            LRU Queue Order
          </h2>
          
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="w-8 h-8 text-orange-500 animate-spin" />
              <span className="ml-3 text-neutral-400">Loading queue data...</span>
            </div>
          ) : lruStats?.queueItems && lruStats.queueItems.length > 0 ? (
            <div className="space-y-2">
              <div className="text-sm text-neutral-400 mb-4">
                Items are ordered from most recently used (top) to least recently used (bottom)
                {hasMoreItems() && (
                  <span className="block mt-1 text-orange-400">
                    Showing {displayedCount} of {lruStats.queueItems.length} items
                  </span>
                )}
              </div>
              <div className="max-h-96 overflow-y-auto pr-2 custom-scrollbar">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {getDisplayedItems().map((cid, index) => (
                  <motion.div
                    key={cid}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 * index }}
                    className={`p-3 rounded-lg border text-sm font-mono cursor-pointer transition-all duration-300 hover:scale-105 ${
                      index === 0 
                        ? 'bg-green-900/20 border-green-500/30 text-green-400' 
                        : index < 5 
                        ? 'bg-yellow-900/20 border-yellow-500/30 text-yellow-400'
                        : 'bg-neutral-800/50 border-neutral-700 text-neutral-300'
                    }`}
                    onClick={() => loadCacheEntryDetails(cid)}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs opacity-75">#{index + 1}</span>
                      <span className="text-xs opacity-75">
                        {index === 0 ? 'Most Recent' : index < 5 ? 'Recent' : 'Older'}
                      </span>
                    </div>
                    <div className="mt-1 truncate">{cid}</div>
                    <div className="mt-2 text-xs opacity-75 flex items-center gap-1">
                      <Eye className="w-3 h-3" />
                      Click to view details
                    </div>
                  </motion.div>
                ))}
                </div>
              </div>
              
              {/* Show More/Less Button */}
              {hasMoreItems() && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex justify-center mt-6"
                >
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={loadMoreItems}
                    className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white rounded-lg font-medium transition-all duration-300 shadow-lg hover:shadow-xl"
                  >
                    <span>Show More</span>
                    <span className="text-sm">↓</span>
                    <span className="text-xs opacity-75">
                      (+{Math.min(itemsPerPage, lruStats.queueItems.length - displayedCount)} items)
                    </span>
                  </motion.button>
                </motion.div>
              )}
            </div>
          ) : (
            <div className="text-center py-12 text-neutral-400">
              <Database className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No items in LRU queue</p>
              <p className="text-sm">Cache is empty or no items have been accessed yet</p>
            </div>
          )}
        </motion.section>

        {/* Enhanced Performance Metrics */}
        <motion.section 
          initial={{ opacity: 0, y: 40 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ delay: 0.4 }}
          className="bg-white/10 dark:bg-neutral-900/40 backdrop-blur-xl rounded-2xl p-8 border border-white/30 dark:border-neutral-700 shadow-xl mb-8"
        >
          <h2 className="text-2xl font-semibold mb-6 flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-orange-500" />
            Enhanced Performance Metrics
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="text-center p-4 bg-neutral-800/50 rounded-lg">
                             <div className="text-3xl font-bold text-orange-500 mb-2">
                 {(detailedStats?.totalRequests || 0).toLocaleString()}
               </div>
              <div className="text-neutral-400">Total Requests</div>
            </div>
            
            <div className="text-center p-4 bg-neutral-800/50 rounded-lg">
                             <div className="text-3xl font-bold text-green-500 mb-2">
                 {(detailedStats?.cacheHits || 0).toLocaleString()}
               </div>
              <div className="text-neutral-400">Cache Hits</div>
            </div>
            
            <div className="text-center p-4 bg-neutral-800/50 rounded-lg">
                             <div className="text-3xl font-bold text-red-500 mb-2">
                 {(detailedStats?.cacheMisses || 0).toLocaleString()}
               </div>
              <div className="text-neutral-400">Cache Misses</div>
            </div>
            
            <div className="text-center p-4 bg-neutral-800/50 rounded-lg">
              <div className="text-3xl font-bold text-blue-500 mb-2">
                {detailedStats?.cacheUtilization || 0}%
              </div>
              <div className="text-neutral-400">Cache Utilization</div>
            </div>
          </div>

          {/* Performance Insights */}
          <div className="mt-6 p-4 bg-neutral-800/30 rounded-lg">
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <Info className="w-5 h-5 text-orange-500" />
              Performance Insights
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${
                  getCacheHitRate() >= 80 ? 'bg-green-500' : 
                  getCacheHitRate() >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                }`}></div>
                <span className="text-neutral-300">Hit Rate:</span>
                <span className={getCacheHitRate() >= 80 ? 'text-green-400' : 
                               getCacheHitRate() >= 60 ? 'text-yellow-400' : 'text-red-400'}>
                  {getCacheHitRate()}% {getCacheHitRate() >= 80 ? '(Excellent)' : 
                                       getCacheHitRate() >= 60 ? '(Good)' : '(Needs Improvement)'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${
                  (detailedStats?.avgResponseTime || 0) < 100 ? 'bg-green-500' : 
                  (detailedStats?.avgResponseTime || 0) < 500 ? 'bg-yellow-500' : 'bg-red-500'
                }`}></div>
                <span className="text-neutral-300">Response Time:</span>
                <span className={(detailedStats?.avgResponseTime || 0) < 100 ? 'text-green-400' : 
                               (detailedStats?.avgResponseTime || 0) < 500 ? 'text-yellow-400' : 'text-red-400'}>
                  {detailedStats?.avgResponseTime || 0}ms
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${
                  getCacheHealth() === 'healthy' ? 'bg-green-500' : 
                  getCacheHealth() === 'warning' ? 'bg-yellow-500' : 'bg-red-500'
                }`}></div>
                <span className="text-neutral-300">Cache Health:</span>
                <span className={getCacheHealth() === 'healthy' ? 'text-green-400' : 
                               getCacheHealth() === 'warning' ? 'text-yellow-400' : 'text-red-400'}>
                  {getCacheHealth()}
                </span>
              </div>
            </div>
          </div>
        </motion.section>

        {/* Last Refresh Info */}
        {lastRefresh && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center text-sm text-neutral-500 mb-8"
          >
            Last updated: {lastRefresh.toLocaleTimeString()}
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
