import { createActor as backendCreateActor } from '../../declarations/icp_cdn_backend';

export const canisterId = import.meta.env.CANISTER_ID_ICP_CDN_BACKEND || "uxrrr-q7777-77774-qaaaq-cai";

export function createActor(canisterId, options) {
  return backendCreateActor(canisterId, options);
} 