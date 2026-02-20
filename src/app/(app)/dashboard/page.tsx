'use client';

import { useAuth } from '@/context/AuthContext';
import { OwnerDashboard } from './OwnerDashboard';
import { AdminDashboard } from './AdminDashboard';
import { OperatorDashboard } from './OperatorDashboard';
import { ClientDashboard } from './ClientDashboard';

// Auth protection handled by AuthGuard in (app) layout's AppShell.
export default function DashboardPage() {
  const { user } = useAuth();
  const role = user?.role;

  if (role === 'owner') return <OwnerDashboard user={user} />;
  if (role === 'admin') return <AdminDashboard user={user} />;
  if (role === 'operator') return <OperatorDashboard user={user} />;
  if (role === 'client') return <ClientDashboard user={user} />;

  // Fallback for users without a Firestore profile yet
  return <OwnerDashboard user={user} />;
}
