import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { CollectionsPage } from '@/App'
import type { Collection, Product, UserData } from '@/lib/types'

const emptyCollections: Collection[] = []
const emptyProducts: Product[] = []

function renderPage(user: UserData | null) {
  return render(
    <MemoryRouter>
      <CollectionsPage
        collections={emptyCollections}
        products={emptyProducts}
        user={user}
        onDeleteCollection={vi.fn()}
        onEditCollection={vi.fn()}
        onCreateCollection={vi.fn()}
      />
    </MemoryRouter>
  )
}

describe('CollectionsPage auth-gating', () => {
  it('hides Create Collection button for unauthenticated users', () => {
    renderPage(null)
    expect(screen.queryByRole('button', { name: /create collection/i })).toBeNull()
  })

  it('shows Create Collection button for authenticated users', () => {
    renderPage({ id: 'u1', login: 'alice' })
    expect(screen.getByRole('button', { name: /create collection/i })).toBeInTheDocument()
  })
})
