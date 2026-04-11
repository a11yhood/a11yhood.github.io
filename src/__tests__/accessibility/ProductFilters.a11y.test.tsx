import { describe, it, expect, vi } from 'vitest'
import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { ProductFilters } from '@/components/ProductFilters'
import { runA11yScan } from '../helpers/a11y'

const defaultProps = {
  types: ['Software', 'Fabrication'],
  tags: ['accessibility'],
  sources: [{ name: 'github.com', count: 5 }],
  selectedTypes: [],
  selectedTags: [],
  selectedSources: [],
  minRating: 0,
  updatedSince: null,
  sortBy: 'created_at' as const,
  sortOrder: 'desc' as const,
  onTypeToggle: vi.fn(),
  onTagToggle: vi.fn(),
  onSourceToggle: vi.fn(),
  onMinRatingChange: vi.fn(),
  onUpdatedSinceChange: vi.fn(),
  onSortChange: vi.fn(),
  onClearFilters: vi.fn(),
}

describe('ProductFilters accessibility', () => {
  it('has no button-name violations', async () => {
    const { container } = render(
      <MemoryRouter>
        <ProductFilters {...defaultProps} />
      </MemoryRouter>
    )
    const results = await runA11yScan(container)
    expect(results).toHaveNoViolations()
  })
})
