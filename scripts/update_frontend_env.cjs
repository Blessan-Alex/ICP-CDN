// This file should be renamed to update_frontend_env.cjs to work with require() in a 'type: module' project.
// No code change needed, just rename the file.
const fs = require('fs');
const path = require('path');

const idsPath = path.join(__dirname, '../.dfx/local/canister_ids.json');
const envPath = path.join(__dirname, '../src/icp_cdn_frontend/.env');
const envExamplePath = path.join(__dirname, '../src/icp_cdn_frontend/.envexample');

if (!fs.existsSync(idsPath)) {
  console.error('Canister IDs file not found:', idsPath);
  process.exit(1);
}
const ids = JSON.parse(fs.readFileSync(idsPath, 'utf8'));

// If .env does not exist, copy from .envexample
if (!fs.existsSync(envPath) && fs.existsSync(envExamplePath)) {
  fs.copyFileSync(envExamplePath, envPath);
  console.log('.env file created from .envexample');
}

// Read existing .env
let envContent = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';

// Replace or add the canister ID lines
function setOrReplace(key, value, content) {
  const regex = new RegExp(`^${key}=.*$`, 'm');
  if (content.match(regex)) {
    return content.replace(regex, `${key}=${value}`);
  } else {
    return content.trim() + `\n${key}=${value}`;
  }
}

envContent = setOrReplace('VITE_CANISTER_ID_BACKEND', ids.icp_cdn_backend.local, envContent);
envContent = setOrReplace('VITE_CANISTER_ID_FRONTEND', ids.icp_cdn_frontend.local, envContent);
envContent = setOrReplace('VITE_CANISTER_ID_INTERNET_IDENTITY', ids.internet_identity.local, envContent);

fs.writeFileSync(envPath, envContent.trim() + '\n');
console.log('Updated src/icp_cdn_frontend/.env with latest canister IDs.'); 