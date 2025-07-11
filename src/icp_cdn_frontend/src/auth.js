import { AuthClient } from '@dfinity/auth-client';
import { HttpAgent } from '@dfinity/agent';

let INTERNET_IDENTITY_CANISTER_ID = import.meta.env.VITE_CANISTER_ID_INTERNET_IDENTITY || "uzt4z-lp777-77774-qaabq-cai";

let authClient = null;

export const initAuth = async () => {
  if (!authClient) {
    authClient = await AuthClient.create({
      idleOptions: {
        disableDefaultIdleCallback: true,
        disableIdle: true,
      },
    });
  }
  return authClient;
};

export const login = async () => {
  const authClient = await initAuth();
  
  return new Promise((resolve, reject) => {
    authClient.login({
      identityProvider: import.meta.env.VITE_DFX_NETWORK === 'ic' 
        ? 'https://identity.ic0.app' 
        : `http://${INTERNET_IDENTITY_CANISTER_ID}.localhost:4943`,
      onSuccess: () => {
        const identity = authClient.getIdentity();
        resolve(identity);
      },
      onError: (error) => {
        reject(error);
      },
    });
  });
};

export const logout = async () => {
  const authClient = await initAuth();
  await authClient.logout();
};

export const isAuthenticated = async () => {
  const authClient = await initAuth();
  return authClient.isAuthenticated();
};

export const getIdentity = async () => {
  const authClient = await initAuth();
  return authClient.getIdentity();
};

export const getPrincipal = async () => {
  const identity = await getIdentity();
  return identity ? identity.getPrincipal() : null;
}; 