import { brand } from "@/brand/brand";
import {
  ArrowBendDownRight,
  BellRinging,
  CheckCircle,
  FilePdf,
  Image as ImageIcon,
  PaperPlaneRight,
  Receipt as ReceiptIcon,
  SealCheck,
  Wrench,
  XCircle,
  PencilSimpleLine,
  Paperclip,
} from "@phosphor-icons/react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Segmented } from "@/components/ui/Segmented";
import { Tag } from "@/components/ui/Status";
import { useData } from "@/hooks/useData";
import { useStore } from "@/store/store";
import { person, unitJournal, type JournalItem } from "@/domain/selectors";
import { claimCategoryLabel, claimStatusLabel, methodLabel } from "@/domain/labels";
import type { Attachment, Message, Role, Thread, UnitEvent } from "@/domain/types";
import { daysBetween, now } from "@/lib/clock";
import { amount, dateLong, time } from "@/lib/format";
import { cn } from "@/lib/cn";

/*
  The local's journal: conversations, claims, payments and reminders in one
  chronological thread. Everything that happened to this local, in context.
*/

type Filter = "all" | "messages" | "claims" | "money";

const roleLabel: Record<Role, string> = { owner: "Propriétaire", manager: "Gestionnaire", tenant: "Locataire" };

export function UnitJournal({
  unitId,
  viewer,
  viewerId,
  receiptBase = "/quittance",
  compact = false,
  initialThreadId,
  hideFilters = false,
  height,
  autoRead = true,
}: {
  unitId: string;
  viewer: Role;
  viewerId: string;
  receiptBase?: string;
  compact?: boolean;
  initialThreadId?: string;
  hideFilters?: boolean;
  height?: number | string;
  autoRead?: boolean;
}) {
  const d = useData();
  const [filter, setFilter] = useState<Filter>("all");
  const markRead = useStore((s) => s.markThreadRead);
  const items = useMemo(() => unitJournal(d, unitId), [d, unitId]);
  const threads = d.threads.filter((t) => t.unitId === unitId);
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!autoRead) return;
    for (const t of threads) if (t.unreadBy.includes(viewer)) markRead(t.id, viewer);
  }, [threads.map((t) => t.unreadBy.join()).join(), viewer, autoRead]); // eslint-disable-line react-hooks/exhaustive-deps

  const visible = items.filter((it) => {
    if (viewer === "tenant" && it.kind === "event" && it.event.type === "reminder_sent") return true;
    if (filter === "all") return true;
    if (filter === "messages") return it.kind === "message" && it.thread.kind === "message";
    if (filter === "claims")
      return (it.kind === "message" && it.thread.kind === "claim") || (it.kind === "event" && it.event.type.startsWith("claim"));
    return it.kind === "event" && (it.event.type.startsWith("payment") || it.event.type === "reminder_sent" || it.event.type === "rent_changed");
  });

  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
    const raf = requestAnimationFrame(() => (el.scrollTop = el.scrollHeight));
    const t = setTimeout(() => (el.scrollTop = el.scrollHeight), 350);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(t);
    };
  }, [visible.length, filter, unitId]);

  // Group by day.
  const groups: Array<{ day: string; items: JournalItem[] }> = [];
  for (const it of visible) {
    const key = new Date(it.at).toDateString();
    const g = groups[groups.length - 1];
    if (g && g.day === key) g.items.push(it);
    else groups.push({ day: key, items: [it] });
  }

  const multiThread = threads.length > 1;

  return (
    <div className="flex h-full flex-col">
      {!hideFilters && (
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 pb-3 pt-4">
          <h2 className="type-display text-[19px] font-semibold">Journal du local</h2>
          <Segmented
            size="sm"
            value={filter}
            onChange={setFilter}
            options={[
              { value: "all", label: "Tout" },
              { value: "messages", label: "Messages" },
              { value: "claims", label: "Réclamations" },
              { value: "money", label: "Paiements" },
            ]}
          />
        </div>
      )}
      <div ref={scroller} className="min-h-0 flex-1 overflow-y-auto px-5 pb-4" style={height ? { maxHeight: height } : undefined}>
        {groups.length === 0 && <p className="py-10 text-center text-[14px] text-ink-3">Rien pour l'instant.</p>}
        {groups.map((g) => (
          <div key={g.day}>
            <div className="flex justify-center py-3">
              <span className="rounded-full bg-surface-3 px-2.5 py-0.5 text-[11.5px] font-medium text-ink-3">{dayLabel(g.items[0]!.at)}</span>
            </div>
            <div className="grid gap-2.5">
              {g.items.map((it) =>
                it.kind === "message" ? (
                  <MessageBubble
                    key={it.message.id}
                    message={it.message}
                    thread={it.thread}
                    mine={it.message.authorId === viewerId || (viewer !== "tenant" && it.message.authorRole === viewer)}
                    showThread={multiThread && !compact}
                  />
                ) : (
                  <EventLine key={it.event.id} event={it.event} receiptBase={receiptBase} viewer={viewer} />
                ),
              )}
            </div>
          </div>
        ))}
      </div>
      <Composer unitId={unitId} viewer={viewer} viewerId={viewerId} threads={threads} initialThreadId={initialThreadId} />
    </div>
  );
}

function dayLabel(iso: string) {
  const diff = daysBetween(iso, now());
  if (diff === 0) return "Aujourd'hui";
  if (diff === 1) return "Hier";
  return dateLong(iso);
}

function MessageBubble({ message, thread, mine, showThread }: { message: Message; thread: Thread; mine: boolean; showThread: boolean }) {
  const d = useData();
  const author = person(d, message.authorId);
  const name = author?.org && author.role === "manager" ? `${author.name}` : (author?.name ?? "");
  return (
    <motion.div
      layout="position"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn("flex items-end gap-2", mine && "flex-row-reverse")}
    >
      <Avatar name={name} size={28} />
      <div className={cn("max-w-[78%]", mine && "items-end text-right")}>
        <p className={cn("mb-1 flex items-center gap-1.5 text-[11.5px] text-ink-3", mine && "justify-end")}>
          <span className="font-medium text-ink-2">{name}</span>
          <span>{roleLabel[message.authorRole]}</span>
          <span>{time(message.createdAt)}</span>
        </p>
        <div
          className={cn(
            "inline-block rounded-[16px] px-3.5 py-2.5 text-left text-[14px] leading-relaxed",
            mine ? "rounded-br-[6px] bg-forest text-on-forest" : "rounded-bl-[6px] border border-line bg-surface text-ink",
          )}
        >
          {showThread && (
            <span className={cn("mb-1 flex items-center gap-1 text-[11.5px] font-medium", mine ? "text-on-forest-2" : "text-ink-3")}>
              {thread.kind === "claim" ? <Wrench size={12} /> : <ArrowBendDownRight size={12} />}
              {thread.subject}
            </span>
          )}
          {message.body}
          {message.attachments?.map((a) => (
            <AttachmentChip key={a.name} a={a} dark={mine} />
          ))}
        </div>
      </div>
    </motion.div>
  );
}

function AttachmentChip({ a, dark }: { a: Attachment; dark: boolean }) {
  if (a.kind === "photo") {
    return (
      <span className="mt-2 block overflow-hidden rounded-[12px]">
        <span
          className="flex h-28 w-48 items-end p-2"
          style={{
            background: `linear-gradient(160deg, ${a.tone ?? "#7c8f86"} 0%, color-mix(in oklab, ${a.tone ?? "#7c8f86"} 60%, #0b1913) 100%)`,
          }}
        >
          <span className="inline-flex items-center gap-1 rounded-[8px] bg-black/35 px-1.5 py-0.5 text-[11px] text-white">
            <ImageIcon size={12} /> {a.name}
          </span>
        </span>
      </span>
    );
  }
  return (
    <span className={cn("mt-2 flex items-center gap-2 rounded-[10px] px-2.5 py-2 text-[12.5px]", dark ? "bg-white/10" : "bg-surface-2")}>
      <FilePdf size={18} />
      {a.name}
    </span>
  );
}

function EventLine({ event, receiptBase, viewer }: { event: UnitEvent; receiptBase: string; viewer: Role }) {
  const d = useData();
  const pay = event.paymentId ? d.payments.find((p) => p.id === event.paymentId) : undefined;
  const receipt = pay?.receiptId ? d.receipts.find((r) => r.id === pay.receiptId) : undefined;
  const meta: Record<UnitEvent["type"], { icon: React.ReactNode; tone: string }> = {
    payment_received: { icon: <CheckCircle size={16} weight="fill" />, tone: "text-emerald-bright" },
    payment_failed: { icon: <XCircle size={16} weight="fill" />, tone: "text-signal" },
    receipt_issued: { icon: <ReceiptIcon size={16} />, tone: "text-ink-3" },
    reminder_sent: { icon: <BellRinging size={16} />, tone: "text-amber-ink" },
    claim_opened: { icon: <Wrench size={16} />, tone: "text-signal-ink" },
    claim_status: { icon: <SealCheck size={16} />, tone: "text-ink-3" },
    lease_signed: { icon: <PencilSimpleLine size={16} />, tone: "text-ink-3" },
    rent_changed: { icon: <PencilSimpleLine size={16} />, tone: "text-ink-3" },
  };
  const m = meta[event.type];
  let text = event.text;
  if (viewer === "tenant" && event.type === "reminder_sent") text = "Rappel de paiement reçu";
  return (
    <motion.div layout="position" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2.5 px-1 py-0.5 text-[13px]">
      <span className={cn("grid size-6 shrink-0 place-items-center rounded-[8px] bg-surface-2", m.tone)}>{m.icon}</span>
      <span className="min-w-0 flex-1 text-ink-2">
        {text}
        {event.meta?.amount !== undefined && (
          <span className="num font-medium text-ink">
            {" "}
            {amount(Number(event.meta.amount))} {brand.currency}
          </span>
        )}
        {event.meta?.method && <span className="text-ink-3"> via {methodLabel[event.meta.method as keyof typeof methodLabel]}</span>}
      </span>
      {receipt && (
        <Link to={`${receiptBase}/${receipt.id}`} className="shrink-0 text-[12.5px] font-medium text-emerald hover:underline">
          Quittance
        </Link>
      )}
      <span className="shrink-0 text-[11.5px] text-ink-3">{time(event.at)}</span>
    </motion.div>
  );
}

function Composer({
  unitId,
  viewer,
  viewerId,
  threads,
  initialThreadId,
}: {
  unitId: string;
  viewer: Role;
  viewerId: string;
  threads: Thread[];
  initialThreadId?: string;
}) {
  const send = useStore((s) => s.sendMessage);
  const start = useStore((s) => s.startThread);
  const open = threads.filter((t) => t.kind === "message" || t.status !== "resolved").sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const [threadId, setThreadId] = useState<string>(initialThreadId ?? open[0]?.id ?? "new");
  const [text, setText] = useState("");
  const [attached, setAttached] = useState(false);

  useEffect(() => {
    if (initialThreadId) setThreadId(initialThreadId);
  }, [initialThreadId]);

  const submit = () => {
    const body = text.trim();
    if (!body) return;
    const attachments: Attachment[] | undefined = attached ? [{ name: "photo.jpg", kind: "photo", tone: "#8a9a91" }] : undefined;
    if (threadId === "new" || !threads.find((t) => t.id === threadId)) {
      const id = start({ unitId, kind: "message", subject: body.slice(0, 48), body, authorId: viewerId, role: viewer, attachments });
      setThreadId(id);
    } else {
      send({ threadId, authorId: viewerId, role: viewer, body, attachments });
    }
    setText("");
    setAttached(false);
  };

  return (
    <div className="border-t border-line p-3">
      <div className="mb-2 flex items-center gap-1.5 overflow-x-auto scrollbar-none">
        {open.map((t) => (
          <button
            key={t.id}
            onClick={() => setThreadId(t.id)}
            className={cn(
              "inline-flex h-7 shrink-0 items-center gap-1.5 rounded-full px-2.5 text-[12px] font-medium transition-colors",
              threadId === t.id ? "bg-forest text-on-forest" : "bg-surface-3 text-ink-2 hover:text-ink",
            )}
          >
            {t.kind === "claim" && <Wrench size={12} />}
            <span className="max-w-[180px] truncate">{t.subject}</span>
          </button>
        ))}
        <button
          onClick={() => setThreadId("new")}
          className={cn(
            "inline-flex h-7 shrink-0 items-center rounded-full px-2.5 text-[12px] font-medium",
            threadId === "new" ? "bg-forest text-on-forest" : "text-ink-3 hover:text-ink",
          )}
        >
          + Nouveau sujet
        </button>
      </div>
      <div className="flex items-end gap-2 rounded-[16px] border border-line-strong bg-surface p-1.5 focus-within:border-emerald">
        <button
          onClick={() => setAttached((v) => !v)}
          aria-label="Joindre une photo"
          className={cn(
            "grid size-9 shrink-0 place-items-center rounded-[11px] text-ink-3 hover:bg-surface-3",
            attached && "bg-mint-soft text-mint-ink",
          )}
        >
          <Paperclip size={18} />
        </button>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
          rows={1}
          placeholder={threadId === "new" ? "Écrire un nouveau message…" : "Répondre…"}
          aria-label="Message"
          className="max-h-32 min-h-9 flex-1 resize-none bg-transparent py-2 text-[14px] text-ink placeholder:text-ink-3 focus:outline-none"
        />
        <Button variant="primary" size="sm" className="h-9 w-9 shrink-0 px-0" onClick={submit} aria-label="Envoyer" disabled={!text.trim()}>
          <PaperPlaneRight size={16} weight="fill" />
        </Button>
      </div>
      <AnimatePresence>
        {attached && (
          <motion.p
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-1.5 px-2 text-[12px] text-ink-3"
          >
            Photo jointe : photo.jpg
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}

export function ClaimBadge({ thread }: { thread: Thread }) {
  if (thread.kind !== "claim" || !thread.status) return null;
  const tone = thread.status === "resolved" ? "mint" : thread.priority === "urgent" ? "signal" : thread.status === "open" ? "amber" : "neutral";
  return (
    <Tag tone={tone}>
      {claimStatusLabel[thread.status]}
      {thread.category ? `, ${claimCategoryLabel[thread.category].toLowerCase()}` : ""}
    </Tag>
  );
}
