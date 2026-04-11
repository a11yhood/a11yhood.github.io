/**
 * Accessibility tests for Select components.
 * Ensures SelectTrigger buttons always have discernible accessible names
 * (axe rule: button-name).
 */
import { describe, it, expect, vi } from 'vitest'
import { render } from '@testing-library/react'
import { ProductFilters } from '@/components/ProductFilters'
import { DevRoleSwitcher } from '@/components/DevRoleSwitcher'
import { runA11yScan } from '../helpers/a11y'

const defaultFilterProps = {
  types: ['Software'],
  tags: ['accessibility'],
  sources: [],
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

describe('SelectTrigger button-name accessibility', () => {
  it('ProductFilters sort-by select has no axe button-name violations', async () => {
    const { container } = render(<ProductFilters {...defaultFilterProps} />)

    const results = await runA11yScan(container)
    expect(results).toHaveNoViolations()
  })

  it('DevRoleSwitcher select has no axe button-name violations', async () => {
    const { container } = render(<DevRoleSwitcher userAccount={null} />)

    const results = await runA11yScan(container)
    expect(results).toHaveNoViolations()
  })
})
