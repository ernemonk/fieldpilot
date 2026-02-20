'use client';

import { useState } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/FormFields';
import { Modal } from '@/components/ui/Modal';
import { Avatar } from '@/components/ui/Avatar';
import { RoleGuard } from '@/components/RoleGuard';
import { useAuth } from '@/context/AuthContext';
import { useTenant } from '@/context/TenantContext';
import { Palette, Building2, Shield, Users, UserPlus, Trash2, Check, Upload, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { UserRole } from '@/lib/types';
import { setTenantBranding } from '@/lib/firestore';

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: 'active' | 'invited';
  joinedAt: string;
}

const roleConfig: Record<UserRole, { label: string; color: string }> = {
  owner: { label: 'Owner', color: 'bg-emerald-100 text-emerald-700' },
  admin: { label: 'Admin', color: 'bg-teal-100 text-teal-700' },
  operator: { label: 'Operator', color: 'bg-blue-100 text-blue-700' },
  client: { label: 'Client', color: 'bg-gray-100 text-gray-700' },
};

const demoTeam: TeamMember[] = [
  { id: 't1', name: 'Alex Rivera', email: 'alex@fieldpilot.app', role: 'owner', status: 'active', joinedAt: 'Jan 1, 2026' },
  { id: 't2', name: 'Jordan Smith', email: 'jordan@fieldpilot.app', role: 'admin', status: 'active', joinedAt: 'Jan 10, 2026' },
  { id: 't3', name: 'Mike Johnson', email: 'mike@fieldpilot.app', role: 'operator', status: 'active', joinedAt: 'Jan 15, 2026' },
  { id: 't4', name: 'Sarah Chen', email: 'sarah@fieldpilot.app', role: 'operator', status: 'active', joinedAt: 'Jan 20, 2026' },
  { id: 't5', name: 'casey@buildright.com', email: 'casey@buildright.com', role: 'client', status: 'invited', joinedAt: 'Feb 14, 2026' },
];

export default function SettingsPage() {
  const { user } = useAuth();
  const { branding } = useTenant();
  const isOwner = user?.role === 'owner';

  // Branding state
  const [brandingForm, setBrandingForm] = useState({
    businessName: branding.businessName,
    primaryColor: branding.primaryColor,
    secondaryColor: branding.secondaryColor,
  });
  const [brandingSaved, setBrandingSaved] = useState(false);
  const [brandingSaving, setBrandingSaving] = useState(false);

  const handleSaveBranding = async () => {
    const tenantId = user?.tenantId;
    if (!tenantId) return;
    setBrandingSaving(true);
    try {
      await setTenantBranding(tenantId, {
        businessName: brandingForm.businessName,
        primaryColor: brandingForm.primaryColor,
        secondaryColor: brandingForm.secondaryColor,
      });
      setBrandingSaved(true);
      setTimeout(() => setBrandingSaved(false), 2500);
    } catch (err) {
      console.error('Failed to save branding:', err);
    } finally {
      setBrandingSaving(false);
    }
  };

  // Team state
  const [team, setTeam] = useState<TeamMember[]>(demoTeam);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [inviteForm, setInviteForm] = useState({ email: '', role: 'operator' as UserRole });
  const [removeConfirmId, setRemoveConfirmId] = useState<string | null>(null);

  const handleInvite = (e: React.FormEvent) => {
    e.preventDefault();
    const newMember: TeamMember = {
      id: `t${Date.now()}`,
      name: inviteForm.email,
      email: inviteForm.email,
      role: inviteForm.role,
      status: 'invited',
      joinedAt: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    };
    setTeam((prev) => [...prev, newMember]);
    setInviteForm({ email: '', role: 'operator' });
    setInviteModalOpen(false);
  };

  const handleRemoveMember = (id: string) => {
    setTeam((prev) => prev.filter((m) => m.id !== id));
    setRemoveConfirmId(null);
  };

  return (
    <RoleGuard allowedRoles={['owner', 'admin']}>
      <PageHeader
        title="Settings"
        description="Manage your workspace, branding, and team."
      />

      <div className="max-w-2xl space-y-6">
        {/* Branding */}
        <Card>
          <CardHeader>
            <CardTitle>
              <div className="flex items-center gap-2">
                <Palette className="h-5 w-5 text-[#6B7280]" />
                Branding
              </div>
            </CardTitle>
          </CardHeader>
          <div className="space-y-4">
            <Input
              label="Business Name"
              id="businessName"
              value={brandingForm.businessName}
              onChange={(e) => setBrandingForm((f) => ({ ...f, businessName: e.target.value }))}
            />
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="block text-sm font-medium text-[#111827]">Primary Color</label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={brandingForm.primaryColor}
                    onChange={(e) => setBrandingForm((f) => ({ ...f, primaryColor: e.target.value }))}
                    className="h-10 w-14 cursor-pointer rounded border"
                  />
                  <span className="text-sm text-[#6B7280]">{brandingForm.primaryColor}</span>
                </div>
              </div>
              <div className="space-y-1">
                <label className="block text-sm font-medium text-[#111827]">Secondary Color</label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={brandingForm.secondaryColor}
                    onChange={(e) => setBrandingForm((f) => ({ ...f, secondaryColor: e.target.value }))}
                    className="h-10 w-14 cursor-pointer rounded border"
                  />
                  <span className="text-sm text-[#6B7280]">{brandingForm.secondaryColor}</span>
                </div>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-[#111827] mb-1">Logo</label>
              <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-[#D1D5DB] px-4 py-3 text-sm text-[#6B7280] transition-colors hover:border-teal-400 hover:text-teal-600">
                <Upload className="h-4 w-4" />
                Click to upload logo (PNG, SVG)
                <input type="file" accept="image/*" className="hidden" />
              </label>
            </div>
            <Button
              size="sm"
              onClick={handleSaveBranding}
              icon={
                brandingSaving ? <Loader2 className="h-4 w-4 animate-spin" /> :
                brandingSaved ? <Check className="h-4 w-4" /> : undefined
              }
              className={cn(brandingSaved && 'bg-green-600 hover:bg-green-700')}
              disabled={brandingSaving}
            >
              {brandingSaving ? 'Saving…' : brandingSaved ? 'Saved!' : 'Save Branding'}
            </Button>
          </div>
        </Card>

        {/* Company Info */}
        <Card>
          <CardHeader>
            <CardTitle>
              <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-[#6B7280]" />
                Company Info
              </div>
            </CardTitle>
          </CardHeader>
          <div className="space-y-4">
            <Input label="Tenant ID" id="tenantId" defaultValue={user?.tenantId || ''} disabled />
            <Input label="Owner Email" id="ownerEmail" defaultValue={user?.email || ''} disabled />
            <div className="rounded-lg bg-gray-50 p-4 text-sm text-[#6B7280]">
              <p>Plan: <span className="font-medium text-[#111827]">Free (Spark)</span></p>
              <p className="mt-1">Upgrade to Pro for advanced features, more operators, and priority support.</p>
            </div>
          </div>
        </Card>

        {/* Security */}
        <Card>
          <CardHeader>
            <CardTitle>
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-[#6B7280]" />
                Security
              </div>
            </CardTitle>
          </CardHeader>
          <div className="space-y-4">
            <Input label="Current Password" id="currentPassword" type="password" placeholder="••••••••" />
            <Input label="New Password" id="newPassword" type="password" placeholder="••••••••" />
            <Button size="sm" variant="secondary">Update Password</Button>
          </div>
        </Card>

        {/* Team Management */}
        {isOwner && (
          <Card>
            <CardHeader>
              <CardTitle>
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-[#6B7280]" />
                  Team Members
                </div>
              </CardTitle>
              <Button size="sm" icon={<UserPlus className="h-4 w-4" />} onClick={() => setInviteModalOpen(true)}>
                Invite Member
              </Button>
            </CardHeader>

            <div className="divide-y divide-[#E5E7EB]">
              {team.map((member) => (
                <div key={member.id} className="flex items-center gap-3 py-3">
                  <Avatar name={member.name} size="sm" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-medium text-[#111827]">{member.name}</p>
                      {member.status === 'invited' && (
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                          Invited
                        </span>
                      )}
                    </div>
                    <p className="truncate text-xs text-[#6B7280]">{member.email}</p>
                  </div>
                  <span className={cn('shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium', roleConfig[member.role].color)}>
                    {roleConfig[member.role].label}
                  </span>
                  {member.role !== 'owner' && (
                    <button
                      onClick={() => setRemoveConfirmId(member.id)}
                      className="ml-1 rounded p-1 text-[#9CA3AF] hover:text-red-500"
                      title="Remove member"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>

      {/* Invite Member Modal */}
      <Modal open={inviteModalOpen} onClose={() => setInviteModalOpen(false)} title="Invite Team Member" maxWidth="max-w-sm">
        <form className="space-y-4" onSubmit={handleInvite}>
          <Input
            label="Email Address"
            id="inviteEmail"
            type="email"
            placeholder="name@company.com"
            required
            value={inviteForm.email}
            onChange={(e) => setInviteForm((f) => ({ ...f, email: e.target.value }))}
          />
          <Select
            label="Role"
            id="inviteRole"
            value={inviteForm.role}
            onChange={(e) => setInviteForm((f) => ({ ...f, role: e.target.value as UserRole }))}
            options={[
              { value: 'admin', label: 'Admin — full management access' },
              { value: 'operator', label: 'Operator — field work access' },
              { value: 'client', label: 'Client — read-only proposals & jobs' },
            ]}
          />
          <p className="text-xs text-[#6B7280]">
            An invitation email will be sent. They can join your workspace using their work email.
          </p>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" type="button" onClick={() => setInviteModalOpen(false)}>Cancel</Button>
            <Button type="submit" icon={<UserPlus className="h-4 w-4" />}>Send Invite</Button>
          </div>
        </form>
      </Modal>

      {/* Remove Member Confirmation */}
      <Modal open={!!removeConfirmId} onClose={() => setRemoveConfirmId(null)} title="Remove Team Member" maxWidth="max-w-sm">
        <div className="space-y-4">
          <p className="text-sm text-[#374151]">
            Remove <strong>{team.find((m) => m.id === removeConfirmId)?.name}</strong> from your workspace? They will
            lose all access immediately.
          </p>
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setRemoveConfirmId(null)}>Cancel</Button>
            <Button variant="danger" onClick={() => handleRemoveMember(removeConfirmId!)} icon={<Trash2 className="h-4 w-4" />}>
              Remove
            </Button>
          </div>
        </div>
      </Modal>
    </RoleGuard>
  );
}
