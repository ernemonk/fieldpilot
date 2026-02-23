'use client';

import { useState, useEffect, useCallback } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { DataTable } from '@/components/ui/DataTable';
import { Modal } from '@/components/ui/Modal';
import { SlideOverPanel } from '@/components/ui/SlideOverPanel';
import { Input } from '@/components/ui/FormFields';
import { ActionDropdown } from '@/components/ui/ActionDropdown';
import { Avatar } from '@/components/ui/Avatar';
import { RoleGuard } from '@/components/RoleGuard';
import { Plus, Search, Edit, Trash2, Mail, Phone, MapPin, Briefcase, Eye, Download, UserCheck, Link2, Unlink, Loader2 } from 'lucide-react';
import type { Client, User } from '@/lib/types';
import { formatDate } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import { useTenant } from '@/context/TenantContext';
import {
  getClients, createClient, updateClient, deleteClient,
  getJobs, getUsers, updateUser,
} from '@/lib/firestore';

export default function ClientsPage() {
  const { user } = useAuth();
  const { tenantId } = useTenant();
  const isOwnerOrAdmin = user?.role === 'owner' || user?.role === 'admin';

  const [clients, setClients] = useState<Client[]>([]);
  const [jobCount, setJobCount] = useState<Record<string, number>>({});
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [slideOpen, setSlideOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [clientToEdit, setClientToEdit] = useState<Client | null>(null);
  const [clientToDelete, setClientToDelete] = useState<Client | null>(null);

  const [editForm, setEditForm] = useState({
    companyName: '',
    contactName: '',
    contactEmail: '',
    phone: '',
    address: '',
  });

  const [newForm, setNewForm] = useState({
    companyName: '',
    contactName: '',
    contactEmail: '',
    phone: '',
    address: '',
  });

  const [linkEmail, setLinkEmail] = useState('');
  const [linkError, setLinkError]   = useState('');
  const [linkSuccess, setLinkSuccess] = useState('');

  const loadData = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);
    try {
      const [fetchedClients, fetchedJobs, fetchedUsers] = await Promise.all([
        getClients(tenantId),
        getJobs(tenantId),
        getUsers(tenantId),
      ]);
      setClients(fetchedClients);
      const counts: Record<string, number> = {};
      for (const job of fetchedJobs) counts[job.clientId] = (counts[job.clientId] ?? 0) + 1;
      setJobCount(counts);
      setUsers(fetchedUsers);
    } catch (err) {
      console.error('Failed to load clients:', err);
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleLinkUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClient || !tenantId) return;
    if (!linkEmail.trim()) { setLinkError('Enter an email address.'); return; }
    const matchedUser = users.find((u) => u.email.toLowerCase() === linkEmail.toLowerCase());
    if (!matchedUser) {
      setLinkError('No user found with that email. Ask them to sign up first.');
      return;
    }
    setSaving(true);
    try {
      await Promise.all([
        updateClient(tenantId, selectedClient.id, { linkedUserId: matchedUser.uid }),
        updateUser(tenantId, matchedUser.uid, { linkedClientId: selectedClient.id }),
      ]);
      setClients((prev) => prev.map((c) => c.id === selectedClient.id ? { ...c, linkedUserId: matchedUser.uid } : c));
      setSelectedClient((prev) => prev ? { ...prev, linkedUserId: matchedUser.uid } : prev);
      setLinkError('');
      setLinkSuccess(`Linked to "${matchedUser.displayName}" (${matchedUser.email})`);
      setLinkEmail('');
    } catch (err) {
      console.error('Failed to link user:', err);
      setLinkError('Failed to link user. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleUnlinkUser = async () => {
    if (!selectedClient || !tenantId) return;
    const linkedUid = selectedClient.linkedUserId;
    setSaving(true);
    try {
      await updateClient(tenantId, selectedClient.id, { linkedUserId: undefined });
      if (linkedUid) await updateUser(tenantId, linkedUid, { linkedClientId: undefined });
      setClients((prev) => prev.map((c) => c.id === selectedClient.id ? { ...c, linkedUserId: undefined } : c));
      setSelectedClient((prev) => prev ? { ...prev, linkedUserId: undefined } : prev);
      setLinkSuccess('');
      setLinkError('');
    } catch (err) {
      console.error('Failed to unlink user:', err);
    } finally {
      setSaving(false);
    }
  };

  const filtered = clients.filter(
    (c) =>
      c.companyName.toLowerCase().includes(search.toLowerCase()) ||
      c.contactName.toLowerCase().includes(search.toLowerCase()) ||
      c.contactEmail.toLowerCase().includes(search.toLowerCase())
  );

  const openEdit = (c: Client) => {
    setClientToEdit(c);
    setEditForm({
      companyName: c.companyName,
      contactName: c.contactName,
      contactEmail: c.contactEmail,
      phone: c.phone,
      address: c.address,
    });
    setEditModalOpen(true);
  };

  const handleEditSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientToEdit || !tenantId) return;
    setSaving(true);
    try {
      await updateClient(tenantId, clientToEdit.id, editForm);
      setClients((prev) =>
        prev.map((c) =>
          c.id === clientToEdit.id ? { ...c, ...editForm, updatedAt: new Date() } : c
        )
      );
      setEditModalOpen(false);
      setClientToEdit(null);
    } catch (err) {
      console.error('Failed to update client:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenantId) return;
    setSaving(true);
    try {
      const docRef = await createClient(tenantId, newForm);
      setClients((prev) => [...prev, {
        id: docRef.id, tenantId, ...newForm,
        createdAt: new Date(), updatedAt: new Date(),
      }]);
      setNewForm({ companyName: '', contactName: '', contactEmail: '', phone: '', address: '' });
      setModalOpen(false);
    } catch (err) {
      console.error('Failed to create client:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!clientToDelete || !tenantId) return;
    setSaving(true);
    try {
      await deleteClient(tenantId, clientToDelete.id);
      setClients((prev) => prev.filter((c) => c.id !== clientToDelete.id));
      setDeleteConfirmOpen(false);
      setClientToDelete(null);
    } catch (err) {
      console.error('Failed to delete client:', err);
    } finally {
      setSaving(false);
    }
  };

  const columns = [
    {
      key: 'company',
      header: 'Company',
      render: (c: Client) => (
        <div className="flex items-center gap-3">
          <Avatar name={c.companyName} size="sm" />
          <div>
            <p className="font-medium text-[#111827]">{c.companyName}</p>
            <div className="flex items-center gap-1 text-xs text-[#6B7280]">
              <MapPin className="h-3 w-3" />
              {c.address}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: 'contact',
      header: 'Contact',
      render: (c: Client) => (
        <div>
          <p className="text-sm text-[#111827]">{c.contactName}</p>
          <div className="flex items-center gap-1 text-xs text-[#6B7280]">
            <Mail className="h-3 w-3" />
            {c.contactEmail}
          </div>
        </div>
      ),
    },
    {
      key: 'phone',
      header: 'Phone',
      render: (c: Client) => (
        <div className="flex items-center gap-1 text-sm text-[#6B7280]">
          <Phone className="h-3.5 w-3.5" />
          {c.phone}
        </div>
      ),
    },
    {
      key: 'jobs',
      header: 'Jobs',
      render: (c: Client) => (
        <span className="inline-flex items-center gap-1 rounded-full bg-teal-100 px-2.5 py-0.5 text-xs font-medium text-teal-700">
          <Briefcase className="h-3 w-3" />
          {jobCount[c.id] ?? 0}
        </span>
      ),
    },
    {
      key: 'since',
      header: 'Client Since',
      render: (c: Client) => (
        <span className="text-sm text-[#6B7280]">{formatDate(c.createdAt)}</span>
      ),
    },
    {
      key: 'portal',
      header: 'Portal',
      render: (c: Client) => (
        c.linkedUserId
          ? <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700"><UserCheck className="h-3 w-3" />Linked</span>
          : <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-500"><Link2 className="h-3 w-3" />No login</span>
      ),
    },
    {
      key: 'actions',
      header: '',
      className: 'w-10',
      render: (c: Client) => (
        <ActionDropdown
          actions={[
            {
              label: 'View Details',
              icon: <Eye className="h-4 w-4" />,
              onClick: () => {
                setSelectedClient(c);
                setSlideOpen(true);
              },
            },
            ...(isOwnerOrAdmin
              ? [
                  { label: 'Edit', icon: <Edit className="h-4 w-4" />, onClick: () => openEdit(c) },
                  {
                    label: 'Delete',
                    icon: <Trash2 className="h-4 w-4" />,
                    onClick: () => { setClientToDelete(c); setDeleteConfirmOpen(true); },
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
    <RoleGuard allowedRoles={['owner', 'admin']}>
      <PageHeader
        title="Clients"
        description="Manage your client relationships."
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
            <Button icon={<Plus className="h-4 w-4" />} onClick={() => setModalOpen(true)}>
              Add Client
            </Button>
          </div>
        }
      />

      <div className="mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6B7280]" />
          <input
            type="text"
            placeholder="Search clients..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-[#E5E7EB] bg-white py-2 pl-10 pr-4 text-sm text-[#111827] placeholder:text-[#9CA3AF] focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
          />
        </div>
      </div>

      <DataTable
        columns={columns}
        data={filtered}
        onRowClick={(c) => { setSelectedClient(c); setSlideOpen(true); }}
        emptyMessage={loading ? 'Loading clients…' : 'No clients found. Add your first client to get started.'}
      />

      {loading && (
        <div className="flex items-center justify-center py-20 text-[#9CA3AF]">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      )}

      {/* Client Detail Slide-Over */}
      <SlideOverPanel
        open={slideOpen}
        onClose={() => setSlideOpen(false)}
        title={selectedClient?.companyName || 'Client'}
      >
        {selectedClient && (
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <Avatar name={selectedClient.companyName} size="lg" />
              <div>
                <h3 className="text-lg font-semibold text-[#111827]">{selectedClient.companyName}</h3>
                <p className="text-sm text-[#6B7280]">Client since {formatDate(selectedClient.createdAt)}</p>
              </div>
            </div>

            <div className="space-y-4 text-sm">
              <div className="rounded-lg border border-[#E5E7EB] p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <span className="w-28 text-xs font-medium uppercase tracking-wider text-[#6B7280]">Contact</span>
                  <span className="text-[#111827]">{selectedClient.contactName}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-28 text-xs font-medium uppercase tracking-wider text-[#6B7280]">Email</span>
                  <a href={`mailto:${selectedClient.contactEmail}`} className="text-teal-600 hover:underline">
                    {selectedClient.contactEmail}
                  </a>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-28 text-xs font-medium uppercase tracking-wider text-[#6B7280]">Phone</span>
                  <span className="text-[#111827]">{selectedClient.phone}</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="w-28 text-xs font-medium uppercase tracking-wider text-[#6B7280]">Address</span>
                  <span className="text-[#111827]">{selectedClient.address}</span>
                </div>
              </div>

              <div className="rounded-lg border border-[#E5E7EB] p-4">
                <p className="text-xs font-medium uppercase tracking-wider text-[#6B7280] mb-2">Activity</p>
                <div className="flex items-center justify-between">
                  <span className="text-[#374151]">Active Jobs</span>
                  <span className="font-semibold text-teal-700">{jobCount[selectedClient.id] ?? 0}</span>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-[#374151]">Last Updated</span>
                  <span className="text-[#6B7280]">{formatDate(selectedClient.updatedAt)}</span>
                </div>
              </div>

              {/* Portal Access */}
              {isOwnerOrAdmin && (
                <div className="rounded-lg border border-[#E5E7EB] p-4">
                  <p className="text-xs font-medium uppercase tracking-wider text-[#6B7280] mb-3">Client Portal Access</p>
                  {selectedClient.linkedUserId ? (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 rounded-lg bg-green-50 px-3 py-2.5">
                        <UserCheck className="h-4 w-4 text-green-600" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-green-800">Portal user linked</p>
                          <p className="truncate text-xs text-green-600">uid: {selectedClient.linkedUserId}</p>
                        </div>
                      </div>
                      <Button size="sm" variant="danger" icon={<Unlink className="h-3.5 w-3.5" />} onClick={handleUnlinkUser}>
                        Unlink User
                      </Button>
                    </div>
                  ) : (
                    <form onSubmit={handleLinkUser} className="space-y-2">
                      <p className="text-xs text-[#6B7280]">Link a Field Pilot user account so this client can log in and view their projects.</p>
                      <div className="flex gap-2">
                        <input
                          type="email"
                          placeholder="user@email.com"
                          value={linkEmail}
                          onChange={(e) => { setLinkEmail(e.target.value); setLinkError(''); setLinkSuccess(''); }}
                          className="flex-1 rounded-lg border border-[#E5E7EB] px-3 py-1.5 text-sm text-[#111827] placeholder:text-[#9CA3AF] focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                        />
                        <Button size="sm" type="submit" icon={<Link2 className="h-3.5 w-3.5" />}>Link</Button>
                      </div>
                      {linkError   && <p className="text-xs text-red-600">{linkError}</p>}
                      {linkSuccess && <p className="text-xs text-teal-600">{linkSuccess}</p>}
                    </form>
                  )}
                </div>
              )}
            </div>

            {isOwnerOrAdmin && (
              <div className="flex gap-2 border-t border-[#E5E7EB] pt-4">
                <Button
                  size="sm"
                  variant="secondary"
                  icon={<Edit className="h-4 w-4" />}
                  onClick={() => { setSlideOpen(false); openEdit(selectedClient); }}
                >
                  Edit Client
                </Button>
                <Button
                  size="sm"
                  variant="danger"
                  icon={<Trash2 className="h-4 w-4" />}
                  onClick={() => { setSlideOpen(false); setClientToDelete(selectedClient); setDeleteConfirmOpen(true); }}
                >
                  Delete
                </Button>
              </div>
            )}
          </div>
        )}
      </SlideOverPanel>

      {/* Add Client Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Add New Client" maxWidth="max-w-lg">
        <form className="space-y-4" onSubmit={handleAdd}>
          <Input label="Company Name" id="companyName" placeholder="e.g., Acme Corporation" required
            value={newForm.companyName} onChange={(e) => setNewForm((f) => ({ ...f, companyName: e.target.value }))} />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Contact Name" id="contactName" placeholder="Jane Smith" required
              value={newForm.contactName} onChange={(e) => setNewForm((f) => ({ ...f, contactName: e.target.value }))} />
            <Input label="Contact Email" id="contactEmail" type="email" placeholder="jane@acme.com" required
              value={newForm.contactEmail} onChange={(e) => setNewForm((f) => ({ ...f, contactEmail: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Phone" id="phone" placeholder="(555) 123-4567"
              value={newForm.phone} onChange={(e) => setNewForm((f) => ({ ...f, phone: e.target.value }))} />
            <Input label="Address" id="address" placeholder="123 Main St, City, ST"
              value={newForm.address} onChange={(e) => setNewForm((f) => ({ ...f, address: e.target.value }))} />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="secondary" type="button" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button type="submit">Add Client</Button>
          </div>
        </form>
      </Modal>

      {/* Edit Client Modal */}
      <Modal open={editModalOpen} onClose={() => setEditModalOpen(false)} title="Edit Client" maxWidth="max-w-lg">
        <form className="space-y-4" onSubmit={handleEditSave}>
          <Input label="Company Name" id="editCompanyName" required
            value={editForm.companyName} onChange={(e) => setEditForm((f) => ({ ...f, companyName: e.target.value }))} />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Contact Name" id="editContactName" required
              value={editForm.contactName} onChange={(e) => setEditForm((f) => ({ ...f, contactName: e.target.value }))} />
            <Input label="Contact Email" id="editContactEmail" type="email" required
              value={editForm.contactEmail} onChange={(e) => setEditForm((f) => ({ ...f, contactEmail: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Phone" id="editPhone"
              value={editForm.phone} onChange={(e) => setEditForm((f) => ({ ...f, phone: e.target.value }))} />
            <Input label="Address" id="editAddress"
              value={editForm.address} onChange={(e) => setEditForm((f) => ({ ...f, address: e.target.value }))} />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="secondary" type="button" onClick={() => setEditModalOpen(false)}>Cancel</Button>
            <Button type="submit" icon={<Edit className="h-4 w-4" />}>Save Changes</Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal open={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)} title="Delete Client" maxWidth="max-w-sm">
        <div className="space-y-4">
          <p className="text-sm text-[#374151]">
            Are you sure you want to delete <strong>{clientToDelete?.companyName}</strong>? All associated data will be
            unlinked. This action cannot be undone.
          </p>
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setDeleteConfirmOpen(false)}>Cancel</Button>
            <Button variant="danger" onClick={handleDelete} icon={<Trash2 className="h-4 w-4" />}>
              Delete Client
            </Button>
          </div>
        </div>
      </Modal>
    </RoleGuard>
  );
}
