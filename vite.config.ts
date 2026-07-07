import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: "/JsonSchemaBuilder/",
  plugins: [react()],
  resolve: {
    dedupe: ["react", "react-dom"],
  },
});
