
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import fs from "fs";

// Read version from package.json
const packageJson = JSON.parse(fs.readFileSync(path.resolve(__dirname, 'package.json'), 'utf-8'));
const APP_VERSION = packageJson.version;

// Generate build timestamp for service worker cache busting
const BUILD_TIMESTAMP = Date.now().toString();

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Update service worker and generate version files on build
  if (mode === 'production') {
    // Update service worker with build timestamp
    const swPath = path.resolve(__dirname, 'public/sw.js');
    let swContent = fs.readFileSync(swPath, 'utf-8');
    swContent = swContent.replace('__BUILD_TIMESTAMP__', BUILD_TIMESTAMP);
    fs.writeFileSync(swPath, swContent);
    console.log(`[Build] Service Worker cache version: swadeshi-${BUILD_TIMESTAMP}`);

    // Generate version.json for runtime version checking
    const versionInfo = {
      version: APP_VERSION,
      buildTimestamp: BUILD_TIMESTAMP,
      buildDate: new Date().toISOString()
    };
    fs.writeFileSync(
      path.resolve(__dirname, 'public/version.json'),
      JSON.stringify(versionInfo, null, 2)
    );
    console.log(`[Build] App version: ${APP_VERSION}`);

    // Update manifest.json with current version
    const manifestPath = path.resolve(__dirname, 'public/manifest.json');
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
    manifest.version = APP_VERSION;
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
    console.log(`[Build] Updated manifest.json with version ${APP_VERSION}`);
  }

  return {
  define: {
    __APP_VERSION__: JSON.stringify(APP_VERSION),
  },
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
