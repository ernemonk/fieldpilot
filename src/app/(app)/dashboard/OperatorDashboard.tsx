'use client';

import { useState, useEffect, useRef } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatCard } from '@/components/ui/StatCard';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Button } from '@/components/ui/Button';
import {
  Play,
  Square,
  Clock,
  AlertTriangle,
  Camera,
  CheckCircle,
  ClipboardList,
  ImagePlus,
  ChevronRight,
  Loader2,
} from 'lucide-react';
import Link from 'next/link';
import { getWorkSessions, getJobsByOperator } from '@/lib/firestore';
import type { User, JobStatus, Job } from '@/lib/types';

const DUMMY_SESSIONS = [
  { job: 'Generator Maintenance', hours: 3.5, date: 'Yesterday' },
  { job: 'Circuit Breaker Replacement', hours: 2.0, date: 'Feb 12' },
  { job: 'Electrical Panel Upgrade', hours: 6.0, date: 'Feb 11' },
];

// Quick actions config — each has distinct color/meaning
const QUICK_ACTIONS = [
  {
    href: '/sessions',
    icon: Play,
    label: 'Start Session',
    sub: 'Clock in on a job',
    bg: 'bg-emerald-500',
    hover: 'hover:bg-emerald-600',
    ring: 'ring-emerald-200',
    text: 'text-white',
  },
  {
    href: '/ai/incident',
    icon: AlertTriangle,
    label: 'File Incident',
    sub: 'AI-powered report',
    bg: 'bg-orange-500',
    hover: 'hover:bg-orange-600',
    ring: 'ring-orange-200',
    text: 'text-white',
  },
  {
    href: '/incidents',
    icon: ClipboardList,
    label: 'My Incidents',
    sub: 'View & track reports',
    bg: 'bg-teal-500',
    hover: 'hover:bg-teal-600',
    ring: 'ring-teal-200',
    text: 'text-white',
  },
  {
    href: null, // triggers photo input
    icon: ImagePlus,
    label: 'Upload Photos',
    sub: 'Attach site photos',
    bg: 'bg-emerald-500',
    hover: 'hover:bg-emerald-600',
    ring: 'ring-emerald-200',
    text: 'text-white',
  },
];

function useElapsedTimer(startTime: Date | null) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    if (!startTime) { setElapsed(0); return; }
    const tick = () => setElapsed(Math.floor((Date.now() - startTime.getTime()) / 1000));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [startTime]);
  const h = Math.floor(elapsed / 3600);
  const m = Math.floor((elapsed % 3600) / 60);
  const s = elapsed % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function OperatorDashboard({ user }: { user: User | null }) {
  const [activeSession, setActiveSession] = useState<{ jobId: string; jobTitle: string; startTime: Date } | null>(null);
  const [photos, setPhotos] = useState<{ name: string; jobId: string }[]>([]);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const elapsed = useElapsedTimer(activeSession?.startTime ?? null);

  // ── Live assigned jobs ────────────────────────────────────────────────────
  const [assignedJobs, setAssignedJobs] = useState<Job[]>([]);
  const [jobsLoading, setJobsLoading] = useState(false);

  useEffect(() => {
    if (!user?.tenantId || !user?.uid) return;
    setJobsLoading(true);
    getJobsByOperator(user.tenantId, user.uid)
      .then(setAssignedJobs)
      .catch(console.error)
      .finally(() => setJobsLoading(false));
  }, [user?.tenantId, user?.uid]);

  // ── Live recent sessions (fallback to dummy while no Firestore data) ──────
  const [recentSessions, setRecentSessions] = useState(DUMMY_SESSIONS);
  const [sessionsLoading, setSessionsLoading] = useState(false);

  useEffect(() => {
    if (!user?.tenantId || !user?.uid) return;
    setSessionsLoading(true);
    getWorkSessions(user.tenantId, undefined, user.uid)
      .then((fetched) => {
        if (fetched.length === 0) return; // keep dummy data as placeholder
        const sorted = [...fetched]
          .filter((s) => s.endTime)  // only completed
          .sort((a, b) => b.startTime.getTime() - a.startTime.getTime())
          .slice(0, 3);

        const mapped = sorted.map((s) => {
          const durationMs = s.endTime ? s.endTime.getTime() - s.startTime.getTime() : 0;
          const hours = Math.round((durationMs / 3600000) * 10) / 10;
          const daysAgo = Math.round((Date.now() - s.startTime.getTime()) / 86400000);
          const dateLabel = daysAgo === 0 ? 'Today' : daysAgo === 1 ? 'Yesterday' : s.startTime.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          return { job: s.jobId, hours, date: dateLabel }; // jobId until title lookup added
        });
        setRecentSessions(mapped);
      })
      .catch(console.error)
      .finally(() => setSessionsLoading(false));
  }, [user?.tenantId, user?.uid]);

  const startSession = (jobId: string, jobTitle: string) => {
    setActiveSession({ jobId, jobTitle, startTime: new Date() });
  };

  const endSession = () => setActiveSession(null);

  const handlePhotoCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !activeSession) return;
    const added = Array.from(files).map((f) => ({ name: f.name, jobId: activeSession.jobId }));
    setPhotos((p) => [...p, ...added]);
  };

  return (
    <div>
      <PageHeader
        title={`Hey ${user?.displayName?.split(' ')[0] || 'Operator'}`}
        description="Your assigned jobs and work sessions."
        actions={
          <Link href="/ai/incident">
            <Button variant="secondary" icon={<AlertTriangle className="h-4 w-4" />}>
              File Incident
            </Button>
          </Link>
        }
      />

      {/* Active Session Banner */}
      {activeSession && (
        <div className="mb-6 flex items-center justify-between rounded-xl border border-green-200 bg-green-50 px-5 py-4 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100">
              <Clock className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="font-semibold text-[#111827]">Active Session — {activeSession.jobTitle}</p>
              <p className="text-sm font-mono text-green-700">{elapsed} elapsed</p>
            </div>
          </div>
          <div className="flex gap-2">
            <input
              ref={photoInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              multiple
              className="hidden"
              onChange={handlePhotoCapture}
            />
            <Button
              variant="secondary"
              size="sm"
              icon={<Camera className="h-4 w-4" />}
              onClick={() => photoInputRef.current?.click()}
            >
              {photos.filter((p) => p.jobId === activeSession.jobId).length > 0
                ? `${photos.filter((p) => p.jobId === activeSession.jobId).length} Photo(s)`
                : 'Add Photo'}
            </Button>
            <Button
              variant="danger"
              size="sm"
              icon={<Square className="h-4 w-4" />}
              onClick={endSession}
            >
              End Session
            </Button>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Assigned Jobs" value={jobsLoading ? '…' : assignedJobs.length} icon={<CheckCircle className="h-5 w-5" />} />
        <StatCard label="Hours This Week" value="24.5" icon={<Clock className="h-5 w-5" />} />
        <StatCard label="Active Session" value={activeSession ? 'Live' : 'None'} icon={<Play className="h-5 w-5" />} />
        <StatCard label="Open Incidents" value={0} icon={<AlertTriangle className="h-5 w-5" />} />
      </div>

      {/* Today's Jobs */}
      <h2 className="mb-4 text-lg font-semibold text-[#111827]">Your Jobs</h2>
      {jobsLoading && (
        <div className="mb-8 flex items-center justify-center py-10 text-[#9CA3AF]">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      )}
      {!jobsLoading && assignedJobs.length === 0 && (
        <div className="mb-8 rounded-xl border border-[#E5E7EB] bg-white px-6 py-10 text-center">
          <p className="text-sm text-[#9CA3AF]">No jobs assigned to you yet.</p>
        </div>
      )}
      <div className="mb-8 space-y-4">
        {assignedJobs.map((job) => {
          const isThisActive = activeSession?.jobId === job.id;
          return (
            <div
              key={job.id}
              className={`rounded-xl border bg-white p-5 shadow-sm transition-shadow hover:shadow-md ${isThisActive ? 'border-green-300' : 'border-[#E5E7EB]'}`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-base font-semibold text-[#111827]">{job.title}</p>
                  <p className="text-sm text-[#6B7280]">{job.description || 'No description'}</p>
                  {job.estimatedStart && (
                    <p className="mt-1 text-xs font-medium text-teal-600">
                      Est. start: {job.estimatedStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </p>
                  )}
                </div>
                <StatusBadge status={job.status} />
              </div>
              <div className="mt-4 flex gap-2">
                {isThisActive ? (
                  <Button variant="danger" className="flex-1 py-3" icon={<Square className="h-5 w-5" />} onClick={endSession}>
                    End Session ({elapsed})
                  </Button>
                ) : activeSession ? (
                  <Button className="flex-1 py-3" disabled>
                    Session active on another job
                  </Button>
                ) : job.status === 'in_progress' ? (
                  <Button className="flex-1 text-base py-3" icon={<Clock className="h-5 w-5" />} onClick={() => startSession(job.id, job.title)}>
                    Log Hours
                  </Button>
                ) : (
                  <Button className="flex-1 text-base py-3" icon={<Play className="h-5 w-5" />} onClick={() => startSession(job.id, job.title)}>
                    Start Session
                  </Button>
                )}
                <Link href="/ai/incident">
                  <Button variant="secondary" className="py-3" icon={<AlertTriangle className="h-5 w-5" />}>
                    Incident
                  </Button>
                </Link>
                <Button
                  variant="secondary"
                  className="py-3"
                  icon={<Camera className="h-5 w-5" />}
                  onClick={() => photoInputRef.current?.click()}
                >
                  Photo
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Recent Sessions */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Sessions</CardTitle>
            <Link href="/sessions">
              <Button variant="ghost" size="sm">View all</Button>
            </Link>
          </CardHeader>
          {sessionsLoading ? (
            <div className="flex items-center justify-center py-8 text-[#9CA3AF]">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : (
            <div className="space-y-3">
              {recentSessions.map((s, i) => (
                <div key={i} className="flex items-center justify-between rounded-lg border border-[#E5E7EB] px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-teal-50">
                      <Clock className="h-4 w-4 text-teal-500" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-[#111827]">{s.job}</p>
                      <p className="text-xs text-[#9CA3AF]">{s.date}</p>
                    </div>
                  </div>
                  <span className="rounded-full bg-gray-100 px-3 py-1 text-sm font-semibold text-[#374151]">
                    {s.hours}h
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Quick Actions — 2×2 colored tiles */}
        <div>
          <h3 className="mb-3 text-base font-semibold text-[#111827]">Quick Actions</h3>
          <div className="grid grid-cols-2 gap-3">
            {QUICK_ACTIONS.map((action) => {
              const Icon = action.icon;
              const inner = (
                <button
                  key={action.label}
                  onClick={action.href ? undefined : () => photoInputRef.current?.click()}
                  className={`group relative flex w-full flex-col items-start gap-3 rounded-2xl p-5 shadow-sm ring-2 ring-transparent transition-all duration-150 active:scale-[0.97] ${action.bg} ${action.hover} hover:ring-4 ${action.ring} hover:shadow-md`}
                >
                  {/* Icon circle */}
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/20">
                    <Icon className={`h-6 w-6 ${action.text}`} />
                  </div>
                  {/* Label */}
                  <div className="text-left">
                    <p className={`text-sm font-semibold leading-tight ${action.text}`}>{action.label}</p>
                    <p className="mt-0.5 text-xs text-white/70">{action.sub}</p>
                  </div>
                  {/* Arrow hint */}
                  <ChevronRight className="absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40 transition-transform group-hover:translate-x-0.5" />
                </button>
              );

              return action.href ? (
                <Link key={action.label} href={action.href}>
                  {inner}
                </Link>
              ) : (
                <div key={action.label}>{inner}</div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Hidden photo input (shared) */}
      <input
        ref={photoInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        multiple
        className="hidden"
        onChange={handlePhotoCapture}
      />
    </div>
  );
}

