
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import fs from "fs";

// Generate build timestamp for service worker cache busting
const BUILD_TIMESTAMP = Date.now().toString();

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Update service worker with build timestamp on build
  if (mode === 'production') {
    const swPath = path.resolve(__dirname, 'public/sw.js');
    let swContent = fs.readFileSync(swPath, 'utf-8');
    swContent = swContent.replace('__BUILD_TIMESTAMP__', BUILD_TIMESTAMP);
    fs.writeFileSync(swPath, swContent);
    console.log(`[Build] Service Worker cache version: swadeshi-${BUILD_TIMESTAMP}`);
  }

  return {
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === 'development' &&
    componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor chunks - split large dependencies
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'ui-vendor': [
            '@radix-ui/react-dialog',
            '@radix-ui/react-dropdown-menu',
            '@radix-ui/react-tabs',
            '@radix-ui/react-select',
            '@radix-ui/react-toast',
          ],
          'data-vendor': ['@supabase/supabase-js', '@tanstack/react-query'],
          'chart-vendor': ['recharts', 'highcharts', 'highcharts-react-official'],
          'form-vendor': ['react-hook-form', '@hookform/resolvers', 'zod'],
          'utils-vendor': ['date-fns', 'clsx', 'tailwind-merge'],
        },
      },
    },
  },

  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/tests/setup.ts',
  },
};
});
