import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, FileText, Cloud, Zap, Shield, CheckCircle, AlertCircle, Loader, Crown, Info, Eye, X, Download, ExternalLink } from 'lucide-react';
import { useAuth } from '../AuthContext';
import { createActor, canisterId } from '../canister_id_patch';
import { HttpAgent } from '@dfinity/agent';
import { initAuth, getIdentity } from '../auth';

export default function EnhancedUpload() {
  const { principal, isLoggedIn } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [uploadProgress, setUploadProgress] = useState({});
  const [uploadStatus, setUploadStatus] = useState({});
  const [backend, setBackend] = useState(null);
  const [userTierInfo, setUserTierInfo] = useState(null);
  const [loadingTierInfo, setLoadingTierInfo] = useState(false);
  const [uploadResults, setUploadResults] = useState(null);
  const [showResults, setShowResults] = useState(false);
  const [viewingFile, setViewingFile] = useState(null);
  const [fileViewerOpen, setFileViewerOpen] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const fileInputRef = useRef(null);

  // Initialize backend connection
  React.useEffect(() => {
    const initBackend = async () => {
      if (isLoggedIn && principal) {
        try {
          console.log('Initializing backend for principal:', principal.toString());
          await initAuth();
          const identity = await getIdentity();
          const agent = new HttpAgent({
            host: import.meta.env.VITE_DFX_REPLICA_HOST || "http://127.0.0.1:4943",
            identity
          });
          const backendInstance = createActor(canisterId, { agent });
          
          // Test the backend connection
          console.log('Testing backend connection...');
          const testResult = await backendInstance.greet("test");
          console.log('Backend test result:', testResult);
          
          setBackend(backendInstance);
          console.log('Backend initialized successfully');
          
          // Load user tier information and uploaded files
          await Promise.all([
            loadTierInfo(backendInstance),
            loadUploadedFiles(backendInstance)
          ]);
        } catch (error) {
          console.error('Failed to initialize backend:', error);
          setUploadStatus(prev => ({ ...prev, 'backend': `❌ Backend init failed: ${error.message}` }));
        }
      }
    };
    initBackend();
  }, [isLoggedIn, principal]);

  // Load user tier information
  const loadTierInfo = async (backendInstance = backend) => {
    if (!backendInstance) return;
    
    setLoadingTierInfo(true);
    try {
      console.log('Loading user tier information...');
      const tierInfo = await backendInstance.get_user_tier_info();
      
      if (tierInfo.Ok) {
        setUserTierInfo(tierInfo.Ok);
        console.log('User tier info loaded:', tierInfo.Ok);
      } else {
        console.error('Failed to load tier info:', tierInfo.Err);
      }
    } catch (error) {
      console.error('Error loading tier info:', error);
    } finally {
      setLoadingTierInfo(false);
    }
  };

  // Load previously uploaded files
  const loadUploadedFiles = async (backendInstance = backend) => {
    if (!backendInstance) return;
    
    try {
      console.log('Loading previously uploaded files...');
      const files = await backendInstance.list_ipfs_files();
      
      const formattedFiles = files.map(file => ({
        name: file.name,
        type: file.content_type,
        size: Number(file.size),
        cid: file.cid,
        ipfsHash: file.cid, // Using CID as IPFS hash for now
        url: `https://gateway.pinata.cloud/ipfs/${file.cid}`,
        gatewayUrl: `https://gateway.pinata.cloud/ipfs/${file.cid}`,
        uploadedAt: new Date(Number(file.uploaded_at) / 1000000).toISOString(), // Convert nanoseconds to milliseconds
        resultMessage: `Previously uploaded file: ${file.name}`
      }));
      
      setUploadedFiles(formattedFiles);
      console.log('Uploaded files loaded:', formattedFiles.length);
    } catch (error) {
      console.error('Error loading uploaded files:', error);
    }
  };

  // Helper function to get tier name from enum object
  const getUserTierName = (tier) => {
    if (typeof tier === 'object' && tier !== null) {
      return Object.keys(tier)[0];
    }
    return tier;
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

  // Generate CID for file (simplified version)
  const generateCID = async (file) => {
    // In a real implementation, this would use IPFS CID generation
    // For now, we'll use a simple hash-based approach
    const buffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return `bafybeih${hashHex.substring(0, 44)}`; // IPFS CID format
  };

  // File viewing functions
  const openFileViewer = (file) => {
    setViewingFile(file);
    setFileViewerOpen(true);
  };

  const closeFileViewer = () => {
    setFileViewerOpen(false);
    setViewingFile(null);
  };

  const getFileIcon = (fileType) => {
    if (fileType.startsWith('image/')) return '🖼️';
    if (fileType.startsWith('video/')) return '🎥';
    if (fileType.startsWith('audio/')) return '🎵';
    if (fileType.includes('pdf')) return '📄';
    if (fileType.includes('text')) return '📝';
    if (fileType.includes('zip') || fileType.includes('rar')) return '📦';
    return '📁';
  };

  const canPreviewFile = (fileType) => {
    return fileType.startsWith('image/') || 
           fileType.startsWith('video/') || 
           fileType.startsWith('audio/') || 
           fileType.includes('text') ||
           fileType.includes('pdf');
  };

  const renderFilePreview = (file) => {
    if (!file.url) return null;

    if (file.type.startsWith('image/')) {
      return (
        <img 
          src={file.url} 
          alt={file.name} 
          className="max-w-full max-h-96 object-contain rounded-lg"
          onError={(e) => {
            e.target.style.display = 'none';
            e.target.nextSibling.style.display = 'block';
          }}
        />
      );
    }

    if (file.type.startsWith('video/')) {
      return (
        <video 
          controls 
          className="max-w-full max-h-96 rounded-lg"
          onError={(e) => {
            e.target.style.display = 'none';
            e.target.nextSibling.style.display = 'block';
          }}
        >
          <source src={file.url} type={file.type} />
          Your browser does not support the video tag.
        </video>
      );
    }

    if (file.type.startsWith('audio/')) {
      return (
        <audio 
          controls 
          className="w-full"
          onError={(e) => {
            e.target.style.display = 'none';
            e.target.nextSibling.style.display = 'block';
          }}
        >
          <source src={file.url} type={file.type} />
          Your browser does not support the audio tag.
        </audio>
      );
    }

    if (file.type.includes('text')) {
      return (
        <div className="bg-neutral-800 p-4 rounded-lg max-h-96 overflow-auto">
          <pre className="text-sm text-neutral-300 whitespace-pre-wrap">
            {file.content || 'Loading...'}
          </pre>
        </div>
      );
    }

    return (
      <div className="text-center py-8">
        <div className="text-6xl mb-4">{getFileIcon(file.type)}</div>
        <p className="text-neutral-400 mb-4">Preview not available for this file type</p>
        <a 
          href={file.url} 
          target="_blank" 
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-600 px-4 py-2 rounded-lg transition-colors"
        >
          <ExternalLink className="w-4 h-4" />
          Open in New Tab
        </a>
      </div>
    );
  };

  // Enhanced upload to dCDN using canister HTTP calls to Pinata
  const uploadToDcdn = async (file) => {
    try {
      setUploadStatus(prev => ({ ...prev, [file.name]: 'Generating CID...' }));
      
      // Generate CID for the file
      const cid = await generateCID(file);
      
      setUploadStatus(prev => ({ ...prev, [file.name]: 'Reading file content...' }));
      setUploadProgress(prev => ({ ...prev, [file.name]: 25 }));

      // Read file content for upload
        const reader = new FileReader();
        const fileBytes = await new Promise((resolve, reject) => {
          reader.onload = () => resolve(new Uint8Array(reader.result));
          reader.onerror = reject;
          reader.readAsArrayBuffer(file);
        });

      setUploadStatus(prev => ({ ...prev, [file.name]: 'Uploading via canister HTTP call...' }));
      setUploadProgress(prev => ({ ...prev, [file.name]: 50 }));

      // Upload using the new canister HTTP call function
      const uploadResult = await backend.upload_content_with_canister_pinata(
        cid,
          file.type,
        Array.from(fileBytes),
        file.name
      );

      if (!uploadResult.Ok) {
        throw new Error(uploadResult.Err || 'Upload via canister HTTP call failed');
      }

      setUploadStatus(prev => ({ ...prev, [file.name]: 'Processing upload result...' }));
      setUploadProgress(prev => ({ ...prev, [file.name]: 75 }));

      // Parse the upload result to extract IPFS hash
      const resultMessage = uploadResult.Ok;
      let ipfsHash = null;
      
      // Try to extract IPFS hash from the result message
      const ipfsHashMatch = resultMessage.match(/IPFS Hash: ([A-Za-z0-9]+)/);
      if (ipfsHashMatch) {
        ipfsHash = ipfsHashMatch[1];
      }

      // Store metadata for file management (if we have an IPFS hash)
      if (ipfsHash) {
      const metadataResult = await backend.add_ipfs_file(
        file.name,
          ipfsHash,
          BigInt(fileBytes.length),
          file.type
      );

      if (!metadataResult.Ok) {
          console.warn('Failed to store metadata:', metadataResult.Err);
        }
      }

      setUploadProgress(prev => ({ ...prev, [file.name]: 100 }));
      
      // Update status based on the result
      if (resultMessage.includes('pinned to IPFS')) {
        setUploadStatus(prev => ({ ...prev, [file.name]: '✅ Uploaded and pinned to IPFS via canister HTTP call!' }));
      } else if (resultMessage.includes('no pinning')) {
        setUploadStatus(prev => ({ ...prev, [file.name]: '✅ Uploaded to IPFS (no pinning - free tier) via canister HTTP call!' }));
      } else {
        setUploadStatus(prev => ({ ...prev, [file.name]: '✅ Uploaded to cache via canister HTTP call!' }));
      }
      
      const uploadedFile = {
        name: file.name,
        type: file.type,
        size: file.size,
        cid: cid,
        ipfsHash: ipfsHash,
        url: ipfsHash ? `https://gateway.pinata.cloud/ipfs/${ipfsHash}` : null,
        gatewayUrl: ipfsHash ? `https://gateway.pinata.cloud/ipfs/${ipfsHash}` : null,
        uploadedAt: new Date().toISOString(),
        resultMessage: resultMessage
      };

      // Add to uploaded files list
      setUploadedFiles(prev => [uploadedFile, ...prev]);
      
      return { 
        success: true, 
        cid: cid,
        ipfsHash: ipfsHash,
        gatewayUrl: ipfsHash ? `https://gateway.pinata.cloud/ipfs/${ipfsHash}` : null,
        resultMessage: resultMessage
      };
    } catch (error) {
      console.error('Upload error:', error);
      setUploadStatus(prev => ({ ...prev, [file.name]: `❌ ${error.message}` }));
      throw error;
    }
  };

  // Handle file selection
  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    setSelectedFiles(prev => [...prev, ...files]);
  };

  // Handle drag and drop
  const handleDrop = (e) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    setSelectedFiles(prev => [...prev, ...files]);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  // Remove file from selection
  const handleRemoveFile = (fileName) => {
    setSelectedFiles(prev => prev.filter(f => f.name !== fileName));
    setUploadProgress(prev => {
      const newProgress = { ...prev };
      delete newProgress[fileName];
      return newProgress;
    });
    setUploadStatus(prev => {
      const newStatus = { ...prev };
      delete newStatus[fileName];
      return newStatus;
    });
  };

  // Start upload process
  const handleUpload = async () => {
    if (!isLoggedIn) {
      alert('Please log in to upload files');
      return;
    }
    if (!selectedFiles.length) {
      alert('Please select files');
      return;
    }
    if (!backend) {
      alert('Backend not initialized');
      return;
    }

    setUploading(true);
    setUploadProgress({});
    setUploadStatus({});

    const uploadResults = [];
    let successCount = 0;

    for (const file of selectedFiles) {
      try {
        const result = await uploadToDcdn(file);
        uploadResults.push(result);
        successCount++;
      } catch (error) {
        console.error(`Failed to upload ${file.name}:`, error);
        uploadResults.push({ success: false, error: error.message });
      }
    }

    setUploading(false);
    
    // Show results in a dropdown instead of popup
    const results = {
      total: selectedFiles.length,
      success: successCount,
      failed: selectedFiles.length - successCount,
      files: selectedFiles.map((file, index) => ({
        name: file.name,
        size: file.size,
        status: uploadStatus[file.name] || 'Unknown',
        success: uploadStatus[file.name]?.includes('✅') || false
      }))
    };
    
    // Store results for display
    setUploadResults(results);
    
    if (successCount === selectedFiles.length) {
      setSelectedFiles([]);
      setUploadProgress({});
      setUploadStatus({});
      if (fileInputRef.current) fileInputRef.current.value = null;
    }
  };

  // Clear all files
  const clearAll = () => {
    setSelectedFiles([]);
    setUploadProgress({});
    setUploadStatus({});
    if (fileInputRef.current) fileInputRef.current.value = null;
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }} 
      animate={{ opacity: 1, y: 0 }}
      className="bg-white/10 dark:bg-neutral-900/40 backdrop-blur-xl rounded-2xl p-8 border border-white/30 dark:border-neutral-700 shadow-xl"
    >
      <h2 className="text-2xl font-semibold mb-6 flex items-center gap-2">
        <Zap className="w-6 h-6 text-orange-500" />
        Enhanced dCDN Upload
      </h2>
      
      <div className="mb-6 p-4 bg-gradient-to-r from-orange-500/10 to-orange-800/10 rounded-lg border border-orange-500/20">
        <div className="flex items-center gap-2 mb-2">
          <Shield className="w-5 h-5 text-orange-400" />
          <span className="font-semibold text-orange-400">dCDN Features:</span>
        </div>
        <ul className="text-sm text-neutral-300 space-y-1">
          <li>• Automatic IPFS upload to Pinata</li>
          <li>• Smart caching with LRU eviction</li>
          <li>• On-chain content verification</li>
          <li>• Global content delivery</li>
        </ul>
      </div>

      {/* Tier-specific Upload Warning */}
      {userTierInfo && (
        <div className={`mb-6 p-4 rounded-lg border ${
          getUserTierName(userTierInfo.current_tier) === 'Free' 
            ? 'bg-gradient-to-r from-amber-500/10 to-orange-500/10 border-amber-500/20'
            : 'bg-gradient-to-r from-green-500/10 to-emerald-500/10 border-green-500/20'
        }`}>
          <div className="flex items-center gap-2 mb-2">
            {getUserTierName(userTierInfo.current_tier) === 'Free' ? (
              <AlertCircle className="w-5 h-5 text-amber-400" />
            ) : (
              <Crown className="w-5 h-5 text-green-400" />
            )}
            <span className={`font-semibold ${
              getUserTierName(userTierInfo.current_tier) === 'Free' ? 'text-amber-400' : 'text-green-400'
            }`}>
              {getUserTierName(userTierInfo.current_tier)} Tier Upload Behavior:
            </span>
          </div>
          
          {getUserTierName(userTierInfo.current_tier) === 'Free' ? (
            <div className="text-sm text-neutral-300 space-y-2">
              <p>⚠️ <strong>Free Tier Limitations:</strong></p>
              <ul className="ml-4 space-y-1">
                <li>• Files uploaded directly to IPFS (no pinning)</li>
                <li>• Content may become unavailable when cache evicts</li>
                <li>• No persistent storage guarantee</li>
                <li>• Limited to 20MB cache</li>
              </ul>
              <div className="mt-3 p-2 bg-amber-500/10 rounded border border-amber-500/20">
                <p className="text-amber-300 text-xs">
                  💡 <strong>Upgrade for better reliability:</strong> Paid tiers include persistent IPFS pinning, 
                  ensuring your content stays available even after cache eviction.
                </p>
              </div>
            </div>
          ) : (
            <div className="text-sm text-neutral-300 space-y-1">
              <p>✅ <strong>Premium Features Active:</strong></p>
              <ul className="ml-4 space-y-1">
                <li>• Files uploaded and pinned to IPFS persistently</li>
                <li>• Content remains available even after cache eviction</li>
                <li>• Enhanced storage limits ({formatBytes(userTierInfo.cache_limit_bytes)})</li>
                <li>• Priority support and features</li>
              </ul>
            </div>
          )}
        </div>
      )}

      {loadingTierInfo && (
        <div className="mb-6 p-4 bg-neutral-800/30 rounded-lg border border-neutral-600">
          <div className="flex items-center gap-2">
            <Loader className="w-4 h-4 animate-spin text-orange-400" />
            <span className="text-sm text-neutral-400">Loading tier information...</span>
          </div>
        </div>
      )}

      {/* Upload Area */}
      <div
        className="flex flex-col items-center gap-4 border-2 border-dashed border-orange-500/30 rounded-lg p-8 mb-6 bg-neutral-900/30 hover:bg-orange-900/10 transition-colors duration-200"
        onDrop={handleDrop}
        onDragOver={handleDragOver}
      >
        <Cloud className="w-12 h-12 text-orange-500" />
        <div className="text-center">
          <p className="text-lg font-semibold text-white mb-2">Drop files here or click to browse</p>
          <p className="text-sm text-neutral-400">Files will be automatically pinned and cached</p>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={handleFileChange}
          className="block w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-orange-50 file:text-orange-700 hover:file:bg-orange-100 transition-all duration-200"
        />
      </div>

      {/* Selected Files */}
      <AnimatePresence>
        {selectedFiles.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }} 
            animate={{ opacity: 1, y: 0 }} 
            exit={{ opacity: 0, y: 10 }}
            className="mb-6"
          >
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5 text-orange-500" />
              Selected Files ({selectedFiles.length})
            </h3>
            <div className="space-y-3">
              {selectedFiles.map((file, index) => (
                <motion.div
                  key={file.name}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-center justify-between p-3 bg-neutral-800/50 rounded-lg border border-neutral-700"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-orange-500/20 rounded-lg flex items-center justify-center">
                      <FileText className="w-5 h-5 text-orange-400" />
                    </div>
                    <div>
                      <p className="font-medium text-white">{file.name}</p>
                      <p className="text-sm text-neutral-400">
                        {(file.size / 1024 / 1024).toFixed(2)} MB • {file.type}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    {/* Progress Bar */}
                    <div className="w-32">
                      <div className="w-full bg-neutral-700 rounded-full h-2 mb-1">
                        <div
                          className="bg-gradient-to-r from-orange-500 to-orange-700 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${uploadProgress[file.name] || 0}%` }}
                        ></div>
                      </div>
                      <div className="text-xs text-neutral-400 text-right">
                        {uploadProgress[file.name] ? `${uploadProgress[file.name]}%` : 'Pending'}
                      </div>
                    </div>
                    
                    {/* Status */}
                    <div className="flex items-center gap-2 min-w-[120px]">
                      {uploadStatus[file.name]?.includes('✅') && (
                        <CheckCircle className="w-4 h-4 text-green-400" />
                      )}
                      {uploadStatus[file.name]?.includes('❌') && (
                        <AlertCircle className="w-4 h-4 text-red-400" />
                      )}
                      {uploadStatus[file.name] && !uploadStatus[file.name].includes('✅') && !uploadStatus[file.name].includes('❌') && (
                        <Loader className="w-4 h-4 text-orange-400 animate-spin" />
                      )}
                      <span className="text-xs text-neutral-300">
                        {uploadStatus[file.name] || 'Ready'}
                      </span>
                    </div>
                    
                    {/* Remove Button */}
                    {!uploading && (
                      <button
                        onClick={() => handleRemoveFile(file.name)}
                        className="text-red-400 hover:text-red-300 p-1 rounded hover:bg-red-900/20 transition-colors"
                        title="Remove file"
                      >
                        ×
                      </button>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <motion.button
          onClick={handleUpload}
          disabled={uploading || !selectedFiles.length || !backend}
          className="flex-1 bg-gradient-to-r from-orange-500 to-orange-700 hover:from-orange-600 hover:to-orange-800 px-6 py-3 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 flex items-center justify-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          {uploading ? (
            <>
              <Loader className="w-5 h-5 animate-spin" />
              Uploading...
            </>
          ) : (
            <>
              <Upload className="w-5 h-5" />
              Upload to dCDN
            </>
          )}
        </motion.button>
        
        {selectedFiles.length > 0 && (
          <motion.button
            onClick={clearAll}
            disabled={uploading}
            className="px-6 py-3 bg-neutral-700 hover:bg-neutral-600 rounded-lg disabled:opacity-50 transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-500"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            Clear All
          </motion.button>
        )}
             </div>

       {/* Upload Results Dropdown */}
       {uploadResults && (
         <motion.div 
           initial={{ opacity: 0, y: 20 }} 
           animate={{ opacity: 1, y: 0 }}
           className="mt-6 p-4 bg-gradient-to-r from-green-500/10 to-emerald-500/10 rounded-lg border border-green-500/20"
         >
           <div className="flex items-center justify-between mb-3">
             <h3 className="text-lg font-semibold text-green-400 flex items-center gap-2">
               <CheckCircle className="w-5 h-5" />
               Upload Results
             </h3>
             <button
               onClick={() => setShowResults(!showResults)}
               className="text-green-400 hover:text-green-300 transition-colors"
             >
               {showResults ? '▼' : '▶'}
             </button>
           </div>
           
           <div className="text-sm text-neutral-300 mb-3">
             <span className="text-green-400 font-semibold">{uploadResults.success}</span> successful, 
             <span className="text-red-400 font-semibold"> {uploadResults.failed}</span> failed out of {uploadResults.total} files
           </div>
           
           {showResults && (
             <motion.div 
               initial={{ opacity: 0, height: 0 }}
               animate={{ opacity: 1, height: 'auto' }}
               className="space-y-2 max-h-60 overflow-y-auto"
             >
               {uploadResults.files.map((file, index) => (
                 <div key={index} className={`p-2 rounded border ${
                   file.success 
                     ? 'bg-green-500/10 border-green-500/20' 
                     : 'bg-red-500/10 border-red-500/20'
                 }`}>
                   <div className="flex items-center justify-between">
                     <span className="font-medium text-white">{file.name}</span>
                     <span className={`text-xs ${
                       file.success ? 'text-green-400' : 'text-red-400'
                     }`}>
                       {file.success ? '✅' : '❌'}
                     </span>
                   </div>
                   <div className="text-xs text-neutral-400">
                     {(file.size / 1024 / 1024).toFixed(2)} MB • {file.status}
                   </div>
                 </div>
               ))}
             </motion.div>
           )}
           
           <button
             onClick={() => {
               setUploadResults(null);
               setShowResults(false);
             }}
             className="mt-3 text-xs text-neutral-400 hover:text-neutral-300 transition-colors"
           >
             Clear Results
           </button>
         </motion.div>
       )}

       {/* Uploaded Files Section */}
       {uploadedFiles.length > 0 && (
         <motion.div 
           initial={{ opacity: 0, y: 20 }} 
           animate={{ opacity: 1, y: 0 }}
           className="mt-6 p-4 bg-gradient-to-r from-blue-500/10 to-indigo-500/10 rounded-lg border border-blue-500/20"
         >
           <div className="flex items-center justify-between mb-4">
             <h3 className="text-lg font-semibold text-blue-400 flex items-center gap-2">
               <FileText className="w-5 h-5" />
               Recently Uploaded Files ({uploadedFiles.length})
             </h3>
           </div>
           
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-80 overflow-y-auto">
             {uploadedFiles.map((file, index) => (
               <motion.div
                 key={index}
                 initial={{ opacity: 0, scale: 0.9 }}
                 animate={{ opacity: 1, scale: 1 }}
                 transition={{ delay: index * 0.1 }}
                 className="p-3 bg-neutral-800/50 rounded-lg border border-neutral-700 hover:border-blue-500/50 transition-colors"
               >
                 <div className="flex items-start justify-between mb-2">
                   <div className="flex items-center gap-2">
                     <span className="text-2xl">{getFileIcon(file.type)}</span>
                     <div className="min-w-0 flex-1">
                       <p className="font-medium text-white text-sm truncate" title={file.name}>
                         {file.name}
                       </p>
                       <p className="text-xs text-neutral-400">
                         {formatBytes(file.size)} • {new Date(file.uploadedAt).toLocaleDateString()}
                       </p>
                     </div>
                   </div>
                 </div>
                 
                 <div className="flex items-center gap-2">
                   {canPreviewFile(file.type) && file.url && (
                     <button
                       onClick={() => openFileViewer(file)}
                       className="flex items-center gap-1 text-xs bg-blue-500 hover:bg-blue-600 px-2 py-1 rounded transition-colors"
                       title="View file"
                     >
                       <Eye className="w-3 h-3" />
                       View
                     </button>
                   )}
                   
                   {file.url && (
                     <a
                       href={file.url}
                       target="_blank"
                       rel="noopener noreferrer"
                       className="flex items-center gap-1 text-xs bg-green-500 hover:bg-green-600 px-2 py-1 rounded transition-colors"
                       title="Open in new tab"
                     >
                       <ExternalLink className="w-3 h-3" />
                       Open
                     </a>
                   )}
                   
                   {file.url && (
                     <a
                       href={file.url}
                       download={file.name}
                       className="flex items-center gap-1 text-xs bg-orange-500 hover:bg-orange-600 px-2 py-1 rounded transition-colors"
                       title="Download file"
                     >
                       <Download className="w-3 h-3" />
                       Download
                     </a>
                   )}
                 </div>
                 
                 {file.ipfsHash && (
                   <div className="mt-2 p-2 bg-neutral-900/50 rounded text-xs">
                     <p className="text-neutral-400 mb-1">IPFS Hash:</p>
                     <p className="text-blue-400 font-mono break-all">{file.ipfsHash}</p>
                   </div>
                 )}
               </motion.div>
             ))}
           </div>
         </motion.div>
       )}

       {/* File Viewer Modal */}
       {fileViewerOpen && viewingFile && (
         <motion.div
           initial={{ opacity: 0 }}
           animate={{ opacity: 1 }}
           exit={{ opacity: 0 }}
           className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
           onClick={closeFileViewer}
         >
           <motion.div
             initial={{ scale: 0.9, opacity: 0 }}
             animate={{ scale: 1, opacity: 1 }}
             exit={{ scale: 0.9, opacity: 0 }}
             className="bg-neutral-900 rounded-lg shadow-2xl max-w-4xl max-h-[90vh] w-full overflow-hidden"
             onClick={(e) => e.stopPropagation()}
           >
             {/* Header */}
             <div className="flex items-center justify-between p-4 border-b border-neutral-700">
               <div className="flex items-center gap-3">
                 <span className="text-2xl">{getFileIcon(viewingFile.type)}</span>
                 <div>
                   <h3 className="text-lg font-semibold text-white">{viewingFile.name}</h3>
                   <p className="text-sm text-neutral-400">
                     {formatBytes(viewingFile.size)} • {new Date(viewingFile.uploadedAt).toLocaleString()}
                   </p>
                 </div>
               </div>
               
               <div className="flex items-center gap-2">
                 {viewingFile.url && (
                   <a
                     href={viewingFile.url}
                     target="_blank"
                     rel="noopener noreferrer"
                     className="p-2 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded transition-colors"
                     title="Open in new tab"
                   >
                     <ExternalLink className="w-5 h-5" />
                   </a>
                 )}
                 
                 {viewingFile.url && (
                   <a
                     href={viewingFile.url}
                     download={viewingFile.name}
                     className="p-2 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded transition-colors"
                     title="Download file"
                   >
                     <Download className="w-5 h-5" />
                   </a>
                 )}
                 
                 <button
                   onClick={closeFileViewer}
                   className="p-2 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded transition-colors"
                   title="Close"
                 >
                   <X className="w-5 h-5" />
                 </button>
               </div>
             </div>
             
             {/* Content */}
             <div className="p-6 overflow-auto max-h-[calc(90vh-80px)]">
               {renderFilePreview(viewingFile)}
             </div>
           </motion.div>
         </motion.div>
       )}

       {/* Upload Info */}
       <div className="mt-4 p-3 bg-neutral-800/30 rounded-lg">
         <p className="text-sm text-neutral-400">
           <strong>Note:</strong> Files are automatically pinned to IPFS and cached in the dCDN for fast global delivery.
         </p>
       </div>
    </motion.div>
  );
}
