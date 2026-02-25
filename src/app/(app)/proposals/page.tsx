'use client';

import { useState, useEffect, useCallback } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { SlideOverPanel, SlideOverTabs } from '@/components/ui/SlideOverPanel';
import { Modal } from '@/components/ui/Modal';
import { Input, Textarea, Select } from '@/components/ui/FormFields';
import { RoleGuard } from '@/components/RoleGuard';
import { useAuth } from '@/context/AuthContext';
import { useTenant } from '@/context/TenantContext';
import {
  Plus, FileText, CheckCircle, XCircle, Clock, Send,
  Briefcase, Download, Eye, Loader2, Save,
} from 'lucide-react';
import type { Proposal, ProposalStatus, Job, Client } from '@/lib/types';
import { cn, formatDate } from '@/lib/utils';
import {
  getProposals, createProposal, updateProposal,
  getJobs, getJobsByClient, createJob, getClients,
} from '@/lib/firestore';

const statusConfig: Record<ProposalStatus, { label: string; color: string; icon: React.ReactNode }> = {
  draft: { label: 'Draft', color: 'text-gray-600 bg-gray-100', icon: <FileText className="h-4 w-4" /> },
  sent: { label: 'Sent', color: 'text-blue-600 bg-blue-100', icon: <Send className="h-4 w-4" /> },
  viewed: { label: 'Viewed', color: 'text-teal-600 bg-teal-100', icon: <Clock className="h-4 w-4" /> },
  approved: { label: 'Approved', color: 'text-green-600 bg-green-100', icon: <CheckCircle className="h-4 w-4" /> },
  rejected: { label: 'Rejected', color: 'text-red-600 bg-red-100', icon: <XCircle className="h-4 w-4" /> },
};


export default function ProposalsPage() {
  const { user } = useAuth();
  const { tenantId } = useTenant();
  const isOwnerOrAdmin = user?.role === 'owner' || user?.role === 'admin';
  const isClient = user?.role === 'client';

  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [allJobs, setAllJobs] = useState<Job[]>([]);
  const [allClients, setAllClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selected, setSelected] = useState<Proposal | null>(null);
  const [slideOpen, setSlideOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{ type: 'approve' | 'reject' | 'convert'; proposal: Proposal } | null>(null);
  const [ownerNote, setOwnerNote] = useState('');
  const [statusFilter, setStatusFilter] = useState<ProposalStatus | 'all'>('all');
  const [newProposalForm, setNewProposalForm] = useState({ jobId: '', scope: '', notes: '', priceEstimate: '' });
  const [editForm, setEditForm] = useState({ aiGeneratedText: '', priceEstimate: '', scope: '', notes: '' });
  const [editSaving, setEditSaving] = useState(false);
  const [editSuccess, setEditSuccess] = useState(false);

  // ── Load data ────────────────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);
    try {
      const [fetchedJobs, fetchedClients] = await Promise.all([
        isClient && user?.linkedClientId
          ? getJobsByClient(tenantId, user.linkedClientId)
          : getJobs(tenantId),
        isOwnerOrAdmin ? getClients(tenantId) : Promise.resolve([] as Client[]),
      ]);
      setAllJobs(fetchedJobs);
      setAllClients(fetchedClients);
      // Load proposals after jobs so we can filter by client job IDs
      const jobIds = fetchedJobs.map((j) => j.id);
      const allProposals = await getProposals(tenantId);
      const filteredForRole = isClient
        ? allProposals.filter((p) => jobIds.includes(p.jobId))
        : allProposals;
      setProposals(filteredForRole);
    } catch (err) {
      console.error('Failed to load proposals:', err);
    } finally {
      setLoading(false);
    }
  }, [tenantId, user?.uid, isClient, isOwnerOrAdmin, user?.linkedClientId]);

  useEffect(() => { loadData(); }, [loadData]);

  // ── Derived display helpers ───────────────────────────────────────────────
  const getJobTitle = (jobId: string) => allJobs.find((j) => j.id === jobId)?.title ?? jobId;
  const getClientName = (jobId: string) => {
    const job = allJobs.find((j) => j.id === jobId);
    if (!job) return '';
    return allClients.find((c) => c.id === job.clientId)?.companyName ?? job.clientId;
  };
  const getJobScope = (p: Proposal) => (p.specsJson?.scope as string) ?? p.aiGeneratedText ?? '';
  const getProposalNotes = (p: Proposal) => (p.specsJson?.notes as string) ?? '';

  // ── Filtered list ────────────────────────────────────────────────────────
  const filtered = proposals.filter((p) => statusFilter === 'all' || p.status === statusFilter);

  // ── Mutations ─────────────────────────────────────────────────────────────
  const handleStatusChange = async (id: string, newStatus: ProposalStatus, note?: string) => {
    if (!tenantId) return;
    try {
      const updates: Partial<Proposal> = { status: newStatus };
      if (note) {
        const existing = proposals.find((p) => p.id === id);
        const existingNotes = (existing?.specsJson?.notes as string) ?? '';
        updates.specsJson = { ...(existing?.specsJson ?? {}), notes: existingNotes ? `${existingNotes}\n${note}` : note };
      }
      await updateProposal(tenantId, id, updates);
      setProposals((prev) => prev.map((p) => p.id === id ? { ...p, ...updates } : p));
      setSelected((prev) => prev && prev.id === id ? { ...prev, ...updates } : prev);
    } catch (err) {
      console.error('Failed to update proposal:', err);
    } finally {
      setConfirmAction(null);
      setOwnerNote('');
    }
  };

  const handleEditSave = async () => {
    if (!selected || !tenantId) return;
    setEditSaving(true);
    try {
      const updates: Partial<Proposal> = {
        aiGeneratedText: editForm.aiGeneratedText,
        priceEstimate: parseFloat(editForm.priceEstimate) || 0,
        specsJson: { ...(selected.specsJson ?? {}), scope: editForm.scope, notes: editForm.notes },
        version: selected.version + 1,
      };
      await updateProposal(tenantId, selected.id, updates);
      setProposals((prev) => prev.map((p) => p.id === selected.id ? { ...p, ...updates } : p));
      setSelected((prev) => prev ? { ...prev, ...updates } : prev);
      setEditSuccess(true);
    } catch (err) {
      console.error('Failed to update proposal:', err);
      alert('Failed to save changes.');
    } finally {
      setEditSaving(false);
    }
  };

  const openDetail = async (p: Proposal) => {
    setEditForm({
      aiGeneratedText: p.aiGeneratedText ?? '',
      priceEstimate: String(p.priceEstimate),
      scope: (p.specsJson?.scope as string) ?? '',
      notes: (p.specsJson?.notes as string) ?? '',
    });
    setEditSuccess(false);
    if (isClient && p.status === 'sent' && tenantId) {
      // Auto-mark as viewed
      await handleStatusChange(p.id, 'viewed');
      setSelected({ ...p, status: 'viewed' });
    } else {
      setSelected(p);
    }
    setSlideOpen(true);
  };

  const summaryStatuses: ProposalStatus[] = ['draft', 'sent', 'viewed', 'approved', 'rejected'];

  return (
    <RoleGuard allowedRoles={['owner', 'admin', 'client']}>
      <PageHeader
        title="Proposals"
        description={
          isClient
            ? 'Review proposals for your projects and approve or reject them.'
            : 'Create, send, approve, and convert proposals to jobs.'
        }
        actions={
          <div className="flex gap-2">
            {isOwnerOrAdmin && (
              <Button variant="secondary" icon={<Download className="h-4 w-4" />} onClick={() => alert('Export CSV — connect to export utility')}>
                Export
              </Button>
            )}
            {isOwnerOrAdmin && (
              <Button icon={<Plus className="h-4 w-4" />} onClick={() => setModalOpen(true)}>
                New Proposal
              </Button>
            )}
          </div>
        }
      />

      {/* Summary stat strip */}
      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-[#9CA3AF]" />
        </div>
      ) : (
        <>
      <div className="mb-6 flex flex-wrap gap-2">
        <button
          onClick={() => setStatusFilter('all')}
          className={cn(
            'rounded-full border px-4 py-1.5 text-sm font-medium transition-colors',
            statusFilter === 'all' ? 'border-teal-600 bg-teal-600 text-white' : 'border-[#E5E7EB] text-[#6B7280] hover:border-teal-400'
          )}
        >
          All ({proposals.length})
        </button>
        {summaryStatuses.map((status) => {
          const count = proposals.filter((p) => p.status === status).length;
          const cfg = statusConfig[status];
          return (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full border px-4 py-1.5 text-sm font-medium transition-colors',
                statusFilter === status
                  ? 'border-teal-600 bg-teal-600 text-white'
                  : `border-[#E5E7EB] ${cfg.color} hover:border-teal-400`
              )}
            >
              {cfg.label} ({count})
            </button>
          );
        })}
      </div>

      {/* Proposals Grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filtered.map((proposal) => {
          const cfg = statusConfig[proposal.status];
          return (
            <div
              key={proposal.id}
              onClick={() => openDetail(proposal)}
              className="cursor-pointer"
            >
            <Card
              className="transition-shadow hover:shadow-md"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <h3 className="truncate font-medium text-[#111827]">{getJobTitle(proposal.jobId)}</h3>
                  <p className="text-sm text-[#6B7280]">{getClientName(proposal.jobId)}</p>
                </div>
                <span className={cn('ml-2 inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium', cfg.color)}>
                  {cfg.icon}
                  {cfg.label}
                </span>
              </div>

              {getJobScope(proposal) && (
                <p className="mt-2 text-xs text-[#6B7280] line-clamp-2">{getJobScope(proposal)}</p>
              )}

              <div className="mt-4 flex items-center justify-between border-t border-[#E5E7EB] pt-4">
                <div>
                  <p className="text-xl font-semibold text-[#111827]">
                    ${proposal.priceEstimate.toLocaleString()}
                  </p>
                  <p className="text-xs text-[#6B7280]">v{proposal.version} · {formatDate(proposal.createdAt)}</p>
                </div>
                {/* Quick actions on card */}
                {(isOwnerOrAdmin || isClient) && (
                  <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                    {(proposal.status === 'sent' || proposal.status === 'viewed') && (
                      <>
                        <button
                          onClick={() => setConfirmAction({ type: 'approve', proposal })}
                          title="Approve"
                          className="rounded-lg p-1.5 text-green-600 hover:bg-green-50"
                        >
                          <CheckCircle className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setConfirmAction({ type: 'reject', proposal })}
                          title="Reject"
                          className="rounded-lg p-1.5 text-red-500 hover:bg-red-50"
                        >
                          <XCircle className="h-4 w-4" />
                        </button>
                      </>
                    )}
                    {isOwnerOrAdmin && proposal.status === 'approved' && (
                      <button
                        onClick={() => setConfirmAction({ type: 'convert', proposal })}
                        title="Convert to Job"
                        className="rounded-lg p-1.5 text-teal-600 hover:bg-teal-50"
                      >
                        <Briefcase className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            </Card>
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="col-span-3 py-16 text-center text-sm text-[#6B7280]">
            No proposals match the selected filter.
          </div>
        )}
      </div>
      </>
      )}

      {/* Detail Slide-Over */}
      <SlideOverPanel
        open={slideOpen}
        onClose={() => setSlideOpen(false)}
        title={selected ? getJobTitle(selected.jobId) : 'Proposal'}
        width="max-w-xl"
      >
        {selected && (
          <SlideOverTabs
            tabs={[
              {
                key: 'overview',
                label: 'Overview',
                content: (
                  <div className="space-y-6">
                    {/* Status banner */}
                    <div className={cn('flex items-center gap-2 rounded-lg px-4 py-3', statusConfig[selected.status].color)}>
                      {statusConfig[selected.status].icon}
                      <span className="font-medium">{statusConfig[selected.status].label}</span>
                      <span className="ml-auto text-xs opacity-75">v{selected.version}</span>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-xs font-medium uppercase tracking-wider text-[#6B7280]">Client</p>
                        <p className="mt-1 font-medium text-[#111827]">{getClientName(selected.jobId)}</p>
                      </div>
                      <div>
                        <p className="text-xs font-medium uppercase tracking-wider text-[#6B7280]">Value</p>
                        <p className="mt-1 font-semibold text-[#111827]">${selected.priceEstimate.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-xs font-medium uppercase tracking-wider text-[#6B7280]">Created</p>
                        <p className="mt-1 text-[#111827]">{formatDate(selected.createdAt)}</p>
                      </div>
                      <div>
                        <p className="text-xs font-medium uppercase tracking-wider text-[#6B7280]">Version</p>
                        <p className="mt-1 text-[#111827]">v{selected.version}</p>
                      </div>
                    </div>

                    {getJobScope(selected) && (
                      <div>
                        <p className="text-xs font-medium uppercase tracking-wider text-[#6B7280]">Scope of Work</p>
                        <p className="mt-2 text-sm text-[#374151] leading-relaxed">{getJobScope(selected)}</p>
                      </div>
                    )}

                    {getProposalNotes(selected) && (
                      <div className="rounded-lg bg-amber-50 p-4">
                        <p className="text-xs font-medium uppercase tracking-wider text-amber-700">Notes</p>
                        <p className="mt-1 text-sm text-amber-900">{getProposalNotes(selected)}</p>
                      </div>
                    )}

                    {/* Client Actions */}
                    {isClient && (selected.status === 'sent' || selected.status === 'viewed') && (
                      <div className="space-y-2 border-t border-[#E5E7EB] pt-4">
                        <p className="text-xs font-medium uppercase tracking-wider text-[#6B7280]">Your Decision</p>
                        <div className="flex flex-wrap gap-2">
                          <Button
                            size="sm"
                            onClick={() => setConfirmAction({ type: 'approve', proposal: selected })}
                            icon={<CheckCircle className="h-4 w-4" />}
                          >
                            Approve Proposal
                          </Button>
                          <Button
                            size="sm"
                            variant="danger"
                            onClick={() => setConfirmAction({ type: 'reject', proposal: selected })}
                            icon={<XCircle className="h-4 w-4" />}
                          >
                            Reject Proposal
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Owner Actions */}
                    {isOwnerOrAdmin && (
                      <div className="space-y-2 border-t border-[#E5E7EB] pt-4">
                        <p className="text-xs font-medium uppercase tracking-wider text-[#6B7280]">Owner Actions</p>
                        <div className="flex flex-wrap gap-2">
                          {(selected.status === 'sent' || selected.status === 'viewed') && (
                            <>
                              <Button
                                size="sm"
                                onClick={() => setConfirmAction({ type: 'approve', proposal: selected })}
                                icon={<CheckCircle className="h-4 w-4" />}
                              >
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="danger"
                                onClick={() => setConfirmAction({ type: 'reject', proposal: selected })}
                                icon={<XCircle className="h-4 w-4" />}
                              >
                                Reject
                              </Button>
                            </>
                          )}
                          {selected.status === 'approved' && (
                            <Button
                              size="sm"
                              onClick={() => setConfirmAction({ type: 'convert', proposal: selected })}
                              icon={<Briefcase className="h-4 w-4" />}
                            >
                              Convert to Job
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="secondary"
                            icon={<Download className="h-4 w-4" />}
                            onClick={() => alert('PDF export — connect to PDF generation service')}
                          >
                            Export PDF
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                ),
              },
              ...(isOwnerOrAdmin ? [{
                key: 'edit',
                label: 'Edit Content',
                content: (
                  <div className="space-y-4">
                    {editSuccess && (
                      <div className="flex items-center gap-2 rounded-lg bg-green-50 px-4 py-3 text-sm text-green-800">
                        <CheckCircle className="h-4 w-4 shrink-0" />
                        Changes saved — now v{selected.version}
                      </div>
                    )}
                    <div>
                      <p className="mb-1 text-xs font-medium uppercase tracking-wider text-[#6B7280]">Price Estimate ($)</p>
                      <input
                        type="number"
                        value={editForm.priceEstimate}
                        onChange={(e) => setEditForm((f) => ({ ...f, priceEstimate: e.target.value }))}
                        placeholder="0.00"
                        className="w-full rounded-lg border border-[#E5E7EB] bg-white p-3 text-sm text-[#111827] placeholder-[#9CA3AF] focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-200"
                      />
                    </div>
                    <div>
                      <p className="mb-1 text-xs font-medium uppercase tracking-wider text-[#6B7280]">Scope of Work</p>
                      <textarea
                        value={editForm.scope}
                        onChange={(e) => setEditForm((f) => ({ ...f, scope: e.target.value }))}
                        rows={3}
                        placeholder="Describe the scope..."
                        className="w-full rounded-lg border border-[#E5E7EB] bg-white p-3 text-sm text-[#111827] placeholder-[#9CA3AF] focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-200"
                      />
                    </div>
                    <div>
                      <p className="mb-1 text-xs font-medium uppercase tracking-wider text-[#6B7280]">Notes</p>
                      <textarea
                        value={editForm.notes}
                        onChange={(e) => setEditForm((f) => ({ ...f, notes: e.target.value }))}
                        rows={3}
                        placeholder="Additional notes..."
                        className="w-full rounded-lg border border-[#E5E7EB] bg-white p-3 text-sm text-[#111827] placeholder-[#9CA3AF] focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-200"
                      />
                    </div>
                    <div>
                      <p className="mb-1 text-xs font-medium uppercase tracking-wider text-[#6B7280]">AI Generated Content</p>
                      <textarea
                        value={editForm.aiGeneratedText}
                        onChange={(e) => setEditForm((f) => ({ ...f, aiGeneratedText: e.target.value }))}
                        rows={12}
                        placeholder="AI generated proposal text..."
                        className="w-full rounded-lg border border-[#E5E7EB] bg-white p-3 font-mono text-sm text-[#111827] placeholder-[#9CA3AF] focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-200"
                      />
                    </div>
                    <div className="flex justify-end pt-2">
                      <Button
                        icon={editSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                        onClick={handleEditSave}
                        disabled={editSaving}
                      >
                        {editSaving ? 'Saving…' : 'Save Changes'}
                      </Button>
                    </div>
                  </div>
                ),
              }] : []),
              {
                key: 'versions',
                label: 'Version History',
                content: (
                  <div className="space-y-3">
                    {Array.from({ length: selected.version }, (_, i) => selected.version - i).map((v) => (
                      <div key={v} className="flex items-center justify-between rounded-lg border border-[#E5E7EB] p-4">
                        <div>
                          <p className="text-sm font-medium text-[#111827]">Version {v}</p>
                          <p className="text-xs text-[#6B7280]">
                            {v === selected.version ? formatDate(selected.createdAt) : `Earlier revision`}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          {v === selected.version && (
                            <span className="rounded-full bg-teal-100 px-2 py-0.5 text-xs font-medium text-teal-700">
                              Current
                            </span>
                          )}
                          <Button size="sm" variant="ghost" icon={<Eye className="h-3.5 w-3.5" />}>
                            View
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ),
              },
            ]}
          />
        )}
      </SlideOverPanel>

      {/* Approve Confirmation */}
      <Modal
        open={confirmAction?.type === 'approve'}
        onClose={() => setConfirmAction(null)}
        title="Approve Proposal"
        maxWidth="max-w-md"
      >
        <div className="space-y-4">
          <p className="text-sm text-[#374151]">
            Approve proposal for <strong>{confirmAction && getJobTitle(confirmAction.proposal.jobId)}</strong> (
            ${confirmAction?.proposal.priceEstimate.toLocaleString()})? You can add a note before confirming.
          </p>
          <Textarea
            label="Approval Note (optional)"
            id="approveNote"
            placeholder="e.g., Approved pending final material cost confirmation..."
            value={ownerNote}
            onChange={(e) => setOwnerNote(e.target.value)}
          />
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setConfirmAction(null)}>Cancel</Button>
            <Button
              onClick={() =>
                handleStatusChange(
                  confirmAction!.proposal.id,
                  'approved',
                  ownerNote ? `Approved: ${ownerNote}` : undefined
                )
              }
              icon={<CheckCircle className="h-4 w-4" />}
            >
              Confirm Approval
            </Button>
          </div>
        </div>
      </Modal>

      {/* Reject Confirmation */}
      <Modal
        open={confirmAction?.type === 'reject'}
        onClose={() => setConfirmAction(null)}
        title="Reject Proposal"
        maxWidth="max-w-md"
      >
        <div className="space-y-4">
          <p className="text-sm text-[#374151]">
            Reject proposal for <strong>{confirmAction && getJobTitle(confirmAction.proposal.jobId)}</strong>? Please provide a reason.
          </p>
          <Textarea
            label="Rejection Reason"
            id="rejectNote"
            placeholder="e.g., Budget exceeded client limit. Revise and resubmit..."
            value={ownerNote}
            onChange={(e) => setOwnerNote(e.target.value)}
          />
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setConfirmAction(null)}>Cancel</Button>
            <Button
              variant="danger"
              onClick={() =>
                handleStatusChange(
                  confirmAction!.proposal.id,
                  'rejected',
                  ownerNote ? `Rejected: ${ownerNote}` : 'Rejected by owner.'
                )
              }
              icon={<XCircle className="h-4 w-4" />}
            >
              Reject Proposal
            </Button>
          </div>
        </div>
      </Modal>

      {/* Convert to Job Confirmation */}
      <Modal
        open={confirmAction?.type === 'convert'}
        onClose={() => setConfirmAction(null)}
        title="Convert to Active Job"
        maxWidth="max-w-md"
      >
        <div className="space-y-4">
          <div className="rounded-lg bg-teal-50 p-4">
            <p className="text-sm font-medium text-teal-900">{confirmAction && getJobTitle(confirmAction.proposal.jobId)}</p>
            <p className="text-sm text-teal-700">{confirmAction && getClientName(confirmAction.proposal.jobId)}</p>
            <p className="mt-1 text-sm font-semibold text-teal-900">
              ${confirmAction?.proposal.priceEstimate.toLocaleString()}
            </p>
          </div>
          <p className="text-sm text-[#374151]">
            This will update the job status to <strong>Scheduled</strong> and mark the proposal as approved.
          </p>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setConfirmAction(null)}>Cancel</Button>
            <Button
              disabled={saving}
              onClick={async () => {
                if (!confirmAction || !tenantId) return;
                setSaving(true);
                try {
                  const job = allJobs.find((j) => j.id === confirmAction.proposal.jobId);
                  if (job) {
                    await createJob(tenantId, {
                      title: job.title, description: job.description, clientId: job.clientId,
                      priority: job.priority, status: 'scheduled', estimatedStart: job.estimatedStart,
                      estimatedEnd: job.estimatedEnd, assignedOperators: job.assignedOperators,
                      proposalGenerated: true, createdBy: user?.uid ?? '',
                    });
                  }
                  await updateProposal(tenantId, confirmAction.proposal.id, { status: 'approved' });
                  setProposals((prev) => prev.map((p) => p.id === confirmAction.proposal.id ? { ...p, status: 'approved' } : p));
                  setConfirmAction(null);
                } catch (err) {
                  console.error('Failed to convert proposal:', err);
                } finally {
                  setSaving(false);
                }
              }}
              icon={<Briefcase className="h-4 w-4" />}
            >
              {saving ? 'Converting…' : 'Convert to Job'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* New Proposal Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Create New Proposal" maxWidth="max-w-lg">
        <form className="space-y-4" onSubmit={async (e) => {
          e.preventDefault();
          if (!tenantId || !newProposalForm.jobId) return;
          setSaving(true);
          try {
            const newP = await createProposal(tenantId, {
              jobId: newProposalForm.jobId,
              specsJson: { scope: newProposalForm.scope, notes: newProposalForm.notes },
              images: [],
              priceEstimate: parseFloat(newProposalForm.priceEstimate) || 0,
              version: 1,
              status: 'draft',
            });
            setProposals((prev) => [...prev, { ...newP, id: newP.id } as Proposal]);
            setNewProposalForm({ jobId: '', scope: '', notes: '', priceEstimate: '' });
            setModalOpen(false);
          } catch (err) {
            console.error('Failed to create proposal:', err);
          } finally {
            setSaving(false);
          }
        }}>
          <Select
            label="Job"
            id="proposalJob"
            value={newProposalForm.jobId}
            onChange={(e) => setNewProposalForm((f) => ({ ...f, jobId: e.target.value }))}
            options={[
              { value: '', label: 'Select a job...' },
              ...allJobs.map((j) => ({ value: j.id, label: j.title })),
            ]}
          />
          <Textarea label="Scope of Work" id="scope" placeholder="Describe the scope..."
            value={newProposalForm.scope} onChange={(e) => setNewProposalForm((f) => ({ ...f, scope: e.target.value }))} />
          <Input label="Price Estimate ($)" id="price" type="number" placeholder="0.00"
            value={newProposalForm.priceEstimate} onChange={(e) => setNewProposalForm((f) => ({ ...f, priceEstimate: e.target.value }))} />
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="secondary" type="button" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Creating…' : 'Create Proposal'}</Button>
          </div>
        </form>
      </Modal>
    </RoleGuard>
  );
}
