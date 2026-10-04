import { defineConfig, mergeConfig } from "vite";
import base from "./vite.config";

// Static preview build: relative paths, one JS bundle, router chosen by PREVIEW_ROUTER (hash | memory).
const router = process.env.PREVIEW_ROUTER ?? "hash";

export default mergeConfig(
  base,
  defineConfig({
    base: "./",
    define: { "import.meta.env.VITE_ROUTER": JSON.stringify(router) },
    build: {
      outDir: "dist-artifact",
      rollupOptions: { output: { inlineDynamicImports: true } },
    },
  }),
);
