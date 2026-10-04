import { ArrowUpRight } from "@phosphor-icons/react";
import { motion } from "motion/react";
import { Link } from "react-router";
import { Facade, FacadeLegend } from "@/components/facade/Facade";
import { propertyKindLabel } from "@/domain/labels";
import { propertyUnits, statsFor, unitState, type Data } from "@/domain/selectors";
import type { Property, UnitState } from "@/domain/types";
import { compact } from "@/lib/format";

export function PropertyCard({ d, property, to, index = 0 }: { d: Data; property: Property; to: string; index?: number }) {
  const units = propertyUnits(d, property.id);
  const stats = statsFor(d, [property.id]);
  const counts: Partial<Record<UnitState, number>> = {};
  for (const u of units) {
    const s = unitState(d, u);
    counts[s] = (counts[s] ?? 0) + 1;
  }
  const manager = property.managerId ? d.managers.find((m) => m.id === property.managerId) : null;
  const rate = stats.expected ? Math.round((stats.collected / stats.expected) * 100) : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.05 + index * 0.06, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
    >
      <Link
        to={to}
        className="group grid h-full grid-cols-1 overflow-hidden rounded-[var(--radius-panel)] border border-line bg-surface transition-[box-shadow,border-color] duration-300 hover:border-line-strong hover:shadow-[var(--shadow-lift)] sm:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]"
      >
        <div className="relative flex items-center justify-center bg-surface-2 px-8 py-7">
          <div className="w-full max-w-[230px] transition-transform duration-500 ease-[var(--ease-out-expo)] group-hover:-translate-y-1">
            <Facade property={property} units={units} entrance={d.entrances[property.id]} stateOf={(u) => unitState(d, u)} size="sm" depth={12} />
          </div>
        </div>
        <div className="flex flex-col p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="type-display truncate text-[21px] font-semibold">{property.name}</h3>
              <p className="mt-1 text-[13px] text-ink-3">
                {property.district}, {propertyKindLabel[property.kind].toLowerCase()}
              </p>
            </div>
            <ArrowUpRight
              size={18}
              className="mt-1 shrink-0 text-ink-3 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-ink"
            />
          </div>

          <dl className="mb-5 mt-5 grid grid-cols-2 gap-x-4 gap-y-3">
            <div>
              <dt className="text-[12px] text-ink-3">Ce mois</dt>
              <dd className="mt-0.5 text-[15px] font-medium">
                <span className="num">{compact(stats.collected)}</span>
                <span className="text-ink-3"> / {compact(stats.expected)}</span>
              </dd>
            </div>
            <div>
              <dt className="text-[12px] text-ink-3">Encaissé</dt>
              <dd className="num mt-0.5 text-[15px] font-medium">{rate} %</dd>
            </div>
            <div>
              <dt className="text-[12px] text-ink-3">Occupation</dt>
              <dd className="num mt-0.5 text-[15px] font-medium">
                {stats.occupied}/{stats.units}
              </dd>
            </div>
            <div>
              <dt className="text-[12px] text-ink-3">Gestion</dt>
              <dd className="mt-0.5 truncate text-[15px] font-medium">{manager ? manager.agency.replace(" Immobilier", "") : "Directe"}</dd>
            </div>
          </dl>
          <FacadeLegend counts={counts} className="mt-auto border-t border-line pt-4" />
        </div>
      </Link>
    </motion.div>
  );
}
