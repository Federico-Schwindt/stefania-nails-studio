import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// GitHub Pages sirve el sitio en /stefania-nails-studio/. En local usamos la raíz.
const base = process.env.VITE_BASE ?? (process.env.GITHUB_ACTIONS ? '/stefania-nails-studio/' : '/')

export default defineConfig({
  base,
  plugins: [react(), tailwindcss()],
  build: {
    chunkSizeWarningLimit: 1600,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/three') || id.includes('@react-three')) return 'three'
          if (id.includes('@supabase')) return 'supabase'
        },
      },
    },
  },
})
