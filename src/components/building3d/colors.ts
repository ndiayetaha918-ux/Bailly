import type { Palette3D } from "./Building3D";
import { brand } from "@/brand/brand";

const pick = (pair: [string, string], dark: boolean) => (dark ? pair[1] : pair[0]);

export function readPalette3D(): Palette3D {
  const css = getComputedStyle(document.documentElement);
  const v = (n: string) => css.getPropertyValue(n).trim();
  const dark = document.documentElement.dataset.theme === "dark";
  const m = brand.model3D;
  return {
    slab: pick(m.slab, dark),
    core: pick(m.core, dark),
    edge: pick(m.edge, dark),
    ground: v("--surface-2"),
    gridCell: pick(m.gridCell, dark),
    gridSection: pick(m.gridSection, dark),
    accent: v("--mint") || "#8fe3bd",
    door: v("--forest") || "#0a2a1f",
    glass: pick(m.glass, dark),
    shadow: m.shadow,
    groundLight: m.groundLight,
    ink: v("--ink") || "#0b1913",
  };
}

export function stateColor3D(state: string): string {
  const dark = document.documentElement.dataset.theme === "dark";
  const s = brand.state3D;
  switch (state) {
    case "paid":
      return pick(s.paid, dark);
    case "partial":
      return s.partial;
    case "late":
      return s.late;
    case "vacant":
      return pick(s.vacant, dark);
    default:
      return pick(s.other, dark);
  }
}
