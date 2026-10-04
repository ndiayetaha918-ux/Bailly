import { ArrowRight, CalendarBlank, ChatCircleDots, CheckCircle, Phone, Receipt as ReceiptIcon, Wrench } from "@phosphor-icons/react";
import { brand } from "@/brand/brand";
import { motion, useReducedMotion } from "motion/react";
import { Link } from "react-router";
import { Facade } from "@/components/facade/Facade";
import { MonthStrip } from "@/components/money/MonthStrip";
import { Avatar } from "@/components/ui/Avatar";
import { ButtonLink } from "@/components/ui/Button";
import { Money } from "@/components/ui/Money";
import { Panel } from "@/components/ui/Panel";
import { useData } from "@/hooks/useData";
import { DEMO_TENANT_ID } from "@/data/seed";
import { contactFor, currentInvoice, invoiceToPay, isOverdue, propertyUnits, unitInvoices, unitState } from "@/domain/selectors";
import { claimStatusLabel, levelLabel, unitTitle } from "@/domain/labels";
import { daysBetween, periodToDate, shiftPeriod, today } from "@/lib/clock";
import { amount, dateLong, dateShort, firstName, periodLabel, relativeDay, time } from "@/lib/format";
import { cn } from "@/lib/cn";

export function TenantHome() {
  const d = useData();
  const reduce = useReducedMotion();
  const tenant = d.tenants.find((t) => t.id === DEMO_TENANT_ID)!;
  const unit = d.units.find((u) => u.tenantId === DEMO_TENANT_ID)!;
  const property = d.properties.find((p) => p.id === unit.propertyId)!;
  const contact = contactFor(d, unit);
  const toPay = invoiceToPay(d, unit.id);
  const cur = currentInvoice(d, unit.id);
  const invoices = unitInvoices(d, unit.id);
  const receipts = d.receipts.filter((r) => r.unitId === unit.id).sort((a, b) => b.period.localeCompare(a.period));
  const claims = d.threads.filter((t) => t.unitId === unit.id && t.kind === "claim" && t.status !== "resolved");
  const onTime = invoices.filter((i) => i.paidAt && new Date(i.paidAt) <= new Date(i.dueDate)).length;
  const nextDue = periodToDate(shiftPeriod(cur?.period ?? "2026-10", 1), unit.dueDay);
  const pendingPay = d.payments.find((p) => p.unitId === unit.id && (p.status === "pending" || p.status === "initiated") && p.channel === "intouch");

  // Days of the month, with today and the due day marked.
  const t = today();
  const daysInMonth = new Date(t.getFullYear(), t.getMonth() + 1, 0).getDate();
  const dueDate = toPay ? new Date(toPay.dueDate) : null;
  const dueDay = dueDate && dueDate.getMonth() === t.getMonth() ? dueDate.getDate() : null;

  return (
    <main className="mx-auto max-w-[1080px] px-4 pb-10 pt-6 md:px-5">
      <p className="text-[14px] text-ink-3">Bonjour {firstName(tenant.name)},</p>

      <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-[1.15fr_1fr]">
        {/* Rent card */}
        <motion.section
          initial={reduce ? false : { opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="forest-surface relative overflow-hidden rounded-[24px] p-6"
        >
          {toPay ? (
            <>
              <p className="text-[13px] text-on-forest-2">
                {isOverdue(toPay) ? "Loyer en retard" : "Prochain loyer"}, {periodLabel(toPay.period).toLowerCase()}
              </p>
              <Money value={toPay.amount - toPay.paid} condensed className="mt-2 block text-[60px] font-semibold leading-none" />
              <p className="mt-2 text-[14px] text-on-forest">
                {isOverdue(toPay) ? (
                  <span className="text-[#ffb59c]">Échu depuis {-daysBetween(today(), toPay.dueDate)} jours</span>
                ) : (
                  <>
                    Échéance <span className="font-semibold">{relativeDay(toPay.dueDate)}</span>, le {dateLong(toPay.dueDate)}
                  </>
                )}
              </p>

              {dueDay && (
                <div className="mt-6" aria-hidden>
                  <div className="flex gap-[3px]">
                    {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => (
                      <span
                        key={day}
                        className={cn(
                          "h-6 flex-1 rounded-[2px]",
                          day === dueDay ? "bg-mint" : day < t.getDate() ? "bg-white/35" : day === t.getDate() ? "bg-white" : "bg-white/10",
                        )}
                      />
                    ))}
                  </div>
                  <div className="mt-1.5 flex justify-between text-[11px] text-on-forest-2">
                    <span>1er</span>
                    <span>Aujourd'hui, le {t.getDate()}</span>
                    <span>{daysInMonth}</span>
                  </div>
                </div>
              )}

              <ButtonLink
                to="/locataire/payer"
                size="lg"
                variant={brand.id === "loclic" ? "primary" : "mint"}
                className="mt-6 w-full"
                trailing={<ArrowRight size={18} weight="bold" />}
              >
                {pendingPay ? "Paiement en cours" : `Payer ${amount(toPay.amount - toPay.paid)} ${brand.currency}`}
              </ButtonLink>
              <p className="mt-3 text-center text-[12.5px] text-on-forest-2">
                {brand.id === "loclic" ? "TouchPoint, " : ""}Wave, Orange Money, Free Money ou carte, via InTouch
              </p>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2 text-mint">
                <CheckCircle size={22} weight="fill" />
                <p className="text-[14px] font-medium">Loyer de {cur ? periodLabel(cur.period, false).toLowerCase() : "ce mois"} réglé</p>
              </div>
              <p className="type-display mt-4 text-[40px] font-semibold leading-none">Vous êtes à jour.</p>
              <p className="mt-3 text-[14px] text-on-forest-2">
                Prochaine échéance le {dateLong(nextDue)}, dans {daysBetween(today(), nextDue)} jours.
              </p>
              {receipts[0] && (
                <ButtonLink
                  to={`/quittance/${receipts[0].id}`}
                  variant="on-forest"
                  size="lg"
                  className="mt-6 w-full"
                  icon={<ReceiptIcon size={18} />}
                >
                  Voir la quittance de {periodLabel(receipts[0].period, false).toLowerCase()}
                </ButtonLink>
              )}
            </>
          )}
        </motion.section>

        {/* Unit card */}
        <motion.section
          initial={reduce ? false : { opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.06, ease: [0.16, 1, 0.3, 1] }}
        >
          <Panel className="flex h-full flex-col overflow-hidden">
            <div className="flex items-end gap-5 bg-surface-2 px-6 pb-5 pt-6">
              <div className="w-[118px] shrink-0">
                <Facade
                  property={property}
                  units={propertyUnits(d, property.id)}
                  entrance={d.entrances[property.id]}
                  stateOf={(u) => unitState(d, u)}
                  cellClass={(u) => (u.id === unit.id ? "bg-emerald-bright shadow-[0_0_16px_var(--glow)]" : "bg-line/80")}
                  size="sm"
                  depth={10}
                />
              </div>
              <div className="min-w-0 pb-1">
                <p className="text-[12.5px] text-ink-3">Votre local</p>
                <p className="type-display mt-1 text-[24px] font-semibold leading-tight">{unitTitle(unit.kind, unit.code)}</p>
                <p className="mt-1 text-[13px] text-ink-3">
                  {levelLabel(unit.level)}, {unit.surface} m², {unit.rooms} pièces
                </p>
              </div>
            </div>
            <div className="flex flex-1 flex-col p-6 pt-5">
              <p className="text-[14px] font-medium">{property.name}</p>
              <p className="text-[13px] text-ink-3">
                {property.address}, {property.city}
              </p>
              {unit.lease && <p className="mt-2 text-[13px] text-ink-3">Bail jusqu'au {dateLong(unit.lease.end)}</p>}
              <div className="mt-5 flex items-center gap-3 border-t border-line pt-4">
                <Avatar name={contact.name} size={38} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14px] font-medium">{contact.name}</p>
                  <p className="truncate text-[12.5px] text-ink-3">{contact.role === "manager" ? `Gestionnaire, ${contact.org}` : "Propriétaire"}</p>
                </div>
                <a
                  href={`tel:${contact.phone}`}
                  aria-label="Appeler"
                  className="grid size-10 place-items-center rounded-[12px] border border-line hover:bg-surface-2"
                >
                  <Phone size={17} />
                </a>
                <Link
                  to="/locataire/echanges"
                  aria-label="Écrire"
                  className="grid size-10 place-items-center rounded-[12px] bg-forest text-on-forest hover:bg-forest-2"
                >
                  <ChatCircleDots size={17} />
                </Link>
              </div>
            </div>
          </Panel>
        </motion.section>
      </div>

      {claims.length > 0 && (
        <section className="mt-4 grid gap-3">
          {claims.map((c) => (
            <Link key={c.id} to="/locataire/echanges" className="block min-w-0">
              <Panel className="flex items-center gap-4 p-4 transition-colors hover:border-line-strong">
                <span className="grid size-11 shrink-0 place-items-center rounded-[14px] bg-amber-soft text-amber-ink">
                  {c.status === "scheduled" ? <CalendarBlank size={20} /> : <Wrench size={20} />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14.5px] font-medium">{c.subject}</p>
                  <p className="truncate text-[13px] text-ink-3">
                    {c.status === "scheduled" && c.scheduledFor
                      ? `${c.assignee} passe ${relativeDay(c.scheduledFor)}, ${dateShort(c.scheduledFor)} à ${time(c.scheduledFor)}`
                      : claimStatusLabel[c.status!]}
                  </p>
                </div>
                <ArrowRight size={16} className="text-ink-3" />
              </Panel>
            </Link>
          ))}
        </section>
      )}

      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-[1.15fr_1fr]">
        <Panel className="p-5">
          <div className="mb-4 flex items-end justify-between gap-3">
            <div>
              <h2 className="type-display text-[19px] font-semibold">Vos paiements</h2>
              <p className="text-[13px] text-ink-3">{onTime} loyers payés à l'heure depuis votre arrivée</p>
            </div>
          </div>
          <MonthStrip d={d} invoices={invoices.slice(-12)} />
        </Panel>
        <Panel className="flex flex-col p-5">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="type-display text-[19px] font-semibold">Quittances</h2>
            <Link to="/locataire/recus" className="text-[13px] font-medium text-emerald hover:underline">
              Toutes ({receipts.length})
            </Link>
          </div>
          <ul className="-mx-2">
            {receipts.slice(0, 4).map((r) => (
              <li key={r.id}>
                <Link to={`/quittance/${r.id}`} className="flex items-center gap-3 rounded-[12px] px-2 py-2.5 hover:bg-surface-2">
                  <span className="grid size-9 place-items-center rounded-[11px] bg-mint-soft text-mint-ink">
                    <ReceiptIcon size={17} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[14px] font-medium">{periodLabel(r.period)}</span>
                    <span className="block font-mono text-[11.5px] text-ink-3">{r.number}</span>
                  </span>
                  <span className="num text-[13.5px]">{amount(r.amount)}</span>
                </Link>
              </li>
            ))}
          </ul>
          <ButtonLink to="/locataire/echanges?nouveau=reclamation" variant="secondary" className="mt-auto w-full" icon={<Wrench size={16} />}>
            Signaler un problème
          </ButtonLink>
        </Panel>
      </div>
    </main>
  );
}
