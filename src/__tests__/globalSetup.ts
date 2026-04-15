import { DEV_USERS, getDevToken } from '../lib/dev-users'

function shouldResetDevDbForRun(argv: string[]): boolean {
  // Ignore the first entries (node + vitest binary path)
  const args = argv.slice(2).map(arg => arg.replace(/\\/g, '/').replace(/\/$/, ''))

  // Only enforce auto-reset for full integration-suite runs.
  return args.some(
    arg => arg === 'src/__tests__/integration' || arg === './src/__tests__/integration'
  )
}

/**
 * Vitest global setup — runs once in the main process before any workers start.
 *
 * Checks whether the local dev backend is reachable and stores the result in
 * process.env.VITEST_BACKEND_AVAILABLE so that setupFiles can read it at
 * module-load time (before test collection begins).
 *
 * Tests that require a live backend use `describeWithBackend` from
 * helpers/with-backend.ts, which skips the suite when the flag is false.
 */
export async function setup() {
  const backendUrl = (
    process.env.TEST_BACKEND_URL ||
    process.env.VITE_API_URL ||
    'http://localhost:8002'
  ).replace(/\/$/, '')

  // Local HTTPS backends often use self-signed certs in dev.
  // Relax TLS verification only for localhost test targets.
  if (/^https:\/\/localhost(?::\d+)?$/i.test(backendUrl)) {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'
  }

  let backendAvailable = false
  try {
    const controller = new AbortController()
    const tid = setTimeout(() => controller.abort(), 3000)
    const res = await fetch(`${backendUrl}/health`, { signal: controller.signal })
    clearTimeout(tid)
    backendAvailable = res.ok
  } catch {
    // backend not reachable — backendAvailable stays false
  }

  process.env.VITEST_BACKEND_AVAILABLE = backendAvailable ? '1' : '0'

  if (backendAvailable && shouldResetDevDbForRun(process.argv)) {
    const adminToken = getDevToken(DEV_USERS.admin.role)
    const resetRes = await fetch(`${backendUrl}/api/dev/reset`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${adminToken}`,
      },
    })

    if (!resetRes.ok) {
      const details = await resetRes.text().catch(() => '')
      throw new Error(
        `Failed to reset dev database before integration-capable test run: ${resetRes.status} ${resetRes.statusText} ${details}`
      )
    }
  }

  if (!backendAvailable) {
    console.warn(
      '\n' +
      '┌──────────────────────────────────────────────────────────────┐\n' +
      `│  ⚠️  Backend not available at ${backendUrl}\n` +
      '│  Integration and security tests will be skipped.\n' +
      '│  ▶ Start the backend and re-run to include all tests.\n' +
      '│  ▶ Unit tests only:  CI=true npm run test:run\n' +
      '└──────────────────────────────────────────────────────────────┘\n'
    )
  }
}
