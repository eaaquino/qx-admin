import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5175, // qx-admin runs on port 5174
    open: true, // automatically open browser
  },
});
