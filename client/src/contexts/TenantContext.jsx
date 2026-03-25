import { createContext, useContext, useEffect } from 'react';
import { useAuth } from './AuthContext';

const TenantContext = createContext(null);

export function TenantProvider({ children }) {
  const { tenant, isLoading, refreshSession } = useAuth();

  // Heartbeat to keep modules / tier synced if changed by Super Admin
  useEffect(() => {
    if (!tenant) return;
    
    // Refresh every 5 minutes to catch background administrative changes
    const interval = setInterval(() => {
      refreshSession?.();
    }, 1000 * 60 * 5);

    return () => clearInterval(interval);
  }, [tenant, refreshSession]);

  const value = {
    tenant,
    isLoading,
    activeModules: tenant?.activeModules || [],
    subscriptionTier: tenant?.subscriptionTier || 'free',
    hasModule: (moduleName) => {
      return tenant?.activeModules?.includes(moduleName) || false;
    },
  };

  return (
    <TenantContext.Provider value={value}>
      {children}
    </TenantContext.Provider>
  );
}

export function useTenant() {
  const context = useContext(TenantContext);
  if (!context) {
    throw new Error('useTenant must be used within a TenantProvider');
  }
  return context;
}

export default TenantContext;
