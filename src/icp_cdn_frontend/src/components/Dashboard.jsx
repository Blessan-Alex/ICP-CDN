import React, { useState, useEffect } from 'react';
import logo from '../assets/logo.png';
// Import createActor and canisterId from the generated declarations
import { createActor, canisterId } from '../canister_id_patch';

const backend = createActor(canisterId, {
  agentOptions: {
    host: "http://127.0.0.1:4943"
  }
});

const getAssetUrl = (path) => `http://${canisterId}.localhost:4943${path}`;

export default function Dashboard() {
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('');
  const [assets, setAssets] = useState([]);
  const [file, setFile] = useState(null);
  const [path, setPath] = useState('');
  const [deleting, setDeleting] = useState('');
  const [copiedIndex, setCopiedIndex] = useState(null);

  // Fetch asset list on mount
  useEffect(() => {
    fetchAssets();
  }, []);

  async function fetchAssets() {
    try {
      const assetPaths = await backend.list_assets();
      const assetInfos = await Promise.all(
        assetPaths.map(async (p) => {
          const info = await backend.get_asset_info(p);
          return {
            path: p,
            size: info && info.length > 0 ? info[0][0] : 0,
            type: info && info.length > 0 ? info[0][1] : 'unknown',
          };
        })
      );
      setAssets(assetInfos);
    } catch (e) {
      setAssets([]);
    }
  }

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
    setPath(e.target.files[0] ? `/assets/${e.target.files[0].name}` : '');
  };

  const handleUpload = async () => {
    if (!file || !path) return;
    setUploading(true);
    setUploadStatus('Uploading...');
    try {
      const arrayBuffer = await file.arrayBuffer();
      const content = Array.from(new Uint8Array(arrayBuffer));
      const result = await backend.upload_asset(path, content);
      if (result.Ok) {
        setUploadStatus('Upload successful!');
        await fetchAssets();
      } else {
        setUploadStatus('Upload failed: ' + (result.Err || 'Unknown error'));
      }
    } catch (e) {
      setUploadStatus('Upload failed: ' + e.message);
    }
    setUploading(false);
  };

  const handleDelete = async (assetPath) => {
    setDeleting(assetPath);
    try {
      const result = await backend.delete_asset(assetPath);
      if (result.Ok) {
        setAssets(assets.filter(a => a.path !== assetPath));
      } else {
        alert('Delete failed: ' + (result.Err || 'Unknown error'));
      }
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

  return (
    <div className="min-h-screen bg-neutral-950 text-white">
      {/* Header */}
      <nav className="flex items-center justify-between px-8 py-4 border-b border-neutral-800">
        <div className="flex items-center">
          <img src={logo} alt="Logo" className="h-10 w-10 mr-3" />
          <span className="text-2xl font-bold tracking-tight">dCDN Dashboard</span>
        </div>
        <div className="flex space-x-8">
          <a href="#" className="hover:underline">Home</a>
          <a href="#upload" className="hover:underline">Upload</a>
          <a href="#assets" className="hover:underline">Assets</a>
          <a href="#docs" className="hover:underline">Docs</a>
        </div>
        <div>
          <button className="bg-gradient-to-r from-orange-500 to-orange-800 px-4 py-2 rounded-md">Sign In</button>
        </div>
      </nav>

      {/* Welcome Section */}
      <section className="py-10 px-8 text-center">
        <h1 className="text-4xl font-bold mb-2">Welcome to Your Decentralized CDN!</h1>
        <p className="text-lg text-neutral-400 mb-2">Upload, manage, and deliver your web assets globally, powered by the Internet Computer.</p>
        <p className="text-sm text-neutral-500">(User info and principal will appear here after sign in.)</p>
      </section>

      {/* Upload Section */}
      <section id="upload" className="max-w-2xl mx-auto bg-neutral-900 rounded-lg p-8 shadow mb-10">
        <h2 className="text-2xl font-semibold mb-4">📤 Upload Your Assets</h2>
        <div className="flex flex-col md:flex-row items-center gap-4">
          <input type="file" onChange={handleFileChange} className="block w-full text-sm text-gray-400" />
          <input type="text" value={path} onChange={e => setPath(e.target.value)} placeholder="/assets/yourfile.png" className="bg-neutral-800 px-3 py-2 rounded w-full md:w-1/2" />
          <button onClick={handleUpload} disabled={uploading || !file} className="bg-orange-700 px-4 py-2 rounded disabled:opacity-50">Upload</button>
        </div>
        {uploadStatus && <div className="mt-2 text-green-400">{uploadStatus}</div>}
      </section>

      {/* Assets List / Explorer */}
      <section id="assets" className="max-w-4xl mx-auto bg-neutral-900 rounded-lg p-8 shadow mb-10">
        <h2 className="text-2xl font-semibold mb-4">📁 Your CDN Files</h2>
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-neutral-700">
              <th className="py-2">Path</th>
              <th className="py-2">Size</th>
              <th className="py-2">Type</th>
              <th className="py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {assets.map((asset, i) => {
              const url = getAssetUrl(asset.path);
              return (
                <tr key={i} className="border-b border-neutral-800 hover:bg-neutral-800">
                  <td className="py-2 font-mono">{asset.path}</td>
                  <td className="py-2">{(Number(asset.size)/1024).toFixed(1)} KB</td>
                  <td className="py-2">{asset.type}</td>
                  <td className="py-2 flex gap-2 items-center">
                    <a href={url} target="_blank" rel="noopener noreferrer" className="text-orange-400 hover:underline">View</a>
                    <button
                      className="text-xs text-neutral-400 border px-2 py-1 rounded hover:bg-neutral-800"
                      onClick={() => handleCopyLink(url, i)}
                      aria-label="Copy asset link"
                    >
                      {copiedIndex === i ? 'Copied!' : 'Copy Link'}
                    </button>
                    <button className="text-xs text-red-400 border border-red-400 px-2 py-1 rounded hover:bg-red-900 disabled:opacity-50" onClick={() => handleDelete(asset.path)} disabled={deleting === asset.path}>{deleting === asset.path ? 'Deleting...' : 'Delete'}</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      {/* Quick Start / Docs */}
      <section id="docs" className="max-w-2xl mx-auto bg-neutral-900 rounded-lg p-8 shadow mb-10">
        <h2 className="text-2xl font-semibold mb-4">🌐 CDN Quick Links</h2>
        <ul className="list-disc pl-6 text-neutral-300">
          <li>How to use: <a href="#" className="text-orange-400 hover:underline">See Docs</a></li>
          <li>API Endpoint Example: <span className="font-mono">http://127.0.0.1:4943/?canisterId={canisterId}&asset=/assets/yourfile.png</span></li>
          <li>Integration: <span className="font-mono">&lt;img src={`http://127.0.0.1:4943/?canisterId=${canisterId}&asset=/assets/logo.png`} /&gt;</span></li>
        </ul>
      </section>

      {/* Stats Section (Optional) */}
      <section className="max-w-2xl mx-auto bg-neutral-900 rounded-lg p-8 shadow mb-10">
        <h2 className="text-2xl font-semibold mb-4">📊 Network Stats</h2>
        <div className="flex flex-wrap gap-8">
          <div className="flex-1">
            <div className="text-3xl font-bold">{assets.length}</div>
            <div className="text-neutral-400">Total Assets</div>
          </div>
          <div className="flex-1">
            <div className="text-3xl font-bold">{(assets.reduce((a, b) => Number(a) + Number(b.size), 0)/1024).toFixed(1)} KB</div>
            <div className="text-neutral-400">Total Storage Used</div>
          </div>
          <div className="flex-1">
            <div className="text-3xl font-bold">99.99%</div>
            <div className="text-neutral-400">Uptime</div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="text-center py-6 text-neutral-500 border-t border-neutral-800">
        Powered by ICP | <a href="#" className="text-orange-400 hover:underline">GitHub</a> | <a href="#" className="text-orange-400 hover:underline">Docs</a>
      </footer>
    </div>
  );
} 