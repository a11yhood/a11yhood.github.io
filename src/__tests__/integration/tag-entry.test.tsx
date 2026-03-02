import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BrowserRouter } from 'react-router-dom'
import { ProductSubmission } from '@/components/ProductSubmission'
import type { UserData } from '@/lib/types'
import { APIService } from '@/lib/api'
import { DEV_USERS, getDevToken } from '@/lib/dev-users'

/**
 * Integration: Tests tag entry functionality with comma-separated values
 * and Enter key submission using the actual backend.
 */
describe('ProductSubmission - Tag Entry (Backend Integration)', () => {
  const user: UserData = {
    id: DEV_USERS.user.id,
    login: DEV_USERS.user.login,
    avatarUrl: 'https://example.com/a.png',
  }

  const authToken = getDevToken(user.id)
  const uniqueUrl = `https://github.com/test/tag-test-${Date.now()}`

  beforeAll(async () => {
    // Ensure API calls use dev token
    APIService.setAuthTokenGetter(async () => authToken)
  })

  afterAll(() => {
    // Restore global auth token getter to prevent test pollution
    APIService.setAuthTokenGetter(async () => null)
  })

  async function openFormWithUrl(url?: string) {
    const testUrl = url || uniqueUrl
    fireEvent.click(screen.getByText('Submit Product'))
    
    const urlInput = await screen.findByLabelText('Product URL')
    fireEvent.change(urlInput, { target: { value: testUrl } })
    fireEvent.click(screen.getByText('Check'))

    // Wait for manual form to appear
    await waitFor(() => {
      expect(screen.getByLabelText(/Product Name/i)).toBeInTheDocument()
    })
  }

  it('should add a single tag when Enter is pressed', async () => {
    render(
      <BrowserRouter>
        <ProductSubmission user={user} onSubmit={() => {}} />
      </BrowserRouter>
    )

    await openFormWithUrl()

    const tagInput = screen.getByPlaceholderText(/Add tags/i)
    fireEvent.change(tagInput, { target: { value: 'grip' } })
    fireEvent.keyDown(tagInput, { key: 'Enter' })

    await waitFor(() => {
      expect(screen.getByText('grip')).toBeInTheDocument()
    })

    // Verify input is cleared after adding
    expect(tagInput).toHaveValue('')
  })

  it('should add multiple comma-separated tags when Enter is pressed', async () => {
    render(
      <BrowserRouter>
        <ProductSubmission user={user} onSubmit={() => {}} />
      </BrowserRouter>
    )

    await openFormWithUrl(`https://github.com/test/multi-tag-${Date.now()}`)

    const tagInput = screen.getByPlaceholderText(/Add tags/i)
    fireEvent.change(tagInput, { target: { value: 'grip, eating utensils, dexterity' } })
    fireEvent.keyDown(tagInput, { key: 'Enter' })

    await waitFor(() => {
      expect(screen.getByText('grip')).toBeInTheDocument()
      expect(screen.getByText('eating utensils')).toBeInTheDocument()
      expect(screen.getByText('dexterity')).toBeInTheDocument()
    })

    // Verify input is cleared after adding
    expect(tagInput).toHaveValue('')
  })

  it('should add comma-separated tags when Add button is clicked', async () => {
    render(
      <BrowserRouter>
        <ProductSubmission user={user} onSubmit={() => {}} />
      </BrowserRouter>
    )

    await openFormWithUrl(`https://github.com/test/button-tag-${Date.now()}`)

    const tagInput = screen.getByPlaceholderText(/Add tags/i)
    fireEvent.change(tagInput, { target: { value: 'rubber tubing, forks' } })
    fireEvent.click(screen.getByRole('button', { name: /^Add$/i }))

    await waitFor(() => {
      expect(screen.getByText('rubber tubing')).toBeInTheDocument()
      expect(screen.getByText('forks')).toBeInTheDocument()
    })

    // Verify input is cleared after adding
    expect(tagInput).toHaveValue('')
  })

  it('should not add duplicate tags from comma-separated input', async () => {
    render(
      <BrowserRouter>
        <ProductSubmission user={user} onSubmit={() => {}} />
      </BrowserRouter>
    )

    await openFormWithUrl(`https://github.com/test/dup-tag-${Date.now()}`)

    const tagInput = screen.getByPlaceholderText(/Add tags/i)

    // Add "grip" once
    fireEvent.change(tagInput, { target: { value: 'grip' } })
    fireEvent.keyDown(tagInput, { key: 'Enter' })
    
    await waitFor(() => {
      expect(screen.getByText('grip')).toBeInTheDocument()
    })

    // Try to add "grip" again with comma-separated values
    fireEvent.change(tagInput, { target: { value: 'grip, spoon' } })
    fireEvent.keyDown(tagInput, { key: 'Enter' })

    await waitFor(() => {
      expect(screen.getByText('spoon')).toBeInTheDocument()
    })

    // Should still only have one "grip" remove button
    const removeGripButtons = screen.getAllByRole('button', { name: /Remove grip tag/i })
    expect(removeGripButtons).toHaveLength(1)
  })

  it('should trim whitespace from comma-separated tags', async () => {
    render(
      <BrowserRouter>
        <ProductSubmission user={user} onSubmit={() => {}} />
      </BrowserRouter>
    )

    await openFormWithUrl(`https://github.com/test/trim-tag-${Date.now()}`)

    const tagInput = screen.getByPlaceholderText(/Add tags/i)
    fireEvent.change(tagInput, { target: { value: '  grip  ,  eating utensils  ,  dexterity  ' } })
    fireEvent.keyDown(tagInput, { key: 'Enter' })

    await waitFor(() => {
      expect(screen.getByText('grip')).toBeInTheDocument()
      expect(screen.getByText('eating utensils')).toBeInTheDocument()
      expect(screen.getByText('dexterity')).toBeInTheDocument()
    })
  })

  it('should save tags when submitting a new product', async () => {
    const user = userEvent.setup()
    let submittedProduct: any = null
    
    const testUser: UserData = {
      id: DEV_USERS.user.id,
      login: DEV_USERS.user.login,
      avatarUrl: 'https://example.com/a.png',
    }
    
    render(
      <BrowserRouter>
        <ProductSubmission
          user={testUser}
          onSubmit={(productData) => {
            submittedProduct = productData
          }}
        />
      </BrowserRouter>
    )

    const testUrl = `https://github.com/test/save-tags-${Date.now()}`
    fireEvent.click(screen.getByText('Submit Product'))
    
    const urlInput = await screen.findByLabelText('Product URL')
    fireEvent.change(urlInput, { target: { value: testUrl } })
    fireEvent.click(screen.getByText('Check'))

    // Wait for manual form to appear
    await waitFor(() => {
      expect(screen.getByLabelText(/Product Name/i)).toBeInTheDocument()
    })

    // Fill required fields first
    const nameInput = screen.getByLabelText(/Product Name/i)
    fireEvent.change(nameInput, { target: { value: 'Test Product with Tags' } })

    const typeInput = screen.getByLabelText(/Product Type/i)
    await user.click(typeInput)
    const softwareOption = await screen.findByRole('option', { name: 'Software' })
    await user.click(softwareOption)

    const descInput = screen.getByLabelText(/Description/i)
    fireEvent.change(descInput, { target: { value: 'A test product with tags' } })

    // Add tags
    const tagInput = screen.getByPlaceholderText(/Add tags/i)
    fireEvent.change(tagInput, { target: { value: 'grip, eating utensils, dexterity' } })
    fireEvent.keyDown(tagInput, { key: 'Enter' })

    await waitFor(() => {
      expect(screen.getByText('grip')).toBeInTheDocument()
      expect(screen.getByText('eating utensils')).toBeInTheDocument()
      expect(screen.getByText('dexterity')).toBeInTheDocument()
    })

    // Submit the form
    const submitButton = screen.getByRole('button', { name: /Submit Product/i })
    fireEvent.click(submitButton)

    // Verify the onSubmit was called with tags
    await waitFor(() => {
      expect(submittedProduct).not.toBeNull()
    }, { timeout: 3000 })

    expect(submittedProduct?.tags).toEqual(['grip', 'eating utensils', 'dexterity'])
    expect(submittedProduct?.name).toBe('Test Product with Tags')
  })
})
