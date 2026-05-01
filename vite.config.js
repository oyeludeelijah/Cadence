import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      // Proxies /nvidia-api/* → https://integrate.api.nvidia.com/v1/*
      // This runs in Node.js (server-side), so CORS is never an issue.
      '/nvidia-api': {
        target: 'https://integrate.api.nvidia.com/v1',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/nvidia-api/, ''),
        secure: true,
      },
    },
  },
})
