import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { Link } from "react-router";
import type { Invoice, InvoiceStatus } from "@/domain/types";
import { invoiceStatus, pendingTransfer, type Data } from "@/domain/selectors";
import { methodLabel } from "@/domain/labels";
import { dateShort, fcfa, periodLabel, periodShort } from "@/lib/format";
import { cn } from "@/lib/cn";

/*
  Échéancier: twelve months as twelve blocks, the same cell language as the
  facade, laid out in time instead of space. The fill height is what was paid.
*/
const fill: Record<InvoiceStatus, string> = {
  paid: "bg-emerald-bright",
  partial: "bg-amber",
  late: "bg-signal",
  due: "bg-pending",
  upcoming: "bg-pending",
};

export function MonthStrip({ d, invoices, receiptBase = "/quittance" }: { d: Data; invoices: Invoice[]; receiptBase?: string }) {
  const [sel, setSel] = useState<string | null>(invoices[invoices.length - 1]?.id ?? null);
  const inv = invoices.find((i) => i.id === sel);
  const pays = inv ? d.payments.filter((p) => p.invoiceId === inv.id && (p.status === "succeeded" || p.status === "pending")) : [];
  const receipt = inv ? d.receipts.find((r) => r.invoiceId === inv.id) : undefined;

  return (
    <div>
      <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${Math.max(invoices.length, 1)}, minmax(0, 1fr))` }}>
        {invoices.map((i, idx) => {
          const st = invoiceStatus(i);
          const pt = pendingTransfer(d, i.id);
          const ratio = Math.min(1, i.paid / i.amount);
          const active = sel === i.id;
          return (
            <button
              key={i.id}
              onClick={() => setSel(i.id)}
              className="group flex flex-col items-center gap-1.5 outline-none"
              aria-label={`${periodLabel(i.period)}, ${st}`}
              aria-pressed={active}
            >
              <motion.span
                initial={{ scaleY: 0 }}
                animate={{ scaleY: 1 }}
                transition={{ delay: idx * 0.03, type: "spring", stiffness: 260, damping: 24 }}
                style={{ transformOrigin: "bottom" }}
                className={cn(
                  "relative block h-16 w-full overflow-hidden rounded-[var(--radius-cell)] transition-shadow",
                  st === "paid" ? fill.paid : st === "partial" ? "bg-signal-soft" : pt ? "bg-pending" : fill[st],
                  st === "due" && !pt && "shadow-[inset_0_-3px_0_var(--amber)]",
                  active && "ring-2 ring-ink ring-offset-2 ring-offset-surface",
                  "group-focus-visible:ring-2 group-focus-visible:ring-emerald",
                )}
              >
                {st === "partial" && <span className="absolute inset-x-0 bottom-0 bg-amber" style={{ height: `${ratio * 100}%` }} />}
                {pt && <span className="hatch absolute inset-0 opacity-60" />}
              </motion.span>
              <span className={cn("text-[11px]", active ? "font-medium text-ink" : "text-ink-3")}>{periodShort(i.period)}</span>
            </button>
          );
        })}
      </div>
      <AnimatePresence mode="wait">
        {inv && (
          <motion.div
            key={inv.id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-[14px] bg-surface-2 px-4 py-3"
          >
            <div>
              <p className="text-[14px] font-medium">{periodLabel(inv.period)}</p>
              <p className="num text-[13px] text-ink-3">
                {fcfa(inv.amount)}, échéance {dateShort(inv.dueDate)}
                {pays.length > 0 &&
                  `. ${pays
                    .map((p) =>
                      p.status === "pending"
                        ? `Virement de ${fcfa(p.amount)} à confirmer`
                        : `${fcfa(p.amount)} le ${dateShort(p.settledAt!)} par ${methodLabel[p.method]}`,
                    )
                    .join(", ")}`}
              </p>
            </div>
            {receipt ? (
              <Link to={`${receiptBase}/${receipt.id}`} className="text-[13px] font-medium text-emerald hover:underline">
                Voir la quittance {receipt.number}
              </Link>
            ) : (
              <span className="text-[13px] text-ink-3">{inv.paid > 0 ? `Reste ${fcfa(inv.amount - inv.paid)}` : "Pas encore payé"}</span>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
