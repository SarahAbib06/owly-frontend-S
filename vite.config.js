import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    tailwindcss(),
    react()
  ],
  define: {
    global: 'globalThis',
    'process.env': {}
  },
  resolve: {
    alias: {
      global: 'globalThis',
    }
  },
  optimizeDeps: {
    include: ['simple-peer'],
    esbuildOptions: {
      define: {
        global: 'globalThis',
      },
      plugins: [],
    },
  },
})