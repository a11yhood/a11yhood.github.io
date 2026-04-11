import { describe, it, vi } from 'vitest'
import { render } from '@testing-library/react'
import { ProductFilters } from '@/components/ProductFilters'
import { runA11yScan } from '../helpers/a11y'

describe('Select trigger diagnostic', () => {
  it('shows select trigger content and violations', async () => {
    const { container } = render(
      <ProductFilters
        types={['Software']}
        tags={['accessibility']}
        sources={[]}
        selectedTypes={[]}
        selectedTags={[]}
        selectedSources={[]}
        minRating={0}
        updatedSince={null}
        sortBy="created_at"
        sortOrder="desc"
        onTypeToggle={vi.fn()}
        onTagToggle={vi.fn()}
        onSourceToggle={vi.fn()}
        onMinRatingChange={vi.fn()}
        onUpdatedSinceChange={vi.fn()}
        onSortChange={vi.fn()}
        onClearFilters={vi.fn()}
      />
    )
    
    const button = container.querySelector('[data-slot="select-trigger"]')
    console.log('Button textContent:', JSON.stringify(button?.textContent))
    console.log('Button aria attrs:', button?.getAttribute('aria-label'), button?.getAttribute('aria-labelledby'))
    
    const results = await runA11yScan(container)
    console.log('Violations:', JSON.stringify(results.violations.map(v => ({
      id: v.id,
      impact: v.impact,
      nodes: v.nodes.map(n => ({ html: n.html?.slice(0, 300), failureSummary: n.failureSummary }))
    })), null, 2))
  })
})
