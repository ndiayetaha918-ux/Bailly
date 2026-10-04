import { daysBetween, now, periodToDate } from "./clock";

const nf = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 });

/** 285000 -> "285 000" (narrow no-break spaces, as French typography wants). */
export function amount(n: number): string {
  return nf.format(Math.round(n)).replace(/ | /g, " ");
}

export function fcfa(n: number): string {
  return `${amount(n)} FCFA`;
}

/** Compact form for tight spots: 1 245 000 -> "1,25 M". */
export function compact(n: number): string {
  if (Math.abs(n) >= 1_000_000) {
    return `${(n / 1_000_000).toLocaleString("fr-FR", { maximumFractionDigits: 2 })} M`;
  }
  if (Math.abs(n) >= 10_000) {
    return `${Math.round(n / 1000).toLocaleString("fr-FR")} k`;
  }
  return amount(n);
}

const monthLong = new Intl.DateTimeFormat("fr-FR", { month: "long" });
const monthShort = new Intl.DateTimeFormat("fr-FR", { month: "short" });

export function periodLabel(period: string, withYear = true): string {
  const d = periodToDate(period);
  const m = monthLong.format(d);
  const label = m.charAt(0).toUpperCase() + m.slice(1);
  return withYear ? `${label} ${d.getFullYear()}` : label;
}

export function periodShort(period: string): string {
  return monthShort.format(periodToDate(period)).replace(".", "");
}

export function dateLong(iso: string | Date): string {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
}

export function dateShort(iso: string | Date): string {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short" }).replace(".", "");
}

export function dateNumeric(iso: string | Date): string {
  return new Date(iso).toLocaleDateString("fr-FR");
}

export function time(iso: string | Date): string {
  return new Date(iso).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

/** Relative day wording used across the product. */
export function relativeDay(iso: string | Date): string {
  const d = daysBetween(now(), iso);
  if (d === 0) return "aujourd'hui";
  if (d === 1) return "demain";
  if (d === -1) return "hier";
  if (d > 1 && d < 7) return `dans ${d} jours`;
  if (d < -1 && d > -7) return `il y a ${-d} jours`;
  return dateShort(iso);
}

export function relativeTime(iso: string | Date): string {
  const diff = (now().getTime() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "à l'instant";
  if (diff < 3600) return `il y a ${Math.floor(diff / 60)} min`;
  if (diff < 86400 && new Date(iso).getDate() === now().getDate()) return time(iso);
  const d = daysBetween(iso, now());
  if (d === 1) return `hier, ${time(iso)}`;
  if (d < 7) return `il y a ${d} j`;
  return dateShort(iso);
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter((p) => p.length > 1)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");
}

export function firstName(name: string): string {
  return name.split(" ")[0] ?? name;
}

export function plural(n: number, one: string, many: string): string {
  return `${n} ${n > 1 ? many : one}`;
}

export function phone(p: string): string {
  const digits = p.replace(/\D/g, "").replace(/^221/, "");
  return digits.replace(/(\d{2})(\d{3})(\d{2})(\d{2})/, "$1 $2 $3 $4");
}
