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
  DollarSign,
  BarChart3,
  Plus,
  Sparkles,
  UserPlus,
  Download,
} from 'lucide-react';
import Link from 'next/link';
import type { User, JobStatus } from '@/lib/types';

const recentJobs: { title: string; client: string; status: JobStatus; date: string }[] = [
  { title: 'Electrical Panel Upgrade', client: 'Acme Corp', status: 'in_progress', date: 'Feb 15, 2026' },
  { title: 'HVAC System Install', client: 'BuildRight LLC', status: 'approved', date: 'Feb 14, 2026' },
  { title: 'Generator Maintenance', client: 'Metro Services', status: 'proposal_sent', date: 'Feb 13, 2026' },
  { title: 'Fire Alarm Circuit', client: 'SafeWork Inc', status: 'lead', date: 'Feb 12, 2026' },
  { title: 'Substation Wiring', client: 'PowerGrid Co', status: 'scheduled', date: 'Feb 11, 2026' },
];

const pipelineData = [
  { stage: 'Lead', count: 8, color: 'bg-gray-400' },
  { stage: 'Proposal', count: 5, color: 'bg-blue-400' },
  { stage: 'Approved', count: 4, color: 'bg-green-400' },
  { stage: 'In Progress', count: 12, color: 'bg-teal-500' },
  { stage: 'Completed', count: 23, color: 'bg-emerald-500' },
];

const operatorPerformance = [
  { name: 'Mike Johnson', hours: 42.5, jobs: 3, incidents: 0 },
  { name: 'Sarah Chen', hours: 38.0, jobs: 4, incidents: 1 },
  { name: 'David Park', hours: 36.5, jobs: 2, incidents: 0 },
  { name: 'Lisa Martinez', hours: 44.0, jobs: 5, incidents: 0 },
];

export function OwnerDashboard({ user }: { user: User | null }) {
  return (
    <div>
      <PageHeader
        title={`Welcome back, ${user?.displayName?.split(' ')[0] || 'User'}`}
        description="Full business overview — revenue, pipeline, and team performance."
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

      {/* Top-level KPIs */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Revenue Pipeline"
          value="$284K"
          icon={<DollarSign className="h-5 w-5" />}
          trend={{ value: 14, positive: true }}
        />
        <StatCard
          label="Active Jobs"
          value={12}
          icon={<Briefcase className="h-5 w-5" />}
          trend={{ value: 8, positive: true }}
        />
        <StatCard
          label="Total Clients"
          value={34}
          icon={<Users className="h-5 w-5" />}
          trend={{ value: 12, positive: true }}
        />
        <StatCard
          label="Proposal Conversion"
          value="68%"
          icon={<BarChart3 className="h-5 w-5" />}
          trend={{ value: 5, positive: true }}
        />
      </div>

      {/* Second row: hours + incidents + proposals */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          label="Hours This Week"
          value="161"
          icon={<Clock className="h-5 w-5" />}
          trend={{ value: 3, positive: false }}
        />
        <StatCard
          label="Pending Proposals"
          value={5}
          icon={<FileText className="h-5 w-5" />}
        />
        <StatCard
          label="Open Incidents"
          value={2}
          icon={<AlertTriangle className="h-5 w-5" />}
          trend={{ value: 50, positive: false }}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Revenue Pipeline */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Job Pipeline</CardTitle>
          </CardHeader>
          <div className="space-y-3">
            {pipelineData.map((stage) => (
              <div key={stage.stage} className="flex items-center gap-4">
                <span className="w-24 text-sm text-[#6B7280]">{stage.stage}</span>
                <div className="flex-1 h-8 bg-gray-100 rounded-lg overflow-hidden">
                  <div
                    className={`h-full ${stage.color} rounded-lg flex items-center px-3`}
                    style={{ width: `${Math.min((stage.count / 25) * 100, 100)}%` }}
                  >
                    <span className="text-xs font-semibold text-white">{stage.count}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Quick Actions */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <div className="space-y-2">
              <Link href="/jobs" className="block">
                <Button variant="secondary" className="w-full justify-start" icon={<Briefcase className="h-4 w-4" />}>
                  Create Job
                </Button>
              </Link>
              <Link href="/proposals" className="block">
                <Button variant="secondary" className="w-full justify-start" icon={<FileText className="h-4 w-4" />}>
                  Create Proposal
                </Button>
              </Link>
              <Link href="/ai/proposal" className="block">
                <Button variant="secondary" className="w-full justify-start" icon={<Sparkles className="h-4 w-4" />}>
                  AI Proposal Generator
                </Button>
              </Link>
              <Link href="/settings" className="block">
                <Button variant="secondary" className="w-full justify-start" icon={<UserPlus className="h-4 w-4" />}>
                  Invite User
                </Button>
              </Link>
              <Button
                variant="secondary"
                className="w-full justify-start"
                icon={<Download className="h-4 w-4" />}
                onClick={() => alert('Export — connect to export utility')}
              >
                Run Export
              </Button>
            </div>
          </Card>
        </div>

        {/* Operator Performance Table */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Operator Performance</CardTitle>
            <span className="text-xs text-[#6B7280]">This week</span>
          </CardHeader>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#E5E7EB]">
                  <th className="pb-3 text-left font-medium text-[#6B7280]">Operator</th>
                  <th className="pb-3 text-right font-medium text-[#6B7280]">Hours</th>
                  <th className="pb-3 text-right font-medium text-[#6B7280]">Jobs</th>
                  <th className="pb-3 text-right font-medium text-[#6B7280]">Incidents</th>
                </tr>
              </thead>
              <tbody>
                {operatorPerformance.map((op) => (
                  <tr key={op.name} className="border-b border-[#E5E7EB] last:border-0">
                    <td className="py-3 font-medium text-[#111827]">{op.name}</td>
                    <td className="py-3 text-right text-[#6B7280]">{op.hours}h</td>
                    <td className="py-3 text-right text-[#6B7280]">{op.jobs}</td>
                    <td className="py-3 text-right">
                      <span className={op.incidents > 0 ? 'text-red-600 font-medium' : 'text-green-600'}>
                        {op.incidents}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Recent Jobs */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Jobs</CardTitle>
            <Link href="/jobs">
              <Button variant="ghost" size="sm">View all</Button>
            </Link>
          </CardHeader>
          <div className="space-y-3">
            {recentJobs.slice(0, 4).map((job, i) => (
              <div
                key={i}
                className="flex items-center justify-between rounded-lg border border-[#E5E7EB] p-3 transition-colors hover:bg-gray-50"
              >
                <div>
                  <p className="text-sm font-medium text-[#111827]">{job.title}</p>
                  <p className="text-xs text-[#6B7280]">{job.client}</p>
                </div>
                <StatusBadge status={job.status} />
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
