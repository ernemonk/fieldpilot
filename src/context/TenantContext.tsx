'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { getTenantBranding } from '@/lib/firestore';
import type { TenantBranding } from '@/lib/types';

const DEFAULT_BRANDING: TenantBranding = {
  primaryColor: '#0D9488',   // Teal
  secondaryColor: '#10B981', // Emerald
  businessName: 'Field Pilot',
};

interface TenantContextType {
  tenantId: string | null;
  branding: TenantBranding;
  loading: boolean;
}

const TenantContext = createContext<TenantContextType>({
  tenantId: null,
  branding: DEFAULT_BRANDING,
  loading: true,
});

export function TenantProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [branding, setBranding] = useState<TenantBranding>(DEFAULT_BRANDING);
  const [loading, setLoading] = useState(true);

  const tenantId = user?.tenantId || null;

  useEffect(() => {
    if (!tenantId) {
      setBranding(DEFAULT_BRANDING);
      setLoading(false);
      return;
    }

    const loadBranding = async () => {
      try {
        const b = await getTenantBranding(tenantId);
        if (b) setBranding(b);
        else setBranding(DEFAULT_BRANDING);
      } catch {
        setBranding(DEFAULT_BRANDING);
      }
      setLoading(false);
    };

    loadBranding();
  }, [tenantId]);

  // Inject tenant brand colors as CSS custom properties
  useEffect(() => {
    document.documentElement.style.setProperty('--color-tenant-primary', branding.primaryColor);
    document.documentElement.style.setProperty('--color-tenant-secondary', branding.secondaryColor);
  }, [branding]);

  return (
    <TenantContext.Provider value={{ tenantId, branding, loading }}>
      {children}
    </TenantContext.Provider>
  );
}

export function useTenant() {
  return useContext(TenantContext);
}
