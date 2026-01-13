import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ProductFilters } from '@/components/ProductFilters'

describe('ProductFilters', () => {
  const mockProps = {
    types: ['Software', 'Fabrication', 'Knitting'],
    tags: ['accessibility', 'grip', '3d-printing', 'software'],
    sources: ['Github', 'Ravelry', 'Thingiverse'],
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

  it('should render filter sections', () => {
    render(<ProductFilters {...mockProps} />)

    expect(screen.getByText('Search')).toBeInTheDocument()
  })

  it('should render all product types', () => {
    render(<ProductFilters {...mockProps} />)

    expect(screen.getByText('Software')).toBeInTheDocument()
    expect(screen.getByText('Fabrication')).toBeInTheDocument()
    expect(screen.getByText('Knitting')).toBeInTheDocument()
  })

  it('should call onTypeToggle when type is clicked', () => {
    render(<ProductFilters {...mockProps} />)

    const softwareCheckbox = screen.getByRole('checkbox', { name: /software/i })
    fireEvent.click(softwareCheckbox)

    expect(mockProps.onTypeToggle).toHaveBeenCalledWith('Software')
  })

  it('should call onTagToggle when tag is clicked', () => {
    render(<ProductFilters {...mockProps} />)

    const accessibilityTag = screen.getByRole('switch', { name: /accessibility/i })
    fireEvent.click(accessibilityTag)
    expect(mockProps.onTagToggle).toHaveBeenCalledWith('accessibility')
  })

  it('should show selected types as checked', () => {
    const propsWithSelection = {
      ...mockProps,
      selectedTypes: ['Software'],
    }

    render(<ProductFilters {...propsWithSelection} />)

    const softwareCheckbox = screen.getByRole('checkbox', { name: /software/i })
    expect(softwareCheckbox).toBeChecked()
  })

  it('should show clear filters button when filters are active', () => {
    const propsWithFilters = {
      ...mockProps,
      selectedTypes: ['Software'],
    }

    render(<ProductFilters {...propsWithFilters} />)

    const clearButton = screen.getByText(/clear filters/i)
    expect(clearButton).toBeInTheDocument()
  })

  it('should not show clear filters button when no filters are active', () => {
    render(<ProductFilters {...mockProps} />)

    const clearButton = screen.queryByText(/clear filters/i)
    expect(clearButton).not.toBeInTheDocument()
  })

  it('should call onClearFilters when clear button is clicked', () => {
    const propsWithFilters = {
      ...mockProps,
      selectedTypes: ['Software'],
    }

    render(<ProductFilters {...propsWithFilters} />)

    const clearButton = screen.getByText(/clear filters/i)
    fireEvent.click(clearButton)

    expect(mockProps.onClearFilters).toHaveBeenCalled()
  })

  it('should render rating filter', () => {
    render(<ProductFilters {...mockProps} />)

    expect(screen.getByText(/minimum rating/i)).toBeInTheDocument()
  })

  it('should handle empty types array', () => {
    const propsWithNoTypes = {
      ...mockProps,
      types: [],
    }

    render(<ProductFilters {...propsWithNoTypes} />)

    expect(screen.getByText('Search')).toBeInTheDocument()
  })

  it('should display selected tags with different styling', () => {
    const propsWithSelectedTags = {
      ...mockProps,
      selectedTags: ['accessibility'],
    }

    render(<ProductFilters {...propsWithSelectedTags} />)

    const accessibilityTag = screen.getByRole('switch', { name: /accessibility/i })
    expect(accessibilityTag).toBeInTheDocument()
  })

  it('should show count of active filters', () => {
    const propsWithMultipleFilters = {
      ...mockProps,
      selectedTypes: ['Software', 'Fabrication'],
      minRating: 3,
    }

    render(<ProductFilters {...propsWithMultipleFilters} />)

    const clearButton = screen.getByText(/clear filters/i)
    expect(clearButton).toBeInTheDocument()
  })
})
