/*
  Domain model. The local (Unit) is the centre of everything:
  invoices, payments, receipts, threads and events all hang off a unitId.
*/

export type Role = "owner" | "manager" | "tenant";

export interface Person {
  id: string;
  name: string;
  phone: string;
  email?: string;
}

export interface Owner extends Person {
  company?: string;
}

export interface Manager extends Person {
  agency: string;
}

export interface Tenant extends Person {
  profession?: string;
}

export type PropertyKind = "immeuble" | "villa" | "commercial" | "mixte";

export interface Property {
  id: string;
  name: string;
  kind: PropertyKind;
  address: string;
  district: string;
  city: string;
  ownerId: string;
  managerId: string | null;
  /** Number of levels including the ground floor (level 0). */
  levels: number;
  /** Facade width in bays; a unit spans one or more bays. */
  bays: number;
  createdAt: string;
  builtYear?: number;
}

export type UnitKind = "appartement" | "studio" | "bureau" | "boutique" | "magasin";

export interface Lease {
  start: string;
  end: string;
  deposit: number;
}

export interface Unit {
  id: string;
  propertyId: string;
  /** Short code painted on the door: "203", "B-02". */
  code: string;
  kind: UnitKind;
  level: number;
  /** Bay index on the floor, left to right. */
  position: number;
  /** Number of bays this unit spans on the facade. */
  span: number;
  rooms?: number;
  surface: number;
  rent: number;
  charges: number;
  /** Day of month the rent is due. */
  dueDay: number;
  tenantId: string | null;
  lease: Lease | null;
}

/** An échéance: what a tenant owes for one period. */
export interface Invoice {
  id: string;
  unitId: string;
  tenantId: string;
  /** "2026-10" */
  period: string;
  rent: number;
  charges: number;
  amount: number;
  dueDate: string;
  paid: number;
  paidAt: string | null;
}

export type InvoiceStatus = "paid" | "partial" | "late" | "due" | "upcoming";

export type MobileMethod = "wave" | "orange_money" | "free_money" | "touchpoint";
export type PaymentMethod = MobileMethod | "card" | "cash" | "transfer";
export type PaymentStatus = "initiated" | "pending" | "succeeded" | "failed" | "cancelled";

export interface Payment {
  id: string;
  invoiceId: string;
  unitId: string;
  tenantId: string;
  amount: number;
  method: PaymentMethod;
  /** "intouch" for online payments, "manual" for cash / transfer recorded by staff. */
  channel: "intouch" | "manual";
  status: PaymentStatus;
  /** Transaction id returned by the payment provider. */
  providerRef: string | null;
  payerPhone?: string;
  createdAt: string;
  settledAt: string | null;
  receiptId: string | null;
  recordedBy?: string;
  failureReason?: string;
}

/** Quittance de loyer. Issued once an invoice is fully paid. */
export interface Receipt {
  id: string;
  number: string;
  invoiceId: string;
  paymentIds: string[];
  unitId: string;
  tenantId: string;
  propertyId: string;
  period: string;
  rent: number;
  charges: number;
  amount: number;
  issuedAt: string;
  issuerName: string;
  issuerRole: string;
  verifyCode: string;
}

export type ThreadKind = "message" | "claim";
export type ClaimCategory = "plomberie" | "electricite" | "serrurerie" | "humidite" | "climatisation" | "parties_communes" | "autre";
export type ClaimStatus = "open" | "in_progress" | "scheduled" | "resolved";
export type Priority = "normal" | "urgent";

export interface Thread {
  id: string;
  unitId: string;
  kind: ThreadKind;
  subject: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  status?: ClaimStatus;
  category?: ClaimCategory;
  priority?: Priority;
  assignee?: string;
  scheduledFor?: string;
  /** Roles that have unread activity on this thread. */
  unreadBy: Role[];
}

export interface Attachment {
  name: string;
  kind: "photo" | "pdf";
  tone?: string;
}

export interface Message {
  id: string;
  threadId: string;
  unitId: string;
  authorId: string;
  authorRole: Role;
  body: string;
  createdAt: string;
  attachments?: Attachment[];
}

export type UnitEventType =
  "reminder_sent" | "payment_received" | "payment_failed" | "receipt_issued" | "claim_opened" | "claim_status" | "lease_signed" | "rent_changed";

export interface UnitEvent {
  id: string;
  unitId: string;
  type: UnitEventType;
  at: string;
  actorId?: string;
  threadId?: string;
  paymentId?: string;
  receiptId?: string;
  text: string;
  meta?: Record<string, string | number>;
}

/** Status of a unit as drawn on the facade. */
export type UnitState = "vacant" | "late" | "partial" | "due" | "paid" | "upcoming";
