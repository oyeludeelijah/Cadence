import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Load all env vars (no prefix filter) so NVIDIA_API_KEY (no VITE_) is available
  // server-side only — it is never inlined into the browser bundle.
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [react()],
    server: {
      port: 4000,
      proxy: {
        // Proxies /nvidia-api/* → https://integrate.api.nvidia.com/v1/*
        // This runs in Node.js (server-side), so CORS is never an issue.
        // Authorization header is added here — the browser never sees the key.
        '/nvidia-api': {
          target: 'https://integrate.api.nvidia.com/v1',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/nvidia-api/, ''),
          secure: true,
          headers: {
            'Authorization': `Bearer ${env.NVIDIA_API_KEY}`,
          },
        },
      },
    },
  }
})
