# Owner — Role Overview

Purpose: Full-tenant administrator. Responsible for company-wide configuration, high-level reporting, and final approvals.

- **Primary Goals:**
  - Monitor revenue, pipeline, and high-level operational health.
  - Manage users, roles, and tenant branding.
  - Approve proposals and export financial reports.

- **Dashboard (What they see):**
  - Revenue pipeline and forecast (interactive charts).
  - Jobs by status (Lead → In Progress → Completed → Invoiced).
  - Proposal conversion rate and recent proposals.
  - Operator performance summary (hours, job counts, incidents).
  - Incident frequency and severity trend.
  - Quick actions: Create job, Create proposal, Invite user, Run export.

- **Navigation:**
  - Dashboard, Jobs, Clients, Proposals, Work Sessions, Incidents, Settings, AI Proposal, AI Incident Report

- **Capabilities / Actions:**
  - Full CRUD on all tenant data (except irreversible owner deletion).
  - Invite / remove users and assign roles.
  - Edit tenant branding (logo, primary/secondary colors, business name).
  - Approve/reject proposals; convert approved proposals to Jobs.
  - Export reports (CSV / PDF) for jobs, timesheets, and incidents.
  - Access to AI Proposal Generator and AI Incident Reporting with tenant-level controls.

- **AI Access:**
  - Can run AI Proposal Generator (voice/text/photos) and edit results.
  - Can review AI incident reports and add approvals/notes before finalizing.
  - Versioning and PDF export for both AI-generated proposals and incident reports.

- **Notifications / Alerts:**
  - High-severity incidents (critical/high) — immediate alerts.
  - Proposal approvals pending client response.
  - Billing/export reminders (future feature).

- **Security / Visibility:**
  - Can view every job, proposal, client, operator, and incident in the tenant.
  - Access to audit logs and export controls (Phase 3+).

- **UI Patterns & Expectations:**
  - Owner dashboard emphasizes analytics cards and drill-down slides (right-side SlideOverPanel).
  - Minimal nested workflows — owner actions are 1–2 clicks for high-impact tasks.

- **Mobile Behavior:**
  - Full features available, but complex analytics favor desktop. Quick approvals and alerts are mobile-friendly.

---

## Firestore Integration

> Owner has unrestricted read/write access to all collections within their tenant. All writes are still scoped to `tenants/{tenantId}/` — cross-tenant access is impossible by Firestore rules.
>
> Source: [`src/lib/firestore.ts`](../../src/lib/firestore.ts)

### Collection Paths Used

| Collection | Firestore Path |
|---|---|
| Tenant Metadata | `tenants/{tenantId}` |
| Tenant Branding | `tenants/{tenantId}/config/branding` |
| Users | `tenants/{tenantId}/users/` |
| Clients | `tenants/{tenantId}/clients/` |
| Jobs | `tenants/{tenantId}/jobs/` |
| Proposals | `tenants/{tenantId}/proposals/` |
| Work Sessions | `tenants/{tenantId}/workSessions/` |
| Incident Reports | `tenants/{tenantId}/incidentReports/` |

### Firestore Functions by Capability

#### Tenant & Branding

| Action | Function | Notes |
|---|---|---|
| Get tenant metadata | `getTenantMetadata(tenantId)` | Reads root tenant doc |
| Get branding | `getTenantBranding(tenantId)` | Reads `config/branding` subcollection |
| Update branding | `setTenantBranding(tenantId, branding)` | Full overwrite of branding config |
| Create tenant | `createTenant(tenantId, metadata)` | Used during onboarding |

#### Users

| Action | Function | Notes |
|---|---|---|
| List all users | `getUsers(tenantId)` | All roles visible to owner |
| Get user | _(via `getUsers` + filter)_ | No single-user lookup needed in UI |
| Update user (role, status) | `updateUser(tenantId, uid, data)` | Pass `{ role, status }` |
| Create user | `createUser(tenantId, user)` | Called after Firebase Auth `createUser` |

#### Jobs

| Action | Function | Notes |
|---|---|---|
| List all jobs | `getJobs(tenantId)` | No filter — full tenant scope |
| Create job | `createJob(tenantId, data)` | |
| Update / advance status | `updateJob(tenantId, jobId, data)` | |
| Delete job | `deleteJob(tenantId, jobId)` | |
| Jobs by operator | `getJobsByOperator(tenantId, operatorId)` | Used in operator performance view |
| Jobs by client | `getJobsByClient(tenantId, clientId)` | Used in client drill-down |

#### Clients

| Action | Function | Notes |
|---|---|---|
| List clients | `getClients(tenantId)` | |
| Create client | `createClient(tenantId, data)` | |
| Edit client | `updateClient(tenantId, clientId, data)` | |
| Delete client | `deleteClient(tenantId, clientId)` | |
| Link portal user | `updateClient(tenantId, clientId, { linkedUserId })` | |

#### Proposals

| Action | Function | Notes |
|---|---|---|
| List proposals | `getProposals(tenantId)` | |
| Create proposal | `createProposal(tenantId, data)` | |
| Approve / reject | `updateProposal(tenantId, proposalId, { status })` | |
| Convert to job | `createJob(...)` then `updateProposal(...)` | Performed together on approval |

#### Work Sessions

| Action | Function | Notes |
|---|---|---|
| All sessions | `getWorkSessions(tenantId)` | No filter |
| Per job | `getWorkSessions(tenantId, jobId)` | |
| Per operator | `getWorkSessions(tenantId, undefined, operatorId)` | |

#### Incident Reports

| Action | Function | Notes |
|---|---|---|
| All incidents | `getIncidentReports(tenantId)` | |
| Per job | `getIncidentReports(tenantId, jobId)` | |
| Update resolution | `updateIncidentReport(tenantId, reportId, { resolutionStatus })` | |

### Firestore Security Rule Reference

```
// Owner has full read/write on all tenant data
match /tenants/{tenantId}/{document=**} {
  allow read, write: if request.auth.token.tenantId == tenantId
    && request.auth.token.role == 'owner';
}
```
