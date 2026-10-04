import { defineConfig, mergeConfig } from "vite";
import base from "./vite.config";

// Static preview build: relative paths, one JS bundle, router chosen by PREVIEW_ROUTER (hash | memory).
const router = process.env.PREVIEW_ROUTER ?? "hash";
const brandId = process.env.PREVIEW_BRAND ?? "bailly";

export default mergeConfig(
  base,
  defineConfig({
    base: "./",
    define: { "import.meta.env.VITE_ROUTER": JSON.stringify(router), "import.meta.env.VITE_BRAND": JSON.stringify(brandId) },
    build: {
      outDir: "dist-artifact",
      rollupOptions: { output: { inlineDynamicImports: true } },
    },
  }),
);
