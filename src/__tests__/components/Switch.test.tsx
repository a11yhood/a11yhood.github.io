import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Switch } from '@/components/ui/switch'

describe('Switch', () => {
  it('uses a higher-contrast unchecked track and thumb style', () => {
    render(<Switch aria-label="Public collection" checked={false} />)

    const switchControl = screen.getByRole('switch', { name: /public collection/i })
    const switchThumb = switchControl.querySelector('[data-slot="switch-thumb"]')

    expect(switchControl).toHaveClass('data-[state=unchecked]:bg-slate-300')
    expect(switchControl).toHaveClass('data-[state=unchecked]:border-slate-500')
    expect(switchThumb).toHaveClass('data-[state=unchecked]:bg-background')
    expect(switchThumb).toHaveClass('data-[state=unchecked]:border-slate-700')
  })

  it('keeps checked switch styles readable', () => {
    render(<Switch aria-label="Public collection" checked />)

    const switchControl = screen.getByRole('switch', { name: /public collection/i })
    const switchThumb = switchControl.querySelector('[data-slot="switch-thumb"]')

    expect(switchControl).toHaveClass('data-[state=checked]:bg-primary/75')
    expect(switchThumb).toHaveClass('data-[state=checked]:bg-primary-foreground')
    expect(switchThumb).toHaveClass('data-[state=checked]:border-slate-700')
    expect(switchThumb).toHaveClass('shadow-[0_1px_2px_rgba(15,23,42,0.35),inset_0_0_0_1px_rgba(255,255,255,0.35)]')
  })
})
