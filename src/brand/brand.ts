/*
  Brand configuration. The product is the same; the skin changes.
  Chosen at build time with VITE_BRAND (bailly | loclic). Colours live as
  CSS tokens in styles/index.css under :root[data-brand="…"]; this file holds
  what CSS cannot reach (names, the 3D model, unit-kind colours).
*/
import type { UnitKind } from "@/domain/types";

export type BrandId = "bailly" | "loclic";

export const BRAND_ID: BrandId = import.meta.env.VITE_BRAND === "loclic" ? "loclic" : "bailly";

interface Brand {
  id: BrandId;
  /** Full product name, as written in sentences. */
  name: string;
  tagline: string;
  /** Currency label next to amounts in the interface. */
  currency: string;
  themeColor: string;
  kindColors: Record<UnitKind, string>;
  state3D: { paid: [string, string]; partial: string; late: string; vacant: [string, string]; other: [string, string] };
  model3D: {
    slab: [string, string];
    core: [string, string];
    edge: [string, string];
    gridCell: [string, string];
    gridSection: [string, string];
    glass: [string, string];
    shadow: string;
    sky: string;
    groundLight: string;
  };
}

const brands: Record<BrandId, Brand> = {
  bailly: {
    id: "bailly",
    name: "Bailly",
    tagline: "Chaque local, chaque loyer.",
    currency: "FCFA",
    themeColor: "#0a2a1f",
    kindColors: { appartement: "#9fd9bd", studio: "#c6ead8", bureau: "#bfd0e2", boutique: "#f0cf8c", magasin: "#e8b872" },
    state3D: { paid: ["#2fbf86", "#2fae7a"], partial: "#e5a92e", late: "#e5582f", vacant: ["#ffffff", "#33473d"], other: ["#cfd9d2", "#4b6357"] },
    model3D: {
      slab: ["#f4f6f3", "#2b4237"],
      core: ["#dfe6e0", "#1a2c24"],
      edge: ["#a9b8ae", "#3e5a4c"],
      gridCell: ["#d3dcd5", "#1e3329"],
      gridSection: ["#b9c6bd", "#2a4639"],
      glass: ["#16392c", "#cfe9db"],
      shadow: "#0b2a1f",
      sky: "#ffffff",
      groundLight: "#c9d6cd",
    },
  },
  loclic: {
    id: "loclic",
    name: "Touchpoint Loclic",
    tagline: "Votre loyer, en un clic.",
    currency: "F",
    themeColor: "#282d5d",
    kindColors: { appartement: "#b9bcf6", studio: "#dcdefc", bureau: "#c4cde6", boutique: "#fdd36a", magasin: "#f6b94a" },
    state3D: { paid: ["#5d62d8", "#7176ea"], partial: "#fdbf1c", late: "#e8542f", vacant: ["#ffffff", "#2f3466"], other: ["#d6d8f0", "#454b80"] },
    model3D: {
      slab: ["#f6f7fe", "#2c3160"],
      core: ["#e2e4f6", "#1c2048"],
      edge: ["#aeb2d6", "#434a85"],
      gridCell: ["#d9dbf1", "#22274f"],
      gridSection: ["#bfc2e3", "#353b6e"],
      glass: ["#282d5d", "#e7e9fe"],
      shadow: "#1f2350",
      sky: "#ffffff",
      groundLight: "#cfd2ee",
    },
  },
};

export const brand: Brand = brands[BRAND_ID];
