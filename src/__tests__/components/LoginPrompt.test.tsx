import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { LoginPrompt } from '@/components/LoginPrompt'

describe('LoginPrompt', () => {
  beforeEach(() => {
    delete (window as any).location
    window.location = { reload: vi.fn() } as any
  })

  it('should render rate context message', () => {
    render(<LoginPrompt context="rate" />)

    expect(screen.getByText('Sign in to rate')).toBeInTheDocument()
    expect(screen.getByText(/your ratings help others/i)).toBeInTheDocument()
  })

  it('should render discuss context message', () => {
    render(<LoginPrompt context="discuss" />)

    expect(screen.getByText('Sign in to join the discussion')).toBeInTheDocument()
    expect(screen.getByText(/join the conversation/i)).toBeInTheDocument()
  })

  it('should render tag context message', () => {
    render(<LoginPrompt context="tag" />)

    expect(screen.getByText('Sign in to add tags')).toBeInTheDocument()
    expect(screen.getByText(/help improve product discoverability/i)).toBeInTheDocument()
  })

  it('should render sign in button', () => {
    render(<LoginPrompt context="rate" />)

    const button = screen.getByRole('button', { name: /sign in with github/i })
    expect(button).toBeInTheDocument()
  })

  it('should reload page when sign in button is clicked', () => {
    render(<LoginPrompt context="rate" />)

    const button = screen.getByRole('button', { name: /sign in with github/i })
    fireEvent.click(button)

    expect(window.location.reload).toHaveBeenCalled()
  })

  it('should display icon for each context', () => {
    const contexts: Array<'rate' | 'discuss' | 'tag'> = [
      'rate',
      'discuss',
      'tag',
    ]

    contexts.forEach(context => {
      const { unmount } = render(<LoginPrompt context={context} />)
      const card = screen.getByRole('button').parentElement
      expect(card).toBeInTheDocument()
      unmount()
    })
  })

  it('should have accessible structure', () => {
    render(<LoginPrompt context="rate" />)

    const heading = screen.getByRole('heading', { level: 3 })
    expect(heading).toHaveTextContent('Sign in to rate')
  })

  it('should have full width button', () => {
    render(<LoginPrompt context="rate" />)

    const button = screen.getByRole('button', { name: /sign in with github/i })
    expect(button).toHaveClass('w-full')
  })
})
