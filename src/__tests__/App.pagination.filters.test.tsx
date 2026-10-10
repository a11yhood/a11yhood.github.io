import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import App from '@/App'
import { AuthProvider } from '@/contexts/AuthContext'
import { APIService } from '@/lib/api'
import { createMockProduct } from './helpers/create-mocks'

/**
 * Regression tests for #521: with a source filter enabled, clicking "Next" on the
 * products page changed the page number momentarily and then reverted to page 1.
 */

const PAGE_SIZE = 50
const TOTAL_PRODUCTS = 120 // 3 pages at 50 per page

const makeProducts = (offset: number) =>
  Array.from({ length: PAGE_SIZE }, (_, i) =>
    createMockProduct({
      id: `product-${offset + i}`,
      slug: `product-${offset + i}`,
      name: `Product ${offset + i}`,
    }),
  )

const renderProductsPage = (search = '') =>
  render(
    <MemoryRouter initialEntries={[`/products${search}`]}>
      <AuthProvider>
        <Routes>
          <Route path="/*" element={<App />} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  )

// Long enough to outlast the fetch effect's 400ms debounce plus the mocked responses.
const settle = () => new Promise((resolve) => setTimeout(resolve, 900))

describe('App products pagination with filters (#521)', () => {
  let getAllProductsSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    vi.spyOn(APIService, 'getCurrentUser').mockResolvedValue(null as never)
    vi.spyOn(APIService, 'getProductSources').mockResolvedValue([
      { name: 'GitHub', count: 100 },
      { name: 'Ravelry', count: 20 },
    ])
    vi.spyOn(APIService, 'getPopularTags').mockResolvedValue([])
    vi.spyOn(APIService, 'getFilteredTags').mockResolvedValue([])
    vi.spyOn(APIService, 'getAllRatings').mockResolvedValue([])
    vi.spyOn(APIService, 'getProductCount').mockResolvedValue(TOTAL_PRODUCTS)
    getAllProductsSpy = vi
      .spyOn(APIService, 'getAllProducts')
      .mockImplementation(async (params?: { offset?: number }) => makeProducts(params?.offset ?? 0) as never)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('stays on the next page after clicking Next with a source selected', async () => {
    const user = userEvent.setup()
    renderProductsPage('?source=GitHub')

    await screen.findByText(/Page 1 \/ 3/)

    await user.click(screen.getByRole('button', { name: /next page/i }))

    await waitFor(() => {
      expect(getAllProductsSpy).toHaveBeenCalledWith(
        expect.objectContaining({ offset: PAGE_SIZE, sources: ['GitHub'] }),
      )
    })

    // Before the fix the page reverted to 1 once the page-2 fetch resolved.
    await settle()
    expect(screen.getByText(/Page 2 \/ 3/)).toBeInTheDocument()
    expect(screen.queryByText(/Page 1 \/ 3/)).not.toBeInTheDocument()
  })

  it('returns to page 1 when a filter changes while on a later page', async () => {
    const user = userEvent.setup()
    renderProductsPage('?source=GitHub')

    await screen.findByText(/Page 1 \/ 3/)
    await user.click(screen.getByRole('button', { name: /next page/i }))
    await settle()
    expect(screen.getByText(/Page 2 \/ 3/)).toBeInTheDocument()

    await user.click(await screen.findByRole('checkbox', { name: /^Ravelry, 20 products/i }))

    await waitFor(() => {
      expect(screen.getByText(/Page 1 \/ 3/)).toBeInTheDocument()
    })

    await settle()
    expect(screen.getByText(/Page 1 \/ 3/)).toBeInTheDocument()
    const lastCall = getAllProductsSpy.mock.calls[getAllProductsSpy.mock.calls.length - 1][0] as {
      offset?: number
      sources?: string[]
    }
    expect(lastCall.offset).toBe(0)
    expect(lastCall.sources).toEqual(expect.arrayContaining(['GitHub', 'Ravelry']))
  })
})
