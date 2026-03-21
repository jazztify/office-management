import { createContext, useContext } from 'react';
import { useAuth } from './AuthContext';

const TenantContext = createContext(null);

export function TenantProvider({ children }) {
  const { tenant, isLoading } = useAuth();

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
