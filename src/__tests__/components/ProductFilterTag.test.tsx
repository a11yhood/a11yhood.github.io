import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ProductFilterTag } from '@/components/ProductFilterTag'

describe('ProductFilterTag', () => {
  it('renders the tag text', () => {
    render(<ProductFilterTag tag="accessibility" selected={false} />)
    expect(screen.getByText('accessibility')).toBeInTheDocument()
  })

  it('calls onTagClick with the correct tag when clicked', () => {
    const onTagClick = vi.fn()
    render(<ProductFilterTag tag="mobility" selected={false} onTagClick={onTagClick} />)

    fireEvent.click(screen.getByRole('button'))

    expect(onTagClick).toHaveBeenCalledOnce()
    expect(onTagClick).toHaveBeenCalledWith('mobility')
  })

  it('sets aria-pressed to true when selected', () => {
    render(<ProductFilterTag tag="vision" selected={true} onTagClick={vi.fn()} />)

    expect(screen.getByRole('button')).toHaveAttribute('aria-pressed', 'true')
  })

  it('sets aria-pressed to false when not selected', () => {
    render(<ProductFilterTag tag="vision" selected={false} onTagClick={vi.fn()} />)

    expect(screen.getByRole('button')).toHaveAttribute('aria-pressed', 'false')
  })

  it('is disabled when onTagClick is not provided', () => {
    render(<ProductFilterTag tag="hearing" selected={false} />)

    expect(screen.getByRole('button')).toBeDisabled()
  })

  it('is not disabled when onTagClick is provided', () => {
    render(<ProductFilterTag tag="hearing" selected={false} onTagClick={vi.fn()} />)

    expect(screen.getByRole('button')).not.toBeDisabled()
  })

  it('renders with card variant by default', () => {
    render(<ProductFilterTag tag="cognitive" selected={false} onTagClick={vi.fn()} />)

    // card variant renders a Badge (span with badge styles)
    const button = screen.getByRole('button')
    expect(button).toBeInTheDocument()
    // Badge component renders inside the button; tag text is visible
    expect(screen.getByText('cognitive')).toBeInTheDocument()
  })

  it('renders with list variant', () => {
    render(<ProductFilterTag tag="cognitive" selected={false} onTagClick={vi.fn()} variant="list" />)

    const button = screen.getByRole('button')
    expect(button).toBeInTheDocument()
    expect(screen.getByText('cognitive')).toBeInTheDocument()
  })

  it('has an accessible aria-label describing the filter action', () => {
    render(<ProductFilterTag tag="motor" selected={false} onTagClick={vi.fn()} />)

    expect(screen.getByRole('button')).toHaveAttribute('aria-label', 'Filter by tag motor')
  })

  it('does not propagate click events to parent', () => {
    const parentClick = vi.fn()
    const onTagClick = vi.fn()

    render(
      <div onClick={parentClick}>
        <ProductFilterTag tag="deaf" selected={false} onTagClick={onTagClick} />
      </div>
    )

    fireEvent.click(screen.getByRole('button'))

    expect(onTagClick).toHaveBeenCalledOnce()
    expect(parentClick).not.toHaveBeenCalled()
  })
})
