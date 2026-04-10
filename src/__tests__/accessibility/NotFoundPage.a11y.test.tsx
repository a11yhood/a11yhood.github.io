/**
 * Accessibility tests for the Not Found (404) page.
 * Ensures WCAG 2.1 compliance: page must contain a level-one heading
 * (https://dequeuniversity.com/rules/axe/4.11/page-has-heading-one).
 */
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { AuthProvider } from '@/contexts/AuthContext'
import App from '@/App'

describe('NotFoundPage – level-one heading', () => {
  const renderAtPath = (path: string) =>
    render(
      <MemoryRouter initialEntries={[path]}>
        <AuthProvider>
          <App />
        </AuthProvider>
      </MemoryRouter>
    )

  it('renders an <h1> on an unknown route (/draft/209/)', async () => {
    renderAtPath('/draft/209/')
    const heading = screen.getByRole('heading', { level: 1 })
    expect(heading).toBeInTheDocument()
  })

  it('renders an <h1> on any other unmatched route', async () => {
    renderAtPath('/this-route-does-not-exist')
    const heading = screen.getByRole('heading', { level: 1 })
    expect(heading).toBeInTheDocument()
  })

  it('not-found heading text communicates page status', async () => {
    renderAtPath('/draft/209/')
    const heading = screen.getByRole('heading', { level: 1, name: /page not found/i })
    expect(heading).toBeInTheDocument()
  })

  it('provides a link back to home', async () => {
    renderAtPath('/draft/209/')
    const link = screen.getByRole('link', { name: /return to home/i })
    expect(link).toBeInTheDocument()
    expect(link).toHaveAttribute('href', '/')
  })
})
