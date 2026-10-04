import { CalendarBlank, Wrench } from "@phosphor-icons/react";
import { motion } from "motion/react";
import { useState } from "react";
import { Link } from "react-router";
import { ClaimPanel } from "@/components/journal/ClaimPanel";
import { UnitJournal } from "@/components/journal/UnitJournal";
import { Sheet } from "@/components/ui/Overlay";
import { Tag } from "@/components/ui/Status";
import { useData } from "@/hooks/useData";
import { DEMO_MANAGER_ID } from "@/data/seed";
import { managedPropertyIds } from "@/domain/selectors";
import { claimCategoryLabel, claimStatusLabel, unitTitle } from "@/domain/labels";
import type { ClaimStatus, Thread } from "@/domain/types";
import { daysBetween, now } from "@/lib/clock";
import { dateShort, relativeTime } from "@/lib/format";
import { cn } from "@/lib/cn";

const columns: ClaimStatus[] = ["open", "in_progress", "scheduled", "resolved"];

export function Claims() {
  const d = useData();
  const ids = managedPropertyIds(d, DEMO_MANAGER_ID);
  const unitIds = new Set(d.units.filter((u) => ids.includes(u.propertyId)).map((u) => u.id));
  const claims = d.threads.filter((t) => t.kind === "claim" && unitIds.has(t.unitId));
  const [open, setOpen] = useState<string | null>(null);
  const sel = claims.find((c) => c.id === open);
  const selUnit = sel ? d.units.find((u) => u.id === sel.unitId) : undefined;

  const byStatus = (s: ClaimStatus) =>
    claims
      .filter((c) => c.status === s && (s !== "resolved" || daysBetween(c.updatedAt, now()) <= 45))
      .sort((a, b) => Number(b.priority === "urgent") - Number(a.priority === "urgent") || b.updatedAt.localeCompare(a.updatedAt));

  return (
    <main className="px-4 pb-12 pt-6 md:px-8">
      <h1 className="type-display text-[34px] font-semibold md:text-[40px]">Réclamations</h1>
      <p className="mt-1 text-[14px] text-ink-3">De la demande du locataire à l'intervention, chaque réclamation reste attachée à son local.</p>

      <div className="scrollbar-none mt-6 grid auto-cols-[minmax(270px,1fr)] grid-flow-col gap-3 overflow-x-auto pb-2">
        {columns.map((s) => {
          const list = byStatus(s);
          return (
            <section key={s} className="flex min-h-[420px] flex-col rounded-[var(--radius-panel)] bg-surface-3/60 p-2">
              <header className="flex items-center justify-between px-2.5 pb-2 pt-1.5">
                <h2 className="text-[13.5px] font-semibold">{claimStatusLabel[s]}</h2>
                <span className="num text-[12.5px] text-ink-3">{list.length}</span>
              </header>
              <div className="grid content-start gap-2">
                {list.map((c, i) => (
                  <ClaimCard key={c.id} thread={c} index={i} onClick={() => setOpen(c.id)} />
                ))}
                {list.length === 0 && <p className="px-3 py-8 text-center text-[13px] text-ink-3">Aucune</p>}
              </div>
            </section>
          );
        })}
      </div>

      <Sheet
        open={!!sel}
        onOpenChange={(v) => !v && setOpen(null)}
        title={sel?.subject ?? ""}
        description={
          selUnit ? (
            <Link to={`/gestionnaire/locaux/${selUnit.id}`} className="hover:underline">
              {unitTitle(selUnit.kind, selUnit.code)}, {d.properties.find((p) => p.id === selUnit.propertyId)?.name}
            </Link>
          ) : undefined
        }
        width={600}
      >
        {sel && selUnit && (
          <div className="flex h-full flex-col">
            <div className="p-5">
              <ClaimPanel thread={sel} canManage actorId={DEMO_MANAGER_ID} />
            </div>
            <div className="min-h-[420px] flex-1 border-t border-line">
              <UnitJournal unitId={selUnit.id} viewer="manager" viewerId={DEMO_MANAGER_ID} initialThreadId={sel.id} hideFilters />
            </div>
          </div>
        )}
      </Sheet>
    </main>
  );
}

function ClaimCard({ thread, index, onClick }: { thread: Thread; index: number; onClick: () => void }) {
  const d = useData();
  const u = d.units.find((x) => x.id === thread.unitId)!;
  const p = d.properties.find((x) => x.id === u.propertyId)!;
  const urgent = thread.priority === "urgent" && thread.status !== "resolved";
  const unread = thread.unreadBy.includes("manager");
  return (
    <motion.button
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      onClick={onClick}
      className={cn(
        "rounded-[14px] border bg-surface p-3.5 text-left transition-[box-shadow,border-color] hover:shadow-[var(--shadow-lift)]",
        urgent ? "border-signal/50" : "border-line",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-[12px] text-ink-3">
          <Wrench size={13} />
          {thread.category ? claimCategoryLabel[thread.category] : "Réclamation"}
        </span>
        {urgent ? <Tag tone="signal">Urgent</Tag> : unread ? <span className="size-2 rounded-full bg-signal" aria-label="Non lu" /> : null}
      </div>
      <p className={cn("mt-1.5 text-[14px] leading-snug", unread ? "font-semibold" : "font-medium")}>{thread.subject}</p>
      <p className="mt-2 text-[12.5px] text-ink-3">
        <span className="font-mono">{u.code}</span>, {p.name.replace("Résidence ", "").replace("Immeuble ", "")}
      </p>
      <div className="mt-3 flex items-center justify-between gap-2 border-t border-line pt-2.5 text-[12px] text-ink-3">
        <span className="truncate">{thread.assignee ?? "Non attribuée"}</span>
        {thread.scheduledFor && thread.status === "scheduled" ? (
          <span className="inline-flex shrink-0 items-center gap-1 text-ink-2">
            <CalendarBlank size={13} /> {dateShort(thread.scheduledFor)}
          </span>
        ) : (
          <span className="shrink-0">{relativeTime(thread.updatedAt)}</span>
        )}
      </div>
    </motion.button>
  );
}
