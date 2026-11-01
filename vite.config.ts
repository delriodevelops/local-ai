import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const page = (path: string) => fileURLToPath(new URL(path, import.meta.url))

// En GitHub Pages la web cuelga de /meshmind/; en local, de la raíz.
// Dos páginas: la landing en la raíz y la app en /app/
export default defineConfig({
  base: process.env.BASE_PATH || '/',
  appType: 'mpa',
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': page('./src'),
      // La copia de Transformers.js que usa kokoro-js (el mismo archivo que importa), para configurar sus hilos
      'kokoro-transformers': page('./node_modules/kokoro-js/node_modules/@huggingface/transformers/dist/transformers.web.js'),
    },
  },
  worker: { format: 'es' },
  build: { rollupOptions: { input: { landing: page('./index.html'), app: page('./app/index.html') } } },
  // En local las cabeceras de aislamiento las pone el propio servidor (en GitHub Pages, public/isolation-sw.js)
  server: { headers: { 'Cross-Origin-Embedder-Policy': 'credentialless', 'Cross-Origin-Opener-Policy': 'same-origin' } },
  preview: { headers: { 'Cross-Origin-Embedder-Policy': 'credentialless', 'Cross-Origin-Opener-Policy': 'same-origin' } },
})
