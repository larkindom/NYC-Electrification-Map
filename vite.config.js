import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Repo is served from GitHub Pages at /nyc-electrification-map/
export default defineConfig({
  plugins: [react()],
  base: '/nyc-electrification-map/',
})
