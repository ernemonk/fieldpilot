# Client — Role Overview

Purpose: External stakeholders (customers) who receive proposals, review progress, and approve work.

- **Primary Goals:**
  - Review and approve proposals.
  - Track project progress without seeing internal operator data.
  - Download reports and view key deliverables.

- **Dashboard (What they see):**
  - Their active projects and job statuses.
  - Outstanding proposals awaiting review.
  - Recent milestones and progress photos.
  - Downloadable proposal PDFs and final reports.

- **Navigation:**
  - Dashboard, Proposals, Jobs (their projects), Reports

- **Capabilities / Actions:**
  - View proposal details and accept/reject proposals.
  - View job status updates and progress photos.
  - View and download proposal PDFs and historical proposal versions.
  - Download incident reports, job reports, and summary exports (PDF / CSV) for their projects.
  - View progress photos and AI-annotated images attached to incident reports.
  - Comment on proposals or request clarification (messages go to tenant admins).

- **AI Access:**
  - Clients do not directly run AI generators; they receive AI-generated proposals and structured incident reports.
  - Clients can view AI-generated summaries and annotated photos in incident reports.
  - Clients do not run AI generators; they receive AI-generated proposals and structured incident reports from tenant admins.
  - Clients can preview and download AI-generated proposal PDFs and view AI-annotated photos within incident reports.

- **Notifications / Alerts:**
  - Proposal sent, proposal reminder, job milestone completed.

- **Security / Visibility:**
  - Read-only access to their client-scoped data only.
  - No access to tenant-wide analytics or other clients' data.

- **UI Patterns & Expectations:**
  - Clean, simple list of proposals with clear accept/reject CTA.
  - Proposal PDFs render cleanly on mobile and desktop.
  - Minimal config — primarily read and respond workflows.

---

## Firestore Integration

> All queries are scoped to `tenants/{tenantId}/` and additionally filtered to the client's own `clientId` or `linkedUserId` — a client can never read another client's data.
>
> Source: [`src/lib/firestore.ts`](../../src/lib/firestore.ts)

### How a Client is Identified

Every client user has:
- A `User` document at `tenants/{tenantId}/users/{uid}` with `role: 'client'`.
- A matching `Client` document at `tenants/{tenantId}/clients/{clientId}` with `linkedUserId = uid`.

The app resolves `clientId` by querying for the `Client` doc where `linkedUserId == currentUser.uid`.

### Collection Paths Used

| Collection | Firestore Path | Scope |
|---|---|---|
| Jobs | `tenants/{tenantId}/jobs/` | Filtered: `clientId == myClientId` |
| Proposals | `tenants/{tenantId}/proposals/` | Filtered: `clientId == myClientId` (via jobId) |
| Incident Reports | `tenants/{tenantId}/incidentReports/` | Filtered: `jobId in myJobIds` |

### Firestore Functions by Capability

#### Jobs (read-only)

| Action | Function | Filter Applied |
|---|---|---|
| My project list | `getJobsByClient(tenantId, clientId)` | `where('clientId', '==', clientId)` |
| Job detail (slide-over) | `getJob(tenantId, jobId)` | Guard: verify `job.clientId == myClientId` |

#### Proposals (read + approve/reject)

| Action | Function | Notes |
|---|---|---|
| List my proposals | `getProposals(tenantId)` | Filter client-side by `jobId in myJobIds` |
| Approve proposal | `updateProposal(tenantId, proposalId, { status: 'approved' })` | |
| Reject proposal | `updateProposal(tenantId, proposalId, { status: 'rejected' })` | |
| Mark viewed on open | `updateProposal(tenantId, proposalId, { status: 'viewed' })` | Triggered automatically when client opens a `sent` proposal |

#### Incident Reports (read-only)

| Action | Function | Notes |
|---|---|---|
| View per job | `getIncidentReports(tenantId, jobId)` | Client sees only incidents for their own jobs |

### Firestore Security Rule Reference

```
// Client can only read jobs where clientId matches their linked client record
match /tenants/{tenantId}/jobs/{jobId} {
  allow read: if request.auth.token.tenantId == tenantId
    && request.auth.token.role == 'client'
    && resource.data.clientId == request.auth.token.clientId;
}

// Client can update only proposal status (approve/reject)
match /tenants/{tenantId}/proposals/{proposalId} {
  allow read: if request.auth.token.tenantId == tenantId
    && request.auth.token.role == 'client';
  allow update: if request.auth.token.tenantId == tenantId
    && request.auth.token.role == 'client'
    && request.resource.data.diff(resource.data).affectedKeys().hasOnly(['status']);
}
```
