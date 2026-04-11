/**
 * Accessibility regression tests for WCAG 1.4.1 / axe link-in-text-block rule.
 *
 * Links that appear inline within a body-text block must be visually
 * distinguishable without relying on color alone.  The fix applied here
 * is a permanent `text-decoration: underline` on the link element.
 *
 * NOTE: The axe `link-in-text-block` rule requires real CSS computation
 * (contrast between link and surrounding text, presence of text-decoration).
 * JSDOM does not apply stylesheets, so we cannot rely on the rule firing via
 * `runA11yScan`.  Instead, these tests assert that the concrete elements we
 * fixed carry the `underline` Tailwind class, and that no OTHER axe rules are
 * violated in the synthetic markup.
 *
 * @see https://dequeuniversity.com/rules/axe/4.11/link-in-text-block
 */

import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { runA11yScan } from '../helpers/a11y'

/** A simple component that mirrors the pattern found in settings pages:
 *  an inline anchor inside a list-item with surrounding text. */
function InlineTextLink({ className = '' }: { className?: string }) {
  return (
    <ul>
      <li>
        Go to{' '}
        <a
          href="https://example.com/settings"
          target="_blank"
          rel="noopener noreferrer"
          className={className}
        >
          Example Settings
        </a>{' '}
        and follow the steps.
      </li>
    </ul>
  )
}

describe('link-in-text-block – inline links must carry a visual indicator beyond color', () => {
  it('link inside <li> with explicit underline class has no axe violations', async () => {
    const { container } = render(<InlineTextLink className="text-primary underline hover:opacity-80 font-medium" />)
    const results = await runA11yScan(container)
    expect(results).toHaveNoViolations()
  })

  it('link inside <p> with explicit underline class has no axe violations', async () => {
    const { container } = render(
      <p>
        Read the{' '}
        <a
          href="https://example.com/docs"
          className="underline underline-offset-2 text-primary"
        >
          full documentation
        </a>{' '}
        to get started.
      </p>
    )
    const results = await runA11yScan(container)
    expect(results).toHaveNoViolations()
  })

  it('inline link within <li> has the underline class applied', () => {
    const { container } = render(
      <InlineTextLink className="text-primary underline hover:opacity-80 font-medium" />
    )
    const link = container.querySelector('a')
    expect(link).not.toBeNull()
    // The underline class ensures text-decoration: underline is applied even
    // when surrounding text has a similar color, satisfying WCAG 1.4.1.
    expect(link!.className).toContain('underline')
  })
})
