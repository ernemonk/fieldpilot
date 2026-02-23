'use client';

import { useState, useEffect, useCallback } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatCard } from '@/components/ui/StatCard';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Button } from '@/components/ui/Button';
import {
  Briefcase, FileText, CheckCircle, Clock, ArrowRight, AlertCircle, Loader2,
} from 'lucide-react';
import Link from 'next/link';
import type { User, Job, Proposal, ProposalStatus } from '@/lib/types';
import { useTenant } from '@/context/TenantContext';
import { formatDate } from '@/lib/utils';
import { getJobsByClient, getProposals } from '@/lib/firestore';

const proposalStatusColor: Record<ProposalStatus, string> = {
  draft: 'bg-gray-100 text-gray-700', sent: 'bg-amber-100 text-amber-800',
  viewed: 'bg-teal-100 text-teal-800', approved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
};
const proposalStatusLabel: Record<ProposalStatus, string> = {
  draft: 'Draft', sent: 'Awaiting Review', viewed: 'In Review', approved: 'Approved', rejected: 'Rejected',
};

export function ClientDashboard({ user }: { user: User | null }) {
  const { tenantId } = useTenant();
  const [myJobs, setMyJobs] = useState<Job[]>([]);
  const [myProposals, setMyProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    if (!tenantId || !user?.linkedClientId) { setLoading(false); return; }
    setLoading(true);
    try {
      const fetchedJobs = await getJobsByClient(tenantId, user.linkedClientId);
      setMyJobs(fetchedJobs);
      const jobIds = new Set(fetchedJobs.map((j) => j.id));
      const allProposals = await getProposals(tenantId);
      setMyProposals(allProposals.filter((p) => jobIds.has(p.jobId)));
    } catch (err) {
      console.error('Failed to load client dashboard:', err);
    } finally {
      setLoading(false);
    }
  }, [tenantId, user?.uid, user?.linkedClientId]);

  useEffect(() => { loadData(); }, [loadData]);

  const pendingApproval = myProposals.filter((p) => p.status === 'sent' || p.status === 'viewed');

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-[#9CA3AF]" /></div>;
  }

  return (
    <div>
      <PageHeader
        title={`Welcome, ${user?.displayName?.split(' ')[0] || 'there'}`}
        description="View your projects, proposals, and progress updates."
      />

      {/* Action-needed banner */}
      {pendingApproval.length > 0 && (
        <div className="mb-6 flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50 px-5 py-4">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5 shrink-0 text-amber-600" />
            <div>
              <p className="text-sm font-semibold text-amber-900">
                {pendingApproval.length} proposal{pendingApproval.length > 1 ? 's' : ''} awaiting your review
              </p>
              <p className="text-xs text-amber-700">Open the Proposals page to approve or reject.</p>
            </div>
          </div>
          <Link href="/proposals">
            <Button size="sm" icon={<ArrowRight className="h-4 w-4" />}>Review Now</Button>
          </Link>
        </div>
      )}

      {/* Stats */}
      <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Active Projects"
          value={myJobs.filter((j) => ['in_progress','scheduled'].includes(j.status)).length}
          icon={<Briefcase className="h-5 w-5" />}
        />
        <StatCard
          label="Proposals"
          value={myProposals.length}
          icon={<FileText className="h-5 w-5" />}
        />
        <StatCard
          label="Completed"
          value={myJobs.filter((j) => j.status === 'completed').length}
          icon={<CheckCircle className="h-5 w-5" />}
        />
        <StatCard
          label="Total Jobs"
          value={myJobs.length}
          icon={<Clock className="h-5 w-5" />}
        />
      </div>

      {/* My Projects */}
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-[#111827]">Your Projects</h2>
        <Link href="/jobs">
          <Button variant="ghost" size="sm" icon={<ArrowRight className="h-4 w-4" />}>View all</Button>
        </Link>
      </div>
      <div className="mb-8 space-y-4">
        {myJobs.length === 0 && <p className="py-4 text-center text-sm text-[#6B7280]">No projects yet.</p>}
        {myJobs.map((job) => (
          <Link key={job.id} href="/jobs" className="block">
            <div className="rounded-xl border border-[#E5E7EB] bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-base font-semibold text-[#111827]">{job.title}</p>
                  <p className="mt-1 text-xs text-[#6B7280]">Updated {formatDate(job.lastUpdated)}</p>
                </div>
                <StatusBadge status={job.status} />
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Proposals */}
      <Card>
        <CardHeader>
          <CardTitle>Your Proposals</CardTitle>
          <Link href="/proposals">
            <Button variant="ghost" size="sm">View all</Button>
          </Link>
        </CardHeader>
        <div className="space-y-3">
          {myProposals.length === 0 && <p className="py-4 text-center text-sm text-[#6B7280]">No proposals yet.</p>}
          {myProposals.map((p) => (
            <Link key={p.id} href="/proposals" className="block">
              <div className="flex items-center justify-between rounded-lg border border-[#E5E7EB] p-4 transition-colors hover:bg-gray-50">
                <div>
                  <p className="text-sm font-medium text-[#111827]">Proposal #{p.id.slice(-5)}</p>
                  <p className="text-xs text-[#6B7280]">{formatDate(p.createdAt)}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-[#111827]">${p.priceEstimate.toLocaleString()}</span>
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${proposalStatusColor[p.status]}`}>
                    {proposalStatusLabel[p.status]}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </Card>
    </div>
  );
}

