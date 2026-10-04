import { MagnifyingGlass } from "@phosphor-icons/react";
import { motion } from "motion/react";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { Facade, FacadeLegend } from "@/components/facade/Facade";
import { Panel } from "@/components/ui/Panel";
import { useData } from "@/hooks/useData";
import { DEMO_MANAGER_ID } from "@/data/seed";
import { managedPropertyIds, propertyUnits, statsFor, unitState } from "@/domain/selectors";
import { propertyKindLabel } from "@/domain/labels";
import type { UnitState } from "@/domain/types";
import { daysBetween, today } from "@/lib/clock";
import { compact } from "@/lib/format";
import { cn } from "@/lib/cn";

/*
  The wall: every managed building side by side, every local a window.
  Filters and search light up the matching windows and dim the rest.
*/

type Filter = "all" | "late" | "partial" | "due" | "vacant" | "lease";

export function ManagerUnits() {
  const d = useData();
  const navigate = useNavigate();
  const ids = managedPropertyIds(d, DEMO_MANAGER_ID);
  const props = d.properties.filter((p) => ids.includes(p.id));
  const [filter, setFilter] = useState<Filter>("all");
  const [q, setQ] = useState("");

  const units = d.units.filter((u) => ids.includes(u.propertyId));
  const match = useMemo(() => {
    if (filter === "all" && !q.trim()) return null;
    const needle = q.trim().toLowerCase();
    const set = new Set<string>();
    for (const u of units) {
      const st = unitState(d, u);
      const tenant = d.tenants.find((t) => t.id === u.tenantId);
      const okFilter =
        filter === "all" ||
        (filter === "lease"
          ? !!u.lease && daysBetween(today(), u.lease.end) <= 60
          : filter === "due"
            ? st === "due" || st === "upcoming"
            : st === filter);
      const okQ = !needle || u.code.toLowerCase().includes(needle) || (tenant?.name.toLowerCase().includes(needle) ?? false);
      if (okFilter && okQ) set.add(u.id);
    }
    return set;
  }, [d, filter, q]); // eslint-disable-line react-hooks/exhaustive-deps

  const counts: Partial<Record<UnitState, number>> = {};
  for (const u of units) {
    const st = unitState(d, u);
    counts[st] = (counts[st] ?? 0) + 1;
  }
  const leaseCount = units.filter((u) => u.lease && daysBetween(today(), u.lease.end) <= 60).length;

  return (
    <main className="px-4 pb-12 pt-6 md:px-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="type-display text-[34px] font-semibold md:text-[40px]">Locaux</h1>
          <p className="mt-1 text-[14px] text-ink-3">
            {units.length} locaux dans {props.length} immeubles, pour {new Set(props.map((p) => p.ownerId)).size} propriétaires.
          </p>
        </div>
        <label className="relative block w-full sm:w-[300px]">
          <span className="sr-only">Rechercher un local ou un locataire</span>
          <MagnifyingGlass size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-3" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Code ou nom du locataire"
            className="h-11 w-full rounded-[var(--radius-control)] border border-line-strong bg-surface pl-10 pr-3 text-[14px] placeholder:text-ink-3 focus:border-emerald focus:outline-none"
          />
        </label>
      </div>

      <div className="scrollbar-none mt-5 flex gap-1.5 overflow-x-auto">
        {(
          [
            ["all", "Tous", units.length],
            ["late", "En retard", counts.late ?? 0],
            ["partial", "Partiels", counts.partial ?? 0],
            ["due", "À venir", (counts.due ?? 0) + (counts.upcoming ?? 0)],
            ["vacant", "Vacants", counts.vacant ?? 0],
            ["lease", "Bail sous 60 jours", leaseCount],
          ] as Array<[Filter, string, number]>
        ).map(([f, label, n]) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              "inline-flex h-9 shrink-0 items-center gap-2 rounded-full px-3.5 text-[13px] font-medium transition-colors",
              filter === f ? "bg-forest text-on-forest" : "bg-surface text-ink-2 ring-1 ring-line hover:ring-line-strong",
            )}
          >
            {label}
            <span className={cn("num text-[12px]", filter === f ? "text-on-forest-2" : "text-ink-3")}>{n}</span>
          </button>
        ))}
      </div>

      <Panel className="blueprint mt-4 overflow-x-auto">
        <div className="flex min-w-max items-end gap-10 px-8 pb-8 pt-10">
          {props.map((p, i) => {
            const st = statsFor(d, [p.id]);
            const owner = d.owners.find((o) => o.id === p.ownerId)!;
            const pu = propertyUnits(d, p.id);
            const hits = match ? pu.filter((u) => match.has(u.id)).length : null;
            return (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.07, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                className="flex flex-col"
              >
                <div style={{ width: Math.max(170, p.bays * 74) }}>
                  <Facade
                    property={p}
                    units={pu}
                    entrance={d.entrances[p.id]}
                    stateOf={(u) => unitState(d, u)}
                    size="md"
                    depth={16}
                    highlightIds={match}
                    onSelect={(u) => navigate(`/gestionnaire/locaux/${u.id}`)}
                  />
                </div>
                <div className="mt-4">
                  <p className="type-display text-[18px] font-semibold">{p.name}</p>
                  <p className="text-[12.5px] text-ink-3">
                    {p.district}, {propertyKindLabel[p.kind].toLowerCase()}
                  </p>
                  <p className="mt-1 text-[12.5px] text-ink-3">Pour {owner.name}</p>
                  <p className="num mt-2 text-[13px]">
                    <span className="font-medium">{compact(st.collected)}</span>
                    <span className="text-ink-3"> / {compact(st.expected)} ce mois</span>
                    {hits !== null && (
                      <span className="ml-2 rounded-full bg-forest px-2 py-0.5 text-[11.5px] font-medium text-on-forest">{hits}</span>
                    )}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </Panel>
      <FacadeLegend counts={counts} className="mt-4" />
    </main>
  );
}
