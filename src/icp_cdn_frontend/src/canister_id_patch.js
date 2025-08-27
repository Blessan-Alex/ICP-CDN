import { createActor as backendCreateActor } from '../../declarations/icp_cdn_backend';

console.log('Environment variables available:', import.meta.env);
console.log('VITE_CANISTER_ID_BACKEND:', import.meta.env.VITE_CANISTER_ID_BACKEND);

export const canisterId = import.meta.env.VITE_CANISTER_ID_BACKEND || "uxrrr-q7777-77774-qaaaq-cai";

console.log('Using canister ID:', canisterId);

export function createActor(canisterId, options) {
  return backendCreateActor(canisterId, options);
} 