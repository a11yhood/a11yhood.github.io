/**
 * Page-level axe scans for populated and signed-in views.
 *
 * `Routes.a11y.test.tsx` covers every route's empty / signed-out state through
 * the full App. These tests render the page components directly with mock data
 * so the views people actually use (lists with content, admin tools, profile)
 * are scanned too. API calls are answered with 404s so there is no network.
 */
import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { AdminPage } from '@/pages/AdminPage'
import { AdminLogsPage } from '@/pages/AdminLogsPage'
import { AdminUsersPage } from '@/pages/AdminUsersPage'
import { BlogPage } from '@/pages/BlogPage'
import { BlogPostPage } from '@/pages/BlogPostPage'
import { CollectionsPage } from '@/pages/CollectionsPage'
import { CollectionDetailPage } from '@/pages/CollectionDetailPage'
import { ProductListPage } from '@/pages/ProductListPage'
import { ProfilePage } from '@/pages/ProfilePage'
import { runA11yScan } from '../helpers/a11y'
import {
  createMockAdminAccount,
  createMockProduct,
  createMockRating,
  createMockUserAccount,
} from '../helpers/create-mocks'
import type { BlogPost, Collection, UserData } from '@/lib/types'

const admin = createMockAdminAccount({ id: 'admin-1', username: 'admin' })
const account = createMockUserAccount({ id: 'u1', username: 'alice' })
const user: UserData = { id: 'u1', username: 'alice' }

const products = [
  createMockProduct({ id: 'p1', slug: 'widget', name: 'Accessible Widget', tags: ['keyboard', 'screen-reader'] }),
  createMockProduct({ id: 'p2', slug: 'gadget', name: 'Gadget', source: 'Ravelry', tags: ['knitting'] }),
]
const ratings = [createMockRating({ productId: 'p1', userId: 'u2', rating: 4 })]

const blogPosts: BlogPost[] = [
  {
    id: 'post-1',
    title: 'Hello world',
    slug: 'hello-world',
    content: '# Hello\n\nSome **content** with a [link](https://example.com).',
    excerpt: 'Some content',
    authorId: 'admin-1',
    authorName: 'Admin',
    createdAt: '2026-04-15T12:00:00.000Z',
    updatedAt: '2026-04-15T12:30:00.000Z',
    publishDate: '2026-04-15T13:00:00.000Z',
    published: true,
    publishedAt: '2026-04-15T13:00:00.000Z',
  },
]

const collection: Collection = {
  id: 'c1',
  slug: 'my-collection',
  name: 'My Collection',
  description: 'Things I like',
  userId: 'u1',
  username: 'alice',
  entries: [{ kind: 'product', productId: 'p1' } as Collection['entries'][number]],
  productIds: ['p1'],
  productSlugs: ['widget'],
  isOwner: true,
  accessRole: 'owner',
  createdAt: Date.now(),
  updatedAt: Date.now(),
  isPublic: true,
}

async function expectNoViolations(container: HTMLElement) {
  // The page must have rendered something before we scan it.
  await waitFor(() => {
    expect(screen.queryAllByRole('heading', { level: 1 }).length).toBeGreaterThan(0)
  })
  expect(await runA11yScan(container)).toHaveNoViolations()
}

describe('Page-level axe scans (populated / signed in)', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        new Response(JSON.stringify({ detail: 'Not found' }), {
          status: 404,
          headers: { 'content-type': 'application/json' },
        })
      )
    )
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('ProductListPage with products', async () => {
    const noop = vi.fn()
    const { container } = render(
      <MemoryRouter>
        <ProductListPage
          products={products}
          ratings={ratings}
          user={user}
          userAccount={account}
          canViewBanned={false}
          canModerate={false}
          includeBanned={false}
          onIncludeBannedChange={noop}
          collections={[]}
          blogPosts={[]}
          allProductSources={[{ name: 'GitHub', count: 1 }, { name: 'Ravelry', count: 1 }]}
          popularTags={['keyboard']}
          filteredTags={['keyboard', 'screen-reader', 'knitting']}
          totalProductCount={products.length}
          currentPage={1}
          onPageChange={noop}
          pageSize={20}
          onPageSizeChange={noop}
          onRate={noop}
          onDeleteProduct={noop}
          onToggleBan={noop}
          onCreateCollection={noop}
          onOpenAddToCollection={noop}
          searchQuery=""
          onSearchChange={noop}
          searchInputValue=""
          onSearchInputChange={noop}
          onSearchInputBlur={noop}
          onSearchInputKeyDown={noop}
          isSearching={false}
          selectedTags={['keyboard']}
          onTagToggle={noop}
          selectedSources={[]}
          onSourceToggle={noop}
          minRating={0}
          onMinRatingChange={noop}
          updatedSince={null}
          onUpdatedSinceChange={noop}
          sortBy="created_at"
          sortOrder="desc"
          onSortChange={noop}
          onClearFilters={noop}
        />
      </MemoryRouter>
    )
    await expectNoViolations(container)
  })

  it('BlogPage with posts', async () => {
    const { container } = render(
      <MemoryRouter>
        <BlogPage blogPosts={blogPosts} blogPostsLoading={false} userAccount={null} />
      </MemoryRouter>
    )
    await expectNoViolations(container)
  })

  it('BlogPostPage with a post', async () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/blog/hello-world']}>
        <Routes>
          <Route path="/blog/:slug" element={<BlogPostPage blogPosts={blogPosts} userAccount={admin} />} />
        </Routes>
      </MemoryRouter>
    )
    await expectNoViolations(container)
  })

  it('CollectionsPage with owned collections', async () => {
    const noop = vi.fn()
    const { container } = render(
      <MemoryRouter>
        <CollectionsPage
          collections={[collection]}
          collectionsLoaded
          products={products}
          user={user}
          userAccount={account}
          onDeleteCollection={noop}
          onEditCollection={noop}
          onCreateCollection={noop}
          onOpenAddToCollection={noop}
        />
      </MemoryRouter>
    )
    await expectNoViolations(container)
  })

  it('CollectionDetailPage for an owner', async () => {
    const noop = vi.fn()
    const { container } = render(
      <MemoryRouter initialEntries={['/collections/my-collection']}>
        <Routes>
          <Route
            path="/collections/:collectionSlug"
            element={
              <CollectionDetailPage
                collections={[collection]}
                ratings={ratings}
                products={products}
                user={user}
                userAccount={account}
                onRemoveProductFromCollection={noop}
                onDeleteProduct={noop}
                onDeleteCollection={noop}
                onEditCollection={noop}
                onOpenAddToCollection={noop}
              />
            }
          />
        </Routes>
      </MemoryRouter>
    )
    await expectNoViolations(container)
  })

  it('ProfilePage (account) for a signed-in user', async () => {
    const { container } = render(
      <MemoryRouter>
        <ProfilePage user={user} userAccount={account} onUpdate={vi.fn()} />
      </MemoryRouter>
    )
    await expectNoViolations(container)
  })

  it('AdminPage for an admin', async () => {
    const { container } = render(
      <MemoryRouter>
        <AdminPage
          products={products}
          userAccount={admin}
          ravelryAuthTimestamp={0}
          onProductsUpdate={vi.fn()}
          onBlogPostsUpdate={vi.fn()}
          adminVerboseLoggingEnabled={false}
          onAdminVerboseLoggingChange={vi.fn()}
        />
      </MemoryRouter>
    )
    expect(await runA11yScan(container)).toHaveNoViolations()
  })

  it('AdminLogsPage for an admin', async () => {
    const { container } = render(
      <MemoryRouter>
        <AdminLogsPage products={products} userAccount={admin} ravelryAuthTimestamp={0} onProductsUpdate={vi.fn()} />
      </MemoryRouter>
    )
    expect(await runA11yScan(container)).toHaveNoViolations()
  })

  it('AdminUsersPage for an admin', async () => {
    const { container } = render(
      <MemoryRouter>
        <AdminUsersPage userAccount={admin} />
      </MemoryRouter>
    )
    expect(await runA11yScan(container)).toHaveNoViolations()
  })
})
