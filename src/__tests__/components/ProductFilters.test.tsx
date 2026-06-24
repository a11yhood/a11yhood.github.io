import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ProductFilters } from '@/components/ProductFilters'

describe('ProductFilters', () => {
  const mockProps = {
    tags: ['accessibility', 'grip', '3d-printing', 'software'],
    sources: [{ name: 'Github', count: 0 }, { name: 'Ravelry', count: 0 }, { name: 'Thingiverse', count: 0 }],
    selectedTags: [],
    selectedSources: [],
    minRating: 0,
    updatedSince: null,
    sortBy: 'created_at' as const,
    sortOrder: 'desc' as const,
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

  it('should not render product type filter', () => {
    render(<ProductFilters {...mockProps} />)

    expect(screen.queryByText('Software')).not.toBeInTheDocument()
    expect(screen.queryByText('Fabrication')).not.toBeInTheDocument()
    expect(screen.queryByText('Knitting')).not.toBeInTheDocument()
  })

  it('should call onTagToggle when tag is clicked', () => {
    render(<ProductFilters {...mockProps} />)

    const accessibilityTag = screen.getByRole('switch', { name: /accessibility/i })
    fireEvent.click(accessibilityTag)
    expect(mockProps.onTagToggle).toHaveBeenCalledWith('accessibility')
  })

  it('should show clear filters button when tag filters are active', () => {
    const propsWithFilters = {
      ...mockProps,
      selectedTags: ['accessibility'],
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
      selectedTags: ['accessibility'],
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

  it('should display selected tags with different styling', () => {
    const propsWithSelectedTags = {
      ...mockProps,
      selectedTags: ['accessibility'],
    }

    render(<ProductFilters {...propsWithSelectedTags} />)

    const accessibilityTag = screen.getByRole('switch', { name: /accessibility/i })
    expect(accessibilityTag).toBeInTheDocument()
  })

  it('should show clear filters button when multiple tag filters are active', () => {
    const propsWithMultipleFilters = {
      ...mockProps,
      selectedTags: ['accessibility', 'grip'],
      minRating: 3,
    }

    render(<ProductFilters {...propsWithMultipleFilters} />)

    const clearButton = screen.getByText(/clear filters/i)
    expect(clearButton).toBeInTheDocument()
  })
})
