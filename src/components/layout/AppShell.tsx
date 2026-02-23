'use client';

import { ReactNode, useState } from 'react';
import { Topbar } from './Topbar';
import { Sidebar } from './Sidebar';
import { AuthGuard } from '@/components/AuthGuard';

export function AppShell({ children }: { children: ReactNode }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <AuthGuard>
      <div className="flex h-screen bg-[#F4F4F8]">
        {/* Mobile overlay */}
        {mobileMenuOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
            onClick={() => setMobileMenuOpen(false)}
          />
        )}
        {/* Sidebar — hidden on mobile, slides in when mobileMenuOpen */}
        <div
          className={`fixed inset-y-0 left-0 z-50 transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0 ${
            mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <Sidebar onNavigate={() => setMobileMenuOpen(false)} />
        </div>
        <div className="flex flex-1 flex-col overflow-hidden">
          <Topbar onMenuToggle={() => setMobileMenuOpen(!mobileMenuOpen)} />
          <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">{children}</main>
        </div>
      </div>
    </AuthGuard>
  );
}
