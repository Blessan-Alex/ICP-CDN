// Usage: node upload_to_asset_canister.js /path/to/your/file.png
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

if (process.argv.length < 3) {
  console.error('Usage: node upload_to_asset_canister.js /path/to/your/file');
  process.exit(1);
}

const srcFile = process.argv[2];
const filename = path.basename(srcFile);
const destDir = path.join(__dirname, 'src', 'icp_cdn_frontend', 'dist', 'assets');
const destFile = path.join(destDir, filename);

if (!fs.existsSync(srcFile)) {
  console.error('Source file does not exist:', srcFile);
  process.exit(1);
}

if (!fs.existsSync(destDir)) {
  fs.mkdirSync(destDir, { recursive: true });
}

fs.copyFileSync(srcFile, destFile);
console.log('Copied', srcFile, 'to', destFile);

console.log('Deploying asset canister...');
try {
  execSync('dfx deploy icp_cdn_frontend', { stdio: 'inherit' });
} catch (e) {
  console.error('dfx deploy failed');
  process.exit(1);
}

// Get canister ID
const canisterIdsPath = path.join(__dirname, '.dfx', 'local', 'canister_ids.json');
let canisterId = '';
if (fs.existsSync(canisterIdsPath)) {
  const ids = JSON.parse(fs.readFileSync(canisterIdsPath, 'utf8'));
  canisterId = ids.icp_cdn_frontend.local || ids.icp_cdn_frontend;
}
if (!canisterId) {
  try {
    canisterId = execSync('dfx canister id icp_cdn_frontend').toString().trim();
  } catch (e) {
    console.error('Could not get canister ID');
    process.exit(1);
  }
}

const url = `http://${canisterId}.localhost:4943/assets/${filename}`;
console.log('Your file is now available at:');
console.log(url); 