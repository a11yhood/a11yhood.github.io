import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route, useNavigate, useParams } from 'react-router-dom'
import { UserProfile } from '@/components/UserProfile'
import { ProductDetail } from '@/components/ProductDetail'
import { APIService } from '@/lib/api'
import { getValidProductType } from '../testData'
import type { Product, UserAccount, UserData } from '@/lib/types'

const API_BASE = 'http://localhost:8000/api'

let userAccount: UserAccount
let userData: UserData
let ownedProduct: Product
let authHeader: { Authorization: string }

async function createTestUser(): Promise<void> {
  const userId = `profile-user-${Date.now()}`
  
  // Retry logic for user creation (handles transient DB issues)
  let lastError: Error | null = null
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(`${API_BASE}/users/${userId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: `profileuser${Date.now()}`,
          email: `profile${Date.now()}@example.com`,
        }),
      })

      if (res.ok) {
        const user = await res.json()
        userAccount = {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role ?? 'user',
          createdAt: user.created_at ?? user.createdAt ?? new Date().toISOString(),
          joinedAt: user.joined_at ?? user.joinedAt ?? new Date().toISOString(),
    lastActive: user.last_active ?? user.lastActive ?? new Date().toISOString(),
    avatarUrl: user.avatar_url ?? user.avatarUrl ?? undefined,
  }

  userData = {
    id: userAccount.id,
    login: userAccount.username,
    avatarUrl: userAccount.avatarUrl,
  }

  authHeader = { Authorization: `dev-token-${userAccount.id}` }
  APIService.setAuthTokenGetter(async () => authHeader.Authorization)
        return // Success
      }

      lastError = new Error(`Failed to create test user: ${res.status} ${res.statusText}`)
      
      // Wait before retry (exponential backoff)
      if (attempt < 2) {
        await new Promise(resolve => setTimeout(resolve, 100 * Math.pow(2, attempt)))
      }
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err))
      if (attempt < 2) {
        await new Promise(resolve => setTimeout(resolve, 100 * Math.pow(2, attempt)))
      }
    }
  }

  throw lastError || new Error('Failed to create test user after 3 attempts')
}

async function createOwnedProduct(): Promise<void> {
  const product = await APIService.createProduct({
    name: `Managed Product ${Date.now()}`,
    type: getValidProductType('user-submitted'),
    source: 'user-submitted',
    category: 'Software',
    sourceUrl: `https://github.com/test/user-profile-${Date.now()}`,
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
    updatedAt: product.updated_at ? new Date(product.updated_at).getTime() : Date.now(),
    sourceUrl: product.source_url ?? product.sourceUrl,
    editorIds: product.editor_ids ?? product.editorIds ?? [],
  }
}

async function deleteOwnedProduct(): Promise<void> {
  if (!ownedProduct) return
  await fetch(`${API_BASE}/products/${ownedProduct.id}`, {
    method: 'DELETE',
    headers: authHeader,
  }).catch(() => undefined)
}

describe('UserProfile owned products navigation', () => {
  beforeAll(async () => {
    await createTestUser()
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

    await waitFor(() => {
      expect(screen.getByText(ownedProduct.name)).toBeInTheDocument()
    })

    await user.click(screen.getByText(ownedProduct.name))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Back to Products/i })).toBeInTheDocument()
    })

    expect(screen.getAllByText(ownedProduct.name).length).toBeGreaterThan(0)
  })
})
