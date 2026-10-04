import { ArrowLeft, ArrowRight, Buildings, Check, Cube, HouseLine, Minus, Plus, Storefront, SquaresFour, Stack } from "@phosphor-icons/react";
import { brand } from "@/brand/brand";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router";
import { Building3D, type Block3D } from "@/components/building3d/Building3D";
import { readPalette3D } from "@/components/building3d/colors";
import { Facade } from "@/components/facade/Facade";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select } from "@/components/ui/Form";
import { Money } from "@/components/ui/Money";
import { Segmented } from "@/components/ui/Segmented";
import { toast } from "@/components/ui/Toast";
import { useStore, type PropertyDraft } from "@/store/store";
import { DEMO_OWNER_ID } from "@/data/seed";
import { levelLabel, levelShort, propertyKindLabel, unitKindLabel } from "@/domain/labels";
import type { PropertyKind, Unit, UnitKind } from "@/domain/types";
import { amount, fcfa, plural } from "@/lib/format";
import { cn } from "@/lib/cn";

/*
  Building builder. The owner describes the building the way they think of
  it (how many storeys, how wide, what's on the ground floor) and watches the
  model rise. Units are generated per floor and stay editable.
*/

type Step = "bien" | "structure" | "locaux" | "recap";

interface FloorPlan {
  count: number;
  kind: UnitKind;
  rent: number;
}

const DISTRICTS = [
  "Almadies",
  "Fann",
  "HLM",
  "Liberté 6",
  "Mermoz",
  "Ngor",
  "Ouakam",
  "Plateau",
  "Point E",
  "Sacré-Cœur",
  "Sicap Baobab",
  "Yoff",
  "Grand Yoff",
  "Parcelles Assainies",
  "Médina",
];

const KIND_COLORS: Record<UnitKind, string> = brand.kindColors;

const BASE_RENT: Record<UnitKind, number> = {
  appartement: 260000,
  studio: 150000,
  bureau: 380000,
  boutique: 190000,
  magasin: 420000,
};
const BASE_SURFACE: Record<UnitKind, number> = { appartement: 72, studio: 32, bureau: 60, boutique: 36, magasin: 80 };

const KIND_OPTIONS: Array<{ v: PropertyKind; label: string; icon: React.ReactNode; hint: string }> = [
  { v: "immeuble", label: "Immeuble", icon: <Buildings size={22} />, hint: "Appartements sur plusieurs étages" },
  { v: "mixte", label: "Immeuble mixte", icon: <Stack size={22} />, hint: "Commerces en bas, logements au-dessus" },
  { v: "villa", label: "Villa", icon: <HouseLine size={22} />, hint: "Une maison découpée en logements" },
  { v: "commercial", label: "Commercial", icon: <Storefront size={22} />, hint: "Boutiques et bureaux" },
];

function spans(bays: number, count: number): number[] {
  const base = Math.floor(bays / count);
  const extra = bays % count;
  return Array.from({ length: count }, (_, i) => base + (i < extra ? 1 : 0));
}

function defaultPlan(kind: PropertyKind, level: number, bays: number): FloorPlan {
  if (kind === "commercial")
    return level === 0
      ? { count: bays, kind: "boutique", rent: BASE_RENT.boutique }
      : { count: Math.max(1, Math.ceil(bays / 2)), kind: "bureau", rent: BASE_RENT.bureau };
  if (kind === "mixte" && level === 0) return { count: Math.max(1, bays - 1), kind: "boutique", rent: BASE_RENT.boutique };
  if (kind === "villa") return { count: level === 0 ? 1 : Math.min(2, bays), kind: "appartement", rent: BASE_RENT.appartement * 2 };
  return { count: Math.max(1, bays), kind: "appartement", rent: BASE_RENT.appartement };
}

function unitCode(level: number, i: number, kind: UnitKind) {
  if (level === 0) return kind === "boutique" || kind === "magasin" ? `B-0${i + 1}` : `RDC-${i + 1}`;
  return `${level}${String(i + 1).padStart(2, "0")}`;
}

export default function PropertyBuilder() {
  const navigate = useNavigate();
  const createProperty = useStore((s) => s.createProperty);
  const theme = useStore((s) => s.theme);
  const reduce = useReducedMotion();

  const [step, setStep] = useState<Step>("bien");
  const [name, setName] = useState("Résidence Les Filaos");
  const [kind, setKind] = useState<PropertyKind>("mixte");
  const [address, setAddress] = useState("Rue 10, Point E");
  const [district, setDistrict] = useState("Point E");
  const [levels, setLevels] = useState(4);
  const [bays, setBays] = useState(3);
  const [entrance, setEntrance] = useState<number | null>(1);
  const [plans, setPlans] = useState<Record<number, FloorPlan>>({});
  const [overrides, setOverrides] = useState<Record<string, { rent?: number; kind?: UnitKind }>>({});
  const [activeLevel, setActiveLevel] = useState<number | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [view, setView] = useState<"model" | "facade">("model");
  const [spin, setSpin] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const palette = useMemo(() => readPalette3D(), [theme]); // eslint-disable-line react-hooks/exhaustive-deps

  const planFor = (level: number): FloorPlan => {
    const p = plans[level] ?? defaultPlan(kind, level, bays);
    // Leave room for the entrance on the ground floor.
    const room = level === 0 && entrance !== null ? bays - 1 : bays;
    return { ...p, count: Math.max(1, Math.min(p.count, Math.max(1, room))) };
  };

  const draftUnits = useMemo(() => {
    const out: PropertyDraft["units"] = [];
    for (let level = 0; level < levels; level++) {
      const plan = planFor(level);
      // Contiguous runs of free bays (the hall splits the ground floor in two).
      const free = Array.from({ length: bays }, (_, b) => b).filter((b) => !(level === 0 && entrance !== null && b === entrance));
      const segments: number[][] = [];
      for (const b of free) {
        const last = segments[segments.length - 1];
        if (last && last[last.length - 1] === b - 1) last.push(b);
        else segments.push([b]);
      }
      // Share the units between segments, proportionally to their width.
      let counts = segments.map((seg) => Math.max(1, Math.round((plan.count * seg.length) / free.length)));
      if (plan.count < segments.length) counts = segments.map((_, i) => (i === 0 ? plan.count : 0));
      let diff = plan.count - counts.reduce((a, c) => a + c, 0);
      for (let i = 0; diff !== 0 && i < 20; i++) {
        const k = i % segments.length;
        if (diff > 0 && counts[k]! < segments[k]!.length) {
          counts[k]!++;
          diff--;
        } else if (diff < 0 && counts[k]! > (plan.count >= segments.length ? 1 : 0)) {
          counts[k]!--;
          diff++;
        }
      }
      let n = 0;
      segments.forEach((seg, si) => {
        const c = counts[si]!;
        if (!c) return;
        let cursor = 0;
        for (const span of spans(seg.length, c)) {
          const piece = seg.slice(cursor, cursor + span);
          cursor += span;
          const code = unitCode(level, n++, plan.kind);
          const o = overrides[`${level}:${code}`] ?? {};
          const k = o.kind ?? plan.kind;
          out.push({
            code,
            kind: k,
            level,
            position: piece[0]!,
            span: piece.length,
            surface: BASE_SURFACE[k] * piece.length,
            rooms: k === "appartement" ? 2 + piece.length : k === "studio" ? 1 : undefined,
            rent: o.rent ?? plan.rent * piece.length,
            charges: k === "appartement" || k === "studio" ? 15000 : 10000,
          });
        }
      });
    }
    return out;
  }, [levels, bays, entrance, plans, overrides, kind]); // eslint-disable-line react-hooks/exhaustive-deps

  const blocks: Block3D[] = draftUnits.map((u) => ({
    id: `${u.level}:${u.code}`,
    level: u.level,
    position: u.position,
    span: u.span,
    color: activeLevel !== null && activeLevel !== u.level ? (theme === "dark" ? palette.slab : palette.core) : KIND_COLORS[u.kind],
    label: `${u.code}, ${unitKindLabel[u.kind].toLowerCase()}`,
  }));

  const total = draftUnits.reduce((s, u) => s + u.rent + u.charges, 0);
  const byKind = draftUnits.reduce<Partial<Record<UnitKind, number>>>((m, u) => ({ ...m, [u.kind]: (m[u.kind] ?? 0) + 1 }), {});

  const steps: Array<{ v: Step; label: string }> = [
    { v: "bien", label: "Le bien" },
    { v: "structure", label: "Structure" },
    { v: "locaux", label: "Locaux" },
    { v: "recap", label: "Récapitulatif" },
  ];
  const stepIdx = steps.findIndex((s) => s.v === step);

  const validateBien = () => {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = "Donnez un nom au bien.";
    if (!address.trim()) e.address = "Indiquez une adresse.";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const go = (s: Step) => {
    if (stepIdx === 0 && s !== "bien" && !validateBien()) return;
    setStep(s);
    if (s === "locaux") setActiveLevel((l) => l ?? levels - 1);
    else setActiveLevel(null);
  };

  const create = () => {
    const id = createProperty(
      { name: name.trim(), kind, address: address.trim(), district, city: "Dakar", levels, bays, entrance, units: draftUnits },
      DEMO_OWNER_ID,
      null,
    );
    toast("Bien créé", `${name.trim()}, ${plural(draftUnits.length, "local", "locaux")}`);
    navigate(`/proprietaire/biens/${id}`);
  };

  const setPlan = (level: number, patch: Partial<FloorPlan>) => setPlans((p) => ({ ...p, [level]: { ...planFor(level), ...patch } }));

  const facadeUnits: Unit[] = draftUnits.map((u) => ({
    id: `${u.level}:${u.code}`,
    propertyId: "draft",
    code: u.code,
    kind: u.kind,
    level: u.level,
    position: u.position,
    span: u.span,
    surface: u.surface,
    rent: u.rent,
    charges: u.charges,
    dueDay: 5,
    tenantId: null,
    lease: null,
  }));

  return (
    <main className="mx-auto grid max-w-[1440px] grid-cols-1 gap-0 lg:min-h-[calc(100dvh-64px)] lg:grid-cols-[minmax(380px,460px)_1fr]">
      {/* Form */}
      <section className="order-2 flex flex-col border-line px-5 pb-10 pt-6 md:px-8 lg:order-1 lg:border-r">
        <Link to="/proprietaire" className="inline-flex items-center gap-1.5 text-[13px] font-medium text-ink-3 hover:text-ink">
          <ArrowLeft size={14} /> Patrimoine
        </Link>
        <h1 className="type-display mt-4 text-[34px] font-semibold">Ajouter un bien</h1>
        <p className="mt-1 text-[14px] text-ink-3">Décrivez l'immeuble, la maquette se construit en même temps.</p>

        <nav className="mt-6 grid grid-cols-4 gap-1" aria-label="Étapes">
          {steps.map((s, i) => (
            <button key={s.v} onClick={() => go(s.v)} className="group text-left">
              <span className={cn("block h-1 rounded-full transition-colors", i <= stepIdx ? "bg-forest" : "bg-surface-3")} />
              <span className={cn("mt-2 block text-[12.5px] font-medium", i === stepIdx ? "text-ink" : "text-ink-3 group-hover:text-ink-2")}>
                {s.label}
              </span>
            </button>
          ))}
        </nav>

        <div className="mt-6 flex-1">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            >
              {step === "bien" && (
                <div className="grid gap-5">
                  <Field label="Nom du bien" error={errors.name}>
                    {(id) => <Input id={id} value={name} onChange={(e) => setName(e.target.value)} />}
                  </Field>
                  <div className="grid gap-2">
                    <span className="text-[13px] font-medium text-ink-2">Type</span>
                    <div className="grid grid-cols-2 gap-2">
                      {KIND_OPTIONS.map((o) => (
                        <button
                          key={o.v}
                          onClick={() => {
                            setKind(o.v);
                            setPlans({});
                            setOverrides({});
                            if (o.v === "villa") {
                              setLevels(2);
                              setBays(2);
                              setEntrance(null);
                            } else if (o.v === "commercial") {
                              setLevels(2);
                              setBays(5);
                              setEntrance(null);
                            } else {
                              setLevels((l) => Math.max(l, 3));
                              setBays((b) => Math.max(b, 3));
                              setEntrance(1);
                            }
                          }}
                          className={cn(
                            "flex flex-col gap-2 rounded-[14px] border p-3.5 text-left transition-colors",
                            kind === o.v ? "border-emerald bg-mint-soft" : "border-line bg-surface hover:border-line-strong",
                          )}
                        >
                          <span className={kind === o.v ? "text-mint-ink" : "text-ink-3"}>{o.icon}</span>
                          <span className="text-[14px] font-medium">{o.label}</span>
                          <span className="text-[12px] leading-snug text-ink-3">{o.hint}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                  <Field label="Adresse" error={errors.address}>
                    {(id) => <Input id={id} value={address} onChange={(e) => setAddress(e.target.value)} />}
                  </Field>
                  <Field label="Quartier">
                    {(id) => (
                      <Select id={id} value={district} onChange={(e) => setDistrict(e.target.value)}>
                        {DISTRICTS.map((d) => (
                          <option key={d}>{d}</option>
                        ))}
                      </Select>
                    )}
                  </Field>
                </div>
              )}

              {step === "structure" && (
                <div className="grid gap-6">
                  <Stepper
                    label="Niveaux"
                    hint={levels === 1 ? "Plain-pied" : `Rez-de-chaussée + ${levels - 1} étage${levels > 2 ? "s" : ""}`}
                    value={levels}
                    display={levels === 1 ? "RDC" : `R+${levels - 1}`}
                    min={1}
                    max={12}
                    onChange={(v) => setLevels(v)}
                  />
                  <Stepper
                    label="Largeur de façade"
                    hint="Nombre de travées, une travée accueille un petit local"
                    value={bays}
                    display={`${bays} travée${bays > 1 ? "s" : ""}`}
                    min={1}
                    max={6}
                    onChange={(v) => {
                      setBays(v);
                      if (entrance !== null && entrance >= v) setEntrance(Math.max(0, v - 1));
                    }}
                  />
                  <div className="grid gap-2">
                    <span className="text-[13px] font-medium text-ink-2">Entrée de l'immeuble</span>
                    <div className="flex flex-wrap gap-1.5">
                      <Chip active={entrance === null} onClick={() => setEntrance(null)}>
                        Pas de hall
                      </Chip>
                      {Array.from({ length: bays }, (_, b) => (
                        <Chip key={b} active={entrance === b} onClick={() => setEntrance(b)} disabled={bays < 2}>
                          Travée {b + 1}
                        </Chip>
                      ))}
                    </div>
                    <p className="text-[12.5px] text-ink-3">Le hall occupe une travée du rez-de-chaussée.</p>
                  </div>
                </div>
              )}

              {step === "locaux" && (
                <div className="grid gap-5">
                  <div>
                    <span className="text-[13px] font-medium text-ink-2">Étage</span>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {Array.from({ length: levels }, (_, i) => levels - 1 - i).map((l) => (
                        <Chip key={l} active={activeLevel === l} onClick={() => setActiveLevel(l)}>
                          {levelShort(l)}
                        </Chip>
                      ))}
                    </div>
                  </div>
                  {activeLevel !== null && (
                    <FloorEditor
                      key={activeLevel}
                      level={activeLevel}
                      plan={planFor(activeLevel)}
                      max={activeLevel === 0 && entrance !== null ? bays - 1 : bays}
                      units={draftUnits.filter((u) => u.level === activeLevel)}
                      selected={selected}
                      onPlan={(p) => setPlan(activeLevel, p)}
                      onApplyAbove={() => {
                        const p = planFor(activeLevel);
                        setPlans((prev) => {
                          const next = { ...prev };
                          for (let l = Math.max(1, activeLevel); l < levels; l++) next[l] = { ...p, count: Math.min(p.count, bays) };
                          return next;
                        });
                        toast("Appliqué aux étages", `${levelShort(Math.max(1, activeLevel))} à ${levelShort(levels - 1)}`, "info");
                      }}
                      onRent={(code, rent) => setOverrides((o) => ({ ...o, [`${activeLevel}:${code}`]: { ...o[`${activeLevel}:${code}`], rent } }))}
                    />
                  )}
                </div>
              )}

              {step === "recap" && (
                <div className="grid gap-5">
                  <div className="rounded-[16px] bg-surface-2 p-5">
                    <p className="text-[13px] text-ink-3">Loyers potentiels par mois</p>
                    <Money value={total} condensed className="mt-1 block text-[44px] font-semibold" />
                    <p className="mt-1 text-[13px] text-ink-3">À pleine occupation, charges comprises.</p>
                  </div>
                  <dl className="grid grid-cols-2 gap-3 text-[14px]">
                    <Stat label="Nom" value={name} />
                    <Stat label="Type" value={propertyKindLabel[kind]} />
                    <Stat label="Adresse" value={`${address}, ${district}`} />
                    <Stat label="Structure" value={`${levels === 1 ? "RDC" : `R+${levels - 1}`}, ${bays} travées`} />
                    <Stat label="Locaux" value={plural(draftUnits.length, "local", "locaux")} />
                    <Stat
                      label="Répartition"
                      value={Object.entries(byKind)
                        .map(([k, n]) => `${n} ${unitKindLabel[k as UnitKind].toLowerCase()}${n! > 1 ? "s" : ""}`)
                        .join(", ")}
                    />
                  </dl>
                  <p className="text-[13px] text-ink-3">
                    Les locaux sont créés vacants. Vous pourrez ajouter les locataires et les baux depuis chaque fiche.
                  </p>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="mt-8 flex items-center justify-between gap-3 border-t border-line pt-5">
          <Button variant="ghost" disabled={stepIdx === 0} onClick={() => go(steps[stepIdx - 1]!.v)} icon={<ArrowLeft size={16} />}>
            Retour
          </Button>
          {step === "recap" ? (
            <Button variant="primary" size="lg" onClick={create} icon={<Check size={18} weight="bold" />}>
              Créer le bien
            </Button>
          ) : (
            <Button variant="dark" size="lg" onClick={() => go(steps[stepIdx + 1]!.v)} trailing={<ArrowRight size={16} />}>
              Continuer
            </Button>
          )}
        </div>
      </section>

      {/* Model */}
      <section className="relative order-1 h-[360px] overflow-hidden bg-surface-2 sm:h-[440px] lg:order-2 lg:sticky lg:top-16 lg:h-[calc(100dvh-64px)]">
        <div className="absolute left-4 right-4 top-4 z-[2] flex flex-wrap items-center justify-between gap-3">
          <Segmented
            size="sm"
            value={view}
            onChange={setView}
            className="bg-surface/90 backdrop-blur"
            options={[
              {
                value: "model",
                label: (
                  <span className="inline-flex items-center gap-1.5">
                    <Cube size={14} />
                    Maquette
                  </span>
                ),
              },
              {
                value: "facade",
                label: (
                  <span className="inline-flex items-center gap-1.5">
                    <SquaresFour size={14} />
                    Façade
                  </span>
                ),
              },
            ]}
          />
          <div className="flex flex-wrap items-center gap-3 rounded-[12px] bg-surface/90 px-3 py-2 text-[12px] text-ink-2 backdrop-blur">
            {(Object.keys(byKind) as UnitKind[]).map((k) => (
              <span key={k} className="inline-flex items-center gap-1.5">
                <span className="size-2.5 rounded-[2px]" style={{ background: KIND_COLORS[k] }} />
                {unitKindLabel[k]} <span className="num font-medium">{byKind[k]}</span>
              </span>
            ))}
          </div>
        </div>

        {view === "model" ? (
          <Building3D
            className="h-full w-full"
            levels={levels}
            bays={bays}
            blocks={blocks}
            entrance={entrance}
            activeLevel={activeLevel}
            selectedId={selected}
            onSelect={(id) => {
              const [lvl] = id.split(":");
              setSelected(id);
              setActiveLevel(Number(lvl));
              if (step !== "locaux") setStep("locaux");
            }}
            onSelectLevel={step === "locaux" ? (l) => setActiveLevel(l) : undefined}
            palette={palette}
            showGrid
            autoRotate={spin && !reduce}
            onInteract={() => setSpin(false)}
          />
        ) : (
          <div className="blueprint flex h-full items-center justify-center p-10 pt-20">
            <div className="w-full" style={{ maxWidth: Math.min(520, 110 * bays + 100) }}>
              <Facade
                property={{ id: "draft", levels, bays }}
                units={facadeUnits}
                entrance={entrance}
                stateOf={() => "upcoming"}
                cellClass={(u) => (activeLevel !== null && activeLevel !== u.level ? "bg-surface-3" : undefined)}
                labelFor={(u) => u.code}
                size={levels > 6 ? "md" : "lg"}
                showLevels
                depth={24}
                animate={false}
                onSelect={(u) => {
                  setSelected(u.id);
                  setActiveLevel(u.level);
                  if (step !== "locaux") setStep("locaux");
                }}
              />
            </div>
          </div>
        )}

        <div className="pointer-events-none absolute bottom-4 left-4 right-4 z-[2] flex items-end justify-between gap-4">
          <div className="rounded-[14px] bg-surface/90 px-4 py-3 backdrop-blur">
            <p className="type-display text-[18px] font-semibold leading-tight">{name || "Sans nom"}</p>
            <p className="num text-[12.5px] text-ink-3">
              {plural(draftUnits.length, "local", "locaux")}, {amount(total)} {brand.currency} par mois
            </p>
          </div>
          {view === "model" && <p className="hidden text-[12px] text-ink-3 sm:block">Glissez pour tourner, touchez un local pour l'éditer</p>}
        </div>
      </section>
    </main>
  );
}

function Stepper({
  label,
  hint,
  value,
  display,
  min,
  max,
  onChange,
}: {
  label: string;
  hint: string;
  value: number;
  display: string;
  min: number;
  max: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-[16px] border border-line bg-surface p-4">
      <div className="min-w-0">
        <p className="text-[13px] font-medium text-ink-2">{label}</p>
        <p className="type-display mt-1 text-[28px] font-semibold">{display}</p>
        <p className="mt-0.5 text-[12.5px] text-ink-3">{hint}</p>
      </div>
      <div className="flex items-center gap-1.5">
        <button
          onClick={() => onChange(Math.max(min, value - 1))}
          disabled={value <= min}
          aria-label={`Retirer, ${label}`}
          className="grid size-11 place-items-center rounded-[12px] border border-line text-ink-2 transition-colors hover:bg-surface-2 active:scale-95 disabled:opacity-40"
        >
          <Minus size={18} weight="bold" />
        </button>
        <button
          onClick={() => onChange(Math.min(max, value + 1))}
          disabled={value >= max}
          aria-label={`Ajouter, ${label}`}
          className="grid size-11 place-items-center rounded-[12px] bg-forest text-on-forest transition-colors hover:bg-forest-2 active:scale-95 disabled:opacity-40"
        >
          <Plus size={18} weight="bold" />
        </button>
      </div>
    </div>
  );
}

function Chip({ active, onClick, children, disabled }: { active: boolean; onClick: () => void; children: React.ReactNode; disabled?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "h-9 rounded-full px-3.5 text-[13px] font-medium transition-colors disabled:opacity-40",
        active ? "bg-forest text-on-forest" : "border border-line bg-surface text-ink-2 hover:border-line-strong",
      )}
    >
      {children}
    </button>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[12px] border border-line p-3">
      <dt className="text-[12px] text-ink-3">{label}</dt>
      <dd className="mt-0.5 font-medium">{value}</dd>
    </div>
  );
}

function FloorEditor({
  level,
  plan,
  max,
  units,
  selected,
  onPlan,
  onApplyAbove,
  onRent,
}: {
  level: number;
  plan: FloorPlan;
  max: number;
  units: PropertyDraft["units"];
  selected: string | null;
  onPlan: (p: Partial<FloorPlan>) => void;
  onApplyAbove: () => void;
  onRent: (code: string, rent: number) => void;
}) {
  const kinds: UnitKind[] = level === 0 ? ["boutique", "magasin", "appartement", "bureau"] : ["appartement", "studio", "bureau"];
  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="grid gap-4 rounded-[16px] border border-line bg-surface p-4">
      <div className="flex items-center justify-between">
        <p className="type-display text-[20px] font-semibold">{levelLabel(level)}</p>
        {level > 0 && (
          <button onClick={onApplyAbove} className="text-[12.5px] font-medium text-emerald hover:underline">
            Appliquer aux autres étages
          </button>
        )}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="grid gap-2">
          <span className="text-[12.5px] font-medium text-ink-2">Locaux sur l'étage</span>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => onPlan({ count: Math.max(1, plan.count - 1) })}
              disabled={plan.count <= 1}
              aria-label="Moins de locaux"
              className="grid size-10 place-items-center rounded-[11px] border border-line hover:bg-surface-2 disabled:opacity-40"
            >
              <Minus size={16} />
            </button>
            <span className="type-display w-8 text-center text-[22px] font-semibold">{plan.count}</span>
            <button
              onClick={() => onPlan({ count: Math.min(max, plan.count + 1) })}
              disabled={plan.count >= max}
              aria-label="Plus de locaux"
              className="grid size-10 place-items-center rounded-[11px] border border-line hover:bg-surface-2 disabled:opacity-40"
            >
              <Plus size={16} />
            </button>
          </div>
        </div>
        <Field label="Type">
          {(id) => (
            <Select
              id={id}
              value={plan.kind}
              onChange={(e) => onPlan({ kind: e.target.value as UnitKind, rent: BASE_RENT[e.target.value as UnitKind] })}
            >
              {kinds.map((k) => (
                <option key={k} value={k}>
                  {unitKindLabel[k]}
                </option>
              ))}
            </Select>
          )}
        </Field>
      </div>
      <ul className="grid gap-2">
        {units.map((u) => (
          <li
            key={u.code}
            className={cn(
              "flex items-center gap-3 rounded-[12px] border px-3 py-2 transition-colors",
              selected === `${u.level}:${u.code}` ? "border-emerald bg-mint-soft/60" : "border-line",
            )}
          >
            <span className="size-3 shrink-0 rounded-[3px]" style={{ background: KIND_COLORS[u.kind] }} />
            <span className="min-w-0 flex-1">
              <span className="block font-mono text-[13px] font-medium">{u.code}</span>
              <span className="block text-[12px] text-ink-3">
                {unitKindLabel[u.kind]}, {u.surface} m²
              </span>
            </span>
            <label className="flex items-center gap-1.5 text-[12px] text-ink-3">
              <span className="sr-only">Loyer de {u.code}</span>
              <input
                inputMode="numeric"
                value={amount(u.rent)}
                onChange={(e) => {
                  const n = Number(e.target.value.replace(/\D/g, ""));
                  if (!Number.isNaN(n)) onRent(u.code, n);
                }}
                className="num h-9 w-[104px] rounded-[10px] border border-line-strong bg-surface px-2 text-right text-[13.5px] text-ink focus:border-emerald focus:outline-none"
              />
              {brand.currency}
            </label>
          </li>
        ))}
      </ul>
      <p className="text-[12.5px] text-ink-3">
        Loyer hors charges, modifiable local par local. Total de l'étage : {fcfa(units.reduce((s, u) => s + u.rent, 0))}.
      </p>
    </motion.div>
  );
}
