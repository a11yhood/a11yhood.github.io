import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { StarRating } from '@/components/StarRating'

describe('StarRating', () => {
  it('should render 5 stars', () => {
    render(<StarRating value={0} onChange={vi.fn()} />)
    
    const stars = screen.getAllByRole('radio')
    expect(stars).toHaveLength(5)
  })

  it('should display current rating', () => {
    render(<StarRating value={3} onChange={vi.fn()} />)
    
    const checkedStar = screen.getByRole('radio', { checked: true })
    expect(checkedStar).toHaveAttribute('aria-label', 'Rate 3 stars')
  })

  it('should call onChange when star is clicked', () => {
    const onChange = vi.fn()
    render(<StarRating value={0} onChange={onChange} />)
    
    const stars = screen.getAllByRole('radio')
    fireEvent.click(stars[2])
    
    expect(onChange).toHaveBeenCalledWith(3)
  })

  it('should show read-only state', () => {
    render(<StarRating value={3} readonly />)
    
    const stars = screen.getAllByRole('radio')
    expect(stars).toHaveLength(5)
    const buttons = screen.queryAllByRole('button')
    expect(buttons).toHaveLength(0)
  })

  it('should handle hover state for interactive rating', () => {
    const onChange = vi.fn()
    render(<StarRating value={2} onChange={onChange} />)
    
    const stars = screen.getAllByRole('radio')
    fireEvent.mouseEnter(stars[3])
    
    expect(stars[3]).toHaveAttribute('aria-label', 'Rate 4 stars')
  })

  it('should show rating value when showValue is true', () => {
    render(<StarRating value={3.7} showValue />)
    
    expect(screen.getByText('3.7')).toBeInTheDocument()
  })

  it('should handle zero rating', () => {
    render(<StarRating value={0} readonly />)
    
    const stars = screen.getAllByRole('radio')
    expect(stars).toHaveLength(5)
  })

  it('should handle keyboard navigation', () => {
    const onChange = vi.fn()
    render(<StarRating value={2} onChange={onChange} />)
    
    const stars = screen.getAllByRole('radio')
    fireEvent.keyDown(stars[3], { key: 'Enter' })
    
    expect(onChange).toHaveBeenCalledWith(4)
  })
})
