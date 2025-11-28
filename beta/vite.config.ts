import path from "path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      // Proxy Pinata public gateway
      "/pinata-gateway": {
        target: "https://gateway.pinata.cloud",
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/pinata-gateway/, ""),
      },
      // Proxy your dedicated Pinata gateway
      "/pinata-magenta": {
        target: "https://magenta-important-pheasant-264.mypinata.cloud",
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/pinata-magenta/, ""),
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  define: {
    global: 'globalThis',
  },
  optimizeDeps: {
    include: ['buffer'],
  },
})