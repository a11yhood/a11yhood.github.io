/**
 * Dev user fixtures shared between frontend and backend.
 * 
 * These user IDs and roles are seeded into the test database and must match
 * exactly between frontend and backend. Tests and dev mode rely on these.
 * 
 * Security: Only used when TEST_MODE=true or VITE_DEV_MODE=true.
 * In production, users come from Supabase auth.
 */

export const DEV_USERS = {
  admin: {
    id: '49366adb-2d13-412f-9ae5-4c35dbffab10',
    login: 'admin_user',
    displayName: 'Admin User',
    email: 'admin@example.com',
    role: 'admin' as const,
  },
  moderator: {
    id: '94e116f7-885d-4d32-87ae-697c5dc09b9e',
    login: 'moderator_user',
    displayName: 'Moderator User',
    email: 'moderator@example.com',
    role: 'moderator' as const,
  },
  user: {
    id: '2a3b7c3e-971b-4b42-9c8c-0f1843486c50',
    login: 'regular_user',
    displayName: 'Regular User',
    email: 'user@example.com',
    role: 'user' as const,
  },
} as const

/**
 * Get dev user by name key (admin, moderator, user).
 * Returns the user fixture with matching ID and role.
 */
export function getDevUser(userKey: string) {
  const key = (userKey || 'admin').toLowerCase() as keyof typeof DEV_USERS
  return DEV_USERS[key] || DEV_USERS.admin
}

/**
 * Get dev token for a user ID.
 * Format: dev-token-<user_id>
 */
export function getDevToken(userId: string): string {
  return `dev-token-${userId}`
}

/**
 * Verify a dev token and extract user ID.
 * Returns user ID if valid dev token, null otherwise.
 */
export function parseDevToken(token: string): string | null {
  if (token && token.startsWith('dev-token-')) {
    return token.replace('dev-token-', '').trim()
  }
  return null
}
