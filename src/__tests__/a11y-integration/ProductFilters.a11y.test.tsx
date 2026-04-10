import { beforeAll, describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ProductFilters } from '@/components/ProductFilters'
import { APIService } from '@/lib/api'
import { DEV_USERS, getDevToken } from '@/lib/dev-users'

let typesFromApi: string[] = []
let tagsFromApi: string[] = []
let sourcesFromApi: string[] = []
const testUserId = DEV_USERS.user.id

beforeAll(async () => {
  APIService.setAuthTokenGetter(async () => getDevToken(testUserId))

  // Seed a couple of products to derive real types/tags
  const products = await Promise.all([
    APIService.createProduct({
      name: 'Filterable Software',
      type: 'Software',
      sourceUrl: `https://github.com/test/filter-software-${Date.now()}`,
      description: 'Software product for filter tests with sufficient description',
      tags: ['accessibility', 'software'],
    }),
    APIService.createProduct({
      name: 'Filterable Print',
      type: 'Fabrication',
      sourceUrl: `https://thingiverse.com/thing:${Date.now()}`,
      description: 'Fabrication product for filter tests with sufficient description',
      tags: ['grip', 'accessibility'],
    }),
  ])

  typesFromApi = Array.from(new Set(products.map((p) => p.type)))
  tagsFromApi = Array.from(new Set(products.flatMap((p) => p.tags)))
  sourcesFromApi = Array.from(new Set(products.map((p) => p.source).filter(Boolean)))
})

describe('ProductFilters Accessibility Tests', () => {
  it('should have proper heading hierarchy', () => {
    render(
      <ProductFilters
        types={typesFromApi}
        tags={tagsFromApi}
        sources={sourcesFromApi}
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

    expect(screen.getByRole('heading', { name: /search/i })).toBeInTheDocument()
  })

  it('should have accessible checkboxes for types', () => {
    render(
      <ProductFilters
        types={typesFromApi}
        tags={tagsFromApi}
        sources={sourcesFromApi}
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

    typesFromApi.forEach((type) => {
      const checkbox = screen.getByRole('checkbox', { name: new RegExp(type, 'i') })
      expect(checkbox).toBeInTheDocument()
      expect(checkbox).not.toBeChecked()
    })
  })

  it('should show selected states correctly', () => {
    render(
      <ProductFilters
        types={typesFromApi}
        tags={tagsFromApi}
        sources={sourcesFromApi}
        selectedTypes={['Software']}
        selectedTags={['accessibility']}
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

    const softwareCheckbox = screen.getByRole('checkbox', { name: /software/i })
    const accessibilitySwitch = screen.getByRole('switch', { name: /accessibility/i })

    expect(softwareCheckbox).toBeChecked()
    expect(accessibilitySwitch).toBeChecked()
  })

  it('should call toggle handlers on checkbox change', () => {
    const handleTypeToggle = vi.fn()
    const handleTagToggle = vi.fn()
    const handleSourceToggle = vi.fn()

    render(
      <ProductFilters
        types={typesFromApi}
        tags={tagsFromApi}
        sources={sourcesFromApi}
        selectedTypes={[]}
        selectedTags={[]}
        selectedSources={[]}
        minRating={0}
        updatedSince={null}
        sortBy="created_at"
        sortOrder="desc"
        onTypeToggle={handleTypeToggle}
        onTagToggle={handleTagToggle}
        onSourceToggle={handleSourceToggle}
        onMinRatingChange={vi.fn()}
        onUpdatedSinceChange={vi.fn()}
        onSortChange={vi.fn()}
        onClearFilters={vi.fn()}
      />
    )

    const softwareCheckbox = screen.getByRole('checkbox', { name: /software/i })
    fireEvent.click(softwareCheckbox)
    expect(handleTypeToggle).toHaveBeenCalledWith('Software')

    const accessibilitySwitch = screen.getByRole('switch', { name: /accessibility/i })
    fireEvent.click(accessibilitySwitch)
    expect(handleTagToggle).toHaveBeenCalledWith('accessibility')
  })

  it('should have accessible clear filters button', () => {
    const handleClear = vi.fn()

    render(
      <ProductFilters
        types={typesFromApi}
        tags={tagsFromApi}
        sources={sourcesFromApi}
        selectedTypes={['Software']}
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
        types={typesFromApi}
        tags={tagsFromApi}
        sources={sourcesFromApi}
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

    const allCheckboxes = screen.getAllByRole('checkbox')
    const allSwitches = screen.getAllByRole('switch')
    ;[...allCheckboxes, ...allSwitches].forEach((control) => {
      expect(control).not.toBeDisabled()
    })
  })
})
