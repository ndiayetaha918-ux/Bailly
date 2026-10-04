import { CalendarBlank, Check, Wrench } from "@phosphor-icons/react";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Form";
import { Modal } from "@/components/ui/Overlay";
import { toast } from "@/components/ui/Toast";
import { Tag } from "@/components/ui/Status";
import { useStore } from "@/store/store";
import type { ClaimStatus, Thread } from "@/domain/types";
import { claimCategoryLabel, claimStatusLabel } from "@/domain/labels";
import { addDays, today } from "@/lib/clock";
import { dateShort, relativeTime, time } from "@/lib/format";
import { cn } from "@/lib/cn";

const steps: ClaimStatus[] = ["open", "in_progress", "scheduled", "resolved"];

/** A claim with its progress rail. Managers move it forward. */
export function ClaimPanel({ thread, canManage, actorId, onOpen }: { thread: Thread; canManage: boolean; actorId: string; onOpen?: () => void }) {
  const setStatus = useStore((s) => s.setClaimStatus);
  const [plan, setPlan] = useState(false);
  const [assignee, setAssignee] = useState(thread.assignee ?? "");
  const [date, setDate] = useState(() => {
    const d = addDays(today(), 2);
    return d.toISOString().slice(0, 10);
  });
  const idx = steps.indexOf(thread.status ?? "open");

  return (
    <div
      className={cn(
        "rounded-[16px] border p-4",
        thread.priority === "urgent" && thread.status !== "resolved" ? "border-signal/40 bg-signal-soft/40" : "border-line bg-surface",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <button onClick={onOpen} className="min-w-0 text-left">
          <p className="flex items-center gap-1.5 text-[12px] text-ink-3">
            <Wrench size={13} />
            {thread.category ? claimCategoryLabel[thread.category] : "Réclamation"}, ouverte {relativeTime(thread.createdAt)}
          </p>
          <p className="mt-1 text-[15px] font-medium leading-snug">{thread.subject}</p>
        </button>
        {thread.priority === "urgent" && thread.status !== "resolved" && <Tag tone="signal">Urgent</Tag>}
      </div>
      <ol className="mt-4 grid grid-cols-4 gap-1">
        {steps.map((s, i) => (
          <li key={s} className="min-w-0">
            <span
              className={cn(
                "block h-1.5 rounded-full",
                i <= idx ? (thread.status === "resolved" ? "bg-emerald-bright" : "bg-forest") : "bg-surface-3",
              )}
            />
            <span className={cn("mt-1.5 block truncate text-[11px]", i === idx ? "font-medium text-ink" : "text-ink-3")}>{claimStatusLabel[s]}</span>
          </li>
        ))}
      </ol>
      {(thread.assignee || thread.scheduledFor) && (
        <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-ink-2">
          {thread.assignee && <span>{thread.assignee}</span>}
          {thread.scheduledFor && thread.status !== "resolved" && (
            <span className="inline-flex items-center gap-1 text-ink-3">
              <CalendarBlank size={14} /> {dateShort(thread.scheduledFor)} à {time(thread.scheduledFor)}
            </span>
          )}
        </p>
      )}
      {canManage && thread.status !== "resolved" && (
        <div className="mt-4 flex flex-wrap gap-2">
          {thread.status === "open" && (
            <Button size="sm" variant="secondary" onClick={() => setStatus({ threadId: thread.id, status: "in_progress", actorId })}>
              Prendre en charge
            </Button>
          )}
          <Button size="sm" variant="secondary" icon={<CalendarBlank size={14} />} onClick={() => setPlan(true)}>
            Planifier
          </Button>
          <Button
            size="sm"
            variant="primary"
            icon={<Check size={14} weight="bold" />}
            onClick={() => {
              setStatus({ threadId: thread.id, status: "resolved", actorId });
              toast("Réclamation résolue", thread.subject);
            }}
          >
            Résolue
          </Button>
        </div>
      )}
      <Modal open={plan} onOpenChange={setPlan} title="Planifier l'intervention" description={thread.subject}>
        <div className="grid gap-4">
          <Field label="Prestataire">
            {(id) => <Input id={id} value={assignee} onChange={(e) => setAssignee(e.target.value)} placeholder="Ex. Plomberie Diop & Fils" />}
          </Field>
          <Field label="Date de passage" hint="Le locataire est prévenu dans l'application.">
            {(id) => <Input id={id} type="date" value={date} onChange={(e) => setDate(e.target.value)} />}
          </Field>
          <div className="flex justify-end">
            <Button
              variant="primary"
              disabled={!assignee.trim()}
              onClick={() => {
                const when = new Date(`${date}T10:00:00`).toISOString();
                setStatus({ threadId: thread.id, status: "scheduled", actorId, assignee: assignee.trim(), scheduledFor: when });
                setPlan(false);
                toast("Intervention planifiée", `${assignee.trim()}, ${dateShort(when)}`);
              }}
            >
              Confirmer
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
