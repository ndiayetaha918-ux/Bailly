import { AnimatePresence, motion } from "motion/react";
import { Table } from "@phosphor-icons/react";
import { useState } from "react";
import { useMeasure } from "@/hooks/useMeasure";
import { amount, compact, fcfa, periodLabel, periodShort } from "@/lib/format";
import { currentPeriod } from "@/lib/clock";
import { cn } from "@/lib/cn";

interface Point {
  period: string;
  expected: number;
  collected: number;
}

/*
  12-month collection chart. Stacked columns: encaissé (bottom), impayé for
  past months, à encaisser for the current month. One axis, thin marks,
  2px surface gap between segments, per-column tooltip, table view.
*/
export function RevenueChart({ data, height = 220 }: { data: Point[]; height?: number }) {
  const [ref, width] = useMeasure<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const [asTable, setAsTable] = useState(false);
  const now = currentPeriod();

  const max = Math.max(...data.map((d) => d.expected), 1);
  const step = niceStep(max / 4);
  const top = Math.ceil(max / step) * step;
  const ticks = Array.from({ length: Math.round(top / step) + 1 }, (_, i) => i * step);

  const padL = 44;
  const padB = 26;
  const plotW = Math.max(0, width - padL);
  const plotH = height - padB - 8;
  const band = plotW / data.length;
  const barW = Math.min(24, band * 0.56);
  const y = (v: number) => 8 + plotH - (v / top) * plotH;

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-4 text-[12.5px] text-ink-2">
          <Legend className="bg-chart-collected" label="Encaissé" />
          <Legend className="bg-chart-due" label="Impayé" />
          <Legend className="bg-pending" label="À encaisser" />
        </div>
        <button
          onClick={() => setAsTable((v) => !v)}
          className="inline-flex h-8 items-center gap-1.5 rounded-[10px] px-2.5 text-[12.5px] font-medium text-ink-3 hover:bg-surface-3 hover:text-ink"
        >
          <Table size={15} />
          {asTable ? "Voir le graphique" : "Voir le tableau"}
        </button>
      </div>

      {asTable ? (
        <div className="overflow-x-auto">
          <table className="num w-full text-[13px]">
            <thead>
              <tr className="text-left text-ink-3">
                <th className="py-2 font-medium">Mois</th>
                <th className="py-2 text-right font-medium">Attendu</th>
                <th className="py-2 text-right font-medium">Encaissé</th>
                <th className="py-2 text-right font-medium">Taux</th>
              </tr>
            </thead>
            <tbody>
              {data.map((d) => (
                <tr key={d.period} className="border-t border-line">
                  <td className="py-2">{periodLabel(d.period)}</td>
                  <td className="py-2 text-right">{amount(d.expected)}</td>
                  <td className="py-2 text-right">{amount(d.collected)}</td>
                  <td className="py-2 text-right">{d.expected ? Math.round((d.collected / d.expected) * 100) : 0} %</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div ref={ref} className="relative" style={{ height }} onMouseLeave={() => setHover(null)}>
          {width > 0 && (
            <svg width={width} height={height} className="block overflow-visible">
              {ticks.map((t) => (
                <g key={t}>
                  <line x1={padL} x2={width} y1={y(t)} y2={y(t)} stroke="var(--line)" strokeWidth={1} />
                  <text x={padL - 8} y={y(t) + 4} textAnchor="end" className="num fill-ink-3 text-[11px]">
                    {t === 0 ? "0" : compact(t)}
                  </text>
                </g>
              ))}
              {data.map((d, i) => {
                const cx = padL + band * i + band / 2;
                const x = cx - barW / 2;
                const isNow = d.period === now;
                const rest = Math.max(0, d.expected - d.collected);
                const hCollected = (d.collected / top) * plotH;
                const hRest = (rest / top) * plotH;
                const gap = hCollected > 0 && hRest > 0 ? 2 : 0;
                const yCollected = y(d.collected);
                const dim = hover !== null && hover !== i;
                return (
                  <g key={d.period} opacity={dim ? 0.45 : 1} style={{ transition: "opacity 160ms" }}>
                    {hRest > 0 && (
                      <path
                        d={roundedTop(x, y(d.expected), barW, Math.max(0, hRest - gap), hCollected > 0 ? 4 : 4)}
                        fill={isNow ? "var(--pending)" : "var(--chart-due)"}
                      />
                    )}
                    {hCollected > 0 && (
                      <path
                        d={hRest > 0 ? rect(x, yCollected, barW, hCollected) : roundedTop(x, yCollected, barW, hCollected, 4)}
                        fill="var(--chart-collected)"
                      />
                    )}
                    <text x={cx} y={height - 8} textAnchor="middle" className={cn("text-[11px]", isNow ? "fill-ink font-medium" : "fill-ink-3")}>
                      {periodShort(d.period)}
                    </text>
                    {isNow && hover === null && (
                      <text x={cx} y={y(d.expected) - 8} textAnchor="middle" className="num fill-ink text-[11.5px] font-medium">
                        {compact(d.collected)}
                      </text>
                    )}
                    <rect x={padL + band * i} y={0} width={band} height={height - padB} fill="transparent" onMouseEnter={() => setHover(i)} />
                  </g>
                );
              })}
            </svg>
          )}
          <AnimatePresence>
            {hover !== null && data[hover] && (
              <motion.div
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.12 }}
                className="pointer-events-none absolute top-0 z-10 w-[200px] rounded-[12px] border border-line bg-surface px-3 py-2.5 shadow-[var(--shadow-float)]"
                style={{
                  left: Math.min(Math.max(padL + band * hover + band / 2 - 100, 0), width - 200),
                }}
              >
                <p className="text-[13px] font-semibold">{periodLabel(data[hover].period)}</p>
                <dl className="num mt-1.5 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-[12.5px]">
                  <dt className="flex items-center gap-1.5 text-ink-3">
                    <span className="size-2 rounded-[2px] bg-chart-collected" />
                    Encaissé
                  </dt>
                  <dd className="text-right">{fcfa(data[hover].collected)}</dd>
                  <dt className="text-ink-3">Attendu</dt>
                  <dd className="text-right">{fcfa(data[hover].expected)}</dd>
                  <dt className="text-ink-3">Taux</dt>
                  <dd className="text-right">{data[hover].expected ? Math.round((data[hover].collected / data[hover].expected) * 100) : 0} %</dd>
                </dl>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

function Legend({ className, label }: { className: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={cn("size-2.5 rounded-[2px]", className)} />
      {label}
    </span>
  );
}

function niceStep(raw: number): number {
  const p = Math.pow(10, Math.floor(Math.log10(raw)));
  const n = raw / p;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * p;
}

function rect(x: number, y: number, w: number, h: number) {
  return `M${x},${y}h${w}v${h}h${-w}z`;
}

function roundedTop(x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.min(r, h, w / 2);
  return `M${x},${y + h}V${y + rr}Q${x},${y} ${x + rr},${y}H${x + w - rr}Q${x + w},${y} ${x + w},${y + rr}V${y + h}z`;
}
