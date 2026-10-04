import { Buildings, Lightning, Receipt, Wrench } from "@phosphor-icons/react";
import { NavLink, Outlet } from "react-router";
import { LogoMark } from "@/components/brand/Logo";
import { RoleMenu } from "./RoleMenu";
import { ScrollToTop } from "./ScrollToTop";
import { useData } from "@/hooks/useData";
import { DEMO_MANAGER_ID } from "@/data/seed";
import { attentionItems, managedPropertyIds } from "@/domain/selectors";
import { cn } from "@/lib/cn";

/* The manager works in an operations tool: a dark rail, dense surfaces. */
export function ManagerShell() {
  const d = useData();
  const manager = d.managers.find((m) => m.id === DEMO_MANAGER_ID)!;
  const ids = managedPropertyIds(d, DEMO_MANAGER_ID);
  const items = attentionItems(d, ids, "manager").filter((i) => i.kind !== "vacant");
  const units = new Set(d.units.filter((u) => ids.includes(u.propertyId)).map((u) => u.id));
  const openClaims = d.threads.filter((t) => units.has(t.unitId) && t.kind === "claim" && t.status !== "resolved").length;

  const links = [
    { to: "/gestionnaire", label: "À traiter", icon: Lightning, end: true, badge: items.length },
    { to: "/gestionnaire/locaux", label: "Locaux", icon: Buildings },
    { to: "/gestionnaire/reclamations", label: "Réclam.", icon: Wrench, badge: openClaims },
    { to: "/gestionnaire/encaissements", label: "Encaiss.", icon: Receipt },
  ];

  return (
    <div className="min-h-[100dvh] bg-paper md:pl-[84px]">
      <ScrollToTop />
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[84px] flex-col items-center bg-forest py-4 md:flex">
        <NavLink to="/gestionnaire" aria-label="Bailly">
          <LogoMark size={36} lit="var(--mint)" />
        </NavLink>
        <nav className="mt-8 flex flex-col gap-1.5">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.end}
              className={({ isActive }) =>
                cn(
                  "relative flex w-[68px] flex-col items-center gap-1 rounded-[14px] py-2.5 text-[11px] font-medium transition-colors",
                  isActive ? "bg-white/12 text-on-forest" : "text-on-forest-2 hover:bg-white/6 hover:text-on-forest",
                )
              }
            >
              {({ isActive }) => (
                <>
                  <l.icon size={22} weight={isActive ? "fill" : "regular"} />
                  {l.label}
                  {!!l.badge && (
                    <span className="num absolute right-2 top-1.5 grid h-[17px] min-w-[17px] place-items-center rounded-full bg-signal px-1 text-[10.5px] font-semibold text-white">
                      {l.badge}
                    </span>
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto">
          <RoleMenu role="manager" name={manager.name} subtitle={manager.agency} tone="forest" compact align="left-up" />
        </div>
      </aside>

      <header className="sticky top-0 z-30 flex h-14 items-center justify-between bg-forest px-4 md:hidden">
        <LogoMark size={30} lit="var(--mint)" />
        <span className="text-[13px] font-medium text-on-forest">{manager.agency}</span>
        <RoleMenu role="manager" name={manager.name} subtitle={manager.agency} tone="forest" compact />
      </header>

      <div className="pb-20 md:pb-0">
        <Outlet />
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 border-t border-white/10 bg-forest pb-[env(safe-area-inset-bottom)] md:hidden">
        {links.map((l) => (
          <NavLink
            key={l.to}
            to={l.to}
            end={l.end}
            className={({ isActive }) =>
              cn("relative flex flex-col items-center gap-0.5 py-2.5 text-[11px]", isActive ? "text-on-forest" : "text-on-forest-2")
            }
          >
            {({ isActive }) => (
              <>
                <l.icon size={22} weight={isActive ? "fill" : "regular"} />
                {l.label}
                {!!l.badge && (
                  <span className="num absolute right-[22%] top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-signal px-1 text-[10px] font-semibold text-white">
                    {l.badge}
                  </span>
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
