import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { initAuth, isAuthenticated, getPrincipal, logout } from './auth';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [principal, setPrincipal] = useState(null);
  const [loading, setLoading] = useState(true);

  const checkAuth = useCallback(async () => {
    try {
      await initAuth();
      const authenticated = await isAuthenticated();
      setIsLoggedIn(authenticated);
      if (authenticated) {
        const userPrincipal = await getPrincipal();
        setPrincipal(userPrincipal);
      } else {
        setPrincipal(null);
      }
    } catch (error) {
      setIsLoggedIn(false);
      setPrincipal(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const handleLogout = async () => {
    try {
      await logout();
      setIsLoggedIn(false);
      setPrincipal(null);
    } catch (error) {
      // ignore
    }
  };

  const value = {
    isLoggedIn,
    principal,
    loading,
    logout: handleLogout,
    forceCheckAuth: checkAuth,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}; 