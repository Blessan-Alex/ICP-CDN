import { createActor as backendCreateActor } from '../../declarations/icp_cdn_backend';

console.log('Environment variables available:', import.meta.env);
console.log('CANISTER_ID_ICP_CDN_BACKEND:', import.meta.env.CANISTER_ID_ICP_CDN_BACKEND);

export const canisterId = import.meta.env.CANISTER_ID_ICP_CDN_BACKEND || "uxrrr-q7777-77774-qaaaq-cai";

console.log('Using canister ID:', canisterId);

export function createActor(canisterId, options) {
  return backendCreateActor(canisterId, options);
} 