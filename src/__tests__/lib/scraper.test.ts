import { describe, it, expect, beforeEach, beforeAll, vi } from 'vitest'
import { ScraperService } from '@/lib/scrapers'
import type { Product } from '@/lib/types'

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000'

let backendProducts: Product[] = []

async function fetchBackendProducts(limit = 10): Promise<void> {
  const resp = await fetch(`${BACKEND_URL}/api/products?limit=${limit}`)
  if (!resp.ok) {
    throw new Error(`Backend unreachable at ${BACKEND_URL} (status ${resp.status})`)
  }
  const raw = await resp.json()
  if (!Array.isArray(raw) || raw.length === 0) {
    throw new Error('Backend returned no products; seed test data before running scraper tests')
  }

  backendProducts = raw.map((p: any): Product => ({
    id: p.id?.toString() || p.source_url || p.name,
    name: p.name,
    type: p.type || 'Software',
    source: p.source || 'Unknown',
    sourceUrl: p.source_url,
    description: p.description || '',
    tags: p.tags || [],
    createdAt: p.created_at ? new Date(p.created_at).getTime() : Date.now(),
    sourceRating: p.source_rating,
    sourceRatingCount: p.source_rating_count,
    stars: p.stars,
    imageUrl: p.image_url,
    imageAlt: p.name,
  }))
}

function requireProducts(): Product[] {
  if (!backendProducts.length) {
    throw new Error('Expected backend products to be loaded for scraper integration tests')
  }
  return backendProducts
}

describe('ScraperService', () => {
  beforeAll(async () => {
    await fetchBackendProducts()
  })

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('scrapeProducts', () => {
    it('should return an empty array on frontend (backend handles scraping)', async () => {
      const products = await ScraperService.scrapeProducts()
      expect(products).toEqual([])
    })
  })

  describe('mergeScrapedProducts', () => {
    it('should add new products that do not exist', async () => {
      const existingProducts = requireProducts()
      const now = Date.now()
      const scrapedProducts = [
        {
          name: `Scraper Add ${now}`,
          type: existingProducts[0]?.type || 'Software',
          source: existingProducts[0]?.source || 'GitHub',
          sourceUrl: `https://example.com/scraper-add-${now}`,
          description: 'Integration add product',
          tags: ['integration', 'scraper'],
          externalId: `scraper-add-${now}`,
        },
      ]

      const result = await ScraperService.mergeScrapedProducts(
        scrapedProducts,
        existingProducts
      )

      expect(result.toAdd.length).toBe(1)
      expect(result.toUpdate.length).toBe(0)
      expect(result.toAdd[0].name).toBe(scrapedProducts[0].name)
      expect(result.toAdd[0].submittedBy).toBe('system')
    })

    it('should update existing products with new tags', async () => {
      const existingProducts = requireProducts()
      const target = existingProducts[0]
      const scrapedProducts = [
        {
          name: target.name,
          type: target.type || 'Software',
          source: target.source,
          sourceUrl: target.sourceUrl || target.id,
          description: target.description || '',
          tags: [...(target.tags || []), 'integration-tag', 'another-tag'],
          externalId: target.sourceUrl || target.id || target.name,
        },
      ]

      const result = await ScraperService.mergeScrapedProducts(
        scrapedProducts,
        existingProducts
      )

      expect(result.toAdd.length).toBe(0)
      expect(result.toUpdate.length).toBe(1)
      expect(result.toUpdate[0].tags).toContain('integration-tag')
      expect(result.toUpdate[0].tags).toContain('another-tag')
    })

    it('should not update if nothing has changed', async () => {
      const existingProducts = requireProducts()
      const target = existingProducts[0]
      const scrapedProducts = [
        {
          name: target.name,
          type: target.type || 'Software',
          source: target.source,
          sourceUrl: target.sourceUrl || target.id,
          description: target.description || '',
          tags: target.tags || [],
          externalId: target.sourceUrl || target.id || target.name,
          imageUrl: target.imageUrl,
        },
      ]

      const result = await ScraperService.mergeScrapedProducts(
        scrapedProducts,
        existingProducts
      )

      expect(result.toAdd.length).toBe(0)
      expect(result.toUpdate.length).toBe(0) // No updates because nothing changed
    })

    it('should preserve source ratings when updating products', async () => {
      const existingProducts = requireProducts()
      const target = existingProducts.find((p) => p.sourceRating !== undefined) || existingProducts[0]
      const scrapedProducts = [
        {
          name: target.name,
          type: target.type || 'Software',
          source: target.source,
          sourceUrl: target.sourceUrl || target.id,
          description: target.description || '',
          tags: target.tags || [],
          externalId: target.sourceUrl || target.id || target.name,
          sourceRating: (target.sourceRating ?? 0) + 0.5,
          sourceRatingCount: (target.sourceRatingCount ?? 0) + 1,
        },
      ]

      const result = await ScraperService.mergeScrapedProducts(
        scrapedProducts,
        existingProducts
      )

      expect(result.toUpdate.length).toBe(1)
      expect(result.toUpdate[0].sourceRating).toBe(scrapedProducts[0].sourceRating)
      expect(result.toUpdate[0].sourceRatingCount).toBe(scrapedProducts[0].sourceRatingCount)
    })

    it('should add source ratings to new products', async () => {
      const existingProducts = requireProducts()
      const now = Date.now()
      const scrapedProducts = [
        {
          name: `Scraper Rating ${now}`,
          type: existingProducts[0]?.type || 'Fabrication',
          source: 'Thingiverse',
          sourceUrl: `https://thingiverse.com/thing:${now}`,
          description: 'New product with rating',
          tags: ['integration'],
          externalId: `thingiverse-${now}`,
          sourceRating: 4.8,
          sourceRatingCount: 45,
        },
      ]

      const result = await ScraperService.mergeScrapedProducts(
        scrapedProducts,
        existingProducts
      )

      expect(result.toAdd.length).toBe(1)
      expect(result.toAdd[0].sourceRating).toBe(4.8)
      expect(result.toAdd[0].sourceRatingCount).toBe(45)
    })

    it('should handle multiple products correctly', async () => {
      const existingProducts = requireProducts()
      const target = existingProducts[0]
      const now = Date.now()
      const scrapedProducts = [
        {
          name: `Scraper Multi 1 ${now}`,
          type: target.type || 'Software',
          source: target.source,
          sourceUrl: `https://example.com/scraper-multi-${now}-1`,
          description: 'New product 1',
          tags: ['integration'],
          externalId: `scraper-multi-${now}-1`,
        },
        {
          name: target.name,
          type: target.type || 'Software',
          source: target.source,
          sourceUrl: target.sourceUrl || target.id,
          description: target.description || '',
          tags: [...(target.tags || []), 'integration-tag'],
          externalId: target.sourceUrl || target.id || target.name,
        },
        {
          name: `Scraper Multi 2 ${now}`,
          type: target.type || 'Software',
          source: target.source,
          sourceUrl: `https://example.com/scraper-multi-${now}-2`,
          description: 'New product 2',
          tags: ['integration'],
          externalId: `scraper-multi-${now}-2`,
        },
      ]

      const result = await ScraperService.mergeScrapedProducts(
        scrapedProducts,
        existingProducts
      )

      expect(result.toAdd.length).toBe(2)
      expect(result.toUpdate.length).toBe(1)
    })
  })

  describe('getLastScrapeTime', () => {
    beforeEach(() => {
      ScraperService.clearLastScrapeTime()
    })

    it('should return last scrape time', async () => {
      const mockTime = Date.now()
      await ScraperService.setLastScrapeTime(mockTime)

      const result = await ScraperService.getLastScrapeTime()

      expect(result).toBe(mockTime)
    })

    it('should return null if no scrape time exists', async () => {
      const result = await ScraperService.getLastScrapeTime()

      expect(result).toBeNull()
    })
  })

  describe('setLastScrapeTime', () => {
    it('should set last scrape time', async () => {
      const timestamp = Date.now()

      await ScraperService.setLastScrapeTime(timestamp)

      const result = await ScraperService.getLastScrapeTime()
      expect(result).toBe(timestamp)
    })
  })

  describe('shouldRunScrape', () => {
    it('should return true if no last scrape time', () => {
      const result = ScraperService.shouldRunScrape(null)
      expect(result).toBe(true)
    })

    it('should return true if last scrape was more than 24 hours ago', () => {
      const oneDayAgo = Date.now() - 25 * 60 * 60 * 1000
      const result = ScraperService.shouldRunScrape(oneDayAgo)
      expect(result).toBe(true)
    })

    it('should return false if last scrape was less than 24 hours ago', () => {
      const oneHourAgo = Date.now() - 1 * 60 * 60 * 1000
      const result = ScraperService.shouldRunScrape(oneHourAgo)
      expect(result).toBe(false)
    })

    it('should return true if last scrape was exactly 24 hours ago', () => {
      const exactlyOneDayAgo = Date.now() - 24 * 60 * 60 * 1000
      const result = ScraperService.shouldRunScrape(exactlyOneDayAgo)
      expect(result).toBe(true) // Changed to true because >= includes exactly 24 hours
    })
  })
})
