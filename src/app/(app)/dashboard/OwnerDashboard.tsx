'use client';

import { useState, useEffect, useCallback } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatCard } from '@/components/ui/StatCard';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Button } from '@/components/ui/Button';
import {
  Briefcase, Users, FileText, AlertTriangle, DollarSign, BarChart3,
  Plus, Sparkles, UserPlus, Download, Loader2,
} from 'lucide-react';
import Link from 'next/link';
import type { User, Job, Proposal, Client, IncidentReport } from '@/lib/types';
import { useTenant } from '@/context/TenantContext';
import { formatDate } from '@/lib/utils';
import { getJobs, getProposals, getClients, getUsers, getIncidentReports } from '@/lib/firestore';

export function OwnerDashboard({ user }: { user: User | null }) {
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
      console.error('Failed to load owner dashboard:', err);
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => { loadData(); }, [loadData]);

  // Derived KPIs
  const activeJobs = jobs.filter((j) => ['in_progress','scheduled','approved'].includes(j.status));
  const pendingProposals = proposals.filter((p) => ['sent','viewed'].includes(p.status));
  const revenuePipeline = pendingProposals.reduce((sum, p) => sum + p.priceEstimate, 0);
  const approvedCount = proposals.filter((p) => p.status === 'approved').length;
  const rejectedCount = proposals.filter((p) => p.status === 'rejected').length;
  const conversionRate = approvedCount + rejectedCount > 0
    ? Math.round((approvedCount / (approvedCount + rejectedCount)) * 100)
    : 0;

  // Pipeline data from real job statuses
  const pipelineStages = [
    { stage: 'Lead', count: jobs.filter((j) => j.status === 'lead').length, color: 'bg-gray-400' },
    { stage: 'Proposal', count: jobs.filter((j) => j.status === 'proposal_sent').length, color: 'bg-blue-400' },
    { stage: 'Approved', count: jobs.filter((j) => j.status === 'approved').length, color: 'bg-green-400' },
    { stage: 'In Progress', count: jobs.filter((j) => j.status === 'in_progress').length, color: 'bg-teal-500' },
    { stage: 'Completed', count: jobs.filter((j) => j.status === 'completed').length, color: 'bg-emerald-500' },
  ];
  const maxPipelineCount = Math.max(...pipelineStages.map((s) => s.count), 1);

  // Operator job counts
  const operators = allUsers.filter((u) => u.role === 'operator');
  const operatorJobCounts = operators.map((op) => ({
    name: op.displayName,
    jobs: jobs.filter((j) => j.assignedOperators.includes(op.uid)).length,
  })).sort((a, b) => b.jobs - a.jobs);

  const recentJobs = [...jobs].sort((a, b) => b.lastUpdated.getTime() - a.lastUpdated.getTime()).slice(0, 5);
  const clientName = (clientId: string) => clients.find((c) => c.id === clientId)?.name ?? clientId;

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-[#9CA3AF]" /></div>;
  }

  return (
    <div>
      <PageHeader
        title={`Welcome back, ${user?.displayName?.split(' ')[0] || 'User'}`}
        description="Full business overview — revenue, pipeline, and team performance."
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

      {/* Top-level KPIs */}
      <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Revenue Pipeline"
          value={`$${(revenuePipeline / 1000).toFixed(0)}K`}
          icon={<DollarSign className="h-5 w-5" />}
          iconBg="bg-emerald-50"
          iconColor="text-emerald-600"
        />
        <StatCard
          label="Active Jobs"
          value={activeJobs.length}
          icon={<Briefcase className="h-5 w-5" />}
          iconBg="bg-blue-50"
          iconColor="text-blue-600"
        />
        <StatCard
          label="Total Clients"
          value={clients.length}
          icon={<Users className="h-5 w-5" />}
          iconBg="bg-violet-50"
          iconColor="text-violet-600"
        />
        <StatCard
          label="Proposal Conversion"
          value={`${conversionRate}%`}
          icon={<BarChart3 className="h-5 w-5" />}
          iconBg="bg-amber-50"
          iconColor="text-amber-600"
        />
      </div>

      {/* Second row */}
      <div className="mb-8 grid grid-cols-3 gap-4">
        <StatCard
          label="Total Jobs"
          value={jobs.length}
          icon={<Briefcase className="h-5 w-5" />}
          iconBg="bg-teal-50"
          iconColor="text-teal-600"
        />
        <StatCard
          label="Pending Proposals"
          value={pendingProposals.length}
          icon={<FileText className="h-5 w-5" />}
          iconBg="bg-pink-50"
          iconColor="text-pink-600"
        />
        <StatCard
          label="Operators"
          value={operators.length}
          icon={<Users className="h-5 w-5" />}
          iconBg="bg-sky-50"
          iconColor="text-sky-600"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Job Pipeline */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Job Pipeline</CardTitle>
          </CardHeader>
          <div className="space-y-3">
            {pipelineStages.map((stage) => (
              <div key={stage.stage} className="flex items-center gap-4">
                <span className="w-24 text-sm text-[#6B7280]">{stage.stage}</span>
                <div className="flex-1 h-8 bg-gray-100 rounded-lg overflow-hidden">
                  <div
                    className={`h-full ${stage.color} rounded-lg flex items-center px-3`}
                    style={{ width: `${(stage.count / maxPipelineCount) * 100}%`, minWidth: stage.count > 0 ? '2rem' : '0' }}
                  >
                    {stage.count > 0 && <span className="text-xs font-semibold text-white">{stage.count}</span>}
                  </div>
                </div>
                {stage.count === 0 && <span className="text-xs text-[#9CA3AF]">0</span>}
              </div>
            ))}
          </div>
        </Card>

        {/* Quick Actions */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <div className="space-y-2">
              <Link href="/jobs" className="block">
                <button className="flex w-full items-center gap-3 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm font-medium text-blue-700 transition-all hover:bg-blue-100 hover:shadow-sm">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500 text-white"><Briefcase className="h-4 w-4" /></div>
                  Create Job
                </button>
              </Link>
              <Link href="/proposals" className="block">
                <button className="flex w-full items-center gap-3 rounded-xl border border-violet-100 bg-violet-50 px-4 py-3 text-sm font-medium text-violet-700 transition-all hover:bg-violet-100 hover:shadow-sm">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500 text-white"><FileText className="h-4 w-4" /></div>
                  Create Proposal
                </button>
              </Link>
              <Link href="/ai/proposal" className="block">
                <button className="flex w-full items-center gap-3 rounded-xl border border-teal-100 bg-teal-50 px-4 py-3 text-sm font-medium text-teal-700 transition-all hover:bg-teal-100 hover:shadow-sm">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-500 text-white"><Sparkles className="h-4 w-4" /></div>
                  AI Proposal Generator
                </button>
              </Link>
              <Link href="/settings" className="block">
                <button className="flex w-full items-center gap-3 rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-700 transition-all hover:bg-amber-100 hover:shadow-sm">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500 text-white"><UserPlus className="h-4 w-4" /></div>
                  Invite User
                </button>
              </Link>
            </div>
          </Card>
        </div>

        {/* Operator Performance */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Operator Job Assignments</CardTitle>
          </CardHeader>
          {operatorJobCounts.length === 0 ? (
            <p className="py-4 text-center text-sm text-[#6B7280]">No operators yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#E5E7EB]">
                    <th className="pb-3 text-left font-medium text-[#6B7280]">Operator</th>
                    <th className="pb-3 text-right font-medium text-[#6B7280]">Jobs Assigned</th>
                  </tr>
                </thead>
                <tbody>
                  {operatorJobCounts.map((op) => (
                    <tr key={op.name} className="border-b border-[#E5E7EB] last:border-0">
                      <td className="py-3 font-medium text-[#111827]">{op.name}</td>
                      <td className="py-3 text-right text-[#6B7280]">{op.jobs}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* Recent Jobs */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Jobs</CardTitle>
            <Link href="/jobs">
              <Button variant="ghost" size="sm">View all</Button>
            </Link>
          </CardHeader>
          <div className="space-y-3">
            {recentJobs.map((job) => (
              <div
                key={job.id}
                className="flex items-center justify-between rounded-lg border border-[#E5E7EB] p-3 transition-colors hover:bg-gray-50"
              >
                <div>
                  <p className="text-sm font-medium text-[#111827]">{job.title}</p>
                  <p className="text-xs text-[#6B7280]">{clientName(job.clientId)}</p>
                </div>
                <StatusBadge status={job.status} />
              </div>
            ))}
            {recentJobs.length === 0 && <p className="py-4 text-center text-sm text-[#6B7280]">No jobs yet.</p>}
          </div>
        </Card>
      </div>
    </div>
  );
}

