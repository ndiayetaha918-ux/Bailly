import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { buildSeed, type Dataset } from "@/data/seed";
import type {
  Attachment,
  ClaimCategory,
  ClaimStatus,
  Invoice,
  Payment,
  Priority,
  Property,
  PropertyKind,
  Receipt,
  Role,
  Thread,
  ThreadKind,
  Unit,
  UnitEvent,
  UnitKind,
} from "@/domain/types";
import { claimStatusLabel } from "@/domain/labels";
import { nowISO } from "@/lib/clock";
import { amount as fmtAmount } from "@/lib/format";
import { uid } from "@/lib/rng";
import { paymentGateway, type GatewayMethod } from "@/services/payments";

export type ThemePref = "light" | "dark" | "system";

export interface PropertyDraft {
  name: string;
  kind: PropertyKind;
  address: string;
  district: string;
  city: string;
  levels: number;
  bays: number;
  entrance: number | null;
  units: Array<{
    code: string;
    kind: UnitKind;
    level: number;
    position: number;
    span: number;
    surface: number;
    rooms?: number;
    rent: number;
    charges: number;
  }>;
}

interface Actions {
  resetDemo: () => void;
  setTheme: (t: ThemePref) => void;

  startPayment: (args: { invoiceId: string; method: GatewayMethod; phone?: string; amount?: number; paymentId?: string }) => Promise<string>;
  cancelPayment: (paymentId: string) => void;
  recordManualPayment: (args: { invoiceId: string; amount: number; method: "cash" | "transfer"; actorId: string }) => string;
  confirmTransfer: (paymentId: string, actorId: string) => void;

  sendReminder: (unitId: string, channel: "SMS" | "WhatsApp", actorId: string) => void;
  sendMessage: (args: { threadId: string; authorId: string; role: Role; body: string; attachments?: Attachment[] }) => void;
  startThread: (args: {
    unitId: string;
    kind: ThreadKind;
    subject: string;
    body: string;
    authorId: string;
    role: Role;
    category?: ClaimCategory;
    priority?: Priority;
    attachments?: Attachment[];
  }) => string;
  setClaimStatus: (args: { threadId: string; status: ClaimStatus; actorId: string; assignee?: string; scheduledFor?: string }) => void;
  markThreadRead: (threadId: string, role: Role) => void;

  createProperty: (draft: PropertyDraft, ownerId: string, managerId: string | null) => string;
  updateUnitRent: (unitId: string, rent: number, actorId: string) => void;
}

export interface State extends Dataset {
  theme: ThemePref;
}

const roleOfActor = (id: string): Role => (id.startsWith("mgr") ? "manager" : id.startsWith("own") ? "owner" : "tenant");

function receiptNumber(period: string, receipts: Receipt[]): string {
  const max = receipts.reduce((m, r) => Math.max(m, Number(r.number.split("-").pop())), 1000);
  return `Q-${period.replace("-", "")}-${String(max + 1).padStart(5, "0")}`;
}

function makeVerifyCode(): string {
  const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 6 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join("");
}

/** Applies a settled payment: updates invoice, issues the quittance when fully paid, logs events. */
function settle(state: State, paymentId: string, settledAt: string): Partial<State> {
  const payment = state.payments.find((p) => p.id === paymentId);
  if (!payment) return {};
  const invoice = state.invoices.find((i) => i.id === payment.invoiceId)!;
  const unit = state.units.find((u) => u.id === payment.unitId)!;
  const property = state.properties.find((p) => p.id === unit.propertyId)!;
  const owner = state.owners.find((o) => o.id === property.ownerId)!;
  const manager = property.managerId ? state.managers.find((m) => m.id === property.managerId) : undefined;

  const paid = Math.min(invoice.amount, invoice.paid + payment.amount);
  const full = paid >= invoice.amount;
  const updatedInvoice: Invoice = { ...invoice, paid, paidAt: full ? settledAt : invoice.paidAt };

  const events: UnitEvent[] = [
    {
      id: uid("ev"),
      unitId: unit.id,
      type: "payment_received",
      at: settledAt,
      paymentId,
      text: "Paiement reçu",
      meta: { amount: payment.amount, method: payment.method },
    },
  ];

  let receipt: Receipt | null = null;
  if (full) {
    receipt = {
      id: uid("rcp"),
      number: receiptNumber(invoice.period, state.receipts),
      invoiceId: invoice.id,
      paymentIds: state.payments.filter((p) => p.invoiceId === invoice.id && (p.status === "succeeded" || p.id === paymentId)).map((p) => p.id),
      unitId: unit.id,
      tenantId: invoice.tenantId,
      propertyId: property.id,
      period: invoice.period,
      rent: invoice.rent,
      charges: invoice.charges,
      amount: invoice.amount,
      issuedAt: settledAt,
      issuerName: manager ? manager.agency : owner.name,
      issuerRole: manager ? `Mandataire de ${owner.name}` : "Bailleur",
      verifyCode: makeVerifyCode(),
    };
    events.push({ id: uid("ev"), unitId: unit.id, type: "receipt_issued", at: settledAt, receiptId: receipt.id, text: "Quittance émise" });
  }

  return {
    payments: state.payments.map((p) => (p.id === paymentId ? { ...p, status: "succeeded", settledAt, receiptId: receipt?.id ?? null } : p)),
    invoices: state.invoices.map((i) => (i.id === invoice.id ? updatedInvoice : i)),
    receipts: receipt ? [...state.receipts, receipt] : state.receipts,
    events: [...state.events, ...events],
  };
}

const seed = () => ({ ...buildSeed(), theme: "light" as ThemePref });

export const useStore = create<State & Actions>()(
  persist(
    (set, get) => ({
      ...seed(),

      resetDemo: () => set({ ...seed(), theme: get().theme }),
      setTheme: (theme) => set({ theme }),

      async startPayment({ invoiceId, method, phone, amount, paymentId: givenId }) {
        const invoice = get().invoices.find((i) => i.id === invoiceId);
        if (!invoice) throw new Error("Échéance introuvable");
        const due = amount ?? invoice.amount - invoice.paid;
        const paymentId = givenId ?? uid("pay");
        const payment: Payment = {
          id: paymentId,
          invoiceId,
          unitId: invoice.unitId,
          tenantId: invoice.tenantId,
          amount: due,
          method,
          channel: "intouch",
          status: "initiated",
          providerRef: null,
          payerPhone: phone,
          createdAt: nowISO(),
          settledAt: null,
          receiptId: null,
        };
        set((s) => ({ payments: [...s.payments, payment] }));

        const patch = (p: Partial<Payment>) => set((s) => ({ payments: s.payments.map((x) => (x.id === paymentId ? { ...x, ...p } : x)) }));

        try {
          const res = await paymentGateway.initiate({
            reference: `${invoiceId}:${paymentId}`,
            amount: due,
            currency: "XOF",
            method,
            payerPhone: phone,
            description: `Loyer ${invoice.period}`,
            metadata: { invoiceId, unitId: invoice.unitId, tenantId: invoice.tenantId },
          });
          patch({ status: "pending", providerRef: res.transactionId });

          // Poll until the provider settles. In production the API receives
          // InTouch's callback and this poll simply reads our own record.
          for (let i = 0; i < 40; i++) {
            await new Promise((r) => setTimeout(r, 1100));
            const current = get().payments.find((p) => p.id === paymentId);
            if (!current || current.status === "cancelled" || current.status === "failed") return paymentId;
            const st = await paymentGateway.getStatus(res.transactionId);
            if (st.status === "SUCCESSFUL") {
              set((s) => settle(s, paymentId, st.settledAt ?? nowISO()));
              return paymentId;
            }
            if (st.status === "FAILED") {
              patch({ status: "failed", failureReason: st.failureReason });
              set((s) => ({
                events: [
                  ...s.events,
                  {
                    id: uid("ev"),
                    unitId: invoice.unitId,
                    type: "payment_failed",
                    at: nowISO(),
                    paymentId,
                    text: "Paiement échoué",
                    meta: { amount: due, method },
                  },
                ],
              }));
              return paymentId;
            }
          }
          patch({ status: "failed", failureReason: "Délai dépassé." });
        } catch {
          patch({ status: "failed", failureReason: "Connexion au service de paiement impossible." });
        }
        return paymentId;
      },

      cancelPayment(paymentId) {
        const p = get().payments.find((x) => x.id === paymentId);
        if (p?.providerRef) paymentGateway.cancel?.(p.providerRef);
        set((s) => ({
          payments: s.payments.map((x) =>
            x.id === paymentId && (x.status === "pending" || x.status === "initiated")
              ? { ...x, status: "cancelled", failureReason: "Paiement annulé." }
              : x,
          ),
        }));
      },

      recordManualPayment({ invoiceId, amount, method, actorId }) {
        const invoice = get().invoices.find((i) => i.id === invoiceId)!;
        const id = uid("pay");
        const at = nowISO();
        const payment: Payment = {
          id,
          invoiceId,
          unitId: invoice.unitId,
          tenantId: invoice.tenantId,
          amount: Math.min(amount, invoice.amount - invoice.paid),
          method,
          channel: "manual",
          status: "initiated",
          providerRef: method === "transfer" ? `VIR-${Math.floor(Math.random() * 9e7 + 1e7)}` : null,
          createdAt: at,
          settledAt: null,
          receiptId: null,
          recordedBy: actorId,
        };
        set((s) => ({ payments: [...s.payments, payment] }));
        set((s) => settle(s, id, at));
        return id;
      },

      confirmTransfer(paymentId, actorId) {
        set((s) => ({
          payments: s.payments.map((p) => (p.id === paymentId ? { ...p, recordedBy: actorId } : p)),
        }));
        set((s) => settle(s, paymentId, nowISO()));
      },

      sendReminder(unitId, channel, actorId) {
        set((s) => ({
          events: [
            ...s.events,
            {
              id: uid("ev"),
              unitId,
              type: "reminder_sent",
              at: nowISO(),
              actorId,
              text: `Relance envoyée par ${channel}`,
              meta: { channel },
            },
          ],
        }));
      },

      sendMessage({ threadId, authorId, role, body, attachments }) {
        const thread = get().threads.find((t) => t.id === threadId)!;
        const at = nowISO();
        const others: Role[] = (["owner", "manager", "tenant"] as Role[]).filter((r) => r !== role);
        set((s) => ({
          messages: [
            ...s.messages,
            { id: uid("msg"), threadId, unitId: thread.unitId, authorId, authorRole: role, body, createdAt: at, attachments },
          ],
          threads: s.threads.map((t) =>
            t.id === threadId ? { ...t, updatedAt: at, unreadBy: Array.from(new Set([...t.unreadBy.filter((r) => r !== role), ...others])) } : t,
          ),
        }));
      },

      startThread({ unitId, kind, subject, body, authorId, role, category, priority, attachments }) {
        const id = uid("th");
        const at = nowISO();
        const others: Role[] = (["owner", "manager", "tenant"] as Role[]).filter((r) => r !== role);
        const thread: Thread = {
          id,
          unitId,
          kind,
          subject,
          createdAt: at,
          updatedAt: at,
          createdBy: authorId,
          status: kind === "claim" ? "open" : undefined,
          category,
          priority,
          unreadBy: others,
        };
        set((s) => ({
          threads: [...s.threads, thread],
          messages: [...s.messages, { id: uid("msg"), threadId: id, unitId, authorId, authorRole: role, body, createdAt: at, attachments }],
          events:
            kind === "claim"
              ? [
                  ...s.events,
                  {
                    id: uid("ev"),
                    unitId,
                    type: "claim_opened",
                    at,
                    threadId: id,
                    actorId: authorId,
                    text: priority === "urgent" ? "Réclamation urgente ouverte" : "Réclamation ouverte",
                  },
                ]
              : s.events,
        }));
        return id;
      },

      setClaimStatus({ threadId, status, actorId, assignee, scheduledFor }) {
        const t = get().threads.find((x) => x.id === threadId)!;
        const at = nowISO();
        const text =
          status === "scheduled" && assignee
            ? `Intervention planifiée avec ${assignee}`
            : status === "in_progress" && assignee
              ? `Pris en charge par ${assignee}`
              : `Réclamation : ${claimStatusLabel[status].toLowerCase()}`;
        set((s) => ({
          threads: s.threads.map((x) =>
            x.id === threadId
              ? {
                  ...x,
                  status,
                  assignee: assignee ?? x.assignee,
                  scheduledFor: scheduledFor ?? x.scheduledFor,
                  updatedAt: at,
                  unreadBy: Array.from(new Set([...x.unreadBy, "tenant" as Role])).filter((r) => r !== roleOfActor(actorId)),
                }
              : x,
          ),
          events: [...s.events, { id: uid("ev"), unitId: t.unitId, type: "claim_status", at, threadId, actorId, text }],
        }));
      },

      markThreadRead(threadId, role) {
        const t = get().threads.find((x) => x.id === threadId);
        if (!t || !t.unreadBy.includes(role)) return;
        set((s) => ({
          threads: s.threads.map((x) => (x.id === threadId ? { ...x, unreadBy: x.unreadBy.filter((r) => r !== role) } : x)),
        }));
      },

      createProperty(draft, ownerId, managerId) {
        const id = uid("prop");
        const property: Property = {
          id,
          name: draft.name,
          kind: draft.kind,
          address: draft.address,
          district: draft.district,
          city: draft.city,
          ownerId,
          managerId,
          levels: draft.levels,
          bays: draft.bays,
          createdAt: nowISO(),
        };
        const units: Unit[] = draft.units.map((u) => ({
          id: `${id}_${u.code.replace(/[^A-Za-z0-9]/g, "")}`,
          propertyId: id,
          code: u.code,
          kind: u.kind,
          level: u.level,
          position: u.position,
          span: u.span,
          rooms: u.rooms,
          surface: u.surface,
          rent: u.rent,
          charges: u.charges,
          dueDay: 5,
          tenantId: null,
          lease: null,
        }));
        set((s) => ({
          properties: [...s.properties, property],
          units: [...s.units, ...units],
          entrances: draft.entrance === null ? s.entrances : { ...s.entrances, [id]: draft.entrance },
        }));
        return id;
      },

      updateUnitRent(unitId, rent, actorId) {
        const unit = get().units.find((u) => u.id === unitId)!;
        set((s) => ({
          units: s.units.map((u) => (u.id === unitId ? { ...u, rent } : u)),
          events: [
            ...s.events,
            {
              id: uid("ev"),
              unitId,
              type: "rent_changed",
              at: nowISO(),
              actorId,
              text: `Loyer révisé : ${fmtAmount(unit.rent)} → ${fmtAmount(rent)} FCFA`,
            },
          ],
        }));
      },
    }),
    {
      name: "bailly-demo-v1",
      version: 1,
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: () => (state) => {
        // Mock transactions live in memory: an in-flight payment cannot
        // survive a reload, so close it cleanly.
        if (!state) return;
        const stale = state.payments.some((p) => p.channel === "intouch" && (p.status === "pending" || p.status === "initiated"));
        if (stale) {
          useStore.setState({
            payments: state.payments.map((p) =>
              p.channel === "intouch" && (p.status === "pending" || p.status === "initiated")
                ? { ...p, status: "failed", failureReason: "Session interrompue avant validation." }
                : p,
            ),
          });
        }
      },
    },
  ),
);
