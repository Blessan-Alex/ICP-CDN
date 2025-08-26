import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Activity, TrendingUp, TrendingDown, Clock, Zap, Target, 
  BarChart3, RefreshCw, AlertCircle, CheckCircle, Info, Gauge,
  Database, Globe, Download, Upload
} from 'lucide-react';
import { useAuth } from '../AuthContext';
import { createActor, canisterId } from '../canister_id_patch';
import { HttpAgent } from '@dfinity/agent';
import { initAuth, getIdentity } from '../auth';

export default function PerformanceMonitor() {
  const { principal, isLoggedIn } = useAuth();
  const [backend, setBackend] = useState(null);
  const [metrics, setMetrics] = useState({
    totalRequests: 0,
    cacheHits: 0,
    cacheMisses: 0,
    avgResponseTime: 0,
    cacheUtilization: 0,
    totalCacheSize: 0
  });
  const [historicalData, setHistoricalData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastRefresh, setLastRefresh] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [testResults, setTestResults] = useState(null);
  const [isRunningTests, setIsRunningTests] = useState(false);

  // Initialize backend connection
  useEffect(() => {
    const initBackend = async () => {
      if (isLoggedIn && principal) {
        try {
          console.log('Initializing backend for performance monitor...');
          await initAuth();
          const identity = await getIdentity();
          const agent = new HttpAgent({
            host: import.meta.env.VITE_DFX_REPLICA_HOST || "http://127.0.0.1:4943",
            identity
          });
          const backendInstance = createActor(canisterId, { agent });
          
          // Test the backend connection
          console.log('Testing backend connection for performance monitor...');
          const testResult = await backendInstance.greet("test");
          console.log('Backend test result:', testResult);
          
          setBackend(backendInstance);
          console.log('Backend initialized successfully for performance monitor');
        } catch (error) {
          console.error('Failed to initialize backend for performance monitor:', error);
          setError(`Failed to initialize backend: ${error.message}`);
        }
      }
    };
    initBackend();
  }, [isLoggedIn, principal]);

  // Load performance metrics
  const loadMetrics = async () => {
    if (!backend) return;

    setLoading(true);
    setError(null);

    try {
      console.log('Loading performance metrics...');
      
      // Get detailed cache statistics
      const detailed = await backend.get_detailed_cache_stats();
      console.log('Detailed stats result:', detailed);
      
      const newMetrics = {
        totalRequests: Number(detailed.total_requests),
        cacheHits: Number(detailed.cache_hits),
        cacheMisses: Number(detailed.cache_misses),
        avgResponseTime: Number(detailed.avg_response_time_ms),
        totalCacheSize: Number(detailed.total_cache_size_bytes),
        cacheUtilization: Number(detailed.cache_utilization_percent)
      };
      
      setMetrics(newMetrics);
      
      // Add to historical data (keep last 20 entries)
      setHistoricalData(prev => {
        const newEntry = {
          timestamp: Date.now(),
          ...newMetrics
        };
        const updated = [...prev, newEntry];
        return updated.slice(-20); // Keep last 20 entries
      });

      setLastRefresh(new Date());
      console.log('Performance metrics loaded successfully');
    } catch (error) {
      console.error('Failed to load performance metrics:', error);
      setError(`Failed to load performance metrics: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Run performance tests
  const runPerformanceTests = async () => {
    if (!backend || isRunningTests) return;

    setIsRunningTests(true);
    setError(null);
    setTestResults(null);

    try {
      console.log('Running performance tests...');
      
      const tests = [];
      const startTime = Date.now();

      // Test 1: HTTP outcall setup
      try {
        const httpTest = await backend.test_http_outcall_setup();
        if (httpTest.Ok) {
          tests.push({
            name: 'HTTP Outcall Setup',
            status: 'success',
            result: httpTest.Ok,
            duration: Date.now() - startTime
          });
        } else if (httpTest.Err) {
          tests.push({
            name: 'HTTP Outcall Setup',
            status: 'error',
            result: httpTest.Err,
            duration: Date.now() - startTime
          });
        }
      } catch (error) {
        tests.push({
          name: 'HTTP Outcall Setup',
          status: 'error',
          result: error.message,
          duration: Date.now() - startTime
        });
      }



      // Test 3: LRU eviction demo
      try {
        const lruTest = await backend.test_lru_eviction_demo();
        if (lruTest.Ok) {
          tests.push({
            name: 'LRU Eviction',
            status: 'success',
            result: lruTest.Ok,
            duration: Date.now() - startTime
          });
        } else if (lruTest.Err) {
          tests.push({
            name: 'LRU Eviction',
            status: 'error',
            result: lruTest.Err,
            duration: Date.now() - startTime
          });
        }
      } catch (error) {
        tests.push({
          name: 'LRU Eviction',
          status: 'error',
          result: error.message,
          duration: Date.now() - startTime
        });
      }

      // Test 4: Complete real flow
      try {
        const flowTest = await backend.test_complete_real_flow();
        if (flowTest.Ok) {
          tests.push({
            name: 'Complete Real Flow',
            status: 'success',
            result: flowTest.Ok,
            duration: Date.now() - startTime
          });
        } else if (flowTest.Err) {
          tests.push({
            name: 'Complete Real Flow',
            status: 'error',
            result: flowTest.Err,
            duration: Date.now() - startTime
          });
        }
      } catch (error) {
        tests.push({
          name: 'Complete Real Flow',
          status: 'error',
          result: error.message,
          duration: Date.now() - startTime
        });
      }

      setTestResults({
        timestamp: Date.now(),
        tests,
        totalDuration: Date.now() - startTime
      });

      console.log('Performance tests completed');
    } catch (error) {
      console.error('Failed to run performance tests:', error);
      setError(`Failed to run performance tests: ${error.message}`);
    } finally {
      setIsRunningTests(false);
    }
  };

  // Auto-refresh every 30 seconds
  useEffect(() => {
    if (backend && autoRefresh) {
      loadMetrics();
      const interval = setInterval(loadMetrics, 30000);
      return () => clearInterval(interval);
    }
  }, [backend, autoRefresh]);

  // Calculate cache hit rate
  const getCacheHitRate = () => {
    if (metrics.totalRequests === 0) return 0;
    return Math.round((metrics.cacheHits / metrics.totalRequests) * 100);
  };

  // Get performance grade based on test results (3 tests total)
  const getPerformanceGrade = () => {
    // If no tests have been run, show "_"
    if (!testResults || testResults.tests.length === 0) {
      return '_';
    }
    
    const totalTests = testResults.tests.length;
    const successfulTests = testResults.tests.filter(test => test.status === 'success').length;
    const successRate = (successfulTests / totalTests) * 100;
    
    // Grade based on test success rate (3 tests total)
    if (successRate === 100) {
      return 'A+'; // All 3 tests passed
    } else if (successRate >= 66.7) {
      return 'A'; // 2 out of 3 tests passed
    } else if (successRate >= 33.3) {
      return 'B'; // 1 out of 3 tests passed
    } else {
      return 'C'; // 0 out of 3 tests passed
    }
  };

  // Get grade color and description
  const getGradeInfo = (grade) => {
    switch (grade) {
      case '_':
        return {
          color: 'text-gray-400',
          bgColor: 'bg-gray-400/20',
          description: 'No Tests Run',
          details: 'Run performance tests to get a grade'
        };
      case 'A+':
        return {
          color: 'text-green-400',
          bgColor: 'bg-green-400/20',
          description: 'Excellent Performance',
          details: 'All 3 tests passed - Perfect system health'
        };
      case 'A':
        return {
          color: 'text-green-500',
          bgColor: 'bg-green-500/20',
          description: 'Great Performance',
          details: '2 out of 3 tests passed - System performing well'
        };
      case 'B':
        return {
          color: 'text-yellow-400',
          bgColor: 'bg-yellow-400/20',
          description: 'Good Performance',
          details: '1 out of 3 tests passed - System performing adequately'
        };
      case 'C':
        return {
          color: 'text-orange-400',
          bgColor: 'bg-orange-400/20',
          description: 'Fair Performance',
          details: '0 out of 3 tests passed - System needs attention'
        };
      case 'D':
        return {
          color: 'text-red-400',
          bgColor: 'bg-red-400/20',
          description: 'Poor Performance',
          details: 'Significant issues detected'
        };
      default:
        return {
          color: 'text-gray-400',
          bgColor: 'bg-gray-400/20',
          description: 'Unknown',
          details: 'Unable to determine performance'
        };
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
              <Activity className="w-12 h-12 text-white" />
            </div>
            <h1 className="text-4xl font-bold mb-4">Please Log In</h1>
            <p className="text-lg text-neutral-400 mb-8">
              You need to be logged in to access the Performance Monitor
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
            <h1 className="text-4xl font-bold mb-2">Performance Monitor</h1>
            <p className="text-lg text-neutral-400 mb-2">Real-time monitoring of your dCDN performance metrics</p>
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
              onClick={runPerformanceTests}
              disabled={isRunningTests || loading}
              className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg disabled:opacity-50 transition-all duration-300 flex items-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {isRunningTests ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Running Tests...
                </>
              ) : (
                <>
                  <Activity className="w-4 h-4" />
                  Run Tests
                </>
              )}
            </motion.button>
          </div>

          <div className="flex gap-3">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="rounded"
              />
              Auto-refresh
            </label>
            
          <motion.button
              onClick={loadMetrics}
            disabled={loading}
            className="bg-gradient-to-r from-orange-500 to-orange-700 hover:from-orange-600 hover:to-orange-800 px-4 py-2 rounded-lg disabled:opacity-50 transition-all duration-300 flex items-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              {loading ? 'Refreshing...' : 'Refresh'}
          </motion.button>
          </div>
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

        {/* Performance Grade */}
        <motion.section 
          initial={{ opacity: 0, y: 40 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ delay: 0.2 }}
          className="mb-8"
        >
          <div className="bg-white/10 dark:bg-neutral-900/40 backdrop-blur-xl rounded-2xl p-8 border border-white/30 dark:border-neutral-700 shadow-xl">
            <div className="text-center">
              <h2 className="text-3xl font-bold mb-4">Performance Grade</h2>
              {(() => {
                const grade = getPerformanceGrade();
                const gradeInfo = getGradeInfo(grade);
                return (
                  <>
                    <div className={`text-8xl font-bold ${gradeInfo.color} mb-4`}>
                      {grade}
                    </div>
                    <div className={`inline-block px-4 py-2 rounded-lg ${gradeInfo.bgColor} border border-current/20 mb-4`}>
                      <p className="text-lg font-semibold">{gradeInfo.description}</p>
                      <p className="text-sm opacity-80">{gradeInfo.details}</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm mb-4">
                      <div className="flex items-center justify-center gap-2">
                        <Target className="w-4 h-4 text-green-400" />
                        <span>Hit Rate: {getCacheHitRate()}%</span>
                      </div>
                      <div className="flex items-center justify-center gap-2">
                        <Gauge className="w-4 h-4 text-blue-400" />
                        <span>Response: {metrics.avgResponseTime}ms</span>
                      </div>
                      <div className="flex items-center justify-center gap-2">
                        <Database className="w-4 h-4 text-purple-400" />
                        <span>Utilization: {metrics.cacheUtilization}%</span>
                      </div>
                    </div>
                    {testResults && (
                      <div className="mt-4 p-3 bg-neutral-800/50 rounded-lg">
                        <p className="text-sm text-neutral-300">
                          Test Success Rate: {Math.round((testResults.tests.filter(t => t.status === 'success').length / testResults.tests.length) * 100)}%
                        </p>
                        <p className="text-xs text-neutral-400">
                          Based on {testResults.tests.length} performance tests ({testResults.tests.filter(t => t.status === 'success').length} passed)
                        </p>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          </div>
        </motion.section>

        {/* Key Metrics Grid */}
        <motion.section
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8"
        >
          {/* Total Requests */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4 }}
            className="bg-white/10 dark:bg-neutral-900/40 backdrop-blur-xl rounded-2xl p-6 border border-white/30 dark:border-neutral-700 shadow-xl"
          >
            <div className="flex items-center justify-between mb-4">
              <Activity className="w-8 h-8 text-orange-500" />
              <TrendingUp className="w-5 h-5 text-green-400" />
            </div>
            <h3 className="text-2xl font-bold mb-2">
              {loading ? '...' : metrics.totalRequests.toLocaleString()}
            </h3>
            <p className="text-neutral-400 text-sm">Total Requests</p>
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
              <div className={`w-3 h-3 rounded-full ${
                getCacheHitRate() >= 80 ? 'bg-green-500' : 
                getCacheHitRate() >= 60 ? 'bg-yellow-500' : 'bg-red-500'
              }`}></div>
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
                {metrics.cacheHits} hits / {metrics.cacheMisses} misses
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
              <div className={`w-3 h-3 rounded-full ${
                metrics.avgResponseTime < 100 ? 'bg-green-500' : 
                metrics.avgResponseTime < 500 ? 'bg-yellow-500' : 'bg-red-500'
              }`}></div>
            </div>
            <h3 className="text-2xl font-bold mb-2">
              {loading ? '...' : `${metrics.avgResponseTime}ms`}
            </h3>
            <p className="text-neutral-400 text-sm">Avg Response Time</p>
            <div className="mt-3 text-xs text-neutral-500">
              {metrics.avgResponseTime < 100 ? 'Excellent' : 
               metrics.avgResponseTime < 500 ? 'Good' : 'Needs Improvement'}
            </div>
          </motion.div>

          {/* Cache Utilization */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.7 }}
            className="bg-white/10 dark:bg-neutral-900/40 backdrop-blur-xl rounded-2xl p-6 border border-white/30 dark:border-neutral-700 shadow-xl"
          >
            <div className="flex items-center justify-between mb-4">
              <Database className="w-8 h-8 text-orange-500" />
              <div className={`w-3 h-3 rounded-full ${
                metrics.cacheUtilization < 70 ? 'bg-green-500' : 
                metrics.cacheUtilization < 90 ? 'bg-yellow-500' : 'bg-red-500'
              }`}></div>
            </div>
            <h3 className="text-2xl font-bold mb-2">
              {loading ? '...' : `${metrics.cacheUtilization}%`}
            </h3>
            <p className="text-neutral-400 text-sm">Cache Utilization</p>
            <div className="mt-3">
              <div className="w-full bg-neutral-700 rounded-full h-2 mb-1">
                <div
                  className="bg-gradient-to-r from-orange-500 to-orange-700 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${metrics.cacheUtilization}%` }}
                ></div>
              </div>
              <div className="text-xs text-neutral-500">
                {formatBytes(metrics.totalCacheSize)} used
              </div>
            </div>
          </motion.div>
        </motion.section>

        {/* Test Results */}
        <AnimatePresence>
          {testResults && (
        <motion.section 
          initial={{ opacity: 0, y: 40 }} 
          animate={{ opacity: 1, y: 0 }} 
              exit={{ opacity: 0, y: 40 }}
              transition={{ delay: 0.8 }}
          className="bg-white/10 dark:bg-neutral-900/40 backdrop-blur-xl rounded-2xl p-8 border border-white/30 dark:border-neutral-700 shadow-xl mb-8"
        >
              <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                <Activity className="w-6 h-6 text-orange-500" />
                Performance Test Results
          </h2>
          
              <div className="space-y-4">
                {testResults.tests.map((test, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 * index }}
                    className={`p-4 rounded-lg border ${
                      test.status === 'success' 
                        ? 'bg-green-900/20 border-green-500/30' 
                        : 'bg-red-900/20 border-red-500/30'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold flex items-center gap-2">
                        {test.status === 'success' ? (
                          <CheckCircle className="w-4 h-4 text-green-400" />
                        ) : (
                          <AlertCircle className="w-4 h-4 text-red-400" />
                        )}
                        {test.name}
                      </h3>
                      <span className={`text-xs px-2 py-1 rounded ${
                        test.status === 'success' 
                          ? 'bg-green-500/20 text-green-400' 
                          : 'bg-red-500/20 text-red-400'
                      }`}>
                        {test.status}
                    </span>
                  </div>
                    <p className="text-sm text-neutral-300">{test.result}</p>
                    <p className="text-xs text-neutral-500 mt-2">
                      Duration: {test.duration}ms
                    </p>
                  </motion.div>
                ))}
              </div>
              
              <div className="mt-4 p-3 bg-neutral-800/30 rounded-lg">
                <p className="text-sm text-neutral-400">
                  <strong>Total Test Duration:</strong> {testResults.totalDuration}ms
                </p>
              </div>
            </motion.section>
          )}
        </AnimatePresence>

        {/* Historical Data Chart */}
        {historicalData.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9 }}
            className="bg-white/10 dark:bg-neutral-900/40 backdrop-blur-xl rounded-2xl p-8 border border-white/30 dark:border-neutral-700 shadow-xl mb-8"
          >
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
              <BarChart3 className="w-6 h-6 text-orange-500" />
              Performance Trends
            </h2>
            
            <div className="space-y-4">
              {historicalData.slice(-5).map((entry, index) => (
                <motion.div
                  key={entry.timestamp}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 * index }}
                  className="p-4 bg-neutral-800/30 rounded-lg border border-neutral-700"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-neutral-400">
                      {new Date(entry.timestamp).toLocaleTimeString()}
                    </span>
                    <span className="text-sm font-medium text-orange-400">
                      Hit Rate: {Math.round((entry.cacheHits / Math.max(entry.totalRequests, 1)) * 100)}%
                    </span>
                  </div>
                  <div className="grid grid-cols-4 gap-4 text-xs">
                    <div>
                      <span className="text-neutral-400">Requests:</span>
                      <span className="ml-1 text-white">{entry.totalRequests}</span>
                    </div>
                    <div>
                      <span className="text-neutral-400">Hits:</span>
                      <span className="ml-1 text-green-400">{entry.cacheHits}</span>
                    </div>
                    <div>
                      <span className="text-neutral-400">Misses:</span>
                      <span className="ml-1 text-red-400">{entry.cacheMisses}</span>
                    </div>
                    <div>
                      <span className="text-neutral-400">Response:</span>
                      <span className="ml-1 text-blue-400">{entry.avgResponseTime}ms</span>
                    </div>
                    </div>
                </motion.div>
              ))}
            </div>
          </motion.section>
          )}

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
