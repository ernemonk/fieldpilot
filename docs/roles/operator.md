# Operator — Role Overview

Purpose: Field technicians who execute assigned work, log sessions, upload media, and file incident reports.

- **Primary Goals:**
  - Find assigned jobs quickly and start/stop work sessions.
  - Capture photos, notes, and incidents on-site with minimal typing.
  - Keep accurate time logs linked to jobs.

- **Dashboard (What they see):**
  - Assigned jobs only (sorted by schedule/priority).
  - Large tappable job cards with prominent "Start Session" or "Log Hours" buttons.
  - Active session quick-access (if working, show timer + "End Session").
  - Quick access to "File Incident" (AI Incident Report) and camera/photo upload.

- **Navigation:**
  - Dashboard, Jobs (assigned), Sessions, Incidents, AI Incident Report

- **Capabilities / Actions:**
  - Start / end work sessions (automatic time capture).
  - Attach photos/videos and type short notes per session.
  - File incident reports using voice/text/photos; AI generates structured report drafts.
  - Mark task milestones complete.
  - View job details and safety notes.

- **AI Access:**
  - Use AI Incident Reporting (voice-first, photo uploads) to generate incident documents.
  - AI suggestions are editable before saving; operator can add context or override severity.

- **Notifications / Alerts:**
  - Job assignment changes, high-priority incident alerts, supervisor comments.

- **Security / Visibility:**
  - Can only view jobs where they are assigned (or public job details if tenant allows).
  - Cannot view other operators' time logs unless explicitly assigned.

- **UI Patterns & Expectations:**
  - Mobile-first, large touch targets, minimal nested menus.
  - Offline-friendliness for media capture (photos cached until network available).
  - Minimal typing: voice and photo-first inputs prioritized.

---

## Firestore Integration

> All queries are scoped to `tenants/{tenantId}/` and additionally filtered to the operator's own `uid` — operators cannot read other operators' sessions or jobs they are not assigned to.
>
> Source: [`src/lib/firestore.ts`](../../src/lib/firestore.ts)

### Collection Paths Used

| Collection | Firestore Path | Scope |
|---|---|---|
| Jobs | `tenants/{tenantId}/jobs/` | Filtered: `assignedOperators array-contains uid` |
| Work Sessions | `tenants/{tenantId}/workSessions/` | Filtered: `operatorId == uid` |
| Incident Reports | `tenants/{tenantId}/incidentReports/` | Filtered: `operatorId == uid` (own) or `jobId in myJobIds` |

### Firestore Functions by Capability

#### Jobs (read-only for assigned jobs)

| Action | Function | Filter Applied |
|---|---|---|
| My assigned jobs | `getJobsByOperator(tenantId, operatorId)` | `where('assignedOperators', 'array-contains', uid)` |
| Job detail | `getJob(tenantId, jobId)` | Guard: verify `job.assignedOperators.includes(uid)` |

#### Work Sessions (read + write own)

| Action | Function | Notes |
|---|---|---|
| List my sessions | `getWorkSessions(tenantId, undefined, operatorId)` | Filtered by `operatorId` |
| Sessions for a job | `getWorkSessions(tenantId, jobId)` | Shows all sessions on that job |
| Start session | `createWorkSession(tenantId, { jobId, operatorId, startTime, ... })` | `tenantId` and `createdAt` auto-set |
| End session / add notes | `updateWorkSession(tenantId, sessionId, { endTime, notes, media })` | Partial update |

#### Incident Reports (read + create own)

| Action | Function | Notes |
|---|---|---|
| List my incidents | `getIncidentReports(tenantId)` | Filter client-side by `operatorId == uid` |
| Incidents for a job | `getIncidentReports(tenantId, jobId)` | Visible if operator is on that job |
| File new incident | `createIncidentReport(tenantId, data)` | `tenantId`, `createdAt`, `updatedAt` auto-set |
| Update (add AI report) | `updateIncidentReport(tenantId, reportId, { aiGeneratedReport, severity })` | After AI processing |

### Firestore Security Rule Reference

```
// Operator reads only jobs they are assigned to
match /tenants/{tenantId}/jobs/{jobId} {
  allow read: if request.auth.token.tenantId == tenantId
    && request.auth.token.role == 'operator'
    && request.auth.uid in resource.data.assignedOperators;
}

// Operator reads/writes only their own work sessions
match /tenants/{tenantId}/workSessions/{sessionId} {
  allow read, write: if request.auth.token.tenantId == tenantId
    && resource.data.operatorId == request.auth.uid;
  allow create: if request.auth.token.tenantId == tenantId
    && request.resource.data.operatorId == request.auth.uid;
}

// Operator creates/reads own incident reports
match /tenants/{tenantId}/incidentReports/{reportId} {
  allow read, write: if request.auth.token.tenantId == tenantId
    && resource.data.operatorId == request.auth.uid;
  allow create: if request.auth.token.tenantId == tenantId
    && request.resource.data.operatorId == request.auth.uid;
}
```
