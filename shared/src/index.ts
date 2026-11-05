/**
 * Smart Pod — shared types.
 *
 * These describe every record the backend stores and sends. The backend, the web
 * dashboards and the mobile app all import them with `import type`, so this file
 * contains NO runtime code: it only helps the editor and TypeScript catch mistakes.
 *
 * If you add a field here, add it in backend/data/seed.ts too.
 */

/** The four roles a person picks when they create a profile in the mobile app. */
export type Role = 'patient' | 'doctor' | 'pharmacist' | 'caregiver';

/** Patients include athletes and wellness users who take supplements. */
export type PatientSegment = 'medication' | 'athlete' | 'wellness';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  /** Only for patients. */
  segment?: PatientSegment;
  /** Only for doctors: licence number to be verified before real use. */
  licenceNumber?: string;
  /** Daily routine, used by the AI engine to place doses (24h "HH:MM"). */
  routine?: DailyRoutine;
  createdAt: string;
}

export interface DailyRoutine {
  wake: string; // e.g. "07:00"
  breakfast: string;
  lunch: string;
  dinner: string;
  sleep: string;
  /** Athletes: usual training time, optional. */
  training?: string;
}

/**
 * A care link = consent. A patient grants a doctor, pharmacist or caregiver access.
 * Without an active link, that person sees nothing about the patient.
 */
export interface CareLink {
  id: string;
  patientId: string;
  memberId: string;
  memberRole: Exclude<Role, 'patient'>;
  grantedAt: string;
  revokedAt?: string;
}

export type ItemKind = 'medicine' | 'supplement';
export type ItemStatus = 'active' | 'stopped';

/**
 * An item is anything the patient takes: a prescribed medicine or a supplement.
 * Medicines are added and edited by a doctor. Supplements can be added by the patient.
 */
export interface Item {
  id: string;
  patientId: string;
  kind: ItemKind;
  /** Key into the AI engine catalogue (backend/src/ai/catalog.ts). */
  catalogId: string;
  name: string;
  /** Human text, e.g. "5 mg" or "1 capsule". */
  dose: string;
  /** Times of day, "HH:MM". Filled by the doctor or suggested by the AI engine. */
  times: string[];
  instructions?: string;
  status: ItemStatus;
  prescribedBy?: string; // doctor user id, for medicines
  createdBy: string;
  startDate: string; // "YYYY-MM-DD"
  endDate?: string;
  updatedAt: string;
}

export type DoseStatus = 'due' | 'taken' | 'missed' | 'skipped';
export type ConfirmedBy = 'user' | 'pod' | 'caregiver';

/** One planned dose and what happened to it. This is the core log of the system. */
export interface DoseEvent {
  id: string;
  patientId: string;
  itemId: string;
  plannedAt: string; // ISO date-time
  status: DoseStatus;
  confirmedBy?: ConfirmedBy;
  actualAt?: string;
  deviceId?: string;
  /** Set when the reminder notification has been sent. */
  remindedAt?: string;
}

export interface Inventory {
  /** Same value as itemId (one stock record per item). */
  id: string;
  itemId: string;
  patientId: string;
  count: number;
  /** Warn the pharmacist and patient when count falls to this level. */
  refillAt: number;
}

export type DeviceType = 'phone' | 'simulated-pod' | 'pod';

export interface Device {
  id: string;
  patientId: string;
  type: DeviceType;
  name: string;
  battery?: number; // 0-100
  online: boolean;
  lastSeenAt?: string;
  firmware?: string;
  /** Secret the Pod sends with each request. Mock only; real Pods use certificates. */
  deviceKey: string;
}

export type NotificationKind =
  | 'reminder'
  | 'missed-dose'
  | 'conflict-warning'
  | 'prescription-changed'
  | 'refill'
  | 'device';

export interface Notification {
  id: string;
  userId: string;
  patientId?: string;
  kind: NotificationKind;
  title: string;
  body: string;
  createdAt: string;
  readAt?: string;
}

export interface AuditEntry {
  id: string;
  actorId: string;
  action: string; // e.g. "item.update"
  patientId?: string;
  recordId?: string;
  detail?: string;
  at: string;
}

/* ---------------- AI engine results ---------------- */

export type Severity = 'serious' | 'moderate' | 'minor';

export interface Conflict {
  /** Catalogue ids involved. For food conflicts, b is a food id. */
  a: string;
  b: string;
  aName: string;
  bName: string;
  type: 'item-item' | 'item-food';
  severity: Severity;
  reason: string;
  advice: string;
  /** Hours to keep between the two, when spacing solves it. */
  separateHours?: number;
  /** How far apart their current times are, when both have times. */
  currentGapHours?: number;
}

export interface TimingSuggestion {
  itemId: string;
  catalogId: string;
  name: string;
  suggestedTimes: string[];
  why: string;
}

export interface FoodTip {
  catalogId: string;
  name: string;
  tip: string;
}

export interface AiReport {
  conflicts: Conflict[];
  timing: TimingSuggestion[];
  food: FoodTip[];
  /** Plain-language summary. Written by Claude if configured, otherwise by a template. */
  explanation: string;
  explainedBy: 'claude' | 'template';
  /** Always shown in the UI. */
  disclaimer: string;
}

export interface AdherenceSummary {
  patientId: string;
  days: number;
  planned: number;
  taken: number;
  missed: number;
  skipped: number;
  /** 0-100, taken / (planned so far). */
  percent: number;
  /** One entry per day, oldest first. */
  daily: { day: string; planned: number; taken: number; missed: number }[];
}

/** One row in a dashboard's patient list. */
export interface PatientSummary {
  patient: User;
  /** The viewer's role for this patient ('patient' when viewing yourself). */
  viewerRole: Role;
  adherence7: number;
  missedToday: number;
  dueToday: number;
  nextDose?: { itemName: string; dose: string; plannedAt: string };
  lowStock: number;
  activeItems: number;
}

/** A dose joined with its item, as the apps display it. */
export interface DoseView extends DoseEvent {
  itemName: string;
  itemDose: string;
  itemKind: ItemKind;
  instructions?: string;
}

/** Shape of an API error body. */
export interface ApiError {
  error: string;
  /** Present when a prescription change needs confirmation because of a serious conflict. */
  report?: AiReport;
}

/* ---------------- Shapes returned by specific API endpoints ---------------- */

export interface CatalogItem {
  id: string;
  name: string;
  kind: ItemKind;
  typicalDose: string;
  food: 'with' | 'without' | 'either';
  timingWhy: string;
}

export interface InventoryView extends Inventory {
  itemName: string;
  kind: ItemKind;
  perDay: number;
  daysLeft: number;
  low: boolean;
}

export interface CareTeamMember {
  linkId: string;
  role: Exclude<Role, 'patient'>;
  grantedAt: string;
  member: { id: string; name: string; email: string };
}

export interface AuditView extends AuditEntry {
  actorName: string;
}

export interface DemoAccount {
  id: string;
  name: string;
  role: Role;
  segment?: PatientSegment;
  email: string;
}

/** What the apps send to add or change an item. */
export interface ItemInput {
  catalogId?: string;
  name?: string;
  kind?: ItemKind;
  dose?: string;
  times?: string[];
  timesPerDay?: number;
  instructions?: string;
  count?: number;
  confirm?: boolean;
}

export interface PublicDevice extends Omit<Device, 'deviceKey'> {}
