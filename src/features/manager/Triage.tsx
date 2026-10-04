import {
  ArrowSquareOut,
  Bank,
  BellRinging,
  ChatCircleDots,
  CheckCircle,
  Phone,
  Plus,
  Wrench,
  CalendarCheck,
  ArrowsClockwise,
  ChatText,
  Coins,
} from "@phosphor-icons/react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useMemo, useState } from "react";
import { Facade } from "@/components/facade/Facade";
import { UnitJournal } from "@/components/journal/UnitJournal";
import { ClaimPanel } from "@/components/journal/ClaimPanel";
import { RecordPaymentModal } from "@/components/actions/RecordPaymentModal";
import { ReminderModal } from "@/components/actions/ReminderModal";
import { Avatar } from "@/components/ui/Avatar";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Kbd, Panel } from "@/components/ui/Panel";
import { Money } from "@/components/ui/Money";
import { toast } from "@/components/ui/Toast";
import { useData } from "@/hooks/useData";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { Sheet } from "@/components/ui/Overlay";
import { useStore } from "@/store/store";
import { DEMO_MANAGER_ID } from "@/data/seed";
import {
  attentionItems,
  daysLate,
  invoiceToPay,
  managedPropertyIds,
  overdueInvoices,
  propertyUnits,
  unitState,
  type AttentionItem,
  type AttentionKind,
} from "@/domain/selectors";
import { levelLabel, unitTitle } from "@/domain/labels";
import { now, nowISO } from "@/lib/clock";
import { compact, dateLong, fcfa, periodLabel, phone, relativeDay } from "@/lib/format";
import { cn } from "@/lib/cn";

const kindMeta: Record<AttentionKind, { label: string; icon: React.ReactNode; bar: string }> = {
  late: { label: "Impayé", icon: <Coins size={15} />, bar: "bg-signal" },
  partial: { label: "Partiel", icon: <Coins size={15} />, bar: "bg-amber" },
  transfer: { label: "Virement", icon: <Bank size={15} />, bar: "bg-emerald-bright" },
  claim: { label: "Réclamation", icon: <Wrench size={15} />, bar: "bg-signal" },
  message: { label: "Message", icon: <ChatText size={15} />, bar: "bg-forest-3" },
  lease: { label: "Bail", icon: <CalendarCheck size={15} />, bar: "bg-amber" },
  vacant: { label: "Vacant", icon: <Plus size={15} />, bar: "bg-line-strong" },
};

type Filter = "all" | "money" | "claim" | "transfer" | "message" | "lease";

const SESSION_START = nowISO();

export function Triage() {
  const d = useData();
  const ids = managedPropertyIds(d, DEMO_MANAGER_ID);
  const manager = d.managers.find((m) => m.id === DEMO_MANAGER_ID)!;
  const all = useMemo(() => attentionItems(d, ids, "manager").filter((i) => i.kind !== "vacant"), [d]); // eslint-disable-line react-hooks/exhaustive-deps
  const [filter, setFilter] = useState<Filter>("all");
  const [building, setBuilding] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  // Actions taken since the page was opened: reminders, payments, claim updates.
  const handled = d.events.filter(
    (e) =>
      e.at >= SESSION_START &&
      (e.type === "reminder_sent" || e.type === "payment_received" || e.type === "claim_status") &&
      ids.includes(d.units.find((u) => u.id === e.unitId)?.propertyId ?? ""),
  ).length;

  const items = all.filter((i) => {
    const u = d.units.find((x) => x.id === i.unitId)!;
    if (building && u.propertyId !== building) return false;
    if (filter === "all") return true;
    if (filter === "money") return i.kind === "late" || i.kind === "partial";
    return i.kind === filter;
  });

  const desktop = useMediaQuery("(min-width: 1024px)");
  const selected = items.find((i) => i.id === selectedId) ?? (desktop ? items[0] : undefined);

  // Keyboard: j/k or arrows to move through the queue.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.closest("input, textarea, [role=dialog]")) return;
      const idx = items.findIndex((i) => i.id === selected?.id);
      if (e.key === "j" || e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedId(items[Math.min(items.length - 1, idx + 1)]?.id ?? null);
      } else if (e.key === "k" || e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedId(items[Math.max(0, idx - 1)]?.id ?? null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [items, selected]);

  const owedTotal = all.filter((i) => i.kind === "late" || i.kind === "partial").reduce((s, i) => s + (i.amount ?? 0), 0);
  const count = (f: Filter) =>
    all.filter((i) => (f === "all" ? true : f === "money" ? i.kind === "late" || i.kind === "partial" : i.kind === f)).length;
  const today = now().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });

  return (
    <main className="px-4 pb-10 pt-6 md:px-8">
      <header className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="text-[13px] text-ink-3 first-letter:uppercase">{today}</p>
          <h1 className="type-display mt-1 text-[34px] font-semibold md:text-[40px]">
            {all.length ? `${all.length} points à traiter` : "Tout est traité"}
          </h1>
          <p className="mt-1 text-[14px] text-ink-3">
            {compact(owedTotal)} FCFA à recouvrer sur {ids.length} immeubles
            {handled > 0 && (
              <span className="text-emerald">
                , {handled} action{handled > 1 ? "s" : ""} faite{handled > 1 ? "s" : ""} aujourd'hui
              </span>
            )}
          </p>
        </div>
        <div className="flex items-end gap-3">
          {d.properties
            .filter((p) => ids.includes(p.id))
            .map((p) => {
              const attention = new Set(all.map((i) => i.unitId));
              const n = all.filter((i) => d.units.find((u) => u.id === i.unitId)?.propertyId === p.id).length;
              const active = building === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => setBuilding(active ? null : p.id)}
                  className={cn(
                    "group flex flex-col items-center gap-1.5 rounded-[14px] px-2.5 pb-2 pt-3 transition-colors",
                    active ? "bg-surface ring-1 ring-ink" : "hover:bg-surface",
                  )}
                  title={p.name}
                >
                  <div style={{ width: 22 + p.bays * 9 }}>
                    <Facade
                      property={p}
                      units={propertyUnits(d, p.id)}
                      stateOf={(u) => unitState(d, u)}
                      cellClass={(u) => (attention.has(u.id) ? (unitState(d, u) === "late" ? "bg-signal" : "bg-amber") : "bg-line-strong/50")}
                      size="xs"
                      animate={false}
                    />
                  </div>
                  <span className="max-w-[86px] truncate text-[11.5px] text-ink-3">
                    {p.name.replace("Résidence ", "").replace("Immeuble ", "").replace("Centre ", "")}
                  </span>
                  <span className="num -mt-1 text-[12px] font-semibold">{n}</span>
                </button>
              );
            })}
        </div>
      </header>

      <div className="scrollbar-none mt-6 flex gap-1.5 overflow-x-auto">
        {(
          [
            ["all", "Tout"],
            ["money", "Impayés"],
            ["claim", "Réclamations"],
            ["transfer", "Virements"],
            ["message", "Messages"],
            ["lease", "Baux"],
          ] as Array<[Filter, string]>
        ).map(([f, label]) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              "inline-flex h-9 shrink-0 items-center gap-2 rounded-full px-3.5 text-[13px] font-medium transition-colors",
              filter === f ? "bg-forest text-on-forest" : "bg-surface text-ink-2 ring-1 ring-line hover:ring-line-strong",
            )}
          >
            {label}
            <span className={cn("num text-[12px]", filter === f ? "text-on-forest-2" : "text-ink-3")}>{count(f)}</span>
          </button>
        ))}
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[minmax(340px,420px)_1fr]">
        <Panel className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-line px-4 py-2.5 text-[12px] text-ink-3">
            <span>Par priorité</span>
            <span className="hidden items-center gap-1 md:flex">
              <Kbd>j</Kbd>
              <Kbd>k</Kbd> pour naviguer
            </span>
          </div>
          {items.length === 0 ? (
            <div className="flex flex-col items-center px-6 py-16 text-center">
              <motion.div
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="grid size-14 place-items-center rounded-full bg-mint-soft text-mint-ink"
              >
                <CheckCircle size={30} weight="fill" />
              </motion.div>
              <p className="type-display mt-4 text-[20px] font-semibold">Rien à traiter ici</p>
              <p className="mt-1 text-[13px] text-ink-3">Changez de filtre ou d'immeuble.</p>
            </div>
          ) : (
            <ul className="max-h-[calc(100dvh-300px)] min-h-[420px] overflow-y-auto p-1.5">
              <AnimatePresence initial={false}>
                {items.map((it) => (
                  <QueueRow key={it.id} item={it} active={selected?.id === it.id} onClick={() => setSelectedId(it.id)} />
                ))}
              </AnimatePresence>
            </ul>
          )}
        </Panel>

        <div className="hidden min-w-0 lg:block">
          <AnimatePresence mode="wait">
            {selected ? (
              <motion.div
                key={selected.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.18 }}
              >
                <Detail item={selected} signature={manager.agency} />
              </motion.div>
            ) : (
              <Panel className="grid h-full min-h-[420px] place-items-center p-10 text-center">
                <div>
                  <p className="type-display text-[22px] font-semibold">Journée bouclée</p>
                  <p className="mt-1 text-[14px] text-ink-3">Les nouveaux paiements et réclamations apparaîtront ici.</p>
                </div>
              </Panel>
            )}
          </AnimatePresence>
        </div>
      </div>
      {!desktop && (
        <Sheet open={!!selected} onOpenChange={(v) => !v && setSelectedId(null)} title={selected?.title ?? ""} side="bottom">
          {selected && (
            <div className="p-3">
              <Detail item={selected} signature={manager.agency} />
            </div>
          )}
        </Sheet>
      )}
    </main>
  );
}

function QueueRow({ item, active, onClick }: { item: AttentionItem; active: boolean; onClick: () => void }) {
  const d = useData();
  const u = d.units.find((x) => x.id === item.unitId)!;
  const p = d.properties.find((x) => x.id === u.propertyId)!;
  const meta = kindMeta[item.kind];
  const unread = item.threadId ? d.threads.find((t) => t.id === item.threadId)?.unreadBy.includes("manager") : false;
  return (
    <motion.li layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, x: -24, height: 0, transition: { duration: 0.25 } }}>
      <button
        onClick={onClick}
        className={cn(
          "relative flex w-full items-start gap-3 overflow-hidden rounded-[12px] py-2.5 pl-4 pr-3 text-left transition-colors",
          active ? "bg-surface-3" : "hover:bg-surface-2",
        )}
      >
        <span className={cn("absolute inset-y-2 left-1.5 w-[3px] rounded-full", item.urgent ? "bg-signal" : meta.bar)} />
        <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-[9px] bg-surface-2 text-ink-2">{meta.icon}</span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5">
            <span className={cn("truncate text-[14px]", unread ? "font-semibold" : "font-medium")}>{item.title}</span>
            {item.urgent && <span className="shrink-0 rounded-full bg-signal px-1.5 text-[10.5px] font-semibold text-white">Urgent</span>}
          </span>
          <span className="block truncate text-[12.5px] text-ink-3">
            <span className="font-mono">{u.code}</span>, {p.name.replace("Résidence ", "").replace("Immeuble ", "")} · {item.detail}
          </span>
        </span>
        {item.amount !== undefined && <span className="num shrink-0 pt-0.5 text-[13.5px] font-semibold">{compact(item.amount)}</span>}
      </button>
    </motion.li>
  );
}

function Detail({ item, signature }: { item: AttentionItem; signature: string }) {
  const d = useData();
  const confirmTransfer = useStore((s) => s.confirmTransfer);
  const startThread = useStore((s) => s.startThread);
  const [payOpen, setPayOpen] = useState(false);
  const [remindOpen, setRemindOpen] = useState(false);
  const u = d.units.find((x) => x.id === item.unitId)!;
  const p = d.properties.find((x) => x.id === u.propertyId)!;
  const tenant = d.tenants.find((t) => t.id === u.tenantId);
  const overdue = overdueInvoices(d, u.id);
  const toPay = invoiceToPay(d, u.id);
  const reminders = d.events.filter((e) => e.unitId === u.id && e.type === "reminder_sent");
  const thread = item.threadId ? d.threads.find((t) => t.id === item.threadId) : undefined;
  const transfer = item.paymentId ? d.payments.find((x) => x.id === item.paymentId) : undefined;

  return (
    <div className="grid gap-4">
      <Panel className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-[64px] shrink-0">
              <Facade
                property={p}
                units={propertyUnits(d, p.id)}
                stateOf={(x) => unitState(d, x)}
                highlightIds={new Set([u.id])}
                entrance={d.entrances[p.id]}
                size="xs"
                animate={false}
              />
            </div>
            <div>
              <p className="text-[12.5px] text-ink-3">
                {p.name}, {levelLabel(u.level).toLowerCase()}
              </p>
              <h2 className="type-display mt-0.5 text-[26px] font-semibold">{unitTitle(u.kind, u.code)}</h2>
              {tenant && (
                <p className="mt-1 flex items-center gap-2 text-[13.5px] text-ink-2">
                  <Avatar name={tenant.name} size={22} />
                  {tenant.name}
                  <span className="text-ink-3">{phone(tenant.phone)}</span>
                </p>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            {tenant && (
              <>
                <a
                  href={`tel:${tenant.phone}`}
                  aria-label="Appeler"
                  className="grid size-10 place-items-center rounded-[12px] border border-line hover:bg-surface-2"
                >
                  <Phone size={17} />
                </a>
                <a
                  href={`https://wa.me/${tenant.phone.replace(/\D/g, "")}`}
                  target="_blank"
                  rel="noreferrer"
                  aria-label="WhatsApp"
                  className="grid size-10 place-items-center rounded-[12px] border border-line hover:bg-surface-2"
                >
                  <ChatCircleDots size={17} />
                </a>
              </>
            )}
            <ButtonLink to={`/gestionnaire/locaux/${u.id}`} variant="secondary" icon={<ArrowSquareOut size={16} />}>
              Fiche
            </ButtonLink>
          </div>
        </div>

        {(item.kind === "late" || item.kind === "partial") && (
          <div className="mt-5 rounded-[16px] bg-signal-soft p-5">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-[13px] font-medium text-signal-ink">{item.detail}</p>
                <Money value={item.amount ?? 0} condensed className="mt-1 block text-[46px] font-semibold" />
                <ul className="mt-2 grid gap-0.5 text-[13px] text-ink-2">
                  {overdue.map((i) => (
                    <li key={i.id} className="num">
                      {periodLabel(i.period)} : {fcfa(i.amount - i.paid)}
                      {i.paid > 0 && <span className="text-ink-3"> (sur {fcfa(i.amount)})</span>}, {daysLate(i)} j
                    </li>
                  ))}
                </ul>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="secondary" icon={<BellRinging size={16} />} onClick={() => setRemindOpen(true)}>
                  Relancer
                </Button>
                <Button variant="dark" icon={<Plus size={16} weight="bold" />} onClick={() => setPayOpen(true)}>
                  Enregistrer un paiement
                </Button>
              </div>
            </div>
            <p className="mt-4 border-t border-signal/20 pt-3 text-[12.5px] text-ink-2">
              {reminders.length
                ? `Relances : ${reminders.map((r) => `${r.meta?.channel} ${relativeDay(r.at)}`).join(", ")}`
                : "Aucune relance envoyée."}
            </p>
          </div>
        )}

        {item.kind === "transfer" && transfer && (
          <div className="mt-5 flex flex-wrap items-end justify-between gap-4 rounded-[16px] bg-mint-soft p-5">
            <div>
              <p className="text-[13px] font-medium text-mint-ink">Virement déclaré par le locataire</p>
              <Money value={transfer.amount} condensed className="mt-1 block text-[46px] font-semibold" />
              <p className="mt-1 font-mono text-[12.5px] text-ink-2">Réf. {transfer.providerRef}</p>
              <p className="mt-1 text-[13px] text-ink-2">Vérifiez le relevé bancaire avant de confirmer : la quittance sera émise aussitôt.</p>
            </div>
            <Button
              variant="primary"
              icon={<Bank size={16} />}
              onClick={() => {
                confirmTransfer(transfer.id, DEMO_MANAGER_ID);
                toast("Virement confirmé, quittance émise", tenant?.name);
              }}
            >
              Confirmer la réception
            </Button>
          </div>
        )}

        {item.kind === "lease" && u.lease && (
          <div className="mt-5 flex flex-wrap items-end justify-between gap-4 rounded-[16px] bg-amber-soft p-5">
            <div>
              <p className="text-[13px] font-medium text-amber-ink">{item.detail}</p>
              <p className="type-display mt-1 text-[30px] font-semibold">{dateLong(u.lease.end)}</p>
              <p className="mt-1 text-[13px] text-ink-2">
                Bail signé le {dateLong(u.lease.start)}, loyer actuel {fcfa(u.rent + u.charges)}.
              </p>
            </div>
            <Button
              variant="dark"
              icon={<ArrowsClockwise size={16} />}
              onClick={() => {
                startThread({
                  unitId: u.id,
                  kind: "message",
                  subject: "Renouvellement du bail",
                  body: `Bonjour, votre bail arrive à échéance le ${dateLong(u.lease!.end)}. Souhaitez-vous le renouveler aux mêmes conditions ? Nous pouvons en parler cette semaine.`,
                  authorId: DEMO_MANAGER_ID,
                  role: "manager",
                });
                toast("Proposition envoyée", "Le locataire la retrouve dans ses échanges.");
              }}
            >
              Proposer le renouvellement
            </Button>
          </div>
        )}

        {item.kind === "claim" && thread && (
          <div className="mt-5">
            <ClaimPanel thread={thread} canManage actorId={DEMO_MANAGER_ID} />
          </div>
        )}
      </Panel>

      <Panel className="flex h-[480px] flex-col overflow-hidden">
        <UnitJournal
          unitId={u.id}
          viewer="manager"
          viewerId={DEMO_MANAGER_ID}
          initialThreadId={item.threadId}
          autoRead={item.kind === "message" || item.kind === "claim"}
        />
      </Panel>

      <RecordPaymentModal invoice={toPay} open={payOpen} onOpenChange={setPayOpen} actorId={DEMO_MANAGER_ID} />
      {tenant && (
        <ReminderModal
          unit={u}
          tenant={tenant}
          invoices={overdue}
          open={remindOpen}
          onOpenChange={setRemindOpen}
          actorId={DEMO_MANAGER_ID}
          signature={signature}
        />
      )}
    </div>
  );
}
