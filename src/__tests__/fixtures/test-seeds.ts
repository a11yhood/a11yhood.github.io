/**
 * Test database seeding helpers
 * 
 * These functions seed the test SQLite database with required fixtures
 * (dev users, sources, test data) needed for integration tests to run.
 * 
 * Called once during test setup to ensure required records exist.
 */

import { DEV_USERS, getDevToken } from '@/lib/dev-users'

const API_BASE = (globalThis as any).__TEST_API_BASE__

/**
 * Ensure dev users exist in the database.
 * Creates missing users from the DEV_USERS fixtures.
 */
export async function seedDevUsers(): Promise<void> {
  for (const [_key, user] of Object.entries(DEV_USERS)) {
    try {
      // Try to create or update the user with role
      const response = await fetch(`${API_BASE}/users/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: user.username,
          email: user.email,
          displayName: user.displayName,
          avatar_url: `https://avatars.githubusercontent.com/${user.username}`,
          role: user.role,
        }),
      })

      if (!response.ok) {
        console.warn(`Failed to seed user ${user.username}: ${response.status}`)
      }
    } catch (err) {
      console.warn(`Error seeding user ${user.username}:`, err)
    }
  }
}

/**
 * Ensure supported sources (scrapers) exist in the database.
 * These are required for product URL validation.
 */
export async function seedSupportedSources(): Promise<void> {
  const sources = [
    {
      name: 'GitHub',
      domain: 'github.com',
      description: 'GitHub repositories and projects',
    },
    {
      name: 'Ravelry',
      domain: 'ravelry.com',
      description: 'Ravelry patterns and projects',
    },
    {
      name: 'Thingiverse',
      domain: 'thingiverse.com',
      description: 'Thingiverse models and designs',
    },
    {
      name: 'AbleData',
      domain: 'abledata.acl.gov',
      description: 'AbleData assistive technology resources',
    },
  ]

  // Use admin token for seeding
  const adminToken = getDevToken(DEV_USERS.admin.role)

  for (const source of sources) {
    try {
      // Check if source already exists
      const checkRes = await fetch(`${API_BASE}/supported-sources`, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
        },
      })

      if (checkRes.ok) {
        const existingSources = await checkRes.json()
        const sourceExists = existingSources.some(
          (s: any) => s.domain === source.domain
        )

        if (sourceExists) {
          console.log(`Source ${source.name} already exists`)
          continue
        }
      }

      // Create source if it doesn't exist
      const createRes = await fetch(`${API_BASE}/supported-sources`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`,
        },
        body: JSON.stringify(source),
      })

      if (!createRes.ok) {
        console.warn(
          `Failed to seed source ${source.name}: ${createRes.status}`
        )
      } else {
        console.log(`Seeded source ${source.name}`)
      }
    } catch (err) {
      console.warn(`Error seeding source ${source.name}:`, err)
    }
  }
}

/**
 * Run all test seeds (idempotent).
 * Safe to call multiple times - only creates missing records.
 */
export async function runAllSeeds(): Promise<void> {
  console.log('[Test Seeds] Starting database seeding...')

  try {
    await seedDevUsers()
    console.log('[Test Seeds] Dev users seeded')
  } catch (err) {
    console.warn('[Test Seeds] Failed to seed dev users:', err)
  }

  try {
    await seedSupportedSources()
    console.log('[Test Seeds] Supported sources seeded')
  } catch (err) {
    console.warn('[Test Seeds] Failed to seed supported sources:', err)
  }

  console.log('[Test Seeds] Seeding complete')
}
