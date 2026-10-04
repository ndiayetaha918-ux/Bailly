import { ArrowRight, Buildings, ChatCircleText, Plus, Receipt as ReceiptIcon, Warning } from "@phosphor-icons/react";
import { motion } from "motion/react";
import { useMemo } from "react";
import { Link } from "react-router";
import { PropertyCard } from "@/components/property/PropertyCard";
import { RentRollBar, type RollItem } from "@/components/money/RentRollBar";
import { RevenueChart } from "@/components/money/RevenueChart";
import { MethodBadge } from "@/components/money/MethodBadge";
import { Money } from "@/components/ui/Money";
import { Panel, SectionTitle } from "@/components/ui/Panel";
import { Swatch } from "@/components/ui/Status";
import { useData } from "@/hooks/useData";
import { DEMO_OWNER_ID } from "@/data/seed";
import { attentionItems, currentInvoice, monthlySeries, propertyUnits, statsFor, unitState, type AttentionItem } from "@/domain/selectors";
import { unitTitle } from "@/domain/labels";
import type { UnitState } from "@/domain/types";
import { currentPeriod } from "@/lib/clock";
import { amount, compact, fcfa, firstName, periodLabel, relativeTime } from "@/lib/format";
import { cn } from "@/lib/cn";

export function OwnerHome() {
  const d = useData();
  const owner = d.owners.find((o) => o.id === DEMO_OWNER_ID)!;
  const props = d.properties.filter((p) => p.ownerId === DEMO_OWNER_ID);
  const ids = props.map((p) => p.id);
  const period = currentPeriod();

  const stats = useMemo(() => statsFor(d, ids), [d]);
  const series = useMemo(() => monthlySeries(d, ids), [d]);

  const roll: RollItem[] = useMemo(() => {
    const out: RollItem[] = [];
    for (const p of props) {
      for (const u of propertyUnits(d, p.id)
        .slice()
        .sort((a, b) => a.level - b.level || a.position - b.position)) {
        const inv = currentInvoice(d, u.id);
        const st = unitState(d, u);
        out.push({
          id: u.id,
          label: `${unitTitle(u.kind, u.code)}`,
          sub: p.name,
          amount: inv?.amount ?? u.rent + u.charges,
          paid: inv?.paid ?? 0,
          state: st === "late" || st === "partial" ? (inv && inv.paid >= inv.amount ? "paid" : st) : st,
          href: `/proprietaire/locaux/${u.id}`,
        });
      }
    }
    const order: Record<UnitState, number> = { paid: 0, partial: 1, late: 2, due: 3, upcoming: 4, vacant: 5 };
    return out.sort((a, b) => order[a.state] - order[b.state]);
  }, [d]);

  const watch = attentionItems(d, ids, "owner").filter((i) => i.kind !== "vacant" && i.kind !== "transfer");
  const recent = d.payments
    .filter((p) => p.status === "succeeded" && d.units.find((u) => u.id === p.unitId && ids.includes(u.propertyId)))
    .sort((a, b) => (b.settledAt ?? "").localeCompare(a.settledAt ?? ""))
    .slice(0, 6);

  const rest = Math.max(0, stats.expected - stats.collected);
  const rate = stats.expected ? Math.round((stats.collected / stats.expected) * 100) : 0;

  return (
    <main className="mx-auto max-w-[1320px] px-5 pb-20 pt-8 md:px-8">
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <p className="text-[14px] text-ink-3">Bonjour {firstName(owner.name)},</p>
        <h1 className="type-display mt-1 text-[34px] font-semibold md:text-[40px]">Votre patrimoine en {periodLabel(period, false).toLowerCase()}</h1>
      </motion.div>

      <section className="mt-7 grid grid-cols-1 gap-4 lg:grid-cols-12">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="forest-surface relative overflow-hidden rounded-[var(--radius-panel)] p-6 md:p-8 lg:col-span-8"
        >
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div>
              <p className="text-[13px] text-on-forest-2">Encaissé en {periodLabel(period).toLowerCase()}</p>
              <Money value={stats.collected} condensed className="mt-2 block text-[64px] font-semibold leading-none md:text-[80px]" />
              <p className="num mt-2 text-[14px] text-on-forest-2">
                sur {fcfa(stats.expected)} attendus, soit {rate} %
              </p>
            </div>
            <dl className="grid grid-cols-3 gap-6 text-on-forest sm:gap-8">
              <div>
                <dt className="text-[12px] text-on-forest-2">À encaisser</dt>
                <dd className="num mt-1 text-[18px] font-medium">{compact(rest)}</dd>
              </div>
              <div>
                <dt className="text-[12px] text-on-forest-2">Impayés</dt>
                <dd className="num mt-1 text-[18px] font-medium">{compact(stats.outstanding)}</dd>
              </div>
              <div>
                <dt className="text-[12px] text-on-forest-2">Occupation</dt>
                <dd className="num mt-1 text-[18px] font-medium">
                  {stats.occupied}/{stats.units}
                </dd>
              </div>
            </dl>
          </div>
          <div className="mt-8">
            <RentRollBar items={roll} />
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[12.5px] text-on-forest-2">
              <span>Chaque segment est un local, sa largeur est son loyer.</span>
              <span className="flex items-center gap-3">
                <span className="inline-flex items-center gap-1.5">
                  <span className="size-2 rounded-[2px] bg-emerald-bright" />
                  Payé
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="size-2 rounded-[2px] bg-amber" />
                  Partiel
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="size-2 rounded-[2px] bg-signal" />
                  Retard
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="size-2 rounded-[2px] bg-white/25" />À venir
                </span>
              </span>
            </div>
          </div>
          <div className="mt-8 grid grid-cols-1 gap-4 border-t border-white/12 pt-5 sm:grid-cols-3 sm:gap-6">
            {props.map((p) => {
              const st = statsFor(d, [p.id]);
              return (
                <Link key={p.id} to={`/proprietaire/biens/${p.id}`} className="group block">
                  <p className="truncate text-[13px] text-on-forest-2 group-hover:text-on-forest">{p.name}</p>
                  <p className="num mt-1 text-[17px] font-medium text-on-forest">
                    {compact(st.collected)} <span className="text-on-forest-2">/ {compact(st.expected)}</span>
                  </p>
                  <div className="mt-2 flex h-1.5 gap-[2px]">
                    <span className="rounded-full bg-emerald-bright" style={{ flexGrow: st.collected || 0.0001 }} />
                    <span className="rounded-full bg-white/15" style={{ flexGrow: Math.max(0, st.expected - st.collected) || 0.0001 }} />
                  </div>
                </Link>
              );
            })}
          </div>
        </motion.div>

        <Panel className="flex flex-col p-5 lg:col-span-4">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="type-display text-[19px] font-semibold">À surveiller</h2>
            <span className="num text-[13px] text-ink-3">{watch.length}</span>
          </div>
          {watch.length === 0 ? (
            <p className="py-8 text-center text-sm text-ink-3">Rien à signaler ce mois-ci.</p>
          ) : (
            <ul className="-mx-2 flex-1">
              {watch.slice(0, 5).map((it) => (
                <WatchRow key={it.id} item={it} />
              ))}
            </ul>
          )}
          <p className="mt-3 border-t border-line pt-3 text-[12.5px] text-ink-3">
            Kër Diarra et Le Baobab sont gérés par le Cabinet Ndoye, qui traite les relances.
          </p>
        </Panel>
      </section>

      <section className="mt-12">
        <SectionTitle
          action={
            <Link to="/proprietaire/nouveau-bien" className="inline-flex items-center gap-1 text-[13px] font-medium text-emerald hover:underline">
              Ajouter un bien <ArrowRight size={14} />
            </Link>
          }
        >
          Vos biens
        </SectionTitle>
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {props.map((p, i) => (
            <PropertyCard key={p.id} d={d} property={p} to={`/proprietaire/biens/${p.id}`} index={i} />
          ))}
          <Link
            to="/proprietaire/nouveau-bien"
            className="blueprint group relative flex min-h-[220px] flex-col justify-between overflow-hidden rounded-[var(--radius-panel)] border border-dashed border-line-strong p-6 transition-colors hover:border-emerald"
          >
            <div className="grid size-11 place-items-center rounded-[12px] bg-forest text-on-forest transition-transform duration-300 group-hover:scale-105">
              <Plus size={20} weight="bold" />
            </div>
            <div>
              <p className="type-display text-[21px] font-semibold">Ajouter un bien</p>
              <p className="mt-1 max-w-[38ch] text-[14px] text-ink-3">
                Dessinez l'immeuble étage par étage, les locaux sont créés au fur et à mesure.
              </p>
            </div>
            <Buildings
              size={140}
              weight="thin"
              className="absolute -bottom-4 right-4 text-line-strong transition-transform duration-500 group-hover:-translate-y-1"
            />
          </Link>
        </div>
      </section>

      <section className="mt-12 grid grid-cols-1 gap-4 lg:grid-cols-12">
        <Panel className="p-5 md:p-6 lg:col-span-8">
          <SectionTitle>Encaissements sur 12 mois</SectionTitle>
          <RevenueChart data={series} />
        </Panel>
        <Panel className="flex flex-col p-5 lg:col-span-4">
          <SectionTitle
            action={
              <Link to="/proprietaire/paiements" className="text-[13px] font-medium text-emerald hover:underline">
                Tout voir
              </Link>
            }
          >
            Derniers paiements
          </SectionTitle>
          <ul className="-mx-2">
            {recent.map((p) => {
              const u = d.units.find((x) => x.id === p.unitId)!;
              const prop = d.properties.find((x) => x.id === u.propertyId)!;
              return (
                <li key={p.id}>
                  <Link to={`/proprietaire/locaux/${u.id}`} className="flex items-center gap-3 rounded-[12px] px-2 py-2.5 hover:bg-surface-2">
                    <MethodBadge method={p.method} size={30} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[14px] font-medium">{unitTitle(u.kind, u.code)}</span>
                      <span className="block truncate text-[12.5px] text-ink-3">
                        {prop.name}, {relativeTime(p.settledAt!)}
                      </span>
                    </span>
                    <span className="num text-[14px] font-medium">+{amount(p.amount)}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </Panel>
      </section>
    </main>
  );
}

function WatchRow({ item }: { item: AttentionItem }) {
  const d = useData();
  const u = d.units.find((x) => x.id === item.unitId)!;
  const p = d.properties.find((x) => x.id === u.propertyId)!;
  const icon =
    item.kind === "late" || item.kind === "partial" ? (
      <Swatch state={item.kind === "late" ? "late" : "partial"} className="size-3" />
    ) : item.kind === "message" ? (
      <ChatCircleText size={16} className="text-ink-3" />
    ) : item.kind === "claim" ? (
      <Warning size={16} className={item.urgent ? "text-signal" : "text-ink-3"} />
    ) : (
      <ReceiptIcon size={16} className="text-ink-3" />
    );
  return (
    <li>
      <Link to={`/proprietaire/locaux/${u.id}`} className="flex items-start gap-3 rounded-[12px] px-2 py-2.5 hover:bg-surface-2">
        <span className="mt-1 grid size-4 place-items-center">{icon}</span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[14px] font-medium">{item.title}</span>
          <span className="block truncate text-[12.5px] text-ink-3">
            {unitTitle(u.kind, u.code)}, {p.name.replace("Résidence ", "").replace("Immeuble ", "")}
          </span>
        </span>
        {item.amount ? (
          <span className={cn("num mt-0.5 text-[13.5px] font-medium", item.kind === "late" ? "text-signal-ink" : "text-ink")}>
            {compact(item.amount)}
          </span>
        ) : (
          <span className="mt-0.5 text-[12.5px] text-ink-3">{item.detail}</span>
        )}
      </Link>
    </li>
  );
}
