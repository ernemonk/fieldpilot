'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import logo from '@/assets/images/fieldpilotlogo.png';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import type { UserRole } from '@/lib/types';
import {
  LayoutDashboard,
  Briefcase,
  Users,
  FileText,
  Settings,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  Clock,
  Sparkles,
  Zap,
  LogOut,
  BarChart3,
  LucideIcon,
} from 'lucide-react';
import { useState } from 'react';

interface NavLink {
  label: string;
  href: string;
  icon: LucideIcon;
  roles: UserRole[];
}

const mainLinks: NavLink[] = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, roles: ['owner', 'admin', 'operator', 'client'] },
  { label: 'Jobs',      href: '/jobs',      icon: Briefcase,       roles: ['owner', 'admin', 'operator', 'client'] },
  { label: 'Clients',   href: '/clients',   icon: Users,           roles: ['owner', 'admin'] },
  { label: 'Proposals', href: '/proposals', icon: FileText,        roles: ['owner', 'admin', 'client'] },
  { label: 'Sessions',  href: '/sessions',  icon: Clock,           roles: ['owner', 'admin', 'operator'] },
  { label: 'Incidents', href: '/incidents', icon: AlertTriangle,   roles: ['owner', 'admin', 'operator'] },
  { label: 'Reports',   href: '/reports',   icon: BarChart3,        roles: ['client'] },
];

const aiLinks: NavLink[] = [
  { label: 'AI Proposal', href: '/ai/proposal', icon: Sparkles, roles: ['owner', 'admin'] },
  { label: 'AI Incident', href: '/ai/incident', icon: Zap,      roles: ['owner', 'admin', 'operator'] },
];

const systemLinks: NavLink[] = [
  { label: 'Settings', href: '/settings', icon: Settings, roles: ['owner', 'admin'] },
];

function NavItem({
  link, isActive, collapsed, onNavigate,
}: { link: NavLink; isActive: boolean; collapsed: boolean; onNavigate?: () => void }) {
  const Icon = link.icon;
  return (
    <Link
      href={link.href}
      title={collapsed ? link.label : undefined}
      onClick={onNavigate}
      className={cn(
        'group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150',
        isActive ? 'text-white' : 'text-white/45 hover:text-white/85',
        collapsed && 'justify-center px-0'
      )}
    >
      {/* Active pill */}
      {isActive && (
        <span
          className="absolute inset-0 rounded-xl"
          style={{ background: 'linear-gradient(135deg, rgba(13,148,136,0.40) 0%, rgba(16,185,129,0.25) 100%)' }}
        />
      )}
      {/* Hover bg */}
      {!isActive && (
        <span className="absolute inset-0 rounded-xl bg-white/0 transition-colors group-hover:bg-white/[0.05]" />
      )}
      {/* Left accent */}
      {isActive && (
        <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-teal-400 shadow-[0_0_8px_rgba(45,212,191,0.7)]" />
      )}
      <Icon
        className={cn(
          'relative z-10 shrink-0 transition-colors',
          collapsed ? 'h-[19px] w-[19px]' : 'h-[17px] w-[17px]',
          isActive ? 'text-teal-300' : 'text-white/35 group-hover:text-white/65'
        )}
      />
      {!collapsed && <span className="relative z-10 truncate">{link.label}</span>}
      {/* Tooltip when collapsed */}
      {collapsed && (
        <span className="pointer-events-none absolute left-full z-50 ml-3 whitespace-nowrap rounded-lg bg-[#1E1B4B] px-3 py-1.5 text-xs font-medium text-white/90 opacity-0 shadow-2xl transition-opacity group-hover:opacity-100">
          {link.label}
        </span>
      )}
    </Link>
  );
}

function NavGroup({
  label, links, pathname, collapsed, user, onNavigate,
}: {
  label: string;
  links: NavLink[];
  pathname: string;
  collapsed: boolean;
  user: { role: UserRole } | null;
  onNavigate?: () => void;
}) {
  const filtered = links.filter((l) => user && l.roles.includes(user.role));
  if (!filtered.length) return null;
  return (
    <div className="space-y-0.5">
      {!collapsed && (
        <p className="mb-2 px-3 text-[9px] font-bold uppercase tracking-[0.12em] text-white/20">
          {label}
        </p>
      )}
      {filtered.map((link) => (
        <NavItem key={link.href} link={link} isActive={pathname.startsWith(link.href)} collapsed={collapsed} onNavigate={onNavigate} />
      ))}
    </div>
  );
}

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { user, signOut } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  const initials = user?.displayName
    ? user.displayName.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : 'U';

  return (
    <aside
      className={cn(
        'relative flex h-screen flex-col overflow-hidden transition-all duration-300 ease-in-out',
        collapsed ? 'w-[68px]' : 'w-[240px]'
      )}
      style={{ background: 'linear-gradient(185deg, #071A1C 0%, #0A2525 55%, #0D3130 100%)' }}
    >
      {/* Top radial glow */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-48 opacity-25"
        style={{ background: 'radial-gradient(ellipse at 50% -10%, rgba(45,212,191,0.5) 0%, transparent 65%)' }}
      />

      {/* Logo */}
      <div
        className={cn(
          'relative flex h-16 shrink-0 items-center border-b border-white/[0.06] transition-all duration-300',
          collapsed ? 'justify-center px-2' : 'px-5'
        )}
      >
        <Image
          src={logo}
          alt="Field Pilot"
          height={collapsed ? 24 : 30}
          width={collapsed ? 24 : 144}
          className="object-contain object-left transition-all duration-300"
        />
      </div>

      {/* Nav */}
      <nav className="relative flex-1 space-y-5 overflow-y-auto overflow-x-hidden px-2.5 py-5 no-scrollbar">
        <NavGroup label="Main"     links={mainLinks}   pathname={pathname} collapsed={collapsed} user={user} onNavigate={onNavigate} />
        <NavGroup label="AI Tools" links={aiLinks}     pathname={pathname} collapsed={collapsed} user={user} onNavigate={onNavigate} />
        <NavGroup label="System"   links={systemLinks} pathname={pathname} collapsed={collapsed} user={user} onNavigate={onNavigate} />
      </nav>

      {/* Bottom: user card + collapse */}
      <div className="relative shrink-0 border-t border-white/[0.06] px-2.5 py-3 space-y-1">
        {/* User card */}
        {!collapsed ? (
          <div className="flex items-center gap-3 rounded-xl px-3 py-2.5">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-teal-500/30 text-[11px] font-bold text-teal-200">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-medium text-white/75">{user?.displayName}</p>
              <p className="truncate text-[11px] capitalize text-white/30">{user?.role}</p>
            </div>
            <button
              onClick={signOut}
              title="Sign out"
              className="shrink-0 text-white/25 transition-colors hover:text-rose-400"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : (
          <button
            onClick={signOut}
            title="Sign out"
            className="group relative flex w-full items-center justify-center rounded-xl py-2.5 text-white/25 transition-colors hover:text-rose-400"
          >
            <LogOut className="h-4 w-4" />
            <span className="pointer-events-none absolute left-full z-50 ml-3 whitespace-nowrap rounded-lg bg-[#0F3D3E] px-3 py-1.5 text-xs font-medium text-white/90 opacity-0 shadow-2xl transition-opacity group-hover:opacity-100">
              Sign out
            </span>
          </button>
        )}

        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex w-full items-center justify-center rounded-xl py-2 text-white/20 transition-colors hover:bg-white/[0.05] hover:text-white/50"
        >
          {collapsed
            ? <ChevronRight className="h-4 w-4" />
            : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>
    </aside>
  );
}
