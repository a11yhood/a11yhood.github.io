import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ProductFilters } from '@/components/ProductFilters'
import { runA11yScan } from '../helpers/a11y'

const defaultProps = {
  types: ['Software', 'Fabrication'],
  tags: ['accessibility', 'grip'],
  sources: [{ name: 'GitHub', count: 10 }, { name: 'Ravelry', count: 5 }],
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
  it('has no axe violations', async () => {
    const { container } = render(<ProductFilters {...defaultProps} />)
    const results = await runA11yScan(container)
    expect(results).toHaveNoViolations()
  })

  it('Sort By combobox has a discernible accessible name via label association', () => {
    render(<ProductFilters {...defaultProps} />)
    // The SelectTrigger must be findable by its label text "Sort By"
    const combobox = screen.getByRole('combobox', { name: /sort by/i })
    expect(combobox).toBeInTheDocument()
  })
})
