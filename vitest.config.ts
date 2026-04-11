import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react-swc'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: false,
    environment: 'jsdom',
    setupFiles: './src/__tests__/setup.ts',
    // In CI, only run pure unit tests (no backend dependencies)
    include: process.env.CI 
      ? [
          '**/__tests__/helpers/**/*.test.{ts,tsx}',
          '**/__tests__/types/**/*.test.{ts,tsx}',
          '**/__tests__/lib/api.base-url.test.ts',
          '**/__tests__/lib/source-ratings.test.ts',
          '**/__tests__/lib/normalize-image-url.test.ts',
          '**/__tests__/components/PublicProfile.test.tsx',
          '**/__tests__/components/UserProfile.website.test.tsx',
          '**/__tests__/components/HomePage.test.tsx',
          '**/__tests__/accessibility/BlogPostDraftPage.a11y.test.tsx',
          '**/__tests__/components/HomePage.a11y.test.tsx',
          '**/__tests__/accessibility/HomePage.a11y.test.tsx',
          '**/__tests__/accessibility/AboutPage.a11y.test.tsx',
          '**/__tests__/accessibility/CollectionDetail.a11y.test.tsx',
          '**/__tests__/accessibility/UserSignup.a11y.test.tsx',
        ]
      : ['**/__tests__/**/*.test.{ts,tsx}'],
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/cypress/**',
      '**/.{idea,git,cache,output,temp}/**',
      '**/{karma,rollup,webpack,vite,vitest,jest,ava,babel,nyc,cypress,tsup,build}.config.*',
    ],
  },
  define: {
    BASE_KV_SERVICE_URL: JSON.stringify('http://localhost:3000'),
    'import.meta.env.VITE_DEV_MODE': JSON.stringify('true'),
    // Expose TEST_BACKEND_URL so tests can gate on backend availability
    'import.meta.env.TEST_BACKEND_URL': JSON.stringify(process.env.TEST_BACKEND_URL ?? ''),
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
})
