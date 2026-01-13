import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BlogPostEditor } from '@/components/BlogPostEditor'
import type { BlogPost } from '@/lib/types'
import { vi } from 'vitest'

const baseProps = {
  authorId: 'author-1',
  authorName: 'Author One',
  onSave: vi.fn(),
  onCancel: vi.fn(),
}

describe('BlogPostEditor Accessibility', () => {
  it('provides labeled fields and accessible controls for composing posts', () => {
    render(<BlogPostEditor {...baseProps} />)

    expect(screen.getByLabelText(/Title/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Excerpt/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Tags/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Publish Date/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Insert Image/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /Preview/i })).toBeInTheDocument()
  })

  it('shows alt-text field when a header image is present and renders markdown preview', async () => {
    const samplePost: BlogPost = {
      id: 'post-1',
      title: 'Accessibility Blog',
      slug: 'accessibility-blog',
      content: '**bold text** in markdown',
      excerpt: 'Accessible excerpt',
      headerImage: 'data:image/png;base64,iVBORw0KGgo=',
      headerImageAlt: 'Accessible header',
      authorId: 'author-1',
      authorName: 'Author One',
      authorIds: ['author-1', 'author-2'],
      authorNames: ['Author One', 'Secondary Author'],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      publishDate: Date.now(),
      published: true,
      publishedAt: Date.now(),
      tags: ['blog', 'a11y'],
      featured: true,
    }

    render(<BlogPostEditor {...baseProps} post={samplePost} />)

    expect(screen.getByLabelText(/Image Alt Text/i)).toBeInTheDocument()

    const previewTab = screen.getByRole('tab', { name: /Preview/i })
    await userEvent.click(previewTab)

    expect(await screen.findByText(/bold text/i)).toBeInTheDocument()
  })

  it('exposes accessible controls for managing multiple authors', async () => {
    const multiAuthorPost: BlogPost = {
      id: 'post-2',
      title: 'Team Blog',
      slug: 'team-blog',
      content: 'content',
      excerpt: 'excerpt',
      headerImage: undefined,
      headerImageAlt: undefined,
      authorId: 'author-1',
      authorName: 'Author One',
      authorIds: ['author-1', 'author-2'],
      authorNames: ['Author One', 'Secondary Author'],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      published: false,
      tags: [],
      featured: false,
    }

    render(<BlogPostEditor {...baseProps} post={multiAuthorPost} />)

    const removeButton = screen.getByLabelText(/Remove Secondary/i)
    removeButton.focus()
    expect(removeButton).toHaveFocus()
  })
})
