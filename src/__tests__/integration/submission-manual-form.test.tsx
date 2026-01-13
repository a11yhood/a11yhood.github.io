import { describe, it, expect, beforeAll } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { ProductSubmission } from '@/components/ProductSubmission'
import type { UserData } from '@/lib/types'
import { APIService } from '@/lib/api'
import { DEV_USERS, getDevToken } from '@/lib/dev-users'

/**
 * Integration: manual form appears when scraping fails or product not found.
 * Uses a unique GitHub URL and live backend. Scraping may fail (offline),
 * which is acceptable — the component should fall back to the manual form.
 */
describe('ProductSubmission (manual form on new GitHub URL)', () => {
  const user: UserData = {
    id: DEV_USERS.user.id,
    login: DEV_USERS.user.login,
    avatarUrl: 'https://example.com/a.png',
  }

  const authToken = getDevToken(user.id)
  const uniqueUrl = `https://github.com/a11yhood/does-not-exist-${Date.now()}`

  beforeAll(async () => {
    // Ensure API calls carry our dev token and user exists
    APIService.setAuthTokenGetter(async () => authToken)
  })

  it('shows manual form and pre-fills Source URL', async () => {
    render(
      <BrowserRouter>
        <ProductSubmission user={user} onSubmit={() => {}} />
      </BrowserRouter>
    )

    // Open dialog
    fireEvent.click(screen.getByText('Submit Product'))

    const urlInput = await screen.findByLabelText('Product URL')
    fireEvent.change(urlInput, { target: { value: uniqueUrl } })
    fireEvent.click(screen.getByText('Check'))

    // Should show manual form with Source URL pre-filled
    await waitFor(() => {
      expect(screen.getByLabelText(/Product Name/i)).toBeInTheDocument()
    })

    const sourceUrlInput = screen.getByLabelText(/Source URL/i) as HTMLInputElement
    expect(sourceUrlInput.value).toContain('https://github.com/a11yhood/does-not-exist')
  })
})
