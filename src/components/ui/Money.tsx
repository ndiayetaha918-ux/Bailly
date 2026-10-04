import { amount } from "@/lib/format";
import { cn } from "@/lib/cn";

/** Amounts are set in the display face; the currency steps back.
    Digit groups are spaced with margins: the display face has no
    narrow no-break space glyph. */
export function Money({
  value,
  className,
  currencyClassName,
  condensed = false,
  currency = "FCFA",
  tabular = false,
}: {
  value: number;
  className?: string;
  currencyClassName?: string;
  condensed?: boolean;
  currency?: string | null;
  tabular?: boolean;
}) {
  const groups = amount(value).split(/ | |\s/);
  return (
    <span className={cn("whitespace-nowrap", tabular && "num", condensed ? "type-display-condensed" : "type-display", className)}>
      {groups.map((g, i) => (
        <span key={i} style={i > 0 ? { marginLeft: "0.16em" } : undefined}>
          {g}
        </span>
      ))}
      {currency && (
        <span
          className={cn("ml-[0.25em] font-sans text-[0.42em] font-medium tracking-normal opacity-60", currencyClassName)}
          style={{ fontStretch: "100%" }}
        >
          {currency}
        </span>
      )}
    </span>
  );
}
