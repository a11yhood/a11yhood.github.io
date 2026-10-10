/**
 * Route-level axe sweep: renders the full App at every route in `App.tsx` and
 * scans the result.
 *
 * Every API call is answered with a 404, so each route renders its empty /
 * not-found / signed-out state deterministically (no backend, no network).
 * Populated and signed-in views are covered by the component-level tests.
 * jsdom cannot evaluate color contrast; that stays with the post-deploy scanner.
 */
import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import App from '@/App'
import { AuthProvider } from '@/contexts/AuthContext'
import { runA11yScan } from '../helpers/a11y'

const ROUTES: Array<{ path: string; label: string }> = [
  { path: '/', label: 'home' },
  { path: '/about', label: 'about' },
  { path: '/products', label: 'product list' },
  { path: '/product/some-product', label: 'product detail' },
  { path: '/blog', label: 'blog list' },
  { path: '/blog/some-post', label: 'blog post' },
  { path: '/draft/some-draft', label: 'blog draft' },
  { path: '/collections', label: 'collections' },
  { path: '/collections/some-collection', label: 'collection detail' },
  { path: '/account/someone', label: 'account' },
  { path: '/profile/someone', label: 'public profile' },
  { path: '/admin', label: 'admin' },
  { path: '/admin/users', label: 'admin users' },
  { path: '/admin/logs', label: 'admin logs' },
  { path: '/no-such-route', label: 'not found' },
]

describe('Route-level axe sweep (empty / signed-out states)', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        new Response(JSON.stringify({ detail: 'Not found' }), {
          status: 404,
          headers: { 'content-type': 'application/json' },
        })
      )
    )
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it.each(ROUTES)('$label ($path) has a main landmark, an h1 and no axe violations', async ({ path }) => {
    const { container } = render(
      <MemoryRouter initialEntries={[path]}>
        <AuthProvider>
          <App />
        </AuthProvider>
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByRole('main')).toBeInTheDocument()
    })
    // Let loading states settle so we scan the page, not a skeleton.
    await waitFor(() => {
      expect(screen.queryAllByRole('heading', { level: 1 }).length).toBeGreaterThan(0)
    })

    const results = await runA11yScan(container)
    expect(results).toHaveNoViolations()
  })
})
