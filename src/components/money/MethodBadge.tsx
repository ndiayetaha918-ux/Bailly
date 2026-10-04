import { Bank, CreditCard, Money as MoneyIcon } from "@phosphor-icons/react";
import type { PaymentMethod } from "@/domain/types";
import { methodLabel } from "@/domain/labels";
import { cn } from "@/lib/cn";

/* Operator cues: initials on the operator's colour. Not official logos. */
const operator: Partial<Record<PaymentMethod, { bg: string; fg: string; mark: string }>> = {
  wave: { bg: "#1dc8f2", fg: "#062b3a", mark: "W" },
  orange_money: { bg: "#ff7a00", fg: "#2b1300", mark: "OM" },
  free_money: { bg: "#d4242b", fg: "#ffffff", mark: "F" },
};

export function MethodBadge({ method, size = 28, className }: { method: PaymentMethod; size?: number; className?: string }) {
  const op = operator[method];
  const style = { width: size, height: size, borderRadius: size * 0.3 };
  if (op) {
    return (
      <span
        aria-label={methodLabel[method]}
        className={cn("inline-grid shrink-0 place-items-center font-bold tracking-tight", className)}
        style={{ ...style, background: op.bg, color: op.fg, fontSize: size * (op.mark.length > 1 ? 0.34 : 0.44) }}
      >
        {op.mark}
      </span>
    );
  }
  const Icon = method === "card" ? CreditCard : method === "cash" ? MoneyIcon : Bank;
  return (
    <span aria-label={methodLabel[method]} className={cn("inline-grid shrink-0 place-items-center bg-surface-3 text-ink-2", className)} style={style}>
      <Icon size={size * 0.55} />
    </span>
  );
}
