// Field Pilot — Core TypeScript Types & Interfaces

// ============================================
// Enums
// ============================================

export type UserRole = 'owner' | 'admin' | 'operator' | 'client';

export type UserStatus = 'active' | 'inactive' | 'suspended';

export type JobStatus =
  | 'lead'
  | 'proposal_draft'
  | 'proposal_sent'
  | 'client_review'
  | 'approved'
  | 'scheduled'
  | 'in_progress'
  | 'on_hold'
  | 'completed'
  | 'invoiced'
  | 'closed'
  | 'cancelled';

export type JobPriority = 'low' | 'medium' | 'high' | 'urgent';

export type ProposalStatus = 'draft' | 'sent' | 'viewed' | 'approved' | 'rejected';

export type IncidentSeverity = 'low' | 'medium' | 'high' | 'critical';

export type IncidentResolution = 'open' | 'investigating' | 'resolved' | 'closed';

// ============================================
// Data Entities
// ============================================

export interface TenantMetadata {
  id: string;
  businessName: string;
  createdAt: Date;
  plan: 'free' | 'pro' | 'enterprise';
  ownerId: string;
}

export interface TenantBranding {
  logo?: string;
  primaryColor: string;
  secondaryColor: string;
  businessName: string;
}

export interface User {
  uid: string;
  tenantId: string;
  role: UserRole;
  displayName: string;
  email: string;
  status: UserStatus;
  photoURL?: string;
  phone?: string;
  // For users with role 'client' — links this auth user to a Client document.
  // Firestore rules use this to scope job/proposal visibility to their own client record.
  linkedClientId?: string;
  createdAt: Date;
  lastLogin?: Date;
}

export interface Client {
  id: string;
  tenantId: string;
  companyName: string;
  contactName: string;
  contactEmail: string;
  phone: string;
  address: string;
  linkedUserId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Job {
  id: string;
  tenantId: string;
  title: string;
  description: string;
  clientId: string;
  assignedOperators: string[];
  status: JobStatus;
  priority: JobPriority;
  estimatedStart?: Date;
  estimatedEnd?: Date;
  actualCompletion?: Date;
  proposalGenerated: boolean;
  createdBy: string;
  createdAt: Date;
  lastUpdated: Date;
}

export interface Proposal {
  id: string;
  tenantId: string;
  jobId: string;
  specsJson: Record<string, unknown>;
  images: string[];
  aiGeneratedText?: string;
  priceEstimate: number;
  version: number;
  status: ProposalStatus;
  pdfUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkSession {
  id: string;
  tenantId: string;
  jobId: string;
  operatorId: string;
  date: Date;
  startTime: Date;
  endTime?: Date;
  notes: string;
  media: string[];
  createdAt: Date;
}

export interface IncidentReport {
  id: string;
  tenantId: string;
  jobId: string;
  jobTitle?: string;
  operatorId: string;
  severity: IncidentSeverity;
  description: string;
  photos: string[];           // Firebase Storage URLs (or filenames until upload is wired)
  voiceTranscript?: string;   // speech-to-text transcript captured in the UI
  aiGeneratedReport?: string; // AI-generated markdown report saved after generation
  resolutionStatus: IncidentResolution;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// UI Helper Types
// ============================================

export interface NavItem {
  label: string;
  href: string;
  icon: string;
  roles: UserRole[];
}

export interface StatusConfig {
  label: string;
  color: string;
  bgColor: string;
}

export const JOB_STATUS_CONFIG: Record<JobStatus, StatusConfig> = {
  lead: { label: 'Lead', color: 'text-gray-700', bgColor: 'bg-gray-100' },
  proposal_draft: { label: 'Proposal Draft', color: 'text-blue-700', bgColor: 'bg-blue-100' },
  proposal_sent: { label: 'Proposal Sent', color: 'text-blue-700', bgColor: 'bg-blue-100' },
  client_review: { label: 'Client Review', color: 'text-blue-700', bgColor: 'bg-blue-100' },
  approved: { label: 'Approved', color: 'text-green-700', bgColor: 'bg-green-100' },
  scheduled: { label: 'Scheduled', color: 'text-teal-700', bgColor: 'bg-teal-100' },
  in_progress: { label: 'In Progress', color: 'text-teal-700', bgColor: 'bg-teal-100' },
  on_hold: { label: 'On Hold', color: 'text-amber-700', bgColor: 'bg-amber-100' },
  completed: { label: 'Completed', color: 'text-green-700', bgColor: 'bg-green-100' },
  invoiced: { label: 'Invoiced', color: 'text-emerald-700', bgColor: 'bg-emerald-100' },
  closed: { label: 'Closed', color: 'text-gray-700', bgColor: 'bg-gray-100' },
  cancelled: { label: 'Cancelled', color: 'text-red-700', bgColor: 'bg-red-100' },
};

export const JOB_STATUS_FLOW: JobStatus[] = [
  'lead',
  'proposal_draft',
  'proposal_sent',
  'client_review',
  'approved',
  'scheduled',
  'in_progress',
  'completed',
  'invoiced',
  'closed',
];
