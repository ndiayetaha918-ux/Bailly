import { motion, useReducedMotion } from "motion/react";
import { memo, useMemo } from "react";
import type { Property, Unit, UnitState } from "@/domain/types";
import { unitStateLabel, levelShort } from "@/domain/labels";
import { cn } from "@/lib/cn";

/*
  The facade is Bailly's signature: every building is drawn as an elevation
  and every local is a window coloured by its rent status. It is a real
  navigation surface (click a window to open the local), not decoration.
*/

export type FacadeSize = "xs" | "sm" | "md" | "lg" | "xl";

const fill: Record<UnitState, string> = {
  paid: "bg-emerald-bright",
  upcoming: "bg-pending",
  due: "bg-pending",
  partial: "bg-amber",
  late: "bg-signal",
  vacant: "hatch bg-surface-2",
};

const labelTone: Record<UnitState, string> = {
  paid: "text-[#05301f]",
  upcoming: "text-ink-2",
  due: "text-ink-2",
  partial: "text-[#3d2900]",
  late: "text-white",
  vacant: "text-ink-3",
};

const sizing: Record<FacadeSize, { gap: number; pad: number; row: number; ground: number; radius: number }> = {
  xs: { gap: 2, pad: 4, row: 9, ground: 1.25, radius: 2 },
  sm: { gap: 3, pad: 6, row: 20, ground: 1.3, radius: 2.5 },
  md: { gap: 5, pad: 10, row: 34, ground: 1.35, radius: 4 },
  lg: { gap: 6, pad: 14, row: 54, ground: 1.3, radius: 4 },
  xl: { gap: 8, pad: 16, row: 66, ground: 1.25, radius: 5 },
};

export interface FacadeProps {
  property: Pick<Property, "id" | "levels" | "bays">;
  units: Unit[];
  stateOf: (u: Unit) => UnitState;
  entrance?: number | null;
  size?: FacadeSize;
  selectedId?: string | null;
  highlightIds?: Set<string> | null;
  onSelect?: (u: Unit) => void;
  labelFor?: (u: Unit) => string | undefined;
  showLevels?: boolean;
  animate?: boolean;
  className?: string;
  tone?: "paper" | "forest";
  /** Overrides the status paint for a cell (used by the lobby). */
  cellClass?: (u: Unit) => string | undefined;
  /** Oblique depth in px: draws roof and side faces, like a model. */
  depth?: number;
}

export const Facade = memo(function Facade({
  property,
  units,
  stateOf,
  entrance,
  size = "md",
  selectedId,
  highlightIds,
  onSelect,
  labelFor,
  showLevels = false,
  animate = true,
  className,
  tone = "paper",
  cellClass,
  depth = 0,
}: FacadeProps) {
  const reduce = useReducedMotion();
  const s = sizing[size];
  const levels = property.levels;

  const rows = useMemo(() => {
    const r: string[] = [];
    for (let i = 0; i < levels - 1; i++) r.push(`${s.row}px`);
    r.push(`${Math.round(s.row * s.ground)}px`);
    return r.join(" ");
  }, [levels, s.row, s.ground]);

  const interactive = Boolean(onSelect);
  const showText = size === "md" || size === "lg" || size === "xl";
  const forest = tone === "forest";

  return (
    <div className={cn("flex items-end gap-3", className)}>
      {showLevels && (
        <div
          className="grid shrink-0 text-right font-mono text-[10.5px] text-ink-3"
          style={{ gridTemplateRows: rows, rowGap: s.gap, paddingBottom: s.pad + 4, paddingTop: s.pad + 6 }}
        >
          {Array.from({ length: levels }, (_, i) => levels - 1 - i).map((lvl) => (
            <span key={lvl} className="self-center">
              {levelShort(lvl)}
            </span>
          ))}
        </div>
      )}
      <div className="min-w-0 flex-1" style={depth ? { paddingTop: depth * 0.6, paddingRight: depth } : undefined}>
        <div className="relative">
          {depth > 0 && (
            <>
              <div
                aria-hidden
                className={cn("absolute", forest ? "bg-white/[0.11]" : "bg-[color-mix(in_oklab,var(--line-strong)_70%,var(--surface))]")}
                style={{
                  bottom: "100%",
                  left: -3,
                  right: -depth - 3,
                  height: depth * 0.6,
                  clipPath: `polygon(0 100%, ${depth}px 0, 100% 0, calc(100% - ${depth}px) 100%)`,
                }}
              />
              <div
                aria-hidden
                className={cn("absolute", forest ? "bg-black/25" : "bg-[color-mix(in_oklab,var(--surface-3)_78%,var(--ink))]")}
                style={{
                  left: "calc(100% + 3px)",
                  width: depth,
                  top: -depth * 0.6,
                  bottom: 0,
                  clipPath: `polygon(0 ${depth * 0.6}px, 100% 0, 100% calc(100% - ${depth * 0.6}px), 0 100%)`,
                }}
              />
            </>
          )}
          {/* parapet */}
          <div
            className={cn("relative mx-[-3px] rounded-t-[3px]", forest ? "bg-white/18" : "bg-line-strong")}
            style={{ height: size === "xs" ? 2 : size === "sm" ? 3 : 6 }}
          />
          <div
            className={cn("relative grid", forest ? "bg-white/[0.06]" : "bg-surface-3")}
            style={{
              gridTemplateColumns: `repeat(${property.bays}, minmax(0, 1fr))`,
              gridTemplateRows: rows,
              gap: s.gap,
              padding: s.pad,
            }}
          >
            {entrance !== undefined && entrance !== null && (
              <div
                className={cn("relative", forest ? "bg-white/10" : "bg-forest/90")}
                style={{
                  gridColumn: `${entrance + 1} / span 1`,
                  gridRow: `${levels} / span 1`,
                  borderRadius: `${s.radius * 3}px ${s.radius * 3}px 0 0`,
                  marginInline: size === "xs" || size === "sm" ? "18%" : "22%",
                  marginTop: size === "xs" ? 1 : "18%",
                  marginBottom: -s.pad,
                }}
                aria-hidden
              />
            )}
            {units.map((u, i) => {
              const st = stateOf(u);
              const dim = highlightIds ? !highlightIds.has(u.id) : false;
              const selected = selectedId === u.id;
              const label = labelFor?.(u) ?? u.code;
              const delay = reduce || !animate ? 0 : (levels - u.level) * 0.05 + u.position * 0.025 + i * 0.002;
              const Comp = interactive ? motion.button : motion.div;
              const custom = cellClass?.(u);
              return (
                <Comp
                  key={u.id}
                  type={interactive ? "button" : undefined}
                  onClick={interactive ? () => onSelect?.(u) : undefined}
                  title={interactive ? `${label} · ${unitStateLabel[st]}` : undefined}
                  aria-label={interactive ? `${label}, ${unitStateLabel[st]}` : undefined}
                  initial={animate && !reduce ? { opacity: 0, scaleY: 0.4 } : false}
                  animate={{ opacity: dim ? 0.28 : 1, scaleY: 1 }}
                  transition={{ delay, type: "spring", stiffness: 260, damping: 24 }}
                  style={{
                    gridColumn: `${u.position + 1} / span ${u.span}`,
                    gridRow: `${levels - u.level} / span 1`,
                    borderRadius: s.radius,
                    transformOrigin: "bottom",
                  }}
                  className={cn(
                    "group relative overflow-hidden text-left transition-colors duration-500",
                    custom ?? fill[st],
                    !custom && st === "vacant" && "ring-1 ring-inset ring-line-strong",
                    !custom && st === "due" && "shadow-[inset_0_-3px_0_var(--amber)]",
                    interactive &&
                      "cursor-pointer outline-none transition-[filter,box-shadow] hover:brightness-[1.06] focus-visible:ring-2 focus-visible:ring-ink",
                    selected && "ring-2 ring-ink ring-offset-2 ring-offset-surface-3",
                  )}
                >
                  {/* mullion: reads as a window, not a bar chart */}
                  {size !== "xs" && u.span === 1 && st !== "vacant" && (
                    <span aria-hidden className="absolute inset-y-[18%] left-1/2 w-px -translate-x-1/2 bg-black/[0.07]" />
                  )}
                  {showText && !custom && (
                    <span
                      className={cn(
                        "absolute left-1.5 top-1 font-mono text-[10.5px] font-medium leading-none",
                        labelTone[st],
                        (size === "lg" || size === "xl") && "left-2 top-1.5 text-[11.5px]",
                      )}
                    >
                      {label}
                    </span>
                  )}
                </Comp>
              );
            })}
          </div>
        </div>
        {/* ground line */}
        <div className={cn("ml-[-8px] h-[3px] rounded-full", forest ? "bg-white/25" : "bg-ink/80")} style={{ marginRight: -8 - depth }} />
      </div>
    </div>
  );
});

/** Inline legend; ordered by urgency. */
export function FacadeLegend({ counts, className }: { counts: Partial<Record<UnitState, number>>; className?: string }) {
  const order: UnitState[] = ["late", "partial", "due", "upcoming", "paid", "vacant"];
  return (
    <div className={cn("flex flex-wrap items-center gap-x-4 gap-y-2 text-[12.5px] text-ink-3", className)}>
      {order
        .filter((k) => (counts[k] ?? 0) > 0)
        .map((k) => (
          <span key={k} className="inline-flex items-center gap-1.5">
            <span
              className={cn(
                "inline-block size-2.5 rounded-[2px]",
                fill[k],
                k === "vacant" && "ring-1 ring-inset ring-line-strong",
                k === "due" && "shadow-[inset_0_-2px_0_var(--amber)]",
              )}
            />
            {unitStateLabel[k]}
            <span className="num font-medium text-ink-2">{counts[k]}</span>
          </span>
        ))}
    </div>
  );
}
