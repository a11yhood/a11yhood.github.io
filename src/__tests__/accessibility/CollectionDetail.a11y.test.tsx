/**
 * Accessibility tests for the CollectionDetail component.
 * Ensures WCAG 2.1 compliance: page must contain a level-one heading
 * (https://dequeuniversity.com/rules/axe/4.11/page-has-heading-one).
 */
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { CollectionDetail } from '@/components/CollectionDetail'
import { runA11yScan } from '../helpers/a11y'
import type { Collection } from '@/lib/types'

const mockCollection: Collection = {
  id: 'col-1',
  name: 'My Test Collection',
  slug: 'my-test-collection',
  description: 'A collection for testing.',
  isPublic: true,
  userId: 'user-1',
  username: 'testuser',
  productSlugs: [],
  createdAt: Date.now(),
  updatedAt: Date.now(),
}

function renderCollectionDetail() {
  return render(
    <MemoryRouter>
      <CollectionDetail
        collection={mockCollection}
        ratings={[]}
        products={[]}
        onBack={vi.fn()}
        onRemoveProduct={vi.fn()}
        onSelectProduct={vi.fn()}
        isOwner={false}
        onDeleteProduct={vi.fn()}
      />
    </MemoryRouter>
  )
}

describe('CollectionDetail – level-one heading', () => {
  it('renders the collection name as a level-one heading', () => {
    renderCollectionDetail()

    const h1 = screen.getByRole('heading', { level: 1 })
    expect(h1).toBeInTheDocument()
    expect(h1).toHaveTextContent('My Test Collection')
  })

  it('has no obvious axe violations', async () => {
    const { container } = renderCollectionDetail()

    const results = await runA11yScan(container)
    expect(results).toHaveNoViolations()
  })
})
