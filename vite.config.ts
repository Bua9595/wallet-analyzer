import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Nutze relative Pfade im Build, damit dist/ auch als Datei geöffnet werden kann
  base: './',
  // Dev-Proxy zu Covalent, um CORS/Extensions zu umgehen
  server: {
    proxy: {
      '/covalent': {
        target: 'https://api.covalenthq.com',
        changeOrigin: true,
        secure: true,
        rewrite: (p) => p.replace(/^\/covalent/, ''),
      },
    },
  },
})

