import { beforeAll, describe, it, expect, vi } from 'vitest'
import { describeWithBackend } from '../helpers/with-backend'
import { render, screen, fireEvent } from '@testing-library/react'
import { ProductFilters } from '@/components/ProductFilters'
import { APIService } from '@/lib/api'
import { DEV_USERS, getDevToken } from '@/lib/dev-users'

let tagsFromApi: string[] = []
let sourcesFromApi: Array<{ name: string; count: number }> = []
const testRole = DEV_USERS.user.role

beforeAll(async () => {
  APIService.setAuthTokenGetter(async () => getDevToken(testRole))

  // Seed a couple of products to derive real tags/sources
  const products = await Promise.all([
    APIService.createProduct({
      name: 'Filterable Software',
      type: 'Software',
      source: 'github',
      sourceUrl: `https://github.com/test/filter-software-${Date.now()}`,
      description: 'Software product for filter tests with sufficient description',
      tags: ['accessibility', 'software'],
    }),
    APIService.createProduct({
      name: 'Filterable Print',
      type: 'Fabrication',
      source: 'thingiverse',
      sourceUrl: `https://thingiverse.com/thing:${Date.now()}`,
      description: 'Fabrication product for filter tests with sufficient description',
      tags: ['grip', 'accessibility'],
    }),
  ])

  tagsFromApi = Array.from(new Set(products.flatMap((p) => p.tags)))
  sourcesFromApi = Array.from(new Set(products.map((p) => p.source).filter(Boolean))).map(
    (name) => ({ name, count: 1 })
  )
})

describeWithBackend('ProductFilters Accessibility Tests', () => {
  it('should have proper heading hierarchy', () => {
    render(
      <ProductFilters
        tags={tagsFromApi}
        sources={sourcesFromApi}
        selectedTags={[]}
        selectedSources={[]}
        minRating={0}
        updatedSince={null}
        sortBy="created_at"
        sortOrder="desc"
        onTagToggle={vi.fn()}
        onSourceToggle={vi.fn()}
        onMinRatingChange={vi.fn()}
        onUpdatedSinceChange={vi.fn()}
        onSortChange={vi.fn()}
        onClearFilters={vi.fn()}
      />
    )

    expect(screen.getByRole('heading', { name: /search/i })).toBeInTheDocument()
  })

  it('should not render a product type filter', () => {
    render(
      <ProductFilters
        tags={tagsFromApi}
        sources={sourcesFromApi}
        selectedTags={[]}
        selectedSources={[]}
        minRating={0}
        updatedSince={null}
        sortBy="created_at"
        sortOrder="desc"
        onTagToggle={vi.fn()}
        onSourceToggle={vi.fn()}
        onMinRatingChange={vi.fn()}
        onUpdatedSinceChange={vi.fn()}
        onSortChange={vi.fn()}
        onClearFilters={vi.fn()}
      />
    )

    expect(screen.queryByRole('group', { name: /filter by product type/i })).not.toBeInTheDocument()
  })

  it('should show selected tag states correctly', () => {
    render(
      <ProductFilters
        tags={tagsFromApi}
        sources={sourcesFromApi}
        selectedTags={['accessibility']}
        selectedSources={[]}
        minRating={0}
        updatedSince={null}
        sortBy="created_at"
        sortOrder="desc"
        onTagToggle={vi.fn()}
        onSourceToggle={vi.fn()}
        onMinRatingChange={vi.fn()}
        onUpdatedSinceChange={vi.fn()}
        onSortChange={vi.fn()}
        onClearFilters={vi.fn()}
      />
    )

    const accessibilitySwitch = screen.getByRole('switch', { name: /accessibility/i })
    expect(accessibilitySwitch).toBeChecked()
  })

  it('should call toggle handlers on filter change', () => {
    const handleTagToggle = vi.fn()
    const handleSourceToggle = vi.fn()

    render(
      <ProductFilters
        tags={tagsFromApi}
        sources={sourcesFromApi}
        selectedTags={[]}
        selectedSources={[]}
        minRating={0}
        updatedSince={null}
        sortBy="created_at"
        sortOrder="desc"
        onTagToggle={handleTagToggle}
        onSourceToggle={handleSourceToggle}
        onMinRatingChange={vi.fn()}
        onUpdatedSinceChange={vi.fn()}
        onSortChange={vi.fn()}
        onClearFilters={vi.fn()}
      />
    )

    const accessibilitySwitch = screen.getByRole('switch', { name: /accessibility/i })
    fireEvent.click(accessibilitySwitch)
    expect(handleTagToggle).toHaveBeenCalledWith('accessibility')
  })

  it('should have accessible clear filters button when tag filter is active', () => {
    const handleClear = vi.fn()

    render(
      <ProductFilters
        tags={tagsFromApi}
        sources={sourcesFromApi}
        selectedTags={['accessibility']}
        selectedSources={[]}
        minRating={0}
        updatedSince={null}
        sortBy="created_at"
        sortOrder="desc"
        onTagToggle={vi.fn()}
        onSourceToggle={vi.fn()}
        onMinRatingChange={vi.fn()}
        onUpdatedSinceChange={vi.fn()}
        onSortChange={vi.fn()}
        onClearFilters={handleClear}
      />
    )

    const clearButton = screen.getByRole('button', { name: /clear filters/i })
    expect(clearButton).toBeInTheDocument()

    fireEvent.click(clearButton)
    expect(handleClear).toHaveBeenCalled()
  })

  it('should be keyboard navigable through all filter controls', () => {
    render(
      <ProductFilters
        tags={tagsFromApi}
        sources={sourcesFromApi}
        selectedTags={[]}
        selectedSources={[]}
        minRating={0}
        updatedSince={null}
        sortBy="created_at"
        sortOrder="desc"
        onTagToggle={vi.fn()}
        onSourceToggle={vi.fn()}
        onMinRatingChange={vi.fn()}
        onUpdatedSinceChange={vi.fn()}
        onSortChange={vi.fn()}
        onClearFilters={vi.fn()}
      />
    )

    const allSwitches = screen.getAllByRole('switch')
    allSwitches.forEach((control) => {
      expect(control).not.toBeDisabled()
    })
  })
})
