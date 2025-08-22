import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Image, FileText, Video, File, Music, FileArchive, FileCode, 
  FileSpreadsheet, Download, Eye, Settings, ExternalLink, Copy,
  CheckCircle, AlertCircle
} from 'lucide-react';
import { useAuth } from '../AuthContext';
import { createActor, canisterId } from '../canister_id_patch';
import { HttpAgent } from '@dfinity/agent';
import { initAuth, getIdentity } from '../auth';

export default function EnhancedFileCard({ file, onAction }) {
  const { principal, isLoggedIn } = useAuth();
  const [backend, setBackend] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  // Initialize backend connection
  useEffect(() => {
    const initBackend = async () => {
      if (isLoggedIn && principal) {
        try {
          console.log('Initializing backend for enhanced file card...');
          await initAuth();
          const identity = await getIdentity();
          const agent = new HttpAgent({
            host: import.meta.env.VITE_DFX_REPLICA_HOST || "http://127.0.0.1:4943",
            identity
          });
          const backendInstance = createActor(canisterId, { agent });
          
          // Test the backend connection
          console.log('Testing backend connection for enhanced file card...');
          const testResult = await backendInstance.greet("test");
          console.log('Backend test result:', testResult);
          
          setBackend(backendInstance);
          console.log('Backend initialized successfully for enhanced file card');
        } catch (error) {
          console.error('Failed to initialize backend for enhanced file card:', error);
          setError(`Failed to initialize backend: ${error.message}`);
        }
      }
    };
    initBackend();
  }, [isLoggedIn, principal]);

  // Get file icon based on content type
  const getFileIcon = (contentType) => {
    if (contentType.startsWith('image/')) {
      return <Image className="w-6 h-6 text-orange-400" />;
    }
    if (contentType.startsWith('video/')) {
      return <Video className="w-6 h-6 text-orange-400" />;
    }
    if (contentType.startsWith('audio/')) {
      return <Music className="w-6 h-6 text-orange-400" />;
    }
    if (contentType.includes('pdf')) {
      return <FileText className="w-6 h-6 text-orange-400" />;
    }
    if (contentType.includes('zip') || contentType.includes('rar') || contentType.includes('tar')) {
      return <FileArchive className="w-6 h-6 text-orange-400" />;
    }
    if (contentType.includes('spreadsheet') || contentType.includes('excel') || contentType.includes('csv')) {
      return <FileSpreadsheet className="w-6 h-6 text-orange-400" />;
    }
    if (contentType.includes('word') || contentType.includes('document')) {
      return <FileText className="w-6 h-6 text-orange-400" />;
    }
    if (contentType.includes('code') || contentType.includes('javascript') || 
        contentType.includes('json') || contentType.includes('xml') || 
        contentType.includes('html') || contentType.includes('css')) {
      return <FileCode className="w-6 h-6 text-orange-400" />;
    }
    return <File className="w-6 h-6 text-orange-400" />;
  };

  // Get file preview
  const getFilePreview = async () => {
    if (!backend || !file.cid) return;

    setLoading(true);
    setError(null);

    try {
      console.log('Getting file preview for:', file.cid);
      
      if (file.content_type.startsWith('image/')) {
        // Get resized preview for images
        const result = await backend.get_content_with_resize(file.cid, 200);
        if (result.Ok) {
          const blob = new Blob([result.Ok], { type: 'image/png' });
          setPreview(URL.createObjectURL(blob));
        } else {
          throw new Error(result.Err || 'Failed to get image preview');
        }
      } else if (file.content_type.startsWith('text/') || file.content_type === 'application/json') {
        // Get text preview
        const result = await backend.get_content(file.cid);
        if (result.Ok) {
          const text = new TextDecoder().decode(result.Ok);
          setPreview(text.substring(0, 200) + (text.length > 200 ? '...' : ''));
        } else {
          throw new Error(result.Err || 'Failed to get text preview');
        }
      }
    } catch (error) {
      console.error('Failed to get file preview:', error);
      setError(`Failed to get preview: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Download file
  const downloadFile = async () => {
    if (!backend || !file.cid) return;

    setLoading(true);
    setError(null);

    try {
      console.log('Downloading file:', file.cid);
      
      const result = await backend.get_content(file.cid);
      if (result.Ok) {
        const blob = new Blob([result.Ok], { type: file.content_type });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = file.name || `${file.cid}.${file.content_type.split('/')[1] || 'bin'}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      } else {
        throw new Error(result.Err || 'Failed to download file');
      }
    } catch (error) {
      console.error('Failed to download file:', error);
      setError(`Failed to download: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Copy file link
  const copyFileLink = async () => {
    const link = `https://black-defensive-zebra-94.mypinata.cloud/ipfs/${file.cid}`;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy link:', error);
      setError('Failed to copy link');
    }
  };

  // Resize image
  const resizeImage = () => {
    if (onAction) {
      onAction('resize', file);
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

  // Format date
  const formatDate = (timestamp) => {
    return new Date(Number(timestamp) / 1000000).toLocaleDateString();
  };

  if (!isLoggedIn) {
    return (
      <motion.div 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }} 
        className="bg-white/10 dark:bg-neutral-900/40 backdrop-blur-xl rounded-2xl p-6 border border-white/30 dark:border-neutral-700 shadow-xl"
      >
        <div className="text-center text-neutral-400">
          <File className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>Please log in to view file details</p>
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
      {/* File Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-orange-500/20 rounded-lg flex items-center justify-center">
            {getFileIcon(file.content_type)}
          </div>
          <div>
            <h3 className="font-semibold text-white truncate max-w-48">{file.name || 'Unnamed File'}</h3>
            <p className="text-sm text-neutral-400">{file.content_type}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm font-medium text-white">{formatBytes(Number(file.size))}</p>
          <p className="text-xs text-neutral-400">{formatDate(file.uploaded_at)}</p>
        </div>
      </div>

      {/* File Preview */}
      <AnimatePresence>
        {preview && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="mb-4"
          >
            <h4 className="text-sm font-medium text-neutral-300 mb-2">Preview</h4>
            <div className="bg-neutral-800/50 rounded-lg p-3 border border-neutral-700">
              {file.content_type.startsWith('image/') ? (
                <img 
                  src={preview} 
                  alt={file.name} 
                  className="max-w-full h-auto max-h-32 rounded border border-neutral-700"
                />
              ) : (
                <pre className="text-xs text-neutral-300 overflow-auto max-h-24">
                  {preview}
                </pre>
              )}
            </div>
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

      {/* File Information */}
      <div className="mb-4">
        <h4 className="text-sm font-medium text-neutral-300 mb-2">File Information</h4>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <span className="text-neutral-400">CID:</span>
            <span className="ml-2 text-white font-mono text-xs truncate block">
              {file.cid.substring(0, 16)}...
            </span>
          </div>
          <div>
            <span className="text-neutral-400">Size:</span>
            <span className="ml-2 text-white">{formatBytes(Number(file.size))}</span>
          </div>
          <div>
            <span className="text-neutral-400">Type:</span>
            <span className="ml-2 text-white">{file.content_type}</span>
          </div>
          <div>
            <span className="text-neutral-400">Uploaded:</span>
            <span className="ml-2 text-white">{formatDate(file.uploaded_at)}</span>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-2">
        <motion.button
          onClick={getFilePreview}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white text-sm transition-all duration-300 disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <Eye className="w-4 h-4" />
          {loading ? 'Loading...' : 'Preview'}
        </motion.button>

        <motion.button
          onClick={downloadFile}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-2 bg-green-600 hover:bg-green-700 rounded-lg text-white text-sm transition-all duration-300 disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <Download className="w-4 h-4" />
          Download
        </motion.button>

        {file.content_type.startsWith('image/') && (
          <motion.button
            onClick={resizeImage}
            className="flex items-center gap-2 px-3 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-white text-sm transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Settings className="w-4 h-4" />
            Resize
          </motion.button>
        )}

        <motion.button
          onClick={copyFileLink}
          className="flex items-center gap-2 px-3 py-2 bg-neutral-600 hover:bg-neutral-700 rounded-lg text-white text-sm transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-500"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          {copied ? (
            <>
              <CheckCircle className="w-4 h-4" />
              Copied!
            </>
          ) : (
            <>
              <Copy className="w-4 h-4" />
              Copy Link
            </>
          )}
        </motion.button>

        <motion.a
          href={`https://black-defensive-zebra-94.mypinata.cloud/ipfs/${file.cid}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-3 py-2 bg-orange-600 hover:bg-orange-700 rounded-lg text-white text-sm transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <ExternalLink className="w-4 h-4" />
          Open
        </motion.a>
      </div>

      {/* File Status */}
      <div className="mt-4 p-3 bg-neutral-800/30 rounded-lg">
        <p className="text-xs text-neutral-400">
          <strong>Status:</strong> File is cached in dCDN and pinned to IPFS for global access.
        </p>
      </div>
    </motion.div>
  );
}
