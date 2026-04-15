import { describe } from 'vitest'

/**
 * Wraps a `describe` block so it is automatically skipped when the local
 * dev backend is not running.
 *
 * The skip decision is made at test-collection time using the
 * `__BACKEND_AVAILABLE__` global set by `setup.ts`, which reads
 * `process.env.VITEST_BACKEND_AVAILABLE` populated by `globalSetup.ts`
 * after performing an HTTP health check against the configured backend URL.
 *
 * Usage:
 *   import { describeWithBackend } from '../helpers/with-backend'
 *   describeWithBackend('My integration suite', () => { ... })
 */
export function describeWithBackend(name: string, fn: () => void) {
  const available = !!(globalThis as any).__BACKEND_AVAILABLE__
  describe.skipIf(!available)(name, fn)
}
