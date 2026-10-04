import { useId } from "react";
import { BRAND_ID } from "@/brand/brand";
import { cn } from "@/lib/cn";

/* Bailly mark: a three-storey elevation, two windows lit. Simple geometry only. */
function BaillyMark({ size = 28, className, lit = "var(--emerald-bright)" }: { size?: number; className?: string; lit?: string }) {
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

/*
  TouchPoint mark (two overlapping circles): navy "touch", crimson "point",
  a gap ring around the small circle and a darker lens where they overlap.
  On dark surfaces it sits on a light tile, like an app icon.
*/
export function TouchpointMark({ size = 28, className, tile = false }: { size?: number; className?: string; tile?: boolean }) {
  const id = useId().replace(/:/g, "");
  const ring = tile ? "#fefeff" : "var(--paper)";
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" className={className} aria-hidden>
      <defs>
        <clipPath id={`navy-${id}`}>
          <circle cx="12.6" cy="19.4" r="10.4" />
        </clipPath>
      </defs>
      {tile && <rect width="32" height="32" rx="9" fill="#fefeff" />}
      <g transform={tile ? "translate(16 16) scale(0.8) translate(-16 -16)" : undefined}>
        <circle cx="12.6" cy="19.4" r="10.4" fill={tile ? "#282d5d" : "var(--tp-navy, #282d5d)"} />
        <circle cx="22" cy="10.2" r="8.6" fill={ring} />
        <circle cx="22" cy="10.2" r="7.4" fill="#a81735" />
        <circle cx="22" cy="10.2" r="7.4" fill="#7c1333" clipPath={`url(#navy-${id})`} />
      </g>
    </svg>
  );
}

export function LogoMark({ size = 28, className, lit, tile }: { size?: number; className?: string; lit?: string; tile?: boolean }) {
  if (BRAND_ID === "loclic") return <TouchpointMark size={size} className={className} tile={tile} />;
  return <BaillyMark size={size} className={className} lit={lit} />;
}

export function Logo({ className, tone = "ink" }: { className?: string; tone?: "ink" | "light" }) {
  if (BRAND_ID === "loclic") {
    const light = tone === "light";
    return (
      <span className={cn("inline-flex items-center gap-2", className)}>
        <TouchpointMark size={30} tile={light} />
        <span className="leading-none">
          <span className="block text-[9.5px] font-extrabold tracking-[0.07em]">
            <span className={light ? "text-on-forest" : "text-ink"}>TOUCH</span>
            <span className={light ? "text-[#ff8aa0]" : "text-emerald"}>POINT</span>
          </span>
          <span className={cn("mt-0.5 block text-[20px] font-black tracking-[-0.03em]", light ? "text-on-forest" : "text-ink")}>Loclic</span>
        </span>
      </span>
    );
  }
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <BaillyMark />
      <span
        className={cn("type-display text-[22px] font-bold", tone === "light" ? "text-on-forest" : "text-ink")}
        style={{ fontStretch: "80%", letterSpacing: "-0.04em" }}
      >
        bailly
      </span>
    </span>
  );
}
