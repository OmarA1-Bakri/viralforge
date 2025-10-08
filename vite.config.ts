import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, process.cwd(), '');

  // Generate unique build ID for cache busting
  const buildId = Date.now().toString();

  return {
    plugins: [
      react(),
    ],
    // Expose environment variables to the client
    define: {
      'import.meta.env.VITE_API_URL': JSON.stringify(env.VITE_API_URL),
      'import.meta.env.VITE_API_BASE_URL': JSON.stringify(env.VITE_API_BASE_URL),
      'import.meta.env.VITE_PUBLIC_POSTHOG_KEY': JSON.stringify(env.VITE_PUBLIC_POSTHOG_KEY),
      'import.meta.env.VITE_PUBLIC_POSTHOG_HOST': JSON.stringify(env.VITE_PUBLIC_POSTHOG_HOST),
      'import.meta.env.VITE_REVENUECAT_API_KEY': JSON.stringify(env.VITE_REVENUECAT_API_KEY),
      'import.meta.env.VITE_BUILD_ID': JSON.stringify(buildId),
    },
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
    },
    dedupe: ['react', 'react-dom'],
  },
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
    rollupOptions: {
      output: {
        // Force new hash on every build to prevent cache issues
        entryFileNames: `assets/[name]-[hash]-${buildId}.js`,
        chunkFileNames: `assets/[name]-[hash]-${buildId}.js`,
        assetFileNames: `assets/[name]-[hash]-${buildId}.[ext]`
      }
    }
  },

    server: {
      hmr: {
        overlay: false, // Disable error overlay that crashes tsx watch
        timeout: 5000,
      },
      watch: {
        // Prevent Vite from crashing when files change during long requests
        ignored: ['**/node_modules/**', '**/.git/**'],
        usePolling: false,
      },
      fs: {
        strict: true,
        deny: ["**/.*"],
      },
    },
  };
});
