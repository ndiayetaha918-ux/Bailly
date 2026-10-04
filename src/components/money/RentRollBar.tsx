import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useState } from "react";
import { useNavigate } from "react-router";
import type { UnitState } from "@/domain/types";
import { unitStateLabel } from "@/domain/labels";
import { fcfa } from "@/lib/format";
import { cn } from "@/lib/cn";

/*
  A month's rent roll as one bar: every segment is a local, its width is the
  rent, its colour the status. Progress without a track, and every piece is
  clickable.
*/
export interface RollItem {
  id: string;
  label: string;
  sub: string;
  amount: number;
  paid: number;
  state: UnitState;
  href: string;
}

const paint: Record<UnitState, string> = {
  paid: "bg-emerald-bright",
  partial: "bg-amber",
  late: "bg-signal",
  due: "bg-white/[0.16]",
  upcoming: "bg-white/[0.16]",
  vacant: "hatch-forest bg-white/[0.04]",
};

export function RentRollBar({ items, height = 44 }: { items: RollItem[]; height?: number }) {
  const [hover, setHover] = useState<number | null>(null);
  const navigate = useNavigate();
  const reduce = useReducedMotion();
  const total = items.reduce((s, i) => s + i.amount, 0) || 1;

  let acc = 0;
  const centers = items.map((i) => {
    const c = (acc + i.amount / 2) / total;
    acc += i.amount;
    return c;
  });

  return (
    <div className="relative" onMouseLeave={() => setHover(null)}>
      <div className="flex gap-[2px]" style={{ height }}>
        {items.map((it, idx) => (
          <motion.button
            key={it.id}
            type="button"
            onMouseEnter={() => setHover(idx)}
            onFocus={() => setHover(idx)}
            onBlur={() => setHover(null)}
            onClick={() => navigate(it.href)}
            aria-label={`${it.label}, ${unitStateLabel[it.state]}, ${fcfa(it.amount)}`}
            initial={reduce ? false : { scaleY: 0 }}
            animate={{ scaleY: 1 }}
            transition={{ delay: idx * 0.012, type: "spring", stiffness: 300, damping: 26 }}
            style={{ flexGrow: it.amount, flexBasis: 0, transformOrigin: "bottom" }}
            className={cn(
              "relative min-w-[3px] overflow-hidden rounded-[3px] outline-none transition-[filter,opacity] first:rounded-l-[8px] last:rounded-r-[8px] focus-visible:ring-2 focus-visible:ring-mint",
              paint[it.state],
              hover !== null && hover !== idx && "opacity-55",
            )}
          >
            {it.state === "partial" && (
              <span className="absolute inset-x-0 bottom-0 bg-emerald-bright" style={{ height: `${(it.paid / it.amount) * 100}%` }} />
            )}
          </motion.button>
        ))}
      </div>
      <AnimatePresence>
        {hover !== null && items[hover] && (
          <motion.div
            key="tip"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.12 }}
            className="pointer-events-none absolute bottom-full z-10 mb-2.5 w-max max-w-[240px] -translate-x-1/2 rounded-[12px] bg-surface px-3 py-2 text-ink shadow-[var(--shadow-float)]"
            style={{ left: `${Math.min(92, Math.max(8, centers[hover]! * 100))}%` }}
          >
            <p className="text-[13px] font-semibold">{items[hover].label}</p>
            <p className="text-[12px] text-ink-3">{items[hover].sub}</p>
            <p className="num mt-1 text-[12.5px]">
              {unitStateLabel[items[hover].state]}, {fcfa(items[hover].state === "partial" ? items[hover].paid : items[hover].amount)}
              {items[hover].state === "partial" && <span className="text-ink-3"> sur {fcfa(items[hover].amount)}</span>}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
