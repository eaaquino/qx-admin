import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5175, // qx-admin runs on port 5174
    open: true, // automatically open browser
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Split vendor libraries into separate chunks
          'react-vendor': ['react', 'react-dom', 'react-router'],
          'antd-vendor': ['antd', '@ant-design/icons'],
          'refine-vendor': [
            '@refinedev/core',
            '@refinedev/antd',
            '@refinedev/react-router',
            '@refinedev/supabase',
            '@refinedev/kbar',
          ],
          'charts-vendor': ['recharts'],
          'editor-vendor': ['@uiw/react-md-editor'],
        },
      },
    },
    chunkSizeWarningLimit: 600, // Increase limit slightly for vendor chunks
    sourcemap: false, // Disable sourcemaps in production for smaller size
  },
});
