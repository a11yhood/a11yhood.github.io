import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Switch } from '@/components/ui/switch'

describe('Switch', () => {
  it('uses semantic token classes for unchecked state', () => {
    render(<Switch aria-label="Public collection" checked={false} />)

    const switchControl = screen.getByRole('switch', { name: /public collection/i })
    const switchThumb = switchControl.querySelector('[data-slot="switch-thumb"]')

    expect(switchControl).toHaveClass('data-[state=unchecked]:bg-muted')
    expect(switchControl).toHaveClass('data-[state=unchecked]:border-border')
    expect(switchThumb).toHaveClass('data-[state=unchecked]:bg-background')
    expect(switchThumb).toHaveClass('border-border')
  })

  it('uses semantic token classes for checked state', () => {
    render(<Switch aria-label="Public collection" checked />)

    const switchControl = screen.getByRole('switch', { name: /public collection/i })
    const switchThumb = switchControl.querySelector('[data-slot="switch-thumb"]')

    expect(switchControl).toHaveClass('data-[state=checked]:bg-primary/75')
    expect(switchControl).toHaveClass('data-[state=checked]:border-primary')
    expect(switchThumb).toHaveClass('data-[state=checked]:bg-primary-foreground')
    expect(switchThumb).toHaveClass('border-border')
  })
})
