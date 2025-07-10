const fs = require('fs');
const { HttpAgent, Actor } = require('@dfinity/agent');
const { IDL } = require('@dfinity/candid');

// CONFIGURE THESE:
const canisterId = 'ulvla-h7777-77774-qaacq-cai'; // your backend canister ID
const filePath = './asset.png'; // path to your file
const assetPath = '/assets/asset.png'; // path in canister

const CHUNK_SIZE = 1024 * 1024; // 1MB

// Candid interface for chunked upload
const idlFactory = ({ IDL }) => IDL.Service({
  start_upload: IDL.Func([IDL.Text], [IDL.Variant({ Ok: IDL.Text, Err: IDL.Text })], []),
  upload_chunk: IDL.Func([IDL.Text, IDL.Vec(IDL.Nat8)], [IDL.Variant({ Ok: IDL.Text, Err: IDL.Text })], []),
  commit_upload: IDL.Func([IDL.Text], [IDL.Variant({ Ok: IDL.Text, Err: IDL.Text })], []),
  abort_upload: IDL.Func([IDL.Text], [IDL.Variant({ Ok: IDL.Text, Err: IDL.Text })], []),
});

async function main() {
  const agent = new HttpAgent({ host: 'http://127.0.0.1:4943' });
  if (process.env.DFX_NETWORK === 'local' || process.env.NODE_ENV !== 'production') {
    await agent.fetchRootKey();
  }
  const backend = Actor.createActor(idlFactory, { agent, canisterId });

  // 1. Start upload session
  console.log('Starting upload...');
  let res = await backend.start_upload(assetPath);
  if (res.Err) throw new Error(res.Err);

  // 2. Read file and upload in chunks
  const fileBuffer = fs.readFileSync(filePath);
  let offset = 0;
  while (offset < fileBuffer.length) {
    const chunk = fileBuffer.slice(offset, offset + CHUNK_SIZE);
    console.log(`Uploading chunk at offset ${offset} (${chunk.length} bytes)`);
    res = await backend.upload_chunk(assetPath, Array.from(chunk));
    if (res.Err) throw new Error(res.Err);
    offset += CHUNK_SIZE;
  }

  // 3. Commit upload
  console.log('Committing upload...');
  res = await backend.commit_upload(assetPath);
  if (res.Err) throw new Error(res.Err);

  console.log('Upload complete!');
}

main().catch(e => {
  console.error('Upload failed:', e);
}); 