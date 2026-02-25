'use client';

import { useState, useEffect, useCallback } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { DataTable } from '@/components/ui/DataTable';
import { Modal } from '@/components/ui/Modal';
import { SlideOverPanel, SlideOverTabs } from '@/components/ui/SlideOverPanel';
import { Textarea, Select } from '@/components/ui/FormFields';
import { Avatar } from '@/components/ui/Avatar';
import { RoleGuard } from '@/components/RoleGuard';
import { useAuth } from '@/context/AuthContext';
import { Plus, AlertTriangle, CheckCircle, Download, Loader2, Save } from 'lucide-react';
import { cn, formatDate } from '@/lib/utils';
import {
  getIncidentReports,
  createIncidentReport,
  updateIncidentReport,
  getJobs,
  getJobsByOperator,
  getUsers,
} from '@/lib/firestore';
import type { IncidentReport, IncidentSeverity, IncidentResolution, Job, User } from '@/lib/types';

const severityConfig: Record<IncidentSeverity, { color: string; label: string }> = {
  low: { color: 'bg-blue-100 text-blue-700', label: 'Low' },
  medium: { color: 'bg-yellow-100 text-yellow-700', label: 'Medium' },
  high: { color: 'bg-orange-100 text-orange-700', label: 'High' },
  critical: { color: 'bg-red-100 text-red-700', label: 'Critical' },
};

const resolutionConfig: Record<IncidentResolution, { color: string; label: string }> = {
  open: { color: 'bg-red-100 text-red-700', label: 'Open' },
  investigating: { color: 'bg-amber-100 text-amber-700', label: 'Investigating' },
  resolved: { color: 'bg-green-100 text-green-700', label: 'Resolved' },
  closed: { color: 'bg-gray-100 text-gray-700', label: 'Closed' },
};

const resolutionFlow: IncidentResolution[] = ['open', 'investigating', 'resolved', 'closed'];

export default function IncidentsPage() {
  const { user } = useAuth();
  const tenantId = user?.tenantId ?? '';
  const isOwnerOrAdmin = user?.role === 'owner' || user?.role === 'admin';
  const isOperator = user?.role === 'operator';

  const [incidents, setIncidents] = useState<IncidentReport[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [userMap, setUserMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [slideOpen, setSlideOpen] = useState(false);
  const [selectedIncident, setSelectedIncident] = useState<IncidentReport | null>(null);
  // Owner notes keyed by incident id (local UI state â€” persist when type is extended)
  const [ownerNotesMap, setOwnerNotesMap] = useState<Record<string, string>>({});
  const [ownerApprovedMap, setOwnerApprovedMap] = useState<Record<string, string>>({});
  const [severityFilter, setSeverityFilter] = useState<IncidentSeverity | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<IncidentResolution | 'all'>('all');

  const [newForm, setNewForm] = useState({ jobId: '', severity: 'medium' as IncidentSeverity, description: '' });
  const [incEditForm, setIncEditForm] = useState({ severity: 'medium' as IncidentSeverity, description: '' });
  const [incEditSaving, setIncEditSaving] = useState(false);
  const [incEditSuccess, setIncEditSuccess] = useState(false);

  // â”€â”€ Load data â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const loadData = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);
    try {
      const [fetchedJobs, fetchedUsers, fetchedIncidents] = await Promise.all([
        isOperator && user?.uid
          ? getJobsByOperator(tenantId, user.uid)
          : getJobs(tenantId),
        isOwnerOrAdmin ? getUsers(tenantId) : Promise.resolve([] as User[]),
        getIncidentReports(tenantId),
      ]);

      setJobs(fetchedJobs);

      const nameMap: Record<string, string> = {};
      for (const u of fetchedUsers) nameMap[u.uid] = u.displayName;
      if (user?.uid && user?.displayName) nameMap[user.uid] = user.displayName;
      setUserMap(nameMap);

      const mine = isOperator && user?.uid
        ? fetchedIncidents.filter((i) => i.operatorId === user.uid)
        : fetchedIncidents;
      setIncidents(mine);
    } catch (err) {
      console.error('Failed to load incidents:', err);
    } finally {
      setLoading(false);
    }
  }, [tenantId, user?.uid, user?.displayName, isOperator, isOwnerOrAdmin]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleEditIncident = async () => {
    if (!selectedIncident || !tenantId) return;
    setIncEditSaving(true);
    try {
      await updateIncidentReport(tenantId, selectedIncident.id, {
        severity: incEditForm.severity,
        description: incEditForm.description,
      });
      setIncidents((prev) =>
        prev.map((i) =>
          i.id === selectedIncident.id
            ? { ...i, severity: incEditForm.severity, description: incEditForm.description }
            : i
        )
      );
      setSelectedIncident((prev) =>
        prev ? { ...prev, severity: incEditForm.severity, description: incEditForm.description } : prev
      );
      setIncEditSuccess(true);
    } catch (err) {
      console.error('Failed to update incident:', err);
      alert('Failed to save changes.');
    } finally {
      setIncEditSaving(false);
    }
  };

  const openDetail = (inc: IncidentReport) => {
    setSelectedIncident(inc);
    setIncEditForm({ severity: inc.severity, description: inc.description });
    setIncEditSuccess(false);
    if (!ownerNotesMap[inc.id]) {
      setOwnerNotesMap((prev) => ({ ...prev, [inc.id]: inc.aiGeneratedReport ?? '' }));
    }
    setSlideOpen(true);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenantId || !user?.uid || !newForm.jobId || !newForm.description) return;
    setSaving(true);
    try {
      await createIncidentReport(tenantId, {
        jobId: newForm.jobId,
        jobTitle: jobs.find((j) => j.id === newForm.jobId)?.title ?? '',
        operatorId: user.uid,
        severity: newForm.severity,
        description: newForm.description,
        photos: [],
        resolutionStatus: 'open',
      });
      setModalOpen(false);
      setNewForm({ jobId: '', severity: 'medium', description: '' });
      await loadData();
    } catch (err) {
      console.error('Failed to create incident:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleStatusAdvance = async (id: string) => {
    const inc = incidents.find((i) => i.id === id);
    if (!inc) return;
    const idx = resolutionFlow.indexOf(inc.resolutionStatus);
    if (idx >= resolutionFlow.length - 1) return;
    const next = resolutionFlow[idx + 1];
    await updateIncidentReport(tenantId, id, { resolutionStatus: next });
    setIncidents((prev) => prev.map((i) => (i.id === id ? { ...i, resolutionStatus: next } : i)));
    setSelectedIncident((prev) => (prev?.id === id ? { ...prev, resolutionStatus: next } : prev));
  };

  const handleSaveOwnerNote = async (id: string) => {
    const note = ownerNotesMap[id] ?? '';
    const now = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    // Save notes in aiGeneratedReport field (owner review notes stored here until type is extended)
    await updateIncidentReport(tenantId, id, { aiGeneratedReport: note });
    setIncidents((prev) => prev.map((i) => (i.id === id ? { ...i, aiGeneratedReport: note } : i)));
    setSelectedIncident((prev) => (prev?.id === id ? { ...prev, aiGeneratedReport: note } : prev));
    setOwnerApprovedMap((prev) => ({ ...prev, [id]: now }));
  };

  const filtered = incidents.filter((inc) => {
    const matchSeverity = severityFilter === 'all' || inc.severity === severityFilter;
    const matchStatus = statusFilter === 'all' || inc.resolutionStatus === statusFilter;
    return matchSeverity && matchStatus;
  });

  const columns = [
    {
      key: 'severity',
      header: 'Severity',
      render: (inc: IncidentReport) => {
        const cfg = severityConfig[inc.severity];
        return (
          <span className={cn('inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium', cfg.color)}>
            <AlertTriangle className="h-3 w-3" />
            {cfg.label}
          </span>
        );
      },
    },
    {
      key: 'description',
      header: 'Description',
      render: (inc: IncidentReport) => (
        <div>
          <p className="text-sm font-medium text-[#111827] line-clamp-1">{inc.description}</p>
          <p className="text-xs text-[#6B7280]">{inc.jobTitle || inc.jobId}</p>
        </div>
      ),
    },
    {
      key: 'operator',
      header: 'Reported By',
      render: (inc: IncidentReport) => {
        const name = userMap[inc.operatorId] || inc.operatorId;
        return (
          <div className="flex items-center gap-2">
            <Avatar name={name} size="sm" />
            <span className="text-sm">{name}</span>
          </div>
        );
      },
    },
    {
      key: 'status',
      header: 'Status',
      render: (inc: IncidentReport) => {
        const cfg = resolutionConfig[inc.resolutionStatus];
        return (
          <span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium', cfg.color)}>
            {cfg.label}
          </span>
        );
      },
    },
    {
      key: 'ownerReview',
      header: 'Owner Review',
      render: (inc: IncidentReport) => {
        const approvedAt = ownerApprovedMap[inc.id];
        return approvedAt ? (
          <span className="inline-flex items-center gap-1 text-xs text-green-700">
            <CheckCircle className="h-3.5 w-3.5" />
            {approvedAt}
          </span>
        ) : (
          <span className="text-xs text-[#9CA3AF]">Pending</span>
        );
      },
    },
    {
      key: 'date',
      header: 'Date',
      render: (inc: IncidentReport) => (
        <span className="text-sm text-[#6B7280]">{formatDate(inc.createdAt)}</span>
      ),
    },
  ];

  return (
    <RoleGuard allowedRoles={['owner', 'admin', 'operator']}>
      <PageHeader
        title="Incident Reports"
        description={isOperator ? 'File and track your incident reports.' : 'Track, review, and finalize safety incidents.'}
        actions={
          <div className="flex gap-2">
            {isOwnerOrAdmin && (
              <Button
                variant="secondary"
                icon={<Download className="h-4 w-4" />}
                onClick={() => alert('Export CSV â€” connect to export utility')}
              >
                Export
              </Button>
            )}
            <Button
              icon={<Plus className="h-4 w-4" />}
              onClick={() => setModalOpen(true)}
              variant={isOperator ? 'danger' : undefined}
            >
              {isOperator ? 'File Incident' : 'Report Incident'}
            </Button>
          </div>
        }
      />

      {/* Filters */}
      <div className="mb-6 flex flex-wrap gap-3">
        <select
          value={severityFilter}
          onChange={(e) => setSeverityFilter(e.target.value as IncidentSeverity | 'all')}
          className="rounded-lg border border-[#E5E7EB] bg-white px-3 py-2 text-sm text-[#111827] focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
        >
          <option value="all">All Severities</option>
          {(Object.keys(severityConfig) as IncidentSeverity[]).map((s) => (
            <option key={s} value={s}>{severityConfig[s].label}</option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as IncidentResolution | 'all')}
          className="rounded-lg border border-[#E5E7EB] bg-white px-3 py-2 text-sm text-[#111827] focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
        >
          <option value="all">All Statuses</option>
          {resolutionFlow.map((r) => (
            <option key={r} value={r}>{resolutionConfig[r].label}</option>
          ))}
        </select>

        {/* Alert banner for critical/high */}
        {incidents.filter((i) => (i.severity === 'critical' || i.severity === 'high') && i.resolutionStatus !== 'closed').length > 0 && (
          <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            {incidents.filter((i) => (i.severity === 'critical' || i.severity === 'high') && i.resolutionStatus !== 'closed').length} high/critical incident(s) require attention
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-[#9CA3AF]">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={filtered}
          onRowClick={openDetail}
          emptyMessage="No incidents reported. That's a good thing!"
        />
      )}

      {/* Incident Detail Slide-Over */}
      <SlideOverPanel
        open={slideOpen}
        onClose={() => setSlideOpen(false)}
        title="Incident Report"
        width="max-w-xl"
      >
        {selectedIncident && (
          <SlideOverTabs
            tabs={[
              {
                key: 'detail',
                label: 'Detail',
                content: (
                  <div className="space-y-5">
                    {/* Severity + Status */}
                    <div className="flex flex-wrap gap-2">
                      <span className={cn('inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm font-medium', severityConfig[selectedIncident.severity].color)}>
                        <AlertTriangle className="h-4 w-4" />
                        {severityConfig[selectedIncident.severity].label} Severity
                      </span>
                      <span className={cn('inline-flex items-center rounded-full px-3 py-1 text-sm font-medium', resolutionConfig[selectedIncident.resolutionStatus].color)}>
                        {resolutionConfig[selectedIncident.resolutionStatus].label}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-xs font-medium uppercase tracking-wider text-[#6B7280]">Job</p>
                        <p className="mt-1 font-medium text-[#111827]">{selectedIncident.jobTitle || selectedIncident.jobId}</p>
                      </div>
                      <div>
                        <p className="text-xs font-medium uppercase tracking-wider text-[#6B7280]">Reported By</p>
                        <p className="mt-1 text-[#111827]">{userMap[selectedIncident.operatorId] || selectedIncident.operatorId}</p>
                      </div>
                      <div>
                        <p className="text-xs font-medium uppercase tracking-wider text-[#6B7280]">Date</p>
                        <p className="mt-1 text-[#111827]">{formatDate(selectedIncident.createdAt)}</p>
                      </div>
                    </div>

                    <div>
                      <p className="text-xs font-medium uppercase tracking-wider text-[#6B7280]">Description</p>
                      <p className="mt-2 text-sm leading-relaxed text-[#374151]">{selectedIncident.description}</p>
                    </div>

                    {/* AI-generated report (if any) */}
                    {selectedIncident.aiGeneratedReport && !isOwnerOrAdmin && (
                      <div>
                        <p className="text-xs font-medium uppercase tracking-wider text-[#6B7280]">AI Report</p>
                        <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-[#374151]">{selectedIncident.aiGeneratedReport}</p>
                      </div>
                    )}

                    {/* Status Advance */}
                    {isOwnerOrAdmin && selectedIncident.resolutionStatus !== 'closed' && (
                      <div className="border-t border-[#E5E7EB] pt-4">
                        <p className="mb-2 text-xs font-medium uppercase tracking-wider text-[#6B7280]">Advance Status</p>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => handleStatusAdvance(selectedIncident.id)}
                        >
                          Mark as{' '}
                          {resolutionConfig[resolutionFlow[resolutionFlow.indexOf(selectedIncident.resolutionStatus) + 1]]?.label}
                        </Button>
                      </div>
                    )}
                  </div>
                ),
              },
              ...((isOwnerOrAdmin || (isOperator && selectedIncident.operatorId === user?.uid)) ? [{
                key: 'edit',
                label: 'Edit',
                content: (
                  <div className="space-y-4">
                    {incEditSuccess && (
                      <div className="flex items-center gap-2 rounded-lg bg-green-50 px-4 py-3 text-sm text-green-800">
                        <CheckCircle className="h-4 w-4 shrink-0" />
                        Changes saved successfully.
                      </div>
                    )}
                    <div>
                      <p className="mb-1 text-xs font-medium uppercase tracking-wider text-[#6B7280]">Severity</p>
                      <select
                        value={incEditForm.severity}
                        onChange={(e) => setIncEditForm((f) => ({ ...f, severity: e.target.value as IncidentSeverity }))}
                        className="w-full rounded-lg border border-[#E5E7EB] bg-white px-3 py-2.5 text-sm text-[#111827] focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                      >
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                        <option value="critical">Critical</option>
                      </select>
                    </div>
                    <div>
                      <p className="mb-1 text-xs font-medium uppercase tracking-wider text-[#6B7280]">Description</p>
                      <textarea
                        value={incEditForm.description}
                        onChange={(e) => setIncEditForm((f) => ({ ...f, description: e.target.value }))}
                        rows={6}
                        placeholder="Describe what happened..."
                        className="w-full rounded-lg border border-[#E5E7EB] bg-white p-3 text-sm text-[#111827] placeholder-[#9CA3AF] focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-200"
                      />
                    </div>
                    <div className="flex justify-end pt-2">
                      <Button
                        icon={incEditSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                        onClick={handleEditIncident}
                        disabled={incEditSaving}
                      >
                        {incEditSaving ? 'Saving…' : 'Save Changes'}
                      </Button>
                    </div>
                  </div>
                ),
              }] : []),
              ...(isOwnerOrAdmin ? [{
                key: 'ownerReview',
                label: 'Owner Review',
                content: (
                  <div className="space-y-5">
                    {ownerApprovedMap[selectedIncident.id] && (
                      <div className="flex items-center gap-2 rounded-lg bg-green-50 px-4 py-3 text-sm text-green-800">
                        <CheckCircle className="h-4 w-4 shrink-0" />
                        Owner reviewed on {ownerApprovedMap[selectedIncident.id]}
                      </div>
                    )}

                    <div>
                      <p className="text-xs font-medium uppercase tracking-wider text-[#6B7280] mb-1">Owner Notes / Approval</p>
                      <p className="mb-2 text-xs text-[#6B7280]">
                        Add notes, corrective actions, or approval before finalizing this report.
                      </p>
                      <textarea
                        value={ownerNotesMap[selectedIncident.id] ?? ''}
                        onChange={(e) =>
                          setOwnerNotesMap((prev) => ({ ...prev, [selectedIncident.id]: e.target.value }))
                        }
                        placeholder="e.g., Reviewed with site supervisor. Corrective action plan submitted to client..."
                        rows={5}
                        className="w-full rounded-lg border border-[#E5E7EB] bg-white p-3 text-sm text-[#111827] placeholder-[#9CA3AF] focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-200"
                      />
                    </div>

                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        icon={<CheckCircle className="h-4 w-4" />}
                        onClick={() => handleSaveOwnerNote(selectedIncident.id)}
                      >
                        Save &amp; Approve Notes
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        icon={<Download className="h-4 w-4" />}
                        onClick={() => alert('PDF export â€” connect to PDF generation service')}
                      >
                        Export PDF
                      </Button>
                    </div>
                  </div>
                ),
              }] : []),
            ]}
          />
        )}
      </SlideOverPanel>

      {/* Report Incident Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Report Incident" maxWidth="max-w-lg">
        <form className="space-y-4" onSubmit={handleCreate}>
          <Select
            label="Job"
            id="incidentJob"
            value={newForm.jobId}
            onChange={(e) => setNewForm((f) => ({ ...f, jobId: e.target.value }))}
            options={[
              { value: '', label: 'Select a job...' },
              ...jobs.map((j) => ({ value: j.id, label: j.title })),
            ]}
            required
          />
          <Select
            label="Severity"
            id="incidentSeverity"
            value={newForm.severity}
            onChange={(e) => setNewForm((f) => ({ ...f, severity: e.target.value as IncidentSeverity }))}
            options={[
              { value: 'low', label: 'Low' },
              { value: 'medium', label: 'Medium' },
              { value: 'high', label: 'High' },
              { value: 'critical', label: 'Critical' },
            ]}
          />
          <Textarea
            label="Description"
            id="incidentDesc"
            placeholder="Describe what happened..."
            required
            value={newForm.description}
            onChange={(e) => setNewForm((f) => ({ ...f, description: e.target.value }))}
          />
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="secondary" type="button" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button type="submit" variant="danger" disabled={saving} icon={saving ? <Loader2 className="h-4 w-4 animate-spin" /> : undefined}>
              {saving ? 'Submittingâ€¦' : 'Submit Report'}
            </Button>
          </div>
        </form>
      </Modal>
    </RoleGuard>
  );
}
