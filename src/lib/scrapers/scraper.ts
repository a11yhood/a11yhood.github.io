/**
 * DEPRECATED: Legacy PlatformScraper base class
 * Scrapers now run on the backend via /api/scrapers/trigger
 * This stub exists for type compatibility only
 */

export abstract class PlatformScraper {
  protected source: string

  constructor(source: string, _requestsPerMinute: number = 30) {
    this.source = source
    console.warn('[PlatformScraper] DEPRECATED: Use backend API /api/scrapers/trigger instead')
  }

  async scrape(): Promise<unknown[]> {
    throw new Error('PlatformScraper is deprecated. Use backend API instead.')
  }

  setTestMode(enabled: boolean, _limit: number = 5): void {
    console.warn('[PlatformScraper] Test mode not supported on frontend scrapers')
  }
}
