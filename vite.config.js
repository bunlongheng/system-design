import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const auth = Buffer.from(`${env.JIRA_EMAIL}:${env.JIRA_TOKEN}`).toString('base64')

  return {
    plugins: [react()],
    server: {
      proxy: {
        '/jira': {
          target: 'https://thryv.atlassian.net',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/jira/, ''),
          headers: { Authorization: `Basic ${auth}` },
        },
      },
    },
  }
})
