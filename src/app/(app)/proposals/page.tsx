'use client';

import { useState } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { SlideOverPanel, SlideOverTabs } from '@/components/ui/SlideOverPanel';
import { Modal } from '@/components/ui/Modal';
import { Input, Textarea, Select } from '@/components/ui/FormFields';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { RoleGuard } from '@/components/RoleGuard';
import { useAuth } from '@/context/AuthContext';
import {
  Plus, FileText, CheckCircle, XCircle, Clock, Send,
  Briefcase, Download, Eye, MoreVertical,
} from 'lucide-react';
import type { ProposalStatus } from '@/lib/types';
import { cn } from '@/lib/utils';

const statusConfig: Record<ProposalStatus, { label: string; color: string; icon: React.ReactNode }> = {
  draft: { label: 'Draft', color: 'text-gray-600 bg-gray-100', icon: <FileText className="h-4 w-4" /> },
  sent: { label: 'Sent', color: 'text-blue-600 bg-blue-100', icon: <Send className="h-4 w-4" /> },
  viewed: { label: 'Viewed', color: 'text-teal-600 bg-teal-100', icon: <Clock className="h-4 w-4" /> },
  approved: { label: 'Approved', color: 'text-green-600 bg-green-100', icon: <CheckCircle className="h-4 w-4" /> },
  rejected: { label: 'Rejected', color: 'text-red-600 bg-red-100', icon: <XCircle className="h-4 w-4" /> },
};

interface DemoProposal {
  id: string;
  jobTitle: string;
  clientName: string;
  status: ProposalStatus;
  priceEstimate: number;
  version: number;
  createdAt: string;
  scope?: string;
  notes?: string;
}

const initialProposals: DemoProposal[] = [
  {
    id: 'p1', jobTitle: 'Electrical Panel Upgrade', clientName: 'Acme Corp',
    status: 'sent', priceEstimate: 15000, version: 2, createdAt: 'Feb 5, 2026',
    scope: 'Full panel replacement and upgrade to 200A service. Includes permit acquisition, removal of old 100A panel, installation of new 200A main breaker panel with 42 circuits, and final inspection.',
  },
  {
    id: 'p2', jobTitle: 'HVAC System Install', clientName: 'BuildRight LLC',
    status: 'sent', priceEstimate: 42000, version: 1, createdAt: 'Feb 10, 2026',
    scope: 'Install new central HVAC system for 15,000 sq ft warehouse. Includes rooftop unit, ductwork, thermostats, and commissioning.',
  },
  {
    id: 'p3', jobTitle: 'Substation Wiring', clientName: 'PowerGrid Co',
    status: 'draft', priceEstimate: 85000, version: 1, createdAt: 'Feb 13, 2026',
    scope: 'Complete rewiring of electrical substation including transformer connections, bus bars, protection relays, and metering.',
  },
  {
    id: 'p4', jobTitle: 'Solar Panel Install', clientName: 'GreenEnergy Ltd',
    status: 'rejected', priceEstimate: 28000, version: 3, createdAt: 'Jan 28, 2026',
    scope: 'Installation of 80 kW rooftop solar array with grid-tie inverter, monitoring system, and utility interconnection.',
    notes: 'Client rejected due to budget constraints. May revisit Q3 2026.',
  },
  {
    id: 'p5', jobTitle: 'Fire Alarm Circuit', clientName: 'SafeWork Inc',
    status: 'viewed', priceEstimate: 12000, version: 1, createdAt: 'Feb 14, 2026',
    scope: 'Annual fire alarm system inspection, certification, and replacement of 12 aging detector units.',
  },
  {
    id: 'p6', jobTitle: 'Generator Maintenance', clientName: 'Metro Services',
    status: 'approved', priceEstimate: 4500, version: 1, createdAt: 'Feb 1, 2026',
    scope: 'Full preventative maintenance on 150 kW backup generator including oil change, filter replacement, load bank testing, and transfer switch test.',
    notes: 'Approved by client on Feb 3. Ready to convert to active job.',
  },
];

export default function ProposalsPage() {
  const { user } = useAuth();
  const isOwnerOrAdmin = user?.role === 'owner' || user?.role === 'admin';
  const isClient = user?.role === 'client';
  // Demo: client user is linked to 'Acme Corp'. In production, resolve via client.linkedUserId.
  const myClientName = 'Acme Corp';

  const [proposals, setProposals] = useState<DemoProposal[]>(initialProposals);
  const [selected, setSelected] = useState<DemoProposal | null>(null);
  const [slideOpen, setSlideOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{ type: 'approve' | 'reject' | 'convert'; proposal: DemoProposal } | null>(null);
  const [ownerNote, setOwnerNote] = useState('');
  const [statusFilter, setStatusFilter] = useState<ProposalStatus | 'all'>('all');

  const filtered = proposals.filter((p) => {
    const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
    const matchesClient = !isClient || p.clientName === myClientName;
    return matchesStatus && matchesClient;
  });

  const handleStatusChange = (id: string, newStatus: ProposalStatus, note?: string) => {
    setProposals((prev) =>
      prev.map((p) =>
        p.id === id
          ? { ...p, status: newStatus, notes: note ? `${p.notes ? p.notes + '\n' : ''}${note}` : p.notes }
          : p
      )
    );
    // Also update selected panel if open
    setSelected((prev) => prev && prev.id === id ? { ...prev, status: newStatus } : prev);
    setConfirmAction(null);
    setOwnerNote('');
  };

  const openDetail = (p: DemoProposal) => {
    // Auto-mark as 'viewed' when client opens a sent proposal
    if (isClient && p.status === 'sent') {
      handleStatusChange(p.id, 'viewed');
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
                  <h3 className="truncate font-medium text-[#111827]">{proposal.jobTitle}</h3>
                  <p className="text-sm text-[#6B7280]">{proposal.clientName}</p>
                </div>
                <span className={cn('ml-2 inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium', cfg.color)}>
                  {cfg.icon}
                  {cfg.label}
                </span>
              </div>

              {proposal.scope && (
                <p className="mt-2 text-xs text-[#6B7280] line-clamp-2">{proposal.scope}</p>
              )}

              <div className="mt-4 flex items-center justify-between border-t border-[#E5E7EB] pt-4">
                <div>
                  <p className="text-xl font-semibold text-[#111827]">
                    ${proposal.priceEstimate.toLocaleString()}
                  </p>
                  <p className="text-xs text-[#6B7280]">v{proposal.version} · {proposal.createdAt}</p>
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

      {/* Detail Slide-Over */}
      <SlideOverPanel
        open={slideOpen}
        onClose={() => setSlideOpen(false)}
        title={selected?.jobTitle || 'Proposal'}
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
                        <p className="mt-1 font-medium text-[#111827]">{selected.clientName}</p>
                      </div>
                      <div>
                        <p className="text-xs font-medium uppercase tracking-wider text-[#6B7280]">Value</p>
                        <p className="mt-1 font-semibold text-[#111827]">${selected.priceEstimate.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-xs font-medium uppercase tracking-wider text-[#6B7280]">Created</p>
                        <p className="mt-1 text-[#111827]">{selected.createdAt}</p>
                      </div>
                      <div>
                        <p className="text-xs font-medium uppercase tracking-wider text-[#6B7280]">Version</p>
                        <p className="mt-1 text-[#111827]">v{selected.version}</p>
                      </div>
                    </div>

                    {selected.scope && (
                      <div>
                        <p className="text-xs font-medium uppercase tracking-wider text-[#6B7280]">Scope of Work</p>
                        <p className="mt-2 text-sm text-[#374151] leading-relaxed">{selected.scope}</p>
                      </div>
                    )}

                    {selected.notes && (
                      <div className="rounded-lg bg-amber-50 p-4">
                        <p className="text-xs font-medium uppercase tracking-wider text-amber-700">Notes</p>
                        <p className="mt-1 text-sm text-amber-900">{selected.notes}</p>
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
                            {v === selected.version ? selected.createdAt : `Earlier revision`}
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
            Approve proposal for <strong>{confirmAction?.proposal.jobTitle}</strong> (
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
            Reject proposal for <strong>{confirmAction?.proposal.jobTitle}</strong>? Please provide a reason.
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
            <p className="text-sm font-medium text-teal-900">{confirmAction?.proposal.jobTitle}</p>
            <p className="text-sm text-teal-700">{confirmAction?.proposal.clientName}</p>
            <p className="mt-1 text-sm font-semibold text-teal-900">
              ${confirmAction?.proposal.priceEstimate.toLocaleString()}
            </p>
          </div>
          <p className="text-sm text-[#374151]">
            This will create a new active job from the approved proposal and move it to the Jobs pipeline as{' '}
            <strong>Scheduled</strong>.
          </p>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setConfirmAction(null)}>Cancel</Button>
            <Button
              onClick={() => {
                setConfirmAction(null);
                alert(`Job created for "${confirmAction?.proposal.jobTitle}" — connect to createJob() in firestore.ts`);
              }}
              icon={<Briefcase className="h-4 w-4" />}
            >
              Convert to Job
            </Button>
          </div>
        </div>
      </Modal>

      {/* New Proposal Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Create New Proposal" maxWidth="max-w-lg">
        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); setModalOpen(false); }}>
          <Select
            label="Job"
            id="proposalJob"
            options={[
              { value: '', label: 'Select a job...' },
              { value: 'j1', label: 'Electrical Panel Upgrade' },
              { value: 'j2', label: 'HVAC System Install' },
              { value: 'j3', label: 'Fire Alarm Circuit' },
            ]}
          />
          <Textarea label="Scope of Work" id="scope" placeholder="Describe the scope..." />
          <Input label="Price Estimate ($)" id="price" type="number" placeholder="0.00" />
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="secondary" type="button" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button type="submit">Create Proposal</Button>
          </div>
        </form>
      </Modal>
    </RoleGuard>
  );
}
