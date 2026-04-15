import { describe, it, expect, beforeAll } from 'vitest'
import { describeWithBackend } from '../helpers/with-backend'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { ProductSubmission } from '@/components/ProductSubmission'
import type { UserData } from '@/lib/types'
import { APIService } from '@/lib/api'
import { DEV_USERS, getDevToken } from '@/lib/dev-users'

/**
 * Integration: existing product flow using live backend.
 * Creates a product via API, then verifies the submission dialog shows
 * the existing-product state when the same URL is checked.
 */
describeWithBackend('ProductSubmission (existing product via backend)', () => {
  const user: UserData = {
    id: '',
    username: '',
    avatarUrl: 'https://example.com/a.png',
  }

  const authToken = getDevToken(DEV_USERS.user.role)
  const uniqueUrl = `https://github.com/a11yhood/test-repo-${Date.now()}`

  const testProductUrl = uniqueUrl

  beforeAll(async () => {
    // Ensure API calls carry our dev token
    APIService.setAuthTokenGetter(async () => authToken)

    // Derive authenticated user identity from runtime auth token
    const authUser = await APIService.getCurrentUser()
    user.id = authUser.id
    user.username = authUser.username

    // Create a product owned by this user
    await APIService.createProduct({
      name: `Integration Product ${Date.now()}`,
      description: 'An integration test product with sufficient description content',
      type: 'Software',
      sourceUrl: uniqueUrl,
      imageUrl: 'https://example.com/image.png',
      origin: 'user-submitted',
      tags: ['integration'],
    } as any)
  }, 30000)

  it('detects existing product and shows exists view', async () => {
    const onSubmit = () => {}

    render(
      <BrowserRouter>
        <ProductSubmission user={user} onSubmit={onSubmit} />
      </BrowserRouter>
    )

    // Open dialog
    fireEvent.click(screen.getByText('Submit Product'))

    // Enter the same URL and check
    const urlInput = await screen.findByLabelText('Product URL')
    fireEvent.change(urlInput, { target: { value: testProductUrl } })
    fireEvent.blur(urlInput)
    const checkButton = screen.queryByRole('button', { name: /Check/i })
    if (checkButton) {
      fireEvent.click(checkButton)
    }

    // Expect the existing product panel
    await waitFor(() => {
      expect(screen.getByText('Product Already Exists')).toBeInTheDocument()
    }, { timeout: 30000 })
  }, 35000)
})
