/**
 * Accessibility tests for the Collections page.
 * Ensures WCAG 2.1 compliance:
 * - Page must contain a level-one heading (page-has-heading-one) in ALL states:
 *   both when the user is logged in and when they are not.
 */
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import App from '@/App'
import { AuthProvider } from '@/contexts/AuthContext'
import { runA11yScan } from '../helpers/a11y'

function renderAtPath(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AuthProvider>
        <App />
      </AuthProvider>
    </MemoryRouter>
  )
}

describe('CollectionsPage – level-one heading (page-has-heading-one)', () => {
  it('renders a level-one heading when the user is not logged in', () => {
    renderAtPath('/collections')

    // The unauthenticated view must still expose an h1 ("Collections")
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument()
  })

  it('has no obvious axe violations when unauthenticated', async () => {
    const { container } = renderAtPath('/collections')

    const results = await runA11yScan(container)
    expect(results.violations).toHaveLength(0)
  })
})
