import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    target: "es2022",
    rollupOptions: {
      output: {
        /* Function form on purpose. With the object form React had no chunk of
           its own and Rollup folded it into "three", which made the 1MB 3D
           bundle a blocking static import of the entry: the scenes were never
           really lazy, and one failed request took the whole page down. */
        manualChunks(id) {
          /* Vite's dynamic-import helper must not land in a lazy chunk, or the
             entry statically imports that chunk just to be able to lazy-load. */
          if (id.includes("preload-helper")) return "vendor";
          if (!id.includes("node_modules")) return;
          if (id.includes("@react-three") || /[\\/]three(-stdlib)?[\\/]/.test(id)) return "three";
          if (id.includes("gsap") || id.includes("lenis")) return "motion";
          return "vendor";
        },
      },
    },
  },
});
