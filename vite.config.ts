import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  // Relative asset paths so the production build loads from file:// in Electron
  base: './',
  plugins: [react()],
})
