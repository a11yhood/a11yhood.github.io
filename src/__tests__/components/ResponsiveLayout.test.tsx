import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { ProductDetail } from '@/components/ProductDetail'
import { ProductCard } from '@/components/ProductCard'
import { ProductListItem } from '@/components/ProductListItem'
import { AppHeader } from '@/components/AppHeader'
import { ProductListPage } from '@/pages/ProductListPage'
import { createMockProduct } from '../helpers/create-mocks'

// Layout regressions from #302, #501, #70 and #79. jsdom has no layout engine, so these
// assert the classes/semantics that produce the behaviour rather than measured sizes.
describe('responsive layout and grouping', () => {
  const product = createMockProduct({
    slug: 'layout-product',
    description: 'A long description that must stay fully visible on narrow screens.',
    tags: ['alpha', 'beta'],
  })

  describe('ProductDetail', () => {
    const renderDetail = () =>
      render(
        <MemoryRouter>
          <ProductDetail
            product={product}
            ratings={[]}
            discussions={[]}
            userCollections={[]}
            user={null}
            onBack={vi.fn()}
            onRate={vi.fn()}
            onDiscuss={vi.fn()}
            onAddTag={vi.fn()}
            allTags={[]}
          />
        </MemoryRouter>
      )

    it('does not line-clamp the description or title on mobile (#501)', () => {
      renderDetail()

      const description = screen.getByText(/must stay fully visible/).closest('div')
      expect(description?.className ?? '').not.toMatch(/line-clamp/)
      expect(screen.getByRole('heading', { level: 1 }).className).not.toMatch(/line-clamp/)
    })

    it('only floats the image from the sm breakpoint up so text is not squeezed on phones (#302, #501)', () => {
      renderDetail()

      const heading = screen.getByRole('heading', { level: 1 })
      const header = heading.closest('div.mb-6') as HTMLElement
      const floated = Array.from(header.children).filter((el) => /sm:float-left/.test(el.className))
      expect(floated.length).toBe(1)
      // No unconditional float that would apply on mobile.
      Array.from(header.children).forEach((el) => {
        expect(el.className.split(/\s+/)).not.toContain('float-left')
      })
    })
  })

  it('names the tag lists and groups the metadata/actions on cards (#79)', () => {
    render(
      <MemoryRouter>
        <ProductCard product={product} ratings={[]} />
        <ProductListItem product={product} ratings={[]} />
      </MemoryRouter>
    )

    expect(screen.getAllByRole('list', { name: 'Tags' })).toHaveLength(2)
    expect(screen.getByRole('group', { name: 'Source and last updated' })).toBeInTheDocument()
    expect(screen.getByRole('group', { name: 'Source details and actions' })).toBeInTheDocument()
  })

  it('header height can grow with enlarged text instead of being fixed (#70)', () => {
    render(
      <MemoryRouter>
        <AppHeader
          user={null}
          userAccount={null}
          pendingRequestsCount={0}
          onLogin={vi.fn()}
          onLogout={vi.fn()}
        />
      </MemoryRouter>
    )

    const header = screen.getByRole('banner')
    expect(header.className).toContain('min-h-[60px]')
    expect(header.className).not.toMatch(/(^|\s)h-\[60px\]/)
  })

  it('announces the current page and total pages to screen readers (#75)', () => {
    render(
      <MemoryRouter>
        <ProductListPage
          products={[product]}
          ratings={[]}
          user={null}
          userAccount={null}
          canViewBanned={false}
          canModerate={false}
          includeBanned={false}
          onIncludeBannedChange={vi.fn()}
          collections={[]}
          blogPosts={[]}
          allProductSources={[]}
          popularTags={[]}
          filteredTags={[]}
          totalProductCount={120}
          currentPage={2}
          onPageChange={vi.fn()}
          pageSize={50}
          onPageSizeChange={vi.fn()}
          onRate={vi.fn()}
          onDeleteProduct={vi.fn()}
          onToggleBan={vi.fn()}
          onCreateCollection={vi.fn()}
          onOpenAddToCollection={vi.fn()}
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

    expect(screen.getByText('Page 2 of 3, showing 1 products')).toBeInTheDocument()
  })
})
