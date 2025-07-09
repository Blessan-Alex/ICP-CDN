import { createActor as backendCreateActor } from '../../declarations/icp_cdn_backend';

// Hardcode your backend canister ID here:
export const canisterId = "ulvla-h7777-77774-qaacq-cai"; // <-- update as needed

export function createActor(canisterId, options) {
  return backendCreateActor(canisterId, options);
} 