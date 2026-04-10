/**
 * Accessibility tests for the /draft/:id route
 * Ensures the draft preview page always contains a level-one heading (WCAG 2.4.6 / axe rule page-has-heading-one).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { BlogPostDraftPage } from '@/components/BlogPostDraftPage'
import { APIService } from '@/lib/api'
import type { BlogPost } from '@/lib/types'

const mockDraftPost: BlogPost = {
  id: '209',
  title: 'My Draft Post',
  slug: 'my-draft-post',
  content: '# Hello\n\nThis is a draft post.',
  excerpt: 'A short excerpt.',
  authorId: 'author-1',
  authorName: 'Test Author',
  authorIds: ['author-1'],
  authorNames: ['Test Author'],
  createdAt: Date.now(),
  updatedAt: Date.now(),
  published: false,
  tags: [],
  featured: false,
}

function renderDraftRoute(id: string) {
  return render(
    <MemoryRouter initialEntries={[`/draft/${id}`]}>
      <Routes>
        <Route path="/draft/:id" element={<BlogPostDraftPage userAccount={null} />} />
      </Routes>
    </MemoryRouter>
  )
}

describe('BlogPostDraftPage Accessibility – page-has-heading-one', () => {
  let getBlogPostSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    getBlogPostSpy = vi.spyOn(APIService, 'getBlogPost')
  })

  afterEach(() => {
    getBlogPostSpy.mockRestore()
  })

  it('shows a level-one heading while the draft post is loading', () => {
    // Never resolve so the component stays in loading state
    getBlogPostSpy.mockReturnValue(new Promise(() => {}))

    renderDraftRoute('209')

    // sr-only h1 must be present during load so axe won't flag the page
    const h1 = screen.getByRole('heading', { level: 1 })
    expect(h1).toBeInTheDocument()
  })

  it('shows a visible level-one heading when the draft post is found', async () => {
    getBlogPostSpy.mockResolvedValue(mockDraftPost)

    renderDraftRoute('209')

    // BlogPostDetail renders <h1>{post.title}</h1>
    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: mockDraftPost.title })).toBeInTheDocument()
    })
  })

  it('shows "Draft Not Found" as a level-one heading when the post does not exist', async () => {
    getBlogPostSpy.mockResolvedValue(null)

    renderDraftRoute('999')

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: /draft not found/i })).toBeInTheDocument()
    })
  })

  it('shows "Draft Not Found" as a level-one heading when the API request fails', async () => {
    getBlogPostSpy.mockRejectedValue(new Error('Network error'))

    renderDraftRoute('209')

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: /draft not found/i })).toBeInTheDocument()
    })
  })
})
