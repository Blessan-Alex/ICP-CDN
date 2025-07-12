const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const { PinataSDK } = require('pinata');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });
const FormData = require('form-data');

// Load environment variables from .env
dotenv.config({ path: '../.env' });

const app = express();
const PORT = process.env.PORT || 8787;

app.use(cors());
app.use(express.json());

console.log('Environment variables loaded:');
console.log('VITE_PINATA_JWT:', process.env.VITE_PINATA_JWT ? 'SET' : 'NOT SET');
console.log('VITE_PINATA_GATEWAY:', process.env.VITE_PINATA_GATEWAY ? 'SET' : 'NOT SET');

// Standard file upload endpoint using Pinata's pinFileToIPFS
app.post('/upload', upload.single('file'), async (req, res) => {
  const pinataJwt = process.env.VITE_PINATA_JWT;
  const pinataGateway = process.env.VITE_PINATA_GATEWAY;
  
  if (!pinataJwt) {
    return res.status(500).json({ error: 'Pinata JWT not configured' });
  }
  
  if (!req.file) {
    return res.status(400).json({ error: 'No file provided' });
  }

  try {
    // Use direct API call to Pinata
    const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
    const form = new FormData();
    form.append('file', req.file.buffer, {
      filename: req.file.originalname,
      contentType: req.file.mimetype
    });
    // Optionally add metadata
    const metadata = {
      name: req.file.originalname,
      keyvalues: {
        contentType: req.file.mimetype,
        uploadedAt: new Date().toISOString()
      }
    };
    form.append('pinataMetadata', JSON.stringify(metadata));
    const response = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${pinataJwt}`,
        ...form.getHeaders()
      },
      body: form
    });
    const data = await response.json();
    if (!data || !data.IpfsHash) {
      throw new Error(data.error || 'Failed to upload file to Pinata');
    }
    const ipfsHash = data.IpfsHash;
    const gatewayUrl = `https://${pinataGateway}/ipfs/${ipfsHash}`;
    res.json({
      success: true,
      ipfsHash: ipfsHash,
      gatewayUrl: gatewayUrl,
      fileName: req.file.originalname,
      contentType: req.file.mimetype,
      size: req.file.size
    });
  } catch (error) {
    console.error('Error uploading to Pinata:', error);
    res.status(500).json({ 
      error: 'Failed to upload file to Pinata',
      details: error.message 
    });
  }
});

// Get file info from IPFS hash
app.get('/file/:hash', async (req, res) => {
  const pinataJwt = process.env.VITE_PINATA_JWT;
  const pinataGateway = process.env.VITE_PINATA_GATEWAY;
  const { hash } = req.params;
  
  if (!pinataJwt) {
    return res.status(500).json({ error: 'Pinata JWT not configured' });
  }

  try {
    const pinata = new PinataSDK({ pinataJwt, pinataGateway });
    
    // Get file metadata from Pinata
    const fileData = await pinata.upload.getPinObject(hash);
    
    res.json({
      success: true,
      ipfsHash: hash,
      gatewayUrl: `https://${pinataGateway}/ipfs/${hash}`,
      metadata: fileData
    });
    
  } catch (error) {
    console.error('Error getting file info:', error);
    res.status(500).json({ 
      error: 'Failed to get file info from Pinata',
      details: error.message 
    });
  }
});

// List all pinned files
app.get('/files', async (req, res) => {
  const pinataJwt = process.env.VITE_PINATA_JWT;
  const pinataGateway = process.env.VITE_PINATA_GATEWAY;
  
  if (!pinataJwt) {
    return res.status(500).json({ error: 'Pinata JWT not configured' });
  }

  try {
    const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
    const response = await fetch('https://api.pinata.cloud/data/pinList?status=pinned', {
      headers: {
        'Authorization': `Bearer ${pinataJwt}`
      }
    });
    const data = await response.json();
    if (!data || !data.rows) {
      throw new Error('Invalid response from Pinata');
    }
    // Transform the data to include gateway URLs
    const files = data.rows.map(pin => ({
      ipfsHash: pin.ipfs_pin_hash,
      gatewayUrl: `https://${pinataGateway}/ipfs/${pin.ipfs_pin_hash}`,
      name: pin.metadata?.name || 'Unknown',
      size: pin.size,
      timestamp: pin.date_pinned
    }));
    res.json({
      success: true,
      files: files,
      total: data.count || files.length
    });
  } catch (error) {
    console.error('Error listing files:', error);
    res.status(500).json({ 
      error: 'Failed to list files from Pinata',
      details: error.message 
    });
  }
});

// Delete file from Pinata
app.delete('/file/:hash', async (req, res) => {
  const pinataJwt = process.env.VITE_PINATA_JWT;
  const { hash } = req.params;
  
  if (!pinataJwt) {
    return res.status(500).json({ error: 'Pinata JWT not configured' });
  }

  try {
    const pinata = new PinataSDK({ pinataJwt });
    
    // Unpin the file from Pinata (use pinata.unpin, not pinata.upload.unpin)
    await pinata.unpin(hash);
    
    res.json({
      success: true,
      message: `File ${hash} unpinned from Pinata`
    });
    
  } catch (error) {
    console.error('Error unpinning file:', error);
    res.status(500).json({ 
      error: 'Failed to unpin file from Pinata',
      details: error.message 
    });
  }
});

app.listen(PORT, () => {
  console.log(`Pinata backend server running on http://localhost:${PORT}`);
  console.log('Available endpoints:');
  console.log('  POST /upload - Upload file to IPFS via Pinata');
  console.log('  GET /files - List all pinned files');
  console.log('  GET /file/:hash - Get file info by IPFS hash');
  console.log('  DELETE /file/:hash - Unpin file from Pinata');
}); 