import { cn } from "@/lib/cn";

/* Mark: a three-storey elevation, two windows lit. Simple geometry only. */
export function LogoMark({ size = 28, className, lit = "var(--emerald-bright)" }: { size?: number; className?: string; lit?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" className={className} aria-hidden>
      <rect width="32" height="32" rx="9" fill="var(--forest)" />
      <rect x="8" y="7" width="7" height="5" rx="1.2" fill={lit} />
      <rect x="17" y="7" width="7" height="5" rx="1.2" fill="var(--on-forest)" opacity="0.92" />
      <rect x="8" y="14" width="7" height="5" rx="1.2" fill="var(--on-forest)" opacity="0.92" />
      <rect x="17" y="14" width="7" height="5" rx="1.2" fill={lit} />
      <rect x="8" y="21" width="16" height="5" rx="1.2" fill="var(--on-forest)" opacity="0.92" />
    </svg>
  );
}

export function Logo({ className, tone = "ink" }: { className?: string; tone?: "ink" | "light" }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <LogoMark />
      <span
        className={cn("type-display text-[22px] font-bold", tone === "light" ? "text-on-forest" : "text-ink")}
        style={{ fontStretch: "80%", letterSpacing: "-0.04em" }}
      >
        bailly
      </span>
    </span>
  );
}
