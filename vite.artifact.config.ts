import { defineConfig, mergeConfig } from "vite";
import base from "./vite.config";

// Build used for the hosted preview: relative paths, a single JS bundle.
export default mergeConfig(
  base,
  defineConfig({
    base: "./",
    define: { "import.meta.env.VITE_ARTIFACT": JSON.stringify("1") },
    build: {
      outDir: "dist-artifact",
      rollupOptions: { output: { inlineDynamicImports: true } },
    },
  }),
);
