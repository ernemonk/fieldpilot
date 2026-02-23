'use client';

import { useState, useEffect, useCallback } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { RoleGuard } from '@/components/RoleGuard';
import { useAuth } from '@/context/AuthContext';
import { useTenant } from '@/context/TenantContext';
import {
  Download, FileText, Briefcase, AlertTriangle, CheckCircle, Clock, FileDown, Loader2,
} from 'lucide-react';
import { cn, formatDate } from '@/lib/utils';
import type { Job, Proposal, IncidentReport, ProposalStatus } from '@/lib/types';
import { getJobsByClient, getProposals, getIncidentReports } from '@/lib/firestore';

const severityColor: Record<string, string> = {
  low: 'bg-blue-100 text-blue-700', medium: 'bg-yellow-100 text-yellow-700',
  high: 'bg-orange-100 text-orange-700', critical: 'bg-red-100 text-red-700',
};
const proposalStatusLabel: Record<ProposalStatus, string> = {
  draft: 'Draft', sent: 'Awaiting Review', viewed: 'Viewed', approved: 'Approved', rejected: 'Rejected',
};
const proposalStatusColor: Record<ProposalStatus, string> = {
  draft: 'bg-gray-100 text-gray-600', sent: 'bg-blue-100 text-blue-700',
  viewed: 'bg-amber-100 text-amber-700', approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
};

export default function ReportsPage() {
  const { user } = useAuth();
  const { tenantId } = useTenant();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [incidents, setIncidents] = useState<IncidentReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'proposals' | 'jobs' | 'incidents'>('proposals');

  const loadData = useCallback(async () => {
    if (!tenantId || !user?.linkedClientId) { setLoading(false); return; }
    setLoading(true);
    try {
      const fetchedJobs = await getJobsByClient(tenantId, user.linkedClientId);
      setJobs(fetchedJobs);
      const jobIds = fetchedJobs.map((j) => j.id);
      const [allProposals, allIncidents] = await Promise.all([
        getProposals(tenantId),
        Promise.all(jobIds.map((id) => getIncidentReports(tenantId, id))).then((arr) => arr.flat()),
      ]);
      setProposals(allProposals.filter((p) => jobIds.includes(p.jobId)));
      setIncidents(allIncidents);
    } catch (err) {
      console.error('Failed to load reports:', err);
    } finally {
      setLoading(false);
    }
  }, [tenantId, user?.uid, user?.linkedClientId]);

  useEffect(() => { loadData(); }, [loadData]);

  const jobTitle = (jobId: string) => jobs.find((j) => j.id === jobId)?.title ?? jobId;

  const tabs = [
    { key: 'proposals', label: 'Proposals', icon: FileText, count: proposals.length },
    { key: 'jobs', label: 'Job Reports', icon: Briefcase, count: jobs.filter((j) => j.status === 'completed').length },
    { key: 'incidents', label: 'Incidents', icon: AlertTriangle, count: incidents.length },
  ] as const;

  return (
    <RoleGuard allowedRoles={['client']}>
      <PageHeader
        title="Reports & Documents"
        description="Download your project proposals, job reports, and incident summaries."
        actions={
          <Button
            variant="secondary"
            icon={<FileDown className="h-4 w-4" />}
            onClick={() => alert('Export all — PDF generation coming soon')}
          >
            Export All
          </Button>
        }
      />

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-[#9CA3AF]" />
        </div>
      ) : (
        <>
      {/* Summary stats */}
      <div className="mb-8 grid grid-cols-3 gap-4">
        <div className="flex items-center gap-4 rounded-xl border border-[#E5E7EB] bg-white px-5 py-4 shadow-sm">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-teal-50">
            <FileText className="h-5 w-5 text-teal-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-[#111827]">{proposals.length}</p>
            <p className="text-xs text-[#6B7280]">Total Proposals</p>
          </div>
        </div>
        <div className="flex items-center gap-4 rounded-xl border border-[#E5E7EB] bg-white px-5 py-4 shadow-sm">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50">
            <CheckCircle className="h-5 w-5 text-emerald-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-[#111827]">{jobs.filter((j) => j.status === 'completed').length}</p>
            <p className="text-xs text-[#6B7280]">Completed Jobs</p>
          </div>
        </div>
        <div className="flex items-center gap-4 rounded-xl border border-[#E5E7EB] bg-white px-5 py-4 shadow-sm">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-50">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
          </div>
          <div>
            <p className="text-2xl font-bold text-[#111827]">{incidents.length}</p>
            <p className="text-xs text-[#6B7280]">Incident Reports</p>
          </div>
        </div>
      </div>

      {/* Tab selector */}
      <div className="mb-6 flex gap-1 rounded-xl border border-[#E5E7EB] bg-white p-1 w-fit shadow-sm">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                'flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all',
                active ? 'bg-teal-600 text-white shadow-sm' : 'text-[#6B7280] hover:text-[#111827]'
              )}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
              <span className={cn('rounded-full px-1.5 py-0.5 text-xs font-semibold', active ? 'bg-white/20 text-white' : 'bg-gray-100 text-[#374151]')}>
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Proposals tab */}
      {activeTab === 'proposals' && (
        <Card>
          <CardHeader>
            <CardTitle>Proposal Documents</CardTitle>
            <p className="text-sm text-[#6B7280]">Review and download your proposals</p>
          </CardHeader>
          <div className="divide-y divide-[#E5E7EB]">
            {proposals.length === 0 && <p className="py-8 text-center text-sm text-[#9CA3AF]">No proposals yet.</p>}
            {proposals.map((p) => (
              <div key={p.id} className="flex items-center gap-4 py-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50">
                  <FileText className="h-5 w-5 text-blue-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-[#111827]">{jobTitle(p.jobId)}</p>
                  <p className="text-xs text-[#6B7280]">
                    Version {p.version} · {formatDate(p.createdAt)} ·{' '}
                    <span className="font-semibold text-[#374151]">${p.priceEstimate.toLocaleString()}</span>
                  </p>
                </div>
                <span className={cn('shrink-0 rounded-full px-3 py-1 text-xs font-medium', proposalStatusColor[p.status])}>
                  {proposalStatusLabel[p.status]}
                </span>
                {p.pdfUrl ? (
                  <a href={p.pdfUrl} target="_blank" rel="noreferrer">
                    <Button size="sm" variant="secondary" icon={<Download className="h-4 w-4" />}>PDF</Button>
                  </a>
                ) : (
                  <Button size="sm" variant="ghost" disabled>No PDF yet</Button>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Job Reports tab */}
      {activeTab === 'jobs' && (
        <Card>
          <CardHeader>
            <CardTitle>Job Reports</CardTitle>
            <p className="text-sm text-[#6B7280]">Final reports for completed projects</p>
          </CardHeader>
          <div className="divide-y divide-[#E5E7EB]">
            {jobs.length === 0 && <p className="py-8 text-center text-sm text-[#9CA3AF]">No jobs yet.</p>}
            {jobs.map((j) => (
              <div key={j.id} className="flex items-center gap-4 py-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-teal-50">
                  <Briefcase className="h-5 w-5 text-teal-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-[#111827]">{j.title}</p>
                  {j.actualCompletion ? (
                    <p className="text-xs text-[#6B7280]">Completed {formatDate(j.actualCompletion)}</p>
                  ) : (
                    <p className="text-xs text-amber-600 flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      In progress — report available on completion
                    </p>
                  )}
                </div>
                <StatusBadge status={j.status} />
                <Button size="sm" variant="ghost" disabled>Pending</Button>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Incidents tab */}
      {activeTab === 'incidents' && (
        <Card>
          <CardHeader>
            <CardTitle>Incident Reports</CardTitle>
            <p className="text-sm text-[#6B7280]">Safety incidents filed on your projects</p>
          </CardHeader>
          {incidents.length === 0 ? (
            <div className="py-10 text-center">
              <CheckCircle className="mx-auto mb-3 h-8 w-8 text-emerald-400" />
              <p className="text-sm font-medium text-[#374151]">No incidents on your projects</p>
              <p className="text-xs text-[#9CA3AF]">All clear — nothing to report.</p>
            </div>
          ) : (
            <div className="divide-y divide-[#E5E7EB]">
              {incidents.map((inc) => (
                <div key={inc.id} className="flex items-center gap-4 py-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-orange-50">
                    <AlertTriangle className="h-5 w-5 text-orange-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-[#111827]">{jobTitle(inc.jobId)}</p>
                    <p className="text-xs text-[#6B7280]">{formatDate(inc.createdAt)}</p>
                  </div>
                  <span className={cn('shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium', severityColor[inc.severity])}>
                    {inc.severity.charAt(0).toUpperCase() + inc.severity.slice(1)}
                  </span>
                  <span className={cn('shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium',
                    inc.resolutionStatus === 'resolved' || inc.resolutionStatus === 'closed'
                      ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                  )}>
                    {inc.resolutionStatus.charAt(0).toUpperCase() + inc.resolutionStatus.slice(1)}
                  </span>
                  <Button size="sm" variant="ghost" disabled>No PDF</Button>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}
        </>
      )}
    </RoleGuard>
  );
}

import { useState } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { RoleGuard } from '@/components/RoleGuard';
import { useAuth } from '@/context/AuthContext';
import {
  Download,
  FileText,
  Briefcase,
  AlertTriangle,
  CheckCircle,
  Clock,
  BarChart3,
  ChevronRight,
  FileDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { JobStatus, ProposalStatus } from '@/lib/types';

// ── Demo data (replace with Firestore calls via getJobsByClient + getProposals) ──

type DemoReport = {
  id: string;
  jobTitle: string;
  status: JobStatus;
  completedDate?: string;
  proposalPdfUrl?: string;
  jobReportUrl?: string;
};

type DemoProposalReport = {
  id: string;
  jobTitle: string;
  status: ProposalStatus;
  priceEstimate: number;
  createdAt: string;
  pdfUrl?: string;
  version: number;
};

type DemoIncidentSummary = {
  id: string;
  jobTitle: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  resolutionStatus: 'open' | 'investigating' | 'resolved' | 'closed';
  createdAt: string;
  pdfUrl?: string;
};

const demoJobs: DemoReport[] = [
  {
    id: 'j1',
    jobTitle: 'Electrical Panel Upgrade',
    status: 'in_progress',
    completedDate: undefined,
    jobReportUrl: undefined,
  },
  {
    id: 'j2',
    jobTitle: 'Generator Maintenance',
    status: 'completed',
    completedDate: 'Feb 10, 2026',
    jobReportUrl: '#',
  },
  {
    id: 'j3',
    jobTitle: 'Lighting Install — HQ',
    status: 'completed',
    completedDate: 'Jan 28, 2026',
    jobReportUrl: '#',
  },
];

const demoProposals: DemoProposalReport[] = [
  {
    id: 'p1',
    jobTitle: 'Electrical Panel Upgrade',
    status: 'approved',
    priceEstimate: 8400,
    createdAt: 'Feb 8, 2026',
    pdfUrl: '#',
    version: 2,
  },
  {
    id: 'p2',
    jobTitle: 'Substation Rewiring',
    status: 'sent',
    priceEstimate: 14200,
    createdAt: 'Feb 15, 2026',
    pdfUrl: '#',
    version: 1,
  },
  {
    id: 'p3',
    jobTitle: 'Generator Maintenance',
    status: 'approved',
    priceEstimate: 3100,
    createdAt: 'Jan 22, 2026',
    pdfUrl: '#',
    version: 1,
  },
];

const demoIncidents: DemoIncidentSummary[] = [
  {
    id: 'i1',
    jobTitle: 'Generator Maintenance',
    severity: 'medium',
    resolutionStatus: 'resolved',
    createdAt: 'Feb 14, 2026',
    pdfUrl: '#',
  },
];

const severityColor: Record<string, string> = {
  low: 'bg-blue-100 text-blue-700',
  medium: 'bg-yellow-100 text-yellow-700',
  high: 'bg-orange-100 text-orange-700',
  critical: 'bg-red-100 text-red-700',
};

const proposalStatusLabel: Record<ProposalStatus, string> = {
  draft: 'Draft',
  sent: 'Awaiting Review',
  viewed: 'Viewed',
  approved: 'Approved',
  rejected: 'Rejected',
};

const proposalStatusColor: Record<ProposalStatus, string> = {
  draft: 'bg-gray-100 text-gray-600',
  sent: 'bg-blue-100 text-blue-700',
  viewed: 'bg-amber-100 text-amber-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
};

export default function ReportsPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'proposals' | 'jobs' | 'incidents'>('proposals');

  const tabs = [
    { key: 'proposals', label: 'Proposals', icon: FileText, count: demoProposals.length },
    { key: 'jobs', label: 'Job Reports', icon: Briefcase, count: demoJobs.filter((j) => j.status === 'completed').length },
    { key: 'incidents', label: 'Incidents', icon: AlertTriangle, count: demoIncidents.length },
  ] as const;

  return (
    <RoleGuard allowedRoles={['client']}>
      <PageHeader
        title="Reports & Documents"
        description="Download your project proposals, job reports, and incident summaries."
        actions={
          <Button
            variant="secondary"
            icon={<FileDown className="h-4 w-4" />}
            onClick={() => alert('Export all — PDF generation coming soon')}
          >
            Export All
          </Button>
        }
      />

      {/* Summary stats */}
      <div className="mb-8 grid grid-cols-3 gap-4">
        <div className="flex items-center gap-4 rounded-xl border border-[#E5E7EB] bg-white px-5 py-4 shadow-sm">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-teal-50">
            <FileText className="h-5 w-5 text-teal-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-[#111827]">{demoProposals.length}</p>
            <p className="text-xs text-[#6B7280]">Total Proposals</p>
          </div>
        </div>
        <div className="flex items-center gap-4 rounded-xl border border-[#E5E7EB] bg-white px-5 py-4 shadow-sm">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50">
            <CheckCircle className="h-5 w-5 text-emerald-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-[#111827]">{demoJobs.filter((j) => j.status === 'completed').length}</p>
            <p className="text-xs text-[#6B7280]">Completed Jobs</p>
          </div>
        </div>
        <div className="flex items-center gap-4 rounded-xl border border-[#E5E7EB] bg-white px-5 py-4 shadow-sm">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-50">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
          </div>
          <div>
            <p className="text-2xl font-bold text-[#111827]">{demoIncidents.length}</p>
            <p className="text-xs text-[#6B7280]">Incident Reports</p>
          </div>
        </div>
      </div>

      {/* Tab selector */}
      <div className="mb-6 flex gap-1 rounded-xl border border-[#E5E7EB] bg-white p-1 w-fit shadow-sm">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                'flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all',
                active
                  ? 'bg-teal-600 text-white shadow-sm'
                  : 'text-[#6B7280] hover:text-[#111827]'
              )}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
              <span
                className={cn(
                  'rounded-full px-1.5 py-0.5 text-xs font-semibold',
                  active ? 'bg-white/20 text-white' : 'bg-gray-100 text-[#374151]'
                )}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Proposals tab */}
      {activeTab === 'proposals' && (
        <Card>
          <CardHeader>
            <CardTitle>Proposal Documents</CardTitle>
            <p className="text-sm text-[#6B7280]">Review and download your proposals</p>
          </CardHeader>
          <div className="divide-y divide-[#E5E7EB]">
            {demoProposals.map((p) => (
              <div key={p.id} className="flex items-center gap-4 py-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50">
                  <FileText className="h-5 w-5 text-blue-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-[#111827]">{p.jobTitle}</p>
                  <p className="text-xs text-[#6B7280]">
                    Version {p.version} · {p.createdAt} ·{' '}
                    <span className="font-semibold text-[#374151]">
                      ${p.priceEstimate.toLocaleString()}
                    </span>
                  </p>
                </div>
                <span
                  className={cn(
                    'shrink-0 rounded-full px-3 py-1 text-xs font-medium',
                    proposalStatusColor[p.status]
                  )}
                >
                  {proposalStatusLabel[p.status]}
                </span>
                {p.pdfUrl ? (
                  <a href={p.pdfUrl}>
                    <Button size="sm" variant="secondary" icon={<Download className="h-4 w-4" />}>
                      PDF
                    </Button>
                  </a>
                ) : (
                  <Button size="sm" variant="ghost" disabled>
                    No PDF yet
                  </Button>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Job Reports tab */}
      {activeTab === 'jobs' && (
        <Card>
          <CardHeader>
            <CardTitle>Job Reports</CardTitle>
            <p className="text-sm text-[#6B7280]">Final reports for completed projects</p>
          </CardHeader>
          <div className="divide-y divide-[#E5E7EB]">
            {demoJobs.map((j) => (
              <div key={j.id} className="flex items-center gap-4 py-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-teal-50">
                  <Briefcase className="h-5 w-5 text-teal-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-[#111827]">{j.jobTitle}</p>
                  {j.completedDate ? (
                    <p className="text-xs text-[#6B7280]">Completed {j.completedDate}</p>
                  ) : (
                    <p className="text-xs text-amber-600 flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      In progress — report available on completion
                    </p>
                  )}
                </div>
                <StatusBadge status={j.status} />
                {j.jobReportUrl ? (
                  <a href={j.jobReportUrl}>
                    <Button size="sm" variant="secondary" icon={<Download className="h-4 w-4" />}>
                      Report
                    </Button>
                  </a>
                ) : (
                  <Button size="sm" variant="ghost" disabled>
                    Pending
                  </Button>
                )}
              </div>
            ))}
            {demoJobs.every((j) => j.status !== 'completed') && (
              <div className="py-8 text-center text-sm text-[#9CA3AF]">
                No completed job reports yet.
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Incidents tab */}
      {activeTab === 'incidents' && (
        <Card>
          <CardHeader>
            <CardTitle>Incident Reports</CardTitle>
            <p className="text-sm text-[#6B7280]">Safety incidents filed on your projects</p>
          </CardHeader>
          {demoIncidents.length === 0 ? (
            <div className="py-10 text-center">
              <CheckCircle className="mx-auto mb-3 h-8 w-8 text-emerald-400" />
              <p className="text-sm font-medium text-[#374151]">No incidents on your projects</p>
              <p className="text-xs text-[#9CA3AF]">All clear — nothing to report.</p>
            </div>
          ) : (
            <div className="divide-y divide-[#E5E7EB]">
              {demoIncidents.map((inc) => (
                <div key={inc.id} className="flex items-center gap-4 py-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-orange-50">
                    <AlertTriangle className="h-5 w-5 text-orange-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-[#111827]">{inc.jobTitle}</p>
                    <p className="text-xs text-[#6B7280]">{inc.createdAt}</p>
                  </div>
                  <span className={cn('shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium', severityColor[inc.severity])}>
                    {inc.severity.charAt(0).toUpperCase() + inc.severity.slice(1)}
                  </span>
                  <span
                    className={cn(
                      'shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium',
                      inc.resolutionStatus === 'resolved' || inc.resolutionStatus === 'closed'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-amber-100 text-amber-700'
                    )}
                  >
                    {inc.resolutionStatus.charAt(0).toUpperCase() + inc.resolutionStatus.slice(1)}
                  </span>
                  {inc.pdfUrl ? (
                    <a href={inc.pdfUrl}>
                      <Button size="sm" variant="secondary" icon={<Download className="h-4 w-4" />}>
                        PDF
                      </Button>
                    </a>
                  ) : (
                    <Button size="sm" variant="ghost" disabled>
                      No PDF
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>
      )}
    </RoleGuard>
  );
}
