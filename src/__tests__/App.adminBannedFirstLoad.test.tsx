import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import App from '@/App'
import { AuthProvider } from '@/contexts/AuthContext'
import { APIService } from '@/lib/api'
import { DEV_USERS } from '@/lib/dev-users'
import type { UserAccount } from '@/lib/types'
import { createMockProduct, createMockUserAccount } from './helpers/create-mocks'

/**
 * Admins and moderators get "Include banned products" switched on automatically after sign-in.
 * The first load of /products must honor it, not wait for the sort or a filter to change.
 */

const visible = createMockProduct({ id: 'visible', slug: 'visible', name: 'Visible Product' })
const banned = createMockProduct({ id: 'banned', slug: 'banned', name: 'Banned Product', banned: true })

const renderAt = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <AuthProvider>
        <Routes>
          <Route path="/*" element={<App />} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  )

// Long enough to outlast auth, the auto-enable effect, and any follow-up fetch.
const settle = () => new Promise((resolve) => setTimeout(resolve, 900))

describe('App first load with Include banned products', () => {
  let getAllProductsSpy: ReturnType<typeof vi.spyOn>

  const signInAs = (account: UserAccount) => {
    vi.spyOn(APIService, 'getCurrentUser').mockResolvedValue(account)
  }
  const admin = () =>
    createMockUserAccount({ id: DEV_USERS.admin.id, username: DEV_USERS.admin.username, role: 'admin' })

  beforeEach(() => {
    vi.spyOn(APIService, 'getUserCollections').mockResolvedValue([])
    vi.spyOn(APIService, 'getPublicCollections').mockResolvedValue([])
    vi.spyOn(APIService, 'getProductSources').mockResolvedValue([])
    vi.spyOn(APIService, 'getPopularTags').mockResolvedValue([])
    vi.spyOn(APIService, 'getFilteredTags').mockResolvedValue([])
    vi.spyOn(APIService, 'getAllRatings').mockResolvedValue([])
    vi.spyOn(APIService, 'getAllBlogPosts').mockResolvedValue([])
    vi.spyOn(APIService, 'getAllPendingRequests').mockResolvedValue([])
    vi.spyOn(APIService, 'logUserActivity').mockResolvedValue({} as never)
    vi.spyOn(APIService, 'getProductCount').mockImplementation(
      async (params?: { includeBanned?: boolean }) => (params?.includeBanned ? 2 : 1),
    )
    getAllProductsSpy = vi
      .spyOn(APIService, 'getAllProducts')
      .mockImplementation(
        async (params?: { includeBanned?: boolean }) => {
          if (params?.includeBanned) return [banned, visible] as never
          // Slower than the banned fetch, so a stale list without banned products would overwrite it.
          await new Promise((resolve) => setTimeout(resolve, 200))
          return [visible] as never
        },
      )
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('shows banned products to an admin on load, without changing the sort', async () => {
    signInAs(admin())
    renderAt('/products')

    expect(await screen.findByText('Banned Product', {}, { timeout: 5000 })).toBeInTheDocument()
    expect(screen.getByRole('switch', { name: /include banned/i })).toBeChecked()
    expect(screen.getByRole('combobox', { name: /sort by/i })).toHaveTextContent('Added')
  }, 15000)

  it('keeps banned products once an admin navigates from the home page to /products', async () => {
    signInAs(admin())
    const user = userEvent.setup()
    renderAt('/')

    await waitFor(() => expect(getAllProductsSpy).toHaveBeenCalled())
    await settle()
    await user.click(screen.getAllByRole('link', { name: 'Products' })[0])

    expect(await screen.findByText('Banned Product', {}, { timeout: 5000 })).toBeInTheDocument()
    await settle()
    expect(screen.getByText('Banned Product')).toBeInTheDocument()
  }, 15000)

  it('does not add banned products to the home page for an admin', async () => {
    signInAs(admin())
    renderAt('/')

    await waitFor(() => expect(getAllProductsSpy).toHaveBeenCalled())
    await settle()

    expect(vi.mocked(APIService.getAllProducts).mock.calls.some(([params]) => params?.includeBanned)).toBe(false)
  }, 15000)

  it('still loads only once for a regular user', async () => {
    signInAs(createMockUserAccount({ id: 'user-1', username: 'test-user', role: 'user' }))
    renderAt('/products')

    expect(await screen.findByText('Visible Product', {}, { timeout: 5000 })).toBeInTheDocument()
    await settle()

    expect(getAllProductsSpy).toHaveBeenCalledTimes(1)
    expect(vi.mocked(APIService.getAllProducts).mock.calls[0][0]?.includeBanned).toBe(false)
    expect(screen.queryByText('Banned Product')).not.toBeInTheDocument()
  }, 15000)
})
