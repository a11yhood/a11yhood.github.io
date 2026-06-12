import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Switch } from '@/components/ui/switch'

describe('Switch', () => {
  it('uses a higher-contrast unchecked track and thumb style', () => {
    render(<Switch aria-label="Public collection" checked={false} />)

    const switchControl = screen.getByRole('switch', { name: /public collection/i })
    const switchThumb = switchControl.querySelector('[data-slot="switch-thumb"]')

    expect(switchControl).toHaveClass('data-[state=unchecked]:bg-muted')
    expect(switchThumb).toHaveClass('data-[state=unchecked]:bg-foreground')
  })

  it('keeps checked switch styles readable', () => {
    render(<Switch aria-label="Public collection" checked />)

    const switchControl = screen.getByRole('switch', { name: /public collection/i })
    const switchThumb = switchControl.querySelector('[data-slot="switch-thumb"]')

    expect(switchControl).toHaveClass('data-[state=checked]:bg-primary')
    expect(switchThumb).toHaveClass('data-[state=checked]:bg-primary-foreground')
  })
})
