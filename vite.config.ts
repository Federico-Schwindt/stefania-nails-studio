import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Identificador único de cada build: el sitio lo compara con version.json para
// recargarse solo cuando hay un deploy nuevo (GitHub Pages cachea el HTML 10 minutos).
const BUILD_ID = process.env.GITHUB_SHA?.slice(0, 12) ?? `local-${Date.now()}`

function versionFile(): Plugin {
  return {
    name: 'version-file',
    apply: 'build',
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'version.json', source: JSON.stringify({ build: BUILD_ID }) })
    },
  }
}

// GitHub Pages sirve el sitio en /stefania-nails-studio/. En local usamos la raíz.
const base = process.env.VITE_BASE ?? (process.env.GITHUB_ACTIONS ? '/stefania-nails-studio/' : '/')

export default defineConfig({
  base,
  plugins: [react(), tailwindcss(), versionFile()],
  define: { __BUILD_ID__: JSON.stringify(BUILD_ID) },
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
