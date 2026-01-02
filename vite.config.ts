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
        manualChunks: {
          // Vendor chunks
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-ui': ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu', '@radix-ui/react-alert-dialog', '@radix-ui/react-select', '@radix-ui/react-popover', '@radix-ui/react-label', '@radix-ui/react-slot'],
          'vendor-data': ['@tanstack/react-query', 'zustand'],
          'vendor-utils': ['zod', 'class-variance-authority', 'clsx', 'tailwind-merge'],
          'vendor-supabase': ['@supabase/supabase-js'],
          // Feature chunks - lazy load heavy features
          'pages-residents': ['./src/pages/Residents.tsx', './src/pages/ResidentForm.tsx', './src/pages/ResidentDetail.tsx', './src/pages/ResidentEdit.tsx'],
          'pages-admin': ['./src/pages/Settings.tsx'],
          'pages-documents': ['./src/pages/Documents.tsx'],
          'pages-payments': ['./src/pages/Payments.tsx'],
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
