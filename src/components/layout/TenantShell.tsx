import { ChatCircleText, House, Receipt, Wallet } from "@phosphor-icons/react";
import { NavLink, Outlet, useLocation } from "react-router";
import { Logo } from "@/components/brand/Logo";
import { RoleMenu } from "./RoleMenu";
import { ScrollToTop } from "./ScrollToTop";
import { useData } from "@/hooks/useData";
import { DEMO_TENANT_ID } from "@/data/seed";
import { cn } from "@/lib/cn";

/* Tenants are on their phone. The shell is a mobile app first;
   on desktop it keeps the same narrow, calm column. */
export function TenantShell() {
  const d = useData();
  const loc = useLocation();
  const tenant = d.tenants.find((t) => t.id === DEMO_TENANT_ID)!;
  const unit = d.units.find((u) => u.tenantId === DEMO_TENANT_ID);
  const unread = d.threads.filter((t) => t.unitId === unit?.id && t.unreadBy.includes("tenant")).length;
  const inFlow = loc.pathname.endsWith("/payer");

  const links = [
    { to: "/locataire", label: "Accueil", icon: House, end: true },
    { to: "/locataire/payer", label: "Payer", icon: Wallet },
    { to: "/locataire/recus", label: "Reçus", icon: Receipt },
    { to: "/locataire/echanges", label: "Échanges", icon: ChatCircleText, badge: unread },
  ];

  return (
    <div className="min-h-[100dvh] bg-paper">
      <ScrollToTop />
      <header className="sticky top-0 z-30 border-b border-line/70 bg-paper/92 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-[1080px] items-center justify-between gap-4 px-5">
          <NavLink to="/locataire" aria-label="Accueil locataire">
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
                    "relative flex h-9 items-center gap-2 rounded-full px-3.5 text-[14px] font-medium transition-colors",
                    isActive ? "bg-forest text-on-forest" : "text-ink-3 hover:text-ink",
                  )
                }
              >
                {l.label}
                {!!l.badge && (
                  <span className="num grid h-[18px] min-w-[18px] place-items-center rounded-full bg-signal px-1 text-[11px] font-semibold text-white">
                    {l.badge}
                  </span>
                )}
              </NavLink>
            ))}
          </nav>
          <RoleMenu role="tenant" name={tenant.name} subtitle="Locataire" />
        </div>
      </header>
      <div className={cn(!inFlow && "pb-24 md:pb-0")}>
        <Outlet />
      </div>
      {!inFlow && (
        <nav className="fixed inset-x-3 bottom-3 z-30 grid grid-cols-4 rounded-[20px] border border-line bg-surface/95 p-1.5 shadow-[var(--shadow-float)] backdrop-blur-md md:hidden">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.end}
              className={({ isActive }) =>
                cn(
                  "relative flex flex-col items-center gap-0.5 rounded-[14px] py-2 text-[11px] font-medium",
                  isActive ? "bg-forest text-on-forest" : "text-ink-3",
                )
              }
            >
              {({ isActive }) => (
                <>
                  <l.icon size={21} weight={isActive ? "fill" : "regular"} />
                  {l.label}
                  {!!l.badge && (
                    <span className="num absolute right-[24%] top-1 grid h-4 min-w-4 place-items-center rounded-full bg-signal px-1 text-[10px] font-semibold text-white">
                      {l.badge}
                    </span>
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>
      )}
    </div>
  );
}
