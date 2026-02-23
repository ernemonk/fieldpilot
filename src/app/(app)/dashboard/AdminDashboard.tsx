'use client';

import { useState, useEffect, useCallback } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatCard } from '@/components/ui/StatCard';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Button } from '@/components/ui/Button';
import {
  Briefcase, Users, Clock, FileText, AlertTriangle,
  Plus, Sparkles, UserPlus, Timer, ArrowRight, Zap, UserCheck, Loader2,
} from 'lucide-react';
import Link from 'next/link';
import type { User, Job, Proposal, Client, ProposalStatus } from '@/lib/types';
import { useTenant } from '@/context/TenantContext';
import { formatDate } from '@/lib/utils';
import { getJobs, getProposals, getClients, getUsers } from '@/lib/firestore';

const proposalStatusColor: Record<ProposalStatus, string> = {
  draft: 'bg-gray-100 text-gray-700', sent: 'bg-amber-100 text-amber-800',
  viewed: 'bg-teal-100 text-teal-800', approved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
};
const proposalStatusLabel: Record<ProposalStatus, string> = {
  draft: 'Draft', sent: 'Sent', viewed: 'Viewed', approved: 'Approved', rejected: 'Rejected',
};

export function AdminDashboard({ user }: { user: User | null }) {
  const { tenantId } = useTenant();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);
    try {
      const [fetchedJobs, fetchedProposals, fetchedClients, fetchedUsers] = await Promise.all([
        getJobs(tenantId), getProposals(tenantId), getClients(tenantId), getUsers(tenantId),
      ]);
      setJobs(fetchedJobs);
      setProposals(fetchedProposals);
      setClients(fetchedClients);
      setAllUsers(fetchedUsers);
    } catch (err) {
      console.error('Failed to load admin dashboard:', err);
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => { loadData(); }, [loadData]);

  // Derived helpers
  const clientName = (clientId: string) => clients.find((c) => c.id === clientId)?.name ?? clientId;
  const operatorNames = (ids: string[]) => ids.map((id) => allUsers.find((u) => u.uid === id)?.displayName ?? id);
  const jobTitle = (jobId: string) => jobs.find((j) => j.id === jobId)?.title ?? jobId;

  const unassigned = jobs.filter((j) => j.assignedOperators.length === 0 && !['lead','cancelled','closed','completed','invoiced'].includes(j.status));
  const overdue = jobs.filter((j) => j.estimatedEnd && j.estimatedEnd < new Date() && ['in_progress','scheduled','on_hold'].includes(j.status));
  const activeJobs = jobs.filter((j) => ['in_progress','scheduled','approved'].includes(j.status));
  const openProposals = proposals.filter((p) => p.status !== 'draft');
  const recentJobs = [...jobs].sort((a, b) => b.lastUpdated.getTime() - a.lastUpdated.getTime()).slice(0, 7);
  const recentProposals = [...proposals].filter((p) => p.status !== 'draft').sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime()).slice(0, 3);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-[#9CA3AF]" />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title={`Hey ${user?.displayName?.split(' ')[0] || 'Admin'}`}
        description="Manage jobs, assign operators, and oversee client work."
        actions={
          <div className="flex gap-2">
            <Link href="/ai/proposal">
              <Button variant="secondary" icon={<Sparkles className="h-4 w-4" />}>AI Proposal</Button>
            </Link>
            <Link href="/jobs">
              <Button icon={<Plus className="h-4 w-4" />}>New Job</Button>
            </Link>
          </div>
        }
      />

      {/* ── Alert banners ────────────────────────────────────────────────── */}
      {(unassigned.length > 0 || overdue.length > 0) && (
        <div className="mb-6 space-y-3">
          {unassigned.length > 0 && (
            <div className="flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50 px-5 py-3.5">
              <div className="flex items-center gap-3">
                <UserPlus className="h-5 w-5 shrink-0 text-amber-600" />
                <div>
                  <p className="text-sm font-semibold text-amber-900">
                    {unassigned.length} job{unassigned.length > 1 ? 's' : ''} need operator assignment
                  </p>
                  <p className="text-xs text-amber-700">{unassigned.map((j) => j.title).join(', ')}</p>
                </div>
              </div>
              <Link href="/jobs">
                <Button size="sm" icon={<ArrowRight className="h-4 w-4" />}>Assign</Button>
              </Link>
            </div>
          )}
          {overdue.length > 0 && (
            <div className="flex items-center justify-between rounded-xl border border-red-200 bg-red-50 px-5 py-3.5">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 shrink-0 text-red-500" />
                <div>
                  <p className="text-sm font-semibold text-red-900">
                    {overdue.length} job{overdue.length > 1 ? 's are' : ' is'} past estimated end date
                  </p>
                  <p className="text-xs text-red-700">{overdue.map((j) => j.title).join(', ')}</p>
                </div>
              </div>
              <Link href="/jobs">
                <Button size="sm" variant="danger" icon={<ArrowRight className="h-4 w-4" />}>Review</Button>
              </Link>
            </div>
          )}
        </div>
      )}

      {/* ── Stats row ────────────────────────────────────────────────────── */}
      <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Active Jobs"
          value={activeJobs.length}
          icon={<Briefcase className="h-5 w-5" />}
        />
        <StatCard
          label="Pending Assignment"
          value={unassigned.length}
          icon={<UserPlus className="h-5 w-5" />}
        />
        <StatCard
          label="Total Jobs"
          value={jobs.length}
          icon={<Clock className="h-5 w-5" />}
        />
        <StatCard
          label="Open Proposals"
          value={openProposals.length}
          icon={<FileText className="h-5 w-5" />}
        />
      </div>

      {/* ── Main 3-col layout ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">

        {/* ── Jobs needing attention (left 2 cols) ───────────────────────── */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Jobs Overview</CardTitle>
            <Link href="/jobs">
              <Button variant="ghost" size="sm" icon={<ArrowRight className="h-4 w-4" />}>View all</Button>
            </Link>
          </CardHeader>
          <div className="space-y-2">
            {recentJobs.map((job) => {
              const ops = operatorNames(job.assignedOperators);
              const isUnassigned = job.assignedOperators.length === 0 && !['lead','cancelled','closed','completed','invoiced'].includes(job.status);
              const isOverdueJob = !!job.estimatedEnd && job.estimatedEnd < new Date() && ['in_progress','scheduled','on_hold'].includes(job.status);
              return (
                <div
                  key={job.id}
                  className={`flex items-center justify-between rounded-lg border p-3.5 transition-colors hover:bg-gray-50 ${
                    isOverdueJob ? 'border-red-200 bg-red-50/40' : isUnassigned ? 'border-amber-200 bg-amber-50/40' : 'border-[#E5E7EB]'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-medium text-[#111827]">{job.title}</p>
                      {isOverdueJob && (
                        <span className="shrink-0 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-semibold text-red-700">OVERDUE</span>
                      )}
                      {isUnassigned && !isOverdueJob && (
                        <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">UNASSIGNED</span>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-[#6B7280]">
                      {clientName(job.clientId)}
                      {ops.length > 0 && <> · <span className="text-teal-600">{ops.join(', ')}</span></>}
                    </p>
                  </div>
                  <div className="ml-4 flex shrink-0 items-center gap-3">
                    <StatusBadge status={job.status} />
                    <span className="hidden text-xs text-[#6B7280] sm:block">{formatDate(job.lastUpdated)}</span>
                  </div>
                </div>
              );
            })}
            {recentJobs.length === 0 && <p className="py-4 text-center text-sm text-[#6B7280]">No jobs yet.</p>}
          </div>
        </Card>

        {/* ── Right column ───────────────────────────────────────────────── */}
        <div className="space-y-6">

          {/* Pending Proposals */}
          <Card>
            <CardHeader>
              <CardTitle>Proposals</CardTitle>
              <Link href="/proposals">
                <Button variant="ghost" size="sm">View all</Button>
              </Link>
            </CardHeader>
            <div className="space-y-2.5">
              {recentProposals.map((p) => (
                <div key={p.id} className="flex items-start justify-between gap-3 rounded-lg border border-[#E5E7EB] p-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-[#111827]">{jobTitle(p.jobId)}</p>
                    <p className="text-xs text-[#6B7280]">{formatDate(p.updatedAt)}</p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <span className="text-sm font-semibold text-[#111827]">${p.priceEstimate.toLocaleString()}</span>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${proposalStatusColor[p.status]}`}>
                      {proposalStatusLabel[p.status]}
                    </span>
                  </div>
                </div>
              ))}
              {recentProposals.length === 0 && <p className="py-2 text-center text-sm text-[#6B7280]">No proposals yet.</p>}
              <Link href="/ai/proposal" className="block pt-1">
                <Button variant="secondary" size="sm" className="w-full justify-center" icon={<Sparkles className="h-3.5 w-3.5" />}>
                  Generate AI Proposal
                </Button>
              </Link>
            </div>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <div className="space-y-2">
              <Link href="/jobs" className="block">
                <Button variant="secondary" className="w-full justify-start" icon={<Plus className="h-4 w-4" />}>
                  New Job
                </Button>
              </Link>
              <Link href="/clients" className="block">
                <Button variant="secondary" className="w-full justify-start" icon={<Users className="h-4 w-4" />}>
                  Add Client
                </Button>
              </Link>
              <Link href="/proposals" className="block">
                <Button variant="secondary" className="w-full justify-start" icon={<FileText className="h-4 w-4" />}>
                  New Proposal
                </Button>
              </Link>
              <Link href="/ai/incident" className="block">
                <Button variant="secondary" className="w-full justify-start" icon={<Zap className="h-4 w-4" />}>
                  AI Incident Report
                </Button>
              </Link>
            </div>
          </Card>
        </div>
      </div>

      {/* ── Activity Feed ─────────────────────────────────────────────────── */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Recently Updated Jobs</CardTitle>
        </CardHeader>
        <div className="divide-y divide-[#F3F4F6]">
          {recentJobs.map((job) => (
            <div key={job.id} className="flex items-start gap-4 py-3">
              <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-teal-100 text-teal-700">
                <Briefcase className="h-3.5 w-3.5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm text-[#111827]">{job.title}</p>
                <p className="mt-0.5 text-xs text-[#6B7280]">{clientName(job.clientId)} · <StatusBadge status={job.status} /></p>
              </div>
              <span className="shrink-0 text-xs text-[#9CA3AF]">{formatDate(job.lastUpdated)}</span>
            </div>
          ))}
          {recentJobs.length === 0 && (
            <p className="py-8 text-center text-sm text-[#6B7280]">No activity yet.</p>
          )}
        </div>
      </Card>
    </div>
  );
}
