import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Upload, Download, Users, Database, Globe, Zap, CheckCircle, AlertCircle, Loader, Info,
  ArrowRight, ArrowLeft, RefreshCw, FileText, Package, Calculator, DollarSign
} from 'lucide-react';
import { useAuth } from '../AuthContext';
import { createActor, canisterId } from '../canister_id_patch';
import { HttpAgent } from '@dfinity/agent';
import { initAuth, getIdentity } from '../auth';

export default function CanisterToCanisterDemo() {
  const { principal, isLoggedIn } = useAuth();
  const [testResults, setTestResults] = useState({});
  const [runningTests, setRunningTests] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileContent, setFileContent] = useState(null);
  const [uploadedCids, setUploadedCids] = useState([]);

  // Initialize backend connection
  useEffect(() => {
    const initBackend = async () => {
      try {
        if (isLoggedIn && principal && canisterId) {
          await initAuth();
          const identity = await getIdentity();
          const agent = new HttpAgent({
            host: import.meta.env.VITE_DFX_REPLICA_HOST || "http://127.0.0.1:4943",
            identity
          });
          setLoading(false);
        } else {
          setLoading(false);
        }
      } catch (error) {
        console.error('Failed to initialize backend:', error);
        setError(error.message);
        setLoading(false);
      }
    };
    initBackend();
  }, [isLoggedIn, principal, canisterId]);

  // Test 1: Canister Upload
  const testCanisterUpload = async () => {
    setRunningTests(prev => new Set(prev).add('canisterUpload'));
    setTestResults(prev => ({ ...prev, canisterUpload: { status: 'running', message: 'Testing canister upload functionality...' } }));

    try {
      const actor = createActor(canisterId);
      const testContent = "Hello from canister-to-canister test!";
      const contentBytes = new TextEncoder().encode(testContent);
      const cyclesPayment = 1_000_000_000; // 1B cycles

      const result = await actor.canister_upload(principal, Array.from(contentBytes), "text/plain", cyclesPayment);
      
      if (result.Ok) {
        // Extract the actual CID from the response message
        const responseMessage = result.Ok;
        let cid;
        
        // Try to extract CID from the response message
        if (responseMessage.includes('CID: ')) {
          const cidMatch = responseMessage.match(/CID: ([A-Za-z0-9]+)/);
          if (cidMatch && cidMatch[1]) {
            cid = cidMatch[1];
          } else {
            // If we can't extract CID, use the full message as fallback
            cid = responseMessage;
          }
        } else {
          // If no CID pattern found, assume the response is the CID
          cid = responseMessage;
        }
        
        setUploadedCids(prev => [...prev, cid]);
        setTestResults(prev => ({ 
          ...prev, 
          canisterUpload: { 
            status: 'success', 
            message: `Canister upload successful! ${responseMessage}`,
            data: { cid, responseMessage, contentSize: contentBytes.length, cyclesUsed: cyclesPayment }
          } 
        }));
      } else {
        throw new Error(result.Err);
      }
    } catch (error) {
      console.error('Canister upload test failed:', error);
      setTestResults(prev => ({ 
        ...prev, 
        canisterUpload: { 
          status: 'error', 
          message: `Canister upload failed: ${error.message}` 
        } 
      }));
    } finally {
      setRunningTests(prev => {
        const newSet = new Set(prev);
        newSet.delete('canisterUpload');
        return newSet;
      });
    }
  };

  // Test 2: Canister Get Content
  const testCanisterGetContent = async () => {
    if (uploadedCids.length === 0) {
      setTestResults(prev => ({ 
        ...prev, 
        canisterGetContent: { 
          status: 'error', 
          message: 'No uploaded CIDs available. Please run upload test first.' 
        } 
      }));
      return;
    }

    setRunningTests(prev => new Set(prev).add('canisterGetContent'));
    setTestResults(prev => ({ ...prev, canisterGetContent: { status: 'running', message: 'Testing canister get content...' } }));

    try {
      const actor = createActor(canisterId);
      const cid = uploadedCids[uploadedCids.length - 1]; // Use the last uploaded CID
      
      console.log('Attempting to retrieve content for CID:', cid);
      const result = await actor.canister_get_content(principal, cid);
      
      if (result.Ok) {
        const content = new TextDecoder().decode(new Uint8Array(result.Ok));
        setTestResults(prev => ({ 
          ...prev, 
          canisterGetContent: { 
            status: 'success', 
            message: `Canister get content successful! Content: "${content}"`,
            data: { content, cid, size: result.Ok.length }
          } 
        }));
      } else {
        throw new Error(result.Err);
      }
    } catch (error) {
      console.error('Canister get content test failed:', error);
      
      // Provide more specific error information
      let errorMessage = error.message;
      if (error.message.includes('Content not found')) {
        errorMessage = `Content not found in cache. This might be because:
        1. The content was uploaded to cache but not persisted to IPFS
        2. The cache was cleared or the content expired
        3. There's a mismatch between the uploaded CID and the retrieval CID
        
        Last uploaded CID: ${uploadedCids[uploadedCids.length - 1]}
        Total uploaded CIDs: ${uploadedCids.length}`;
      }
      
      setTestResults(prev => ({ 
        ...prev, 
        canisterGetContent: { 
          status: 'error', 
          message: `Canister get content failed: ${errorMessage}` 
        } 
      }));
    } finally {
      setRunningTests(prev => {
        const newSet = new Set(prev);
        newSet.delete('canisterGetContent');
        return newSet;
      });
    }
  };

  // Test 2.5: Canister Get Content with Fallback
  const testCanisterGetContentWithFallback = async () => {
    if (uploadedCids.length === 0) {
      setTestResults(prev => ({ 
        ...prev, 
        canisterGetContentWithFallback: { 
          status: 'error', 
          message: 'No uploaded CIDs available. Please run upload test first.' 
        } 
      }));
      return;
    }

    setRunningTests(prev => new Set(prev).add('canisterGetContentWithFallback'));
    setTestResults(prev => ({ ...prev, canisterGetContentWithFallback: { status: 'running', message: 'Testing canister get content with fallback...' } }));

    try {
      const actor = createActor(canisterId);
      const cid = uploadedCids[uploadedCids.length - 1]; // Use the last uploaded CID
      
      console.log('Attempting to retrieve content with fallback for CID:', cid);
      const result = await actor.canister_get_content_with_fallback(principal, cid);
      
      if (result.Ok) {
        const content = new TextDecoder().decode(new Uint8Array(result.Ok));
        setTestResults(prev => ({ 
          ...prev, 
          canisterGetContentWithFallback: { 
            status: 'success', 
            message: `Canister get content with fallback successful! Content: "${content}"`,
            data: { content, cid, size: result.Ok.length }
          } 
        }));
      } else {
        throw new Error(result.Err);
      }
    } catch (error) {
      console.error('Canister get content with fallback test failed:', error);
      setTestResults(prev => ({ 
        ...prev, 
        canisterGetContentWithFallback: { 
          status: 'error', 
          message: `Canister get content with fallback failed: ${error.message}` 
        } 
      }));
    } finally {
      setRunningTests(prev => {
        const newSet = new Set(prev);
        newSet.delete('canisterGetContentWithFallback');
        return newSet;
      });
    }
  };

  // Test 3: Canister Bulk Upload
  const testCanisterBulkUpload = async () => {
    setRunningTests(prev => new Set(prev).add('canisterBulkUpload'));
    setTestResults(prev => ({ ...prev, canisterBulkUpload: { status: 'running', message: 'Testing canister bulk upload...' } }));

    try {
      const actor = createActor(canisterId);
      const files = [
        { content: "File 1 content", type: "text/plain" },
        { content: "File 2 content", type: "text/plain" },
        { content: "File 3 content", type: "text/plain" }
      ];

      // Fix: Use array format instead of object format to match Candid interface
      const filesData = files.map(file => [
        Array.from(new TextEncoder().encode(file.content)),
        file.type
      ]);

      const cyclesPayment = 3_000_000_000; // 3B cycles for 3 files
      const result = await actor.canister_bulk_upload(principal, filesData, cyclesPayment);
      
      if (result.Ok) {
        const cids = result.Ok;
        setUploadedCids(prev => [...prev, ...cids]);
        setTestResults(prev => ({ 
          ...prev, 
          canisterBulkUpload: { 
            status: 'success', 
            message: `Bulk upload successful! Uploaded ${cids.length} files`,
            data: { cids, filesCount: cids.length, cyclesUsed: cyclesPayment }
          } 
        }));
      } else {
        throw new Error(result.Err);
      }
    } catch (error) {
      console.error('Canister bulk upload test failed:', error);
      setTestResults(prev => ({ 
        ...prev, 
        canisterBulkUpload: { 
          status: 'error', 
          message: `Canister bulk upload failed: ${error.message}` 
        } 
      }));
    } finally {
      setRunningTests(prev => {
        const newSet = new Set(prev);
        newSet.delete('canisterBulkUpload');
        return newSet;
      });
    }
  };

  // Test 4: Canister Get Account Info
  const testCanisterGetAccountInfo = async () => {
    setRunningTests(prev => new Set(prev).add('canisterGetAccountInfo'));
    setTestResults(prev => ({ ...prev, canisterGetAccountInfo: { status: 'running', message: 'Testing canister get account info...' } }));

    try {
      const actor = createActor(canisterId);
      const result = await actor.canister_get_account_info(principal);
      
      // Fix: Convert BigInt values to strings to avoid JSON serialization error
      const accountData = {
        user_principal: result.user_principal.toString(),
        cycles_balance: result.cycles_balance.toString(),
        tier: result.tier,
        cache_usage_bytes: result.cache_usage_bytes.toString(),
        pinata_enabled: result.pinata_enabled
      };
      
      setTestResults(prev => ({ 
        ...prev, 
        canisterGetAccountInfo: { 
          status: 'success', 
          message: `Account info retrieved! Tier: ${result.tier}, Balance: ${result.cycles_balance} cycles`,
          data: accountData
        } 
      }));
    } catch (error) {
      console.error('Canister get account info test failed:', error);
      setTestResults(prev => ({ 
        ...prev, 
        canisterGetAccountInfo: { 
          status: 'error', 
          message: `Canister get account info failed: ${error.message}` 
        } 
      }));
    } finally {
      setRunningTests(prev => {
        const newSet = new Set(prev);
        newSet.delete('canisterGetAccountInfo');
        return newSet;
      });
    }
  };

  // Test 5: Canister Cost Estimation
  const testCanisterCostEstimation = async () => {
    setRunningTests(prev => new Set(prev).add('canisterCostEstimation'));
    setTestResults(prev => ({ ...prev, canisterCostEstimation: { status: 'running', message: 'Testing canister cost estimation...' } }));

    try {
      const actor = createActor(canisterId);
      const fileSizes = JSON.parse(import.meta.env.VITE_DEMO_FILE_SIZES_KB || '[1, 10, 100]').map(size => size * 1024); // 1KB, 10KB, 100KB
      const estimates = {};

      for (const size of fileSizes) {
        const uploadCost = await actor.canister_estimate_upload_cost(size);
        const storageCost = await actor.canister_estimate_storage_cost(size, 24); // 24 hours
        estimates[`${size}bytes`] = { 
          upload: uploadCost.toString(), 
          storage: storageCost.toString() 
        };
      }

      setTestResults(prev => ({ 
        ...prev, 
        canisterCostEstimation: { 
          status: 'success', 
          message: 'Cost estimation completed successfully!',
          data: estimates
        } 
      }));
    } catch (error) {
      console.error('Canister cost estimation test failed:', error);
      setTestResults(prev => ({ 
        ...prev, 
        canisterCostEstimation: { 
          status: 'error', 
          message: `Canister cost estimation failed: ${error.message}` 
        } 
      }));
    } finally {
      setRunningTests(prev => {
        const newSet = new Set(prev);
        newSet.delete('canisterCostEstimation');
        return newSet;
      });
    }
  };

  // Test 6: Real File Upload
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
    if (!selectedFile || !fileContent) {
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
    setTestResults(prev => ({ ...prev, realFileUpload: { status: 'running', message: 'Uploading real file via canister...' } }));

    try {
      const actor = createActor(canisterId);
      const cyclesPayment = 5_000_000_000; // 5B cycles

      const result = await actor.canister_upload(principal, Array.from(fileContent), selectedFile.type, cyclesPayment);
      
      if (result.Ok) {
        // Extract the actual CID from the response message
        const responseMessage = result.Ok;
        let cid;
        
        // Try to extract CID from the response message
        if (responseMessage.includes('CID: ')) {
          const cidMatch = responseMessage.match(/CID: ([A-Za-z0-9]+)/);
          if (cidMatch && cidMatch[1]) {
            cid = cidMatch[1];
          } else {
            // If we can't extract CID, use the full message as fallback
            cid = responseMessage;
          }
        } else {
          // If no CID pattern found, assume the response is the CID
          cid = responseMessage;
        }
        
        setUploadedCids(prev => [...prev, cid]);
        setTestResults(prev => ({ 
          ...prev, 
          realFileUpload: { 
            status: 'success', 
            message: `Real file uploaded via canister! ${responseMessage}`,
            data: { 
              cid, 
              responseMessage,
              fileName: selectedFile.name, 
              size: fileContent.length,
              contentType: selectedFile.type,
              cyclesUsed: cyclesPayment
            }
          } 
        }));
      } else {
        throw new Error(result.Err);
      }
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

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-24 h-24 bg-gradient-to-r from-orange-500 to-orange-800 rounded-full mx-auto mb-6 flex items-center justify-center">
            <Loader className="w-12 h-12 text-white animate-spin" />
          </div>
          <p className="text-white text-lg">Initializing Canister-to-Canister Demo...</p>
        </div>
      </div>
    );
  }

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-24 h-24 bg-gradient-to-r from-orange-500 to-orange-800 rounded-full mx-auto mb-6 flex items-center justify-center">
            <Users className="w-12 h-12 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-4">Authentication Required</h2>
          <p className="text-neutral-400 mb-8">Please log in to test canister-to-canister functionality</p>
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

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="min-h-screen bg-neutral-950 text-white pt-20">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 via-transparent to-orange-800/5 z-0"></div>
      
      <div className="relative z-10 max-w-7xl mx-auto px-6">
        {/* Welcome Section */}
        <motion.section initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="py-10 text-center">
          <motion.div className="bg-gradient-to-r from-orange-500/10 to-orange-800/10 rounded-2xl p-8 border border-orange-500/20 mb-8 shadow-xl shadow-orange-900/10">
            <div className="w-24 h-24 bg-gradient-to-r from-orange-500 to-orange-800 rounded-full mx-auto mb-6 flex items-center justify-center">
              <Users className="w-12 h-12 text-white" />
            </div>
            <h1 className="text-4xl font-bold mb-2">Canister-to-Canister Demo</h1>
            <p className="text-lg text-neutral-400 mb-6">Testing direct canister communication with your dCDN backend</p>
            
            <div className="flex items-center justify-center space-x-6 text-sm text-neutral-400">
              <div className="flex items-center">
                <Users className="w-4 h-4 mr-2 text-orange-400" />
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
                Canister-to-Canister Ready
              </div>
            </div>
          </motion.div>
        </motion.section>

        {/* Test Controls */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Core Canister Tests */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="bg-white/10 dark:bg-neutral-900/40 backdrop-blur-xl rounded-2xl p-8 border border-white/30 dark:border-neutral-700 shadow-xl"
          >
            <h3 className="text-2xl font-semibold mb-6 flex items-center gap-2">
              <Zap className="w-6 h-6 text-orange-500" />
              Core Canister Functions
            </h3>
            
            <div className="space-y-3">
              <motion.button
                onClick={testCanisterUpload}
                disabled={runningTests.has('canisterUpload')}
                className="w-full flex items-center justify-center px-4 py-3 bg-gradient-to-r from-orange-500 to-orange-700 hover:from-orange-600 hover:to-orange-800 disabled:opacity-50 text-white rounded-lg transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {runningTests.has('canisterUpload') ? (
                  <Loader className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Upload className="w-4 h-4 mr-2" />
                )}
                Test canister_upload()
              </motion.button>

              <motion.button
                onClick={testCanisterGetContent}
                disabled={runningTests.has('canisterGetContent') || uploadedCids.length === 0}
                className="w-full flex items-center justify-center px-4 py-3 bg-gradient-to-r from-green-500 to-green-700 hover:from-green-600 hover:to-green-800 disabled:opacity-50 text-white rounded-lg transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {runningTests.has('canisterGetContent') ? (
                  <Loader className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Download className="w-4 h-4 mr-2" />
                )}
                Test canister_get_content()
              </motion.button>

              <motion.button
                onClick={testCanisterGetContentWithFallback}
                disabled={runningTests.has('canisterGetContentWithFallback') || uploadedCids.length === 0}
                className="w-full flex items-center justify-center px-4 py-3 bg-gradient-to-r from-teal-500 to-teal-700 hover:from-teal-600 hover:to-teal-800 disabled:opacity-50 text-white rounded-lg transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {runningTests.has('canisterGetContentWithFallback') ? (
                  <Loader className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <ArrowRight className="w-4 h-4 mr-2" />
                )}
                Test canister_get_content_with_fallback()
              </motion.button>

              <motion.button
                onClick={testCanisterBulkUpload}
                disabled={runningTests.has('canisterBulkUpload')}
                className="w-full flex items-center justify-center px-4 py-3 bg-gradient-to-r from-purple-500 to-purple-700 hover:from-purple-600 hover:to-purple-800 disabled:opacity-50 text-white rounded-lg transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {runningTests.has('canisterBulkUpload') ? (
                  <Loader className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Package className="w-4 h-4 mr-2" />
                )}
                Test canister_bulk_upload()
              </motion.button>

              <motion.button
                onClick={testCanisterGetAccountInfo}
                disabled={runningTests.has('canisterGetAccountInfo')}
                className="w-full flex items-center justify-center px-4 py-3 bg-gradient-to-r from-blue-500 to-blue-700 hover:from-blue-600 hover:to-blue-800 disabled:opacity-50 text-white rounded-lg transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {runningTests.has('canisterGetAccountInfo') ? (
                  <Loader className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Users className="w-4 h-4 mr-2" />
                )}
                Test canister_get_account_info()
              </motion.button>
            </div>
          </motion.div>

          {/* Advanced Canister Tests */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="bg-white/10 dark:bg-neutral-900/40 backdrop-blur-xl rounded-2xl p-8 border border-white/30 dark:border-neutral-700 shadow-xl"
          >
            <h3 className="text-2xl font-semibold mb-6 flex items-center gap-2">
              <Globe className="w-6 h-6 text-orange-500" />
              Advanced Canister Functions
            </h3>

            <div className="space-y-3">
              <motion.button
                onClick={testCanisterCostEstimation}
                disabled={runningTests.has('canisterCostEstimation')}
                className="w-full flex items-center justify-center px-4 py-3 bg-gradient-to-r from-indigo-500 to-indigo-700 hover:from-indigo-600 hover:to-indigo-800 disabled:opacity-50 text-white rounded-lg transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {runningTests.has('canisterCostEstimation') ? (
                  <Loader className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Calculator className="w-4 h-4 mr-2" />
                )}
                Test Cost Estimation
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

        {/* Uploaded CIDs Display */}
        {uploadedCids.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.8 }}
            className="bg-white/10 dark:bg-neutral-900/40 backdrop-blur-xl rounded-2xl p-8 border border-white/30 dark:border-neutral-700 shadow-xl mb-8"
          >
            <h3 className="text-2xl font-semibold mb-6 flex items-center gap-2">
              <FileText className="w-6 h-6 text-orange-500" />
              Uploaded CIDs ({uploadedCids.length})
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {uploadedCids.map((cid, index) => (
                <div key={index} className="p-4 bg-neutral-800/50 rounded-lg border border-neutral-700">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-neutral-400">CID #{index + 1}</span>
                    <CopyButton text={cid} />
                  </div>
                  <code className="text-xs text-orange-400 break-all">{cid}</code>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Information Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 1.0 }}
          className="bg-white/10 dark:bg-neutral-900/40 backdrop-blur-xl rounded-2xl p-8 border border-white/30 dark:border-neutral-700 shadow-xl"
        >
          <h3 className="text-2xl font-semibold mb-6 flex items-center gap-2">
            <Info className="w-6 h-6 text-orange-500" />
            Canister-to-Canister Information
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
            <div className="p-4 bg-gradient-to-r from-orange-500/10 to-orange-800/10 rounded-lg border border-orange-500/20">
              <h4 className="font-semibold text-white mb-3 flex items-center gap-2">
                <Package className="w-4 h-4 text-orange-400" />
                Available Functions
              </h4>
              <ul className="space-y-1 text-neutral-300">
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-3 h-3 text-green-400" />
                  canister_upload()
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-3 h-3 text-green-400" />
                  canister_get_content()
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-3 h-3 text-green-400" />
                  canister_get_content_with_fallback()
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-3 h-3 text-green-400" />
                  canister_bulk_upload()
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-3 h-3 text-green-400" />
                  canister_get_account_info()
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-3 h-3 text-green-400" />
                  canister_estimate_upload_cost()
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-3 h-3 text-green-400" />
                  canister_estimate_storage_cost()
                </li>
              </ul>
            </div>

            <div className="p-4 bg-gradient-to-r from-green-500/10 to-green-800/10 rounded-lg border border-green-500/20">
              <h4 className="font-semibold text-white mb-3 flex items-center gap-2">
                <Zap className="w-4 h-4 text-green-400" />
                Key Features
              </h4>
              <ul className="space-y-1 text-neutral-300">
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-3 h-3 text-green-400" />
                  Direct canister communication
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-3 h-3 text-green-400" />
                  Automatic cycles payment
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-3 h-3 text-green-400" />
                  Bulk file operations
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-3 h-3 text-green-400" />
                  Account management
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-3 h-3 text-green-400" />
                  Cost estimation
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-3 h-3 text-green-400" />
                  Type-safe operations
                </li>
              </ul>
            </div>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}

// Copy Button Component
function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  return (
    <button
      onClick={copyToClipboard}
      className="p-1 rounded hover:bg-neutral-700 transition-colors duration-200"
      title="Copy to clipboard"
    >
      {copied ? (
        <CheckCircle className="w-3 h-3 text-green-400" />
      ) : (
        <FileText className="w-3 h-3 text-neutral-400" />
      )}
    </button>
  );
}
