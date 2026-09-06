import { readFileSync } from 'node:fs'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
// Fail the production build if required env vars are missing (see lib/env.js).
import './lib/env.js'

// The version shown in the footer comes from package.json, so bumping the
// package is the only place a release number is written.
const { version } = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'))

export default defineConfig({
  define: { __APP_VERSION__: JSON.stringify(version) },
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:4321',
        changeOrigin: true,
      },
    },
  },
  build: {
    modulePreload: { polyfill: false },
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (id.includes('@xyflow/react')) return 'reactflow'
          if (id.includes('@dagrejs/dagre')) return 'dagre'
        },
      },
    },
  },
})
