// Firestore helper functions for multi-tenant data operations
import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  Timestamp,
  DocumentData,
  QueryConstraint,
  setDoc,
} from 'firebase/firestore';
import { db } from './firebase';
import type {
  User,
  Client,
  Job,
  Proposal,
  WorkSession,
  IncidentReport,
  TenantMetadata,
  TenantBranding,
} from './types';

// ============================================
// Path Helpers (multi-tenant scoped)
// ============================================

const tenantPath = (tenantId: string) => `tenants/${tenantId}`;
const usersCol = (tenantId: string) => `${tenantPath(tenantId)}/users`;
const clientsCol = (tenantId: string) => `${tenantPath(tenantId)}/clients`;
const jobsCol = (tenantId: string) => `${tenantPath(tenantId)}/jobs`;
const proposalsCol = (tenantId: string) => `${tenantPath(tenantId)}/proposals`;
const sessionsCol = (tenantId: string) => `${tenantPath(tenantId)}/workSessions`;
const incidentsCol = (tenantId: string) => `${tenantPath(tenantId)}/incidentReports`;

// ============================================
// Timestamp conversion helpers
// ============================================

function toDate(val: unknown): Date {
  if (val instanceof Timestamp) return val.toDate();
  if (val instanceof Date) return val;
  return new Date(val as string);
}

function docToEntity<T>(docData: DocumentData, id: string): T {
  const data: Record<string, unknown> = { ...docData, id };
  // Convert Firestore Timestamps to JS Dates
  for (const key of Object.keys(data)) {
    if (data[key] instanceof Timestamp) {
      data[key] = (data[key] as Timestamp).toDate();
    }
  }
  return data as T;
}

// ============================================
// Tenant Operations
// ============================================

export async function getTenantMetadata(tenantId: string): Promise<TenantMetadata | null> {
  const snap = await getDoc(doc(db, tenantPath(tenantId)));
  if (!snap.exists()) return null;
  return docToEntity<TenantMetadata>(snap.data(), snap.id);
}

export async function getTenantBranding(tenantId: string): Promise<TenantBranding | null> {
  const snap = await getDoc(doc(db, `${tenantPath(tenantId)}/config/branding`));
  if (!snap.exists()) return null;
  return snap.data() as TenantBranding;
}

export async function setTenantBranding(tenantId: string, branding: TenantBranding) {
  await setDoc(doc(db, `${tenantPath(tenantId)}/config/branding`), branding);
}

export async function createTenant(tenantId: string, metadata: Omit<TenantMetadata, 'id'>) {
  await setDoc(doc(db, tenantPath(tenantId)), { ...metadata, createdAt: Timestamp.now() });
}

// ============================================
// User Operations
// ============================================

export async function getUser(tenantId: string, uid: string): Promise<User | null> {
  const snap = await getDoc(doc(db, usersCol(tenantId), uid));
  if (!snap.exists()) return null;
  return docToEntity<User>(snap.data(), snap.id);
}

export async function getUsers(tenantId: string): Promise<User[]> {
  const snap = await getDocs(collection(db, usersCol(tenantId)));
  return snap.docs.map((d) => docToEntity<User>(d.data(), d.id));
}

export async function createUser(tenantId: string, user: Omit<User, 'createdAt'>) {
  await setDoc(doc(db, usersCol(tenantId), user.uid), {
    ...user,
    createdAt: Timestamp.now(),
  });
}

export async function updateUser(tenantId: string, uid: string, data: Partial<User>) {
  await updateDoc(doc(db, usersCol(tenantId), uid), data as DocumentData);
}

// ============================================
// Client Operations
// ============================================

export async function getClients(tenantId: string): Promise<Client[]> {
  const snap = await getDocs(
    query(collection(db, clientsCol(tenantId)), orderBy('companyName'))
  );
  return snap.docs.map((d) => docToEntity<Client>(d.data(), d.id));
}

export async function getClient(tenantId: string, clientId: string): Promise<Client | null> {
  const snap = await getDoc(doc(db, clientsCol(tenantId), clientId));
  if (!snap.exists()) return null;
  return docToEntity<Client>(snap.data(), snap.id);
}

export async function createClient(tenantId: string, data: Omit<Client, 'id' | 'createdAt' | 'updatedAt' | 'tenantId'>) {
  return addDoc(collection(db, clientsCol(tenantId)), {
    ...data,
    tenantId,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });
}

export async function updateClient(tenantId: string, clientId: string, data: Partial<Client>) {
  await updateDoc(doc(db, clientsCol(tenantId), clientId), {
    ...data,
    updatedAt: Timestamp.now(),
  } as DocumentData);
}

export async function deleteClient(tenantId: string, clientId: string) {
  await deleteDoc(doc(db, clientsCol(tenantId), clientId));
}

// ============================================
// Job Operations
// ============================================

export async function getJobs(tenantId: string, ...constraints: QueryConstraint[]): Promise<Job[]> {
  const q = query(collection(db, jobsCol(tenantId)), ...constraints);
  const snap = await getDocs(q);
  return snap.docs.map((d) => docToEntity<Job>(d.data(), d.id));
}

export async function getJob(tenantId: string, jobId: string): Promise<Job | null> {
  const snap = await getDoc(doc(db, jobsCol(tenantId), jobId));
  if (!snap.exists()) return null;
  return docToEntity<Job>(snap.data(), snap.id);
}

export async function createJob(tenantId: string, data: Omit<Job, 'id' | 'createdAt' | 'lastUpdated' | 'tenantId'>) {
  return addDoc(collection(db, jobsCol(tenantId)), {
    ...data,
    tenantId,
    createdAt: Timestamp.now(),
    lastUpdated: Timestamp.now(),
  });
}

export async function updateJob(tenantId: string, jobId: string, data: Partial<Job>) {
  await updateDoc(doc(db, jobsCol(tenantId), jobId), {
    ...data,
    lastUpdated: Timestamp.now(),
  } as DocumentData);
}

export async function deleteJob(tenantId: string, jobId: string) {
  await deleteDoc(doc(db, jobsCol(tenantId), jobId));
}

export async function getJobsByOperator(tenantId: string, operatorId: string): Promise<Job[]> {
  const q = query(
    collection(db, jobsCol(tenantId)),
    where('assignedOperators', 'array-contains', operatorId)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => docToEntity<Job>(d.data(), d.id));
}

export async function getJobsByClient(tenantId: string, clientId: string): Promise<Job[]> {
  const q = query(
    collection(db, jobsCol(tenantId)),
    where('clientId', '==', clientId)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => docToEntity<Job>(d.data(), d.id));
}

// ============================================
// Proposal Operations
// ============================================

export async function getProposals(tenantId: string, jobId?: string): Promise<Proposal[]> {
  const constraints: QueryConstraint[] = [];
  if (jobId) constraints.push(where('jobId', '==', jobId));
  const q = query(collection(db, proposalsCol(tenantId)), ...constraints);
  const snap = await getDocs(q);
  return snap.docs.map((d) => docToEntity<Proposal>(d.data(), d.id));
}

export async function getProposal(tenantId: string, proposalId: string): Promise<Proposal | null> {
  const snap = await getDoc(doc(db, proposalsCol(tenantId), proposalId));
  if (!snap.exists()) return null;
  return docToEntity<Proposal>(snap.data(), snap.id);
}

export async function createProposal(tenantId: string, data: Omit<Proposal, 'id' | 'createdAt' | 'updatedAt' | 'tenantId'>) {
  return addDoc(collection(db, proposalsCol(tenantId)), {
    ...data,
    tenantId,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });
}

export async function updateProposal(tenantId: string, proposalId: string, data: Partial<Proposal>) {
  await updateDoc(doc(db, proposalsCol(tenantId), proposalId), {
    ...data,
    updatedAt: Timestamp.now(),
  } as DocumentData);
}

// ============================================
// Work Session Operations
// ============================================

export async function getWorkSessions(tenantId: string, jobId?: string, operatorId?: string): Promise<WorkSession[]> {
  const constraints: QueryConstraint[] = [];
  if (jobId) constraints.push(where('jobId', '==', jobId));
  if (operatorId) constraints.push(where('operatorId', '==', operatorId));
  const q = query(collection(db, sessionsCol(tenantId)), ...constraints);
  const snap = await getDocs(q);
  return snap.docs.map((d) => docToEntity<WorkSession>(d.data(), d.id));
}

export async function createWorkSession(tenantId: string, data: Omit<WorkSession, 'id' | 'createdAt' | 'tenantId'>) {
  return addDoc(collection(db, sessionsCol(tenantId)), {
    ...data,
    tenantId,
    createdAt: Timestamp.now(),
  });
}

export async function updateWorkSession(tenantId: string, sessionId: string, data: Partial<WorkSession>) {
  await updateDoc(doc(db, sessionsCol(tenantId), sessionId), data as DocumentData);
}

// ============================================
// Incident Report Operations
// ============================================

export async function getIncidentReports(tenantId: string, jobId?: string): Promise<IncidentReport[]> {
  const constraints: QueryConstraint[] = [];
  if (jobId) constraints.push(where('jobId', '==', jobId));
  const q = query(collection(db, incidentsCol(tenantId)), ...constraints);
  const snap = await getDocs(q);
  return snap.docs.map((d) => docToEntity<IncidentReport>(d.data(), d.id));
}

export async function createIncidentReport(tenantId: string, data: Omit<IncidentReport, 'id' | 'createdAt' | 'updatedAt' | 'tenantId'>) {
  return addDoc(collection(db, incidentsCol(tenantId)), {
    ...data,
    tenantId,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });
}

export async function updateIncidentReport(tenantId: string, reportId: string, data: Partial<IncidentReport>) {
  await updateDoc(doc(db, incidentsCol(tenantId), reportId), {
    ...data,
    updatedAt: Timestamp.now(),
  } as DocumentData);
}
