import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [tenant, setTenant] = useState(null);
  const [permissions, setPermissions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load user session from stored token
  const loadSession = useCallback(async () => {
    // Check for impersonation tokens in URL first!
    const params = new URLSearchParams(window.location.search);
    const urlToken = params.get('token');
    const urlSub = params.get('subdomain');
    
    if (urlToken) {
      console.log('[AuthContext] URL Token found:', urlToken.substring(0, 10) + '...');
      setIsLoading(true); 
      localStorage.setItem('token', urlToken);
      if (urlSub) {
        console.log('[AuthContext] URL Subdomain found:', urlSub);
        localStorage.setItem('tenantSubdomain', urlSub);
      }
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    const token = localStorage.getItem('token');
    const tenantSubdomain = localStorage.getItem('tenantSubdomain');
    
    if (!token) {
      console.log('[AuthContext] No token found in localStorage');
      setIsLoading(false);
      return;
    }
    
    console.log('[AuthContext] Hydrating session for:', tenantSubdomain);
    
    try {
      const { data } = await api.get('/api/me');
      console.log('[AuthContext] Session hydrated successfully:', data.user.email);
      setUser(data.user);
      setTenant(data.tenant);
      setPermissions(data.user.permissions || []);
    } catch (err) {
      console.error('[AuthContext] Session hydration FAILED:', err.response?.status, err.response?.data);
      localStorage.removeItem('token');
      localStorage.removeItem('tenantSubdomain');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSession();
  }, [loadSession]);

  const login = async (email, password, subdomain) => {
    const { data } = await api.post('/api/auth/login', { email, password }, {
      headers: { 'x-tenant-id': subdomain }
    });

    localStorage.setItem('token', data.token);
    localStorage.setItem('tenantSubdomain', subdomain);

    setUser(data.user);
    setTenant(data.tenant);
    setPermissions(data.user.permissions || []);

    return data;
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('tenantSubdomain');
    setUser(null);
    setTenant(null);
    setPermissions([]);
  };

  const hasPermission = (permission) => {
    return permissions.includes(permission) || permissions.includes('*');
  };

  const value = {
    user,
    tenant,
    permissions,
    isLoading,
    isAuthenticated: !!user,
    login,
    logout,
    hasPermission,
    refreshSession: loadSession,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;
