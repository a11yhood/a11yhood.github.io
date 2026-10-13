import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ShareButton } from '../../components/ShareButton'

describe('ShareButton', () => {
  beforeEach(() => {
    Object.defineProperty(navigator, 'share', { value: undefined, configurable: true })
  })

  it('has an accessible name that names the content type', () => {
    render(<ShareButton title="Foo" url="https://a11yhood.org/product/foo" label="product" />)
    expect(screen.getByRole('button', { name: 'Share this product' })).toBeInTheDocument()
  })

  it('offers copy link and social targets, with external links opening safely', async () => {
    const user = userEvent.setup()
    render(<ShareButton title="Foo" url="https://a11yhood.org/product/foo" />)
    await user.click(screen.getByRole('button', { name: /share this/i }))

    expect(screen.getByRole('menuitem', { name: /copy link/i })).toBeInTheDocument()
    const linkedin = screen.getByRole('menuitem', { name: /linkedin/i })
    expect(linkedin).toHaveAttribute('target', '_blank')
    expect(linkedin).toHaveAttribute('rel', expect.stringContaining('noopener'))
    expect(screen.getByRole('menuitem', { name: /mastodon/i })).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: /bluesky/i })).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: /email/i })).toHaveAttribute(
      'href',
      expect.stringMatching(/^mailto:/)
    )
    expect(screen.queryByRole('menuitem', { name: /via device/i })).not.toBeInTheDocument()
  })

  it('shows native share only when the browser supports it', async () => {
    const share = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'share', { value: share, configurable: true })
    const user = userEvent.setup()
    render(<ShareButton title="Foo" url="https://a11yhood.org/product/foo" />)
    await user.click(screen.getByRole('button', { name: /share this/i }))
    await user.click(screen.getByRole('menuitem', { name: /via device/i }))
    expect(share).toHaveBeenCalledWith({ title: 'Foo', url: 'https://a11yhood.org/product/foo' })
  })
})
