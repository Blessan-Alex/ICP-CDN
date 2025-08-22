import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Image, Download, RotateCcw, Maximize2, Minimize2, Loader, CheckCircle, AlertCircle } from 'lucide-react';
import { useAuth } from '../AuthContext';
import { createActor, canisterId } from '../canister_id_patch';
import { HttpAgent } from '@dfinity/agent';
import { initAuth, getIdentity } from '../auth';
import { useSearchParams } from 'react-router-dom';

export default function ImageResizer({ cid: propCid, originalSize: propOriginalSize, onResizeComplete }) {
  const [searchParams] = useSearchParams();
  const urlCid = searchParams.get('cid');
  const cid = propCid || urlCid;
  const originalSize = propOriginalSize || { width: 1920, height: 1080 };
  const { principal, isLoggedIn } = useAuth();
  const [backend, setBackend] = useState(null);
  const [resizedImage, setResizedImage] = useState(null);
  const [targetWidth, setTargetWidth] = useState(originalSize?.width || 800);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeStatus, setResizeStatus] = useState('');
  const [originalImage, setOriginalImage] = useState(null);
  const [error, setError] = useState(null);

  // Size presets for quick resizing
  const sizePresets = [
    { name: 'Thumbnail', width: 150, height: 150 },
    { name: 'Small', width: 300, height: 300 },
    { name: 'Medium', width: 600, height: 600 },
    { name: 'Large', width: 1200, height: 1200 },
    { name: 'HD', width: 1920, height: 1080 },
    { name: '4K', width: 3840, height: 2160 }
  ];

  // Initialize backend connection
  useEffect(() => {
    const initBackend = async () => {
      if (isLoggedIn && principal) {
        try {
          console.log('Initializing backend for image resizer...');
          await initAuth();
          const identity = await getIdentity();
          const agent = new HttpAgent({
            host: import.meta.env.VITE_DFX_REPLICA_HOST || "http://127.0.0.1:4943",
            identity
          });
          const backendInstance = createActor(canisterId, { agent });
          
          // Test the backend connection
          console.log('Testing backend connection for image resizer...');
          const testResult = await backendInstance.greet("test");
          console.log('Backend test result:', testResult);
          
          setBackend(backendInstance);
          console.log('Backend initialized successfully for image resizer');
        } catch (error) {
          console.error('Failed to initialize backend for image resizer:', error);
          setError(`Failed to initialize backend: ${error.message}`);
        }
      }
    };
    initBackend();
  }, [isLoggedIn, principal]);

  // Load original image for preview
  useEffect(() => {
    if (cid && backend) {
      loadOriginalImage();
    }
  }, [cid, backend]);

  const loadOriginalImage = async () => {
    try {
      setResizeStatus('Loading original image...');
      const result = await backend.get_content(cid);
      if (result.Ok) {
        const blob = new Blob([result.Ok], { type: 'image/png' });
        const url = URL.createObjectURL(blob);
        setOriginalImage(url);
        setResizeStatus('');
      } else {
        throw new Error(result.Err || 'Failed to load image');
      }
    } catch (error) {
      setError(`Failed to load image: ${error.message}`);
      setResizeStatus('');
    }
  };

  const resizeImage = async () => {
    if (!backend || !cid) {
      setError('Backend not initialized or CID not provided');
      return;
    }

    setIsResizing(true);
    setResizeStatus('Resizing image...');
    setError(null);

    try {
      const result = await backend.get_content_with_resize(cid, targetWidth);
      
      if (result.Ok) {
        const blob = new Blob([result.Ok], { type: 'image/png' });
        const url = URL.createObjectURL(blob);
        setResizedImage(url);
        setResizeStatus('✅ Image resized successfully!');
        
        // Call callback if provided
        if (onResizeComplete) {
          onResizeComplete({
            cid,
            originalWidth: originalSize?.width,
            newWidth: targetWidth,
            blob,
            url
          });
        }
      } else {
        throw new Error(result.Err || 'Resize failed');
      }
    } catch (error) {
      setError(`Resize failed: ${error.message}`);
      setResizeStatus('');
    } finally {
      setIsResizing(false);
    }
  };

  const handlePresetClick = (preset) => {
    setTargetWidth(preset.width);
  };

  const downloadResizedImage = () => {
    if (resizedImage) {
      const link = document.createElement('a');
      link.href = resizedImage;
      link.download = `resized_${cid}_${targetWidth}px.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const resetResize = () => {
    setResizedImage(null);
    setResizeStatus('');
    setError(null);
    setTargetWidth(originalSize?.width || 800);
  };

  const calculateAspectRatio = () => {
    if (originalSize?.width && originalSize?.height) {
      return originalSize.width / originalSize.height;
    }
    return 1;
  };

  const calculateNewHeight = () => {
    const aspectRatio = calculateAspectRatio();
    return Math.round(targetWidth / aspectRatio);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }} 
      animate={{ opacity: 1, y: 0 }}
      className="bg-white/10 dark:bg-neutral-900/40 backdrop-blur-xl rounded-2xl p-6 border border-white/30 dark:border-neutral-700 shadow-xl"
    >
      <div className="flex items-center gap-2 mb-6">
        <Image className="w-6 h-6 text-orange-500" />
        <h3 className="text-xl font-semibold">Image Resizer</h3>
        {cid && (
          <span className="text-sm text-neutral-400 font-mono">
            CID: {cid.substring(0, 12)}...
          </span>
        )}
      </div>

      {/* Original Image Preview */}
      {originalImage && (
        <div className="mb-6">
          <h4 className="text-sm font-medium text-neutral-300 mb-2">Original Image</h4>
          <div className="relative inline-block">
            <img 
              src={originalImage} 
              alt="Original" 
              className="max-w-full h-auto max-h-48 rounded-lg border border-neutral-700"
            />
            {originalSize && (
              <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                {originalSize.width} × {originalSize.height}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Size Presets */}
      <div className="mb-6">
        <h4 className="text-sm font-medium text-neutral-300 mb-3">Quick Presets</h4>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {sizePresets.map((preset) => (
            <motion.button
              key={preset.name}
              onClick={() => handlePresetClick(preset)}
              className={`p-2 rounded-lg border text-xs font-medium transition-all duration-200 ${
                targetWidth === preset.width
                  ? 'bg-orange-500/20 border-orange-500 text-orange-400'
                  : 'bg-neutral-800/50 border-neutral-700 text-neutral-300 hover:bg-neutral-700/50'
              }`}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="font-semibold">{preset.name}</div>
              <div className="text-xs opacity-75">{preset.width}px</div>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Custom Size Control */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-sm font-medium text-neutral-300">Custom Size</h4>
          <span className="text-xs text-neutral-400">
            {targetWidth} × {calculateNewHeight()} px
          </span>
        </div>
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <Minimize2 className="w-4 h-4 text-neutral-400" />
            <input
              type="range"
              min="50"
              max={originalSize?.width || 2000}
              value={targetWidth}
              onChange={(e) => setTargetWidth(parseInt(e.target.value))}
              className="flex-1 h-2 bg-neutral-700 rounded-lg appearance-none cursor-pointer slider"
            />
            <Maximize2 className="w-4 h-4 text-neutral-400" />
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-neutral-400 w-16">Width:</span>
            <input
              type="number"
              value={targetWidth}
              onChange={(e) => setTargetWidth(parseInt(e.target.value) || 100)}
              className="flex-1 bg-neutral-800 border border-neutral-700 rounded px-3 py-2 text-sm text-white"
              min="50"
              max={originalSize?.width || 2000}
            />
            <span className="text-xs text-neutral-400">px</span>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 mb-6">
        <motion.button
          onClick={resizeImage}
          disabled={isResizing || !backend}
          className="flex-1 bg-gradient-to-r from-orange-500 to-orange-700 hover:from-orange-600 hover:to-orange-800 px-4 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 flex items-center justify-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          {isResizing ? (
            <>
              <Loader className="w-4 h-4 animate-spin" />
              Resizing...
            </>
          ) : (
            <>
              <Image className="w-4 h-4" />
              Resize Image
            </>
          )}
        </motion.button>

        {resizedImage && (
          <motion.button
            onClick={downloadResizedImage}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg transition-all duration-300 flex items-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Download className="w-4 h-4" />
            Download
          </motion.button>
        )}

        <motion.button
          onClick={resetResize}
          className="px-4 py-2 bg-neutral-700 hover:bg-neutral-600 rounded-lg transition-all duration-300 flex items-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-500"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <RotateCcw className="w-4 h-4" />
          Reset
        </motion.button>
      </div>

      {/* Status Messages */}
      <AnimatePresence>
        {resizeStatus && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className={`p-3 rounded-lg mb-4 flex items-center gap-2 ${
              resizeStatus.includes('✅') 
                ? 'bg-green-900/20 border border-green-500/20 text-green-400'
                : 'bg-orange-900/20 border border-orange-500/20 text-orange-400'
            }`}
          >
            {resizeStatus.includes('✅') ? (
              <CheckCircle className="w-4 h-4" />
            ) : (
              <Loader className="w-4 h-4 animate-spin" />
            )}
            {resizeStatus}
          </motion.div>
        )}

        {error && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="p-3 rounded-lg mb-4 bg-red-900/20 border border-red-500/20 text-red-400 flex items-center gap-2"
          >
            <AlertCircle className="w-4 h-4" />
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Resized Image Preview */}
      <AnimatePresence>
        {resizedImage && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="mt-6"
          >
            <h4 className="text-sm font-medium text-neutral-300 mb-2">Resized Preview</h4>
            <div className="relative inline-block">
              <img 
                src={resizedImage} 
                alt="Resized" 
                className="max-w-full h-auto max-h-64 rounded-lg border border-neutral-700"
              />
              <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                {targetWidth} × {calculateNewHeight()}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Info */}
      <div className="mt-4 p-3 bg-neutral-800/30 rounded-lg">
        <p className="text-xs text-neutral-400">
          <strong>Note:</strong> Images are resized on-chain using the dCDN backend. 
          The resized image maintains the original aspect ratio.
        </p>
      </div>
    </motion.div>
  );
}
