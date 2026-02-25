'use client';

import { useState, useEffect, useCallback } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { DataTable } from '@/components/ui/DataTable';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { SlideOverPanel, SlideOverTabs } from '@/components/ui/SlideOverPanel';
import { Modal } from '@/components/ui/Modal';
import { Input, Textarea, Select } from '@/components/ui/FormFields';
import { ActionDropdown } from '@/components/ui/ActionDropdown';
import { AvatarStack } from '@/components/ui/Avatar';
import { RoleGuard } from '@/components/RoleGuard';
import { useAuth } from '@/context/AuthContext';
import { useTenant } from '@/context/TenantContext';
import { Plus, Search, Edit, Trash2, Eye, ChevronRight, Download, Play, Clock, FileText, Loader2 } from 'lucide-react';
import type { Job, JobStatus, JobPriority, User, Client, WorkSession, IncidentReport } from '@/lib/types';
import { JOB_STATUS_CONFIG, JOB_STATUS_FLOW } from '@/lib/types';
import { formatDate } from '@/lib/utils';
import {
  getJobs, getJobsByOperator, getJobsByClient, createJob, updateJob, deleteJob,
  getUsers, getClients,
  getWorkSessions, getIncidentReports,
} from '@/lib/firestore';

export default function JobsPage() {
  const { user } = useAuth();
  const { tenantId } = useTenant();
  const isOwnerOrAdmin = user?.role === 'owner' || user?.role === 'admin';
  const isOperator = user?.role === 'operator';
  const isClient = user?.role === 'client';

  // Derived from user context (no hardcoding)
  const myClientId = user?.linkedClientId ?? '';

  const [jobs, setJobs] = useState<Job[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [allClients, setAllClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  // Sessions + incidents loaded when a job is opened
  const [selectedJobSessions, setSelectedJobSessions] = useState<WorkSession[]>([]);
  const [selectedJobIncidents, setSelectedJobIncidents] = useState<IncidentReport[]>([]);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const [search, setSearch] = useState('');
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [slideOpen, setSlideOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [jobToEdit, setJobToEdit] = useState<Job | null>(null);
  const [jobToDelete, setJobToDelete] = useState<Job | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [jobNotes, setJobNotes] = useState<Record<string, string[]>>({});
  const [noteInput, setNoteInput] = useState('');

  // New Job form state
  const [newJobForm, setNewJobForm] = useState({
    title: '', description: '', priority: 'medium' as JobPriority,
    status: 'pending' as JobStatus, clientId: '', estimatedStart: '', estimatedEnd: '',
  });

  // Derived maps from loaded users
  const operatorNames: Record<string, string> = Object.fromEntries(allUsers.map((u) => [u.uid, u.displayName]));
  const allOperators = allUsers.filter((u) => u.role === 'operator').map((u) => ({ id: u.uid, name: u.displayName, role: 'Operator' }));

  // ── Load data ────────────────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);
    try {
      const [fetchedJobs, fetchedUsers, fetchedClients] = await Promise.all([
        isOperator && user?.uid
          ? getJobsByOperator(tenantId, user.uid)
          : isClient && myClientId
          ? getJobsByClient(tenantId, myClientId)
          : getJobs(tenantId),
        getUsers(tenantId),
        getClients(tenantId),
      ]);
      setJobs(fetchedJobs);
      setAllUsers(fetchedUsers);
      setAllClients(fetchedClients);
    } catch (err) {
      console.error('Failed to load jobs:', err);
    } finally {
      setLoading(false);
    }
  }, [tenantId, user?.uid, isOperator, isClient, myClientId]);

  useEffect(() => { loadData(); }, [loadData]);

  // Open job detail — also loads sessions + incidents
  const openDetail = useCallback(async (job: Job) => {
    setSelectedJob(job);
    setSlideOpen(true);
    setSelectedJobSessions([]);
    setSelectedJobIncidents([]);
    if (!isClient && tenantId) {
      setLoadingDetail(true);
      try {
        const [sessions, incidents] = await Promise.all([
          getWorkSessions(tenantId, job.id),
          getIncidentReports(tenantId, job.id),
        ]);
        setSelectedJobSessions(sessions);
        setSelectedJobIncidents(incidents);
      } catch (err) {
        console.error('Failed to load job detail:', err);
      } finally {
        setLoadingDetail(false);
      }
    }
  }, [tenantId, isClient]);

  // Operator assignment — toggle operator on selected job
  const toggleOperator = async (jobId: string, opId: string) => {
    if (!tenantId) return;
    const job = jobs.find((j) => j.id === jobId);
    if (!job) return;
    const newOperators = job.assignedOperators.includes(opId)
      ? job.assignedOperators.filter((id) => id !== opId)
      : [...job.assignedOperators, opId];
    try {
      await updateJob(tenantId, jobId, { assignedOperators: newOperators });
      setJobs((prev) => prev.map((j) => j.id === jobId ? { ...j, assignedOperators: newOperators, lastUpdated: new Date() } : j));
      setSelectedJob((prev) => prev && prev.id === jobId ? { ...prev, assignedOperators: newOperators } : prev);
    } catch (err) {
      console.error('Failed to update operators:', err);
    }
  };

  const addNote = (jobId: string, note: string) => {
    if (!note.trim()) return;
    setJobNotes((prev) => ({ ...prev, [jobId]: [...(prev[jobId] ?? []), note.trim()] }));
    setNoteInput('');
  };

  // Edit form state
  const [editForm, setEditForm] = useState({
    title: '',
    description: '',
    priority: 'medium' as JobPriority,
    status: 'lead' as JobStatus,
    estimatedStart: '',
    estimatedEnd: '',
  });

  const openEdit = (job: Job) => {
    setJobToEdit(job);
    setEditForm({
      title: job.title,
      description: job.description,
      priority: job.priority,
      status: job.status,
      estimatedStart: job.estimatedStart ? job.estimatedStart.toISOString().split('T')[0] : '',
      estimatedEnd: job.estimatedEnd ? job.estimatedEnd.toISOString().split('T')[0] : '',
    });
    setEditModalOpen(true);
  };

  const handleEditSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!jobToEdit || !tenantId) return;
    setSaving(true);
    const updates = {
      title: editForm.title,
      description: editForm.description,
      priority: editForm.priority,
      status: editForm.status,
      estimatedStart: editForm.estimatedStart ? new Date(editForm.estimatedStart) : jobToEdit.estimatedStart,
      estimatedEnd: editForm.estimatedEnd ? new Date(editForm.estimatedEnd) : jobToEdit.estimatedEnd,
    };
    try {
      await updateJob(tenantId, jobToEdit.id, updates);
      setJobs((prev) => prev.map((j) => j.id === jobToEdit.id ? { ...j, ...updates, lastUpdated: new Date() } : j));
      setEditModalOpen(false);
      setJobToEdit(null);
    } catch (err) {
      console.error('Failed to update job:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!jobToDelete || !tenantId) return;
    setSaving(true);
    try {
      await deleteJob(tenantId, jobToDelete.id);
      setJobs((prev) => prev.filter((j) => j.id !== jobToDelete.id));
      setDeleteConfirmOpen(false);
      setJobToDelete(null);
    } catch (err) {
      console.error('Failed to delete job:', err);
    } finally {
      setSaving(false);
    }
  };

  const advanceStatus = async (job: Job) => {
    if (!tenantId) return;
    const currentIdx = JOB_STATUS_FLOW.indexOf(job.status);
    if (currentIdx === -1 || currentIdx >= JOB_STATUS_FLOW.length - 1) return;
    const nextStatus = JOB_STATUS_FLOW[currentIdx + 1];
    try {
      await updateJob(tenantId, job.id, { status: nextStatus });
      setJobs((prev) => prev.map((j) => j.id === job.id ? { ...j, status: nextStatus, lastUpdated: new Date() } : j));
      setSelectedJob((prev) => prev && prev.id === job.id ? { ...prev, status: nextStatus } : prev);
    } catch (err) {
      console.error('Failed to advance status:', err);
    }
  };

  const filteredJobs = jobs.filter((job) => {
    const matchesSearch =
      (job.title ?? '').toLowerCase().includes(search.toLowerCase()) ||
      (job.description ?? '').toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || job.status === statusFilter;
    // Operator: already pre-filtered at fetch time via getJobsByOperator
    // Client: already pre-filtered at fetch time via getJobsByClient
    return matchesSearch && matchesStatus;
  });

  const priorityLabel = (p: JobPriority) => {
    const map: Record<JobPriority, string> = {
      low: '🟢 Low',
      medium: '🟡 Medium',
      high: '🟠 High',
      urgent: '🔴 Urgent',
    };
    return map[p];
  };

  const columns = [
    {
      key: 'title',
      header: 'Job',
      render: (job: Job) => (
        <div>
          <p className="font-medium text-[#111827]">{job.title}</p>
          <p className="text-xs text-[#6B7280]">{job.description.slice(0, 60)}...</p>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (job: Job) => <StatusBadge status={job.status} />,
    },
    {
      key: 'priority',
      header: 'Priority',
      render: (job: Job) => (
        <span className="text-sm">{priorityLabel(job.priority)}</span>
      ),
    },
    {
      key: 'operators',
      header: 'Team',
      render: (job: Job) =>
        job.assignedOperators.length > 0 ? (
          <AvatarStack
            names={job.assignedOperators.map((id) => operatorNames[id] || id)}
          />
        ) : (
          <span className="text-xs text-[#6B7280]">Unassigned</span>
        ),
    },
    {
      key: 'date',
      header: 'Start Date',
      render: (job: Job) => (
        <span className="text-sm text-[#6B7280]">{formatDate(job.estimatedStart)}</span>
      ),
    },
    {
      key: 'actions',
      header: '',
      className: 'w-32',
      render: (job: Job) =>
        isClient ? (
          <button
            onClick={(e) => { e.stopPropagation(); setSelectedJob(job); setSlideOpen(true); }}
            className="rounded-lg p-1.5 text-[#6B7280] hover:bg-gray-100"
            title="View details"
          >
            <Eye className="h-4 w-4" />
          </button>
        ) : isOperator ? (
          <div className="flex gap-1">
            {job.status === 'in_progress' ? (
              <button
                onClick={(e) => { e.stopPropagation(); }}
                className="inline-flex items-center gap-1 rounded-lg bg-teal-50 px-2.5 py-1.5 text-xs font-medium text-teal-700 hover:bg-teal-100"
              >
                <Clock className="h-3.5 w-3.5" />
                Log Hours
              </button>
            ) : (
              <button
                onClick={(e) => { e.stopPropagation(); }}
                className="inline-flex items-center gap-1 rounded-lg bg-green-50 px-2.5 py-1.5 text-xs font-medium text-green-700 hover:bg-green-100"
              >
                <Play className="h-3.5 w-3.5" />
                Start
              </button>
            )}
            <button
              onClick={(e) => { e.stopPropagation(); setSelectedJob(job); setSlideOpen(true); }}
              className="rounded-lg p-1.5 text-[#6B7280] hover:bg-gray-100"
            >
              <Eye className="h-4 w-4" />
            </button>
          </div>
        ) : (
        <ActionDropdown
          actions={[
            {
              label: 'View Details',
              icon: <Eye className="h-4 w-4" />,
              onClick: () => {
                setSelectedJob(job);
                setSlideOpen(true);
              },
            },
            ...(isOwnerOrAdmin
              ? [
                  {
                    label: 'Edit Job',
                    icon: <Edit className="h-4 w-4" />,
                    onClick: () => openEdit(job),
                  },
                  ...(JOB_STATUS_FLOW.indexOf(job.status) < JOB_STATUS_FLOW.length - 1
                    ? [
                        {
                          label: `Advance → ${JOB_STATUS_CONFIG[JOB_STATUS_FLOW[JOB_STATUS_FLOW.indexOf(job.status) + 1]]?.label || ''}`,
                          icon: <ChevronRight className="h-4 w-4" />,
                          onClick: () => advanceStatus(job),
                        },
                      ]
                    : []),
                  {
                    label: 'Delete',
                    icon: <Trash2 className="h-4 w-4" />,
                    onClick: () => {
                      setJobToDelete(job);
                      setDeleteConfirmOpen(true);
                    },
                    variant: 'danger' as const,
                  },
                ]
              : []),
          ]}
        />
        ),
    },
  ];

  return (
    <RoleGuard allowedRoles={['owner', 'admin', 'operator', 'client']}>
      <PageHeader
        title={isOperator ? 'My Jobs' : isClient ? 'My Projects' : 'Jobs'}
        description={
          isOperator
            ? 'Your assigned jobs.'
            : isClient
            ? 'Track your active and upcoming projects.'
            : 'Manage all jobs across the lifecycle.'
        }
        actions={
          <div className="flex gap-2">
            {isOwnerOrAdmin && (
              <Button
                variant="secondary"
                icon={<Download className="h-4 w-4" />}
                onClick={() => alert('Export CSV — connect to export utility')}
              >
                Export
              </Button>
            )}
            {isOwnerOrAdmin && (
              <Button icon={<Plus className="h-4 w-4" />} onClick={() => setModalOpen(true)}>
                New Job
              </Button>
            )}
          </div>
        }
      />

      {/* ─── Client: status pill filters ─────────────────────────────── */}
      {isClient && (
        <div className="mb-6 flex flex-wrap gap-2">
          {(['all', ...JOB_STATUS_FLOW] as const).map((s) => {
            const count = s === 'all' ? jobs.filter((j) => j.clientId === myClientId).length : jobs.filter((j) => j.clientId === myClientId && j.status === s).length;
            if (s !== 'all' && count === 0) return null;
            return (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${
                  statusFilter === s
                    ? 'border-teal-600 bg-teal-600 text-white'
                    : 'border-[#E5E7EB] text-[#6B7280] hover:border-teal-400'
                }`}
              >
                {s === 'all' ? `All (${count})` : `${JOB_STATUS_CONFIG[s].label} (${count})`}
              </button>
            );
          })}
        </div>
      )}

      {/* ─── Client: Project card grid ────────────────────────────────── */}
      {isClient && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filteredJobs.length === 0 && (
            <p className="col-span-3 py-16 text-center text-sm text-[#6B7280]">No projects found.</p>
          )}
          {filteredJobs.map((job) => {
            const statusIdx = JOB_STATUS_FLOW.indexOf(job.status);
            const progressPct = statusIdx >= 0 ? Math.round((statusIdx / (JOB_STATUS_FLOW.length - 1)) * 100) : 0;
            return (
              <div
                key={job.id}
                onClick={() => { setSelectedJob(job); setSlideOpen(true); }}
                className="cursor-pointer rounded-xl border border-[#E5E7EB] bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-[#111827]">{job.title}</p>
                    <p className="mt-0.5 text-xs text-[#6B7280]">
                      {job.estimatedStart ? `Starts ${formatDate(job.estimatedStart)}` : 'Start TBD'}
                      {job.estimatedEnd ? ` · Due ${formatDate(job.estimatedEnd)}` : ''}
                    </p>
                  </div>
                  <StatusBadge status={job.status} />
                </div>
                <p className="mt-3 text-sm text-[#6B7280] line-clamp-2">{job.description}</p>
                {/* Progress strip */}
                <div className="mt-4">
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-xs text-[#6B7280]">Progress</span>
                    <span className="text-xs font-medium text-[#111827]">{progressPct}%</span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-200">
                    <div
                      className="h-full rounded-full bg-teal-500 transition-all"
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); setSelectedJob(job); setSlideOpen(true); }}
                  className="mt-4 inline-flex items-center gap-1.5 text-xs font-medium text-teal-600 hover:underline"
                >
                  <Eye className="h-3.5 w-3.5" /> View Details
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* ─── Admin / Operator: search + table ────────────────────────── */}
      {!isClient && (
        <>
          {/* Filters */}
          <div className="mb-6 flex flex-wrap items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6B7280]" />
              <input
                type="text"
                placeholder="Search jobs..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-lg border border-[#E5E7EB] bg-white py-2 pl-10 pr-4 text-sm text-[#111827] placeholder:text-[#9CA3AF] focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-lg border border-[#E5E7EB] bg-white px-3 py-2 text-sm text-[#111827] focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
            >
              <option value="all">All Statuses</option>
              {JOB_STATUS_FLOW.map((s) => (
                <option key={s} value={s}>
                  {JOB_STATUS_CONFIG[s].label}
                </option>
              ))}
            </select>
          </div>

          {/* Table */}
          <DataTable
            columns={columns}
            data={filteredJobs}
            onRowClick={(job) => openDetail(job)}
            emptyMessage="No jobs found. Create your first job to get started."
          />
        </>
      )}

      {/* Slide-Over Detail Panel */}
      <SlideOverPanel
        open={slideOpen}
        onClose={() => setSlideOpen(false)}
        title={selectedJob?.title || 'Job Details'}
        width="max-w-xl"
      >
        {selectedJob && (
          <SlideOverTabs
            tabs={
              isClient
                ? [
                    {
                      key: 'overview',
                      label: 'Overview',
                      content: (
                        <div className="space-y-5">
                          {/* Status badge */}
                          <div>
                            <p className="text-xs font-medium uppercase tracking-wider text-[#6B7280]">Current Status</p>
                            <StatusBadge status={selectedJob.status} className="mt-2" />
                          </div>
                          {/* Progress through lifecycle */}
                          <div>
                            <p className="mb-2 text-xs font-medium uppercase tracking-wider text-[#6B7280]">Project Progress</p>
                            <div className="space-y-1.5">
                              {JOB_STATUS_FLOW.map((s, idx) => {
                                const currentIdx = JOB_STATUS_FLOW.indexOf(selectedJob.status);
                                const isPast = idx < currentIdx;
                                const isCurrent = idx === currentIdx;
                                return (
                                  <div key={s} className="flex items-center gap-3">
                                    <div
                                      className={`h-2.5 w-2.5 shrink-0 rounded-full ring-2 ${
                                        isCurrent
                                          ? 'bg-teal-500 ring-teal-200'
                                          : isPast
                                          ? 'bg-teal-300 ring-transparent'
                                          : 'bg-gray-200 ring-transparent'
                                      }`}
                                    />
                                    <span
                                      className={`text-sm ${
                                        isCurrent
                                          ? 'font-semibold text-teal-700'
                                          : isPast
                                          ? 'text-[#6B7280]'
                                          : 'text-gray-300'
                                      }`}
                                    >
                                      {JOB_STATUS_CONFIG[s].label}
                                    </span>
                                    {isCurrent && (
                                      <span className="ml-auto rounded-full bg-teal-100 px-2 py-0.5 text-[10px] font-medium text-teal-700">
                                        Current
                                      </span>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                          {/* Description */}
                          <div>
                            <p className="text-xs font-medium uppercase tracking-wider text-[#6B7280]">Description</p>
                            <p className="mt-1 text-sm leading-relaxed text-[#111827]">{selectedJob.description}</p>
                          </div>
                          {/* Dates */}
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <p className="text-xs font-medium uppercase tracking-wider text-[#6B7280]">Estimated Start</p>
                              <p className="mt-1 text-sm text-[#111827]">{formatDate(selectedJob.estimatedStart)}</p>
                            </div>
                            <div>
                              <p className="text-xs font-medium uppercase tracking-wider text-[#6B7280]">Estimated End</p>
                              <p className="mt-1 text-sm text-[#111827]">{formatDate(selectedJob.estimatedEnd)}</p>
                            </div>
                          </div>
                          {/* Priority */}
                          <div>
                            <p className="text-xs font-medium uppercase tracking-wider text-[#6B7280]">Priority</p>
                            <p className="mt-1 text-sm">{priorityLabel(selectedJob.priority)}</p>
                          </div>
                        </div>
                      ),
                    },
                    {
                      key: 'proposal',
                      label: 'Proposal',
                      content: (
                        <div className="space-y-4">
                          {selectedJob.proposalGenerated ? (
                            <>
                              <div className="rounded-lg border border-teal-200 bg-teal-50 p-4">
                                <p className="text-sm font-medium text-teal-900">A proposal has been generated for this project.</p>
                                <p className="mt-1 text-xs text-teal-700">Review and approve or reject it from the Proposals page.</p>
                              </div>
                              <Button
                                variant="secondary"
                                className="w-full"
                                icon={<FileText className="h-4 w-4" />}
                                onClick={() => window.location.href = '/proposals'}
                              >
                                Go to Proposals
                              </Button>
                            </>
                          ) : (
                            <p className="text-sm text-[#6B7280]">No proposal has been created for this project yet.</p>
                          )}
                        </div>
                      ),
                    },
                  ]
                : [
              {
                key: 'overview',
                label: 'Overview',
                content: (
                  <div className="space-y-4">
                    <div>
                      <p className="text-xs font-medium text-[#6B7280]">Status</p>
                      <StatusBadge status={selectedJob.status} className="mt-1" />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-[#6B7280]">Priority</p>
                      <p className="mt-1 text-sm">{priorityLabel(selectedJob.priority)}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-[#6B7280]">Description</p>
                      <p className="mt-1 text-sm text-[#111827]">{selectedJob.description}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs font-medium text-[#6B7280]">Est. Start</p>
                        <p className="mt-1 text-sm">{formatDate(selectedJob.estimatedStart)}</p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-[#6B7280]">Est. End</p>
                        <p className="mt-1 text-sm">{formatDate(selectedJob.estimatedEnd)}</p>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-[#6B7280]">Assigned Operators</p>
                      <div className="mt-2 space-y-1">
                        {selectedJob.assignedOperators.length > 0 ? (
                          selectedJob.assignedOperators.map((id) => (
                            <p key={id} className="text-sm">{operatorNames[id] || id}</p>
                          ))
                        ) : (
                          <p className="text-sm text-[#6B7280]">No operators assigned</p>
                        )}
                      </div>
                    </div>
                    {/* Notes */}
                    <div className="border-t border-[#E5E7EB] pt-4">
                      <p className="mb-2 text-xs font-medium uppercase tracking-wider text-[#6B7280]">Notes</p>
                      {(jobNotes[selectedJob.id] ?? []).length === 0 ? (
                        <p className="text-xs text-[#9CA3AF]">No notes yet.</p>
                      ) : (
                        <ul className="mb-3 space-y-2">
                          {(jobNotes[selectedJob.id] ?? []).map((note, ni) => (
                            <li key={ni} className="rounded-lg bg-gray-50 px-3 py-2 text-sm text-[#374151]">
                              {note}
                            </li>
                          ))}
                        </ul>
                      )}
                      {isOwnerOrAdmin && (
                        <div className="flex gap-2">
                          <input
                            type="text"
                            placeholder="Add a note..."
                            value={noteInput}
                            onChange={(e) => setNoteInput(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') addNote(selectedJob.id, noteInput); }}
                            className="flex-1 rounded-lg border border-[#E5E7EB] px-3 py-1.5 text-sm text-[#111827] placeholder:text-[#9CA3AF] focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                          />
                          <Button size="sm" onClick={() => addNote(selectedJob.id, noteInput)}>Add</Button>
                        </div>
                      )}
                    </div>
                  </div>
                ),
              },
              {
                key: 'sessions',
                label: 'Sessions',
                content: (() => {
                  if (loadingDetail) return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-[#9CA3AF]" /></div>;
                  const sessions = selectedJobSessions;
                  const totalHrs = sessions.reduce((a, s) => {
                    if (s.endTime) {
                      const ms = s.endTime.getTime() - s.startTime.getTime();
                      return a + ms / 3_600_000;
                    }
                    return a;
                  }, 0);
                  return sessions.length === 0 ? (
                    <p className="text-sm text-[#6B7280]">No work sessions recorded yet.</p>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between rounded-lg bg-teal-50 px-4 py-2.5">
                        <span className="text-xs font-medium text-teal-700">Total hours logged</span>
                        <span className="text-sm font-bold text-teal-800">{totalHrs.toFixed(1)} hrs</span>
                      </div>
                      {sessions.map((s) => (
                        <div key={s.id} className="rounded-lg border border-[#E5E7EB] p-3.5">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-[#111827]">{operatorNames[s.operatorId] ?? s.operatorId}</span>
                            <span className="text-xs text-[#6B7280]">{formatDate(s.date)}</span>
                          </div>
                          {s.notes && <p className="mt-1 text-xs text-[#6B7280]">{s.notes}</p>}
                        </div>
                      ))}
                    </div>
                  );
                })(),
              },
              {
                key: 'incidents',
                label: 'Incidents',
                content: (() => {
                  if (loadingDetail) return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-[#9CA3AF]" /></div>;
                  const incidents = selectedJobIncidents;
                  const severityColor: Record<string, string> = {
                    low: 'bg-gray-100 text-gray-700',
                    medium: 'bg-amber-100 text-amber-800',
                    high: 'bg-red-100 text-red-700',
                    critical: 'bg-red-200 text-red-900',
                  };
                  const resolutionColor: Record<string, string> = {
                    open: 'text-red-600',
                    investigating: 'text-amber-600',
                    resolved: 'text-teal-600',
                    closed: 'text-gray-500',
                  };
                  return incidents.length === 0 ? (
                    <p className="text-sm text-[#6B7280]">No incidents reported for this job.</p>
                  ) : (
                    <div className="space-y-3">
                      {incidents.map((inc) => (
                        <div key={inc.id} className="rounded-lg border border-[#E5E7EB] p-3.5">
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-sm font-medium text-[#111827]">{inc.description.slice(0, 80)}</p>
                            <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${severityColor[inc.severity] ?? ''}`}>{inc.severity}</span>
                          </div>
                          <p className="mt-1 text-xs text-[#6B7280]">{operatorNames[inc.operatorId] ?? inc.operatorId} · {formatDate(inc.createdAt)}</p>
                          <p className={`mt-1 text-xs font-medium capitalize ${resolutionColor[inc.resolutionStatus] ?? ''}`}>{inc.resolutionStatus}</p>
                        </div>
                      ))}
                    </div>
                  );
                })(),
              },
              {
                key: 'assign',
                label: 'Assign',
                content: (
                  <div className="space-y-4">
                    <p className="text-xs font-medium uppercase tracking-wider text-[#6B7280]">
                      {selectedJob.assignedOperators.length === 0 ? 'No operators assigned yet' : `${selectedJob.assignedOperators.length} assigned`}
                    </p>
                    <div className="space-y-2">
                      {allOperators.map((op) => {
                        const assigned = selectedJob.assignedOperators.includes(op.id);
                        return (
                          <div
                            key={op.id}
                            className={`flex items-center justify-between rounded-lg border p-3 transition-colors ${
                              assigned ? 'border-teal-200 bg-teal-50' : 'border-[#E5E7EB] bg-white hover:bg-gray-50'
                            }`}
                          >
                            <div>
                              <p className="text-sm font-medium text-[#111827]">{op.name}</p>
                              <p className="text-xs text-[#6B7280]">{op.role}</p>
                            </div>
                            <button
                              onClick={() => toggleOperator(selectedJob.id, op.id)}
                              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                                assigned
                                  ? 'bg-teal-600 text-white hover:bg-teal-700'
                                  : 'border border-[#E5E7EB] text-[#6B7280] hover:border-teal-400 hover:text-teal-600'
                              }`}
                            >
                              {assigned ? 'Assigned ✓' : 'Assign'}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ),
              },
              {
                key: 'proposal',
                label: 'Proposal',
                content: (
                  <div className="space-y-4">
                    {selectedJob.proposalGenerated ? (
                      <>
                        <div className="rounded-lg border border-teal-200 bg-teal-50 p-4">
                          <p className="text-sm font-medium text-teal-900">Proposal generated for this job.</p>
                          <p className="mt-1 text-xs text-teal-700">View, edit, or send it from the Proposals page.</p>
                        </div>
                        <Button variant="secondary" className="w-full" icon={<FileText className="h-4 w-4" />}
                          onClick={() => { window.location.href = '/proposals'; }}>
                          Go to Proposals
                        </Button>
                      </>
                    ) : (
                      <>
                        <p className="text-sm text-[#6B7280]">No proposal created for this job yet.</p>
                        {isOwnerOrAdmin && (
                          <Button variant="secondary" className="w-full" icon={<FileText className="h-4 w-4" />}
                            onClick={() => { window.location.href = '/proposals'; }}>
                            Create Proposal
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                ),
              },
            ]}
          />
        )}
      </SlideOverPanel>

      {/* New Job Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Create New Job" maxWidth="max-w-lg">
        <form className="space-y-4" onSubmit={async (e) => {
          e.preventDefault();
          if (!tenantId || !user) return;
          setSaving(true);
          try {
            const newJob = await createJob(tenantId, {
              title: newJobForm.title,
              description: newJobForm.description,
              priority: newJobForm.priority,
              status: newJobForm.status,
              clientId: newJobForm.clientId,
              estimatedStart: newJobForm.estimatedStart ? new Date(newJobForm.estimatedStart) : undefined,
              estimatedEnd: newJobForm.estimatedEnd ? new Date(newJobForm.estimatedEnd) : undefined,
              assignedOperators: [],
              proposalGenerated: false,
              createdBy: user.uid,
            });
            setJobs((prev) => [...prev, newJob]);
            setNewJobForm({ title: '', description: '', priority: 'medium', status: 'lead', clientId: '', estimatedStart: '', estimatedEnd: '' });
            setModalOpen(false);
          } catch (err) {
            console.error('Failed to create job:', err);
          } finally {
            setSaving(false);
          }
        }}>
          <Input label="Job Title" id="jobTitle" placeholder="e.g., Electrical Panel Upgrade" required
            value={newJobForm.title} onChange={(e) => setNewJobForm((f) => ({ ...f, title: e.target.value }))} />
          <Textarea label="Description" id="jobDesc" placeholder="Describe the job scope..."
            value={newJobForm.description} onChange={(e) => setNewJobForm((f) => ({ ...f, description: e.target.value }))} />
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Priority"
              id="jobPriority"
              value={newJobForm.priority}
              onChange={(e) => setNewJobForm((f) => ({ ...f, priority: e.target.value as JobPriority }))}
              options={[
                { value: 'low', label: 'Low' },
                { value: 'medium', label: 'Medium' },
                { value: 'high', label: 'High' },
                { value: 'urgent', label: 'Urgent' },
              ]}
            />
            <Select
              label="Status"
              id="jobStatus"
              value={newJobForm.status}
              onChange={(e) => setNewJobForm((f) => ({ ...f, status: e.target.value as JobStatus }))}
              options={JOB_STATUS_FLOW.map((s) => ({
                value: s,
                label: JOB_STATUS_CONFIG[s].label,
              }))}
            />
          </div>
          {isOwnerOrAdmin && (
            <Select
              label="Client"
              id="jobClient"
              value={newJobForm.clientId}
              onChange={(e) => setNewJobForm((f) => ({ ...f, clientId: e.target.value }))}
              options={[{ value: '', label: '— Select client —' }, ...allClients.map((c) => ({ value: c.id, label: c.companyName }))]}
            />
          )}
          <Input label="Estimated Start" id="jobStart" type="date"
            value={newJobForm.estimatedStart} onChange={(e) => setNewJobForm((f) => ({ ...f, estimatedStart: e.target.value }))} />
          <Input label="Estimated End" id="jobEnd" type="date"
            value={newJobForm.estimatedEnd} onChange={(e) => setNewJobForm((f) => ({ ...f, estimatedEnd: e.target.value }))} />
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="secondary" type="button" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>{saving ? 'Creating…' : 'Create Job'}</Button>
          </div>
        </form>
      </Modal>

      {/* Edit Job Modal */}
      <Modal open={editModalOpen} onClose={() => setEditModalOpen(false)} title="Edit Job" maxWidth="max-w-lg">
        <form className="space-y-4" onSubmit={handleEditSave}>
          <Input
            label="Job Title"
            id="editJobTitle"
            value={editForm.title}
            onChange={(e) => setEditForm((f) => ({ ...f, title: e.target.value }))}
            required
          />
          <Textarea
            label="Description"
            id="editJobDesc"
            value={editForm.description}
            onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
          />
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Priority"
              id="editJobPriority"
              value={editForm.priority}
              onChange={(e) => setEditForm((f) => ({ ...f, priority: e.target.value as JobPriority }))}
              options={[
                { value: 'low', label: 'Low' },
                { value: 'medium', label: 'Medium' },
                { value: 'high', label: 'High' },
                { value: 'urgent', label: 'Urgent' },
              ]}
            />
            <Select
              label="Status"
              id="editJobStatus"
              value={editForm.status}
              onChange={(e) => setEditForm((f) => ({ ...f, status: e.target.value as JobStatus }))}
              options={JOB_STATUS_FLOW.map((s) => ({
                value: s,
                label: JOB_STATUS_CONFIG[s].label,
              }))}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Estimated Start"
              id="editJobStart"
              type="date"
              value={editForm.estimatedStart}
              onChange={(e) => setEditForm((f) => ({ ...f, estimatedStart: e.target.value }))}
            />
            <Input
              label="Estimated End"
              id="editJobEnd"
              type="date"
              value={editForm.estimatedEnd}
              onChange={(e) => setEditForm((f) => ({ ...f, estimatedEnd: e.target.value }))}
            />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="secondary" type="button" onClick={() => setEditModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" icon={<Edit className="h-4 w-4" />}>Save Changes</Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal open={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)} title="Delete Job" maxWidth="max-w-sm">
        <div className="space-y-4">
          <p className="text-sm text-[#374151]">
            Are you sure you want to delete <strong>&ldquo;{jobToDelete?.title}&rdquo;</strong>? This action cannot be
            undone.
          </p>
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setDeleteConfirmOpen(false)}>Cancel</Button>
            <Button variant="danger" onClick={handleDelete} icon={<Trash2 className="h-4 w-4" />}>
              Delete Job
            </Button>
          </div>
        </div>
      </Modal>
    </RoleGuard>
  );
}
