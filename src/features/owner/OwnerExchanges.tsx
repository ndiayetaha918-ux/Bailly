import { ChatsCircle, Wrench } from "@phosphor-icons/react";
import { useState } from "react";
import { Link } from "react-router";
import { Facade } from "@/components/facade/Facade";
import { UnitJournal, ClaimBadge } from "@/components/journal/UnitJournal";
import { EmptyState, Panel } from "@/components/ui/Panel";
import { Segmented } from "@/components/ui/Segmented";
import { useData } from "@/hooks/useData";
import { DEMO_OWNER_ID } from "@/data/seed";
import { propertyUnits, threadMessages, unitState } from "@/domain/selectors";
import { unitTitle } from "@/domain/labels";
import type { Role } from "@/domain/types";
import { relativeTime } from "@/lib/format";
import { cn } from "@/lib/cn";

/*
  Exchanges are listed by local, not by person: every conversation carries
  its building, its floor and its window.
*/
export function ExchangesView({ role, viewerId, propertyIds, base }: { role: Role; viewerId: string; propertyIds: string[]; base: string }) {
  const d = useData();
  const [filter, setFilter] = useState<"all" | "unread" | "claims">("all");
  const unitIds = new Set(d.units.filter((u) => propertyIds.includes(u.propertyId)).map((u) => u.id));
  const threads = d.threads
    .filter((t) => unitIds.has(t.unitId))
    .filter((t) => (filter === "unread" ? t.unreadBy.includes(role) : filter === "claims" ? t.kind === "claim" : true))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const [selected, setSelected] = useState<string | null>(threads[0]?.id ?? null);
  const sel = d.threads.find((t) => t.id === selected) ?? threads[0];
  const selUnit = sel ? d.units.find((u) => u.id === sel.unitId) : undefined;
  const selProp = selUnit ? d.properties.find((p) => p.id === selUnit.propertyId) : undefined;
  const unreadCount = d.threads.filter((t) => unitIds.has(t.unitId) && t.unreadBy.includes(role)).length;

  return (
    <main className="mx-auto max-w-[1320px] px-5 pb-16 pt-8 md:px-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="type-display text-[34px] font-semibold md:text-[40px]">Échanges</h1>
          <p className="mt-1 text-[14px] text-ink-3">Messages et réclamations, rangés par local.</p>
        </div>
        <Segmented
          value={filter}
          onChange={setFilter}
          options={[
            { value: "all", label: "Tout" },
            { value: "unread", label: "Non lus", count: unreadCount },
            { value: "claims", label: "Réclamations" },
          ]}
        />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-[380px_1fr]">
        <Panel className="overflow-hidden">
          {threads.length === 0 ? (
            <EmptyState icon={<ChatsCircle size={22} />} title="Aucun échange" body="Rien ne correspond à ce filtre." />
          ) : (
            <ul className="max-h-[680px] overflow-y-auto p-2">
              {threads.map((t) => {
                const u = d.units.find((x) => x.id === t.unitId)!;
                const p = d.properties.find((x) => x.id === u.propertyId)!;
                const last = threadMessages(d, t.id).at(-1);
                const unread = t.unreadBy.includes(role);
                return (
                  <li key={t.id}>
                    <button
                      onClick={() => setSelected(t.id)}
                      className={cn(
                        "flex w-full gap-3 rounded-[14px] p-3 text-left transition-colors",
                        sel?.id === t.id ? "bg-surface-3" : "hover:bg-surface-2",
                      )}
                    >
                      <div className="w-[38px] shrink-0 pt-0.5">
                        <Facade
                          property={p}
                          units={propertyUnits(d, p.id)}
                          stateOf={(x) => unitState(d, x)}
                          cellClass={(x) => (x.id === u.id ? (t.kind === "claim" ? "bg-signal" : "bg-emerald-bright") : "bg-line-strong/60")}
                          size="xs"
                          animate={false}
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="truncate font-mono text-[12px] text-ink-3">
                            {u.code}, {p.name.replace("Résidence ", "").replace("Immeuble ", "")}
                          </p>
                          <span className="shrink-0 text-[11.5px] text-ink-3">{relativeTime(t.updatedAt)}</span>
                        </div>
                        <p className={cn("mt-0.5 flex items-center gap-1.5 truncate text-[14px]", unread ? "font-semibold" : "font-medium")}>
                          {t.kind === "claim" && <Wrench size={13} className="shrink-0 text-ink-3" />}
                          <span className="truncate">{t.subject}</span>
                          {unread && <span className="size-2 shrink-0 rounded-full bg-signal" aria-label="Non lu" />}
                        </p>
                        <p className="mt-0.5 truncate text-[13px] text-ink-3">{last?.body}</p>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>

        <Panel className="flex h-[720px] flex-col overflow-hidden">
          {sel && selUnit && selProp ? (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4">
                <div className="min-w-0">
                  <Link to={`${base}/locaux/${selUnit.id}`} className="type-display text-[20px] font-semibold hover:underline">
                    {unitTitle(selUnit.kind, selUnit.code)}
                  </Link>
                  <p className="text-[13px] text-ink-3">
                    {selProp.name}, {d.tenants.find((x) => x.id === selUnit.tenantId)?.name ?? "vacant"}
                  </p>
                </div>
                <ClaimBadge thread={sel} />
              </div>
              <div className="min-h-0 flex-1">
                <UnitJournal key={sel.unitId} unitId={sel.unitId} viewer={role} viewerId={viewerId} initialThreadId={sel.id} hideFilters />
              </div>
            </>
          ) : (
            <EmptyState icon={<ChatsCircle size={22} />} title="Sélectionnez un échange" body="Le fil complet du local s'affiche ici." />
          )}
        </Panel>
      </div>
    </main>
  );
}

export function OwnerExchanges() {
  const d = useData();
  const ids = d.properties.filter((p) => p.ownerId === DEMO_OWNER_ID).map((p) => p.id);
  return <ExchangesView role="owner" viewerId={DEMO_OWNER_ID} propertyIds={ids} base="/proprietaire" />;
}
