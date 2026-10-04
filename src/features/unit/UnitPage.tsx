import { ArrowLeft, BellRinging, Bank, ChatCircleDots, Phone, PencilSimple, Plus, Receipt as ReceiptIcon, Check } from "@phosphor-icons/react";
import { motion } from "motion/react";
import { useState } from "react";
import { Link, useParams } from "react-router";
import { Facade } from "@/components/facade/Facade";
import { MonthStrip } from "@/components/money/MonthStrip";
import { UnitJournal } from "@/components/journal/UnitJournal";
import { ClaimPanel } from "@/components/journal/ClaimPanel";
import { RecordPaymentModal } from "@/components/actions/RecordPaymentModal";
import { ReminderModal } from "@/components/actions/ReminderModal";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Form";
import { Money } from "@/components/ui/Money";
import { Modal } from "@/components/ui/Overlay";
import { Panel } from "@/components/ui/Panel";
import { StatusChip } from "@/components/ui/Status";
import { toast } from "@/components/ui/Toast";
import { useData } from "@/hooks/useData";
import { useStore } from "@/store/store";
import { DEMO_MANAGER_ID, DEMO_OWNER_ID } from "@/data/seed";
import {
  balance,
  currentInvoice,
  daysLate,
  invoiceToPay,
  overdueInvoices,
  pendingTransfer,
  propertyUnits,
  unitInvoices,
  unitState,
} from "@/domain/selectors";
import { levelLabel, unitKindLabel, unitTitle } from "@/domain/labels";
import type { Role } from "@/domain/types";
import { daysBetween, today } from "@/lib/clock";
import { amount, dateLong, dateShort, fcfa, firstName, periodLabel, phone, relativeDay } from "@/lib/format";
import { NotFound } from "@/features/NotFound";
import { cn } from "@/lib/cn";

export function UnitPage({ role }: { role: Role }) {
  const { unitId } = useParams();
  const d = useData();
  const confirmTransfer = useStore((s) => s.confirmTransfer);
  const updateRent = useStore((s) => s.updateUnitRent);
  const [payOpen, setPayOpen] = useState(false);
  const [remindOpen, setRemindOpen] = useState(false);
  const [rentOpen, setRentOpen] = useState(false);
  const [focusThread, setFocusThread] = useState<string | undefined>();

  const unit = d.units.find((u) => u.id === unitId);
  if (!unit) return <NotFound />;

  const property = d.properties.find((p) => p.id === unit.propertyId)!;
  const tenant = d.tenants.find((t) => t.id === unit.tenantId);
  const owner = d.owners.find((o) => o.id === property.ownerId)!;
  const manager = property.managerId ? d.managers.find((m) => m.id === property.managerId) : null;
  const actorId = role === "manager" ? DEMO_MANAGER_ID : DEMO_OWNER_ID;
  // Who runs the day-to-day: the manager on managed buildings, else the owner.
  const canManage = role === "manager" || (role === "owner" && !property.managerId);

  const st = unitState(d, unit);
  const invoices = unitInvoices(d, unit.id);
  const overdue = overdueInvoices(d, unit.id);
  const owed = balance(overdue);
  const cur = currentInvoice(d, unit.id);
  const toPay = invoiceToPay(d, unit.id);
  const transfer = cur ? pendingTransfer(d, cur.id) : undefined;
  const claims = d.threads.filter((t) => t.unitId === unit.id && t.kind === "claim").sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const openClaims = claims.filter((c) => c.status !== "resolved");
  const receipts = d.receipts.filter((r) => r.unitId === unit.id).sort((a, b) => b.period.localeCompare(a.period));
  const reminders = d.events.filter((e) => e.unitId === unit.id && e.type === "reminder_sent");
  const siblings = propertyUnits(d, property.id);
  const back =
    role === "manager" ? { to: "/gestionnaire/locaux", label: "Locaux" } : { to: `/proprietaire/biens/${property.id}`, label: property.name };
  const leaseLeft = unit.lease ? daysBetween(today(), unit.lease.end) : null;

  return (
    <main className={cn("mx-auto px-5 pb-20 pt-6 md:px-8", role === "manager" ? "max-w-[1380px]" : "max-w-[1320px]")}>
      <Link to={back.to} className="inline-flex items-center gap-1.5 text-[13px] font-medium text-ink-3 hover:text-ink">
        <ArrowLeft size={14} /> {back.label}
      </Link>

      <header className="mt-4 flex flex-wrap items-end justify-between gap-5">
        <div className="flex items-end gap-5">
          <div className="hidden w-[92px] shrink-0 sm:block">
            <Facade
              property={property}
              units={siblings}
              entrance={d.entrances[property.id]}
              stateOf={(u) => unitState(d, u)}
              size="xs"
              highlightIds={new Set([unit.id])}
              animate={false}
              depth={8}
            />
          </div>
          <div>
            <p className="text-[13px] text-ink-3">
              <Link to={role === "owner" ? `/proprietaire/biens/${property.id}` : "/gestionnaire/locaux"} className="hover:text-ink hover:underline">
                {property.name}
              </Link>
              , {levelLabel(unit.level).toLowerCase()}
            </p>
            <h1 className="type-display mt-1 text-[38px] font-semibold md:text-[46px]">{unitTitle(unit.kind, unit.code)}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-2.5 text-[13px] text-ink-3">
              <StatusChip state={st} />
              <span>
                {unitKindLabel[unit.kind]}, {unit.surface} m²{unit.rooms ? `, ${unit.rooms} pièces` : ""}
              </span>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {canManage && overdue.length > 0 && tenant && (
            <Button variant="secondary" icon={<BellRinging size={16} />} onClick={() => setRemindOpen(true)}>
              Relancer
            </Button>
          )}
          {canManage && toPay && !transfer && (
            <Button variant="dark" icon={<Plus size={16} weight="bold" />} onClick={() => setPayOpen(true)}>
              Enregistrer un paiement
            </Button>
          )}
        </div>
      </header>

      <div className="mt-8 grid grid-cols-1 gap-4 lg:grid-cols-12">
        <div className="grid content-start gap-4 lg:col-span-8">
          {/* Situation */}
          {!tenant ? (
            <Panel className="blueprint p-6">
              <p className="type-display text-[24px] font-semibold">Local vacant</p>
              <p className="mt-1 max-w-[52ch] text-[14px] text-ink-3">
                Loyer affiché {fcfa(unit.rent + unit.charges)} par mois. Ajoutez un locataire pour générer l'échéancier et les quittances.
              </p>
              <Button
                variant="dark"
                className="mt-5"
                icon={<Plus size={16} />}
                onClick={() => toast("Bientôt disponible", "La création de bail arrive dans la prochaine version.", "info")}
              >
                Ajouter un locataire
              </Button>
            </Panel>
          ) : owed > 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="relative overflow-hidden rounded-[var(--radius-panel)] border border-signal/30 bg-signal-soft p-6"
            >
              <div className="flex flex-wrap items-end justify-between gap-5">
                <div>
                  <p className="text-[13px] font-medium text-signal-ink">
                    {overdue.length > 1 ? `${overdue.length} échéances impayées` : `Impayé de ${periodLabel(overdue[0]!.period).toLowerCase()}`},
                    depuis {daysLate(overdue[0]!)} jours
                  </p>
                  <Money value={owed} condensed className="mt-2 block text-[54px] font-semibold text-ink" />
                  <p className="mt-1 text-[13px] text-ink-2">
                    {reminders.length > 0
                      ? `${reminders.length} relance${reminders.length > 1 ? "s" : ""}, la dernière ${relativeDay(reminders[reminders.length - 1]!.at)}.`
                      : "Aucune relance envoyée pour l'instant."}
                  </p>
                </div>
                {canManage ? (
                  <div className="flex flex-wrap gap-2">
                    <Button variant="secondary" icon={<BellRinging size={16} />} onClick={() => setRemindOpen(true)}>
                      Relancer
                    </Button>
                    <Button variant="dark" onClick={() => setPayOpen(true)}>
                      Enregistrer un paiement
                    </Button>
                  </div>
                ) : (
                  <p className="max-w-[30ch] text-[13px] text-ink-2">Le Cabinet Ndoye suit ce dossier. Écrivez-lui depuis le journal ci-dessous.</p>
                )}
              </div>
            </motion.div>
          ) : (
            <Panel className="p-6">
              <div className="flex flex-wrap items-end justify-between gap-5">
                <div>
                  <p className="text-[13px] text-ink-3">{cur ? periodLabel(cur.period) : "Ce mois"}</p>
                  {cur && cur.paid >= cur.amount ? (
                    <>
                      <p className="type-display mt-1 flex items-center gap-2 text-[34px] font-semibold">
                        <span className="grid size-8 place-items-center rounded-full bg-emerald-bright text-white">
                          <Check size={18} weight="bold" />
                        </span>
                        Loyer payé
                      </p>
                      <p className="num mt-1 text-[14px] text-ink-3">
                        {fcfa(cur.amount)} reçus le {dateShort(cur.paidAt!)}
                      </p>
                    </>
                  ) : transfer ? (
                    <>
                      <p className="type-display mt-1 text-[34px] font-semibold">Virement à confirmer</p>
                      <p className="num mt-1 text-[14px] text-ink-3">
                        {fcfa(transfer.amount)} déclarés, réf. {transfer.providerRef}
                      </p>
                    </>
                  ) : cur ? (
                    <>
                      <Money value={cur.amount - cur.paid} condensed className="mt-1 block text-[48px] font-semibold" />
                      <p className="mt-1 text-[14px] text-ink-3">
                        {cur.paid > 0 ? `Déjà ${fcfa(cur.paid)} reçus. ` : ""}Échéance {relativeDay(cur.dueDate)}, le {dateShort(cur.dueDate)}
                      </p>
                    </>
                  ) : null}
                </div>
                {transfer && canManage && (
                  <Button
                    variant="primary"
                    icon={<Bank size={16} />}
                    onClick={() => {
                      confirmTransfer(transfer.id, actorId);
                      toast("Virement confirmé, quittance émise", `${fcfa(transfer.amount)} reçus`);
                    }}
                  >
                    Confirmer la réception
                  </Button>
                )}
              </div>
            </Panel>
          )}

          {tenant && (
            <Panel className="p-5 md:p-6">
              <div className="mb-4 flex items-center justify-between gap-3">
                <h2 className="type-display text-[19px] font-semibold">Échéancier</h2>
                <span className="text-[13px] text-ink-3">12 derniers mois</span>
              </div>
              <MonthStrip d={d} invoices={invoices.slice(-12)} />
            </Panel>
          )}

          {openClaims.length > 0 && (
            <div className="grid gap-3 md:grid-cols-2">
              {openClaims.map((c) => (
                <ClaimPanel key={c.id} thread={c} canManage={canManage} actorId={actorId} onOpen={() => setFocusThread(c.id)} />
              ))}
            </div>
          )}

          <Panel className="flex h-[620px] flex-col overflow-hidden">
            <UnitJournal unitId={unit.id} viewer={role} viewerId={actorId} initialThreadId={focusThread} />
          </Panel>
        </div>

        <aside className="grid content-start gap-4 lg:col-span-4">
          {tenant && (
            <Panel className="p-5">
              <p className="text-[12px] text-ink-3">Locataire</p>
              <div className="mt-3 flex items-center gap-3">
                <Avatar name={tenant.name} size={46} />
                <div className="min-w-0">
                  <p className="truncate text-[16px] font-semibold">{tenant.name}</p>
                  <p className="truncate text-[13px] text-ink-3">{tenant.profession ?? unitKindLabel[unit.kind]}</p>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <a
                  href={`tel:${tenant.phone}`}
                  className="flex h-10 items-center justify-center gap-2 rounded-[var(--radius-control)] border border-line text-[13px] font-medium hover:bg-surface-2"
                >
                  <Phone size={16} /> Appeler
                </a>
                <a
                  href={`https://wa.me/${tenant.phone.replace(/\D/g, "")}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex h-10 items-center justify-center gap-2 rounded-[var(--radius-control)] border border-line text-[13px] font-medium hover:bg-surface-2"
                >
                  <ChatCircleDots size={16} /> WhatsApp
                </a>
              </div>
              <dl className="mt-5 grid gap-3 text-[13.5px]">
                <Row label="Téléphone" value={phone(tenant.phone)} />
                {unit.lease && <Row label="Bail" value={`${dateShort(unit.lease.start)} au ${dateLong(unit.lease.end)}`} />}
                {unit.lease && <Row label="Dépôt de garantie" value={fcfa(unit.lease.deposit)} />}
                {leaseLeft !== null && leaseLeft <= 60 && (
                  <p className="rounded-[10px] bg-amber-soft px-3 py-2 text-[12.5px] text-amber-ink">Le bail se termine dans {leaseLeft} jours.</p>
                )}
              </dl>
            </Panel>
          )}

          <Panel className="p-5">
            <div className="flex items-center justify-between">
              <p className="text-[12px] text-ink-3">Conditions</p>
              {canManage && (
                <button
                  onClick={() => setRentOpen(true)}
                  className="inline-flex items-center gap-1 text-[12.5px] font-medium text-emerald hover:underline"
                >
                  <PencilSimple size={13} /> Réviser
                </button>
              )}
            </div>
            <Money value={unit.rent + unit.charges} className="mt-2 block text-[32px] font-semibold" />
            <dl className="mt-4 grid gap-3 text-[13.5px]">
              <Row label="Loyer" value={fcfa(unit.rent)} />
              <Row label="Charges" value={fcfa(unit.charges)} />
              <Row label="Échéance" value={`Le ${unit.dueDay} de chaque mois`} />
              <Row label="Bailleur" value={owner.name} />
              <Row label="Gestion" value={manager ? manager.agency : "Directe"} />
            </dl>
          </Panel>

          <Panel className="p-5">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-[12px] text-ink-3">Quittances</p>
              <span className="num text-[12px] text-ink-3">{receipts.length}</span>
            </div>
            {receipts.length === 0 ? (
              <p className="text-[13.5px] text-ink-3">Aucune quittance pour ce local.</p>
            ) : (
              <ul className="-mx-2">
                {receipts.slice(0, 4).map((r) => (
                  <li key={r.id}>
                    <Link to={`/quittance/${r.id}`} className="flex items-center gap-3 rounded-[12px] px-2 py-2 hover:bg-surface-2">
                      <span className="grid size-8 place-items-center rounded-[10px] bg-mint-soft text-mint-ink">
                        <ReceiptIcon size={16} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-[14px] font-medium">{periodLabel(r.period)}</span>
                        <span className="block font-mono text-[11.5px] text-ink-3">{r.number}</span>
                      </span>
                      <span className="num text-[13px] text-ink-2">{amount(r.amount)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          {claims.filter((c) => c.status === "resolved").length > 0 && (
            <Panel className="p-5">
              <p className="mb-2 text-[12px] text-ink-3">Réclamations résolues</p>
              <ul className="grid gap-2">
                {claims
                  .filter((c) => c.status === "resolved")
                  .map((c) => (
                    <li key={c.id} className="flex items-center justify-between gap-3 text-[13.5px]">
                      <span className="truncate">{c.subject}</span>
                      <span className="shrink-0 text-[12px] text-ink-3">{dateShort(c.updatedAt)}</span>
                    </li>
                  ))}
              </ul>
            </Panel>
          )}
        </aside>
      </div>

      <RecordPaymentModal invoice={toPay} open={payOpen} onOpenChange={setPayOpen} actorId={actorId} />
      {tenant && (
        <ReminderModal
          unit={unit}
          tenant={tenant}
          invoices={overdue}
          open={remindOpen}
          onOpenChange={setRemindOpen}
          actorId={actorId}
          signature={manager ? `${manager.agency}` : firstName(owner.name)}
        />
      )}
      <RentModal
        open={rentOpen}
        onOpenChange={setRentOpen}
        current={unit.rent}
        onSave={(v) => {
          updateRent(unit.id, v, actorId);
          toast("Loyer révisé", `Applicable à la prochaine échéance : ${fcfa(v + unit.charges)}`);
        }}
      />
    </main>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="text-ink-3">{label}</dt>
      <dd className="num text-right font-medium">{value}</dd>
    </div>
  );
}

function RentModal({
  open,
  onOpenChange,
  current,
  onSave,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  current: number;
  onSave: (v: number) => void;
}) {
  const [v, setV] = useState(String(current));
  const n = Number(v.replace(/\s/g, ""));
  const delta = current ? ((n - current) / current) * 100 : 0;
  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Réviser le loyer"
      description="Hors charges. La révision s'applique à la prochaine échéance."
    >
      <div className="grid gap-4">
        <Field
          label="Nouveau loyer (FCFA)"
          hint={n && n !== current ? `${delta > 0 ? "+" : ""}${delta.toFixed(1).replace(".", ",")} % par rapport à ${amount(current)}` : undefined}
        >
          {(id) => (
            <Input
              id={id}
              inputMode="numeric"
              value={v}
              onChange={(e) => setV(e.target.value.replace(/[^\d\s]/g, ""))}
              className="num type-display text-[20px]"
            />
          )}
        </Field>
        <div className="flex justify-end">
          <Button
            variant="primary"
            disabled={!n || n === current}
            onClick={() => {
              onSave(n);
              onOpenChange(false);
            }}
          >
            Appliquer
          </Button>
        </div>
      </div>
    </Modal>
  );
}
