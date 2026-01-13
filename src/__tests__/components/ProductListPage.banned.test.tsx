import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { ProductListPage } from '@/App'
import type { Product, Rating, Collection, BlogPost, UserAccount, UserData } from '@/lib/types'

type Props = {
  canViewBanned: boolean
  includeBanned: boolean
  onIncludeBannedChange: (value: boolean) => void
  user?: UserData | null
  userAccount?: UserAccount | null
}

const baseProducts: Product[] = [
  {
    id: 'p1',
    name: 'Visible Product',
    description: 'A product',
    source: 'user-submitted',
    type: 'tool',
    tags: [],
    createdAt: Date.now(),
  },
  {
    id: 'p2',
    name: 'Banned Product',
    description: 'Restricted item',
    source: 'user-submitted',
    type: 'hardware',
    tags: [],
    createdAt: Date.now(),
    banned: true,
  },
]

const emptyRatings: Rating[] = []
const emptyCollections: Collection[] = []
const emptyPosts: BlogPost[] = []

function renderPage({ canViewBanned, includeBanned, onIncludeBannedChange, user, userAccount }: Props) {
  return render(
    <MemoryRouter>
      <ProductListPage
        products={baseProducts}
        ratings={emptyRatings}
        user={user ?? null}
        userAccount={userAccount ?? null}
        canViewBanned={canViewBanned}
        includeBanned={includeBanned}
        onIncludeBannedChange={onIncludeBannedChange}
        collections={emptyCollections}
        blogPosts={emptyPosts}
        onRate={vi.fn()}
        onDeleteProduct={vi.fn()}
        onCreateCollection={vi.fn()}
        onOpenCreateCollection={vi.fn()}
        searchQuery=""
        onSearchChange={vi.fn()}
        selectedTypes={[]}
        onTypeToggle={vi.fn()}
        selectedTags={[]}
        onTagToggle={vi.fn()}
        selectedSources={[]}
        onSourceToggle={vi.fn()}
        minRating={0}
        onMinRatingChange={vi.fn()}
        onClearFilters={vi.fn()}
      />
    </MemoryRouter>
  )
}

describe('ProductListPage banned toggle', () => {
  it('hides banned toggle for non-privileged users', () => {
    renderPage({ canViewBanned: false, includeBanned: false, onIncludeBannedChange: vi.fn() })
    expect(screen.queryByTestId('include-banned-switch')).toBeNull()
  })

  it('shows banned toggle for admins/moderators and calls handler', async () => {
    const user = userEvent.setup()
    const onToggle = vi.fn()
    const adminAccount: UserAccount = { id: 'admin', username: 'admin', role: 'admin' }

    renderPage({
      canViewBanned: true,
      includeBanned: false,
      onIncludeBannedChange: onToggle,
      user: { id: 'u1', login: 'admin' },
      userAccount: adminAccount,
    })

    const toggle = screen.getByTestId('include-banned-switch')
    await user.click(toggle)
    expect(onToggle).toHaveBeenCalledWith(true)
  })

  it('shows banned badge in results for privileged users when product is banned', () => {
    const adminAccount: UserAccount = { id: 'admin', username: 'admin', role: 'admin' }

    renderPage({
      canViewBanned: true,
      includeBanned: true,
      onIncludeBannedChange: vi.fn(),
      user: { id: 'u1', login: 'admin' },
      userAccount: adminAccount,
    })

    expect(screen.getByText('Banned')).toBeInTheDocument()
  })
})
