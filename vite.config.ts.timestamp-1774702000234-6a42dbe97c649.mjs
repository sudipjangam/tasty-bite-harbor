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
    const manifestPath = path.resolve(__vite_injected_original_dirname, "public/manifest.json");
    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
    manifest.version = APP_VERSION;
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
    console.log(`[Build] Updated manifest.json with version ${APP_VERSION}`);
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
          target: "https://tasty-bite-harbor.vercel.app",
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
            "utils-vendor": ["date-fns", "clsx", "tailwind-merge"]
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
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJHOlxcXFxyZXN0YXVyYW50XFxcXFN1ZGlwXFxcXHRhc3R5LWJpdGUtaGFyYm9yXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCJHOlxcXFxyZXN0YXVyYW50XFxcXFN1ZGlwXFxcXHRhc3R5LWJpdGUtaGFyYm9yXFxcXHZpdGUuY29uZmlnLnRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9HOi9yZXN0YXVyYW50L1N1ZGlwL3Rhc3R5LWJpdGUtaGFyYm9yL3ZpdGUuY29uZmlnLnRzXCI7XHJcbmltcG9ydCB7IGRlZmluZUNvbmZpZyB9IGZyb20gXCJ2aXRlXCI7XHJcbmltcG9ydCByZWFjdCBmcm9tIFwiQHZpdGVqcy9wbHVnaW4tcmVhY3Qtc3djXCI7XHJcbmltcG9ydCBwYXRoIGZyb20gXCJwYXRoXCI7XHJcbmltcG9ydCB7IGNvbXBvbmVudFRhZ2dlciB9IGZyb20gXCJsb3ZhYmxlLXRhZ2dlclwiO1xyXG5pbXBvcnQgZnMgZnJvbSBcImZzXCI7XHJcblxyXG4vLyBSZWFkIHZlcnNpb24gZnJvbSBwYWNrYWdlLmpzb25cclxuY29uc3QgcGFja2FnZUpzb24gPSBKU09OLnBhcnNlKGZzLnJlYWRGaWxlU3luYyhwYXRoLnJlc29sdmUoX19kaXJuYW1lLCAncGFja2FnZS5qc29uJyksICd1dGYtOCcpKTtcclxuY29uc3QgQVBQX1ZFUlNJT04gPSBwYWNrYWdlSnNvbi52ZXJzaW9uO1xyXG5cclxuLy8gR2VuZXJhdGUgYnVpbGQgdGltZXN0YW1wIGZvciBzZXJ2aWNlIHdvcmtlciBjYWNoZSBidXN0aW5nXHJcbmNvbnN0IEJVSUxEX1RJTUVTVEFNUCA9IERhdGUubm93KCkudG9TdHJpbmcoKTtcclxuXHJcbi8vIGh0dHBzOi8vdml0ZWpzLmRldi9jb25maWcvXHJcbmV4cG9ydCBkZWZhdWx0IGRlZmluZUNvbmZpZygoeyBtb2RlIH0pID0+IHtcclxuICAvLyBVcGRhdGUgc2VydmljZSB3b3JrZXIgYW5kIGdlbmVyYXRlIHZlcnNpb24gZmlsZXMgb24gYnVpbGRcclxuICBpZiAobW9kZSA9PT0gJ3Byb2R1Y3Rpb24nKSB7XHJcbiAgICAvLyBVcGRhdGUgc2VydmljZSB3b3JrZXIgd2l0aCBidWlsZCB0aW1lc3RhbXBcclxuICAgIGNvbnN0IHN3UGF0aCA9IHBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsICdwdWJsaWMvc3cuanMnKTtcclxuICAgIGxldCBzd0NvbnRlbnQgPSBmcy5yZWFkRmlsZVN5bmMoc3dQYXRoLCAndXRmLTgnKTtcclxuICAgIHN3Q29udGVudCA9IHN3Q29udGVudC5yZXBsYWNlKCdfX0JVSUxEX1RJTUVTVEFNUF9fJywgQlVJTERfVElNRVNUQU1QKTtcclxuICAgIGZzLndyaXRlRmlsZVN5bmMoc3dQYXRoLCBzd0NvbnRlbnQpO1xyXG4gICAgY29uc29sZS5sb2coYFtCdWlsZF0gU2VydmljZSBXb3JrZXIgY2FjaGUgdmVyc2lvbjogc3dhZGVzaGktJHtCVUlMRF9USU1FU1RBTVB9YCk7XHJcblxyXG4gICAgLy8gR2VuZXJhdGUgdmVyc2lvbi5qc29uIGZvciBydW50aW1lIHZlcnNpb24gY2hlY2tpbmdcclxuICAgIGNvbnN0IHZlcnNpb25JbmZvID0ge1xyXG4gICAgICB2ZXJzaW9uOiBBUFBfVkVSU0lPTixcclxuICAgICAgYnVpbGRUaW1lc3RhbXA6IEJVSUxEX1RJTUVTVEFNUCxcclxuICAgICAgYnVpbGREYXRlOiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKClcclxuICAgIH07XHJcbiAgICBmcy53cml0ZUZpbGVTeW5jKFxyXG4gICAgICBwYXRoLnJlc29sdmUoX19kaXJuYW1lLCAncHVibGljL3ZlcnNpb24uanNvbicpLFxyXG4gICAgICBKU09OLnN0cmluZ2lmeSh2ZXJzaW9uSW5mbywgbnVsbCwgMilcclxuICAgICk7XHJcbiAgICBjb25zb2xlLmxvZyhgW0J1aWxkXSBBcHAgdmVyc2lvbjogJHtBUFBfVkVSU0lPTn1gKTtcclxuXHJcbiAgICAvLyBVcGRhdGUgbWFuaWZlc3QuanNvbiB3aXRoIGN1cnJlbnQgdmVyc2lvblxyXG4gICAgY29uc3QgbWFuaWZlc3RQYXRoID0gcGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJ3B1YmxpYy9tYW5pZmVzdC5qc29uJyk7XHJcbiAgICBjb25zdCBtYW5pZmVzdCA9IEpTT04ucGFyc2UoZnMucmVhZEZpbGVTeW5jKG1hbmlmZXN0UGF0aCwgJ3V0Zi04JykpO1xyXG4gICAgbWFuaWZlc3QudmVyc2lvbiA9IEFQUF9WRVJTSU9OO1xyXG4gICAgZnMud3JpdGVGaWxlU3luYyhtYW5pZmVzdFBhdGgsIEpTT04uc3RyaW5naWZ5KG1hbmlmZXN0LCBudWxsLCAyKSk7XHJcbiAgICBjb25zb2xlLmxvZyhgW0J1aWxkXSBVcGRhdGVkIG1hbmlmZXN0Lmpzb24gd2l0aCB2ZXJzaW9uICR7QVBQX1ZFUlNJT059YCk7XHJcbiAgfVxyXG5cclxuICByZXR1cm4ge1xyXG4gIGRlZmluZToge1xyXG4gICAgX19BUFBfVkVSU0lPTl9fOiBKU09OLnN0cmluZ2lmeShBUFBfVkVSU0lPTiksXHJcbiAgfSxcclxuICBzZXJ2ZXI6IHtcclxuICAgIGhvc3Q6IFwiOjpcIixcclxuICAgIHBvcnQ6IDgwODAsXHJcbiAgICBwcm94eToge1xyXG4gICAgICAvLyBQcm94eSAvYXBpL3N1cGFiYXNlIHRvIHRoZSByZWFsIFN1cGFiYXNlIFVSTCBkdXJpbmcgbG9jYWwgZGV2ZWxvcG1lbnQuXHJcbiAgICAgIC8vIEluIHByb2R1Y3Rpb24sIFZlcmNlbC9OZXRsaWZ5IHJld3JpdGVzIGhhbmRsZSB0aGlzIGluc3RlYWQuXHJcbiAgICAgIC8vIFRoaXMgYnlwYXNzZXMgSmlvIGFuZCBvdGhlciBJU1AgYmxvY2tzIG9uICouc3VwYWJhc2UuY28gZG9tYWlucy5cclxuICAgICAgJy9hcGkvc3VwYWJhc2UnOiB7XHJcbiAgICAgICAgdGFyZ2V0OiAnaHR0cHM6Ly90YXN0eS1iaXRlLWhhcmJvci52ZXJjZWwuYXBwJyxcclxuICAgICAgICBjaGFuZ2VPcmlnaW46IHRydWUsXHJcbiAgICAgICAgLy8gV2hlbiBwcm94eWluZyB0byBWZXJjZWwsIHdlIGFjdHVhbGx5IERPTidUIHdhbnQgdG8gcmV3cml0ZSB0aGUgcGF0aCBcclxuICAgICAgICAvLyBiZWNhdXNlIFZlcmNlbCBoYW5kbGVzIHRoZSAvYXBpL3N1cGFiYXNlIC0+IHJlYWwgc3VwYWJhc2Ugcm91dGluZy5cclxuICAgICAgICAvLyBXZSBqdXN0IHdhbnQgdG8gZm9yd2FyZCB0aGUgcmVxdWVzdCBhcy1pcyB0byB0aGUgVmVyY2VsIGFwcC5cclxuICAgICAgICBzZWN1cmU6IHRydWUsXHJcbiAgICAgICAgY29uZmlndXJlOiAocHJveHk6IGFueSkgPT4ge1xyXG4gICAgICAgICAgcHJveHkub24oJ2Vycm9yJywgKGVycjogYW55KSA9PiB7XHJcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ1tQcm94eSBFcnJvcl0nLCBlcnIubWVzc2FnZSk7XHJcbiAgICAgICAgICB9KTtcclxuICAgICAgICB9LFxyXG4gICAgICB9LFxyXG4gICAgfSxcclxuICB9LFxyXG4gIHBsdWdpbnM6IFtcclxuICAgIHJlYWN0KCksXHJcbiAgICBtb2RlID09PSAnZGV2ZWxvcG1lbnQnICYmXHJcbiAgICBjb21wb25lbnRUYWdnZXIoKSxcclxuICBdLmZpbHRlcihCb29sZWFuKSxcclxuICByZXNvbHZlOiB7XHJcbiAgICBhbGlhczoge1xyXG4gICAgICBcIkBcIjogcGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgXCIuL3NyY1wiKSxcclxuICAgIH0sXHJcbiAgfSxcclxuICBidWlsZDoge1xyXG4gICAgc291cmNlbWFwOiB0cnVlLFxyXG4gICAgcm9sbHVwT3B0aW9uczoge1xyXG4gICAgICBvdXRwdXQ6IHtcclxuICAgICAgICBtYW51YWxDaHVua3M6IHtcclxuICAgICAgICAgIC8vIFZlbmRvciBjaHVua3MgLSBzcGxpdCBsYXJnZSBkZXBlbmRlbmNpZXNcclxuICAgICAgICAgICdyZWFjdC12ZW5kb3InOiBbJ3JlYWN0JywgJ3JlYWN0LWRvbScsICdyZWFjdC1yb3V0ZXItZG9tJ10sXHJcbiAgICAgICAgICAndWktdmVuZG9yJzogW1xyXG4gICAgICAgICAgICAnQHJhZGl4LXVpL3JlYWN0LWRpYWxvZycsXHJcbiAgICAgICAgICAgICdAcmFkaXgtdWkvcmVhY3QtZHJvcGRvd24tbWVudScsXHJcbiAgICAgICAgICAgICdAcmFkaXgtdWkvcmVhY3QtdGFicycsXHJcbiAgICAgICAgICAgICdAcmFkaXgtdWkvcmVhY3Qtc2VsZWN0JyxcclxuICAgICAgICAgICAgJ0ByYWRpeC11aS9yZWFjdC10b2FzdCcsXHJcbiAgICAgICAgICBdLFxyXG4gICAgICAgICAgJ2RhdGEtdmVuZG9yJzogWydAc3VwYWJhc2Uvc3VwYWJhc2UtanMnLCAnQHRhbnN0YWNrL3JlYWN0LXF1ZXJ5J10sXHJcbiAgICAgICAgICAnY2hhcnQtdmVuZG9yJzogWydyZWNoYXJ0cycsICdoaWdoY2hhcnRzJywgJ2hpZ2hjaGFydHMtcmVhY3Qtb2ZmaWNpYWwnXSxcclxuICAgICAgICAgICdmb3JtLXZlbmRvcic6IFsncmVhY3QtaG9vay1mb3JtJywgJ0Bob29rZm9ybS9yZXNvbHZlcnMnLCAnem9kJ10sXHJcbiAgICAgICAgICAndXRpbHMtdmVuZG9yJzogWydkYXRlLWZucycsICdjbHN4JywgJ3RhaWx3aW5kLW1lcmdlJ10sXHJcbiAgICAgICAgfSxcclxuICAgICAgfSxcclxuICAgIH0sXHJcbiAgfSxcclxuXHJcbiAgdGVzdDoge1xyXG4gICAgZ2xvYmFsczogdHJ1ZSxcclxuICAgIGVudmlyb25tZW50OiAnanNkb20nLFxyXG4gICAgc2V0dXBGaWxlczogJy4vc3JjL3Rlc3RzL3NldHVwLnRzJyxcclxuICB9LFxyXG59O1xyXG59KTtcclxuIl0sCiAgIm1hcHBpbmdz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
