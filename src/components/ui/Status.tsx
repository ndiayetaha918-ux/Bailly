import type { InvoiceStatus, UnitState } from "@/domain/types";
import { unitStateLabel } from "@/domain/labels";
import { cn } from "@/lib/cn";

/* The swatch is a tiny facade cell, not a dot: the same shape language
   as the building elevations. */
export const stateSwatch: Record<UnitState, string> = {
  paid: "bg-emerald-bright",
  upcoming: "bg-pending",
  due: "bg-pending shadow-[inset_0_-3px_0_var(--amber)]",
  partial: "bg-amber",
  late: "bg-signal",
  vacant: "hatch bg-surface-2 ring-1 ring-inset ring-line-strong",
};

const chip: Record<UnitState, string> = {
  paid: "bg-mint-soft text-mint-ink",
  upcoming: "bg-surface-3 text-ink-2",
  due: "bg-amber-soft text-amber-ink",
  partial: "bg-amber-soft text-amber-ink",
  late: "bg-signal-soft text-signal-ink",
  vacant: "bg-surface-3 text-ink-3",
};

export function Swatch({ state, className }: { state: UnitState; className?: string }) {
  return <span aria-hidden className={cn("inline-block size-2.5 shrink-0 rounded-[2px]", stateSwatch[state], className)} />;
}

export function StatusChip({ state, label, className }: { state: UnitState | InvoiceStatus; label?: string; className?: string }) {
  const s = state as UnitState;
  return (
    <span
      className={cn("inline-flex h-6 items-center gap-1.5 whitespace-nowrap rounded-full pl-2 pr-2.5 text-[12px] font-medium", chip[s], className)}
    >
      <Swatch state={s} className="size-2" />
      {label ?? unitStateLabel[s]}
    </span>
  );
}

export function Tag({
  children,
  tone = "neutral",
  className,
}: {
  children: React.ReactNode;
  tone?: "neutral" | "signal" | "mint" | "amber" | "forest";
  className?: string;
}) {
  const tones = {
    neutral: "bg-surface-3 text-ink-2",
    signal: "bg-signal-soft text-signal-ink",
    mint: "bg-mint-soft text-mint-ink",
    amber: "bg-amber-soft text-amber-ink",
    forest: "bg-forest text-on-forest",
  };
  return (
    <span className={cn("inline-flex h-6 items-center gap-1 whitespace-nowrap rounded-full px-2.5 text-[12px] font-medium", tones[tone], className)}>
      {children}
    </span>
  );
}
