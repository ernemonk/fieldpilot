'use client';

import { PageHeader } from '@/components/ui/PageHeader';
import { StatCard } from '@/components/ui/StatCard';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Button } from '@/components/ui/Button';
import {
  Briefcase,
  Users,
  Clock,
  FileText,
  AlertTriangle,
  Plus,
  Sparkles,
  UserPlus,
  Timer,
  ArrowRight,
  Zap,
  UserCheck,
} from 'lucide-react';
import Link from 'next/link';
import type { User, JobStatus, ProposalStatus } from '@/lib/types';

// ─── Demo data ────────────────────────────────────────────────────────────────

const allJobs: {
  id: string; title: string; client: string; status: JobStatus;
  date: string; operators: string[]; estimatedEnd?: string;
}[] = [
  { id: 'j1', title: 'Electrical Panel Upgrade', client: 'Acme Corp',        status: 'in_progress',   date: 'Feb 15',  operators: ['Mike J.', 'Sarah C.'], estimatedEnd: 'Feb 20' },
  { id: 'j2', title: 'HVAC System Install',      client: 'BuildRight LLC',   status: 'approved',      date: 'Feb 14',  operators: [] },
  { id: 'j3', title: 'Generator Maintenance',    client: 'Metro Services',   status: 'proposal_sent', date: 'Feb 13',  operators: ['David P.'] },
  { id: 'j4', title: 'Fire Alarm Circuit',       client: 'SafeWork Inc',     status: 'lead',          date: 'Feb 12',  operators: [] },
  { id: 'j5', title: 'Substation Wiring',        client: 'PowerGrid Co',     status: 'scheduled',     date: 'Feb 11',  operators: ['Lisa M.'] },
  { id: 'j6', title: 'Office Rewiring',          client: 'NextBuild Corp',   status: 'on_hold',       date: 'Feb 9',   operators: ['Mike J.'], estimatedEnd: 'Feb 5' },
];

const pendingProposals: { title: string; client: string; status: ProposalStatus; value: string; date: string }[] = [
  { title: 'Electrical Panel Upgrade', client: 'Acme Corp',      status: 'sent',    value: '$15,000', date: 'Feb 5' },
  { title: 'HVAC System Install',      client: 'BuildRight LLC', status: 'viewed',  value: '$42,000', date: 'Feb 10' },
  { title: 'Substation Wiring',        client: 'PowerGrid Co',   status: 'draft',   value: '$85,000', date: 'Feb 13' },
];

type ActivityType = 'job_update' | 'session_log' | 'incident' | 'proposal' | 'assignment';

const activityFeed: {
  type: ActivityType; text: string; meta: string; time: string;
}[] = [
  { type: 'session_log',   text: 'Mike J. logged 4.5 hrs on Electrical Panel Upgrade',   meta: 'Session ended at 5:30 PM',                                 time: '2h ago' },
  { type: 'job_update',    text: 'HVAC System Install advanced to Approved',               meta: 'Proposal accepted by BuildRight LLC',                     time: '4h ago' },
  { type: 'incident',      text: 'Incident filed on Substation Wiring — Medium severity',  meta: 'Filed by David P. · Under investigation',                time: '6h ago' },
  { type: 'proposal',      text: 'HVAC System Install proposal viewed by client',          meta: 'BuildRight LLC opened the proposal',                       time: '7h ago' },
  { type: 'assignment',    text: 'Lisa M. assigned to Substation Wiring',                  meta: 'Assigned by Admin',                                        time: 'Yesterday' },
  { type: 'session_log',   text: 'Sarah C. logged 6 hrs on Electrical Panel Upgrade',      meta: 'Session ended at 6:00 PM',                               time: 'Yesterday' },
  { type: 'job_update',    text: 'Office Rewiring placed On Hold',                         meta: 'Awaiting client material confirmation',                    time: 'Yesterday' },
];

const activityIconMap: Record<ActivityType, React.ReactNode> = {
  job_update:  <Briefcase    className="h-3.5 w-3.5" />,
  session_log: <Timer        className="h-3.5 w-3.5" />,
  incident:    <AlertTriangle className="h-3.5 w-3.5" />,
  proposal:    <FileText     className="h-3.5 w-3.5" />,
  assignment:  <UserCheck    className="h-3.5 w-3.5" />,
};

const activityColorMap: Record<ActivityType, string> = {
  job_update:  'bg-teal-100 text-teal-700',
  session_log: 'bg-blue-100 text-blue-700',
  incident:    'bg-red-100 text-red-700',
  proposal:    'bg-indigo-100 text-indigo-700',
  assignment:  'bg-green-100 text-green-700',
};

const proposalStatusColor: Record<ProposalStatus, string> = {
  draft:    'bg-gray-100 text-gray-700',
  sent:     'bg-amber-100 text-amber-800',
  viewed:   'bg-teal-100 text-teal-800',
  approved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
};
const proposalStatusLabel: Record<ProposalStatus, string> = {
  draft: 'Draft', sent: 'Sent', viewed: 'Viewed', approved: 'Approved', rejected: 'Rejected',
};

// ─── Component ────────────────────────────────────────────────────────────────

export function AdminDashboard({ user }: { user: User | null }) {
  // Derived attention data
  const unassigned = allJobs.filter((j) => j.operators.length === 0 && !['lead', 'cancelled', 'closed', 'completed', 'invoiced'].includes(j.status));
  const overdue    = allJobs.filter((j) => j.estimatedEnd && new Date(j.estimatedEnd + ', 2026') < new Date() && ['in_progress', 'scheduled', 'on_hold'].includes(j.status));
  const activeJobs = allJobs.filter((j) => ['in_progress', 'scheduled', 'approved'].includes(j.status));

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
          trend={{ value: 8, positive: true }}
        />
        <StatCard
          label="Pending Assignment"
          value={unassigned.length}
          icon={<UserPlus className="h-5 w-5" />}
        />
        <StatCard
          label="Hours Logged Today"
          value="34.5"
          icon={<Clock className="h-5 w-5" />}
        />
        <StatCard
          label="Open Proposals"
          value={pendingProposals.filter((p) => p.status !== 'draft').length}
          icon={<FileText className="h-5 w-5" />}
          trend={{ value: 2, positive: true }}
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
            {allJobs.map((job) => {
              const isUnassigned = job.operators.length === 0 && !['lead', 'cancelled', 'closed', 'completed', 'invoiced'].includes(job.status);
              const isOverdue = !!job.estimatedEnd && new Date(job.estimatedEnd + ', 2026') < new Date() && ['in_progress', 'scheduled', 'on_hold'].includes(job.status);
              return (
                <div
                  key={job.id}
                  className={`flex items-center justify-between rounded-lg border p-3.5 transition-colors hover:bg-gray-50 ${
                    isOverdue ? 'border-red-200 bg-red-50/40' : isUnassigned ? 'border-amber-200 bg-amber-50/40' : 'border-[#E5E7EB]'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-medium text-[#111827]">{job.title}</p>
                      {isOverdue && (
                        <span className="shrink-0 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-semibold text-red-700">
                          OVERDUE
                        </span>
                      )}
                      {isUnassigned && !isOverdue && (
                        <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                          UNASSIGNED
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-[#6B7280]">
                      {job.client}
                      {job.operators.length > 0 && <> · <span className="text-teal-600">{job.operators.join(', ')}</span></>}
                    </p>
                  </div>
                  <div className="ml-4 flex shrink-0 items-center gap-3">
                    <StatusBadge status={job.status} />
                    <span className="hidden text-xs text-[#6B7280] sm:block">{job.date}</span>
                  </div>
                </div>
              );
            })}
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
              {pendingProposals.map((p, i) => (
                <div key={i} className="flex items-start justify-between gap-3 rounded-lg border border-[#E5E7EB] p-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-[#111827]">{p.title}</p>
                    <p className="text-xs text-[#6B7280]">{p.client} · {p.date}</p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <span className="text-sm font-semibold text-[#111827]">{p.value}</span>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${proposalStatusColor[p.status]}`}>
                      {proposalStatusLabel[p.status]}
                    </span>
                  </div>
                </div>
              ))}
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
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <div className="divide-y divide-[#F3F4F6]">
          {activityFeed.map((item, i) => (
            <div key={i} className="flex items-start gap-4 py-3">
              <div className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${activityColorMap[item.type]}`}>
                {activityIconMap[item.type]}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm text-[#111827]">{item.text}</p>
                <p className="mt-0.5 text-xs text-[#6B7280]">{item.meta}</p>
              </div>
              <span className="shrink-0 text-xs text-[#9CA3AF]">{item.time}</span>
            </div>
          ))}
        </div>
        {/* View more hint */}
        <div className="mt-2 border-t border-[#F3F4F6] pt-3 text-center">
          <button className="text-xs text-[#6B7280] hover:text-teal-600 hover:underline">
            Load more activity
          </button>
        </div>
      </Card>
    </div>
  );
}
