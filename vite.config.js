import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// GitHub Pages URLs are case-sensitive on the repo-name path segment —
// this must match the actual repo name (NYC-Electrification-Map) exactly,
// not a lowercased guess, or every asset request 404s.
export default defineConfig({
  plugins: [react()],
  base: '/NYC-Electrification-Map/',
})
