import { DEV_USERS, getDevToken } from '../lib/dev-users'

/** Milliseconds to wait for backend health check before considering it unavailable. */
const HEALTH_CHECK_TIMEOUT_MS = 3000

type NormalizeBackendBase = (rawUrl: string) => string
 const testGlobals = globalThis as typeof globalThis & {
   __NORMALIZE_BACKEND_BASE__?: NormalizeBackendBase
 }

type DevDbResetMode = 'always' | 'never' | 'auto'

type SeedManifest = {
  seed_version?: string
  seeded_image_id?: string
  seeded_product_with_image_id?: string
  seeded_product_image_id?: string
  seeded_product_visible?: boolean
  seeded_user_id?: string
}

const normalizeBackendBase: NormalizeBackendBase =
   testGlobals.__NORMALIZE_BACKEND_BASE__ ??
   ((rawUrl: string) => {
     const trimmed = rawUrl.replace(/\/$/, '')
     // CI secrets sometimes store an API base URL; tests expect service root.
     return trimmed.replace(/\/api$/i, '')
   })
 testGlobals.__NORMALIZE_BACKEND_BASE__ = normalizeBackendBase

function isReducedVitestRun(argv: string[]): boolean {
  return argv.some(arg => arg.includes('vitest.config.reduced.ts'))
}


function shouldResetDevDbForRun(argv: string[]): boolean {
  if (process.env.VITEST_SKIP_DEV_DB_RESET === '1') {
    return false
  }

  if (isReducedVitestRun(argv)) {
    return false
  }

  // Ignore the first entries (node + vitest binary path)
  const args = argv.slice(2).map(arg => arg.replace(/\\/g, '/').replace(/\/$/, ''))

  // Options that consume the following token as their value.
  // Important: npm scripts usually invoke Vitest as
  // `vitest run --config vitest.config.ts`; without skipping `--config`'s
  // value, we incorrectly treat the config path as a test target and skip reset.
  const optionFlagsWithValue = new Set([
    '--config',
    '-c',
    '--root',
    '--dir',
    '--reporter',
    '--outputFile',
    '--testNamePattern',
    '--project',
    '--pool',
  ])

  const positionalArgs: string[] = []
  for (let i = 0; i < args.length; i++) {
    const arg = args[i]

    if (optionFlagsWithValue.has(arg)) {
      i += 1
      continue
    }

    if (arg.startsWith('-')) {
      continue
    }

    positionalArgs.push(arg)
  }

  // If no test-file/directory arguments are passed, this is a full suite run — always reset.
  const testPathArgs = positionalArgs.filter(arg => arg !== 'run')
  if (testPathArgs.length === 0) {
    return true
  }

  // Auto-reset for any integration workflow invocation, whether a single file,
  // multiple files, or the whole integration directory is targeted.
  return testPathArgs.some(arg => {
    const normalized = arg.replace(/^\.\//, '')
    return (
      normalized === 'src/__tests__/integration' ||
      normalized.startsWith('src/__tests__/integration/') ||
      normalized === 'src/__tests__/a11y-integration' ||
      normalized.startsWith('src/__tests__/a11y-integration/')
    )
  })
}

function resolveDevDbResetMode(raw: string | undefined): DevDbResetMode {
  const normalized = (raw || '').trim().toLowerCase()
  if (normalized === 'always' || normalized === 'never' || normalized === 'auto') {
    return normalized
  }
  return 'auto'
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
  const backendBase = normalizeBackendBase((
    process.env.TEST_BACKEND_URL ||
    process.env.VITE_API_URL ||
    'http://localhost:8002'
  ))

  // Local HTTPS backends often use self-signed certs in dev.
  // Relax TLS verification only when targeting localhost.
  if (/^https:\/\/localhost(?::\d+)?$/i.test(backendBase)) {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'
  }

  let backendAvailable = false
  const healthUrls = [`${backendBase}/health`, `${backendBase}/api/health`]
  for (const healthUrl of healthUrls) {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), HEALTH_CHECK_TIMEOUT_MS)

    try {
      const res = await fetch(healthUrl, { signal: controller.signal })
      if (res.ok) {
        backendAvailable = true
        break
      }
    } catch {
      // backend not reachable at this path — try next health path
    } finally {
      clearTimeout(timeout)
    }
  }

  process.env.VITEST_BACKEND_AVAILABLE = backendAvailable ? '1' : '0'

  const resetMode = resolveDevDbResetMode(process.env.VITEST_DEV_DB_RESET_MODE)
  const shouldReset =
    resetMode === 'always' ||
    (resetMode === 'auto' && shouldResetDevDbForRun(process.argv))

  let seedManifest: SeedManifest | null = null
  let seedVersion: string | undefined

  if (backendAvailable && shouldReset) {
    const adminToken = getDevToken(DEV_USERS.admin.role)
    const resetRes = await fetch(`${backendBase}/api/dev/reset`, {
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

    const resetPayload = await resetRes.json().catch(() => null) as {
      seed_version?: string
      seed_manifest?: SeedManifest
    } | null

    seedManifest = resetPayload?.seed_manifest ?? null
    seedVersion = resetPayload?.seed_version ?? seedManifest?.seed_version

  }

  if (backendAvailable && !seedManifest) {
    const adminToken = getDevToken(DEV_USERS.admin.role)
    const manifestRes = await fetch(`${backendBase}/api/test/seed-manifest`, {
      headers: {
        Authorization: `Bearer ${adminToken}`,
      },
    }).catch(() => null)

    if (manifestRes?.ok) {
      seedManifest = await manifestRes.json().catch(() => null)
      seedVersion = seedManifest?.seed_version
    }
  }

  if (seedManifest) {
    process.env.VITEST_SEED_MANIFEST_JSON = JSON.stringify(seedManifest)
  } else {
    delete process.env.VITEST_SEED_MANIFEST_JSON
  }

  if (seedVersion) {
    process.env.VITEST_SEED_VERSION = seedVersion
  } else {
    delete process.env.VITEST_SEED_VERSION
  }

  if (!backendAvailable) {
    console.warn(
      '\n' +
      '┌──────────────────────────────────────────────────────────────┐\n' +
      `│  ⚠️  Backend not available at ${backendBase}\n` +
      '│  Backend-dependent tests will be marked skipped, not failed.\n' +
      '│  ▶ Start the backend and re-run to include all tests.\n' +
      '│  ▶ Unit tests only:  CI=true npm run test:run\n' +
      '└──────────────────────────────────────────────────────────────┘\n'
    )
  }
}
