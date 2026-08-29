import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  // Subpath the app is served under in production (e.g. /analyses/).
  // Defaults to '/' so local dev on port 3001 is unaffected.
  base: process.env.VITE_BASE ?? '/',
  plugins: [react()],
  server: {
    port: 3001,
    strictPort: true,
  },
})
