'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { SlideOverPanel, SlideOverTabs } from '@/components/ui/SlideOverPanel';
import { Modal } from '@/components/ui/Modal';
import { Input, Textarea, Select } from '@/components/ui/FormFields';
import { MarkdownRenderer } from '@/components/ui/MarkdownRenderer';
import { printDocument } from '@/lib/printDoc';
import { RoleGuard } from '@/components/RoleGuard';
import { useAuth } from '@/context/AuthContext';
import { useTenant } from '@/context/TenantContext';
import {
  Plus, FileText, CheckCircle, XCircle, Send,
  Briefcase, Download, Loader2, Save, Search,
  TrendingUp, Clock, AlertCircle, Eye,
} from 'lucide-react';
import type { Proposal, ProposalStatus, Job, Client } from '@/lib/types';
import { cn, formatDate, formatRelativeDate } from '@/lib/utils';
import {
  getProposals, createProposal, updateProposal,
  getJobs, getJobsByClient, createJob, getClients,
} from '@/lib/firestore';

// ── Status config ─────────────────────────────────────────────────────────────
const statusConfig: Record<ProposalStatus, {
  label: string;
  pill: string;
  icon: React.ReactNode;
}> = {
  draft:    { label: 'Draft',    pill: 'bg-gray-100 text-gray-600',   icon: <FileText className="h-3.5 w-3.5" /> },
  sent:     { label: 'Sent',     pill: 'bg-blue-100 text-blue-700',   icon: <Send className="h-3.5 w-3.5" /> },
  viewed:   { label: 'Viewed',   pill: 'bg-teal-100 text-teal-700',   icon: <Eye className="h-3.5 w-3.5" /> },
  approved: { label: 'Approved', pill: 'bg-green-100 text-green-700', icon: <CheckCircle className="h-3.5 w-3.5" /> },
  rejected: { label: 'Rejected', pill: 'bg-red-100 text-red-600',     icon: <XCircle className="h-3.5 w-3.5" /> },
};

// ── Momentum helpers ──────────────────────────────────────────────────────────
function getMomentumIndicator(p: Proposal): { label: string; color: string; icon: React.ReactNode } | null {
  const ageDays = Math.floor((Date.now() - new Date(p.updatedAt).getTime()) / 86400000);
  if (p.status === 'sent' && ageDays >= 3)
    return { label: `Sent ${ageDays}d ago — follow up`, color: 'text-amber-600', icon: <Clock className="h-3.5 w-3.5" /> };
  if (p.status === 'viewed' && ageDays >= 2)
    return { label: `Viewed ${ageDays}d ago — needs decision`, color: 'text-teal-700', icon: <AlertCircle className="h-3.5 w-3.5" /> };
  if (p.status === 'draft' && !p.aiGeneratedText && p.priceEstimate === 0)
    return { label: 'Missing content & price', color: 'text-orange-600', icon: <AlertCircle className="h-3.5 w-3.5" /> };
  if (p.status === 'draft' && p.priceEstimate === 0)
    return { label: 'Missing price estimate', color: 'text-orange-600', icon: <AlertCircle className="h-3.5 w-3.5" /> };
  return null;
}

function getReadinessScore(p: Proposal): number {
  let score = 0;
  if (p.aiGeneratedText) score += 40;
  if (p.priceEstimate > 0) score += 30;
  if ((p.specsJson?.scope as string)) score += 20;
  if (p.status !== 'draft') score += 10;
  return score;
}


// ─────────────────────────────────────────────────────────────────────────────

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
  const [search, setSearch] = useState('');
  const [newProposalForm, setNewProposalForm] = useState({ jobId: '', scope: '', notes: '', priceEstimate: '' });
  const [editForm, setEditForm] = useState({ aiGeneratedText: '', priceEstimate: '', scope: '', notes: '' });
  const [editSaving, setEditSaving] = useState(false);
  const [editSuccess, setEditSuccess] = useState(false);
  const proposalPrintRef = useRef<HTMLDivElement>(null);

  // ── Load data ───────────────────────────────────────────────────────────────
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId, user?.uid, isClient, isOwnerOrAdmin, user?.linkedClientId]);

  useEffect(() => { loadData(); }, [loadData]);

  // ── Helpers ─────────────────────────────────────────────────────────────────
  const getJobTitle   = (jobId: string) => allJobs.find((j) => j.id === jobId)?.title ?? 'Untitled Job';
  const getClientName = (jobId: string) => {
    const job = allJobs.find((j) => j.id === jobId);
    if (!job) return '';
    return allClients.find((c) => c.id === job.clientId)?.companyName ?? '';
  };
  const getScope = (p: Proposal) => (p.specsJson?.scope as string) ?? '';
  const getNotes = (p: Proposal) => (p.specsJson?.notes as string) ?? '';

  // ── Pipeline summary stats ──────────────────────────────────────────────────
  const pipelineValue   = proposals.filter((p) => ['sent', 'viewed', 'approved'].includes(p.status)).reduce((s, p) => s + p.priceEstimate, 0);
  const awaitingAction  = proposals.filter((p) => p.status === 'sent' || p.status === 'viewed').length;
  const wonValue        = proposals.filter((p) => p.status === 'approved').reduce((s, p) => s + p.priceEstimate, 0);

  // ── Filtered list ───────────────────────────────────────────────────────────
  const filtered = proposals
    .filter((p) => statusFilter === 'all' || p.status === statusFilter)
    .filter((p) => {
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return getJobTitle(p.jobId).toLowerCase().includes(q) || getClientName(p.jobId).toLowerCase().includes(q);
    })
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

  // ── Mutations ───────────────────────────────────────────────────────────────
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
      setSelected((prev) => prev?.id === id ? { ...prev, ...updates } : prev);
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
      await handleStatusChange(p.id, 'viewed');
      setSelected({ ...p, status: 'viewed' });
    } else {
      setSelected(p);
    }
    setSlideOpen(true);
  };

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <RoleGuard allowedRoles={['owner', 'admin', 'client']}>
      <PageHeader
        title="Proposals"
        description={isClient ? 'Review proposals for your projects.' : 'Track your deal pipeline and close more work.'}
        actions={
          isOwnerOrAdmin ? (
            <Button icon={<Plus className="h-4 w-4" />} onClick={() => setModalOpen(true)}>
              New Proposal
            </Button>
          ) : null
        }
      />

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-[#9CA3AF]" />
        </div>
      ) : (
        <>
          {/* ── Pipeline summary strip ── */}
          {isOwnerOrAdmin && (
            <div className="mb-6 grid grid-cols-3 gap-4">
              <div className="rounded-xl border border-[#E5E7EB] bg-white p-4">
                <p className="text-xs font-medium uppercase tracking-wider text-[#9CA3AF]">Pipeline Value</p>
                <p className="mt-1 text-2xl font-bold text-[#111827]">${pipelineValue.toLocaleString()}</p>
                <p className="mt-0.5 text-xs text-[#6B7280]">Active proposals</p>
              </div>
              <div className="rounded-xl border border-[#E5E7EB] bg-white p-4">
                <p className="text-xs font-medium uppercase tracking-wider text-[#9CA3AF]">Awaiting Response</p>
                <p className="mt-1 text-2xl font-bold text-amber-500">{awaitingAction}</p>
                <p className="mt-0.5 text-xs text-[#6B7280]">Sent or viewed</p>
              </div>
              <div className="rounded-xl border border-[#E5E7EB] bg-white p-4">
                <p className="text-xs font-medium uppercase tracking-wider text-[#9CA3AF]">Won</p>
                <p className="mt-1 text-2xl font-bold text-green-600">${wonValue.toLocaleString()}</p>
                <p className="mt-0.5 text-xs text-[#6B7280]">Approved proposals</p>
              </div>
            </div>
          )}

          {/* ── Search + filter ── */}
          <div className="mb-5 flex flex-wrap items-center gap-3">
            <div className="relative min-w-[180px] flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9CA3AF]" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search job or client…"
                className="w-full rounded-lg border border-[#E5E7EB] bg-white py-2 pl-9 pr-3 text-sm text-[#111827] placeholder-[#9CA3AF] focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {(['all', 'draft', 'sent', 'viewed', 'approved', 'rejected'] as const).map((s) => {
                const count = s === 'all' ? proposals.length : proposals.filter((p) => p.status === s).length;
                const cfg = s !== 'all' ? statusConfig[s] : null;
                return (
                  <button
                    key={s}
                    onClick={() => setStatusFilter(s)}
                    className={cn(
                      'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                      statusFilter === s
                        ? 'border-teal-600 bg-teal-600 text-white'
                        : cfg
                        ? cn('border-transparent', cfg.pill, 'hover:border-teal-400')
                        : 'border-[#E5E7EB] text-[#6B7280] hover:border-teal-400'
                    )}
                  >
                    {s === 'all' ? 'All' : statusConfig[s].label} ({count})
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Deal cards ── */}
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-20 text-center">
              <FileText className="h-10 w-10 text-[#D1D5DB]" />
              <p className="text-sm font-medium text-[#6B7280]">No proposals found</p>
              {isOwnerOrAdmin && (
                <Button size="sm" icon={<Plus className="h-4 w-4" />} onClick={() => setModalOpen(true)}>
                  Create your first proposal
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map((proposal) => {
                const cfg = statusConfig[proposal.status];
                const clientName = getClientName(proposal.jobId);
                const jobTitle   = getJobTitle(proposal.jobId);
                const momentum   = getMomentumIndicator(proposal);
                const readiness  = getReadinessScore(proposal);
                const isDraft    = proposal.status === 'draft';

                return (
                  <div
                    key={proposal.id}
                    onClick={() => openDetail(proposal)}
                    className="group cursor-pointer rounded-xl border border-[#E5E7EB] bg-white px-5 py-4 transition-all hover:border-teal-300 hover:shadow-sm"
                  >
                    {/* Top row */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="truncate font-semibold text-[#111827]">{jobTitle}</h3>
                          <span className={cn('inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium', cfg.pill)}>
                            {cfg.icon}
                            {cfg.label}
                          </span>
                        </div>
                        {clientName && (
                          <p className="mt-0.5 text-sm text-[#6B7280]">{clientName}</p>
                        )}
                      </div>

                      {/* Value block */}
                      <div className="shrink-0 text-right">
                        <p className={cn('text-lg font-bold', proposal.priceEstimate > 0 ? 'text-[#111827]' : 'text-[#D1D5DB]')}>
                          {proposal.priceEstimate > 0 ? `$${proposal.priceEstimate.toLocaleString()}` : 'No price set'}
                        </p>
                        <p className="text-xs text-[#9CA3AF]">{formatRelativeDate(proposal.updatedAt)}</p>
                      </div>
                    </div>

                    {/* Scope snippet */}
                    {getScope(proposal) && (
                      <p className="mt-2 line-clamp-1 text-xs text-[#6B7280]">{getScope(proposal)}</p>
                    )}

                    {/* Bottom row */}
                    <div className="mt-3 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-3">
                        {momentum && (
                          <span className={cn('inline-flex items-center gap-1 text-xs font-medium', momentum.color)}>
                            {momentum.icon}
                            {momentum.label}
                          </span>
                        )}
                        {isDraft && (
                          <div className="flex items-center gap-1.5">
                            <div className="h-1.5 w-20 overflow-hidden rounded-full bg-[#F3F4F6]">
                              <div
                                className="h-full rounded-full bg-teal-400 transition-all"
                                style={{ width: `${readiness}%` }}
                              />
                            </div>
                            <span className="text-xs text-[#9CA3AF]">{readiness}% ready</span>
                          </div>
                        )}
                        {!momentum && !isDraft && (
                          <span className="text-xs text-[#9CA3AF]">v{proposal.version} · {formatDate(proposal.createdAt)}</span>
                        )}
                      </div>

                      {/* Quick actions (stop propagation) */}
                      {(isOwnerOrAdmin || isClient) && (
                        <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100" onClick={(e) => e.stopPropagation()}>
                          {(proposal.status === 'sent' || proposal.status === 'viewed') && (
                            <>
                              <button onClick={() => setConfirmAction({ type: 'approve', proposal })} title="Approve"
                                className="rounded-lg p-1.5 text-green-600 hover:bg-green-50">
                                <CheckCircle className="h-4 w-4" />
                              </button>
                              <button onClick={() => setConfirmAction({ type: 'reject', proposal })} title="Reject"
                                className="rounded-lg p-1.5 text-red-500 hover:bg-red-50">
                                <XCircle className="h-4 w-4" />
                              </button>
                            </>
                          )}
                          {isOwnerOrAdmin && proposal.status === 'approved' && (
                            <button onClick={() => setConfirmAction({ type: 'convert', proposal })} title="Convert to Job"
                              className="rounded-lg p-1.5 text-teal-600 hover:bg-teal-50">
                              <Briefcase className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ── Detail slide-over ── */}
      <SlideOverPanel
        open={slideOpen}
        onClose={() => setSlideOpen(false)}
        title={selected ? getJobTitle(selected.jobId) : 'Proposal'}
        width="max-w-xl"
      >
        {selected && (() => {
          const cfg        = statusConfig[selected.status];
          const clientName = getClientName(selected.jobId);
          const momentum   = getMomentumIndicator(selected);
          const readiness  = getReadinessScore(selected);

          return (
            <SlideOverTabs
              tabs={[
                // ── Deal tab ─────────────────────────────────────────────────
                {
                  key: 'deal',
                  label: 'Deal',
                  content: (
                    <div className="space-y-5">
                      {/* Value hero */}
                      <div className="rounded-xl bg-gradient-to-br from-[#0D9488] to-[#0F766E] p-5 text-white">
                        <p className="text-xs font-medium uppercase tracking-wider text-teal-200">Deal Value</p>
                        <p className="mt-1 text-4xl font-bold">
                          {selected.priceEstimate > 0 ? `$${selected.priceEstimate.toLocaleString()}` : '—'}
                        </p>
                        {clientName && <p className="mt-2 text-sm text-teal-100">{clientName}</p>}
                        <div className="mt-3 flex items-center gap-2">
                          <span className={cn('inline-flex items-center gap-1 rounded-full bg-white/20 px-2.5 py-1 text-xs font-semibold text-white')}>
                            {cfg.icon}
                            {cfg.label}
                          </span>
                          <span className="text-xs text-teal-200">v{selected.version} · {formatRelativeDate(selected.updatedAt)}</span>
                        </div>
                      </div>

                      {/* Readiness (draft only) */}
                      {selected.status === 'draft' && (
                        <div className="rounded-lg border border-[#E5E7EB] p-4">
                          <div className="mb-2 flex items-center justify-between">
                            <p className="text-xs font-semibold uppercase tracking-wider text-[#6B7280]">Readiness</p>
                            <p className="text-sm font-bold text-[#111827]">{readiness}%</p>
                          </div>
                          <div className="h-2 w-full overflow-hidden rounded-full bg-[#F3F4F6]">
                            <div
                              className={cn('h-full rounded-full transition-all', readiness >= 80 ? 'bg-green-400' : readiness >= 50 ? 'bg-teal-400' : 'bg-amber-400')}
                              style={{ width: `${readiness}%` }}
                            />
                          </div>
                          <div className="mt-3 space-y-1.5">
                            {[
                              { done: !!selected.aiGeneratedText, label: 'AI proposal generated', pts: 40 },
                              { done: selected.priceEstimate > 0, label: 'Price estimate set',    pts: 30 },
                              { done: !!getScope(selected),       label: 'Scope of work added',   pts: 20 },
                              { done: selected.status !== 'draft',label: 'Sent to client',        pts: 10 },
                            ].map((item) => (
                              <div key={item.label} className="flex items-center gap-2">
                                <div className={cn('flex h-4 w-4 items-center justify-center rounded-full', item.done ? 'bg-green-100' : 'bg-gray-100')}>
                                  {item.done
                                    ? <CheckCircle className="h-3 w-3 text-green-600" />
                                    : <div className="h-1.5 w-1.5 rounded-full bg-gray-400" />}
                                </div>
                                <span className={cn('text-xs', item.done ? 'text-[#374151]' : 'text-[#9CA3AF]')}>{item.label}</span>
                                <span className="ml-auto text-xs text-[#9CA3AF]">+{item.pts}%</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Momentum alert */}
                      {momentum && (
                        <div className={cn(
                          'flex items-center gap-3 rounded-lg border p-3',
                          momentum.color.includes('amber') ? 'border-amber-200 bg-amber-50' :
                          momentum.color.includes('teal')  ? 'border-teal-200 bg-teal-50' :
                          'border-orange-200 bg-orange-50'
                        )}>
                          <span className={cn(momentum.color)}>{momentum.icon}</span>
                          <p className={cn('text-sm font-medium', momentum.color)}>{momentum.label}</p>
                        </div>
                      )}

                      {/* Details grid */}
                      <div className="grid grid-cols-2 gap-3">
                        {[
                          { label: 'Created', value: formatDate(selected.createdAt) },
                          { label: 'Updated', value: formatRelativeDate(selected.updatedAt) },
                          { label: 'Version', value: `v${selected.version}` },
                          { label: 'Job',     value: getJobTitle(selected.jobId) },
                        ].map((item) => (
                          <div key={item.label} className="rounded-lg bg-[#F9FAFB] p-3">
                            <p className="text-xs font-medium uppercase tracking-wider text-[#9CA3AF]">{item.label}</p>
                            <p className="mt-1 text-sm font-medium text-[#111827]">{item.value}</p>
                          </div>
                        ))}
                      </div>

                      {/* Scope */}
                      {getScope(selected) && (
                        <div>
                          <p className="mb-1 text-xs font-medium uppercase tracking-wider text-[#9CA3AF]">Scope of Work</p>
                          <p className="text-sm leading-relaxed text-[#374151]">{getScope(selected)}</p>
                        </div>
                      )}

                      {/* Notes */}
                      {getNotes(selected) && (
                        <div className="rounded-lg bg-amber-50 p-4">
                          <p className="mb-1 text-xs font-medium uppercase tracking-wider text-amber-700">Notes</p>
                          <p className="text-sm text-amber-900">{getNotes(selected)}</p>
                        </div>
                      )}

                      {/* Actions */}
                      {(isOwnerOrAdmin || isClient) && (
                        <div className="border-t border-[#E5E7EB] pt-4">
                          <p className="mb-2 text-xs font-medium uppercase tracking-wider text-[#9CA3AF]">Actions</p>
                          <div className="flex flex-wrap gap-2">
                            {isOwnerOrAdmin && selected.status === 'draft' && (
                              <Button size="sm" icon={<Send className="h-4 w-4" />}
                                onClick={() => handleStatusChange(selected.id, 'sent')}>
                                Mark as Sent
                              </Button>
                            )}
                            {(selected.status === 'sent' || selected.status === 'viewed') && (
                              <>
                                <Button size="sm" icon={<CheckCircle className="h-4 w-4" />}
                                  onClick={() => setConfirmAction({ type: 'approve', proposal: selected })}>
                                  Approve
                                </Button>
                                <Button size="sm" variant="danger" icon={<XCircle className="h-4 w-4" />}
                                  onClick={() => setConfirmAction({ type: 'reject', proposal: selected })}>
                                  Reject
                                </Button>
                              </>
                            )}
                            {isOwnerOrAdmin && selected.status === 'approved' && (
                              <Button size="sm" icon={<Briefcase className="h-4 w-4" />}
                                onClick={() => setConfirmAction({ type: 'convert', proposal: selected })}>
                                Convert to Job
                              </Button>
                            )}
                            {selected.aiGeneratedText && (
                              <Button size="sm" variant="secondary" icon={<Download className="h-4 w-4" />}
                                onClick={() => printDocument(getJobTitle(selected.jobId), proposalPrintRef.current?.innerHTML ?? '')}>
                                Print / PDF
                              </Button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ),
                },

                // ── Preview tab (if AI text exists) ──────────────────────────
                ...(selected.aiGeneratedText ? [{
                  key: 'preview',
                  label: 'Preview',
                  content: (
                    <div className="space-y-3">
                      <div className="flex justify-end">
                        <Button size="sm" variant="secondary" icon={<Download className="h-4 w-4" />}
                          onClick={() => printDocument(getJobTitle(selected.jobId), proposalPrintRef.current?.innerHTML ?? '')}>
                          Print / Save PDF
                        </Button>
                      </div>
                      <MarkdownRenderer
                        ref={proposalPrintRef}
                        content={selected.aiGeneratedText}
                        className="rounded-lg bg-gray-50 p-5"
                      />
                    </div>
                  ),
                }] : []),

                // ── Edit tab (owner/admin) ────────────────────────────────────
                ...(isOwnerOrAdmin ? [{
                  key: 'edit',
                  label: 'Edit',
                  content: (
                    <div className="space-y-4">
                      {editSuccess && (
                        <div className="flex items-center gap-2 rounded-lg bg-green-50 px-4 py-3 text-sm text-green-800">
                          <CheckCircle className="h-4 w-4 shrink-0" />
                          Saved — now v{selected.version}
                        </div>
                      )}
                      <div>
                        <p className="mb-1 text-xs font-medium uppercase tracking-wider text-[#6B7280]">Price Estimate ($)</p>
                        <input type="number" value={editForm.priceEstimate}
                          onChange={(e) => setEditForm((f) => ({ ...f, priceEstimate: e.target.value }))}
                          placeholder="0.00"
                          className="w-full rounded-lg border border-[#E5E7EB] bg-white p-3 text-sm text-[#111827] placeholder-[#9CA3AF] focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-200"
                        />
                      </div>
                      <div>
                        <p className="mb-1 text-xs font-medium uppercase tracking-wider text-[#6B7280]">Scope of Work</p>
                        <textarea value={editForm.scope} onChange={(e) => setEditForm((f) => ({ ...f, scope: e.target.value }))}
                          rows={3} placeholder="Describe the scope..."
                          className="w-full rounded-lg border border-[#E5E7EB] bg-white p-3 text-sm text-[#111827] placeholder-[#9CA3AF] focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-200"
                        />
                      </div>
                      <div>
                        <p className="mb-1 text-xs font-medium uppercase tracking-wider text-[#6B7280]">Notes</p>
                        <textarea value={editForm.notes} onChange={(e) => setEditForm((f) => ({ ...f, notes: e.target.value }))}
                          rows={3} placeholder="Additional notes..."
                          className="w-full rounded-lg border border-[#E5E7EB] bg-white p-3 text-sm text-[#111827] placeholder-[#9CA3AF] focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-200"
                        />
                      </div>
                      <div>
                        <p className="mb-1 text-xs font-medium uppercase tracking-wider text-[#6B7280]">AI Generated Content</p>
                        <textarea value={editForm.aiGeneratedText} onChange={(e) => setEditForm((f) => ({ ...f, aiGeneratedText: e.target.value }))}
                          rows={14} placeholder="AI generated proposal text..."
                          className="w-full rounded-lg border border-[#E5E7EB] bg-white p-3 font-mono text-sm text-[#111827] placeholder-[#9CA3AF] focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-200"
                        />
                      </div>
                      <div className="flex justify-end pt-2">
                        <Button
                          icon={editSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                          onClick={handleEditSave} disabled={editSaving}
                        >
                          {editSaving ? 'Saving…' : 'Save Changes'}
                        </Button>
                      </div>
                    </div>
                  ),
                }] : []),

                // ── Versions tab ─────────────────────────────────────────────
                {
                  key: 'versions',
                  label: 'Versions',
                  content: (
                    <div className="space-y-3">
                      {Array.from({ length: selected.version }, (_, i) => selected.version - i).map((v) => (
                        <div key={v} className="flex items-center justify-between rounded-lg border border-[#E5E7EB] p-4">
                          <div>
                            <p className="text-sm font-medium text-[#111827]">Version {v}</p>
                            <p className="text-xs text-[#6B7280]">
                              {v === selected.version ? formatDate(selected.createdAt) : 'Earlier revision'}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            {v === selected.version && (
                              <span className="rounded-full bg-teal-100 px-2 py-0.5 text-xs font-medium text-teal-700">Current</span>
                            )}
                            <Button size="sm" variant="ghost" icon={<Eye className="h-3.5 w-3.5" />}>View</Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ),
                },
              ]}
            />
          );
        })()}
      </SlideOverPanel>

      {/* ── Approve modal ── */}
      <Modal open={confirmAction?.type === 'approve'} onClose={() => setConfirmAction(null)} title="Approve Proposal" maxWidth="max-w-md">
        <div className="space-y-4">
          <p className="text-sm text-[#374151]">
            Approve <strong>{confirmAction && getJobTitle(confirmAction.proposal.jobId)}</strong>{' '}
            for <strong>${confirmAction?.proposal.priceEstimate.toLocaleString()}</strong>?
          </p>
          <Textarea label="Note (optional)" id="approveNote" placeholder="e.g., Approved pending material confirmation…"
            value={ownerNote} onChange={(e) => setOwnerNote(e.target.value)} />
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setConfirmAction(null)}>Cancel</Button>
            <Button icon={<CheckCircle className="h-4 w-4" />}
              onClick={() => handleStatusChange(confirmAction!.proposal.id, 'approved', ownerNote ? `Approved: ${ownerNote}` : undefined)}>
              Confirm Approval
            </Button>
          </div>
        </div>
      </Modal>

      {/* ── Reject modal ── */}
      <Modal open={confirmAction?.type === 'reject'} onClose={() => setConfirmAction(null)} title="Reject Proposal" maxWidth="max-w-md">
        <div className="space-y-4">
          <p className="text-sm text-[#374151]">
            Reject proposal for <strong>{confirmAction && getJobTitle(confirmAction.proposal.jobId)}</strong>?
          </p>
          <Textarea label="Reason" id="rejectNote" placeholder="e.g., Budget exceeded — please revise…"
            value={ownerNote} onChange={(e) => setOwnerNote(e.target.value)} />
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setConfirmAction(null)}>Cancel</Button>
            <Button variant="danger" icon={<XCircle className="h-4 w-4" />}
              onClick={() => handleStatusChange(confirmAction!.proposal.id, 'rejected', ownerNote || 'Rejected.')}>
              Reject Proposal
            </Button>
          </div>
        </div>
      </Modal>

      {/* ── Convert to job modal ── */}
      <Modal open={confirmAction?.type === 'convert'} onClose={() => setConfirmAction(null)} title="Convert to Active Job" maxWidth="max-w-md">
        <div className="space-y-4">
          <div className="rounded-xl bg-teal-50 p-4">
            <p className="font-semibold text-teal-900">{confirmAction && getJobTitle(confirmAction.proposal.jobId)}</p>
            <p className="text-sm text-teal-700">{confirmAction && getClientName(confirmAction.proposal.jobId)}</p>
            <p className="mt-2 text-xl font-bold text-teal-900">${confirmAction?.proposal.priceEstimate.toLocaleString()}</p>
          </div>
          <p className="text-sm text-[#374151]">
            This will create a new <strong>Scheduled</strong> job from this proposal.
          </p>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setConfirmAction(null)}>Cancel</Button>
            <Button disabled={saving} icon={<Briefcase className="h-4 w-4" />}
              onClick={async () => {
                if (!confirmAction || !tenantId) return;
                setSaving(true);
                try {
                  const job = allJobs.find((j) => j.id === confirmAction.proposal.jobId);
                  if (job) {
                    await createJob(tenantId, {
                      title: job.title, description: job.description, clientId: job.clientId,
                      priority: job.priority, status: 'scheduled',
                      estimatedStart: job.estimatedStart, estimatedEnd: job.estimatedEnd,
                      assignedOperators: job.assignedOperators,
                      proposalGenerated: true, createdBy: user?.uid ?? '',
                    });
                  }
                  await updateProposal(tenantId, confirmAction.proposal.id, { status: 'approved' });
                  setProposals((prev) => prev.map((p) => p.id === confirmAction.proposal.id ? { ...p, status: 'approved' } : p));
                  setConfirmAction(null);
                } catch (err) {
                  console.error('Failed to convert:', err);
                } finally {
                  setSaving(false);
                }
              }}>
              {saving ? 'Converting…' : 'Convert to Job'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* ── New proposal modal ── */}
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
            setProposals((prev) => [...prev, newP as Proposal]);
            setNewProposalForm({ jobId: '', scope: '', notes: '', priceEstimate: '' });
            setModalOpen(false);
          } catch (err) {
            console.error('Failed to create proposal:', err);
          } finally {
            setSaving(false);
          }
        }}>
          <Select label="Job" id="proposalJob" value={newProposalForm.jobId}
            onChange={(e) => setNewProposalForm((f) => ({ ...f, jobId: e.target.value }))}
            options={[{ value: '', label: 'Select a job…' }, ...allJobs.map((j) => ({ value: j.id, label: j.title }))]}
          />
          <Textarea label="Scope of Work" id="scope" placeholder="Describe the scope…"
            value={newProposalForm.scope} onChange={(e) => setNewProposalForm((f) => ({ ...f, scope: e.target.value }))} />
          <Input label="Price Estimate ($)" id="price" type="number" placeholder="0.00"
            value={newProposalForm.priceEstimate} onChange={(e) => setNewProposalForm((f) => ({ ...f, priceEstimate: e.target.value }))} />
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="secondary" type="button" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={saving} icon={<TrendingUp className="h-4 w-4" />}>
              {saving ? 'Creating…' : 'Create Proposal'}
            </Button>
          </div>
        </form>
      </Modal>
    </RoleGuard>
  );
}
