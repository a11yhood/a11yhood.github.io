import { describe, it, expect, beforeAll } from 'vitest'
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
describe('ProductSubmission (existing product via backend)', () => {
  const user: UserData = {
    id: DEV_USERS.user.id,
    login: DEV_USERS.user.login,
    avatarUrl: 'https://example.com/a.png',
  }

  const authToken = getDevToken(user.id)
  const uniqueUrl = `https://github.com/a11yhood/test-repo-${Date.now()}`

  beforeAll(async () => {
    // Ensure API calls carry our dev token
    APIService.setAuthTokenGetter(async () => authToken)

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
  })

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
    fireEvent.change(urlInput, { target: { value: uniqueUrl } })
    fireEvent.blur(urlInput)

    // Expect the existing product panel
    await waitFor(() => {
      expect(screen.getByText('Product Already Exists')).toBeInTheDocument()
    })
  })
})
