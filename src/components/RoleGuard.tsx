'use client';

import { ReactNode } from 'react';
import { useAuth } from '@/context/AuthContext';
import type { UserRole } from '@/lib/types';

interface RoleGuardProps {
  children: ReactNode;
  allowedRoles: UserRole[];
  fallback?: ReactNode;
}

export function RoleGuard({ children, allowedRoles, fallback }: RoleGuardProps) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-teal-600" />
      </div>
    );
  }

  if (!user || !allowedRoles.includes(user.role)) {
    return fallback ? (
      <>{fallback}</>
    ) : (
      <div className="flex flex-col items-center justify-center p-12 text-center">
        <h2 className="text-xl font-semibold text-gray-900">Access Denied</h2>
        <p className="mt-2 text-sm text-gray-500">
          You don&apos;t have permission to view this page.
        </p>
      </div>
    );
  }

  return <>{children}</>;
}

export function useHasRole(...roles: UserRole[]): boolean {
  const { user } = useAuth();
  return !!user && roles.includes(user.role);
}

export function useIsOwner(): boolean {
  return useHasRole('owner');
}

export function useIsAdmin(): boolean {
  return useHasRole('owner', 'admin');
}

export function useIsOperator(): boolean {
  return useHasRole('operator');
}

export function useIsClient(): boolean {
  return useHasRole('client');
}
