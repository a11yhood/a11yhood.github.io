/** Milliseconds to wait for the backend health check before assuming it is unavailable. */
const HEALTH_CHECK_TIMEOUT_MS = 3000

/**
 * Vitest global setup – runs once before any test files are collected.
 *
 * Performs an HTTP health check against the configured backend and sets
 * `VITEST_BACKEND_AVAILABLE` so that `setup.ts` (and therefore
 * `describeWithBackend`) can correctly skip integration suites when the
 * backend is not reachable.
 */
export async function setup() {
  const backendBase = (
    process.env.TEST_BACKEND_URL ||
    process.env.VITE_API_URL ||
    'http://localhost:8002'
  ).replace(/\/$/, '')

  const healthUrl = `${backendBase}/health`

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), HEALTH_CHECK_TIMEOUT_MS)

    const response = await fetch(healthUrl, { signal: controller.signal })
    clearTimeout(timeout)

    process.env.VITEST_BACKEND_AVAILABLE = response.ok ? '1' : '0'
  } catch {
    // Network error or timeout – backend is not reachable
    process.env.VITEST_BACKEND_AVAILABLE = '0'
  }
}
