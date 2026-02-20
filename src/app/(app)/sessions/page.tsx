'use client';

import { useState, useEffect, useCallback } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { DataTable } from '@/components/ui/DataTable';
import { Modal } from '@/components/ui/Modal';
import { Textarea, Select } from '@/components/ui/FormFields';
import { Avatar } from '@/components/ui/Avatar';
import { RoleGuard } from '@/components/RoleGuard';
import { useAuth } from '@/context/AuthContext';
import { Plus, Play, Square, Camera, Loader2 } from 'lucide-react';
import { formatDate, formatTime, formatDuration } from '@/lib/utils';
import {
  getWorkSessions,
  createWorkSession,
  updateWorkSession,
  getJobs,
  getJobsByOperator,
  getUsers,
} from '@/lib/firestore';
import type { WorkSession, Job, User } from '@/lib/types';

function ElapsedBadge({ startTime }: { startTime: Date }) {
  const [elapsed, setElapsed] = useState('0:00:00');
  useEffect(() => {
    const tick = () => {
      const s = Math.floor((Date.now() - startTime.getTime()) / 1000);
      const h = Math.floor(s / 3600);
      const m = Math.floor((s % 3600) / 60);
      const sec = s % 60;
      setElapsed(`${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [startTime]);
  return <span className="font-mono text-sm text-green-700">{elapsed}</span>;
}

export default function SessionsPage() {
  const { user } = useAuth();
  const tenantId = user?.tenantId ?? '';
  const isOwnerOrAdmin = user?.role === 'owner' || user?.role === 'admin';
  const isOperator = user?.role === 'operator';

  const [sessions, setSessions] = useState<WorkSession[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [userMap, setUserMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [startModalOpen, setStartModalOpen] = useState(false);
  const [endModalOpen, setEndModalOpen] = useState(false);
  const [sessionToEnd, setSessionToEnd] = useState<WorkSession | null>(null);
  const [endNotes, setEndNotes] = useState('');

  const [newForm, setNewForm] = useState({ jobId: '', notes: '' });

  // ── Load data ───────────────────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);
    try {
      const [fetchedJobs, fetchedUsers] = await Promise.all([
        isOperator && user?.uid
          ? getJobsByOperator(tenantId, user.uid)
          : getJobs(tenantId),
        isOwnerOrAdmin ? getUsers(tenantId) : Promise.resolve([] as User[]),
      ]);

      setJobs(fetchedJobs);

      const nameMap: Record<string, string> = {};
      for (const u of fetchedUsers) nameMap[u.uid] = u.displayName;
      if (user?.uid && user?.displayName) nameMap[user.uid] = user.displayName;
      setUserMap(nameMap);

      const fetchedSessions = await (isOperator && user?.uid
        ? getWorkSessions(tenantId, undefined, user.uid)
        : getWorkSessions(tenantId));

      setSessions(fetchedSessions.sort((a, b) => b.startTime.getTime() - a.startTime.getTime()));
    } catch (err) {
      console.error('Failed to load sessions data:', err);
    } finally {
      setLoading(false);
    }
  }, [tenantId, isOperator, isOwnerOrAdmin, user?.uid, user?.displayName]);

  useEffect(() => { loadData(); }, [loadData]);

  // ── Helpers ──────────────────────────────────────────────────────────────────
  const jobTitleById = (jobId: string) =>
    jobs.find((j) => j.id === jobId)?.title ?? jobId;
  const operatorNameById = (uid: string) => userMap[uid] ?? uid;
  const isActive = (s: WorkSession) => !s.endTime;

  const jobOptions = [
    { value: '', label: 'Select a job…' },
    ...jobs.map((j) => ({ value: j.id, label: j.title })),
  ];

  // ── Actions ──────────────────────────────────────────────────────────────────
  const handleStartSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newForm.jobId || !user?.uid || !tenantId) return;
    setSaving(true);
    try {
      const now = new Date();
      await createWorkSession(tenantId, {
        jobId: newForm.jobId,
        operatorId: user.uid,
        date: now,
        startTime: now,
        notes: newForm.notes,
        media: [],
      });
      setNewForm({ jobId: '', notes: '' });
      setStartModalOpen(false);
      await loadData();
    } catch (err) {
      console.error('Failed to start session:', err);
    } finally {
      setSaving(false);
    }
  };

  const openEndModal = (session: WorkSession) => {
    setSessionToEnd(session);
    setEndNotes(session.notes);
    setEndModalOpen(true);
  };

  const handleEndSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sessionToEnd || !tenantId) return;
    setSaving(true);
    try {
      await updateWorkSession(tenantId, sessionToEnd.id, {
        endTime: new Date(),
        notes: endNotes,
      });
      setEndModalOpen(false);
      setSessionToEnd(null);
      await loadData();
    } catch (err) {
      console.error('Failed to end session:', err);
    } finally {
      setSaving(false);
    }
  };

  const activeSessions = sessions.filter(isActive);
  const completedSessions = sessions.filter((s) => !isActive(s));

  // ── Table columns ─────────────────────────────────────────────────────────────
  const columns = [
    {
      key: 'operator',
      header: 'Operator',
      render: (s: WorkSession) => {
        const name = operatorNameById(s.operatorId);
        return (
          <div className="flex items-center gap-3">
            <Avatar name={name} size="sm" />
            <span className="text-sm font-medium text-[#111827]">{name}</span>
          </div>
        );
      },
    },
    {
      key: 'job',
      header: 'Job',
      render: (s: WorkSession) => (
        <span className="text-sm text-[#111827]">{jobTitleById(s.jobId)}</span>
      ),
    },
    {
      key: 'date',
      header: 'Date',
      render: (s: WorkSession) => (
        <span className="text-sm text-[#6B7280]">{formatDate(s.date)}</span>
      ),
    },
    {
      key: 'time',
      header: 'Time',
      render: (s: WorkSession) => (
        <span className="text-sm text-[#6B7280]">
          {formatTime(s.startTime)} — {s.endTime ? formatTime(s.endTime) : 'Active'}
        </span>
      ),
    },
    {
      key: 'duration',
      header: 'Duration',
      render: (s: WorkSession) => (
        <span className="text-sm font-medium text-[#111827]">
          {isActive(s) ? (
            <ElapsedBadge startTime={s.startTime} />
          ) : (
            formatDuration(s.startTime, s.endTime)
          )}
        </span>
      ),
    },
    {
      key: 'media',
      header: 'Media',
      render: (s: WorkSession) =>
        s.media.length > 0 ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-teal-50 px-2 py-0.5 text-xs font-medium text-teal-700">
            <Camera className="h-3 w-3" />
            {s.media.length}
          </span>
        ) : (
          <span className="text-xs text-[#9CA3AF]">—</span>
        ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (s: WorkSession) =>
        isActive(s) ? (
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-green-500" />
              Active
            </span>
            <Button
              size="sm"
              variant="danger"
              icon={<Square className="h-3 w-3" />}
              onClick={(e) => { e.stopPropagation(); openEndModal(s); }}
            >
              End
            </Button>
          </div>
        ) : (
          <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700">
            Completed
          </span>
        ),
    },
  ];

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <RoleGuard allowedRoles={['owner', 'admin', 'operator']}>
      <PageHeader
        title="Work Sessions"
        description={
          isOperator
            ? 'Your time logs and active sessions.'
            : 'Track operator work sessions and hours.'
        }
        actions={
          <Button
            icon={<Plus className="h-4 w-4" />}
            onClick={() => setStartModalOpen(true)}
            disabled={loading}
          >
            Start Session
          </Button>
        }
      />

      {loading ? (
        <div className="flex items-center justify-center py-24 text-[#6B7280]">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          Loading sessions…
        </div>
      ) : (
        <>
          {/* Active Sessions Banner */}
          {activeSessions.length > 0 && (
            <div className="mb-6 space-y-3">
              <h3 className="text-sm font-medium text-[#6B7280]">
                Active Sessions ({activeSessions.length})
              </h3>
              {activeSessions.map((session) => (
                <Card key={session.id} className="border-green-200 bg-green-50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100">
                        <Play className="h-5 w-5 text-green-600" />
                      </div>
                      <div>
                        <p className="font-medium text-[#111827]">
                          {operatorNameById(session.operatorId)} — {jobTitleById(session.jobId)}
                        </p>
                        <div className="flex items-center gap-1 text-sm text-[#6B7280]">
                          <span>Started at {formatTime(session.startTime)}</span>
                          <span>·</span>
                          <ElapsedBadge startTime={session.startTime} />
                          <span>elapsed</span>
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="danger"
                      size="sm"
                      icon={<Square className="h-3 w-3" />}
                      onClick={() => openEndModal(session)}
                    >
                      End Session
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}

          {/* Completed Sessions Table */}
          <DataTable
            columns={columns}
            data={completedSessions}
            emptyMessage="No completed sessions yet."
          />
        </>
      )}

      {/* Start Session Modal */}
      <Modal
        open={startModalOpen}
        onClose={() => setStartModalOpen(false)}
        title="Start Work Session"
      >
        <form className="space-y-4" onSubmit={handleStartSession}>
          <Select
            label="Job"
            id="sessionJob"
            value={newForm.jobId}
            onChange={(e) => setNewForm((f) => ({ ...f, jobId: e.target.value }))}
            options={jobOptions}
          />
          <Textarea
            label="Initial Notes"
            id="sessionNotes"
            value={newForm.notes}
            onChange={(e) => setNewForm((f) => ({ ...f, notes: e.target.value }))}
            placeholder="What will you be working on today?"
          />
          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="secondary"
              type="button"
              onClick={() => setStartModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              icon={saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
              disabled={saving || !newForm.jobId}
            >
              {saving ? 'Starting…' : 'Start Session'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* End Session Modal */}
      <Modal
        open={endModalOpen}
        onClose={() => setEndModalOpen(false)}
        title="End Work Session"
      >
        <form className="space-y-4" onSubmit={handleEndSession}>
          {sessionToEnd && (
            <div className="rounded-lg bg-gray-50 p-4 text-sm text-[#6B7280]">
              <p className="font-medium text-[#111827]">{jobTitleById(sessionToEnd.jobId)}</p>
              <p>Started at {formatTime(sessionToEnd.startTime)}</p>
              <p className="mt-1 font-mono text-green-700">
                <ElapsedBadge startTime={sessionToEnd.startTime} /> elapsed
              </p>
            </div>
          )}
          <Textarea
            label="Session Notes"
            id="endNotes"
            value={endNotes}
            onChange={(e) => setEndNotes(e.target.value)}
            placeholder="Summarize what was accomplished, any issues found…"
          />
          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="secondary"
              type="button"
              onClick={() => setEndModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="danger"
              icon={saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Square className="h-4 w-4" />}
              disabled={saving}
            >
              {saving ? 'Saving…' : 'End & Save Session'}
            </Button>
          </div>
        </form>
      </Modal>
    </RoleGuard>
  );
}

