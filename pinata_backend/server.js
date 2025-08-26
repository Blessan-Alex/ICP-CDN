import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import multer from 'multer';
import FormData from 'form-data';

dotenv.config({ path: '../.env' });

const app = express();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });
app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

app.post('/upload-ciphertext', upload.single('file'), async (req, res) => {
  try {
    const pinataJwt = process.env.VITE_PINATA_JWT;
    const pinataGateway = process.env.VITE_PINATA_GATEWAY;
    if (!pinataJwt) return res.status(500).json({ error: 'Pinata JWT not configured' });
    const filePart = req.file;
    if (!filePart) return res.status(400).json({ error: 'No file provided' });

    // metadata should come as a regular text field
    let metaRaw = req.body?.metadata;
    if (!metaRaw) return res.status(400).json({ error: 'Missing metadata' });
    let metadata;
    try { metadata = typeof metaRaw === 'string' ? JSON.parse(metaRaw) : metaRaw; } catch { return res.status(400).json({ error: 'Invalid metadata JSON' }); }

    const fetch = (await import('node-fetch')).default;
    const form = new FormData();
    form.append('file', filePart.buffer, { filename: metadata?.originalName ? `${metadata.originalName}.enc` : 'file.enc', contentType: 'application/octet-stream' });
    const up = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', { method: 'POST', headers: { Authorization: `Bearer ${pinataJwt}`, ...form.getHeaders() }, body: form });
    const upJson = await up.json();
    if (!up.ok || !upJson.IpfsHash) return res.status(502).json({ error: 'Pinata ciphertext upload failed', details: upJson });

    const metaWithCt = { ...metadata, ciphertextCid: upJson.IpfsHash };
    const metaResp = await fetch('https://api.pinata.cloud/pinning/pinJSONToIPFS', { method: 'POST', headers: { Authorization: `Bearer ${pinataJwt}`, 'Content-Type': 'application/json' }, body: JSON.stringify(metaWithCt) });
    const metaJson = await metaResp.json();
    if (!metaResp.ok || !metaJson.IpfsHash) return res.status(502).json({ error: 'Pinata metadata upload failed', details: metaJson });

    return res.json({ success: true, ciphertextHash: upJson.IpfsHash, ciphertextUrl: `https://${pinataGateway}/ipfs/${upJson.IpfsHash}`, metadataHash: metaJson.IpfsHash, metadataUrl: `https://${pinataGateway}/ipfs/${metaJson.IpfsHash}` });
  } catch (e) {
    console.error('Error /upload-ciphertext', e);
    return res.status(500).json({ error: 'Server error' });
  }
});

app.get('/health', (_req, res) => res.json({ ok: true }));

const PORT = process.env.PORT || 8787;
app.listen(PORT, () => {
  console.log(`Pinata backend server running on http://localhost:${PORT}`);
  console.log('POST /upload-ciphertext');
});


