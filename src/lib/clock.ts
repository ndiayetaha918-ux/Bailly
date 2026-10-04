/*
  Demo clock. The seed data is written against a fixed anchor date so the
  story (who is late, what is due tomorrow) stays coherent whenever the demo
  is opened. Time of day still flows normally.
*/
export const DEMO_ANCHOR = "2026-10-04";

const anchor = new Date(`${DEMO_ANCHOR}T00:00:00`);
const realMidnight = new Date();
realMidnight.setHours(0, 0, 0, 0);
const offset = anchor.getTime() - realMidnight.getTime();

export function now(): Date {
  return new Date(Date.now() + offset);
}

export function nowISO(): string {
  return now().toISOString();
}

export function today(): Date {
  const d = now();
  d.setHours(0, 0, 0, 0);
  return d;
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

export function daysBetween(a: Date | string, b: Date | string): number {
  const da = new Date(a);
  const db = new Date(b);
  da.setHours(0, 0, 0, 0);
  db.setHours(0, 0, 0, 0);
  return Math.round((db.getTime() - da.getTime()) / 86_400_000);
}

export function periodOf(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function currentPeriod(): string {
  return periodOf(today());
}

export function periodToDate(period: string, day = 1): Date {
  const [y, m] = period.split("-").map(Number);
  const last = new Date(y, m, 0).getDate();
  return new Date(y, m - 1, Math.min(day, last));
}

export function shiftPeriod(period: string, delta: number): string {
  return periodOf(addMonths(periodToDate(period), delta));
}
