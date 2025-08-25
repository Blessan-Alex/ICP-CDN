import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Image, Download, RotateCcw, Maximize2, Minimize2, Loader, CheckCircle, AlertCircle, Eye, FileText, Grid, List } from 'lucide-react';
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
  const [cachedImages, setCachedImages] = useState([]);
  const [selectedImage, setSelectedImage] = useState(null);
  const [loadingImages, setLoadingImages] = useState(false);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'

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
          
          // Load cached images
          await loadCachedImages(backendInstance);
        } catch (error) {
          console.error('Failed to initialize backend for image resizer:', error);
          setError(`Failed to initialize backend: ${error.message}`);
        }
      }
    };
    initBackend();
  }, [isLoggedIn, principal]);

  // Load cached images from backend
  const loadCachedImages = async (backendInstance = backend) => {
    if (!backendInstance) return;
    
    setLoadingImages(true);
    try {
      console.log('Loading cached images...');
      const images = await backendInstance.list_cached_images();
      setCachedImages(images);
      console.log('Cached images loaded:', images.length);
      
      // If we have a CID from URL and it's in the cached images, select it
      if (urlCid) {
        const foundImage = images.find(img => img.cid === urlCid);
        if (foundImage) {
          setSelectedImage(foundImage);
          await loadOriginalImage(foundImage.cid);
        }
      }
    } catch (error) {
      console.error('Error loading cached images:', error);
      setError(`Failed to load cached images: ${error.message}`);
    } finally {
      setLoadingImages(false);
    }
  };

  // Load original image for preview
  const loadOriginalImage = async (imageCid = cid) => {
    if (!imageCid || !backend) return;
    
    try {
      setResizeStatus('Loading original image...');
             const result = await backend.get_content_with_resize(imageCid, []); // No resize
      if (result.Ok) {
        const blob = new Blob([result.Ok], { type: 'image/png' });
        const url = URL.createObjectURL(blob);
        setOriginalImage(url);
        setResizeStatus('');
        
        // Try to get image dimensions
        try {
          const dimensions = await backend.get_image_dimensions(imageCid);
          if (dimensions.Ok) {
            setTargetWidth(dimensions.Ok.width);
          }
        } catch (dimError) {
          console.warn('Could not get image dimensions:', dimError);
        }
      } else {
        throw new Error(result.Err || 'Failed to load image');
      }
    } catch (error) {
      setError(`Failed to load image: ${error.message}`);
      setResizeStatus('');
    }
  };

  // Handle image selection
  const handleImageSelect = async (image) => {
    setSelectedImage(image);
    setResizedImage(null);
    setError(null);
    await loadOriginalImage(image.cid);
  };

  const resizeImage = async () => {
    if (!backend || !selectedImage?.cid) {
      setError('Backend not initialized or no image selected');
      return;
    }

    setIsResizing(true);
    setResizeStatus('Resizing image...');
    setError(null);

    try {
             const result = await backend.get_content_with_resize(selectedImage.cid, [targetWidth]);
      
      if (result.Ok) {
        const blob = new Blob([result.Ok], { type: 'image/png' });
        const url = URL.createObjectURL(blob);
        setResizedImage(url);
        setResizeStatus('✅ Image resized successfully!');
        
        // Call callback if provided
        if (onResizeComplete) {
          onResizeComplete({
            cid: selectedImage.cid,
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
    if (resizedImage && selectedImage) {
      const link = document.createElement('a');
      link.href = resizedImage;
      link.download = `resized_${selectedImage.cid}_${targetWidth}px.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const resetResize = () => {
    setResizedImage(null);
    setResizeStatus('');
    setError(null);
    if (selectedImage) {
      loadOriginalImage(selectedImage.cid);
    }
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

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    // Convert BigInt to number for Math operations
    const bytesNum = typeof bytes === 'bigint' ? Number(bytes) : bytes;
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytesNum) / Math.log(k));
    return parseFloat((bytesNum / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (timestamp) => {
    return new Date(Number(timestamp) / 1000000).toLocaleString();
  };

  const getFileIcon = (contentType) => {
    if (contentType.startsWith('image/')) return '🖼️';
    return '📁';
  };

  if (!isLoggedIn) {
    return (
      <motion.div 
        initial={{ opacity: 0, y: 20 }} 
        animate={{ opacity: 1, y: 0 }}
        className="bg-white/10 dark:bg-neutral-900/40 backdrop-blur-xl rounded-2xl p-8 border border-white/30 dark:border-neutral-700 shadow-xl"
      >
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-orange-500 mx-auto mb-4" />
          <h2 className="text-2xl font-semibold mb-4">Authentication Required</h2>
          <p className="text-neutral-400">Please log in to access the image resizer.</p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }} 
      animate={{ opacity: 1, y: 0 }}
      className="bg-white/10 dark:bg-neutral-900/40 backdrop-blur-xl rounded-2xl p-8 border border-white/30 dark:border-neutral-700 shadow-xl"
    >
      <div className="flex items-center gap-2 mb-6">
        <Image className="w-6 h-6 text-orange-500" />
        <h3 className="text-xl font-semibold">🎯 Smart Image Resizer</h3>
        <span className="text-sm text-neutral-400">Powered by ICP On-Chain Processing</span>
      </div>

      {/* Cached Images Section */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-lg font-semibold text-white flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Cached Images ({cachedImages.length})
          </h4>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded ${viewMode === 'grid' ? 'bg-orange-500/20 text-orange-400' : 'text-neutral-400 hover:text-white'}`}
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded ${viewMode === 'list' ? 'bg-orange-500/20 text-orange-400' : 'text-neutral-400 hover:text-white'}`}
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => loadCachedImages()}
              disabled={loadingImages}
              className="text-sm bg-orange-500 hover:bg-orange-600 px-3 py-1 rounded transition-colors disabled:opacity-50"
            >
              {loadingImages ? <Loader className="w-4 h-4 animate-spin" /> : 'Refresh'}
            </button>
          </div>
        </div>

        {loadingImages && (
          <div className="text-center py-8">
            <Loader className="w-8 h-8 animate-spin text-orange-400 mx-auto mb-2" />
            <p className="text-neutral-400">Loading cached images...</p>
          </div>
        )}

        {!loadingImages && cachedImages.length === 0 && (
          <div className="text-center py-8 bg-neutral-800/30 rounded-lg border border-neutral-700">
            <Image className="w-12 h-12 text-neutral-500 mx-auto mb-4" />
            <p className="text-neutral-400 mb-2">No images found in cache</p>
            <p className="text-sm text-neutral-500">Upload some images first to resize them</p>
          </div>
        )}

        {!loadingImages && cachedImages.length > 0 && (
          <div className={viewMode === 'grid' ? 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4' : 'space-y-2'}>
            {cachedImages.map((image, index) => (
              <motion.div
                key={image.cid}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.1 }}
                onClick={() => handleImageSelect(image)}
                className={`p-3 rounded-lg border cursor-pointer transition-all duration-200 ${
                  selectedImage?.cid === image.cid
                    ? 'bg-orange-500/20 border-orange-500/50'
                    : 'bg-neutral-800/50 border-neutral-700 hover:border-orange-500/30 hover:bg-neutral-800/70'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{getFileIcon(image.content_type)}</span>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-white text-sm truncate" title={image.name}>
                      {image.name}
                    </p>
                    <p className="text-xs text-neutral-400">
                      {formatBytes(image.size)} • {formatDate(image.last_accessed)}
                    </p>
                    <p className="text-xs text-neutral-500 font-mono">
                      {image.cid.substring(0, 12)}...
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Image Resizer Section */}
      {selectedImage && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="border-t border-neutral-700 pt-6"
        >
          <div className="flex items-center gap-2 mb-4">
            <h4 className="text-lg font-semibold text-white">Resize: {selectedImage.name}</h4>
            <span className="text-sm text-neutral-400">({formatBytes(selectedImage.size)})</span>
          </div>

          {/* Original Image Preview */}
          {originalImage && (
            <div className="mb-6">
              <h5 className="text-sm font-medium text-neutral-300 mb-2">Original Image</h5>
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
            <h5 className="text-sm font-medium text-neutral-300 mb-3">Quick Presets</h5>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
              {sizePresets.map((preset) => (
                <motion.button
                  key={preset.name}
                  onClick={() => handlePresetClick(preset)}
                  className="p-2 bg-neutral-800 hover:bg-neutral-700 rounded-lg transition-colors text-xs"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <div className="font-medium text-white">{preset.name}</div>
                  <div className="text-neutral-400">{preset.width}px</div>
                </motion.button>
              ))}
            </div>
          </div>

          {/* Custom Size Control */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <h5 className="text-sm font-medium text-neutral-300">Custom Size</h5>
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
                className={`p-3 rounded-lg border ${
                  resizeStatus.includes('✅') 
                    ? 'bg-green-500/10 border-green-500/20 text-green-400' 
                    : 'bg-blue-500/10 border-blue-500/20 text-blue-400'
                }`}
              >
                <div className="flex items-center gap-2">
                  {resizeStatus.includes('✅') ? (
                    <CheckCircle className="w-4 h-4" />
                  ) : (
                    <Loader className="w-4 h-4 animate-spin" />
                  )}
                  {resizeStatus}
                </div>
              </motion.div>
            )}

            {error && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400"
              >
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  {error}
                </div>
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
                <h5 className="text-sm font-medium text-neutral-300 mb-2">Resized Preview</h5>
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
        </motion.div>
      )}

      {/* Info */}
      <div className="mt-6 p-4 bg-gradient-to-r from-orange-500/10 to-orange-800/10 rounded-lg border border-orange-500/20">
        <h5 className="text-sm font-semibold text-orange-400 mb-2">🎯 ICP CDN Advantages</h5>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-neutral-300">
          <div>• 🚀 On-chain image processing</div>
          <div>• 💰 Pay per resize operation</div>
          <div>• 📱 Responsive design support</div>
          <div>• 🔒 Decentralized & trustless</div>
          <div>• ⚡ High-quality Lanczos3 resizing</div>
          <div>• 🎯 Smart caching & optimization</div>
        </div>
      </div>
    </motion.div>
  );
}
