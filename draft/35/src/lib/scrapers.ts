import type { Product } from './types'

export type ScrapedProduct = {
  name: string
  type: string
  source: string
  sourceUrl: string
  description: string
  tags: string[]
  externalId: string
  imageUrl?: string
  imageAlt?: string
  sourceRating?: number
  sourceRatingCount?: number
}

const ONE_DAY_MS = 24 * 60 * 60 * 1000
const kvStore = new Map<string, number>()

export class ScraperService {
  /**
   * Frontend-safe wrapper that attempts to call spark.llm for scraping.
   * Falls back to an empty array on error or missing implementation.
   */
  static async scrapeProducts(): Promise<ScrapedProduct[]> {
    // Frontend no longer runs scrapers; rely on backend. Return empty list safely.
    return []
  }

  /**
   * Merge scraped products with existing products to produce add/update sets.
   */
  static async mergeScrapedProducts(
    scrapedProducts: ScrapedProduct[],
    existingProducts: Product[]
  ): Promise<{ toAdd: Product[]; toUpdate: Product[] }> {
    const toAdd: Product[] = []
    const toUpdate: Product[] = []

    for (const scraped of scrapedProducts) {
      const match = existingProducts.find(
        (p) => (p.sourceUrl && p.sourceUrl === scraped.sourceUrl) || (p.name === scraped.name && p.source === scraped.source)
      )

      if (!match) {
        toAdd.push({
          id: scraped.externalId ?? scraped.sourceUrl ?? scraped.name,
          name: scraped.name,
          type: scraped.type,
          source: scraped.source,
          sourceUrl: scraped.sourceUrl,
          description: scraped.description,
          tags: scraped.tags || [],
          createdAt: Date.now(),
          origin: `scraped-${scraped.source?.toLowerCase?.() ?? 'unknown'}`,
          imageUrl: scraped.imageUrl,
          imageAlt: scraped.imageAlt,
          sourceRating: scraped.sourceRating,
          sourceRatingCount: scraped.sourceRatingCount,
          submittedBy: 'system',
        })
        continue
      }

      const mergedTags = Array.from(new Set([...(match.tags || []), ...(scraped.tags || [])]))
      const needsTagUpdate = mergedTags.length !== (match.tags || []).length
      const needsImageUpdate = scraped.imageUrl && scraped.imageUrl !== match.imageUrl
      const needsDescUpdate = scraped.description && scraped.description !== match.description
      const needsRatingUpdate =
        (scraped.sourceRating !== undefined && scraped.sourceRating !== match.sourceRating) ||
        (scraped.sourceRatingCount !== undefined && scraped.sourceRatingCount !== match.sourceRatingCount)

      if (needsTagUpdate || needsImageUpdate || needsDescUpdate || needsRatingUpdate) {
        toUpdate.push({
          ...match,
          tags: mergedTags,
          imageUrl: scraped.imageUrl ?? match.imageUrl,
          description: scraped.description ?? match.description,
          sourceRating: scraped.sourceRating ?? match.sourceRating,
          sourceRatingCount: scraped.sourceRatingCount ?? match.sourceRatingCount,
        })
      }
    }

    return { toAdd, toUpdate }
  }

  static async getLastScrapeTime(): Promise<number | null> {
    return kvStore.has('last-scrape-time') ? kvStore.get('last-scrape-time')! : null
  }

  static async setLastScrapeTime(time: number): Promise<void> {
    kvStore.set('last-scrape-time', time)
  }

  static clearLastScrapeTime(): void {
    kvStore.delete('last-scrape-time')
  }

  static shouldRunScrape(lastScrapeTime: number | null): boolean {
    if (!lastScrapeTime) return true
    return Date.now() - lastScrapeTime >= ONE_DAY_MS
  }
}
