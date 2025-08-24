import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Upload, FileText, Cloud, Zap, Shield, CheckCircle, AlertCircle, Loader, Crown, Info,
  Database, Globe, Settings, User, DollarSign, Package, Calculator, Download, RefreshCw,
  BarChart3, List
} from 'lucide-react';
import { useAuth } from '../AuthContext';
import { createActor, canisterId } from '../canister_id_patch';
import { HttpAgent } from '@dfinity/agent';
import { initAuth, getIdentity } from '../auth';
import { 
  CdnClient, 
  UserTier, 
  UserAccount, 
  CacheEntry,
  CYCLES_SMALL_UPLOAD, 
  CYCLES_MEDIUM_UPLOAD, 
  CYCLES_LARGE_UPLOAD 
} from '../lib/cdnClient';

export default function LibraryDemo() {
  const { principal, isLoggedIn } = useAuth();
  const [cdnClient, setCdnClient] = useState(null);
  const [testResults, setTestResults] = useState({});
  const [runningTests, setRunningTests] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [uploadedCid, setUploadedCid] = useState(null);
  const [retrievedContent, setRetrievedContent] = useState(null);
  const [userAccount, setUserAccount] = useState(null);
  const [costEstimates, setCostEstimates] = useState({});
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileContent, setFileContent] = useState(null);
  const [componentError, setComponentError] = useState(null);

  // Initialize CDN client library
  useEffect(() => {
    const initCdnClient = async () => {
      try {
        console.log('Initializing CDN Client Library...');
        console.log('isLoggedIn:', isLoggedIn);
        console.log('principal:', principal);
        console.log('canisterId:', canisterId);
        
        if (isLoggedIn && principal && canisterId) {
          await initAuth();
          const identity = await getIdentity();
          const agent = new HttpAgent({
            host: import.meta.env.VITE_DFX_REPLICA_HOST || "http://127.0.0.1:4943",
            identity
          });

          // Create CDN client using the actual library
          const client = CdnClient.new(canisterId, agent);
          
          // Initialize the backend connection
          await client.initBackend(createActor);
          
          console.log('CDN Client Library initialized successfully!');
          setCdnClient(client);
          setLoading(false);
        } else {
          console.log('Not logged in or missing required data');
          setLoading(false);
        }
      } catch (error) {
        console.error('Failed to initialize CDN Client Library:', error);
        setError(error.message);
        setLoading(false);
      }
    };
    initCdnClient();
  }, [isLoggedIn, principal, canisterId]);

  // Test 1: Upload Asset (Using actual library)
  const testUploadAsset = async () => {
    if (!cdnClient) {
      setTestResults(prev => ({ 
        ...prev, 
        upload: { 
          status: 'error', 
          message: 'CDN Client not initialized. Please wait for initialization to complete.' 
        } 
      }));
      return;
    }
    
    setRunningTests(prev => new Set(prev).add('upload'));
    setTestResults(prev => ({ ...prev, upload: { status: 'running', message: 'Testing upload functionality with CDN Client Library...' } }));

    try {
      const testContent = "Hello from CDN Client Library Demo!";
      const contentType = "text/plain";
      
      console.log('Testing uploadAsset() with CDN Client Library...');
      const cid = await cdnClient.uploadAsset(testContent, contentType, CYCLES_SMALL_UPLOAD);

      setUploadedCid(cid);
      setTestResults(prev => ({ 
        ...prev, 
        upload: { 
          status: 'success', 
          message: `Upload successful using CDN Client Library! CID: ${cid}`,
          data: { cid, contentType, size: testContent.length, cyclesUsed: CYCLES_SMALL_UPLOAD.toString() }
        } 
      }));
    } catch (error) {
      console.error('Upload test failed:', error);
      setTestResults(prev => ({ 
        ...prev, 
        upload: { 
          status: 'error', 
          message: `Upload failed: ${error.message}` 
        } 
      }));
    } finally {
      setRunningTests(prev => {
        const newSet = new Set(prev);
        newSet.delete('upload');
        return newSet;
      });
    }
  };

  // Test 2: Get Asset (Using actual library)
  const testGetAsset = async () => {
    if (!cdnClient || !uploadedCid) {
      setTestResults(prev => ({ 
        ...prev, 
        get: { 
          status: 'error', 
          message: 'No uploaded CID available. Please run upload test first.' 
        } 
      }));
      return;
    }

    setRunningTests(prev => new Set(prev).add('get'));
    setTestResults(prev => ({ ...prev, get: { status: 'running', message: 'Testing retrieval functionality with CDN Client Library...' } }));

    try {
      console.log('Testing getAsset() with CDN Client Library...');
      const content = await cdnClient.getAsset(uploadedCid);
      
      const textContent = new TextDecoder().decode(content);
      setRetrievedContent(textContent);
      setTestResults(prev => ({ 
        ...prev, 
        get: { 
          status: 'success', 
          message: `Retrieval successful using CDN Client Library! Content: "${textContent}"`,
          data: { content: textContent, size: content.length, cid: uploadedCid }
        } 
      }));
    } catch (error) {
      console.error('Get asset test failed:', error);
      setTestResults(prev => ({ 
        ...prev, 
        get: { 
          status: 'error', 
          message: `Retrieval failed: ${error.message}` 
        } 
      }));
    } finally {
      setRunningTests(prev => {
        const newSet = new Set(prev);
        newSet.delete('get');
        return newSet;
      });
    }
  };

  // Test 3: Get User Account (Using actual library)
  const testGetUserAccount = async () => {
    if (!cdnClient) return;

    setRunningTests(prev => new Set(prev).add('userAccount'));
    setTestResults(prev => ({ ...prev, userAccount: { status: 'running', message: 'Testing user account functionality with CDN Client Library...' } }));

    try {
      console.log('Testing getUserAccount() with CDN Client Library...');
      const account = await cdnClient.getUserAccount();
      
      setUserAccount(account);
             setTestResults(prev => ({ 
         ...prev, 
         userAccount: { 
           status: 'success', 
           message: `User account retrieved using CDN Client Library! Tier: ${account.tier}, Balance: ${account.cycles_balance} cycles`,
           data: {
             user_principal: account.user_principal.toString(),
             cycles_balance: account.cycles_balance,
             tier: account.tier,
             cache_usage_bytes: account.cache_usage_bytes,
             pinata_enabled: account.pinata_enabled
           }
         } 
       }));
    } catch (error) {
      console.error('Get user account test failed:', error);
      setTestResults(prev => ({ 
        ...prev, 
        userAccount: { 
          status: 'error', 
          message: `User account retrieval failed: ${error.message}` 
        } 
      }));
    } finally {
      setRunningTests(prev => {
        const newSet = new Set(prev);
        newSet.delete('userAccount');
        return newSet;
      });
    }
  };

  // Test 4: Cost Estimation (Using actual library)
  const testCostEstimation = async () => {
    if (!cdnClient) return;

    setRunningTests(prev => new Set(prev).add('costEstimation'));
    setTestResults(prev => ({ ...prev, costEstimation: { status: 'running', message: 'Testing cost estimation with CDN Client Library...' } }));

    try {
      console.log('Testing cost estimation with CDN Client Library...');
      const fileSizes = [1024, 10240, 102400]; // 1KB, 10KB, 100KB
      const estimates = {};

      for (const size of fileSizes) {
        const uploadCost = await cdnClient.estimateUploadCost(size);
        const storageCost = await cdnClient.estimateStorageCost(size, 24); // 24 hours
        estimates[`${size}bytes`] = { 
          upload: uploadCost.toString(), 
          storage: storageCost.toString() 
        };
      }

      setCostEstimates(estimates);
      setTestResults(prev => ({ 
        ...prev, 
        costEstimation: { 
          status: 'success', 
          message: 'Cost estimation completed successfully using CDN Client Library!',
          data: estimates
        } 
      }));
    } catch (error) {
      console.error('Cost estimation test failed:', error);
      setTestResults(prev => ({ 
        ...prev, 
        costEstimation: { 
          status: 'error', 
          message: `Cost estimation failed: ${error.message}` 
        } 
      }));
    } finally {
      setRunningTests(prev => {
        const newSet = new Set(prev);
        newSet.delete('costEstimation');
        return newSet;
      });
    }
  };

  // Test 5: File Upload with Real File (Using actual library)
  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = new Uint8Array(e.target.result);
        setFileContent(content);
      };
      reader.readAsArrayBuffer(file);
    }
  };

  const testRealFileUpload = async () => {
    if (!cdnClient || !selectedFile || !fileContent) {
      setTestResults(prev => ({ 
        ...prev, 
        realFileUpload: { 
          status: 'error', 
          message: 'Please select a file first.' 
        } 
      }));
      return;
    }

    setRunningTests(prev => new Set(prev).add('realFileUpload'));
    setTestResults(prev => ({ ...prev, realFileUpload: { status: 'running', message: 'Uploading real file with CDN Client Library...' } }));

    try {
      console.log('Testing real file upload with CDN Client Library...');
      const cid = await cdnClient.uploadAsset(fileContent, selectedFile.type, CYCLES_MEDIUM_UPLOAD);

      setTestResults(prev => ({ 
        ...prev, 
        realFileUpload: { 
          status: 'success', 
          message: `Real file uploaded using CDN Client Library! CID: ${cid}, Size: ${fileContent.length} bytes`,
          data: { 
            cid, 
            fileName: selectedFile.name, 
            size: fileContent.length,
            contentType: selectedFile.type,
            cyclesUsed: CYCLES_MEDIUM_UPLOAD.toString()
          }
        } 
      }));
    } catch (error) {
      console.error('Real file upload test failed:', error);
      setTestResults(prev => ({ 
        ...prev, 
        realFileUpload: { 
          status: 'error', 
          message: `Real file upload failed: ${error.message}` 
        } 
      }));
    } finally {
      setRunningTests(prev => {
        const newSet = new Set(prev);
        newSet.delete('realFileUpload');
        return newSet;
      });
    }
  };

  // Test 6: IPFS Fallback (Using actual library)
  const testIpfsFallback = async () => {
    if (!cdnClient || !uploadedCid) {
      setTestResults(prev => ({ 
        ...prev, 
        ipfsFallback: { 
          status: 'error', 
          message: 'No uploaded CID available. Please run upload test first.' 
        } 
      }));
      return;
    }

    setRunningTests(prev => new Set(prev).add('ipfsFallback'));
    setTestResults(prev => ({ ...prev, ipfsFallback: { status: 'running', message: 'Testing IPFS fallback with CDN Client Library...' } }));

    try {
      console.log('Testing getAssetWithFallback() with CDN Client Library...');
      const content = await cdnClient.getAssetWithFallback(uploadedCid);
      
      const textContent = new TextDecoder().decode(content);
      setTestResults(prev => ({ 
        ...prev, 
        ipfsFallback: { 
          status: 'success', 
          message: `IPFS fallback successful using CDN Client Library! Content: "${textContent}"`,
          data: { content: textContent, size: content.length, cid: uploadedCid }
        } 
      }));
    } catch (error) {
      console.error('IPFS fallback test failed:', error);
      setTestResults(prev => ({ 
        ...prev, 
        ipfsFallback: { 
          status: 'error', 
          message: `IPFS fallback failed: ${error.message}` 
        } 
      }));
    } finally {
      setRunningTests(prev => {
        const newSet = new Set(prev);
        newSet.delete('ipfsFallback');
        return newSet;
      });
    }
  };

  // Test 7: Cycles Balance (Using actual library)
  const testCyclesBalance = async () => {
    if (!cdnClient) return;

    setRunningTests(prev => new Set(prev).add('cyclesBalance'));
    setTestResults(prev => ({ ...prev, cyclesBalance: { status: 'running', message: 'Testing cycles balance with CDN Client Library...' } }));

    try {
      console.log('Testing getCyclesBalance() with CDN Client Library...');
      const balance = await cdnClient.getCyclesBalance();
      
             setTestResults(prev => ({ 
         ...prev, 
         cyclesBalance: { 
           status: 'success', 
           message: `Cycles balance retrieved using CDN Client Library! Balance: ${balance} cycles`,
           data: { balance: balance }
         } 
       }));
    } catch (error) {
      console.error('Cycles balance test failed:', error);
      setTestResults(prev => ({ 
        ...prev, 
        cyclesBalance: { 
          status: 'error', 
          message: `Cycles balance retrieval failed: ${error.message}` 
        } 
      }));
    } finally {
      setRunningTests(prev => {
        const newSet = new Set(prev);
        newSet.delete('cyclesBalance');
        return newSet;
      });
    }
  };

  // Test 8: Cache Check (Using actual library)
  const testCacheCheck = async () => {
    if (!cdnClient || !uploadedCid) {
      setTestResults(prev => ({ 
        ...prev, 
        cacheCheck: { 
          status: 'error', 
          message: 'No uploaded CID available. Please run upload test first.' 
        } 
      }));
      return;
    }

    setRunningTests(prev => new Set(prev).add('cacheCheck'));
    setTestResults(prev => ({ ...prev, cacheCheck: { status: 'running', message: 'Testing cache check with CDN Client Library...' } }));

    try {
      console.log('Testing isCached() with CDN Client Library...');
      const isCached = await cdnClient.isCached(uploadedCid);
      
      setTestResults(prev => ({ 
        ...prev, 
        cacheCheck: { 
          status: 'success', 
          message: `Cache check completed using CDN Client Library! Cached: ${isCached}`,
          data: { cid: uploadedCid, isCached }
        } 
      }));
    } catch (error) {
      console.error('Cache check test failed:', error);
      setTestResults(prev => ({ 
        ...prev, 
        cacheCheck: { 
          status: 'error', 
          message: `Cache check failed: ${error.message}` 
        } 
      }));
    } finally {
      setRunningTests(prev => {
        const newSet = new Set(prev);
        newSet.delete('cacheCheck');
        return newSet;
      });
    }
  };

  // Test 9: Cache Statistics (Using actual library)
  const testCacheStatistics = async () => {
    if (!cdnClient) return;

    setRunningTests(prev => new Set(prev).add('cacheStatistics'));
    setTestResults(prev => ({ ...prev, cacheStatistics: { status: 'running', message: 'Testing cache statistics with CDN Client Library...' } }));

    try {
      console.log('Testing getCacheStatistics() with CDN Client Library...');
      const stats = await cdnClient.getCacheStatistics();
      
      setTestResults(prev => ({ 
        ...prev, 
        cacheStatistics: { 
          status: 'success', 
          message: `Cache statistics retrieved using CDN Client Library! Hit rate: ${stats.cache_hits}/${stats.total_requests}`,
          data: stats
        } 
      }));
    } catch (error) {
      console.error('Cache statistics test failed:', error);
      setTestResults(prev => ({ 
        ...prev, 
        cacheStatistics: { 
          status: 'error', 
          message: `Cache statistics failed: ${error.message}` 
        } 
      }));
    } finally {
      setRunningTests(prev => {
        const newSet = new Set(prev);
        newSet.delete('cacheStatistics');
        return newSet;
      });
    }
  };

  // Test 10: User Tier Info (Using actual library)
  const testUserTierInfo = async () => {
    if (!cdnClient) return;

    setRunningTests(prev => new Set(prev).add('userTierInfo'));
    setTestResults(prev => ({ ...prev, userTierInfo: { status: 'running', message: 'Testing user tier info with CDN Client Library...' } }));

    try {
      console.log('Testing getUserTierInfo() with CDN Client Library...');
      const tierInfo = await cdnClient.getUserTierInfo();
      
      setTestResults(prev => ({ 
        ...prev, 
        userTierInfo: { 
          status: 'success', 
          message: `User tier info retrieved using CDN Client Library! Current tier: ${tierInfo.current_tier}`,
          data: tierInfo
        } 
      }));
    } catch (error) {
      console.error('User tier info test failed:', error);
      setTestResults(prev => ({ 
        ...prev, 
        userTierInfo: { 
          status: 'error', 
          message: `User tier info failed: ${error.message}` 
        } 
      }));
    } finally {
      setRunningTests(prev => {
        const newSet = new Set(prev);
        newSet.delete('userTierInfo');
        return newSet;
      });
    }
  };

  // Test 11: Available Tiers (Using actual library)
  const testAvailableTiers = async () => {
    if (!cdnClient) return;

    setRunningTests(prev => new Set(prev).add('availableTiers'));
    setTestResults(prev => ({ ...prev, availableTiers: { status: 'running', message: 'Testing available tiers with CDN Client Library...' } }));

    try {
      console.log('Testing getAvailableTiers() with CDN Client Library...');
      const tiers = await cdnClient.getAvailableTiers();
      
      setTestResults(prev => ({ 
        ...prev, 
        availableTiers: { 
          status: 'success', 
          message: `Available tiers retrieved using CDN Client Library! Found ${tiers.length} tiers`,
          data: tiers
        } 
      }));
    } catch (error) {
      console.error('Available tiers test failed:', error);
      setTestResults(prev => ({ 
        ...prev, 
        availableTiers: { 
          status: 'error', 
          message: `Available tiers failed: ${error.message}` 
        } 
      }));
    } finally {
      setRunningTests(prev => {
        const newSet = new Set(prev);
        newSet.delete('availableTiers');
        return newSet;
      });
    }
  };

  const getTestStatusIcon = (status) => {
    switch (status) {
      case 'success': return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'error': return <AlertCircle className="w-5 h-5 text-red-500" />;
      case 'running': return <Loader className="w-5 h-5 text-orange-500 animate-spin" />;
      default: return <Info className="w-5 h-5 text-neutral-500" />;
    }
  };

  const getTestStatusColor = (status) => {
    switch (status) {
      case 'success': return 'border-green-500/30 bg-green-500/10';
      case 'error': return 'border-red-500/30 bg-red-500/10';
      case 'running': return 'border-orange-500/30 bg-orange-500/10';
      default: return 'border-neutral-700 bg-neutral-800/30';
    }
  };

  // Error boundary for component
  if (componentError) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-24 h-24 bg-gradient-to-r from-red-500 to-red-800 rounded-full mx-auto mb-6 flex items-center justify-center">
            <AlertCircle className="w-12 h-12 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-4">Component Error</h2>
          <p className="text-neutral-400 mb-4">{componentError}</p>
          <motion.button
            onClick={() => setComponentError(null)}
            className="bg-gradient-to-r from-orange-500 to-orange-800 py-3 px-6 rounded-xl font-semibold transition-all duration-300 transform hover:scale-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
            whileHover={{ scale: 1.07 }}
            whileTap={{ scale: 0.97 }}
          >
            Try Again
          </motion.button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-24 h-24 bg-gradient-to-r from-orange-500 to-orange-800 rounded-full mx-auto mb-6 flex items-center justify-center">
            <Loader className="w-12 h-12 text-white animate-spin" />
          </div>
          <p className="text-white text-lg">Initializing CDN Client Library...</p>
        </div>
      </div>
    );
  }

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-24 h-24 bg-gradient-to-r from-orange-500 to-orange-800 rounded-full mx-auto mb-6 flex items-center justify-center">
            <Shield className="w-12 h-12 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-4">Authentication Required</h2>
          <p className="text-neutral-400 mb-8">Please log in to test the CDN Client Library</p>
          <motion.button 
            onClick={() => window.location.href = '/'}
            className="bg-gradient-to-r from-orange-500 to-orange-800 py-3 px-6 rounded-xl font-semibold transition-all duration-300 transform hover:scale-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
            whileHover={{ scale: 1.07 }}
            whileTap={{ scale: 0.97 }}
          >
            Go to Home
          </motion.button>
        </div>
      </div>
    );
  }

  try {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="min-h-screen bg-neutral-950 text-white pt-20">
        {/* Background Pattern */}
        <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 via-transparent to-orange-800/5 z-0"></div>
        
        <div className="relative z-10 max-w-7xl mx-auto px-6">
          {/* Welcome Section */}
          <motion.section initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="py-10 text-center">
            <motion.div className="bg-gradient-to-r from-orange-500/10 to-orange-800/10 rounded-2xl p-8 border border-orange-500/20 mb-8 shadow-xl shadow-orange-900/10">
              <div className="w-24 h-24 bg-gradient-to-r from-orange-500 to-orange-800 rounded-full mx-auto mb-6 flex items-center justify-center">
                <Package className="w-12 h-12 text-white" />
              </div>
              <h1 className="text-4xl font-bold mb-2">CDN Client Library Demo</h1>
              <p className="text-lg text-neutral-400 mb-6">Testing the actual Rust library integration with your dCDN backend</p>
              
              <div className="flex items-center justify-center space-x-6 text-sm text-neutral-400">
                <div className="flex items-center">
                  <User className="w-4 h-4 mr-2 text-orange-400" />
                  {(() => {
                    try {
                      if (principal && typeof principal === 'string' && principal.length > 16) {
                        return `${principal.slice(0, 8)}...${principal.slice(-8)}`;
                      } else if (principal && typeof principal === 'object' && principal.toString) {
                        const principalStr = principal.toString();
                        return principalStr.length > 16 ? `${principalStr.slice(0, 8)}...${principalStr.slice(-8)}` : principalStr;
                      } else {
                        return 'Not connected';
                      }
                    } catch (error) {
                      console.error('Error displaying principal:', error);
                      return 'Not connected';
                    }
                  })()}
                </div>
                <div className="flex items-center">
                  <Database className="w-4 h-4 mr-2 text-orange-400" />
                  {cdnClient ? 'CDN Client Library Connected' : 'CDN Client Library Disconnected'}
                </div>
              </div>
            </motion.div>
          </motion.section>

          {/* Test Controls */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Core Library Tests */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="bg-white/10 dark:bg-neutral-900/40 backdrop-blur-xl rounded-2xl p-8 border border-white/30 dark:border-neutral-700 shadow-xl"
            >
              <h3 className="text-2xl font-semibold mb-6 flex items-center gap-2">
                <Zap className="w-6 h-6 text-orange-500" />
                Core Library Functions
              </h3>
              
              <div className="space-y-3">
                <motion.button
                  onClick={testUploadAsset}
                  disabled={runningTests.has('upload')}
                  className="w-full flex items-center justify-center px-4 py-3 bg-gradient-to-r from-orange-500 to-orange-700 hover:from-orange-600 hover:to-orange-800 disabled:opacity-50 text-white rounded-lg transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {runningTests.has('upload') ? (
                    <Loader className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <Upload className="w-4 h-4 mr-2" />
                  )}
                  Test uploadAsset()
                </motion.button>

                <motion.button
                  onClick={testGetAsset}
                  disabled={runningTests.has('get') || !uploadedCid}
                  className="w-full flex items-center justify-center px-4 py-3 bg-gradient-to-r from-green-500 to-green-700 hover:from-green-600 hover:to-green-800 disabled:opacity-50 text-white rounded-lg transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {runningTests.has('get') ? (
                    <Loader className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <Download className="w-4 h-4 mr-2" />
                  )}
                  Test getAsset()
                </motion.button>

                <motion.button
                  onClick={testGetUserAccount}
                  disabled={runningTests.has('userAccount')}
                  className="w-full flex items-center justify-center px-4 py-3 bg-gradient-to-r from-purple-500 to-purple-700 hover:from-purple-600 hover:to-purple-800 disabled:opacity-50 text-white rounded-lg transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {runningTests.has('userAccount') ? (
                    <Loader className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <User className="w-4 h-4 mr-2" />
                  )}
                  Test getUserAccount()
                </motion.button>

                <motion.button
                  onClick={testCyclesBalance}
                  disabled={runningTests.has('cyclesBalance')}
                  className="w-full flex items-center justify-center px-4 py-3 bg-gradient-to-r from-yellow-500 to-yellow-700 hover:from-yellow-600 hover:to-yellow-800 disabled:opacity-50 text-white rounded-lg transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-yellow-500"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {runningTests.has('cyclesBalance') ? (
                    <Loader className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <DollarSign className="w-4 h-4 mr-2" />
                  )}
                  Test getCyclesBalance()
                </motion.button>
              </div>
            </motion.div>

            {/* Advanced Library Tests */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="bg-white/10 dark:bg-neutral-900/40 backdrop-blur-xl rounded-2xl p-8 border border-white/30 dark:border-neutral-700 shadow-xl"
            >
              <h3 className="text-2xl font-semibold mb-6 flex items-center gap-2">
                <Crown className="w-6 h-6 text-orange-500" />
                Advanced Library Functions
              </h3>

              <div className="space-y-3">
                <motion.button
                  onClick={testCostEstimation}
                  disabled={runningTests.has('costEstimation')}
                  className="w-full flex items-center justify-center px-4 py-3 bg-gradient-to-r from-indigo-500 to-indigo-700 hover:from-indigo-600 hover:to-indigo-800 disabled:opacity-50 text-white rounded-lg transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {runningTests.has('costEstimation') ? (
                    <Loader className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <Calculator className="w-4 h-4 mr-2" />
                  )}
                  Test Cost Estimation
                </motion.button>

                <motion.button
                  onClick={testIpfsFallback}
                  disabled={runningTests.has('ipfsFallback') || !uploadedCid}
                  className="w-full flex items-center justify-center px-4 py-3 bg-gradient-to-r from-orange-500 to-orange-700 hover:from-orange-600 hover:to-orange-800 disabled:opacity-50 text-white rounded-lg transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {runningTests.has('ipfsFallback') ? (
                    <Loader className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <Globe className="w-4 h-4 mr-2" />
                  )}
                  Test getAssetWithFallback()
                </motion.button>

                                 <motion.button
                   onClick={testCacheCheck}
                   disabled={runningTests.has('cacheCheck') || !uploadedCid}
                   className="w-full flex items-center justify-center px-4 py-3 bg-gradient-to-r from-teal-500 to-teal-700 hover:from-teal-600 hover:to-teal-800 disabled:opacity-50 text-white rounded-lg transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
                   whileHover={{ scale: 1.02 }}
                   whileTap={{ scale: 0.98 }}
                 >
                   {runningTests.has('cacheCheck') ? (
                     <Loader className="w-4 h-4 animate-spin mr-2" />
                   ) : (
                     <Database className="w-4 h-4 mr-2" />
                   )}
                   Test isCached()
                 </motion.button>

                 <motion.button
                   onClick={testCacheStatistics}
                   disabled={runningTests.has('cacheStatistics')}
                   className="w-full flex items-center justify-center px-4 py-3 bg-gradient-to-r from-blue-500 to-blue-700 hover:from-blue-600 hover:to-blue-800 disabled:opacity-50 text-white rounded-lg transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                   whileHover={{ scale: 1.02 }}
                   whileTap={{ scale: 0.98 }}
                 >
                   {runningTests.has('cacheStatistics') ? (
                     <Loader className="w-4 h-4 animate-spin mr-2" />
                   ) : (
                     <BarChart3 className="w-4 h-4 mr-2" />
                   )}
                   Test Cache Statistics
                 </motion.button>

                 <motion.button
                   onClick={testUserTierInfo}
                   disabled={runningTests.has('userTierInfo')}
                   className="w-full flex items-center justify-center px-4 py-3 bg-gradient-to-r from-purple-500 to-purple-700 hover:from-purple-600 hover:to-purple-800 disabled:opacity-50 text-white rounded-lg transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500"
                   whileHover={{ scale: 1.02 }}
                   whileTap={{ scale: 0.98 }}
                 >
                   {runningTests.has('userTierInfo') ? (
                     <Loader className="w-4 h-4 animate-spin mr-2" />
                   ) : (
                     <Crown className="w-4 h-4 mr-2" />
                   )}
                   Test User Tier Info
                 </motion.button>

                 <motion.button
                   onClick={testAvailableTiers}
                   disabled={runningTests.has('availableTiers')}
                   className="w-full flex items-center justify-center px-4 py-3 bg-gradient-to-r from-emerald-500 to-emerald-700 hover:from-emerald-600 hover:to-emerald-800 disabled:opacity-50 text-white rounded-lg transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                   whileHover={{ scale: 1.02 }}
                   whileTap={{ scale: 0.98 }}
                 >
                   {runningTests.has('availableTiers') ? (
                     <Loader className="w-4 h-4 animate-spin mr-2" />
                   ) : (
                     <List className="w-4 h-4 mr-2" />
                   )}
                   Test Available Tiers
                 </motion.button>

                {/* File Upload */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-neutral-300">
                    Test with real file:
                  </label>
                  <input
                    type="file"
                    onChange={handleFileSelect}
                    className="w-full px-3 py-2 bg-neutral-800/50 border border-neutral-600 rounded-lg text-white file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-orange-500 file:text-white hover:file:bg-orange-600 transition-all duration-200"
                  />
                </div>

                <motion.button
                  onClick={testRealFileUpload}
                  disabled={runningTests.has('realFileUpload') || !selectedFile}
                  className="w-full flex items-center justify-center px-4 py-3 bg-gradient-to-r from-pink-500 to-pink-700 hover:from-pink-600 hover:to-pink-800 disabled:opacity-50 text-white rounded-lg transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-500"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {runningTests.has('realFileUpload') ? (
                    <Loader className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <Upload className="w-4 h-4 mr-2" />
                  )}
                  Test Real File Upload
                </motion.button>
              </div>
            </motion.div>
          </div>

          {/* Test Results */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.6 }}
            className="space-y-4 mb-8"
          >
            {Object.entries(testResults).map(([testName, result]) => (
              <div
                key={testName}
                className={`border rounded-xl p-6 ${getTestStatusColor(result.status)} backdrop-blur-xl`}
              >
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold text-white capitalize text-lg">
                    {testName.replace(/([A-Z])/g, ' $1').trim()}
                  </h4>
                  {getTestStatusIcon(result.status)}
                </div>
                <p className="text-neutral-300 mb-3">{result.message}</p>
                {result.data && (
                  <div className="mt-3 p-3 bg-neutral-800/50 rounded-lg border border-neutral-700">
                    <pre className="text-xs overflow-x-auto text-neutral-300">
                      {JSON.stringify(result.data, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            ))}
          </motion.div>

          {/* Library Information */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.8 }}
            className="bg-white/10 dark:bg-neutral-900/40 backdrop-blur-xl rounded-2xl p-8 border border-white/30 dark:border-neutral-700 shadow-xl"
          >
            <h3 className="text-2xl font-semibold mb-6 flex items-center gap-2">
              <Info className="w-6 h-6 text-orange-500" />
              CDN Client Library Information
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
              <div className="p-4 bg-gradient-to-r from-orange-500/10 to-orange-800/10 rounded-lg border border-orange-500/20">
                <h4 className="font-semibold text-white mb-3 flex items-center gap-2">
                  <Package className="w-4 h-4 text-orange-400" />
                  Library Details
                </h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-neutral-400">Version:</span>
                    <code className="bg-neutral-800 px-2 py-1 rounded text-orange-400 text-xs">
                      0.1.0
                    </code>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-400">Canister ID:</span>
                    <code className="bg-neutral-800 px-2 py-1 rounded text-blue-400 text-xs">
                      {canisterId}
                    </code>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-gradient-to-r from-green-500/10 to-green-800/10 rounded-lg border border-green-500/20">
                <h4 className="font-semibold text-white mb-3 flex items-center gap-2">
                  <Zap className="w-4 h-4 text-green-400" />
                  Available Functions
                </h4>
                <ul className="space-y-1 text-neutral-300">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-3 h-3 text-green-400" />
                    uploadAsset()
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-3 h-3 text-green-400" />
                    getAsset()
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-3 h-3 text-green-400" />
                    getAssetWithFallback()
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-3 h-3 text-green-400" />
                    getUserAccount()
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-3 h-3 text-green-400" />
                    getCyclesBalance()
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-3 h-3 text-green-400" />
                    estimateUploadCost()
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-3 h-3 text-green-400" />
                    estimateStorageCost()
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-3 h-3 text-green-400" />
                    isCached()
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-3 h-3 text-green-400" />
                    getAssetUrl()
                  </li>
                </ul>
              </div>
            </div>
          </motion.div>
        </div>
      </motion.div>
    );
  } catch (error) {
    console.error('Component rendering error:', error);
    setComponentError(error.message);
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-24 h-24 bg-gradient-to-r from-red-500 to-red-800 rounded-full mx-auto mb-6 flex items-center justify-center">
            <AlertCircle className="w-12 h-12 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-4">Rendering Error</h2>
          <p className="text-neutral-400 mb-4">{error.message}</p>
          <motion.button
            onClick={() => setComponentError(null)}
            className="bg-gradient-to-r from-orange-500 to-orange-800 py-3 px-6 rounded-xl font-semibold transition-all duration-300 transform hover:scale-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
            whileHover={{ scale: 1.07 }}
            whileTap={{ scale: 0.97 }}
          >
            Try Again
          </motion.button>
        </div>
      </div>
    );
  }
}
