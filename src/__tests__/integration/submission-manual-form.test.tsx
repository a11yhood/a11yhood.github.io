import { describe, it, expect, beforeAll } from 'vitest'
import { describeWithBackend } from '../helpers/with-backend'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { ProductSubmission } from '@/components/ProductSubmission'
import type { UserData } from '@/lib/types'
import { APIService } from '@/lib/api'
import { DEV_USERS, getDevToken } from '@/lib/dev-users'

/**
 * Integration: manual form appears after URL check.
 * Uses an unsupported domain URL to avoid dependence on external scraper latency.
 */
describeWithBackend('ProductSubmission (manual form on new GitHub URL)', () => {
  const user: UserData = {
    id: DEV_USERS.user.id,
    username: DEV_USERS.user.username,
    avatarUrl: 'https://example.com/a.png',
  }

  const authToken = getDevToken(DEV_USERS.user.role)
  const uniqueUrl = `https://notinthelist-${Date.now()}.invalid/product`

  beforeAll(async () => {
    // Ensure API calls carry our dev token and user exists
    APIService.setAuthTokenGetter(async () => authToken)
  })

  it('shows manual form prefill after URL check', async () => {
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

    await waitFor(() => {
      expect(screen.queryByLabelText(/Product Name/i)).toBeInTheDocument()
    }, { timeout: 20000 })

    const sourceUrlInput = screen.queryByLabelText(/Source URL/i) as HTMLInputElement | null
    expect(sourceUrlInput).not.toBeNull()
    expect(sourceUrlInput!.value).toContain('https://notinthelist-')
  }, 25000)
})
