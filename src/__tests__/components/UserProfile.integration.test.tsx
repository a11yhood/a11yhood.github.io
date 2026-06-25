import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import { describeWithBackend } from '../helpers/with-backend'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route, useNavigate, useParams } from 'react-router-dom'
import { UserProfile } from '@/components/UserProfile'
import { ProductDetail } from '@/components/ProductDetail'
import { APIService } from '@/lib/api'
import { DEV_USERS, getDevToken } from '@/lib/dev-users'
import { getValidProductType } from '../testData'
import type { Product, UserAccount, UserData } from '@/lib/types'

vi.mock('@/components/UserRequestsPanel', () => ({
  UserRequestsPanel: () => <div data-testid="user-requests-panel" />,
}))

const API_BASE = (globalThis as any).__TEST_API_BASE__

let userAccount: UserAccount
let userData: UserData
let ownedProduct: Product
let authHeader: { Authorization: string }

async function createOwnedProduct(): Promise<void> {
  const product = await APIService.createProduct({
    name: `Managed Product ${Date.now()}`,
    type: getValidProductType('user-submitted'),
    source: 'user-submitted',
    sourceUrl: `https://github.com/test/user-profile-${Date.now()}`,
    description: 'Test product for user profile integration tests',
    tags: [],
    editorIds: [userAccount.id],
  })

  ownedProduct = {
    id: product.id,
    name: product.name,
    type: product.type,
    source: product.source,
    description: product.description ?? '',
    tags: product.tags ?? [],
    createdAt: product.createdAt ? new Date(product.createdAt).getTime() : Date.now(),
    sourceUrl: product.sourceUrl,
    editorIds: product.editorIds ?? [],
  }
}

async function deleteOwnedProduct(): Promise<void> {
  if (!ownedProduct) return
  try {
    const response = await fetch(`${API_BASE}/products/${ownedProduct.id}`, {
      method: 'DELETE',
      headers: authHeader,
    })

    if (!response.ok) {
      const details = await response.text().catch(() => '')
      console.warn(
        `[UserProfile.integration.test] Cleanup failed for product ${ownedProduct.id}: ${response.status} ${response.statusText} ${details}`
      )
    }
  } catch (error) {
    console.warn(
      `[UserProfile.integration.test] Cleanup request threw for product ${ownedProduct.id}:`,
      error
    )
  }
}

describeWithBackend('UserProfile owned products navigation', () => {
  beforeAll(async () => {
    userAccount = {
      ...DEV_USERS.admin,
      role: DEV_USERS.admin.role,
      createdAt: new Date().toISOString(),
      joinedAt: new Date().toISOString(),
      lastActive: new Date().toISOString(),
      avatarUrl: undefined,
    }
    userData = {
      id: userAccount.id,
      username: userAccount.username,
      avatarUrl: userAccount.avatarUrl,
    }
    authHeader = { Authorization: `Bearer ${getDevToken('admin')}` }
    APIService.setAuthTokenGetter(async () => getDevToken('admin'))
    await createOwnedProduct()
  })

  afterAll(async () => {
    await deleteOwnedProduct()
  })

  function ProfileRoute() {
    const navigate = useNavigate()
    return (
      <UserProfile
        userAccount={userAccount}
        user={userData}
        onUpdate={() => {}}
        onProductClick={(product) => navigate(`/product/${product.id}`)}
      />
    )
  }

  function ProductDetailRoute() {
    const { productId } = useParams()
    const product = productId === ownedProduct.id ? ownedProduct : ownedProduct

    return (
      <ProductDetail
        product={product}
        ratings={[]}
        discussions={[]}
        user={userData}
        userAccount={userAccount}
        userCollections={[]}
        onBack={() => {}}
        onRate={() => {}}
        onDiscuss={() => {}}
        onAddTag={() => {}}
        allTags={product.tags || []}
      />
    )
  }

  it('opens the full product detail when clicking an owned product card', async () => {
    const ownedProductsSpy = vi
      .spyOn(APIService, 'getOwnedProducts')
      .mockResolvedValue([ownedProduct])

    const user = userEvent.setup()

    render(
      <MemoryRouter initialEntries={['/account']}>
        <Routes>
          <Route path="/account" element={<ProfileRoute />} />
          <Route path="/product/:productId" element={<ProductDetailRoute />} />
        </Routes>
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText(/Products you can edit/i)).toBeInTheDocument()
    })

    await screen.findByText(ownedProduct.name, {}, { timeout: 10000 })

    await user.click(screen.getByText(ownedProduct.name))

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: ownedProduct.name, level: 1 })).toBeInTheDocument()
    })

    expect(screen.getAllByText(ownedProduct.name).length).toBeGreaterThan(0)
    ownedProductsSpy.mockRestore()
  }, 15000)
})
