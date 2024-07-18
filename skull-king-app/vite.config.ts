import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  css: {
    preprocessorOptions: {
      less: {},
    },
  },
  server: {
    port: process.env.PORT ? parseInt(process.env.PORT, 10) : 3000, // Fallback to 3000 if PORT is not specified
  },
});

