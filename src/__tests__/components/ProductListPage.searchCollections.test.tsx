import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { ProductListPage } from '@/pages/ProductListPage'
import type { Product, Rating, Collection, BlogPost, UserAccount, UserData } from '@/lib/types'

const baseProducts: Product[] = [
  {
    id: 'p1',
    slug: 'product-one',
    name: 'Visible Product',
    description: 'A product',
    source: 'user-submitted',
    type: 'tool',
    tags: [],
    createdAt: Date.now(),
  },
]

const emptyRatings: Rating[] = []
const emptyPosts: BlogPost[] = []

function renderPage(overrides?: {
  searchQuery?: string
  searchInputValue?: string
  collections?: Collection[]
  user?: UserData | null
  userAccount?: UserAccount | null
}) {
  const collections = overrides?.collections || []
  return render(
    <MemoryRouter>
      <ProductListPage
        products={baseProducts}
        ratings={emptyRatings}
        user={overrides?.user ?? null}
        userAccount={overrides?.userAccount ?? null}
        canViewBanned={false}
        canModerate={false}
        includeBanned={false}
        onIncludeBannedChange={vi.fn()}
        collections={collections}
        blogPosts={emptyPosts}
        allProductSources={[]}
        popularTags={[]}
        filteredTags={[]}
        totalProductCount={baseProducts.length}
        currentPage={1}
        onPageChange={vi.fn()}
        pageSize={50}
        onPageSizeChange={vi.fn()}
        onRate={vi.fn()}
        onDeleteProduct={vi.fn()}
        onToggleBan={vi.fn()}
        onCreateCollection={vi.fn()}
        onOpenAddToCollection={vi.fn()}
        searchQuery={overrides?.searchQuery ?? ''}
        onSearchChange={vi.fn()}
        searchInputValue={overrides?.searchInputValue ?? ''}
        onSearchInputChange={vi.fn()}
        onSearchInputBlur={vi.fn()}
        onSearchInputKeyDown={vi.fn()}
        isSearching={false}
        selectedTags={[]}
        onTagToggle={vi.fn()}
        selectedSources={[]}
        onSourceToggle={vi.fn()}
        minRating={0}
        onMinRatingChange={vi.fn()}
        updatedSince={null}
        onUpdatedSinceChange={vi.fn()}
        sortBy="rating"
        sortOrder="desc"
        onSortChange={vi.fn()}
        onClearFilters={vi.fn()}
      />
    </MemoryRouter>
  )
}

describe('ProductListPage search collection cards', () => {
  it('shows matching collection cards when search query matches collection name', () => {
    const collections: Collection[] = [
      {
        id: 'c1',
        slug: 'test-collection',
        name: 'Test Collection',
        description: 'A matching collection',
        userId: 'u1',
        username: 'dev_user',
        entries: [],
        productSlugs: ['product-one'],
        isPublic: true,
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
      },
    ]

    renderPage({
      searchQuery: 'test',
      searchInputValue: 'test',
      collections,
    })

    expect(screen.getByRole('heading', { name: /collections \(1\)/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /view collection test collection/i })).toBeInTheDocument()
  })

  it('navigates to collection detail when pressing Enter on a matching collection card', async () => {
    const user = userEvent.setup()
    const collections: Collection[] = [
      {
        id: 'c1',
        slug: 'test-collection',
        name: 'Test Collection',
        userId: 'u1',
        username: 'dev_user',
        entries: [],
        productSlugs: [],
        isPublic: true,
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
      },
    ]

    renderPage({
      searchQuery: 'test',
      searchInputValue: 'test',
      collections,
    })

    const card = screen.getByRole('link', { name: /view collection test collection/i })
    await user.click(card)

    expect(card).toBeInTheDocument()
  })

  it('passes a collection entry when using the add button on a matching collection card', async () => {
    const user = userEvent.setup()
    const onOpenAddToCollection = vi.fn()
    const collections: Collection[] = [
      {
        id: 'c1',
        slug: 'test-collection',
        name: 'Test Collection',
        description: 'Nested collection target',
        userId: 'u1',
        username: 'dev_user',
        entries: [],
        productSlugs: [],
        isPublic: true,
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
      },
    ]

    render(
      <MemoryRouter>
        <ProductListPage
          products={baseProducts}
          ratings={emptyRatings}
          user={{ id: 'u1', username: 'dev_user' }}
          userAccount={null}
          canViewBanned={false}
          canModerate={false}
          includeBanned={false}
          onIncludeBannedChange={vi.fn()}
          collections={collections}
          blogPosts={emptyPosts}
          allProductSources={[]}
          popularTags={[]}
          filteredTags={[]}
          totalProductCount={baseProducts.length}
          currentPage={1}
          onPageChange={vi.fn()}
          pageSize={50}
          onPageSizeChange={vi.fn()}
          onRate={vi.fn()}
          onDeleteProduct={vi.fn()}
          onToggleBan={vi.fn()}
          onCreateCollection={vi.fn()}
          onOpenAddToCollection={onOpenAddToCollection}
          searchQuery="test"
          onSearchChange={vi.fn()}
          searchInputValue="test"
          onSearchInputChange={vi.fn()}
          onSearchInputBlur={vi.fn()}
          onSearchInputKeyDown={vi.fn()}
          isSearching={false}
          selectedTags={[]}
          onTagToggle={vi.fn()}
          selectedSources={[]}
          onSourceToggle={vi.fn()}
          minRating={0}
          onMinRatingChange={vi.fn()}
          updatedSince={null}
          onUpdatedSinceChange={vi.fn()}
          sortBy="rating"
          sortOrder="desc"
          onSortChange={vi.fn()}
          onClearFilters={vi.fn()}
        />
      </MemoryRouter>
    )

    await user.click(screen.getByRole('button', { name: /add test collection to a collection/i }))

    expect(onOpenAddToCollection).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'From Collection: Test Collection',
        entries: [
          expect.objectContaining({
            kind: 'collection',
            targetId: 'c1',
            title: 'Test Collection',
          }),
        ],
      })
    )
  })

  it('uses slug-first product targets when opening add-to-collection from search results toolbar', async () => {
    const user = userEvent.setup()
    const onOpenAddToCollection = vi.fn()
    const collections: Collection[] = [
      {
        id: 'c1',
        slug: 'test1',
        name: 'test1',
        userId: 'u1',
        username: 'dev_user',
        entries: [],
        productSlugs: ['product-one'],
        isPublic: true,
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
      },
      {
        id: 'c2',
        slug: 'test2',
        name: 'test2',
        userId: 'u1',
        username: 'dev_user',
        entries: [],
        productSlugs: ['product-one'],
        isPublic: true,
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
      },
    ]

    render(
      <MemoryRouter>
        <ProductListPage
          products={baseProducts}
          ratings={emptyRatings}
          user={{ id: 'u1', username: 'dev_user' }}
          userAccount={null}
          canViewBanned={false}
          canModerate={false}
          includeBanned={false}
          onIncludeBannedChange={vi.fn()}
          collections={collections}
          blogPosts={emptyPosts}
          allProductSources={[]}
          popularTags={[]}
          filteredTags={[]}
          totalProductCount={baseProducts.length}
          currentPage={1}
          onPageChange={vi.fn()}
          pageSize={50}
          onPageSizeChange={vi.fn()}
          onRate={vi.fn()}
          onDeleteProduct={vi.fn()}
          onToggleBan={vi.fn()}
          onCreateCollection={vi.fn()}
          onOpenAddToCollection={onOpenAddToCollection}
          searchQuery="test"
          onSearchChange={vi.fn()}
          searchInputValue="test"
          onSearchInputChange={vi.fn()}
          onSearchInputBlur={vi.fn()}
          onSearchInputKeyDown={vi.fn()}
          isSearching={false}
          selectedTags={[]}
          onTagToggle={vi.fn()}
          selectedSources={[]}
          onSourceToggle={vi.fn()}
          minRating={0}
          onMinRatingChange={vi.fn()}
          updatedSince={null}
          onUpdatedSinceChange={vi.fn()}
          sortBy="rating"
          sortOrder="desc"
          onSortChange={vi.fn()}
          onClearFilters={vi.fn()}
        />
      </MemoryRouter>
    )

    await user.click(screen.getByRole('button', { name: /add search results to collection/i }))

    expect(onOpenAddToCollection).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Search: test',
        preselectedCollectionKeys: ['test1', 'test2'],
        entries: [
          expect.objectContaining({
            kind: 'product',
            targetSlug: 'product-one',
            targetId: 'p1',
          }),
        ],
      })
    )
  })

  it('passes slug+id and preselected keys when using product collection plus button', async () => {
    const user = userEvent.setup()
    const onOpenAddToCollection = vi.fn()
    const collections: Collection[] = [
      {
        id: 'c-id-only',
        slug: 'id-only-collection',
        name: 'ID Only Collection',
        userId: 'u1',
        username: 'dev_user',
        entries: [],
        productIds: ['p1'],
        productSlugs: [],
        isPublic: true,
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
      },
    ]

    render(
      <MemoryRouter>
        <ProductListPage
          products={baseProducts}
          ratings={emptyRatings}
          user={{ id: 'u1', username: 'dev_user' }}
          userAccount={null}
          canViewBanned={false}
          canModerate={false}
          includeBanned={false}
          onIncludeBannedChange={vi.fn()}
          collections={collections}
          blogPosts={emptyPosts}
          allProductSources={[]}
          popularTags={[]}
          filteredTags={[]}
          totalProductCount={baseProducts.length}
          currentPage={1}
          onPageChange={vi.fn()}
          pageSize={50}
          onPageSizeChange={vi.fn()}
          onRate={vi.fn()}
          onDeleteProduct={vi.fn()}
          onToggleBan={vi.fn()}
          onCreateCollection={vi.fn()}
          onOpenAddToCollection={onOpenAddToCollection}
          searchQuery=""
          onSearchChange={vi.fn()}
          searchInputValue=""
          onSearchInputChange={vi.fn()}
          onSearchInputBlur={vi.fn()}
          onSearchInputKeyDown={vi.fn()}
          isSearching={false}
          selectedTags={[]}
          onTagToggle={vi.fn()}
          selectedSources={[]}
          onSourceToggle={vi.fn()}
          minRating={0}
          onMinRatingChange={vi.fn()}
          updatedSince={null}
          onUpdatedSinceChange={vi.fn()}
          sortBy="rating"
          sortOrder="desc"
          onSortChange={vi.fn()}
          onClearFilters={vi.fn()}
        />
      </MemoryRouter>
    )

    await user.click(screen.getByRole('button', { name: /add visible product to collection/i }))

    expect(onOpenAddToCollection).toHaveBeenCalledWith(
      expect.objectContaining({
        preselectedCollectionKeys: ['id-only-collection'],
        entries: [
          expect.objectContaining({
            kind: 'product',
            targetSlug: 'product-one',
            targetId: 'p1',
          }),
        ],
      })
    )
  })

  it('shows matching blog post cards when search query matches blog title', () => {
    const posts: BlogPost[] = [
      {
        id: 'b1',
        title: 'Test Blog Post',
        slug: 'test-blog-post',
        content: 'content',
        excerpt: 'A matching post',
        authorId: 'u1',
        authorName: 'dev_user',
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
        published: true,
      },
    ]

    render(
      <MemoryRouter>
        <ProductListPage
          products={baseProducts}
          ratings={emptyRatings}
          user={null}
          userAccount={null}
          canViewBanned={false}
          canModerate={false}
          includeBanned={false}
          onIncludeBannedChange={vi.fn()}
          collections={[]}
          blogPosts={posts}
          allProductSources={[]}
          popularTags={[]}
          filteredTags={[]}
          totalProductCount={baseProducts.length}
          currentPage={1}
          onPageChange={vi.fn()}
          pageSize={50}
          onPageSizeChange={vi.fn()}
          onRate={vi.fn()}
          onDeleteProduct={vi.fn()}
          onToggleBan={vi.fn()}
          onCreateCollection={vi.fn()}
          onOpenAddToCollection={vi.fn()}
          searchQuery="test"
          onSearchChange={vi.fn()}
          searchInputValue="test"
          onSearchInputChange={vi.fn()}
          onSearchInputBlur={vi.fn()}
          onSearchInputKeyDown={vi.fn()}
          isSearching={false}
          selectedTags={[]}
          onTagToggle={vi.fn()}
          selectedSources={[]}
          onSourceToggle={vi.fn()}
          minRating={0}
          onMinRatingChange={vi.fn()}
          updatedSince={null}
          onUpdatedSinceChange={vi.fn()}
          sortBy="rating"
          sortOrder="desc"
          onSortChange={vi.fn()}
          onClearFilters={vi.fn()}
        />
      </MemoryRouter>
    )

    expect(screen.getByRole('heading', { name: /blog posts \(1\)/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /view blog post test blog post/i })).toBeInTheDocument()
  })
})
