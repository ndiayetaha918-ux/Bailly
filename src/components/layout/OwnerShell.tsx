import { Plus } from "@phosphor-icons/react";
import { NavLink, Outlet, useLocation } from "react-router";
import { motion } from "motion/react";
import { Logo } from "@/components/brand/Logo";
import { ButtonLink } from "@/components/ui/Button";
import { RoleMenu } from "./RoleMenu";
import { ScrollToTop } from "./ScrollToTop";
import { useData } from "@/hooks/useData";
import { DEMO_OWNER_ID } from "@/data/seed";
import { cn } from "@/lib/cn";

export function OwnerShell() {
  const d = useData();
  const loc = useLocation();
  const owner = d.owners.find((o) => o.id === DEMO_OWNER_ID)!;
  const myProps = new Set(d.properties.filter((p) => p.ownerId === DEMO_OWNER_ID).map((p) => p.id));
  const myUnits = new Set(d.units.filter((u) => myProps.has(u.propertyId)).map((u) => u.id));
  const unread = d.threads.filter((t) => myUnits.has(t.unitId) && t.unreadBy.includes("owner")).length;

  const links = [
    { to: "/proprietaire", label: "Patrimoine", end: true },
    { to: "/proprietaire/paiements", label: "Paiements" },
    { to: "/proprietaire/echanges", label: "Échanges", badge: unread },
  ];
  const inBuilder = loc.pathname.endsWith("nouveau-bien");

  return (
    <div className="min-h-[100dvh] bg-paper">
      <ScrollToTop />
      <header className="sticky top-0 z-30 border-b border-line bg-paper/92 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-[1320px] items-center gap-6 px-5 md:px-8">
          <NavLink to="/proprietaire" aria-label="Bailly, patrimoine">
            <Logo />
          </NavLink>
          <nav className="hidden items-center gap-1 md:flex">
            {links.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                end={l.end}
                className={({ isActive }) =>
                  cn(
                    "relative flex h-9 items-center gap-2 rounded-[10px] px-3 text-[14px] font-medium transition-colors",
                    isActive ? "text-ink" : "text-ink-3 hover:text-ink",
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    {isActive && (
                      <motion.span
                        layoutId="owner-nav"
                        className="absolute inset-0 rounded-[10px] bg-surface-3"
                        transition={{ type: "spring", stiffness: 500, damping: 40 }}
                      />
                    )}
                    <span className="relative">{l.label}</span>
                    {!!l.badge && (
                      <span className="num relative grid h-[18px] min-w-[18px] place-items-center rounded-full bg-signal px-1 text-[11px] font-semibold text-white">
                        {l.badge}
                      </span>
                    )}
                  </>
                )}
              </NavLink>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            {!inBuilder && (
              <span className="hidden sm:block">
                <ButtonLink to="/proprietaire/nouveau-bien" variant="dark" size="md" icon={<Plus size={16} weight="bold" />}>
                  Ajouter un bien
                </ButtonLink>
              </span>
            )}
            <RoleMenu role="owner" name={owner.name} subtitle="Propriétaire" />
          </div>
        </div>
        <nav className="scrollbar-none flex gap-1 overflow-x-auto px-4 pb-2 md:hidden">
          {[...links, { to: "/proprietaire/nouveau-bien", label: "Ajouter un bien" }].map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={"end" in l ? l.end : undefined}
              className={({ isActive }) =>
                cn(
                  "flex h-8 shrink-0 items-center rounded-full px-3 text-[13px] font-medium",
                  isActive ? "bg-forest text-on-forest" : "bg-surface-3 text-ink-2",
                )
              }
            >
              {l.label}
            </NavLink>
          ))}
        </nav>
      </header>
      <Outlet />
    </div>
  );
}
