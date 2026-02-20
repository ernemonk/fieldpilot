'use client';

import { usePathname } from 'next/navigation';
import { Bell, ChevronDown, LogOut } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useState, useRef, useEffect } from 'react';

const PAGE_TITLES: Record<string, string> = {
  '/dashboard':   'Dashboard',
  '/jobs':        'Jobs',
  '/clients':     'Clients',
  '/proposals':   'Proposals',
  '/sessions':    'Work Sessions',
  '/incidents':   'Incidents',
  '/ai/proposal': 'AI Proposal',
  '/ai/incident': 'AI Incident Report',
  '/settings':    'Settings',
};

function getPageTitle(pathname: string): string {
  for (const [key, label] of Object.entries(PAGE_TITLES)) {
    if (pathname.startsWith(key)) return label;
  }
  return 'Field Pilot';
}

export function Topbar() {
  const { user, signOut } = useAuth();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const pageTitle = getPageTitle(pathname);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <header className="flex h-16 items-center justify-between border-b border-[#EBEBF2] bg-white/80 px-6 backdrop-blur-sm">
      {/* Page title */}
      <h1 className="text-[15px] font-semibold tracking-tight text-[#12121F]">{pageTitle}</h1>

      {/* Right side */}
      <div className="flex items-center gap-1">
        {/* Bell */}
        <button className="relative rounded-xl p-2 text-[#8888A0] transition-colors hover:bg-[#F5F5FA]">
          <Bell className="h-[18px] w-[18px]" />
          <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-rose-500 shadow-[0_0_4px_rgba(239,68,68,0.7)]" />
        </button>

        {/* Divider */}
        <div className="mx-1 h-5 w-px bg-[#E8E8F0]" />

        {/* Profile dropdown */}
        <div ref={menuRef} className="relative">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="flex items-center gap-2.5 rounded-xl px-2.5 py-1.5 transition-colors hover:bg-[#F5F5FA]"
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-teal-100 text-[11px] font-bold text-teal-600">
              {user?.displayName?.[0]?.toUpperCase() ?? 'U'}
            </div>
            <span className="hidden text-[13px] font-medium text-[#32324A] sm:block">
              {user?.displayName}
            </span>
            <ChevronDown className="h-3.5 w-3.5 text-[#9999B3]" />
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-full z-50 mt-2 w-52 overflow-hidden rounded-2xl bg-white shadow-xl ring-1 ring-black/[0.06]">
              <div className="border-b border-[#F0F0F8] px-4 py-3">
                <p className="text-[13px] font-semibold text-[#12121F]">{user?.displayName}</p>
                <p className="text-[11px] capitalize text-[#9999B3]">{user?.role}</p>
              </div>
              <div className="p-1.5">
                <button
                  onClick={signOut}
                  className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-[13px] text-[#6B6B88] transition-colors hover:bg-[#FFF0F0] hover:text-rose-600"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  Sign out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
