# Field Pilot — Product Vision

> AI-Powered, Multi-Tenant Field Engineering SaaS Platform

---

## 1. What Is Field Pilot?

Field Pilot is a **multi-tenant SaaS application** purpose-built for field engineering and contracting companies. It combines **client management**, **AI-powered proposal generation**, **job lifecycle tracking**, **operator work-session logging**, and **incident reporting** into a single platform — accessible by every stakeholder through role-based portals.

Each tenant (company) gets their own branded workspace with isolated data, custom theming, and role-scoped access.

---

## 2. Core Problem

Field engineering companies juggle disconnected tools for proposals, scheduling, time tracking, and client communication. There is no unified, AI-enhanced platform that covers the full lifecycle from **lead → proposal → active job → completion → invoice**.

Field Pilot fills that gap.

---

## 3. Target Market

- Electrical subcontractors
- Mechanical contractors
- General field engineering firms
- Construction service companies
- Any company that sends operators to job sites and needs to manage proposals, jobs, and time tracking

This is a **vertical SaaS** opportunity with significant market depth.

---

## 4. Tech Stack

| Layer         | Technology                      |
| ------------- | ------------------------------- |
| Frontend      | Next.js (App Router), TypeScript |
| Auth          | Firebase Authentication         |
| Database      | Firestore (multi-tenant)        |
| Storage       | Firebase Cloud Storage          |
| AI            | Google Gemini, Cloud Vision AI |
| Styling       | Tailwind CSS                    |
| Icons         | Lucide                          |
| Payments      | Stripe (future phases)          |

---

## 5. Multi-Tenant Architecture

Every tenant is fully isolated at the Firestore level:

```
tenants/
  {tenantId}/
    metadata
    branding
    users/
    clients/
    jobs/
    proposals/
    workSessions/
    incidentReports/
```

- Every user document contains a `tenantId`.
- **Firestore security rules** enforce tenant isolation — not just frontend filtering.
- Cross-tenant data access is architecturally impossible when rules are correctly applied.

```
request.auth.token.tenantId == resource.data.tenantId
```

---

## 6. Roles & Permissions (RBAC)

Four core roles with scoped access:

### Owner

- Full system control
- Manage all users
- View financial metrics
- Approve proposals
- See all jobs, override statuses
- Export reports, analytics dashboard

### Admin

- Create / edit jobs
- Assign operators
- Manage clients
- Generate proposals
- View reports
- Cannot delete owner

### Operator (Field Engineer)

- View assigned jobs only
- Log start time / end time per session
- Upload photos / videos
- Write daily notes
- File incident reports
- Mark task milestones complete

### Client

- View their projects only
- View proposal PDFs
- Approve / reject proposals
- Track job status
- See progress updates
- Download reports

---

## 7. Core Data Entities

### User

| Field       | Type   |
| ----------- | ------ |
| uid         | string |
| tenantId    | string |
| role        | enum   |
| displayName | string |
| email       | string |
| status      | string |

### Client

| Field          | Type   |
| -------------- | ------ |
| id             | string |
| companyName    | string |
| contactName    | string |
| contactEmail   | string |
| phone          | string |
| address        | string |
| linkedUserId   | string |

### Job

| Field               | Type     |
| ------------------- | -------- |
| id                  | string   |
| title               | string   |
| description         | string   |
| clientId            | string   |
| assignedOperators   | string[] |
| status              | enum     |
| priority            | enum     |
| estimatedStart      | date     |
| estimatedEnd        | date     |
| actualCompletion    | date     |
| proposalGenerated   | boolean  |
| createdBy           | string   |
| lastUpdated         | date     |

### Proposal

| Field             | Type   |
| ----------------- | ------ |
| id                | string |
| jobId             | string |
| specsJson         | object |
| images            | string[] |
| aiGeneratedText   | string |
| priceEstimate     | number |
| version           | number |
| status            | enum   |
| pdfUrl            | string |

### Work Session

| Field      | Type     |
| ---------- | -------- |
| id         | string   |
| jobId      | string   |
| operatorId | string   |
| date       | date     |
| startTime  | timestamp |
| endTime    | timestamp |
| notes      | string   |
| media      | string[] |

### Incident Report

| Field             | Type     |
| ----------------- | -------- |
| id                | string   |
| jobId             | string   |
| operatorId        | string   |
| severity          | enum     |
| description       | string   |
| photos            | string[] |
| resolutionStatus  | enum     |

---

## 8. Job Status Lifecycle

```
Lead
  → Proposal Draft
    → Proposal Sent
      → Client Review
        → Approved
          → Scheduled
            → In Progress
              → On Hold (optional)
              → Completed
                → Invoiced
                  → Closed

Any stage → Cancelled
```

---

## 9. Tenant Branding System

Each tenant defines:

| Property       | Purpose              |
| -------------- | -------------------- |
| logo           | Company logo         |
| primaryColor   | Buttons, highlights  |
| secondaryColor | Accents              |
| businessName   | Display name         |

Brand colors inject dynamically via React context. The neutral base palette remains constant to ensure UI consistency across tenants.

---

## 10. UI / UX Design System

### Layout Architecture

```
┌──────────────────────────────────────────────────┐
│  Logo  │  Tenant Name          │  Profile │ Alerts│
├────────┼─────────────────────────────────────────┤
│        │                                          │
│ Side-  │              Workspace                   │
│  bar   │                                          │
│        │                                          │
│        │                                          │
└────────┴─────────────────────────────────────────┘
```

- **Sidebar**: Vertical, collapsible, role-filtered navigation
- **Topbar**: Tenant branding, user profile, notifications
- **Workspace**: Dynamic content area

### Design Philosophy

- Modern, confident, industrial-but-clean
- Inspired by: Linear, Stripe Dashboard, Notion, Vercel
- No clutter, no heavy gradients, no chaos

### Color System

| Token            | Value     | Usage            |
| ---------------- | --------- | ---------------- |
| Background       | `#F8FAFC` | Page background  |
| Card             | `#FFFFFF` | Content cards    |
| Border           | `#E5E7EB` | Separators       |
| Text Primary     | `#111827` | Headings, body   |
| Text Secondary   | `#6B7280` | Labels, meta     |
| Tenant Primary   | dynamic   | Buttons, active  |
| Tenant Accent    | dynamic   | Highlights       |

### Status Badge Colors

| Status      | Color   |
| ----------- | ------- |
| Lead        | Gray    |
| Proposal    | Blue    |
| In Progress | Indigo  |
| Approved    | Green   |
| On Hold     | Amber   |
| Cancelled   | Red     |

### Typography

- **Font**: Inter (system fallback)
- H1: 28px semibold
- H2: 22px semibold
- H3: 18px medium
- Body: 14–15px
- Labels: 12–13px

### Spacing

8pt grid system: `8px → 16px → 24px → 32px`

All padding and margins align to this grid for visual calm.

### Click Minimization Rules

- Primary action: **1 click**
- Secondary action: **2 clicks**
- Never more than **3 clicks** to reach any meaningful action

Examples:
- Create job → Dashboard → "New Job"
- Log session → Dashboard → Click Job → "Start Session"
- Approve proposal → Client Portal → Proposal → "Approve"

### Slide-Over Detail Panel

Clicking a job row opens a **right-side drawer** (not a new page) with tabs:

- Overview
- Sessions
- Incidents
- Proposal
- Notes

This preserves context and eliminates unnecessary page loads.

### Reusable Component Library

- `Card`
- `PageHeader`
- `DataTable`
- `SlideOverPanel`
- `StatusBadge`
- `AvatarStack`
- `StatCard`
- `ActionDropdown`
- `Modal`
- `RoleGuard`

### Icons

Lucide — consistent stroke weight, line-icon style. Never mix icon libraries.

---

## 11. Key Workflows

### Operator Daily Flow

1. Open dashboard → see assigned jobs
2. Tap job → large "Start Session" button
3. Work → add notes, upload photos
4. Tap "End Session"
5. System logs hours, calculates labor cost, tracks burn rate

Design is **mobile-first** for operators: large buttons, minimal navigation, zero nesting.

### Proposal → Job Conversion

1. Admin creates proposal (scope, specs, images)
2. AI generates: executive summary, technical scope, risk analysis, materials estimate, safety precautions, implementation phases, draft pricing, deliverables
3. Proposal sent to client
4. Client approves → system auto-converts to active job with default task list, time tracking enabled, operator assignment opened

### Owner Analytics Dashboard

- Revenue pipeline
- Jobs per status stage
- Estimated vs. actual labor hours
- Incident frequency
- Operator performance
- Proposal conversion rate

---

## 12. Phased Build Plan

### Phase 0 — SaaS Foundation

- Multi-tenant Firestore data model
- Firebase Auth integration
- Middleware for protected routes
- Role-based access control (RBAC)
- Tenant branding system (dynamic theming)
- Scalable project folder structure

### Phase 1 — Core MVP

- Client CRUD (tenant-scoped)
- Job CRUD with full status lifecycle
- Operator dashboard (assigned jobs)
- Work session tracking (start/end, notes, media)
- Client portal (login, view jobs, see status)
- TypeScript types and interfaces

### Phase 2 — Proposal System

- Proposal builder (scope, specs, images)
- Proposal workflow (draft → sent → viewed → approved → rejected)
- Proposal-to-job auto-conversion on approval

### Phase 3 — Billing & Invoicing

- Invoice data model
- Link invoices to jobs
- Manual line items
- Auto-import hours from work sessions
- Stripe integration
- Invoice status tracking

### Phase 4 — AI Engine (Two Flagship Features)

#### 4A — AI Incident Reporting

Operators can file incident reports using **any combination** of:

- **Voice recording** — speak into the mic, transcript auto-generated
- **Free text** — type a description
- **Photos / videos** — uploaded from camera or gallery

All inputs are sent to **Google Gemini + Cloud Vision API** which:

1. Analyzes images for hazard identification, damage assessment, equipment state
2. Transcribes and structures the voice/text description
3. Auto-classifies incident severity (low / medium / high / critical)
4. Generates a structured **Incident Report** document containing:
   - Incident summary
   - Location & timestamp
   - Hazard / damage classification
   - Root cause analysis (preliminary)
   - Immediate actions taken
   - Recommended follow-up
   - Photo evidence with AI annotations
5. Report saved to Firestore as structured data
6. Report rendered in a **Markdown viewer** within the app
7. Exportable as PDF

The entire flow is designed for **field conditions**: large buttons, voice-first input, minimal typing.

#### 4B — AI Engineering Proposal Generator

Admins / Owners can generate professional engineering proposals using:

- **Voice input** — describe the project scope verbally
- **Text input** — type specs, requirements, notes
- **Photos** — upload site photos, equipment, existing installations
- **Specification documents** — attach reference docs

AI (Gemini) processes all inputs and generates a comprehensive proposal:

1. **Executive Summary** — project overview for the client
2. **Technical Scope of Work** — detailed engineering breakdown
3. **Risk Analysis** — safety, regulatory, environmental considerations
4. **Materials & Equipment Estimate** — itemized list with quantities
5. **Labor Estimate** — hours, crew composition, timeline
6. **Implementation Phases** — milestone-based project plan
7. **Safety Precautions** — OSHA compliance, PPE, hazard mitigation
8. **Pricing Breakdown** — materials + labor + overhead + margin
9. **Terms & Deliverables** — what the client gets, acceptance criteria

The proposal is:
- Rendered in a **rich Markdown viewer** within the app
- Fully editable before finalizing
- Versioned (v1, v2, v3...) with diff tracking
- Saved to Firestore under the associated job
- Convertible to PDF for client delivery
- When approved by client → auto-converts to active Job

Both AI features store everything in Firestore and are fully multi-tenant scoped.

### Phase 5 — Equipment Tracking

- Equipment registry
- Assignment to jobs
- Maintenance scheduling
- Utilization tracking

---

## 13. Landing Page

Separate from the app. More dramatic visual tone (dark + gradient accents).

Structure:
1. **Hero** — bold statement, subheading, CTA ("Start Free Trial"), secondary CTA ("Book Demo")
2. **Features** — icons + short descriptions
3. **How It Works** — 3-step visual
4. **Screenshots** — app preview
5. **Testimonials**
6. **Pricing**
7. **FAQ**

---

## 14. Security Principles

- Firestore rules enforce tenant isolation at the database level
- No cross-tenant queries are possible
- All writes are scoped to `tenantId`
- No hardcoded role bypasses
- Client role restricts visibility to only their own data
- Required Firestore indexes are explicitly defined
- Architecture scales to 1,000+ tenants

---

## 15. App Directory Structure

```
/app
  /dashboard
  /jobs
  /clients
  /proposals
  /settings
/components
/lib
/firebase
/context
```

---

## 16. Future Considerations

- Mobile-native apps (React Native or Flutter) for operators
- Compliance regulation modules per industry
- White-label reseller program
- API access for tenant integrations
- Automated reporting and PDF export
- Real-time notifications (Firebase Cloud Messaging)

---

*Field Pilot — From lead to invoice, one platform.*
