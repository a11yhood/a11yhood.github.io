/**
 * Regression test for the document-title accessibility rule:
 * https://dequeuniversity.com/rules/axe/4.11/document-title
 *
 * Ensures that each route/page updates document.title so screen readers
 * can announce the page name when navigating between views.
 */
import { describe, it, expect, afterEach } from 'vitest'
import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { AboutPage } from '@/components/AboutPage'
import { NotFoundPage } from '@/components/NotFoundPage'
import { HomePage } from '@/components/HomePage'

const BASE_TITLE = 'a11yhood - Accessible Product Reviews'

afterEach(() => {
  // Reset title between tests
  document.title = BASE_TITLE
})

describe('document-title – page titles are set on navigation', () => {
  it('AboutPage sets document title to "About | a11yhood"', () => {
    render(
      <MemoryRouter>
        <AboutPage />
      </MemoryRouter>
    )
    expect(document.title).toBe('About | a11yhood')
  })

  it('NotFoundPage sets document title to "Page Not Found | a11yhood"', () => {
    render(
      <MemoryRouter>
        <NotFoundPage />
      </MemoryRouter>
    )
    expect(document.title).toBe('Page Not Found | a11yhood')
  })

  it('HomePage sets document title to the base site title', () => {
    render(
      <MemoryRouter>
        <HomePage
          products={[]}
          blogPosts={[]}
          blogPostsLoading={false}
          ratings={[]}
          onRate={() => {}}
        />
      </MemoryRouter>
    )
    expect(document.title).toBe(BASE_TITLE)
  })

  it('document title is non-empty (document-title axe rule)', () => {
    render(
      <MemoryRouter>
        <AboutPage />
      </MemoryRouter>
    )
    expect(document.title).not.toBe('')
  })
})
