import type { Palette3D } from "./Building3D";

export function readPalette3D(): Palette3D {
  const css = getComputedStyle(document.documentElement);
  const v = (n: string) => css.getPropertyValue(n).trim();
  const dark = document.documentElement.dataset.theme === "dark";
  return {
    slab: dark ? "#2b4237" : "#f4f6f3",
    core: dark ? "#1a2c24" : "#dfe6e0",
    edge: dark ? "#3e5a4c" : "#a9b8ae",
    ground: v("--surface-2"),
    gridCell: dark ? "#1e3329" : "#d3dcd5",
    gridSection: dark ? "#2a4639" : "#b9c6bd",
    accent: v("--mint") || "#8fe3bd",
    door: v("--forest") || "#0a2a1f",
    glass: dark ? "#cfe9db" : "#16392c",
  };
}

export function stateColor3D(state: string): string {
  const dark = document.documentElement.dataset.theme === "dark";
  switch (state) {
    case "paid":
      return dark ? "#2fae7a" : "#2fbf86";
    case "partial":
      return "#e5a92e";
    case "late":
      return "#e5582f";
    case "vacant":
      return dark ? "#33473d" : "#ffffff";
    default:
      return dark ? "#4b6357" : "#cfd9d2";
  }
}
