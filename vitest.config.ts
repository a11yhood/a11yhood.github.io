import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react-swc'
import { resolve } from 'path'
import { loadEnv } from 'vite'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  // Ensure test setup files (which read process.env directly) see the same backend URL
  // configured in .env/.env.local/.env.test and shell environment.
  const resolvedTestBackendUrl = process.env.TEST_BACKEND_URL || env.TEST_BACKEND_URL || env.VITE_API_URL || ''
  const resolvedApiUrl = process.env.VITE_API_URL || env.VITE_API_URL || ''

  if (!process.env.TEST_BACKEND_URL && resolvedTestBackendUrl) {
    process.env.TEST_BACKEND_URL = resolvedTestBackendUrl
  }
  if (!process.env.VITE_API_URL && resolvedApiUrl) {
    process.env.VITE_API_URL = resolvedApiUrl
  }

  return {
  plugins: [react()],
  test: {
    globals: false,
    environment: 'jsdom',
    globalSetup: './src/__tests__/globalSetup.ts',
    setupFiles: './src/__tests__/setup.ts',
    // In CI, only run pure unit tests (no backend dependencies)
    include: process.env.CI 
      ? [
          '**/__tests__/helpers/**/*.test.{ts,tsx}',
          '**/__tests__/types/**/*.test.{ts,tsx}',
          '**/__tests__/lib/api.base-url.test.ts',
          '**/__tests__/lib/api.timestamp-validation.test.ts',
          '**/__tests__/lib/source-ratings.test.ts',
          '**/__tests__/lib/normalize-image-url.test.ts',
          '**/__tests__/components/PublicProfile.test.tsx',
          '**/__tests__/components/UserProfile.website.test.tsx',
          '**/__tests__/components/HomePage.test.tsx',
          '**/__tests__/accessibility/BlogPostDraftPage.a11y.test.tsx',
          '**/__tests__/components/HomePage.a11y.test.tsx',
          '**/__tests__/accessibility/HomePage.a11y.test.tsx',
          '**/__tests__/accessibility/AboutPage.a11y.test.tsx',
          '**/__tests__/accessibility/ProductFilters.a11y.test.tsx',
          '**/__tests__/accessibility/DevRoleSwitcher.a11y.test.tsx',
          '**/__tests__/accessibility/link-in-text-block.test.tsx',
          '**/__tests__/accessibility/AppHeader.a11y.test.tsx',
          '**/__tests__/accessibility/landmarks-and-live-regions.test.tsx',
          '**/__tests__/accessibility/SelectTrigger.a11y.test.tsx',
          '**/__tests__/accessibility/html-lang-attribute.test.ts',
          '**/__tests__/accessibility/ErrorFallback.a11y.test.tsx',
          '**/__tests__/accessibility/NotFoundPage.a11y.test.tsx',
          '**/__tests__/accessibility/ProductSubmission.a11y.test.tsx',
        ]
      : ['**/__tests__/**/*.test.{ts,tsx}'],
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/cypress/**',
      '**/.{idea,git,cache,output,temp}/**',
      '**/{karma,rollup,webpack,vite,vitest,jest,ava,babel,nyc,cypress,tsup,build}.config.*',
    ],
    // Backend has a 40-row-per-table dev limit; a11y-integration tests each
    // create rows in beforeAll, so they must not run concurrently.
    // Run test files sequentially (one at a time) so they don't race for row slots.
    fileParallelism: false,
  },
  define: {
    BASE_KV_SERVICE_URL: JSON.stringify('http://localhost:3000'),
    'import.meta.env.VITE_DEV_MODE': JSON.stringify('true'),
    // Expose TEST_BACKEND_URL so tests can gate on backend availability
    'import.meta.env.TEST_BACKEND_URL': JSON.stringify(resolvedTestBackendUrl),
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
  }
})
