# Admin — Role Overview

Purpose: Day-to-day operations manager. Handles job creation, operator assignment, client management, and proposal creation workflows.

- **Primary Goals:**
  - Create and manage jobs and proposals.
  - Assign operators and coordinate schedules.
  - Manage client records and communications.

- **Dashboard (What they see):**
  - Jobs needing attention (pending assignment, overdue milestones).
  - Pending proposals and proposal drafts.
  - Quick stats: Active jobs, pending assignments, hours today, open proposals.
  - Recent activity feed (job updates, session logs, incident filings).

- **Navigation:**
  - Dashboard, Jobs, Clients, Proposals, Work Sessions, Incidents, AI Proposal

- **Capabilities / Actions:**
  - Create / edit jobs with full status lifecycle.
  - Assign / reassign operators to jobs.
  - Create and send proposals to clients; trigger AI Proposal Generator to draft proposals.
  - Manage client contact info and link client users to client records.
  - View reports and export job-level data.

- **AI Access:**
  - Use AI Proposal Generator to draft proposals from voice/text/photos.
  - Edit AI output, attach images or specs, save versions and send to clients.

- **Notifications / Alerts:**
  - Unassigned jobs, proposal approvals/rejections, new incident reports.

- **Security / Visibility:**
  - Can view and modify all tenant data except owner-only settings (e.g., owner deletion).
  - Restricted from certain billing or owner-level controls.

- **UI Patterns & Expectations:**
  - Jobs list with row actions (Open SlideOver → Assign, Add Note, View Sessions).
  - Quick creation flows — "New Job" and "New Proposal" are 1-click from the header.
  - AI-assisted drafting included inline in the proposal builder.

- **Mobile Behavior:**
  - Full job workflows available; creation flows optimized for tablet/desktop but usable on mobile.

---

## Firestore Integration

> All queries are scoped to `tenants/{tenantId}/` — cross-tenant access is impossible by Firestore rules.
>
> Source: [`src/lib/firestore.ts`](../../src/lib/firestore.ts)

### Collection Paths Used

| Collection | Firestore Path |
|---|---|
| Users | `tenants/{tenantId}/users/` |
| Clients | `tenants/{tenantId}/clients/` |
| Jobs | `tenants/{tenantId}/jobs/` |
| Proposals | `tenants/{tenantId}/proposals/` |
| Work Sessions | `tenants/{tenantId}/workSessions/` |
| Incident Reports | `tenants/{tenantId}/incidentReports/` |

### Firestore Functions by Capability

#### Jobs

| Action | Function | Notes |
|---|---|---|
| List all jobs | `getJobs(tenantId)` | Returns all jobs for the tenant |
| Get single job | `getJob(tenantId, jobId)` | Used in slide-over detail view |
| Create job | `createJob(tenantId, data)` | Sets `createdAt`, `lastUpdated`, `tenantId` automatically |
| Edit job / advance status | `updateJob(tenantId, jobId, data)` | Pass any `Partial<Job>` — `lastUpdated` auto-set |
| Delete job | `deleteJob(tenantId, jobId)` | Hard delete |
| Jobs by operator | `getJobsByOperator(tenantId, operatorId)` | Filters by `assignedOperators` array-contains |

#### Clients

| Action | Function | Notes |
|---|---|---|
| List clients | `getClients(tenantId)` | Ordered by `companyName` |
| Get client | `getClient(tenantId, clientId)` | |
| Create client | `createClient(tenantId, data)` | |
| Edit client | `updateClient(tenantId, clientId, data)` | `updatedAt` auto-set |
| Delete client | `deleteClient(tenantId, clientId)` | |
| Link portal user | `updateClient(tenantId, clientId, { linkedUserId })` | Sets `linkedUserId` on client doc |

#### Proposals

| Action | Function | Notes |
|---|---|---|
| List proposals | `getProposals(tenantId)` | Optional `jobId` filter |
| Create proposal | `createProposal(tenantId, data)` | |
| Update / send / approve | `updateProposal(tenantId, proposalId, data)` | Pass `{ status: 'sent' }` etc. |

#### Work Sessions

| Action | Function | Notes |
|---|---|---|
| View sessions per job | `getWorkSessions(tenantId, jobId)` | Filter by `jobId` |
| All sessions (overview) | `getWorkSessions(tenantId)` | No filter — all tenant sessions |

#### Incident Reports

| Action | Function | Notes |
|---|---|---|
| List incidents | `getIncidentReports(tenantId)` | Optional `jobId` filter |
| View per job | `getIncidentReports(tenantId, jobId)` | |

#### Users

| Action | Function | Notes |
|---|---|---|
| List all users | `getUsers(tenantId)` | Used to populate operator selector |
| Update user | `updateUser(tenantId, uid, data)` | Admin cannot delete owner |

### Firestore Security Rule Reference

```
// Admin can read/write all tenant data
match /tenants/{tenantId}/{document=**} {
  allow read, write: if request.auth.token.tenantId == tenantId
    && request.auth.token.role in ['owner', 'admin'];
}
```
