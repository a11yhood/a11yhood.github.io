import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ProductFilters } from '@/components/ProductFilters'
import { runA11yScan } from '../helpers/a11y'

const defaultProps = {
  types: ['Software', 'App or Website'],
  tags: ['accessibility', 'keyboard'],
  sources: [{ name: 'GitHub', count: 10 }],
  selectedTypes: [],
  selectedTags: [],
  selectedSources: [],
  minRating: 0,
  updatedSince: null,
  sortBy: 'rating' as const,
  sortOrder: 'desc' as const,
  onTypeToggle: vi.fn(),
  onTagToggle: vi.fn(),
  onSourceToggle: vi.fn(),
  onMinRatingChange: vi.fn(),
  onUpdatedSinceChange: vi.fn(),
  onSortChange: vi.fn(),
  onClearFilters: vi.fn(),
}

describe('ProductFilters SelectTrigger accessibility', () => {
  it('sort-by select trigger has a discernible accessible name via label association', () => {
    render(<ProductFilters {...defaultProps} />)

    // The sort select trigger (combobox) must have an accessible name.
    // It is associated via id="sortby" matching htmlFor="sortby" on the Label.
    const combobox = screen.getByRole('combobox', { name: /sort by/i })
    expect(combobox).toBeInTheDocument()
  })

  it('has no axe violations', async () => {
    const { container } = render(<ProductFilters {...defaultProps} />)

    const results = await runA11yScan(container)
    expect(results).toHaveNoViolations()
  })
})
