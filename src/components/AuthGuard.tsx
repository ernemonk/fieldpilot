'use client';

import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, ReactNode } from 'react';

export function AuthGuard({ children }: { children: ReactNode }) {
  const { firebaseUser, loading } = useAuth();
  const router = useRouter();
  const hasRedirected = useRef(false);

  useEffect(() => {
    if (!loading && !firebaseUser && !hasRedirected.current) {
      hasRedirected.current = true;
      router.replace('/login');
    }
  }, [firebaseUser, loading, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F8FAFC]">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-gray-300 border-t-teal-600" />
          <p className="text-sm text-gray-500">Loading Field Pilot...</p>
        </div>
      </div>
    );
  }

  if (!firebaseUser) return null;

  return <>{children}</>;
}
