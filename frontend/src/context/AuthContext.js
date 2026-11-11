'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import authService from '../services/auth.service.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Initialize auth state on mount
  const checkAuth = useCallback(async () => {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      if (token) {
        const response = await authService.getCurrentUser();
        if (response?.data?.user) {
          setUser(response.data.user);
        }
      }
    } catch {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('token');
      }
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  /**
   * Logs in user, persists token, and updates user state.
   */
  const login = async (email, password) => {
    const response = await authService.login({ email, password });
    if (response?.data) {
      const { user: userData, token } = response.data;
      if (typeof window !== 'undefined' && token) {
        localStorage.setItem('token', token);
      }
      setUser(userData);
      return response.data;
    }
    return null;
  };

  /**
   * Registers a new user, sets token, and updates user state.
   */
  const register = async (userData) => {
    const response = await authService.register(userData);
    if (response?.data) {
      const { user: newUser, token } = response.data;
      if (typeof window !== 'undefined' && token) {
        localStorage.setItem('token', token);
      }
      setUser(newUser);
      return response.data;
    }
    return null;
  };

  /**
   * Logs out user, clears token and cookie, and resets user state.
   */
  const logout = async () => {
    try {
      await authService.logout();
    } catch {
      // Continue client cleanup even if network request fails
    } finally {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('token');
      }
      setUser(null);
    }
  };

  /**
   * Optimistically updates user state after profile edit.
   */
  const updateUser = (updatedUser) => {
    setUser(updatedUser);
  };

  const value = {
    user,
    loading,
    isAuthenticated: !!user,
    login,
    register,
    logout,
    updateUser,
    refreshUser: checkAuth,
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
