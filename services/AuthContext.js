// services/AuthContext.js
// KisanSAATHI - Global Authentication State & Session Context

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  getPersistedSession,
  loginUser,
  registerUser,
  logoutUser,
  requestPasswordReset,
  setMandiVerificationStatus,
  USER_ROLES,
} from './authService';
import { auth } from './firebaseConfig';
import { onAuthStateChanged } from 'firebase/auth';

const AuthContext = createContext({
  user: null,
  role: null,
  roleProfile: null,
  isLoading: true,
  login: async () => {},
  register: async () => {},
  logout: async () => {},
  resetPassword: async () => {},
  approveMandi: async () => {},
});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [roleProfile, setRoleProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize and restore session on launch
  useEffect(() => {
    let isMounted = true;

    async function restoreSession() {
      try {
        const session = await getPersistedSession();
        if (session && isMounted) {
          setUser(session.user);
          setRole(session.role);
          setRoleProfile(session.roleProfile);
        }
      } catch (e) {
        console.warn('Error restoring session:', e);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    restoreSession();

    // Listen to Firebase auth state
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser && !user) {
        // Logged out
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  const handleLogin = useCallback(async ({ email, password }) => {
    setIsLoading(true);
    try {
      const session = await loginUser({ email, password });
      setUser(session.user);
      setRole(session.role);
      setRoleProfile(session.roleProfile);
      return session;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleRegister = useCallback(async (params) => {
    setIsLoading(true);
    try {
      const session = await registerUser(params);
      setUser(session.user);
      setRole(session.role);
      setRoleProfile(session.roleProfile);
      return session;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleLogout = useCallback(async () => {
    setIsLoading(true);
    try {
      await logoutUser();
      setUser(null);
      setRole(null);
      setRoleProfile(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleResetPassword = useCallback(async (email) => {
    return await requestPasswordReset(email);
  }, []);

  const handleApproveMandi = useCallback(async (uid, status = 'approved') => {
    const success = await setMandiVerificationStatus(uid, status);
    if (success && user && user.uid === uid) {
      setRoleProfile((prev) => ({
        ...prev,
        verificationStatus: status,
      }));
    }
    return success;
  }, [user]);

  const value = {
    user,
    role,
    roleProfile,
    isLoading,
    login: handleLogin,
    register: handleRegister,
    logout: handleLogout,
    resetPassword: handleResetPassword,
    approveMandi: handleApproveMandi,
    USER_ROLES,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;
