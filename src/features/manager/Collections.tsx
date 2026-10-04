import { Bank, BellRinging, Plus } from "@phosphor-icons/react";
import { useState } from "react";
import { Link } from "react-router";
import { RecordPaymentModal } from "@/components/actions/RecordPaymentModal";
import { ReminderModal } from "@/components/actions/ReminderModal";
import { MethodBadge } from "@/components/money/MethodBadge";
import { RentRollBar, type RollItem } from "@/components/money/RentRollBar";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Money } from "@/components/ui/Money";
import { Panel, SectionTitle } from "@/components/ui/Panel";
import { toast } from "@/components/ui/Toast";
import { useData } from "@/hooks/useData";
import { useStore } from "@/store/store";
import { DEMO_MANAGER_ID } from "@/data/seed";
import {
  balance,
  currentInvoice,
  daysLate,
  invoiceToPay,
  managedPropertyIds,
  overdueInvoices,
  propertyUnits,
  statsFor,
  unitState,
} from "@/domain/selectors";
import { unitTitle } from "@/domain/labels";
import type { Unit } from "@/domain/types";
import { currentPeriod } from "@/lib/clock";
import { amount, compact, fcfa, periodLabel, relativeDay, relativeTime } from "@/lib/format";

export function Collections() {
  const d = useData();
  const confirmTransfer = useStore((s) => s.confirmTransfer);
  const ids = managedPropertyIds(d, DEMO_MANAGER_ID);
  const props = d.properties.filter((p) => ids.includes(p.id));
  const manager = d.managers.find((m) => m.id === DEMO_MANAGER_ID)!;
  const stats = statsFor(d, ids);
  const [payUnit, setPayUnit] = useState<Unit | null>(null);
  const [remindUnit, setRemindUnit] = useState<Unit | null>(null);

  const units = d.units.filter((u) => ids.includes(u.propertyId));
  const debtors = units
    .map((u) => ({ u, overdue: overdueInvoices(d, u.id) }))
    .filter((x) => x.overdue.length)
    .sort((a, b) => balance(b.overdue) - balance(a.overdue));
  const transfers = d.payments.filter((p) => p.status === "pending" && p.channel === "manual" && units.some((u) => u.id === p.unitId));
  const recent = d.payments
    .filter((p) => p.status === "succeeded" && units.some((u) => u.id === p.unitId))
    .sort((a, b) => (b.settledAt ?? "").localeCompare(a.settledAt ?? ""))
    .slice(0, 8);

  const roll: RollItem[] = props
    .flatMap((p) =>
      propertyUnits(d, p.id)
        .filter((u) => u.tenantId)
        .map((u) => {
          const inv = currentInvoice(d, u.id);
          const st = unitState(d, u);
          return {
            id: u.id,
            label: unitTitle(u.kind, u.code),
            sub: p.name,
            amount: inv?.amount ?? u.rent + u.charges,
            paid: inv?.paid ?? 0,
            state: inv && inv.paid >= inv.amount ? "paid" : st,
            href: `/gestionnaire/locaux/${u.id}`,
          } satisfies RollItem;
        }),
    )
    .sort(
      (a, b) =>
        ["paid", "partial", "late", "due", "upcoming", "vacant"].indexOf(a.state) -
        ["paid", "partial", "late", "due", "upcoming", "vacant"].indexOf(b.state),
    );

  return (
    <main className="px-4 pb-12 pt-6 md:px-8">
      <h1 className="type-display text-[34px] font-semibold md:text-[40px]">Encaissements</h1>
      <p className="mt-1 text-[14px] text-ink-3">{periodLabel(currentPeriod())}, tous immeubles confondus.</p>

      <section className="forest-surface mt-6 rounded-[var(--radius-panel)] p-6 md:p-7">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="text-[13px] text-on-forest-2">Encaissé ce mois</p>
            <Money value={stats.collected} condensed className="mt-1 block text-[56px] font-semibold" />
            <p className="num text-[13.5px] text-on-forest-2">
              sur {fcfa(stats.expected)}, soit {stats.expected ? Math.round((stats.collected / stats.expected) * 100) : 0} %
            </p>
          </div>
          <dl className="grid grid-cols-3 gap-8">
            <div>
              <dt className="text-[12px] text-on-forest-2">À recouvrer</dt>
              <dd className="num mt-1 text-[20px] font-medium">{compact(stats.outstanding)}</dd>
            </div>
            <div>
              <dt className="text-[12px] text-on-forest-2">Débiteurs</dt>
              <dd className="num mt-1 text-[20px] font-medium">{debtors.length}</dd>
            </div>
            <div>
              <dt className="text-[12px] text-on-forest-2">Virements</dt>
              <dd className="num mt-1 text-[20px] font-medium">{transfers.length}</dd>
            </div>
          </dl>
        </div>
        <div className="mt-6">
          <RentRollBar items={roll} height={36} />
        </div>
      </section>

      <div className="mt-6 grid grid-cols-1 gap-4 xl:grid-cols-12">
        <Panel className="p-5 xl:col-span-8">
          <SectionTitle>À recouvrer</SectionTitle>
          {debtors.length === 0 ? (
            <p className="py-10 text-center text-[14px] text-ink-3">Aucun impayé. Bravo.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[680px] text-[14px]">
                <thead>
                  <tr className="text-left text-[12px] text-ink-3">
                    <th className="py-2 pr-3 font-medium">Locataire</th>
                    <th className="px-3 py-2 font-medium">Retard</th>
                    <th className="px-3 py-2 font-medium">Dernière relance</th>
                    <th className="px-3 py-2 text-right font-medium">Dû</th>
                    <th className="py-2 pl-3" />
                  </tr>
                </thead>
                <tbody>
                  {debtors.map(({ u, overdue }) => {
                    const t = d.tenants.find((x) => x.id === u.tenantId)!;
                    const p = d.properties.find((x) => x.id === u.propertyId)!;
                    const last = d.events.filter((e) => e.unitId === u.id && e.type === "reminder_sent").at(-1);
                    return (
                      <tr key={u.id} className="border-t border-line">
                        <td className="py-3 pr-3">
                          <Link to={`/gestionnaire/locaux/${u.id}`} className="flex items-center gap-3 hover:underline">
                            <Avatar name={t.name} size={32} />
                            <span>
                              <span className="block font-medium">{t.name}</span>
                              <span className="block text-[12.5px] text-ink-3">
                                <span className="font-mono">{u.code}</span>, {p.name}
                              </span>
                            </span>
                          </Link>
                        </td>
                        <td className="px-3 py-3">
                          <span className="num font-medium text-signal-ink">{daysLate(overdue[0]!)} j</span>
                          <span className="block text-[12.5px] text-ink-3">
                            {overdue.map((i) => periodLabel(i.period, false).toLowerCase()).join(", ")}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-[13px] text-ink-2">{last ? `${last.meta?.channel}, ${relativeDay(last.at)}` : "Aucune"}</td>
                        <td className="num px-3 py-3 text-right font-semibold">{amount(balance(overdue))}</td>
                        <td className="py-3 pl-3">
                          <div className="flex justify-end gap-1.5">
                            <Button size="sm" variant="secondary" icon={<BellRinging size={14} />} onClick={() => setRemindUnit(u)}>
                              Relancer
                            </Button>
                            <Button size="sm" variant="dark" icon={<Plus size={14} weight="bold" />} onClick={() => setPayUnit(u)}>
                              Paiement
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Panel>

        <div className="grid content-start gap-4 xl:col-span-4">
          <Panel className="p-5">
            <SectionTitle>Virements à confirmer</SectionTitle>
            {transfers.length === 0 ? (
              <p className="text-[13.5px] text-ink-3">Aucun virement en attente.</p>
            ) : (
              <ul className="grid gap-3">
                {transfers.map((tr) => {
                  const u = d.units.find((x) => x.id === tr.unitId)!;
                  const t = d.tenants.find((x) => x.id === tr.tenantId);
                  return (
                    <li key={tr.id} className="rounded-[14px] bg-mint-soft p-3.5">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-[14px] font-medium">{t?.name}</p>
                          <p className="font-mono text-[12px] text-ink-3">
                            {u.code}, {tr.providerRef}
                          </p>
                        </div>
                        <span className="num text-[14px] font-semibold">{amount(tr.amount)}</span>
                      </div>
                      <Button
                        size="sm"
                        variant="primary"
                        className="mt-3 w-full"
                        icon={<Bank size={14} />}
                        onClick={() => {
                          confirmTransfer(tr.id, DEMO_MANAGER_ID);
                          toast("Virement confirmé, quittance émise", t?.name);
                        }}
                      >
                        Confirmer la réception
                      </Button>
                    </li>
                  );
                })}
              </ul>
            )}
          </Panel>
          <Panel className="p-5">
            <SectionTitle>Derniers encaissements</SectionTitle>
            <ul className="-mx-2">
              {recent.map((p) => {
                const u = d.units.find((x) => x.id === p.unitId)!;
                return (
                  <li key={p.id}>
                    <Link to={`/gestionnaire/locaux/${u.id}`} className="flex items-center gap-3 rounded-[12px] px-2 py-2 hover:bg-surface-2">
                      <MethodBadge method={p.method} size={28} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13.5px] font-medium">{unitTitle(u.kind, u.code)}</span>
                        <span className="block truncate text-[12px] text-ink-3">{relativeTime(p.settledAt!)}</span>
                      </span>
                      <span className="num text-[13.5px] font-medium">+{amount(p.amount)}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </Panel>
        </div>
      </div>

      <RecordPaymentModal
        invoice={payUnit ? invoiceToPay(d, payUnit.id) : undefined}
        open={!!payUnit}
        onOpenChange={(v) => !v && setPayUnit(null)}
        actorId={DEMO_MANAGER_ID}
      />
      {remindUnit && (
        <ReminderModal
          unit={remindUnit}
          tenant={d.tenants.find((t) => t.id === remindUnit.tenantId)}
          invoices={overdueInvoices(d, remindUnit.id)}
          open
          onOpenChange={(v) => !v && setRemindUnit(null)}
          actorId={DEMO_MANAGER_ID}
          signature={manager.agency}
        />
      )}
    </main>
  );
}
