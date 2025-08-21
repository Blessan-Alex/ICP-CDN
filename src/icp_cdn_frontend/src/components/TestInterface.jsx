import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  TestTube, Play, CheckCircle, AlertCircle, RefreshCw, 
  Database, Globe, Zap, Settings, Info, Clock, FileText
} from 'lucide-react';
import { useAuth } from '../AuthContext';
import { createActor, canisterId } from '../canister_id_patch';
import { HttpAgent } from '@dfinity/agent';
import { initAuth, getIdentity } from '../auth';

export default function TestInterface() {
  const { principal, isLoggedIn } = useAuth();
  const [backend, setBackend] = useState(null);
  const [testResults, setTestResults] = useState({});
  const [runningTests, setRunningTests] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [testImageCid, setTestImageCid] = useState('test_image_123');
  const [testImageSize, setTestImageSize] = useState({ width: 100, height: 100 });

  // Initialize backend connection
  useEffect(() => {
    const initBackend = async () => {
      if (isLoggedIn && principal) {
        try {
          console.log('Initializing backend for test interface...');
          await initAuth();
          const identity = getIdentity();
          const agent = new HttpAgent({
            host: import.meta.env.VITE_DFX_REPLICA_HOST || "http://127.0.0.1:4943",
            identity
          });
          const backendInstance = createActor(canisterId, { agent });
          
          // Test the backend connection
          console.log('Testing backend connection for test interface...');
          const testResult = await backendInstance.greet("test");
          console.log('Backend test result:', testResult);
          
          setBackend(backendInstance);
          console.log('Backend initialized successfully for test interface');
        } catch (error) {
          console.error('Failed to initialize backend for test interface:', error);
          setError(`Failed to initialize backend: ${error.message}`);
        } finally {
          setLoading(false);
        }
      }
    };
    initBackend();
  }, [isLoggedIn, principal]);

  // Test function runner
  const runTest = async (testName, testFunction) => {
    if (!backend || runningTests.has(testName)) return;

    setRunningTests(prev => new Set(prev).add(testName));
    setError(null);

    try {
      console.log(`Running test: ${testName}`);
      const startTime = Date.now();
      const result = await testFunction();
      const duration = Date.now() - startTime;

      setTestResults(prev => ({
        ...prev,
        [testName]: {
          status: 'success',
          result: result,
          duration,
          timestamp: Date.now()
        }
      }));

      console.log(`Test ${testName} completed successfully`);
    } catch (error) {
      console.error(`Test ${testName} failed:`, error);
      setTestResults(prev => ({
        ...prev,
        [testName]: {
          status: 'error',
          result: error.message,
          duration: 0,
          timestamp: Date.now()
        }
      }));
    } finally {
      setRunningTests(prev => {
        const newSet = new Set(prev);
        newSet.delete(testName);
        return newSet;
      });
    }
  };

  // Test definitions
  const tests = [
    {
      name: 'HTTP Outcall Setup',
      description: 'Test HTTP outcall configuration and transform function',
      icon: <Globe className="w-5 h-5" />,
      category: 'HTTP',
      function: () => backend.test_http_outcall_setup()
    },
    {
      name: 'Real HTTP Outcalls',
      description: 'Test actual HTTP outcalls to IPFS and Pinata',
      icon: <Globe className="w-5 h-5" />,
      category: 'HTTP',
      function: () => backend.test_real_http_outcalls()
    },
    {
      name: 'LRU Eviction Demo',
      description: 'Demonstrate LRU cache eviction with overflow',
      icon: <Database className="w-5 h-5" />,
      category: 'Cache',
      function: () => backend.test_lru_eviction_demo()
    },
    {
      name: 'LRU Access Pattern',
      description: 'Test LRU access pattern and queue ordering',
      icon: <Database className="w-5 h-5" />,
      category: 'Cache',
      function: () => backend.test_lru_access_pattern()
    },
    {
      name: 'Complete Real Flow',
      description: 'Test complete upload, cache, and delivery flow',
      icon: <Zap className="w-5 h-5" />,
      category: 'Integration',
      function: () => backend.test_complete_real_flow()
    },
    {
      name: 'IPFS Fetch and Cache',
      description: 'Test IPFS fetch with automatic caching',
      icon: <Globe className="w-5 h-5" />,
      category: 'Integration',
      function: () => backend.test_ipfs_fetch_and_cache_flow('QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG')
    },
    {
      name: 'Upload and Pinning',
      description: 'Test content upload with automatic pinning',
      icon: <FileText className="w-5 h-5" />,
      category: 'Integration',
      function: () => backend.test_upload_and_pinning_flow(
        'test_upload_123',
        'text/plain',
        [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
      )
    },
    {
      name: 'Pinata Pinning',
      description: 'Test direct Pinata API pinning',
      icon: <Globe className="w-5 h-5" />,
      category: 'HTTP',
      function: () => backend.test_pinata_pinning('QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG')
    },
    {
      name: 'Create Test Image',
      description: 'Create a test image for resizing tests',
      icon: <FileText className="w-5 h-5" />,
      category: 'Image',
      function: () => backend.create_test_image(testImageCid, testImageSize.width, testImageSize.height)
    },
    {
      name: 'Image Resizing',
      description: 'Test on-chain image resizing functionality',
      icon: <FileText className="w-5 h-5" />,
      category: 'Image',
      function: () => backend.test_image_resizing(testImageCid, testImageSize.width, 50)
    }
  ];

  // Group tests by category
  const groupedTests = tests.reduce((acc, test) => {
    if (!acc[test.category]) {
      acc[test.category] = [];
    }
    acc[test.category].push(test);
    return acc;
  }, {});

  // Run all tests
  const runAllTests = async () => {
    for (const test of tests) {
      await runTest(test.name, test.function);
      // Small delay between tests
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  };

  // Clear all results
  const clearResults = () => {
    setTestResults({});
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
              <TestTube className="w-12 h-12 text-white" />
            </div>
            <h1 className="text-4xl font-bold mb-4">Please Log In</h1>
            <p className="text-lg text-neutral-400 mb-8">
              You need to be logged in to access the Test Interface
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
            <h1 className="text-4xl font-bold mb-2">Test Interface</h1>
            <p className="text-lg text-neutral-400 mb-2">Test all backend functions and features</p>
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
              onClick={runAllTests}
              disabled={runningTests.size > 0 || loading}
              className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg disabled:opacity-50 transition-all duration-300 flex items-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Play className="w-4 h-4" />
              Run All Tests
            </motion.button>
            
            <motion.button
              onClick={clearResults}
              disabled={Object.keys(testResults).length === 0}
              className="bg-neutral-600 hover:bg-neutral-700 px-4 py-2 rounded-lg disabled:opacity-50 transition-all duration-300 flex items-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-500"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <RefreshCw className="w-4 h-4" />
              Clear Results
            </motion.button>
          </div>

          <div className="text-sm text-neutral-400">
            {runningTests.size > 0 && (
              <span className="flex items-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin" />
                {runningTests.size} test(s) running...
              </span>
            )}
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

        {/* Test Configuration */}
        <motion.section
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white/10 dark:bg-neutral-900/40 backdrop-blur-xl rounded-2xl p-6 border border-white/30 dark:border-neutral-700 shadow-xl mb-8"
        >
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Settings className="w-5 h-5 text-orange-500" />
            Test Configuration
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-2">
                Test Image CID
              </label>
              <input
                type="text"
                value={testImageCid}
                onChange={(e) => setTestImageCid(e.target.value)}
                className="w-full px-3 py-2 bg-neutral-800/50 border border-neutral-700 rounded-lg text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
                placeholder="test_image_123"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-2">
                Image Width
              </label>
              <input
                type="number"
                value={testImageSize.width}
                onChange={(e) => setTestImageSize(prev => ({ ...prev, width: parseInt(e.target.value) || 100 }))}
                className="w-full px-3 py-2 bg-neutral-800/50 border border-neutral-700 rounded-lg text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
                min="50"
                max="1000"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-2">
                Image Height
              </label>
              <input
                type="number"
                value={testImageSize.height}
                onChange={(e) => setTestImageSize(prev => ({ ...prev, height: parseInt(e.target.value) || 100 }))}
                className="w-full px-3 py-2 bg-neutral-800/50 border border-neutral-700 rounded-lg text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
                min="50"
                max="1000"
              />
            </div>
          </div>
        </motion.section>

        {/* Test Categories */}
        {Object.entries(groupedTests).map(([category, categoryTests]) => (
          <motion.section
            key={category}
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white/10 dark:bg-neutral-900/40 backdrop-blur-xl rounded-2xl p-8 border border-white/30 dark:border-neutral-700 shadow-xl mb-8"
          >
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
              {category === 'HTTP' && <Globe className="w-6 h-6 text-orange-500" />}
              {category === 'Cache' && <Database className="w-6 h-6 text-orange-500" />}
              {category === 'Integration' && <Zap className="w-6 h-6 text-orange-500" />}
              {category === 'Image' && <FileText className="w-6 h-6 text-orange-500" />}
              {category} Tests
            </h2>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {categoryTests.map((test) => {
                const result = testResults[test.name];
                const isRunning = runningTests.has(test.name);
                
                return (
                  <motion.div
                    key={test.name}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-neutral-800/50 rounded-lg p-6 border border-neutral-700"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="text-orange-500">
                          {test.icon}
                        </div>
                        <h3 className="text-lg font-semibold">{test.name}</h3>
                      </div>
                      
                      <motion.button
                        onClick={() => runTest(test.name, test.function)}
                        disabled={isRunning || loading}
                        className={`px-3 py-1 rounded text-sm font-medium transition-all duration-300 flex items-center gap-1 ${
                          isRunning
                            ? 'bg-blue-600 text-white cursor-not-allowed'
                            : 'bg-orange-600 hover:bg-orange-700 text-white'
                        }`}
                        whileHover={!isRunning ? { scale: 1.05 } : {}}
                        whileTap={!isRunning ? { scale: 0.95 } : {}}
                      >
                        {isRunning ? (
                          <>
                            <RefreshCw className="w-3 h-3 animate-spin" />
                            Running...
                          </>
                        ) : (
                          <>
                            <Play className="w-3 h-3" />
                            Run
                          </>
                        )}
                      </motion.button>
                    </div>
                    
                    <p className="text-sm text-neutral-400 mb-4">
                      {test.description}
                    </p>
                    
                    {/* Test Result */}
                    <AnimatePresence>
                      {result && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 10 }}
                          className={`p-3 rounded border text-sm ${
                            result.status === 'success'
                              ? 'bg-green-900/20 border-green-500/30 text-green-400'
                              : 'bg-red-900/20 border-red-500/30 text-red-400'
                          }`}
                        >
                          <div className="flex items-center gap-2 mb-2">
                            {result.status === 'success' ? (
                              <CheckCircle className="w-4 h-4" />
                            ) : (
                              <AlertCircle className="w-4 h-4" />
                            )}
                            <span className="font-medium">
                              {result.status === 'success' ? 'Success' : 'Error'}
                            </span>
                            {result.duration > 0 && (
                              <span className="text-xs opacity-75">
                                ({result.duration}ms)
                              </span>
                            )}
                          </div>
                          
                          <div className="text-xs opacity-75 mb-2">
                            {new Date(result.timestamp).toLocaleTimeString()}
                          </div>
                          
                          <div className="max-h-20 overflow-y-auto">
                            <pre className="text-xs whitespace-pre-wrap">
                              {typeof result.result === 'string' 
                                ? result.result 
                                : JSON.stringify(result.result, null, 2)
                              }
                            </pre>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </div>
          </motion.section>
        ))}

        {/* Test Summary */}
        {Object.keys(testResults).length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-white/10 dark:bg-neutral-900/40 backdrop-blur-xl rounded-2xl p-8 border border-white/30 dark:border-neutral-700 shadow-xl mb-8"
          >
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
              <Info className="w-6 h-6 text-orange-500" />
              Test Summary
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="text-center p-4 bg-neutral-800/50 rounded-lg">
                <div className="text-3xl font-bold text-orange-500 mb-2">
                  {Object.keys(testResults).length}
                </div>
                <div className="text-neutral-400">Total Tests</div>
              </div>
              
              <div className="text-center p-4 bg-neutral-800/50 rounded-lg">
                <div className="text-3xl font-bold text-green-500 mb-2">
                  {Object.values(testResults).filter(r => r.status === 'success').length}
                </div>
                <div className="text-neutral-400">Passed</div>
              </div>
              
              <div className="text-center p-4 bg-neutral-800/50 rounded-lg">
                <div className="text-3xl font-bold text-red-500 mb-2">
                  {Object.values(testResults).filter(r => r.status === 'error').length}
                </div>
                <div className="text-neutral-400">Failed</div>
              </div>
              
              <div className="text-center p-4 bg-neutral-800/50 rounded-lg">
                <div className="text-3xl font-bold text-blue-500 mb-2">
                  {Object.values(testResults).reduce((sum, r) => sum + r.duration, 0)}
                </div>
                <div className="text-neutral-400">Total Time (ms)</div>
              </div>
            </div>
          </motion.section>
        )}
      </div>
    </motion.div>
  );
}
