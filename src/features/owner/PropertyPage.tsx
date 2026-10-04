import { ArrowLeft, ArrowRight, Cube, MapPin, SquaresFour, User } from "@phosphor-icons/react";
import { AnimatePresence, motion } from "motion/react";
import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { Facade, FacadeLegend } from "@/components/facade/Facade";
import { Building3DLazy } from "@/components/building3d/Building3DLazy";
import { readPalette3D, stateColor3D } from "@/components/building3d/colors";
import { ButtonLink } from "@/components/ui/Button";
import { Money } from "@/components/ui/Money";
import { Panel } from "@/components/ui/Panel";
import { Segmented } from "@/components/ui/Segmented";
import { StatusChip, Swatch } from "@/components/ui/Status";
import { useData } from "@/hooks/useData";
import { currentInvoice, overdueInvoices, balance, propertyUnits, statsFor, unitState } from "@/domain/selectors";
import { levelLabel, propertyKindLabel, unitKindLabel, unitTitle } from "@/domain/labels";
import type { Unit, UnitState } from "@/domain/types";
import { compact, dateShort, fcfa, periodLabel } from "@/lib/format";
import { currentPeriod } from "@/lib/clock";
import { NotFound } from "@/features/NotFound";

export function PropertyPage({ base = "/proprietaire" }: { base?: string }) {
  const { propertyId } = useParams();
  const d = useData();
  const navigate = useNavigate();
  const property = d.properties.find((p) => p.id === propertyId);
  const [view, setView] = useState<"facade" | "model">("facade");
  const [selected, setSelected] = useState<string | null>(null);

  const units = useMemo(() => (property ? propertyUnits(d, property.id) : []), [d, property]);
  const palette = useMemo(() => readPalette3D(), [view]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!property) return <NotFound />;

  const stats = statsFor(d, [property.id]);
  const manager = property.managerId ? d.managers.find((m) => m.id === property.managerId) : null;
  const counts: Partial<Record<UnitState, number>> = {};
  for (const u of units) {
    const st = unitState(d, u);
    counts[st] = (counts[st] ?? 0) + 1;
  }
  const sel = units.find((u) => u.id === selected) ?? null;
  const byLevel = Array.from({ length: property.levels }, (_, i) => property.levels - 1 - i).map((level) => ({
    level,
    units: units.filter((u) => u.level === level).sort((a, b) => a.position - b.position),
  }));

  return (
    <main className="mx-auto max-w-[1320px] px-5 pb-20 pt-6 md:px-8">
      <Link to={base} className="inline-flex items-center gap-1.5 text-[13px] font-medium text-ink-3 hover:text-ink">
        <ArrowLeft size={14} /> Patrimoine
      </Link>

      <header className="mt-4 flex flex-wrap items-end justify-between gap-6">
        <div>
          <h1 className="type-display text-[38px] font-semibold md:text-[46px]">{property.name}</h1>
          <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[14px] text-ink-3">
            <span className="inline-flex items-center gap-1.5">
              <MapPin size={15} /> {property.address}, {property.city}
            </span>
            <span>
              {propertyKindLabel[property.kind]}
              {property.builtYear ? `, ${property.builtYear}` : ""}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <User size={15} /> {manager ? `Géré par ${manager.agency}` : "Gestion directe"}
            </span>
          </p>
        </div>
        <dl className="flex gap-8">
          <div>
            <dt className="text-[12px] text-ink-3">{periodLabel(currentPeriod())}</dt>
            <dd className="mt-1">
              <Money value={stats.collected} className="text-[26px] font-semibold" currency={null} />
              <span className="num text-[14px] text-ink-3"> / {compact(stats.expected)}</span>
            </dd>
          </div>
          <div>
            <dt className="text-[12px] text-ink-3">Occupation</dt>
            <dd className="type-display mt-1 text-[26px] font-semibold">
              {stats.occupied}
              <span className="text-[16px] text-ink-3">/{stats.units}</span>
            </dd>
          </div>
          <div>
            <dt className="text-[12px] text-ink-3">Impayés</dt>
            <dd className="type-display mt-1 text-[26px] font-semibold">{compact(stats.outstanding)}</dd>
          </div>
        </dl>
      </header>

      <section className="mt-8 grid grid-cols-1 gap-4 lg:grid-cols-12">
        <Panel className="relative overflow-hidden lg:col-span-7">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-3">
            <Segmented
              size="sm"
              value={view}
              onChange={setView}
              options={[
                {
                  value: "facade",
                  label: (
                    <span className="inline-flex items-center gap-1.5">
                      <SquaresFour size={14} />
                      Façade
                    </span>
                  ),
                },
                {
                  value: "model",
                  label: (
                    <span className="inline-flex items-center gap-1.5">
                      <Cube size={14} />
                      Maquette 3D
                    </span>
                  ),
                },
              ]}
            />
            <FacadeLegend counts={counts} />
          </div>
          <div className="blueprint relative h-[460px] md:h-[520px]">
            <AnimatePresence mode="wait">
              {view === "facade" ? (
                <motion.div
                  key="facade"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex h-full items-center justify-center px-6 py-8"
                >
                  <div className="w-full" style={{ maxWidth: Math.min(560, 120 * property.bays + 120) }}>
                    <Facade
                      property={property}
                      units={units}
                      entrance={d.entrances[property.id]}
                      stateOf={(u) => unitState(d, u)}
                      size={property.levels > 5 ? "md" : "lg"}
                      showLevels
                      depth={26}
                      selectedId={selected}
                      onSelect={(u) => setSelected(u.id === selected ? null : u.id)}
                    />
                  </div>
                </motion.div>
              ) : (
                <motion.div key="model" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full">
                  <Building3DLazy
                    className="h-full"
                    levels={property.levels}
                    bays={property.bays}
                    entrance={d.entrances[property.id]}
                    palette={palette}
                    selectedId={selected}
                    onSelect={(id) => setSelected(id === selected ? null : id)}
                    blocks={units.map((u) => ({
                      id: u.id,
                      level: u.level,
                      position: u.position,
                      span: u.span,
                      color: stateColor3D(unitState(d, u)),
                      label: u.code,
                    }))}
                  />
                  <p className="pointer-events-none absolute bottom-3 left-4 text-[12px] text-ink-3">Glissez pour tourner autour de l'immeuble</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </Panel>

        <div className="lg:col-span-5">
          <AnimatePresence mode="wait">
            {sel ? (
              <UnitPeek key={sel.id} unit={sel} base={base} onClose={() => setSelected(null)} />
            ) : (
              <motion.div key="hint" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <Panel className="flex h-full flex-col p-5">
                  <h2 className="type-display text-[19px] font-semibold">Les locaux, étage par étage</h2>
                  <p className="mt-1 text-[13px] text-ink-3">Touchez une fenêtre de la façade pour voir le local.</p>
                  <div className="mt-4 grid gap-4">
                    {byLevel.map(({ level, units: lu }) => (
                      <div key={level}>
                        <p className="mb-1.5 text-[12px] font-medium text-ink-3">{levelLabel(level)}</p>
                        <div className="flex flex-wrap gap-1.5">
                          {lu.map((u) => (
                            <button
                              key={u.id}
                              onClick={() => setSelected(u.id)}
                              className="inline-flex h-8 items-center gap-2 rounded-[10px] border border-line bg-surface px-2.5 text-[13px] font-medium transition-colors hover:border-line-strong hover:bg-surface-2"
                            >
                              <Swatch state={unitState(d, u)} />
                              <span className="font-mono text-[12.5px]">{u.code}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </Panel>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </section>

      <section className="mt-10">
        <h2 className="type-display mb-3 text-[19px] font-semibold">Tous les locaux</h2>
        <Panel className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-[14px]">
              <thead>
                <tr className="text-left text-[12px] text-ink-3">
                  <th className="px-5 py-3 font-medium">Local</th>
                  <th className="px-3 py-3 font-medium">Locataire</th>
                  <th className="px-3 py-3 text-right font-medium">Loyer + charges</th>
                  <th className="px-3 py-3 font-medium">Échéance</th>
                  <th className="px-3 py-3 font-medium">Statut</th>
                  <th className="w-10 px-3 py-3" />
                </tr>
              </thead>
              {byLevel.map(({ level, units: lu }) => (
                <tbody key={level}>
                  <tr>
                    <td colSpan={6} className="bg-surface-2 px-5 py-1.5 text-[12px] font-medium text-ink-3">
                      {levelLabel(level)}
                    </td>
                  </tr>
                  {lu.map((u) => {
                    const tenant = d.tenants.find((t) => t.id === u.tenantId);
                    const inv = currentInvoice(d, u.id);
                    return (
                      <tr
                        key={u.id}
                        onClick={() => navigate(`${base}/locaux/${u.id}`)}
                        className="cursor-pointer border-t border-line transition-colors hover:bg-surface-2"
                      >
                        <td className="px-5 py-3">
                          <span className="font-medium">{unitTitle(u.kind, u.code)}</span>
                          <span className="block text-[12.5px] text-ink-3">
                            {u.surface} m²{u.rooms ? `, ${u.rooms} pièces` : ""}
                          </span>
                        </td>
                        <td className="px-3 py-3">{tenant ? tenant.name : <span className="text-ink-3">Vacant</span>}</td>
                        <td className="num px-3 py-3 text-right">{fcfa(u.rent + u.charges)}</td>
                        <td className="px-3 py-3 text-ink-2">{inv ? dateShort(inv.dueDate) : `Le ${u.dueDay}`}</td>
                        <td className="px-3 py-3">
                          <StatusChip state={unitState(d, u)} />
                        </td>
                        <td className="px-3 py-3 text-ink-3">
                          <ArrowRight size={15} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              ))}
            </table>
          </div>
        </Panel>
      </section>
    </main>
  );
}

function UnitPeek({ unit, base, onClose }: { unit: Unit; base: string; onClose: () => void }) {
  const d = useData();
  const tenant = d.tenants.find((t) => t.id === unit.tenantId);
  const st = unitState(d, unit);
  const inv = currentInvoice(d, unit.id);
  const overdue = overdueInvoices(d, unit.id);
  const owed = balance(overdue);
  const lastPay = d.payments
    .filter((p) => p.unitId === unit.id && p.status === "succeeded")
    .sort((a, b) => (b.settledAt ?? "").localeCompare(a.settledAt ?? ""))[0];

  return (
    <motion.div initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 12 }} transition={{ duration: 0.25 }}>
      <Panel className="flex h-full flex-col p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[12px] text-ink-3">{levelLabel(unit.level)}</p>
            <h2 className="type-display mt-1 text-[28px] font-semibold">{unitTitle(unit.kind, unit.code)}</h2>
            <p className="mt-1 text-[13px] text-ink-3">
              {unitKindLabel[unit.kind]}, {unit.surface} m²{unit.rooms ? `, ${unit.rooms} pièces` : ""}
            </p>
          </div>
          <button onClick={onClose} className="text-[13px] font-medium text-ink-3 hover:text-ink">
            Fermer
          </button>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-4 rounded-[14px] bg-surface-2 p-4">
          <div>
            <p className="text-[12px] text-ink-3">Loyer mensuel</p>
            <Money value={unit.rent + unit.charges} className="mt-1 block text-[22px] font-semibold" />
          </div>
          <div>
            <p className="text-[12px] text-ink-3">Statut</p>
            <div className="mt-1.5">
              <StatusChip state={st} />
            </div>
          </div>
          <div>
            <p className="text-[12px] text-ink-3">Locataire</p>
            <p className="mt-1 text-[14px] font-medium">{tenant?.name ?? "Aucun"}</p>
          </div>
          <div>
            <p className="text-[12px] text-ink-3">{owed ? "Reste dû" : "Échéance"}</p>
            <p className="num mt-1 text-[14px] font-medium">{owed ? fcfa(owed) : inv ? dateShort(inv.dueDate) : `Le ${unit.dueDay}`}</p>
          </div>
        </div>
        {lastPay && (
          <p className="mt-4 text-[13px] text-ink-3">
            Dernier paiement : <span className="num text-ink-2">{fcfa(lastPay.amount)}</span> le {dateShort(lastPay.settledAt!)}
          </p>
        )}
        <div className="mt-auto pt-5">
          <ButtonLink to={`${base}/locaux/${unit.id}`} variant="dark" className="w-full" trailing={<ArrowRight size={16} />}>
            Ouvrir la fiche du local
          </ButtonLink>
        </div>
      </Panel>
    </motion.div>
  );
}
