/*
  Mock dataset. Deterministic (seeded) and anchored on the demo clock so the
  story stays the same on every load:
    - Awa Gueye (locataire, Kër Diarra 203) owes October, due tomorrow.
    - A handful of tenants are late, one office paid partially, one bank
      transfer waits for confirmation, two leases end soon.
    - Claims and conversations are attached to specific units.
*/
import type {
  Invoice,
  Manager,
  Message,
  Owner,
  Payment,
  PaymentMethod,
  Property,
  Receipt,
  Tenant,
  Thread,
  Unit,
  UnitEvent,
  UnitKind,
} from "@/domain/types";
import { addDays, addMonths, currentPeriod, now, periodToDate, shiftPeriod, today } from "@/lib/clock";
import { createRng } from "@/lib/rng";

export interface Dataset {
  owners: Owner[];
  managers: Manager[];
  tenants: Tenant[];
  properties: Property[];
  units: Unit[];
  invoices: Invoice[];
  payments: Payment[];
  receipts: Receipt[];
  threads: Thread[];
  messages: Message[];
  events: UnitEvent[];
  entrances: Record<string, number>;
}

export const DEMO_OWNER_ID = "own_mds";
export const DEMO_MANAGER_ID = "mgr_akn";
export const DEMO_TENANT_ID = "ten_awa";

const owners: Owner[] = [
  { id: "own_mds", name: "Mame Diarra Sow", phone: "+221774123890", email: "mamediarra.sow@orange.sn" },
  { id: "own_filaos", name: "SCI Les Filaos", phone: "+221338217745", company: "SCI Les Filaos" },
  { id: "own_pmd", name: "Pape Malick Diouf", phone: "+221766017732" },
];

const managers: Manager[] = [
  {
    id: "mgr_akn",
    name: "Abdou Karim Ndoye",
    phone: "+221781204417",
    email: "ak.ndoye@cabinetndoye.sn",
    agency: "Cabinet Ndoye Immobilier",
  },
];

const FIRST = [
  "Moussa",
  "Fatou",
  "Ibrahima",
  "Khady",
  "Ousmane",
  "Aminata",
  "Cheikh",
  "Mariama",
  "Abdoulaye",
  "Ndeye Fatou",
  "Babacar",
  "Seynabou",
  "Lamine",
  "Coumba",
  "Modou",
  "Astou",
  "Serigne",
  "Rokhaya",
  "Mamadou",
  "Bineta",
  "El Hadji",
  "Dieynaba",
  "Saliou",
  "Yacine",
  "Alassane",
  "Oumy",
  "Souleymane",
  "Marième",
  "Thierno",
  "Nafissatou",
  "Malick",
  "Sokhna",
  "Youssou",
  "Penda",
  "Assane",
  "Arame",
];
const LAST = [
  "Diallo",
  "Ndiaye",
  "Fall",
  "Sarr",
  "Ba",
  "Mbaye",
  "Cissé",
  "Diop",
  "Seck",
  "Thiam",
  "Kane",
  "Faye",
  "Ndao",
  "Sy",
  "Wade",
  "Camara",
  "Diagne",
  "Touré",
  "Niang",
  "Sall",
  "Ly",
  "Kébé",
  "Mbodj",
  "Badji",
  "Sène",
  "Tall",
  "Gaye",
  "Dieng",
];
const PROFESSIONS = [
  "Enseignante",
  "Comptable",
  "Ingénieur télécom",
  "Infirmière",
  "Juriste",
  "Commerçant",
  "Développeur",
  "Médecin",
  "Chargée de communication",
  "Banquier",
  "Architecte",
  "Consultante",
];
const BUSINESSES: Record<"boutique" | "magasin" | "bureau", string[]> = {
  boutique: [
    "Optique Mermoz",
    "Pressing Le Fil d'Or",
    "Boulangerie Yaatal",
    "Atelier Couture Nafi",
    "Librairie Clair de Plume",
    "Salon Adja Beauté",
    "Téléphonie Keur Massar",
    "Pharmacie Liberté 6",
    "Café Toubab Dialaw",
  ],
  magasin: ["Quincaillerie Touba Plateau", "Dépôt Sénégal Carreaux"],
  bureau: [
    "Cabinet Diagne & Ly Avocats",
    "Sunu Assurances Conseil",
    "Kaay Studio Digital",
    "Expertise Comptable Mbodj",
    "Agence Teranga Voyages",
    "Cabinet Dentaire Dr Sy",
  ],
};

interface UnitSpec {
  code: string;
  kind: UnitKind;
  level: number;
  position: number;
  span?: number;
  rooms?: number;
  surface: number;
  rent: number;
  charges?: number;
  dueDay?: number;
  vacant?: boolean;
  script?: Script;
  leaseEndsInDays?: number;
  tenantId?: string;
}

type Script =
  | "awa"
  | "late-two-months-partial"
  | "late-october"
  | "partial-october"
  | "late-september"
  | "partial-september"
  | "late-two-months"
  | "transfer-pending";

interface PropertySpec {
  property: Omit<Property, "createdAt">;
  entrance?: number;
  units: UnitSpec[];
}

function grid(
  levels: number[],
  perFloor: number,
  make: (level: number, i: number) => Partial<UnitSpec> & Pick<UnitSpec, "rent" | "surface">,
): UnitSpec[] {
  const out: UnitSpec[] = [];
  for (const level of levels) {
    for (let i = 0; i < perFloor; i++) {
      const extra = make(level, i);
      out.push({
        code: `${level}0${i + 1}`,
        kind: "appartement",
        level,
        position: i,
        ...extra,
      } as UnitSpec);
    }
  }
  return out;
}

const specs: PropertySpec[] = [
  {
    property: {
      id: "prop_kd",
      name: "Résidence Kër Diarra",
      kind: "immeuble",
      address: "Rue MZ-74, Mermoz",
      district: "Mermoz",
      city: "Dakar",
      ownerId: "own_mds",
      managerId: "mgr_akn",
      levels: 5,
      bays: 3,
      builtYear: 2016,
    },
    entrance: 1,
    units: [
      { code: "B-01", kind: "boutique", level: 0, position: 0, surface: 38, rent: 220000, charges: 10000 },
      { code: "B-02", kind: "boutique", level: 0, position: 2, surface: 44, rent: 260000, charges: 10000 },
      ...grid([1, 2, 3, 4], 3, (level, i) => ({
        rooms: i === 1 ? 2 : 3,
        surface: i === 1 ? 64 : 86,
        rent: level === 4 ? (i === 1 ? 300000 : 380000) : i === 1 ? 240000 : 285000 + (level - 1) * 5000,
        charges: 15000,
        vacant: level === 4 && i === 0,
        script: level === 2 && i === 2 ? "awa" : level === 1 && i === 1 ? "late-two-months-partial" : undefined,
        leaseEndsInDays: level === 3 && i === 0 ? 41 : undefined,
        tenantId: level === 2 && i === 2 ? "ten_awa" : undefined,
      })),
    ],
  },
  {
    property: {
      id: "prop_bb",
      name: "Immeuble Le Baobab",
      kind: "mixte",
      address: "47, rue Carnot, Plateau",
      district: "Plateau",
      city: "Dakar",
      ownerId: "own_mds",
      managerId: "mgr_akn",
      levels: 6,
      bays: 4,
      builtYear: 2009,
    },
    entrance: 2,
    units: [
      { code: "B-01", kind: "magasin", level: 0, position: 0, span: 2, surface: 96, rent: 540000, charges: 20000, dueDay: 1 },
      { code: "B-02", kind: "boutique", level: 0, position: 3, surface: 41, rent: 380000, charges: 15000, dueDay: 1, script: "late-october" },
      {
        code: "101",
        kind: "bureau",
        level: 1,
        position: 0,
        span: 2,
        surface: 120,
        rent: 650000,
        charges: 35000,
        dueDay: 1,
        script: "transfer-pending",
      },
      { code: "102", kind: "bureau", level: 1, position: 2, span: 2, surface: 118, rent: 650000, charges: 35000, dueDay: 1 },
      {
        code: "201",
        kind: "bureau",
        level: 2,
        position: 0,
        span: 2,
        surface: 132,
        rent: 720000,
        charges: 35000,
        dueDay: 1,
        script: "partial-october",
      },
      { code: "202", kind: "bureau", level: 2, position: 2, span: 2, surface: 110, rent: 620000, charges: 35000, dueDay: 1 },
      ...[3, 4, 5].flatMap((level) =>
        [0, 1].map<UnitSpec>((i) => ({
          code: `${level}0${i + 1}`,
          kind: "appartement",
          level,
          position: i * 2,
          span: 2,
          rooms: 4,
          surface: 128,
          rent: 450000 + (level - 3) * 25000,
          charges: 25000,
          vacant: level === 5 && i === 1,
        })),
      ),
    ],
  },
  {
    property: {
      id: "prop_va",
      name: "Villa Almadies",
      kind: "villa",
      address: "Route des Almadies, lot 112",
      district: "Ngor-Almadies",
      city: "Dakar",
      ownerId: "own_mds",
      managerId: null,
      levels: 2,
      bays: 2,
      builtYear: 2019,
    },
    units: [
      { code: "A", kind: "appartement", level: 0, position: 0, span: 2, rooms: 5, surface: 210, rent: 950000, charges: 0, dueDay: 3 },
      { code: "B", kind: "appartement", level: 1, position: 0, rooms: 3, surface: 105, rent: 720000, charges: 0, dueDay: 3 },
      { code: "C", kind: "studio", level: 1, position: 1, rooms: 1, surface: 34, rent: 260000, charges: 0, dueDay: 3 },
    ],
  },
  {
    property: {
      id: "prop_sc",
      name: "Résidence Sacré-Cœur 3",
      kind: "immeuble",
      address: "Villa 8841, Sacré-Cœur 3",
      district: "Sacré-Cœur",
      city: "Dakar",
      ownerId: "own_filaos",
      managerId: "mgr_akn",
      levels: 4,
      bays: 2,
      builtYear: 2012,
    },
    units: [0, 1, 2, 3].flatMap((level) =>
      [0, 1].map<UnitSpec>((i) => ({
        code: `${level}${i === 0 ? "A" : "B"}`,
        kind: "appartement",
        level,
        position: i,
        rooms: 2,
        surface: 58,
        rent: 210000 + level * 10000,
        charges: 10000,
        script: level === 1 && i === 0 ? "late-september" : level === 2 && i === 1 ? "partial-september" : undefined,
        leaseEndsInDays: level === 3 && i === 1 ? 24 : undefined,
      })),
    ),
  },
  {
    property: {
      id: "prop_l6",
      name: "Centre Liberté 6",
      kind: "commercial",
      address: "Rond-point Liberté 6, VDN",
      district: "Liberté 6",
      city: "Dakar",
      ownerId: "own_pmd",
      managerId: "mgr_akn",
      levels: 2,
      bays: 5,
      builtYear: 2014,
    },
    units: [
      ...[0, 1, 2, 3, 4].map<UnitSpec>((i) => ({
        code: `B-0${i + 1}`,
        kind: "boutique",
        level: 0,
        position: i,
        surface: 32 + i * 3,
        rent: 175000 + (i % 2) * 25000,
        charges: 10000,
        dueDay: 1,
        script: i === 3 ? "late-two-months" : undefined,
      })),
      { code: "E-01", kind: "bureau", level: 1, position: 0, span: 2, surface: 74, rent: 390000, charges: 20000, dueDay: 1 },
      { code: "E-02", kind: "bureau", level: 1, position: 2, surface: 36, rent: 210000, charges: 15000, dueDay: 1, vacant: true },
      { code: "E-03", kind: "bureau", level: 1, position: 3, span: 2, surface: 70, rent: 380000, charges: 20000, dueDay: 1 },
    ],
  },
];

function iso(d: Date, hour = 10, minute = 0): string {
  const x = new Date(d);
  x.setHours(hour, minute, 0, 0);
  return x.toISOString();
}

function verifyCode(rng: ReturnType<typeof createRng>): string {
  const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 6 }, () => rng.pick(alphabet.split(""))).join("");
}

export function buildSeed(): Dataset {
  const rng = createRng(221);
  const T = today();
  const nowPeriod = currentPeriod();

  const tenants: Tenant[] = [
    {
      id: "ten_awa",
      name: "Awa Gueye",
      phone: "+221776542109",
      email: "awa.gueye@gmail.com",
      profession: "Pharmacienne",
    },
  ];
  const usedNames = new Set(["Awa Gueye"]);
  const businessPool = {
    boutique: [...BUSINESSES.boutique],
    magasin: [...BUSINESSES.magasin],
    bureau: [...BUSINESSES.bureau],
  };

  const properties: Property[] = [];
  const units: Unit[] = [];
  const invoices: Invoice[] = [];
  const payments: Payment[] = [];
  const receipts: Receipt[] = [];
  const events: UnitEvent[] = [];
  const entrances: Record<string, number> = {};
  const scripts: Record<string, Script | undefined> = {};

  let receiptSeq = 1180;
  let evSeq = 0;
  const ev = (e: Omit<UnitEvent, "id">) => events.push({ id: `ev_${++evSeq}`, ...e });

  for (const spec of specs) {
    const createdAt = iso(addMonths(T, -rng.int(14, 30)));
    properties.push({ ...spec.property, createdAt });
    if (spec.entrance !== undefined) entrances[spec.property.id] = spec.entrance;

    for (const u of spec.units) {
      const unitId = `${spec.property.id}_${u.code.replace(/[^A-Za-z0-9]/g, "")}`;
      scripts[unitId] = u.script;
      let tenantId: string | null = null;
      let lease: Unit["lease"] = null;

      if (!u.vacant) {
        if (u.tenantId) {
          tenantId = u.tenantId;
        } else {
          const isBusiness = u.kind !== "appartement" && u.kind !== "studio";
          let name: string;
          if (isBusiness && businessPool[u.kind as keyof typeof businessPool].length) {
            name = businessPool[u.kind as keyof typeof businessPool].shift()!;
          } else {
            do {
              name = `${rng.pick(FIRST)} ${rng.pick(LAST)}`;
            } while (usedNames.has(name));
          }
          usedNames.add(name);
          tenantId = `ten_${unitId}`;
          tenants.push({
            id: tenantId,
            name,
            phone: `+22177${rng.int(1000000, 9999999)}`,
            profession: isBusiness ? undefined : rng.pick(PROFESSIONS),
          });
        }
        const monthsAgo = u.script === "awa" ? 26 : rng.int(5, 40);
        const start = addMonths(periodToDate(nowPeriod, 1), -monthsAgo);
        let end = addMonths(start, 12);
        while (end < addDays(T, 75)) end = addMonths(end, 12); // tacit yearly renewal
        if (u.leaseEndsInDays) end = addDays(T, u.leaseEndsInDays);
        lease = { start: iso(start), end: iso(end), deposit: (u.rent + (u.charges ?? 0)) * 2 };
        ev({ unitId, type: "lease_signed", at: iso(addDays(start, -6), 11), text: "Bail signé" });
      }

      const unit: Unit = {
        id: unitId,
        propertyId: spec.property.id,
        code: u.code,
        kind: u.kind,
        level: u.level,
        position: u.position,
        span: u.span ?? 1,
        rooms: u.rooms,
        surface: u.surface,
        rent: u.rent,
        charges: u.charges ?? 0,
        dueDay: u.dueDay ?? 5,
        tenantId,
        lease,
      };
      units.push(unit);
      if (!tenantId || !lease) continue;

      // Invoices for the last 12 periods (or since lease start).
      const isBiz = unit.kind === "bureau" || unit.kind === "magasin";
      const profile = u.script === "awa" ? "ponctuel" : rng.chance(0.72) ? "ponctuel" : "tardif";
      const issuer = spec.property.managerId
        ? { name: "Cabinet Ndoye Immobilier", role: `Mandataire de ${owners.find((o) => o.id === spec.property.ownerId)!.name}` }
        : { name: owners.find((o) => o.id === spec.property.ownerId)!.name, role: "Bailleur" };

      for (let back = 11; back >= 0; back--) {
        const period = shiftPeriod(nowPeriod, -back);
        if (periodToDate(period, 28) < new Date(lease.start)) continue;
        const due = periodToDate(period, unit.dueDay);
        const inv: Invoice = {
          id: `inv_${unitId}_${period}`,
          unitId,
          tenantId,
          period,
          rent: unit.rent,
          charges: unit.charges,
          amount: unit.rent + unit.charges,
          dueDate: iso(due, 23, 59),
          paid: 0,
          paidAt: null,
        };
        invoices.push(inv);

        // Decide how this period was paid.
        let payDate: Date | null = profile === "ponctuel" ? addDays(due, rng.int(-4, 2)) : addDays(due, rng.int(3, 14));
        if (back === 0) {
          // Current month: most tenants pay early in the month in Dakar.
          payDate = profile === "ponctuel" ? addDays(due, rng.int(-6, 0)) : unit.dueDay <= 3 ? addDays(due, rng.int(0, 2)) : null;
        }
        let payAmount = inv.amount;
        let method: PaymentMethod = isBiz
          ? rng.pick<PaymentMethod>(["transfer", "transfer", "wave", "orange_money"])
          : rng.pick<PaymentMethod>(["wave", "wave", "wave", "orange_money", "orange_money", "free_money", "cash", "card"]);
        let pendingTransfer = false;

        const s = u.script;
        if (s === "awa") {
          method = back % 3 === 1 ? "orange_money" : "wave";
          payDate = addDays(due, -rng.int(1, 3));
          if (back === 0) payDate = null;
        }
        if (s === "late-two-months-partial") {
          if (back === 2) payAmount = 150000;
          if (back === 1 || back === 0) payDate = null;
        }
        if (s === "late-october" && back === 0) payDate = null;
        if (s === "partial-october" && back === 0) {
          payAmount = 400000;
          payDate = addDays(due, 1);
          method = "transfer";
        }
        if (s === "late-september" && back <= 1) payDate = null;
        if (s === "partial-september") {
          if (back === 1) {
            payAmount = 120000;
            payDate = addDays(due, 6);
          }
          if (back === 0) payDate = null;
        }
        if (s === "late-two-months" && back <= 1) payDate = null;
        if (s === "transfer-pending" && back === 0) {
          pendingTransfer = true;
          method = "transfer";
          payDate = addDays(T, -1);
        }

        if (!payDate || payDate > T) continue;

        const payId = `pay_${unitId}_${period}`;
        const channel = method === "cash" || method === "transfer" ? "manual" : "intouch";
        let settledAt = iso(payDate, rng.int(8, 20), rng.int(0, 59));
        // Never in the future relative to the demo clock.
        if (new Date(settledAt) > now()) settledAt = new Date(now().getTime() - rng.int(25, 180) * 60_000).toISOString();
        const payment: Payment = {
          id: payId,
          invoiceId: inv.id,
          unitId,
          tenantId,
          amount: payAmount,
          method,
          channel,
          status: pendingTransfer ? "pending" : "succeeded",
          providerRef:
            channel === "intouch"
              ? `ITX${period.replace("-", "")}${rng.int(100000, 999999)}`
              : method === "transfer"
                ? `VIR-${rng.int(10000000, 99999999)}`
                : null,
          payerPhone: channel === "intouch" ? tenants.find((t) => t.id === tenantId)?.phone : undefined,
          createdAt: settledAt,
          settledAt: pendingTransfer ? null : settledAt,
          receiptId: null,
          recordedBy: channel === "manual" ? (spec.property.managerId ?? spec.property.ownerId) : undefined,
        };
        payments.push(payment);
        if (pendingTransfer) continue;

        inv.paid = payAmount;
        ev({
          unitId,
          type: "payment_received",
          at: settledAt,
          paymentId: payId,
          text: "Paiement reçu",
          meta: { amount: payAmount, method },
        });
        if (payAmount >= inv.amount) {
          inv.paidAt = settledAt;
          const rId = `rcp_${unitId}_${period}`;
          receiptSeq++;
          receipts.push({
            id: rId,
            number: `Q-${period.replace("-", "")}-${String(receiptSeq).padStart(5, "0")}`,
            invoiceId: inv.id,
            paymentIds: [payId],
            unitId,
            tenantId,
            propertyId: spec.property.id,
            period,
            rent: inv.rent,
            charges: inv.charges,
            amount: inv.amount,
            issuedAt: settledAt,
            issuerName: issuer.name,
            issuerRole: issuer.role,
            verifyCode: verifyCode(rng),
          });
          payment.receiptId = rId;
          ev({ unitId, type: "receipt_issued", at: settledAt, receiptId: rId, text: "Quittance émise" });
        }
      }
    }
  }

  // Reminders sent on late units.
  const reminder = (unitId: string, daysAgo: number, channel: string) =>
    ev({
      unitId,
      type: "reminder_sent",
      at: iso(addDays(T, -daysAgo), 9, 15),
      actorId: DEMO_MANAGER_ID,
      text: `Relance envoyée par ${channel}`,
      meta: { channel },
    });
  reminder("prop_kd_102", 24, "SMS");
  reminder("prop_kd_102", 14, "WhatsApp");
  reminder("prop_kd_102", 3, "WhatsApp");
  reminder("prop_l6_B04", 19, "SMS");
  reminder("prop_l6_B04", 2, "WhatsApp");
  reminder("prop_sc_1A", 9, "SMS");

  // Threads and messages.
  const threads: Thread[] = [];
  const messages: Message[] = [];
  let msgSeq = 0;
  const at = (daysAgo: number, h: number, m = 0) => iso(addDays(T, -daysAgo), h, m);
  const thread = (t: Thread, msgs: Array<Omit<Message, "id" | "threadId" | "unitId">>) => {
    threads.push(t);
    for (const m of msgs) messages.push({ id: `msg_${++msgSeq}`, threadId: t.id, unitId: t.unitId, ...m });
  };
  const tenantOf = (unitId: string) => units.find((u) => u.id === unitId)!.tenantId!;

  thread(
    {
      id: "th_awa_fuite",
      unitId: "prop_kd_203",
      kind: "claim",
      subject: "Fuite sous l'évier de la cuisine",
      category: "plomberie",
      priority: "normal",
      status: "scheduled",
      assignee: "Plomberie Diop & Fils",
      scheduledFor: iso(addDays(T, 2), 10),
      createdAt: at(4, 19, 42),
      updatedAt: at(2, 11, 5),
      createdBy: "ten_awa",
      unreadBy: [],
    },
    [
      {
        authorId: "ten_awa",
        authorRole: "tenant",
        body: "Bonjour, il y a une fuite sous l'évier depuis hier soir. L'eau coule dans le placard, j'ai coupé l'arrivée en attendant.",
        createdAt: at(4, 19, 42),
        attachments: [{ name: "evier-cuisine.jpg", kind: "photo", tone: "#7c8f86" }],
      },
      {
        authorId: DEMO_MANAGER_ID,
        authorRole: "manager",
        body: "Bonsoir Madame Gueye, merci pour la photo. Je contacte notre plombier dès demain matin.",
        createdAt: at(4, 20, 18),
      },
      {
        authorId: DEMO_MANAGER_ID,
        authorRole: "manager",
        body: "Le plombier passera lundi à 10h. Pouvez-vous être présente ou laisser les clés au gardien ?",
        createdAt: at(2, 10, 52),
      },
      {
        authorId: "ten_awa",
        authorRole: "tenant",
        body: "Je serai là lundi matin. Merci beaucoup.",
        createdAt: at(2, 11, 5),
      },
    ],
  );
  ev({ unitId: "prop_kd_203", type: "claim_opened", at: at(4, 19, 42), threadId: "th_awa_fuite", text: "Réclamation ouverte : plomberie" });
  ev({
    unitId: "prop_kd_203",
    type: "claim_status",
    at: at(2, 10, 50),
    threadId: "th_awa_fuite",
    text: "Intervention planifiée avec Plomberie Diop & Fils",
  });

  thread(
    {
      id: "th_awa_quittance",
      unitId: "prop_kd_203",
      kind: "message",
      subject: "Attestation de logement",
      createdAt: at(12, 9, 10),
      updatedAt: at(11, 16, 30),
      createdBy: "ten_awa",
      unreadBy: [],
    },
    [
      {
        authorId: "ten_awa",
        authorRole: "tenant",
        body: "Bonjour Monsieur Ndoye, pourriez-vous me faire une attestation de logement ? C'est pour un dossier à la banque.",
        createdAt: at(12, 9, 10),
      },
      {
        authorId: DEMO_MANAGER_ID,
        authorRole: "manager",
        body: "Bonjour Madame Gueye, voici l'attestation signée. Vos quittances des 12 derniers mois sont aussi dans l'application.",
        createdAt: at(11, 16, 30),
        attachments: [{ name: "attestation-logement-203.pdf", kind: "pdf" }],
      },
    ],
  );

  thread(
    {
      id: "th_kd102_retard",
      unitId: "prop_kd_102",
      kind: "message",
      subject: "Loyers d'août et septembre",
      createdAt: at(24, 9, 15),
      updatedAt: at(1, 21, 4),
      createdBy: DEMO_MANAGER_ID,
      unreadBy: ["manager", "owner"],
    },
    [
      {
        authorId: DEMO_MANAGER_ID,
        authorRole: "manager",
        body: "Bonjour Monsieur, il reste un solde sur août et le loyer de septembre n'est pas réglé. Merci de nous indiquer une date.",
        createdAt: at(14, 9, 20),
      },
      {
        authorId: tenantOf("prop_kd_102"),
        authorRole: "tenant",
        body: "Bonsoir, toutes mes excuses. Mon salaire a été versé en retard ce mois-ci. Je règle septembre d'ici le 10 octobre et le reste d'août avec octobre.",
        createdAt: at(1, 21, 4),
      },
    ],
  );

  thread(
    {
      id: "th_bb_rideau",
      unitId: "prop_bb_B02",
      kind: "claim",
      subject: "Rideau métallique bloqué en position fermée",
      category: "serrurerie",
      priority: "urgent",
      status: "open",
      createdAt: at(0, 8, 41),
      updatedAt: at(0, 8, 41),
      createdBy: tenantOf("prop_bb_B02"),
      unreadBy: ["manager"],
    },
    [
      {
        authorId: tenantOf("prop_bb_B02"),
        authorRole: "tenant",
        body: "Le rideau ne remonte plus depuis ce matin, impossible d'ouvrir la boutique. Pouvez-vous envoyer quelqu'un rapidement ?",
        createdAt: at(0, 8, 41),
        attachments: [{ name: "rideau.jpg", kind: "photo", tone: "#8a8f8c" }],
      },
    ],
  );
  ev({ unitId: "prop_bb_B02", type: "claim_opened", at: at(0, 8, 41), threadId: "th_bb_rideau", text: "Réclamation urgente : serrurerie" });

  thread(
    {
      id: "th_bb_ascenseur",
      unitId: "prop_bb_301",
      kind: "claim",
      subject: "Ascenseur à l'arrêt depuis samedi",
      category: "parties_communes",
      priority: "urgent",
      status: "in_progress",
      assignee: "Otis Sénégal",
      createdAt: at(2, 18, 12),
      updatedAt: at(1, 9, 30),
      createdBy: tenantOf("prop_bb_301"),
      unreadBy: [],
    },
    [
      {
        authorId: tenantOf("prop_bb_301"),
        authorRole: "tenant",
        body: "L'ascenseur est bloqué au 2e étage depuis samedi après-midi. Plusieurs voisins sont concernés.",
        createdAt: at(2, 18, 12),
      },
      {
        authorId: DEMO_MANAGER_ID,
        authorRole: "manager",
        body: "Le technicien est passé ce matin, une pièce est commandée. Remise en service prévue jeudi.",
        createdAt: at(1, 9, 30),
      },
    ],
  );

  thread(
    {
      id: "th_sc_infiltration",
      unitId: "prop_sc_3A",
      kind: "claim",
      subject: "Infiltration au plafond de la salle de bain",
      category: "humidite",
      priority: "normal",
      status: "in_progress",
      assignee: "Étanchéité Services Dakar",
      createdAt: at(9, 14, 3),
      updatedAt: at(5, 12, 0),
      createdBy: tenantOf("prop_sc_3A"),
      unreadBy: [],
    },
    [
      {
        authorId: tenantOf("prop_sc_3A"),
        authorRole: "tenant",
        body: "Une tache d'humidité s'agrandit au plafond de la salle de bain depuis les dernières pluies.",
        createdAt: at(9, 14, 3),
        attachments: [{ name: "plafond-sdb.jpg", kind: "photo", tone: "#9aa49e" }],
      },
      {
        authorId: DEMO_MANAGER_ID,
        authorRole: "manager",
        body: "L'entreprise d'étanchéité intervient sur la terrasse cette semaine. Nous reprendrons la peinture ensuite.",
        createdAt: at(5, 12, 0),
      },
    ],
  );

  thread(
    {
      id: "th_kd_clim",
      unitId: "prop_kd_B01",
      kind: "claim",
      subject: "Climatisation en panne",
      category: "climatisation",
      priority: "normal",
      status: "resolved",
      assignee: "Froid Service Mermoz",
      createdAt: at(26, 11, 0),
      updatedAt: at(21, 17, 20),
      createdBy: tenantOf("prop_kd_B01"),
      unreadBy: [],
    },
    [
      {
        authorId: tenantOf("prop_kd_B01"),
        authorRole: "tenant",
        body: "La climatisation de la boutique ne refroidit plus.",
        createdAt: at(26, 11, 0),
      },
      {
        authorId: DEMO_MANAGER_ID,
        authorRole: "manager",
        body: "Recharge de gaz effectuée par Froid Service. Tout fonctionne, je clôture la demande.",
        createdAt: at(21, 17, 20),
      },
    ],
  );

  thread(
    {
      id: "th_l6_b04",
      unitId: "prop_l6_B04",
      kind: "message",
      subject: "Loyers en attente",
      createdAt: at(19, 9, 15),
      updatedAt: at(2, 9, 15),
      createdBy: DEMO_MANAGER_ID,
      unreadBy: [],
    },
    [
      {
        authorId: DEMO_MANAGER_ID,
        authorRole: "manager",
        body: "Bonjour, les loyers de septembre et d'octobre restent impayés. Merci de régulariser ou de me contacter pour un échéancier.",
        createdAt: at(2, 9, 15),
      },
    ],
  );

  thread(
    {
      id: "th_va_jardin",
      unitId: "prop_va_B",
      kind: "message",
      subject: "Entretien du jardin",
      createdAt: at(0, 7, 55),
      updatedAt: at(0, 7, 55),
      createdBy: tenantOf("prop_va_B"),
      unreadBy: ["owner"],
    },
    [
      {
        authorId: tenantOf("prop_va_B"),
        authorRole: "tenant",
        body: "Bonjour Madame Sow, le jardinier peut-il passer samedi ? Les bougainvilliers débordent sur l'allée.",
        createdAt: at(0, 7, 55),
      },
    ],
  );

  return {
    owners,
    managers,
    tenants,
    properties,
    units,
    invoices,
    payments,
    receipts,
    threads,
    messages,
    events,
    entrances,
  };
}
