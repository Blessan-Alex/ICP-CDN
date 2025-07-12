import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../AuthContext';
import { createActor, canisterId } from '../canister_id_patch';
import { HttpAgent } from '@dfinity/agent';
import { initAuth, getIdentity } from '../auth';
import { Upload, FileText, Trash2, Copy, Eye, Download, Cloud, Zap, Shield } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import undrawShare from "../assets/undraw_share-link_jr6w.svg";
import undrawStars from "../assets/undraw_to-the-stars_tz9v.svg";
import undrawFolderFiles from "../assets/undraw_folder-files_5www.svg";
import { Image, FileText as FileTextIcon, Video, File as FileIcon, Music, FileArchive, FileCode, FileSpreadsheet } from 'lucide-react';

const PINATA_GATEWAY = "black-defensive-zebra-94.mypinata.cloud";
const getAssetUrl = (cid) => {
  return `https://${PINATA_GATEWAY}/ipfs/${cid}`;
};

// Helper to get file icon or thumbnail
const getFileIcon = (file) => {
  const type = file.content_type || file.type || '';
  if (type.startsWith('image/')) {
    // Show thumbnail for images
    if (file.url) {
      return <img src={file.url} alt={file.name} className="w-8 h-8 object-cover rounded shadow border border-neutral-800" />;
    }
    return <Image className="w-6 h-6 text-orange-400" />;
  }
  if (type.startsWith('video/')) return <Video className="w-6 h-6 text-orange-400" />;
  if (type.startsWith('audio/')) return <Music className="w-6 h-6 text-orange-400" />;
  if (type.includes('pdf')) return <FileIcon className="w-6 h-6 text-orange-400" />;
  if (type.includes('zip') || type.includes('rar')) return <FileArchive className="w-6 h-6 text-orange-400" />;
  if (type.includes('spreadsheet') || type.includes('excel')) return <FileSpreadsheet className="w-6 h-6 text-orange-400" />;
  if (type.includes('word')) return <FileIcon className="w-6 h-6 text-orange-400" />;
  if (type.includes('code') || type.includes('javascript') || type.includes('json')) return <FileCode className="w-6 h-6 text-orange-400" />;
  return <FileIcon className="w-6 h-6 text-orange-400" />;
};

export default function Dashboard() {
  const { principal, isLoggedIn } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState('');
  // Multiple file upload state
  const [files, setFiles] = useState([]); // <-- restore this line
  const [selectedFiles, setSelectedFiles] = useState([]); // Array of File
  const [pathMap, setPathMap] = useState({}); // { filename: path }
  const [deleting, setDeleting] = useState('');
  const [copiedIndex, setCopiedIndex] = useState(null);
  const backendRef = useRef(null);
  const abortControllerRef = useRef(null);
  const fileInputRef = useRef(null);
  
  // Chunk size for uploads (500KB chunks to avoid payload limits)
  const CHUNK_SIZE = 512 * 1024;

  // Pinata storage limit in bytes
  const PINATA_STORAGE_LIMIT = 1073741824; // 1 GB

  // Per-file progress and status
  const [fileProgress, setFileProgress] = useState({}); // { filename: percent }
  const [fileStatus, setFileStatus] = useState({}); // { filename: status string }

  // Modal for delete confirmation
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [loadingTimeout, setLoadingTimeout] = useState(false);

  // Add state for delete all modal
  const [showDeleteAllModal, setShowDeleteAllModal] = useState(false);

  // On mount, use loadIpfsFiles instead of loadAssetsWithInfo
  useEffect(() => {
    const initBackend = async () => {
      if (isLoggedIn && principal) {
        try {
          await initAuth();
          const identity = getIdentity();
          const agent = new HttpAgent({
            host: import.meta.env.VITE_DFX_REPLICA_HOST || "http://127.0.0.1:4943",
            identity
          });
          const backend = createActor(canisterId, { agent });
          backendRef.current = backend;
          await loadIpfsFiles(backend);
        } catch (error) {
          console.error('Failed to initialize backend:', error);
        }
      }
    };
    initBackend();
  }, [isLoggedIn, principal]);

  // Replace loadAssetsWithInfo with loadIpfsFiles
  const loadIpfsFiles = async (backend) => {
    try {
      const ipfsFiles = await backend.list_ipfs_files();
      setFiles(ipfsFiles);
    } catch (error) {
      console.error('Failed to load IPFS files:', error);
      setFiles([]);
    }
  };

  // Handle file input change (multiple)
  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    setSelectedFiles(prev => [...prev, ...files]);
    setPathMap(prev => {
      const newMap = { ...prev };
      files.forEach(f => {
        if (!newMap[f.name]) newMap[f.name] = `/assets/${f.name}`;
      });
      return newMap;
    });
  };

  // Drag and drop handlers
  const handleDrop = (e) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    setSelectedFiles(prev => [...prev, ...files]);
    setPathMap(prev => {
      const newMap = { ...prev };
      files.forEach(f => {
        if (!newMap[f.name]) newMap[f.name] = `/assets/${f.name}`;
      });
      return newMap;
    });
  };
  const handleDragOver = (e) => {
    e.preventDefault();
  };

  // Remove file from selection
  const handleRemoveFile = (name) => {
    setSelectedFiles(prev => prev.filter(f => f.name !== name));
    setPathMap(prev => {
      const newMap = { ...prev };
      delete newMap[name];
      return newMap;
    });
  };

  // Update path for a file
  const handlePathChange = (name, value) => {
    setPathMap(prev => ({ ...prev, [name]: value }));
  };

  // Limited parallel upload queue
  const uploadSingleFile = async (file) => {
    setFileStatus(prev => ({ ...prev, [file.name]: 'Uploading...' }));
    try {
      // 1. Upload to backend /upload endpoint
      const formData = new FormData();
      formData.append('file', file);
      const xhr = new XMLHttpRequest();
      let timedOut = false;
      const uploadPromise = new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          timedOut = true;
          xhr.abort();
          setFileStatus(prev => ({ ...prev, [file.name]: '❌ Upload timed out' }));
          reject(new Error('Upload timed out'));
        }, 60000); // 60s timeout
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const percent = Math.round((event.loaded / event.total) * 100);
            setFileProgress(prev => ({ ...prev, [file.name]: percent }));
          }
        };
        xhr.onload = async () => {
          clearTimeout(timeout);
          if (timedOut) return;
          if (xhr.status === 200) {
            const data = JSON.parse(xhr.responseText);
            if (!data.success) {
              setFileStatus(prev => ({ ...prev, [file.name]: '❌ Upload failed' }));
              reject(new Error(data.error || 'Backend upload failed'));
              return;
            }
            setFileProgress(prev => ({ ...prev, [file.name]: 100 }));
            setFileStatus(prev => ({ ...prev, [file.name]: 'Storing metadata...' }));
            // 2. Store metadata in backend canister
            const backend = backendRef.current;
            if (!backend) {
              setFileStatus(prev => ({ ...prev, [file.name]: '❌ No backend' }));
              reject(new Error('No authenticated backend available'));
              return;
            }
            const result = await backend.add_ipfs_file(
              data.fileName,
              data.ipfsHash,
              BigInt(data.size),
              data.contentType
            );
            if (!result.Ok) {
              setFileStatus(prev => ({ ...prev, [file.name]: '❌ Metadata store failed' }));
              reject(new Error(result.Err || 'Backend metadata store failed'));
              return;
            }
            setFileStatus(prev => ({ ...prev, [file.name]: '✅ Uploaded!' }));
            resolve();
          } else {
            setFileStatus(prev => ({ ...prev, [file.name]: '❌ Upload failed' }));
            reject(new Error('Upload failed'));
          }
        };
        xhr.onerror = () => {
          clearTimeout(timeout);
          setFileStatus(prev => ({ ...prev, [file.name]: '❌ Upload failed' }));
          reject(new Error('Upload failed'));
        };
        xhr.open('POST', 'http://localhost:8787/upload');
        xhr.send(formData);
      });
      await uploadPromise;
    } catch (e) {
      // Error already handled above
    }
  };

  // Limited parallel upload queue
  const handleUpload = async () => {
    if (!isLoggedIn) {
      alert('Please log in to upload files');
      return;
    }
    if (!selectedFiles.length) {
      alert('Please select files');
      return;
    }
    setUploading(true);
    setUploadStatus('Uploading files...');
    setFileProgress({});
    setFileStatus({});
    let queue = [...selectedFiles];
    let active = 0;
    let completed = 0;
    let nextIndex = 0;
    return new Promise((resolve) => {
      const startNext = () => {
        if (nextIndex >= queue.length) {
          if (active === 0) {
            setUploading(false);
            setUploadStatus('✅ All uploads complete!');
            loadIpfsFiles(backendRef.current); // always refresh
            setSelectedFiles([]);
            setPathMap({});
            resolve();
          }
          return;
        }
        const file = queue[nextIndex++];
        active++;
        uploadSingleFile(file).finally(() => {
          active--;
          completed++;
          setUploadStatus(`Uploading files... (${completed}/${queue.length})`);
          startNext();
        });
      };
      for (let i = 0; i < Math.min(3, queue.length); i++) {
        startNext();
      }
    });
  };

  const handleCancelUpload = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setUploading(false);
      setUploadStatus('Upload cancelled');
    }
  };

  // Replace handleDelete to use custom modal
  const handleDelete = (cid) => {
    setDeleteTarget(cid);
    setShowDeleteModal(true);
  };
  const confirmDelete = async () => {
    setShowDeleteModal(false);
    if (!isLoggedIn || !deleteTarget) return;
    setDeleting(deleteTarget);
    try {
      const backend = backendRef.current;
      if (!backend) throw new Error('No authenticated backend available');
      const result = await backend.delete_ipfs_file(deleteTarget);
      if (!result.Ok) throw new Error(result.Err || 'Delete failed');
      await loadIpfsFiles(backend);
    } catch (e) {
      alert('Delete failed: ' + e.message);
    }
    setDeleting('');
    setDeleteTarget(null);
  };
  const cancelDelete = () => {
    setShowDeleteModal(false);
    setDeleteTarget(null);
  };

  // Handler for delete all
  const handleDeleteAll = () => {
    setShowDeleteAllModal(true);
  };
  const confirmDeleteAll = async () => {
    setShowDeleteAllModal(false);
    if (!isLoggedIn || files.length === 0) return;
    setDeleting('all');
    try {
      const backend = backendRef.current;
      if (!backend) throw new Error('No authenticated backend available');
      for (const file of files) {
        await backend.delete_ipfs_file(file.cid);
      }
      await loadIpfsFiles(backend);
    } catch (e) {
      alert('Delete all failed: ' + e.message);
    }
    setDeleting('');
  };
  const cancelDeleteAll = () => {
    setShowDeleteAllModal(false);
  };

  const handleCopyLink = async (url, i) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedIndex(i);
      setTimeout(() => setCopiedIndex(null), 1500);
    } catch (e) {
      alert('Failed to copy link: ' + e.message);
    }
  };

  const handleView = async (cid, contentType) => {
    if (!isLoggedIn) {
      alert('Please log in to view files');
      return;
    }
    
    try {
      // Open IPFS file directly in a new tab
      const ipfsUrl = getAssetUrl(cid);
      window.open(ipfsUrl, '_blank');
    } catch (e) {
      alert('View failed: ' + e.message);
    }
  };

  // Loading skeleton for files
  const filesLoading = isLoggedIn && files.length === 0 && !uploading;

  useEffect(() => {
    if (isLoggedIn && files.length === 0 && !uploading) {
      // Fallback: if loading takes >5s, show empty state anyway
      const timeout = setTimeout(() => setLoadingTimeout(true), 5000);
      return () => clearTimeout(timeout);
    }
    setLoadingTimeout(false);
  }, [isLoggedIn, files.length, uploading]);

  if (!isLoggedIn) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="min-h-screen bg-neutral-950 text-white pt-20">
        <div className="flex items-center justify-center min-h-screen">
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.1 }} className="text-center">
            <div className="w-24 h-24 bg-gradient-to-r from-orange-500 to-orange-800 rounded-full mx-auto mb-6 flex items-center justify-center">
              <Shield className="w-12 h-12 text-white" />
            </div>
            <h1 className="text-4xl font-bold mb-4">Please Log In</h1>
            <p className="text-lg text-neutral-400 mb-8">
              You need to be logged in to access the Dashboard
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
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="min-h-screen bg-neutral-950 text-white pt-20">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 via-transparent to-orange-800/5 z-0"></div>
      {/* SVG Backgrounds for Files Section */}
      <div className="absolute inset-0 pointer-events-none z-0">
        <img src={undrawFolderFiles} alt="Folder Files" className="absolute top-1/3 left-12 w-64 opacity-10 mix-blend-lighten select-none" style={{top: '33%', left: '3%'}} />
      </div>
      <div className="relative z-10 max-w-7xl mx-auto px-6">
        {/* Welcome Section */}
        <motion.section initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="py-10 text-center">
          <motion.div className="bg-gradient-to-r from-orange-500/10 to-orange-800/10 rounded-2xl p-8 border border-orange-500/20 mb-8 shadow-xl shadow-orange-900/10">
            <h1 className="text-4xl font-bold mb-2">Welcome to Your Decentralized CDN!</h1>
            <p className="text-lg text-neutral-400 mb-2">Upload, manage, and deliver your web assets globally, powered by the Internet Computer.</p>
            {principal && (
              <p className="text-sm text-neutral-500 mt-2">
                Logged in as: <span className="font-mono text-orange-400">{principal.toString()}</span>
              </p>
            )}
          </motion.div>
        </motion.section>

        {/* Upload Section */}
        <motion.section id="upload" initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="bg-white/10 dark:bg-neutral-900/40 backdrop-blur-xl rounded-2xl p-8 border border-white/30 dark:border-neutral-700 mb-10 shadow-xl">
          <h2 className="text-2xl font-semibold mb-6 flex items-center gap-2">
            <Upload className="w-6 h-6 text-orange-500" />
            Upload Your Assets
          </h2>
          <div
            className="flex flex-col md:flex-row items-center gap-4 border-2 border-dashed border-orange-500/30 rounded-lg p-4 mb-4 bg-neutral-900/30 hover:bg-orange-900/10 transition-colors duration-200"
            onDrop={handleDrop}
            onDragOver={handleDragOver}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={handleFileChange}
              className="block w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-orange-50 file:text-orange-700 hover:file:bg-orange-100 transition-all duration-200"
            />
            <span className="text-neutral-400 text-sm">or drag and drop files here</span>
            <div className="flex gap-2">
              <motion.button
                onClick={handleUpload}
                disabled={uploading || !selectedFiles.length}
                className="bg-gradient-to-r from-orange-500 to-orange-700 hover:from-orange-600 hover:to-orange-800 px-4 py-2 rounded-lg disabled:opacity-50 transition-all duration-300 flex items-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
                whileHover={{ scale: 1.07 }}
                whileTap={{ scale: 0.97 }}
              >
                <Upload className="w-4 h-4" />
                {uploading ? 'Uploading...' : 'Upload'}
              </motion.button>
              <AnimatePresence>
                {uploading && (
                  <motion.button
                    onClick={handleCancelUpload}
                    className="bg-red-700 hover:bg-red-800 px-4 py-2 rounded-lg transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    Cancel
                  </motion.button>
                )}
              </AnimatePresence>
            </div>
          </div>
          {/* Selected Files List */}
          <AnimatePresence>
            {selectedFiles.length > 0 && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="mt-4 p-4 bg-neutral-800 rounded-lg border border-neutral-700">
                <p className="text-sm text-neutral-300 mb-2 font-semibold">Selected Files:</p>
                <ul className="space-y-2">
                  {selectedFiles.map((file, idx) => (
                    <li key={file.name} className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                      <div className="flex-1">
                        <span className="font-mono text-orange-300">{file.name}</span>
                        <span className="ml-2 text-xs text-neutral-400">({(file.size / 1024 / 1024).toFixed(2)} MB)</span>
                        <input
                          type="text"
                          value={pathMap[file.name] || ''}
                          onChange={e => handlePathChange(file.name, e.target.value)}
                          className="ml-4 bg-neutral-900 px-2 py-1 rounded text-xs text-white border border-neutral-700 w-48"
                          placeholder="/assets/yourfile.png"
                        />
                      </div>
                      <div className="flex flex-col md:flex-row md:items-center gap-2 min-w-[180px]">
                        <div className="w-32">
                          <div className="w-full bg-neutral-700 rounded-full h-2 mb-1">
                            <div
                              className="bg-gradient-to-r from-orange-500 to-orange-700 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${fileProgress[file.name] || 0}%` }}
                            ></div>
                          </div>
                          <div className="text-xs text-neutral-400 text-right">
                            {fileProgress[file.name] ? `${fileProgress[file.name]}%` : ''}
                          </div>
                        </div>
                        <div className="text-xs min-w-[80px] text-neutral-400">
                          {fileStatus[file.name] || 'Pending'}
                        </div>
                        {!uploading && (
                          <button
                            onClick={() => handleRemoveFile(file.name)}
                            className="text-red-400 hover:text-red-300 px-2 py-1 rounded-lg border border-red-400 text-xs"
                            title="Remove file"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
                <p className="text-xs text-neutral-500 mt-2">
                  Supported formats: Images (PNG, JPG, GIF, SVG), Videos (MP4), Documents (PDF), Web (HTML, CSS, JS), Fonts (WOFF, TTF)
                </p>
              </motion.div>
            )}
            {selectedFiles.length > 0 && (
              <button
                onClick={() => {
                  setSelectedFiles([]);
                  setPathMap({});
                  if (fileInputRef.current) fileInputRef.current.value = null;
                }}
                className="ml-2 px-3 py-1 rounded bg-red-700 text-white text-xs hover:bg-red-800 transition-all border border-red-900"
                disabled={uploading}
              >
                Clear All
              </button>
            )}
          </AnimatePresence>
          {/* Upload Progress */}
          <AnimatePresence>
            {uploading && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="mt-4">
                <div className="flex justify-between text-xs text-neutral-500 mt-2">
                  <span>Uploading {selectedFiles.length} file(s)</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          {/* Upload Status */}
          <AnimatePresence>
            {uploadStatus && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className={`mt-2 p-3 rounded-lg ${uploadStatus.includes('✅') ? 'text-green-400 bg-green-900/20 border border-green-500/20' : uploadStatus.includes('❌') ? 'text-red-400 bg-red-900/20 border border-red-500/20' : 'text-orange-400 bg-orange-900/20 border border-orange-500/20'}`}>
                {uploadStatus}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.section>

        {/* IPFS Files List */}
        <motion.section id="assets" initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-white/10 dark:bg-neutral-900/40 backdrop-blur-xl rounded-2xl p-8 border border-white/30 dark:border-neutral-700 mb-10 shadow-xl">
          <h2 className="text-2xl font-semibold mb-6 flex items-center gap-2">
            <FileText className="w-6 h-6 text-orange-500" />
            Your IPFS Files
          </h2>
          {(filesLoading && !loadingTimeout) ? (
            <div className="flex flex-col items-center justify-center min-h-[300px]">
              <div className="animate-spin mb-4"><Cloud className="w-16 h-16 text-neutral-600" /></div>
              <p className="text-neutral-400">Loading files...</p>
            </div>
          ) : files.length === 0 ? (
            <div className="relative flex flex-col items-center justify-center min-h-[300px]">
              <div className="relative z-10 bg-white/10 dark:bg-neutral-900/40 backdrop-blur-xl rounded-2xl p-8 border border-white/30 dark:border-neutral-700 shadow-xl flex flex-col items-center">
                <h3 className="text-2xl font-bold mb-2 text-orange-400">No files uploaded yet</h3>
                <p className="text-neutral-300 mb-4">Upload your first file to get started!</p>
                <button
                  onClick={() => document.getElementById('upload').scrollIntoView({ behavior: 'smooth' })}
                  className="bg-gradient-to-r from-orange-500 to-orange-700 hover:from-orange-600 hover:to-orange-800 px-6 py-2 rounded-lg text-white font-semibold shadow-lg"
                >
                  Upload Now
                </button>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-neutral-700">
                    <th className="py-3 px-4">Name</th>
                    <th className="py-3 px-4">CID</th>
                    <th className="py-3 px-4">Size</th>
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4">
                      <div className="flex items-center justify-between w-full">
                        <span>Actions</span>
                        {files.length > 0 && (
                          <button
                            onClick={handleDeleteAll}
                            className="p-2 rounded-full bg-red-700 hover:bg-red-800 border border-red-900 shadow text-white flex items-center justify-center transition-all ml-8"
                            disabled={deleting === 'all'}
                            title="Delete All Files"
                            aria-label="Delete All Files"
                          >
                            <Trash2 className="w-5 h-5 text-white" />
                          </button>
                        )}
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {files.map((file, i) => {
                    const url = getAssetUrl(file.cid);
                    return (
                      <motion.tr
                        key={i}
                        className="border-b border-neutral-800 hover:bg-orange-500/5 transition-colors duration-200 group"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                      >
                        <td className="py-3 px-4 font-mono">{file.name}</td>
                        <td className="py-3 px-4 font-mono text-xs text-neutral-400">{file.cid.substring(0, 20)}...</td>
                        <td className="py-3 px-4">{(Number(file.size)/1024).toFixed(1)} KB</td>
                        <td className="py-3 px-4">{getFileIcon(file)}</td>
                        <td className="py-3 px-4 flex gap-2 items-center">
                          <motion.button
                            onClick={() => handleView(file.cid, file.content_type)}
                            className="text-orange-400 hover:text-orange-300 bg-transparent border-none cursor-pointer p-2 hover:bg-orange-500/10 rounded-lg transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
                            title="View file"
                            whileHover={{ scale: 1.15 }}
                            whileTap={{ scale: 0.95 }}
                          >
                            <Eye className="w-4 h-4" />
                          </motion.button>
                          <motion.button
                            className="text-neutral-400 hover:text-neutral-300 border px-2 py-1 rounded-lg hover:bg-neutral-800 transition-all duration-200 flex items-center gap-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
                            onClick={() => handleCopyLink(url, i)}
                            aria-label="Copy IPFS link"
                            title="Copy IPFS link"
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.97 }}
                          >
                            <Copy className="w-3 h-3" />
                            {copiedIndex === i ? 'Copied!' : 'Copy'}
                          </motion.button>
                          <motion.button
                            className="text-red-400 hover:text-red-300 border border-red-400 px-2 py-1 rounded-lg hover:bg-red-900/20 disabled:opacity-50 transition-all duration-200 flex items-center gap-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
                            onClick={() => handleDelete(file.cid)}
                            disabled={deleting === file.cid}
                            title="Delete file"
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.97 }}
                          >
                            <Trash2 className="w-3 h-3" />
                            {deleting === file.cid ? 'Deleting...' : 'Delete'}
                          </motion.button>
                        </td>
                      </motion.tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </motion.section>

        {/* Quick Start / Docs */}
        <motion.section id="docs" initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="bg-white/10 dark:bg-neutral-900/40 backdrop-blur-xl rounded-2xl p-8 border border-white/30 dark:border-neutral-700 mb-10 shadow-xl">
          <h2 className="text-2xl font-semibold mb-6 flex items-center gap-2">
            <Zap className="w-6 h-6 text-orange-500" />
            IPFS Quick Links
          </h2>
          <ul className="list-disc pl-6 text-neutral-300 space-y-2">
            <li>How to use: <a href="#" className="text-orange-400 hover:underline">See Docs</a></li>
            <li>IPFS Gateway: <span className="font-mono bg-neutral-800 px-2 py-1 rounded text-sm">https://{PINATA_GATEWAY}/ipfs/</span></li>
            <li>Integration: <span className="font-mono bg-neutral-800 px-2 py-1 rounded text-sm">&lt;img src={`https://${PINATA_GATEWAY}/ipfs/YOUR_CID`} /&gt;</span></li>
          </ul>
        </motion.section>

        {/* Stats Section */}
        <motion.section initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="bg-gradient-to-r from-orange-500/10 to-orange-800/10 rounded-2xl p-8 border border-orange-500/20 mb-10 shadow-xl">
          <h2 className="text-2xl font-semibold mb-6 text-center">IPFS Storage Stats</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="text-4xl font-bold text-orange-500">{files.length}</div>
              <div className="text-neutral-400">Total IPFS Files</div>
            </div>
            <div className="text-center">
              {(() => {
                const used = files.reduce((a, b) => Number(a) + Number(b.size), 0);
                const usedMB = (used / 1024 / 1024).toFixed(2);
                const percent = Math.min((used / PINATA_STORAGE_LIMIT) * 100, 100);
                return (
                  <>
                    <div className="text-4xl font-bold text-orange-500">{usedMB} MB</div>
                    <div className="text-neutral-400 mb-2">Storage Used</div>
                    <div className="w-full bg-neutral-800 rounded-full h-3 mb-1">
                      <div
                        className="bg-gradient-to-r from-orange-500 to-orange-700 h-3 rounded-full transition-all duration-300"
                        style={{ width: `${percent}%` }}
                      ></div>
                    </div>
                    <div className="text-xs text-neutral-400">{usedMB} MB / 1 GB</div>
                  </>
                );
              })()}
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-orange-500">1 GB</div>
              <div className="text-neutral-400">Storage Limit</div>
            </div>
          </div>
        </motion.section>
      </div>
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white/10 dark:bg-neutral-900/60 border border-white/20 dark:border-neutral-700 rounded-2xl shadow-2xl p-8 max-w-sm w-full flex flex-col items-center glassmorphism-modal">
            <Trash2 className="w-12 h-12 text-red-400 mb-4" />
            <h2 className="text-xl font-bold mb-2 text-orange-400">Delete File?</h2>
            <p className="text-neutral-300 mb-6 text-center">Are you sure you want to delete this file? This action cannot be undone.</p>
            <div className="flex gap-4 w-full justify-center">
              <button onClick={confirmDelete} className="bg-gradient-to-r from-red-500 to-orange-700 hover:from-red-600 hover:to-orange-800 px-6 py-2 rounded-lg text-white font-semibold shadow-lg">Delete</button>
              <button onClick={cancelDelete} className="bg-white/20 dark:bg-neutral-800/40 border border-orange-500 px-6 py-2 rounded-lg text-orange-400 font-semibold hover:bg-orange-900/20">Cancel</button>
            </div>
          </div>
        </div>
      )}
      {showDeleteAllModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white/10 dark:bg-neutral-900/60 border border-white/20 dark:border-neutral-700 rounded-2xl shadow-2xl p-8 max-w-sm w-full flex flex-col items-center glassmorphism-modal">
            <Trash2 className="w-12 h-12 text-red-400 mb-4" />
            <h2 className="text-xl font-bold mb-2 text-orange-400">Delete All Files?</h2>
            <p className="text-neutral-300 mb-6 text-center">Are you sure you want to delete <b>all</b> files? This action cannot be undone.</p>
            <div className="flex gap-4 w-full justify-center">
              <button onClick={confirmDeleteAll} className="bg-gradient-to-r from-red-500 to-orange-700 hover:from-red-600 hover:to-orange-800 px-6 py-2 rounded-lg text-white font-semibold shadow-lg">Delete All</button>
              <button onClick={cancelDeleteAll} className="bg-white/20 dark:bg-neutral-800/40 border border-orange-500 px-6 py-2 rounded-lg text-orange-400 font-semibold hover:bg-orange-900/20">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
} 