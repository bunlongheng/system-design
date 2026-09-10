import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist', '.next']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      // Next replaces process.env.NODE_ENV / NEXT_PUBLIC_* at build time, so client
      // code legitimately references `process`.
      globals: { ...globals.browser, process: 'readonly' },
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    rules: {
      'no-unused-vars': ['error', { varsIgnorePattern: '^[A-Z_]' }],
    },
  },
  {
    // Server-side + config + tests run under Node, not the browser.
    files: [
      'lib/**/*.js',
      'app/**/*.{js,jsx}',
      'middleware.js',
      'next.config.mjs',
      'db/**/*.mjs',
      'vitest.config.js',
      'playwright.config.js',
      'tests/**/*.{js,jsx}',
    ],
    languageOptions: {
      globals: { ...globals.node },
    },
  },
  {
    // Next's App Router REQUIRES a route file to export metadata /
    // generateMetadata / viewport / runtime beside the component, which is
    // exactly what the fast-refresh rule forbids. The rule is a Vite-era
    // convention and does not apply here.
    files: ['app/**/*.{js,jsx}', 'middleware.js'],
    rules: { 'react-refresh/only-export-components': 'off' },
  },
])
