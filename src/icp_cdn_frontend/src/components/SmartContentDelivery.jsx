import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Globe, Download, Eye, RefreshCw, AlertCircle, CheckCircle } from 'lucide-react';
import { useAuth } from '../AuthContext';
import { createActor, canisterId } from '../canister_id_patch';
import { HttpAgent } from '@dfinity/agent';
import { initAuth, getIdentity } from '../auth';

export default function SmartContentDelivery({ cid, showPreview = true }) {
  const { principal, isLoggedIn } = useAuth();
  const [backend, setBackend] = useState(null);
  const [content, setContent] = useState(null);
  const [cacheStatus, setCacheStatus] = useState('loading');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [contentType, setContentType] = useState('');
  const [contentSize, setContentSize] = useState(0);
  const [responseTime, setResponseTime] = useState(0);

  // Initialize backend connection
  useEffect(() => {
    const initBackend = async () => {
      if (isLoggedIn && principal) {
        try {
          console.log('Initializing backend for smart content delivery...');
          await initAuth();
          const identity = await getIdentity();
          const agent = new HttpAgent({
            host: import.meta.env.VITE_DFX_REPLICA_HOST || "http://127.0.0.1:4943",
            identity
          });
          const backendInstance = createActor(canisterId, { agent });
          
          // Test the backend connection
          console.log('Testing backend connection for smart content delivery...');
          const testResult = await backendInstance.greet("test");
          console.log('Backend test result:', testResult);
          
          setBackend(backendInstance);
          console.log('Backend initialized successfully for smart content delivery');
        } catch (error) {
          console.error('Failed to initialize backend for smart content delivery:', error);
          setError(`Failed to initialize backend: ${error.message}`);
        }
      }
    };
    initBackend();
  }, [isLoggedIn, principal]);

  // Fetch content with smart caching
  const fetchContent = async () => {
    if (!backend || !cid) return;

    setLoading(true);
    setError(null);
    setCacheStatus('loading');

    const startTime = performance.now();

    try {
      console.log('Fetching content with smart caching for CID:', cid);
      
      // Try to get from dCDN cache first
      const result = await backend.get_content(cid);
      
      const endTime = performance.now();
      const responseTimeMs = endTime - startTime;
      setResponseTime(responseTimeMs);

      if (result.Ok) {
        setContent(result.Ok);
        setContentSize(result.Ok.length);
        setCacheStatus('cache_hit');
        console.log('✅ Cache hit - content served from dCDN cache');
      } else {
        throw new Error(result.Err || 'Content not found');
      }
    } catch (error) {
      console.log('❌ Cache miss - falling back to IPFS fetch');
      setCacheStatus('cache_miss');
      
      // Fetch from IPFS using the backend's fetch_from_ipfs function
      try {
        // Use the backend's real IPFS fetch function
        const result = await backend.fetch_from_ipfs(cid);
        
        const endTime = performance.now();
        const responseTimeMs = endTime - startTime;
        setResponseTime(responseTimeMs);

        if (result.Ok) {
          setContent(result.Ok);
          setContentSize(result.Ok.length);
          setCacheStatus('ipfs_fetch');
          console.log('✅ IPFS fetch successful');
        } else {
          throw new Error(result.Err || 'Content not found in IPFS');
        }
      } catch (ipfsError) {
        setError(`Failed to fetch content: ${ipfsError.message}`);
        setCacheStatus('error');
      }
    } finally {
      setLoading(false);
    }
  };

  // Auto-fetch content when component mounts or CID changes
  useEffect(() => {
    if (backend && cid) {
      fetchContent();
    }
  }, [backend, cid]);

  // Determine content type from content
  useEffect(() => {
    if (content && content.length > 0) {
      // Simple content type detection based on first few bytes
      const firstBytes = content.slice(0, 4);
      const hexString = Array.from(firstBytes).map(b => b.toString(16).padStart(2, '0')).join('');
      
      if (hexString.startsWith('ffd8')) {
        setContentType('image/jpeg');
      } else if (hexString.startsWith('89504e47')) {
        setContentType('image/png');
      } else if (hexString.startsWith('47494638')) {
        setContentType('image/gif');
      } else if (hexString.startsWith('3c21444f')) {
        setContentType('text/html');
      } else if (hexString.startsWith('7b22')) {
        setContentType('application/json');
      } else {
        setContentType('application/octet-stream');
      }
    }
  }, [content]);

  // Download content
  const downloadContent = () => {
    if (!content) return;
    
    const blob = new Blob([content], { type: contentType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${cid}.${contentType.split('/')[1] || 'bin'}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Format bytes to human readable
  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Get status icon and color
  const getStatusInfo = () => {
    switch (cacheStatus) {
      case 'cache_hit':
        return { icon: <Zap className="w-4 h-4" />, color: 'text-green-400', bg: 'bg-green-900/20', border: 'border-green-500/20' };
      case 'cache_miss':
        return { icon: <Globe className="w-4 h-4" />, color: 'text-orange-400', bg: 'bg-orange-900/20', border: 'border-orange-500/20' };
      case 'ipfs_fetch':
        return { icon: <Globe className="w-4 h-4" />, color: 'text-blue-400', bg: 'bg-blue-900/20', border: 'border-blue-500/20' };
      case 'error':
        return { icon: <AlertCircle className="w-4 h-4" />, color: 'text-red-400', bg: 'bg-red-900/20', border: 'border-red-500/20' };
      default:
        return { icon: <RefreshCw className="w-4 h-4 animate-spin" />, color: 'text-neutral-400', bg: 'bg-neutral-900/20', border: 'border-neutral-500/20' };
    }
  };

  // Get status text
  const getStatusText = () => {
    switch (cacheStatus) {
      case 'cache_hit':
        return '⚡ Cache Hit - Served from dCDN';
      case 'cache_miss':
        return '🌐 Cache Miss - Fetching from IPFS';
      case 'ipfs_fetch':
        return '🌐 IPFS Fetch - Served from IPFS';
      case 'error':
        return '❌ Error - Failed to fetch content';
      default:
        return '⏳ Loading...';
    }
  };

  if (!isLoggedIn) {
    return (
      <motion.div 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }} 
        className="bg-white/10 dark:bg-neutral-900/40 backdrop-blur-xl rounded-2xl p-6 border border-white/30 dark:border-neutral-700 shadow-xl"
      >
        <div className="text-center text-neutral-400">
          <Eye className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>Please log in to access content delivery</p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }} 
      animate={{ opacity: 1, y: 0 }}
      className="bg-white/10 dark:bg-neutral-900/40 backdrop-blur-xl rounded-2xl p-6 border border-white/30 dark:border-neutral-700 shadow-xl"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Zap className="w-5 h-5 text-orange-500" />
          Smart Content Delivery
        </h3>
        {cid && (
          <span className="text-sm text-neutral-400 font-mono">
            CID: {cid.substring(0, 12)}...
          </span>
        )}
      </div>

      {/* Status Display */}
      <AnimatePresence>
        {cacheStatus && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className={`p-3 rounded-lg mb-4 flex items-center gap-2 ${getStatusInfo().bg} ${getStatusInfo().border}`}
          >
            {getStatusInfo().icon}
            <span className={`font-medium ${getStatusInfo().color}`}>
              {getStatusText()}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error Display */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="mb-4 p-3 bg-red-900/20 border border-red-500/20 text-red-400 rounded-lg flex items-center gap-2"
          >
            <AlertCircle className="w-4 h-4" />
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Content Preview */}
      {showPreview && content && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4"
        >
          <h4 className="text-sm font-medium text-neutral-300 mb-2">Content Preview</h4>
          <div className="bg-neutral-800/50 rounded-lg p-4 border border-neutral-700">
            {contentType.startsWith('image/') ? (
              <div className="text-center">
                <img 
                  src={`data:${contentType};base64,${btoa(String.fromCharCode(...content))}`}
                  alt="Content preview"
                  className="max-w-full h-auto max-h-64 rounded-lg border border-neutral-700"
                />
              </div>
            ) : contentType.startsWith('text/') || contentType === 'application/json' ? (
              <pre className="text-xs text-neutral-300 overflow-auto max-h-32">
                {new TextDecoder().decode(content)}
              </pre>
            ) : (
              <div className="text-center text-neutral-400">
                <Download className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Binary content - Use download button</p>
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* Content Information */}
      {content && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4"
        >
          <h4 className="text-sm font-medium text-neutral-300 mb-2">Content Information</h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-neutral-400">Size:</span>
              <span className="ml-2 text-white">{formatBytes(contentSize)}</span>
            </div>
            <div>
              <span className="text-neutral-400">Type:</span>
              <span className="ml-2 text-white">{contentType}</span>
            </div>
            <div>
              <span className="text-neutral-400">Response Time:</span>
              <span className="ml-2 text-white">{Math.round(responseTime)}ms</span>
            </div>
            <div>
              <span className="text-neutral-400">Status:</span>
              <span className={`ml-2 ${getStatusInfo().color}`}>
                {cacheStatus === 'cache_hit' ? 'Fast' : cacheStatus === 'ipfs_fetch' ? 'Normal' : 'Slow'}
              </span>
            </div>
          </div>
        </motion.div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3">
        <motion.button
          onClick={fetchContent}
          disabled={loading}
          className="flex-1 bg-gradient-to-r from-orange-500 to-orange-700 hover:from-orange-600 hover:to-orange-800 px-4 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 flex items-center justify-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          {loading ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              Loading...
            </>
          ) : (
            <>
              <RefreshCw className="w-4 h-4" />
              Refresh
            </>
          )}
        </motion.button>

        {content && (
          <motion.button
            onClick={downloadContent}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg transition-all duration-300 flex items-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Download className="w-4 h-4" />
            Download
          </motion.button>
        )}
      </div>

      {/* Performance Info */}
      <div className="mt-4 p-3 bg-neutral-800/30 rounded-lg">
        <p className="text-xs text-neutral-400">
          <strong>Smart Delivery:</strong> Content is automatically served from the fastest available source (dCDN cache or IPFS).
        </p>
      </div>
    </motion.div>
  );
}
