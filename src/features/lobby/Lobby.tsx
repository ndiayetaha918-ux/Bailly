import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowRight } from "@phosphor-icons/react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { Facade } from "@/components/facade/Facade";
import { Logo } from "@/components/brand/Logo";
import { useData } from "@/hooks/useData";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { DEMO_MANAGER_ID, DEMO_OWNER_ID, DEMO_TENANT_ID } from "@/data/seed";
import { attentionItems, managedPropertyIds, propertyUnits, tenantUnit, unitState } from "@/domain/selectors";
import { unitTitle } from "@/domain/labels";
import type { Role, Unit } from "@/domain/types";
import { cn } from "@/lib/cn";

/*
  Lobby. Reads like a building directory board: three doors, one per role.
  The elevation on the right previews what each role will see:
    owner   -> every local with its rent status
    manager -> only what needs attention
    tenant  -> a single lit window, theirs
*/

const LOBBY_PROPERTY = "prop_kd";

export function Lobby() {
  const d = useData();
  const navigate = useNavigate();
  const reduce = useReducedMotion();
  const [hover, setHover] = useState<Role | null>(null);
  const [tick, setTick] = useState(0);
  const desktop = useMediaQuery("(min-width: 1024px)");

  const property = d.properties.find((p) => p.id === LOBBY_PROPERTY)!;
  const units = useMemo(() => propertyUnits(d, LOBBY_PROPERTY), [d]);
  const tenantUnitId = tenantUnit(d, DEMO_TENANT_ID)?.id;

  const ownerProps = d.properties.filter((p) => p.ownerId === DEMO_OWNER_ID);
  const ownerUnits = d.units.filter((u) => ownerProps.some((p) => p.id === u.propertyId)).length;
  const managed = managedPropertyIds(d, DEMO_MANAGER_ID);
  const attention = attentionItems(d, managed, "manager").filter((i) => i.kind !== "vacant");
  const attentionUnits = new Set(
    attentionItems(d, [LOBBY_PROPERTY], "manager")
      .filter((i) => i.kind !== "vacant")
      .map((i) => i.unitId),
  );
  const tUnit = tenantUnitId ? d.units.find((u) => u.id === tenantUnitId) : undefined;

  // Ambient: a few windows switch on and off while nobody hovers.
  useEffect(() => {
    if (reduce || hover) return;
    const t = setInterval(() => setTick((x) => x + 1), 1400);
    return () => clearInterval(t);
  }, [reduce, hover]);

  const ambientLit = useMemo(() => {
    const set = new Set<string>();
    units.forEach((u, i) => {
      if ((i * 7 + tick * 3) % 5 < 2) set.add(u.id);
    });
    return set;
  }, [units, tick]);

  const cellClass = (u: Unit): string | undefined => {
    if (hover === "owner") return undefined; // real statuses
    if (hover === "manager") {
      if (!attentionUnits.has(u.id)) return "bg-white/[0.07]";
      const st = unitState(d, u);
      return st === "late" ? "bg-signal" : st === "partial" ? "bg-amber" : "bg-amber";
    }
    if (hover === "tenant") return u.id === tenantUnitId ? "bg-mint shadow-[0_0_28px_rgb(143_227_189/0.55)]" : "bg-white/[0.07]";
    return ambientLit.has(u.id) ? "bg-mint/80 shadow-[0_0_22px_rgb(143_227_189/0.25)]" : "bg-white/[0.09]";
  };

  const roles: Array<{ role: Role; label: string; who: string; promise: string; meta: string; to: string }> = [
    {
      role: "owner",
      label: "Propriétaire",
      who: "Mame Diarra Sow",
      promise: "Vos biens, vos loyers, vos encaissements.",
      meta: `${ownerProps.length} biens, ${ownerUnits} locaux`,
      to: "/proprietaire",
    },
    {
      role: "manager",
      label: "Gestionnaire",
      who: "Abdou Karim Ndoye, Cabinet Ndoye",
      promise: "Ce qui demande votre attention aujourd'hui.",
      meta: `${attention.length} points à traiter`,
      to: "/gestionnaire",
    },
    {
      role: "tenant",
      label: "Locataire",
      who: "Awa Gueye",
      promise: "Votre local, votre loyer, vos quittances.",
      meta: tUnit ? `${unitTitle(tUnit.kind, tUnit.code)}, Kër Diarra` : "",
      to: "/locataire",
    },
  ];

  const caption: Record<Role | "idle", string> = {
    idle: "Résidence Kër Diarra, Mermoz. 14 locaux.",
    owner: "Chaque fenêtre est un local, colorée selon son loyer du mois.",
    manager: `Seuls restent allumés les locaux qui demandent une action.`,
    tenant: "Une seule fenêtre : la vôtre.",
  };

  return (
    <div className="forest-surface grain relative min-h-[100dvh] overflow-hidden">
      {/* fine vertical rhythm: the module of the facade, extended to the page */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.05]"
        style={{
          backgroundImage: "linear-gradient(to right, white 1px, transparent 1px)",
          backgroundSize: "88px 100%",
          maskImage: "linear-gradient(to bottom, black, transparent 85%)",
        }}
      />
      <div className="relative z-[2] mx-auto grid min-h-[100dvh] max-w-[1360px] grid-cols-1 px-5 pb-10 pt-6 md:px-10 lg:grid-cols-12 lg:gap-x-10">
        <header className="col-span-full flex items-center justify-between">
          <Logo tone="light" />
          <span className="text-[13px] text-on-forest-2">Démo, données fictives</span>
        </header>

        <main className="order-3 col-span-full flex flex-col justify-center pb-6 pt-2 lg:order-none lg:col-span-7 lg:py-0">
          <motion.h1
            initial={reduce ? false : { opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="type-display max-w-[12ch] text-[52px] font-semibold leading-[0.95] text-on-forest sm:text-[68px] xl:text-[84px]"
          >
            Chaque local, chaque loyer.
          </motion.h1>
          <motion.p
            initial={reduce ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
            className="mt-5 max-w-[46ch] text-[16px] leading-relaxed text-on-forest-2 sm:text-[17px]"
          >
            Bailly réunit propriétaires, gestionnaires et locataires autour du local : loyers, paiements mobile money, quittances et échanges.
          </motion.p>

          <div className="mt-10 lg:mt-14">
            <p className="mb-3 text-[13px] font-medium text-on-forest-2">Entrer en tant que</p>
            <ul className="border-t border-white/12" onMouseLeave={() => setHover(null)}>
              {roles.map((r, i) => (
                <motion.li
                  key={r.role}
                  initial={reduce ? false : { opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.7, delay: 0.18 + i * 0.07, ease: [0.16, 1, 0.3, 1] }}
                  className="border-b border-white/12"
                >
                  <button
                    onMouseEnter={() => setHover(r.role)}
                    onFocus={() => setHover(r.role)}
                    onBlur={() => setHover(null)}
                    onClick={() => navigate(r.to)}
                    className="group relative grid w-full grid-cols-[1fr_auto] items-center gap-4 py-5 text-left outline-none sm:grid-cols-[minmax(0,15rem)_1fr_auto] sm:gap-6"
                  >
                    <span
                      aria-hidden
                      className={cn(
                        "absolute inset-y-0 -left-4 -right-4 rounded-[14px] bg-white/[0.06] opacity-0 transition-opacity duration-300",
                        hover === r.role && "opacity-100",
                      )}
                    />
                    <span className="relative">
                      <span className="type-display block text-[32px] font-semibold leading-none text-on-forest sm:text-[38px]">{r.label}</span>
                      <span className="mt-2 block text-[13px] text-on-forest-2">{r.who}</span>
                    </span>
                    <span className="relative hidden sm:block">
                      <span className="block text-[15px] text-on-forest">{r.promise}</span>
                      <span className="num mt-1 block text-[13px] text-on-forest-2">{r.meta}</span>
                    </span>
                    <span
                      className={cn(
                        "relative grid size-11 place-items-center rounded-full border border-white/18 text-on-forest transition-all duration-300",
                        hover === r.role && "translate-x-1 border-transparent bg-mint text-forest",
                      )}
                    >
                      <ArrowRight size={18} weight="bold" />
                    </span>
                  </button>
                </motion.li>
              ))}
            </ul>
          </div>
        </main>

        <aside className="order-2 col-span-full flex flex-col justify-center pb-4 pt-8 lg:order-none lg:col-span-5 lg:py-0">
          <motion.div
            initial={reduce ? false : { opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="w-[52%] max-w-[420px] lg:mx-auto lg:w-full"
          >
            <Facade
              property={property}
              units={units}
              entrance={d.entrances[LOBBY_PROPERTY]}
              stateOf={(u) => unitState(d, u)}
              size={desktop ? "xl" : "md"}
              tone="forest"
              depth={desktop ? 40 : 18}
              cellClass={cellClass}
              labelFor={(u) => u.code}
            />
            <div className="mt-5 hidden h-10 lg:block">
              <AnimatePresence mode="wait">
                <motion.p
                  key={hover ?? "idle"}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.25 }}
                  className="text-[14px] text-on-forest-2"
                >
                  {caption[hover ?? "idle"]}
                </motion.p>
              </AnimatePresence>
            </div>
          </motion.div>
        </aside>
      </div>
    </div>
  );
}
