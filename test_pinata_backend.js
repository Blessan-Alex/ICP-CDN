import { PinataSDK } from "pinata";
import fetch from "node-fetch";
import fs from "fs";
import { execSync } from "child_process";

const PINATA_JWT = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySW5mb3JtYXRpb24iOnsiaWQiOiIyZDhiYzBiNC0xNjllLTQzNzQtOTI5Yy05ZmJhNjEwODNmMTciLCJlbWFpbCI6ImtoYXRyaXNha3NoaTMwMDNAZ21haWwuY29tIiwiZW1haWxfdmVyaWZpZWQiOnRydWUsInBpbl9wb2xpY3kiOnsicmVnaW9ucyI6W3siZGVzaXJlZFJlcGxpY2F0aW9uQ291bnQiOjEsImlkIjoiRlJBMSJ9LHsiZGVzaXJlZFJlcGxpY2F0aW9uQ291bnQiOjEsImlkIjoiTllDMSJ9XSwidmVyc2lvbiI6MX0sIm1mYV9lbmFibGVkIjpmYWxzZSwic3RhdHVzIjoiQUNUSVZFIn0sImF1dGhlbnRpY2F0aW9uVHlwZSI6InNjb3BlZEtleSIsInNjb3BlZEtleUtleSI6IjdjN2FjMjY3YTdhMzU2ZWVmN2Y3Iiwic2NvcGVkS2V5U2VjcmV0IjoiODE2ZjMyZjk4NTFjY2Q1YzZmNjhlNjQzMDA2NjZlZGQ4MzkxMTEzY2RkMDhhMjMzNDdkZmMzY2NhMDNlOTU1NCIsImV4cCI6MTc4Mzc4MTcwOH0.Qv8HE9i-HPBOJ2jvtnrlEGnttG6kIEUQ-SaKz4AznwE";
const PINATA_GATEWAY = "black-defensive-zebra-94.mypinata.cloud";
const BACKEND_CANISTER = "icp_cdn_backend";

async function uploadToPinata() {
  const pinata = new PinataSDK({
    pinataJwt: PINATA_JWT,
    pinataGateway: PINATA_GATEWAY,
  });
  const fileBuffer = fs.readFileSync("README.md");
  const file = new File([fileBuffer], "README.md", { type: "text/markdown" });
  const upload = await pinata.upload.public.file(file);
  console.log("Pinata upload result:", upload);
  return upload;
}

function addIpfsFileToBackend({ name, cid, size, mime_type }) {
  const candid = `("${name}", "${cid}", ${size}, "${mime_type}")`;
  const cmd = `dfx canister call ${BACKEND_CANISTER} add_ipfs_file '${candid}'`;
  const result = execSync(cmd).toString();
  console.log("Backend add_ipfs_file result:", result);
}

function listIpfsFilesFromBackend() {
  const cmd = `dfx canister call ${BACKEND_CANISTER} list_ipfs_files`;
  const result = execSync(cmd).toString();
  console.log("Backend list_ipfs_files result:", result);
}

function deleteIpfsFileFromBackend(cid) {
  const candid = `("${cid}")`;
  const cmd = `dfx canister call ${BACKEND_CANISTER} delete_ipfs_file '${candid}'`;
  const result = execSync(cmd).toString();
  console.log("Backend delete_ipfs_file result:", result);
}

(async () => {
  try {
    // 1. Upload to Pinata
    const upload = await uploadToPinata();
    // 2. Add to backend
    addIpfsFileToBackend({
      name: upload.name,
      cid: upload.cid,
      size: upload.size,
      mime_type: upload.mime_type,
    });
    // 3. List files
    listIpfsFilesFromBackend();
    // 4. Delete file
    deleteIpfsFileFromBackend(upload.cid);
    // 5. List files again
    listIpfsFilesFromBackend();
  } catch (err) {
    console.error(err);
  }
})(); 