import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import App from '@/App'
import { AuthProvider } from '@/contexts/AuthContext'

// Accessibility: "Skip to main content" should be focusable and move focus to the main region
describe('Accessibility: Skip to Main Content', () => {
  it('focuses the main region when the skip link is activated', async () => {
    const user = userEvent.setup()

    render(
      <MemoryRouter>
        <AuthProvider>
          <App />
        </AuthProvider>
      </MemoryRouter>
    )

    const skipLink = screen.getByRole('link', { name: /skip to main content/i })

    // The skip link should be tabbable and receive focus
    await user.tab()
    expect(skipLink).toHaveFocus()

    // Activate the skip link
    await user.keyboard('{Enter}')

    // Expect focus to move to the main landmark
    const main = screen.getByRole('main')
    expect(main).toHaveFocus()
  })
})
