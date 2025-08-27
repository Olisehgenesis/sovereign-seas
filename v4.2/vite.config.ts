import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'
import tailwindcss from '@tailwindcss/vite'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src')
    }
  },
  base: '/',
  server: {
    allowedHosts: true,
    port: 4173,
    fs: {
      allow: [
        // default allowlist
        './',
        // explicitly allow reading .env from that path
        '/root/live/v2/sovereign-seas/v4.2'
      ]
    },
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    }
  },
  preview: {
    allowedHosts: true,
    port: 5173
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react')) return 'react-vendor';
            if (id.includes('lucide-react')) return 'lucide-vendor';
            if (id.includes('wagmi')) return 'wagmi-vendor';
            if (id.includes('lottie-web')) return 'lottie-vendor';
            if (id.includes('qrcode.react')) return 'qrcode-vendor';
            if (id.includes('react-qr-code')) return 'react-qr-code-vendor';
            if (id.includes('react-qr-reader')) return 'react-qr-reader-vendor';
            if (id.includes('react-qr-scanner')) return 'react-qr-scanner-vendor';
            if (id.includes('react-qr-scanner')) return 'react-qr-scanner-vendor';
            return 'vendor';
          }
        }
      }
    },
    chunkSizeWarningLimit: 1000 // (Optional) Increase warning limit to 1000kB
  }
})
