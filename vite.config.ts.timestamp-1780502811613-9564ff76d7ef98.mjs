// vite.config.ts
import { defineConfig } from "file:///G:/restaurant/Sudip/tasty-bite-harbor/node_modules/vite/dist/node/index.js";
import react from "file:///G:/restaurant/Sudip/tasty-bite-harbor/node_modules/@vitejs/plugin-react-swc/index.mjs";
import path from "path";
import { componentTagger } from "file:///G:/restaurant/Sudip/tasty-bite-harbor/node_modules/lovable-tagger/dist/index.js";
import fs from "fs";
var __vite_injected_original_dirname = "G:\\restaurant\\Sudip\\tasty-bite-harbor";
var packageJson = JSON.parse(fs.readFileSync(path.resolve(__vite_injected_original_dirname, "package.json"), "utf-8"));
var APP_VERSION = packageJson.version;
var BUILD_TIMESTAMP = Date.now().toString();
var vite_config_default = defineConfig(({ mode }) => {
  if (mode === "production") {
    const swPath = path.resolve(__vite_injected_original_dirname, "public/sw.js");
    let swContent = fs.readFileSync(swPath, "utf-8");
    swContent = swContent.replace("__BUILD_TIMESTAMP__", BUILD_TIMESTAMP);
    fs.writeFileSync(swPath, swContent);
    console.log(`[Build] Service Worker cache version: swadeshi-${BUILD_TIMESTAMP}`);
    const versionInfo = {
      version: APP_VERSION,
      buildTimestamp: BUILD_TIMESTAMP,
      buildDate: (/* @__PURE__ */ new Date()).toISOString()
    };
    fs.writeFileSync(
      path.resolve(__vite_injected_original_dirname, "public/version.json"),
      JSON.stringify(versionInfo, null, 2)
    );
    console.log(`[Build] App version: ${APP_VERSION}`);
    console.log(`[Build] App version: ${APP_VERSION} (tracked in version.json)`);
  }
  return {
    define: {
      __APP_VERSION__: JSON.stringify(APP_VERSION)
    },
    server: {
      host: "::",
      port: 8080,
      proxy: {
        // Proxy /api/supabase to the real Supabase URL during local development.
        // In production, Vercel/Netlify rewrites handle this instead.
        // This bypasses Jio and other ISP blocks on *.supabase.co domains.
        "/api/supabase": {
          target: "https://swadeshisolutions.co.in",
          changeOrigin: true,
          // When proxying to Vercel, we actually DON'T want to rewrite the path 
          // because Vercel handles the /api/supabase -> real supabase routing.
          // We just want to forward the request as-is to the Vercel app.
          secure: true,
          configure: (proxy) => {
            proxy.on("error", (err) => {
              console.error("[Proxy Error]", err.message);
            });
          }
        }
      }
    },
    plugins: [
      react(),
      mode === "development" && componentTagger()
    ].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__vite_injected_original_dirname, "./src")
      }
    },
    build: {
      sourcemap: true,
      chunkSizeWarningLimit: 1500,
      // Suppress warnings for expected large vendor chunks like pdf/excel utils
      rollupOptions: {
        output: {
          manualChunks: {
            // Vendor chunks - split large dependencies
            "react-vendor": ["react", "react-dom", "react-router-dom"],
            "ui-vendor": [
              "@radix-ui/react-dialog",
              "@radix-ui/react-dropdown-menu",
              "@radix-ui/react-tabs",
              "@radix-ui/react-select",
              "@radix-ui/react-toast"
            ],
            "data-vendor": ["@supabase/supabase-js", "@tanstack/react-query"],
            "chart-vendor": ["recharts", "highcharts", "highcharts-react-official"],
            "form-vendor": ["react-hook-form", "@hookform/resolvers", "zod"],
            "utils-vendor": ["date-fns", "clsx", "tailwind-merge"],
            "pdf-vendor": ["jspdf", "html2canvas", "html2pdf.js"],
            "excel-vendor": ["xlsx", "exceljs"],
            "icon-vendor": ["lucide-react"]
          }
        }
      }
    },
    test: {
      globals: true,
      environment: "jsdom",
      setupFiles: "./src/tests/setup.ts"
    }
  };
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJHOlxcXFxyZXN0YXVyYW50XFxcXFN1ZGlwXFxcXHRhc3R5LWJpdGUtaGFyYm9yXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCJHOlxcXFxyZXN0YXVyYW50XFxcXFN1ZGlwXFxcXHRhc3R5LWJpdGUtaGFyYm9yXFxcXHZpdGUuY29uZmlnLnRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9HOi9yZXN0YXVyYW50L1N1ZGlwL3Rhc3R5LWJpdGUtaGFyYm9yL3ZpdGUuY29uZmlnLnRzXCI7XHJcbmltcG9ydCB7IGRlZmluZUNvbmZpZyB9IGZyb20gXCJ2aXRlXCI7XHJcbmltcG9ydCByZWFjdCBmcm9tIFwiQHZpdGVqcy9wbHVnaW4tcmVhY3Qtc3djXCI7XHJcbmltcG9ydCBwYXRoIGZyb20gXCJwYXRoXCI7XHJcbmltcG9ydCB7IGNvbXBvbmVudFRhZ2dlciB9IGZyb20gXCJsb3ZhYmxlLXRhZ2dlclwiO1xyXG5pbXBvcnQgZnMgZnJvbSBcImZzXCI7XHJcblxyXG4vLyBSZWFkIHZlcnNpb24gZnJvbSBwYWNrYWdlLmpzb25cclxuY29uc3QgcGFja2FnZUpzb24gPSBKU09OLnBhcnNlKGZzLnJlYWRGaWxlU3luYyhwYXRoLnJlc29sdmUoX19kaXJuYW1lLCAncGFja2FnZS5qc29uJyksICd1dGYtOCcpKTtcclxuY29uc3QgQVBQX1ZFUlNJT04gPSBwYWNrYWdlSnNvbi52ZXJzaW9uO1xyXG5cclxuLy8gR2VuZXJhdGUgYnVpbGQgdGltZXN0YW1wIGZvciBzZXJ2aWNlIHdvcmtlciBjYWNoZSBidXN0aW5nXHJcbmNvbnN0IEJVSUxEX1RJTUVTVEFNUCA9IERhdGUubm93KCkudG9TdHJpbmcoKTtcclxuXHJcbi8vIGh0dHBzOi8vdml0ZWpzLmRldi9jb25maWcvXHJcbmV4cG9ydCBkZWZhdWx0IGRlZmluZUNvbmZpZygoeyBtb2RlIH0pID0+IHtcclxuICAvLyBVcGRhdGUgc2VydmljZSB3b3JrZXIgYW5kIGdlbmVyYXRlIHZlcnNpb24gZmlsZXMgb24gYnVpbGRcclxuICBpZiAobW9kZSA9PT0gJ3Byb2R1Y3Rpb24nKSB7XHJcbiAgICAvLyBVcGRhdGUgc2VydmljZSB3b3JrZXIgd2l0aCBidWlsZCB0aW1lc3RhbXBcclxuICAgIGNvbnN0IHN3UGF0aCA9IHBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsICdwdWJsaWMvc3cuanMnKTtcclxuICAgIGxldCBzd0NvbnRlbnQgPSBmcy5yZWFkRmlsZVN5bmMoc3dQYXRoLCAndXRmLTgnKTtcclxuICAgIHN3Q29udGVudCA9IHN3Q29udGVudC5yZXBsYWNlKCdfX0JVSUxEX1RJTUVTVEFNUF9fJywgQlVJTERfVElNRVNUQU1QKTtcclxuICAgIGZzLndyaXRlRmlsZVN5bmMoc3dQYXRoLCBzd0NvbnRlbnQpO1xyXG4gICAgY29uc29sZS5sb2coYFtCdWlsZF0gU2VydmljZSBXb3JrZXIgY2FjaGUgdmVyc2lvbjogc3dhZGVzaGktJHtCVUlMRF9USU1FU1RBTVB9YCk7XHJcblxyXG4gICAgLy8gR2VuZXJhdGUgdmVyc2lvbi5qc29uIGZvciBydW50aW1lIHZlcnNpb24gY2hlY2tpbmdcclxuICAgIGNvbnN0IHZlcnNpb25JbmZvID0ge1xyXG4gICAgICB2ZXJzaW9uOiBBUFBfVkVSU0lPTixcclxuICAgICAgYnVpbGRUaW1lc3RhbXA6IEJVSUxEX1RJTUVTVEFNUCxcclxuICAgICAgYnVpbGREYXRlOiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKClcclxuICAgIH07XHJcbiAgICBmcy53cml0ZUZpbGVTeW5jKFxyXG4gICAgICBwYXRoLnJlc29sdmUoX19kaXJuYW1lLCAncHVibGljL3ZlcnNpb24uanNvbicpLFxyXG4gICAgICBKU09OLnN0cmluZ2lmeSh2ZXJzaW9uSW5mbywgbnVsbCwgMilcclxuICAgICk7XHJcbiAgICBjb25zb2xlLmxvZyhgW0J1aWxkXSBBcHAgdmVyc2lvbjogJHtBUFBfVkVSU0lPTn1gKTtcclxuXHJcbiAgICBjb25zb2xlLmxvZyhgW0J1aWxkXSBBcHAgdmVyc2lvbjogJHtBUFBfVkVSU0lPTn0gKHRyYWNrZWQgaW4gdmVyc2lvbi5qc29uKWApO1xyXG4gIH1cclxuXHJcbiAgcmV0dXJuIHtcclxuICBkZWZpbmU6IHtcclxuICAgIF9fQVBQX1ZFUlNJT05fXzogSlNPTi5zdHJpbmdpZnkoQVBQX1ZFUlNJT04pLFxyXG4gIH0sXHJcbiAgc2VydmVyOiB7XHJcbiAgICBob3N0OiBcIjo6XCIsXHJcbiAgICBwb3J0OiA4MDgwLFxyXG4gICAgcHJveHk6IHtcclxuICAgICAgLy8gUHJveHkgL2FwaS9zdXBhYmFzZSB0byB0aGUgcmVhbCBTdXBhYmFzZSBVUkwgZHVyaW5nIGxvY2FsIGRldmVsb3BtZW50LlxyXG4gICAgICAvLyBJbiBwcm9kdWN0aW9uLCBWZXJjZWwvTmV0bGlmeSByZXdyaXRlcyBoYW5kbGUgdGhpcyBpbnN0ZWFkLlxyXG4gICAgICAvLyBUaGlzIGJ5cGFzc2VzIEppbyBhbmQgb3RoZXIgSVNQIGJsb2NrcyBvbiAqLnN1cGFiYXNlLmNvIGRvbWFpbnMuXHJcbiAgICAgICcvYXBpL3N1cGFiYXNlJzoge1xyXG4gICAgICAgIHRhcmdldDogJ2h0dHBzOi8vc3dhZGVzaGlzb2x1dGlvbnMuY28uaW4nLFxyXG4gICAgICAgIGNoYW5nZU9yaWdpbjogdHJ1ZSxcclxuICAgICAgICAvLyBXaGVuIHByb3h5aW5nIHRvIFZlcmNlbCwgd2UgYWN0dWFsbHkgRE9OJ1Qgd2FudCB0byByZXdyaXRlIHRoZSBwYXRoIFxyXG4gICAgICAgIC8vIGJlY2F1c2UgVmVyY2VsIGhhbmRsZXMgdGhlIC9hcGkvc3VwYWJhc2UgLT4gcmVhbCBzdXBhYmFzZSByb3V0aW5nLlxyXG4gICAgICAgIC8vIFdlIGp1c3Qgd2FudCB0byBmb3J3YXJkIHRoZSByZXF1ZXN0IGFzLWlzIHRvIHRoZSBWZXJjZWwgYXBwLlxyXG4gICAgICAgIHNlY3VyZTogdHJ1ZSxcclxuICAgICAgICBjb25maWd1cmU6IChwcm94eTogYW55KSA9PiB7XHJcbiAgICAgICAgICBwcm94eS5vbignZXJyb3InLCAoZXJyOiBhbnkpID0+IHtcclxuICAgICAgICAgICAgY29uc29sZS5lcnJvcignW1Byb3h5IEVycm9yXScsIGVyci5tZXNzYWdlKTtcclxuICAgICAgICAgIH0pO1xyXG4gICAgICAgIH0sXHJcbiAgICAgIH0sXHJcbiAgICB9LFxyXG4gIH0sXHJcbiAgcGx1Z2luczogW1xyXG4gICAgcmVhY3QoKSxcclxuICAgIG1vZGUgPT09ICdkZXZlbG9wbWVudCcgJiZcclxuICAgIGNvbXBvbmVudFRhZ2dlcigpLFxyXG4gIF0uZmlsdGVyKEJvb2xlYW4pLFxyXG4gIHJlc29sdmU6IHtcclxuICAgIGFsaWFzOiB7XHJcbiAgICAgIFwiQFwiOiBwYXRoLnJlc29sdmUoX19kaXJuYW1lLCBcIi4vc3JjXCIpLFxyXG4gICAgfSxcclxuICB9LFxyXG4gIGJ1aWxkOiB7XHJcbiAgICBzb3VyY2VtYXA6IHRydWUsXHJcbiAgICBjaHVua1NpemVXYXJuaW5nTGltaXQ6IDE1MDAsIC8vIFN1cHByZXNzIHdhcm5pbmdzIGZvciBleHBlY3RlZCBsYXJnZSB2ZW5kb3IgY2h1bmtzIGxpa2UgcGRmL2V4Y2VsIHV0aWxzXHJcbiAgICByb2xsdXBPcHRpb25zOiB7XHJcbiAgICAgIG91dHB1dDoge1xyXG4gICAgICAgIG1hbnVhbENodW5rczoge1xyXG4gICAgICAgICAgLy8gVmVuZG9yIGNodW5rcyAtIHNwbGl0IGxhcmdlIGRlcGVuZGVuY2llc1xyXG4gICAgICAgICAgJ3JlYWN0LXZlbmRvcic6IFsncmVhY3QnLCAncmVhY3QtZG9tJywgJ3JlYWN0LXJvdXRlci1kb20nXSxcclxuICAgICAgICAgICd1aS12ZW5kb3InOiBbXHJcbiAgICAgICAgICAgICdAcmFkaXgtdWkvcmVhY3QtZGlhbG9nJyxcclxuICAgICAgICAgICAgJ0ByYWRpeC11aS9yZWFjdC1kcm9wZG93bi1tZW51JyxcclxuICAgICAgICAgICAgJ0ByYWRpeC11aS9yZWFjdC10YWJzJyxcclxuICAgICAgICAgICAgJ0ByYWRpeC11aS9yZWFjdC1zZWxlY3QnLFxyXG4gICAgICAgICAgICAnQHJhZGl4LXVpL3JlYWN0LXRvYXN0JyxcclxuICAgICAgICAgIF0sXHJcbiAgICAgICAgICAnZGF0YS12ZW5kb3InOiBbJ0BzdXBhYmFzZS9zdXBhYmFzZS1qcycsICdAdGFuc3RhY2svcmVhY3QtcXVlcnknXSxcclxuICAgICAgICAgICdjaGFydC12ZW5kb3InOiBbJ3JlY2hhcnRzJywgJ2hpZ2hjaGFydHMnLCAnaGlnaGNoYXJ0cy1yZWFjdC1vZmZpY2lhbCddLFxyXG4gICAgICAgICAgJ2Zvcm0tdmVuZG9yJzogWydyZWFjdC1ob29rLWZvcm0nLCAnQGhvb2tmb3JtL3Jlc29sdmVycycsICd6b2QnXSxcclxuICAgICAgICAgICd1dGlscy12ZW5kb3InOiBbJ2RhdGUtZm5zJywgJ2Nsc3gnLCAndGFpbHdpbmQtbWVyZ2UnXSxcclxuICAgICAgICAgICdwZGYtdmVuZG9yJzogWydqc3BkZicsICdodG1sMmNhbnZhcycsICdodG1sMnBkZi5qcyddLFxyXG4gICAgICAgICAgJ2V4Y2VsLXZlbmRvcic6IFsneGxzeCcsICdleGNlbGpzJ10sXHJcbiAgICAgICAgICAnaWNvbi12ZW5kb3InOiBbJ2x1Y2lkZS1yZWFjdCddLFxyXG4gICAgICAgIH0sXHJcbiAgICAgIH0sXHJcbiAgICB9LFxyXG4gIH0sXHJcblxyXG4gIHRlc3Q6IHtcclxuICAgIGdsb2JhbHM6IHRydWUsXHJcbiAgICBlbnZpcm9ubWVudDogJ2pzZG9tJyxcclxuICAgIHNldHVwRmlsZXM6ICcuL3NyYy90ZXN0cy9zZXR1cC50cycsXHJcbiAgfSxcclxufTtcclxufSk7XHJcbiJdLAogICJtYXBwaW5ncyI6ICI7QUFDQSxTQUFTLG9CQUFvQjtBQUM3QixPQUFPLFdBQVc7QUFDbEIs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
