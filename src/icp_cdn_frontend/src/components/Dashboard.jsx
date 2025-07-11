import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../AuthContext';
import { createActor, canisterId } from '../canister_id_patch';
import { HttpAgent } from '@dfinity/agent';
import { initAuth, getIdentity } from '../auth';
import { Upload, FileText, Trash2, Copy, Eye, Download, Cloud, Zap, Shield } from 'lucide-react';

let assetCanisterId = import.meta.env.VITE_CANISTER_ID_FRONTEND || "u6s2n-gx777-77774-qaaba-cai";
const getAssetUrl = (path) => {
  const filename = path && path.split ? path.split('/').pop() : 'unknown';
  return `http://${assetCanisterId}.localhost:4943/assets/${filename}`;
};

export default function Dashboard() {
  const { principal, isLoggedIn } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState('');
  // Replace assets state with files state
  const [files, setFiles] = useState([]);
  const [file, setFile] = useState(null);
  const [path, setPath] = useState('');
  const [deleting, setDeleting] = useState('');
  const [copiedIndex, setCopiedIndex] = useState(null);
  const backendRef = useRef(null);
  const abortControllerRef = useRef(null);
  
  // Chunk size for uploads (500KB chunks to avoid payload limits)
  const CHUNK_SIZE = 512 * 1024;

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

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      // Auto-generate path if not set
      if (!path) {
        const filename = selectedFile.name;
        setPath(`/assets/${filename}`);
      }
    }
  };

  // Replace handleUpload with Pinata upload + add_ipfs_file
  const handleUpload = async () => {
    if (!isLoggedIn) {
      alert('Please log in to upload files');
      return;
    }
    if (!file) {
      alert('Please select a file');
      return;
    }
    setUploading(true);
    setUploadProgress(0);
    setUploadStatus('Uploading to Pinata...');
    abortControllerRef.current = new AbortController();
    try {
      // 1. Upload to Pinata (assume PinataSDK is available in the frontend)
      const pinata = window.pinata; // You must initialize PinataSDK in the frontend and attach to window
      if (!pinata) throw new Error('Pinata SDK not initialized');
      const pinataFile = new File([file], file.name, { type: file.type });
      const upload = await pinata.upload.public.file(pinataFile);
      setUploadProgress(100);
      setUploadStatus('Pinata upload successful! Storing metadata...');
      // 2. Store metadata in backend
      const backend = backendRef.current;
      if (!backend) throw new Error('No authenticated backend available');
      const result = await backend.add_ipfs_file(
        upload.name,
        upload.cid,
        BigInt(upload.size),
        upload.mime_type
      );
      if (!result.Ok) throw new Error(result.Err || 'Backend metadata store failed');
      setUploadStatus('✅ File uploaded and metadata stored!');
      await loadIpfsFiles(backend);
      setFile(null);
    } catch (e) {
      setUploadStatus('❌ Upload failed: ' + e.message);
      alert('Upload failed: ' + e.message);
    }
    setUploading(false);
    abortControllerRef.current = null;
  };

  const handleCancelUpload = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setUploading(false);
      setUploadStatus('Upload cancelled');
    }
  };

  // Replace handleDelete to use delete_ipfs_file
  const handleDelete = async (cid) => {
    if (!isLoggedIn) {
      alert('Please log in to delete files');
      return;
    }
    setDeleting(cid);
    try {
      const backend = backendRef.current;
      if (!backend) throw new Error('No authenticated backend available');
      const result = await backend.delete_ipfs_file(cid);
      if (!result.Ok) throw new Error(result.Err || 'Delete failed');
      await loadIpfsFiles(backend);
    } catch (e) {
      alert('Delete failed: ' + e.message);
    }
    setDeleting('');
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

  const handleView = async (assetPath, assetType) => {
    if (!isLoggedIn) {
      alert('Please log in to view files');
      return;
    }
    
    try {
      const backend = backendRef.current;
      if (!backend) {
        throw new Error('No authenticated backend available');
      }
      
      // Get asset info first to check size
      const assetInfo = await backend.get_asset_info(assetPath);
      if (!assetInfo || assetInfo.length === 0) {
        alert('Asset not found');
        return;
      }
      
      const fileSize = Number(assetInfo[0][0]); // Convert BigInt to Number
      const maxSyncSize = 5 * 1024 * 1024; // 5MB limit for sync
      
      if (fileSize > maxSyncSize) {
        // For large files, use chunked download
        const filename = assetPath && assetPath.split ? assetPath.split('/').pop() : 'unknown';
        alert(`File is too large (${(fileSize / 1024 / 1024).toFixed(2)} MB) to preview. Starting chunked download...`);
        
        // Get chunk count
        const chunkCountResult = await backend.get_asset_chunk_count(assetPath);
        if (!chunkCountResult.Ok) {
          throw new Error('Failed to get chunk count');
        }
        
        const chunkCount = Number(chunkCountResult.Ok);
        const chunks = [];
        
        // Download all chunks
        for (let i = 0; i < chunkCount; i++) {
          const chunkResult = await backend.get_asset_chunk(assetPath, i);
          if (!chunkResult.Ok) {
            throw new Error(`Failed to download chunk ${i}`);
          }
          chunks.push(...chunkResult.Ok);
        }
        
        // Combine chunks and download
        const blob = new Blob([new Uint8Array(chunks)], { type: assetType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } else {
        // For small files, sync to frontend and open
        const syncResult = await backend.sync_asset_to_frontend(assetPath);
        if (!syncResult.Ok) {
          throw new Error(syncResult.Err || 'Failed to sync asset');
        }
        
        const syncData = syncResult.Ok;
        // Extract base64 data from "SYNC_DATA:path:base64data" format
        const parts = syncData.split(':');
        if (parts.length < 3 || parts[0] !== 'SYNC_DATA') {
          throw new Error('Invalid sync data format');
        }
        const base64Data = parts.slice(2).join(':'); // Rejoin in case base64 contains colons
        const binaryData = atob(base64Data);
        const bytes = new Uint8Array(binaryData.length);
        for (let i = 0; i < binaryData.length; i++) {
          bytes[i] = binaryData.charCodeAt(i);
        }
        
        const blob = new Blob([bytes], { type: assetType });
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
        URL.revokeObjectURL(url);
      }
    } catch (e) {
      alert('View failed: ' + e.message);
    }
  };

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-neutral-950 text-white pt-20">
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="w-24 h-24 bg-gradient-to-r from-orange-500 to-orange-800 rounded-full mx-auto mb-6 flex items-center justify-center">
              <Shield className="w-12 h-12 text-white" />
            </div>
            <h1 className="text-4xl font-bold mb-4">Please Log In</h1>
            <p className="text-lg text-neutral-400 mb-8">
              You need to be logged in to access the Dashboard
            </p>
            <button 
              onClick={() => window.location.href = '/'}
              className="bg-gradient-to-r from-orange-500 to-orange-800 py-3 px-6 rounded-xl font-semibold transition-all duration-300 transform hover:scale-105"
            >
              Go to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-white pt-20">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 via-transparent to-orange-800/5"></div>
      
      <div className="relative z-10 max-w-7xl mx-auto px-6">
        {/* Welcome Section */}
        <section className="py-10 text-center">
          <div className="bg-gradient-to-r from-orange-500/10 to-orange-800/10 rounded-2xl p-8 border border-orange-500/20 mb-8">
            <h1 className="text-4xl font-bold mb-2">Welcome to Your Decentralized CDN!</h1>
            <p className="text-lg text-neutral-400 mb-2">Upload, manage, and deliver your web assets globally, powered by the Internet Computer.</p>
            {principal && (
              <p className="text-sm text-neutral-500 mt-2">
                Logged in as: <span className="font-mono text-orange-400">{principal.toString()}</span>
              </p>
            )}
          </div>
        </section>

        {/* Upload Section */}
        <section id="upload" className="bg-neutral-900/50 backdrop-blur-sm rounded-2xl p-8 border border-neutral-800 mb-10">
          <h2 className="text-2xl font-semibold mb-6 flex items-center gap-2">
            <Upload className="w-6 h-6 text-orange-500" />
            Upload Your Assets
          </h2>
          <div className="flex flex-col md:flex-row items-center gap-4">
            <input type="file" onChange={handleFileChange} className="block w-full text-sm text-gray-400" />
            <input type="text" value={path} onChange={e => setPath(e.target.value)} placeholder="/assets/yourfile.png" className="bg-neutral-800 px-3 py-2 rounded-lg w-full md:w-1/2" />
            <div className="flex gap-2">
              <button onClick={handleUpload} disabled={uploading || !file} className="bg-gradient-to-r from-orange-500 to-orange-700 hover:from-orange-600 hover:to-orange-800 px-4 py-2 rounded-lg disabled:opacity-50 transition-all duration-300 flex items-center gap-2">
                <Upload className="w-4 h-4" />
                {uploading ? 'Uploading...' : 'Upload'}
              </button>
              {uploading && (
                <button onClick={handleCancelUpload} className="bg-red-700 hover:bg-red-800 px-4 py-2 rounded-lg transition-all duration-300">
                  Cancel
                </button>
              )}
            </div>
          </div>
          
          {/* File Info */}
          {file && (
            <div className="mt-4 p-4 bg-neutral-800 rounded-lg border border-neutral-700">
              <p className="text-sm text-neutral-300">
                <strong>File:</strong> {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
              </p>
              <p className="text-sm text-neutral-400">
                {file.size > CHUNK_SIZE ? 
                  `Will use chunked upload (${Math.ceil(file.size / CHUNK_SIZE)} chunks of 500KB each)` : 
                  'Will use single upload'
                }
              </p>
              <p className="text-xs text-neutral-500 mt-1">
                Supported formats: Images (PNG, JPG, GIF, SVG), Videos (MP4), Documents (PDF), Web (HTML, CSS, JS), Fonts (WOFF, TTF)
              </p>
            </div>
          )}
          
          {/* Upload Progress */}
          {uploading && (
            <div className="mt-4">
              <div className="flex justify-between text-sm text-neutral-400 mb-2">
                <span>Progress</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="w-full bg-neutral-800 rounded-full h-2">
                <div 
                  className="bg-gradient-to-r from-orange-500 to-orange-700 h-2 rounded-full transition-all duration-300" 
                  style={{ width: `${uploadProgress}%` }}
                ></div>
              </div>
              {uploading && (
                <div className="flex justify-between text-xs text-neutral-500 mt-2">
                  <span>Chunked Upload Active</span>
                </div>
              )}
            </div>
          )}
          
          {/* Upload Status */}
          {uploadStatus && (
            <div className={`mt-2 p-3 rounded-lg ${uploadStatus.includes('✅') ? 'text-green-400 bg-green-900/20 border border-green-500/20' : uploadStatus.includes('❌') ? 'text-red-400 bg-red-900/20 border border-red-500/20' : 'text-orange-400 bg-orange-900/20 border border-orange-500/20'}`}>
              {uploadStatus}
            </div>
          )}
        </section>

        {/* Assets List / Explorer */}
        <section id="assets" className="bg-neutral-900/50 backdrop-blur-sm rounded-2xl p-8 border border-neutral-800 mb-10">
          <h2 className="text-2xl font-semibold mb-6 flex items-center gap-2">
            <FileText className="w-6 h-6 text-orange-500" />
            Your CDN Files
          </h2>
          {files.length === 0 ? (
            <div className="text-center py-8 text-neutral-400">
              <Cloud className="w-16 h-16 mx-auto mb-4 text-neutral-600" />
              <p>No files uploaded yet. Upload your first file to get started!</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-neutral-700">
                    <th className="py-3 px-4">Path</th>
                    <th className="py-3 px-4">Size</th>
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {files.map((file, i) => {
                    const url = getAssetUrl(file.path);
                    return (
                      <tr key={i} className="border-b border-neutral-800 hover:bg-neutral-800/50 transition-colors duration-200">
                        <td className="py-3 px-4 font-mono">{file.path}</td>
                        <td className="py-3 px-4">{(Number(file.size)/1024).toFixed(1)} KB</td>
                        <td className="py-3 px-4">{file.type}</td>
                        <td className="py-3 px-4 flex gap-2 items-center">
                          <button 
                            onClick={() => handleView(file.path, file.type)} 
                            className="text-orange-400 hover:text-orange-300 bg-transparent border-none cursor-pointer p-2 hover:bg-orange-500/10 rounded-lg transition-all duration-200"
                            title="View file"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            className="text-neutral-400 hover:text-neutral-300 border px-2 py-1 rounded-lg hover:bg-neutral-800 transition-all duration-200 flex items-center gap-1"
                            onClick={() => handleCopyLink(url, i)}
                            aria-label="Copy asset link"
                            title="Copy link"
                          >
                            <Copy className="w-3 h-3" />
                            {copiedIndex === i ? 'Copied!' : 'Copy'}
                          </button>
                          <button 
                            className="text-red-400 hover:text-red-300 border border-red-400 px-2 py-1 rounded-lg hover:bg-red-900/20 disabled:opacity-50 transition-all duration-200 flex items-center gap-1" 
                            onClick={() => handleDelete(file.cid)} 
                            disabled={deleting === file.cid}
                            title="Delete file"
                          >
                            <Trash2 className="w-3 h-3" />
                            {deleting === file.cid ? 'Deleting...' : 'Delete'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Quick Start / Docs */}
        <section id="docs" className="bg-neutral-900/50 backdrop-blur-sm rounded-2xl p-8 border border-neutral-800 mb-10">
          <h2 className="text-2xl font-semibold mb-6 flex items-center gap-2">
            <Zap className="w-6 h-6 text-orange-500" />
            CDN Quick Links
          </h2>
          <ul className="list-disc pl-6 text-neutral-300 space-y-2">
            <li>How to use: <a href="#" className="text-orange-400 hover:underline">See Docs</a></li>
            <li>API Endpoint Example: <span className="font-mono bg-neutral-800 px-2 py-1 rounded text-sm">http://127.0.0.1:4943/?canisterId={canisterId}&asset=/assets/yourfile.png</span></li>
            <li>Integration: <span className="font-mono bg-neutral-800 px-2 py-1 rounded text-sm">&lt;img src={`http://127.0.0.1:4943/?canisterId=${canisterId}&asset=/assets/logo.png`} /&gt;</span></li>
          </ul>
        </section>

        {/* Stats Section */}
        <section className="bg-gradient-to-r from-orange-500/10 to-orange-800/10 rounded-2xl p-8 border border-orange-500/20 mb-10">
          <h2 className="text-2xl font-semibold mb-6 text-center">Network Stats</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="text-4xl font-bold text-orange-500">{files.length}</div>
              <div className="text-neutral-400">Total Assets</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-orange-500">{(files.reduce((a, b) => Number(a) + Number(b.size), 0)/1024).toFixed(1)} KB</div>
              <div className="text-neutral-400">Total Storage Used</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-orange-500">99.99%</div>
              <div className="text-neutral-400">Uptime</div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="text-center py-6 text-neutral-500 border-t border-neutral-800">
          <p>Powered by ICP | <a href="#" className="text-orange-400 hover:underline">GitHub</a> | <a href="#" className="text-orange-400 hover:underline">Docs</a></p>
        </footer>
      </div>
    </div>
  );
} 