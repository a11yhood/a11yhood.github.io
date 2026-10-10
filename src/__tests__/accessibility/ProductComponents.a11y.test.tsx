/**
 * axe scans for the product-facing components: ProductCard, ProductListItem,
 * ProductDetail and DiscussionSection.
 *
 * These render with mock data (no backend) so they run in the reduced CI suite.
 * jsdom cannot evaluate color contrast or layout; those are covered by the
 * post-deploy scanner.
 */
import { afterEach, describe, it, expect, vi } from 'vitest'
import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { ProductCard } from '@/components/ProductCard'
import { ProductListItem } from '@/components/ProductListItem'
import { ProductDetail } from '@/components/ProductDetail'
import { DiscussionSection } from '@/components/DiscussionSection'
import { APIService } from '@/lib/api'
import { runA11yScan } from '../helpers/a11y'
import {
  createMockDiscussion,
  createMockProduct,
  createMockRating,
  createMockUserAccount,
} from '../helpers/create-mocks'
import type { UserData } from '@/lib/types'

const product = createMockProduct({
  id: 'product-1',
  slug: 'test-product',
  name: 'Accessible Widget',
  description: 'A widget with a description long enough to wrap onto more than one line when rendered.',
  tags: ['screen-reader', 'keyboard', 'low-vision'],
})
const ratings = [
  createMockRating({ userId: 'u1', rating: 4 }),
  createMockRating({ userId: 'u2', rating: 5 }),
]
const user: UserData = { id: 'u1', username: 'alice' }
const userAccount = createMockUserAccount({ id: 'u1', username: 'alice' })
const discussions = [
  createMockDiscussion({ id: 'd1', content: 'How do I install this?' }),
  createMockDiscussion({ id: 'd2', content: 'Check the documentation!', parentId: 'd1', username: 'bob', userId: 'u2' }),
]

async function expectNoViolations(container: HTMLElement) {
  expect(await runA11yScan(container)).toHaveNoViolations()
}

describe('ProductCard axe', () => {
  it('has no violations for anonymous users', async () => {
    const { container } = render(
      <MemoryRouter>
        <ProductCard product={product} ratings={ratings} href="/product/test-product" />
      </MemoryRouter>
    )
    await expectNoViolations(container)
  })

  it('has no violations for a signed-in user with a selected tag', async () => {
    const { container } = render(
      <MemoryRouter>
        <ProductCard
          product={product}
          ratings={ratings}
          href="/product/test-product"
          selectedTags={['keyboard']}
          user={user}
          userAccount={userAccount}
          onRate={vi.fn()}
          onTagClick={vi.fn()}
          onOpenAddToCollection={vi.fn()}
        />
      </MemoryRouter>
    )
    await expectNoViolations(container)
  })
})

describe('ProductListItem axe', () => {
  it('has no violations', async () => {
    const { container } = render(
      <MemoryRouter>
        <div>
          <ProductListItem product={product} ratings={ratings} href="/product/test-product" onTagClick={vi.fn()} />
        </div>
      </MemoryRouter>
    )
    await expectNoViolations(container)
  })

  it('has no violations with moderation controls and a selected tag', async () => {
    const { container } = render(
      <MemoryRouter>
        <div>
          <ProductListItem
            product={product}
            ratings={ratings}
            href="/product/test-product"
            selectedTags={['keyboard']}
            canModerate
            showBannedBadge
            onToggleBan={vi.fn()}
            onDelete={vi.fn()}
            onOpenAddToCollection={vi.fn()}
          />
        </div>
      </MemoryRouter>
    )
    await expectNoViolations(container)
  })
})

describe('ProductDetail axe', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  const baseProps = {
    product,
    ratings,
    discussions,
    userCollections: [],
    onBack: vi.fn(),
    onRate: vi.fn(),
    onDiscuss: vi.fn(),
    onAddTag: vi.fn(),
    allTags: ['screen-reader', 'keyboard', 'low-vision', 'captions'],
  }

  it('has no violations for anonymous users', async () => {
    const { container } = render(
      <MemoryRouter>
        <ProductDetail {...baseProps} user={null} onRequireLogin={vi.fn()} />
      </MemoryRouter>
    )
    await expectNoViolations(container)
  })

  it('has no violations for a signed-in user', async () => {
    vi.spyOn(APIService, 'getUserCollections').mockResolvedValue([])
    const { container } = render(
      <MemoryRouter>
        <ProductDetail {...baseProps} user={user} userAccount={userAccount} />
      </MemoryRouter>
    )
    await expectNoViolations(container)
  })
})

describe('DiscussionSection axe', () => {
  it('has no violations with threaded discussions', async () => {
    const { container } = render(<DiscussionSection discussions={discussions} user={user} onDiscuss={vi.fn()} />)
    await expectNoViolations(container)
  })

  it('has no violations when empty', async () => {
    const { container } = render(<DiscussionSection discussions={[]} user={user} onDiscuss={vi.fn()} />)
    await expectNoViolations(container)
  })

  it('has no violations when signed out', async () => {
    const { container } = render(<DiscussionSection discussions={discussions} user={null} onDiscuss={vi.fn()} />)
    await expectNoViolations(container)
  })
})
