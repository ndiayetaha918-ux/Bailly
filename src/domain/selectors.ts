import type { State } from "@/store/store";
import type { Invoice, InvoiceStatus, Message, Payment, Person, Property, Role, Thread, Unit, UnitEvent, UnitState } from "./types";
import { currentPeriod, daysBetween, shiftPeriod, today } from "@/lib/clock";

export type Data = Pick<
  State,
  "owners" | "managers" | "tenants" | "properties" | "units" | "invoices" | "payments" | "receipts" | "threads" | "messages" | "events" | "entrances"
>;

export function invoiceStatus(inv: Invoice): InvoiceStatus {
  if (inv.paid >= inv.amount) return "paid";
  const d = daysBetween(today(), inv.dueDate);
  if (d < 0) return inv.paid > 0 ? "partial" : "late";
  if (inv.paid > 0) return "partial";
  if (d <= 7) return "due";
  return "upcoming";
}

export function isOverdue(inv: Invoice): boolean {
  return inv.paid < inv.amount && daysBetween(today(), inv.dueDate) < 0;
}

export function daysLate(inv: Invoice): number {
  return Math.max(0, -daysBetween(today(), inv.dueDate));
}

export function unitInvoices(d: Data, unitId: string): Invoice[] {
  return d.invoices.filter((i) => i.unitId === unitId).sort((a, b) => a.period.localeCompare(b.period));
}

export function currentInvoice(d: Data, unitId: string): Invoice | undefined {
  const p = currentPeriod();
  return d.invoices.find((i) => i.unitId === unitId && i.period === p);
}

/** Overdue invoices, excluding those covered by a transfer awaiting confirmation. */
export function overdueInvoices(d: Data, unitId: string): Invoice[] {
  return unitInvoices(d, unitId).filter((i) => isOverdue(i) && !pendingTransfer(d, i.id));
}

export function balance(invs: Invoice[]): number {
  return invs.reduce((s, i) => s + (i.amount - i.paid), 0);
}

export function pendingTransfer(d: Data, invoiceId: string): Payment | undefined {
  return d.payments.find((p) => p.invoiceId === invoiceId && p.channel === "manual" && p.status === "pending");
}

export function unitState(d: Data, unit: Unit): UnitState {
  if (!unit.tenantId) return "vacant";
  const overdue = overdueInvoices(d, unit.id);
  if (overdue.length) return overdue.some((i) => i.paid === 0) ? "late" : "partial";
  const cur = currentInvoice(d, unit.id);
  if (!cur) return "upcoming";
  if (pendingTransfer(d, cur.id)) return "due";
  return invoiceStatus(cur) as UnitState;
}

export function propertyUnits(d: Data, propertyId: string): Unit[] {
  return d.units.filter((u) => u.propertyId === propertyId).sort((a, b) => b.level - a.level || a.position - b.position);
}

export interface Stats {
  expected: number;
  collected: number;
  outstanding: number;
  units: number;
  occupied: number;
  vacant: number;
  late: number;
  potential: number;
}

export function statsFor(d: Data, propertyIds: string[], period = currentPeriod()): Stats {
  const units = d.units.filter((u) => propertyIds.includes(u.propertyId));
  const unitIds = new Set(units.map((u) => u.id));
  const invs = d.invoices.filter((i) => unitIds.has(i.unitId) && i.period === period);
  const expected = invs.reduce((s, i) => s + i.amount, 0);
  const collected = invs.reduce((s, i) => s + i.paid, 0);
  const outstanding = d.invoices
    .filter((i) => unitIds.has(i.unitId) && isOverdue(i) && !pendingTransfer(d, i.id))
    .reduce((s, i) => s + i.amount - i.paid, 0);
  const occupied = units.filter((u) => u.tenantId).length;
  const late = units.filter((u) => {
    const st = unitState(d, u);
    return st === "late" || st === "partial";
  }).length;
  return {
    expected,
    collected,
    outstanding,
    units: units.length,
    occupied,
    vacant: units.length - occupied,
    late,
    potential: units.reduce((s, u) => s + u.rent + u.charges, 0),
  };
}

export function monthlySeries(d: Data, propertyIds: string[], months = 12) {
  const now = currentPeriod();
  const unitIds = new Set(d.units.filter((u) => propertyIds.includes(u.propertyId)).map((u) => u.id));
  return Array.from({ length: months }, (_, k) => {
    const period = shiftPeriod(now, k - months + 1);
    const invs = d.invoices.filter((i) => unitIds.has(i.unitId) && i.period === period);
    return {
      period,
      expected: invs.reduce((s, i) => s + i.amount, 0),
      collected: invs.reduce((s, i) => s + i.paid, 0),
    };
  });
}

export function person(d: Data, id: string | null | undefined): (Person & { role: Role; org?: string }) | undefined {
  if (!id) return undefined;
  const o = d.owners.find((x) => x.id === id);
  if (o) return { ...o, role: "owner" };
  const m = d.managers.find((x) => x.id === id);
  if (m) return { ...m, role: "manager", org: m.agency };
  const t = d.tenants.find((x) => x.id === id);
  if (t) return { ...t, role: "tenant" };
  return undefined;
}

export function propertyOf(d: Data, unit: Unit): Property {
  return d.properties.find((p) => p.id === unit.propertyId)!;
}

/** Who the tenant talks to: the manager when the property is managed, else the owner. */
export function contactFor(d: Data, unit: Unit) {
  const p = propertyOf(d, unit);
  return person(d, p.managerId ?? p.ownerId)!;
}

export type JournalItem = { kind: "message"; at: string; message: Message; thread: Thread } | { kind: "event"; at: string; event: UnitEvent };

export function unitJournal(d: Data, unitId: string): JournalItem[] {
  const threads = new Map(d.threads.filter((t) => t.unitId === unitId).map((t) => [t.id, t]));
  const items: JournalItem[] = [
    ...d.messages
      .filter((m) => m.unitId === unitId)
      .map((m) => ({ kind: "message" as const, at: m.createdAt, message: m, thread: threads.get(m.threadId)! })),
    ...d.events.filter((e) => e.unitId === unitId && e.type !== "receipt_issued").map((e) => ({ kind: "event" as const, at: e.at, event: e })),
  ];
  return items.sort((a, b) => a.at.localeCompare(b.at));
}

export function threadMessages(d: Data, threadId: string): Message[] {
  return d.messages.filter((m) => m.threadId === threadId).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

// ---------------------------------------------------------------------------
// Manager attention queue

export type AttentionKind = "late" | "partial" | "transfer" | "claim" | "message" | "lease" | "vacant";

export interface AttentionItem {
  id: string;
  kind: AttentionKind;
  unitId: string;
  score: number;
  title: string;
  detail: string;
  amount?: number;
  days?: number;
  threadId?: string;
  paymentId?: string;
  urgent?: boolean;
}

export function managedPropertyIds(d: Data, managerId: string): string[] {
  return d.properties.filter((p) => p.managerId === managerId).map((p) => p.id);
}

export function attentionItems(d: Data, propertyIds: string[], role: Role): AttentionItem[] {
  const units = d.units.filter((u) => propertyIds.includes(u.propertyId));
  const items: AttentionItem[] = [];
  const T = today();

  for (const u of units) {
    const overdue = overdueInvoices(d, u.id);
    if (overdue.length) {
      const owed = balance(overdue);
      const oldest = overdue[0]!;
      const days = daysLate(oldest);
      const allPartial = overdue.every((i) => i.paid > 0);
      items.push({
        id: `late_${u.id}`,
        kind: allPartial ? "partial" : "late",
        unitId: u.id,
        score: (allPartial ? 60 : 75) + Math.min(days, 60) / 2 + (overdue.length > 1 ? 8 : 0),
        title: allPartial ? "Paiement partiel" : overdue.length > 1 ? `${overdue.length} loyers impayés` : "Loyer impayé",
        detail: days === 1 ? "Échu depuis hier" : `Échu depuis ${days} jours`,
        amount: owed,
        days,
      });
    }
    const cur = currentInvoice(d, u.id);
    if (cur) {
      const pt = pendingTransfer(d, cur.id);
      if (pt) {
        items.push({
          id: `tr_${pt.id}`,
          kind: "transfer",
          unitId: u.id,
          score: 70,
          title: "Virement à confirmer",
          detail: `Déclaré ${daysBetween(pt.createdAt, T) <= 1 ? "hier" : `il y a ${daysBetween(pt.createdAt, T)} jours`}, réf. ${pt.providerRef}`,
          amount: pt.amount,
          paymentId: pt.id,
        });
      }
    }
    if (u.lease) {
      const left = daysBetween(T, u.lease.end);
      if (left >= 0 && left <= 60) {
        items.push({
          id: `lease_${u.id}`,
          kind: "lease",
          unitId: u.id,
          score: 45 - left / 4,
          title: "Bail à renouveler",
          detail: `Fin du bail dans ${left} jours`,
          days: left,
        });
      }
    }
    if (!u.tenantId) {
      items.push({ id: `vac_${u.id}`, kind: "vacant", unitId: u.id, score: 18, title: "Local vacant", detail: "À commercialiser" });
    }
  }

  for (const t of d.threads.filter((x) => units.some((u) => u.id === x.unitId))) {
    if (t.kind === "claim" && t.status !== "resolved") {
      const urgent = t.priority === "urgent";
      items.push({
        id: `cl_${t.id}`,
        kind: "claim",
        unitId: t.unitId,
        score: (urgent ? 95 : 55) + (t.status === "open" ? 6 : 0) + (t.unreadBy.includes(role) ? 4 : 0),
        title: t.subject,
        detail: t.status === "open" ? "Nouvelle réclamation" : t.assignee ? `Suivi : ${t.assignee}` : "En cours",
        threadId: t.id,
        urgent,
      });
    } else if (t.kind === "message" && t.unreadBy.includes(role)) {
      items.push({
        id: `msg_${t.id}`,
        kind: "message",
        unitId: t.unitId,
        score: 52,
        title: t.subject,
        detail: "Nouveau message",
        threadId: t.id,
      });
    }
  }

  return items.sort((a, b) => b.score - a.score);
}

export function tenantUnit(d: Data, tenantId: string): Unit | undefined {
  return d.units.find((u) => u.tenantId === tenantId);
}

/** The invoice the tenant should act on: oldest overdue, else current. */
export function invoiceToPay(d: Data, unitId: string): Invoice | undefined {
  const overdue = overdueInvoices(d, unitId);
  if (overdue.length) return overdue[0];
  const cur = currentInvoice(d, unitId);
  if (cur && cur.paid < cur.amount) return cur;
  return undefined;
}
