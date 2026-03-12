import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  root: 'renderer',
  base: './',
  plugins: [react()],
  build: {
    // Output relative to root ('renderer'), resolves to renderer/dist
    outDir: 'dist',
    emptyOutDir: true,
  },
  server: {
    port: 5173,
  },
})
