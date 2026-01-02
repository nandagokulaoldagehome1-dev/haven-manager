import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // Vendor chunks
          if (id.includes('node_modules')) {
            if (id.includes('@supabase')) return 'vendor-supabase';
            if (id.includes('@radix-ui')) return 'vendor-ui';
            if (id.includes('@tanstack/react-query')) return 'vendor-data';
            if (id.includes('zod') || id.includes('class-variance-authority') || id.includes('clsx') || id.includes('tailwind-merge')) return 'vendor-utils';
            return 'vendor-common';
          }
          // Page chunks
          if (id.includes('/pages/Residents') || id.includes('/pages/ResidentForm') || id.includes('/pages/ResidentDetail') || id.includes('/pages/ResidentEdit')) {
            return 'pages-residents';
          }
          if (id.includes('/pages/Settings')) return 'pages-admin';
          if (id.includes('/pages/Documents')) return 'pages-documents';
          if (id.includes('/pages/Payments')) return 'pages-payments';
        },
      },
    },
    // Minimize CSS and JS
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
    },
    // Split chunks smartly
    chunkSizeWarningLimit: 600,
    reportCompressedSize: false,
  },
}));
