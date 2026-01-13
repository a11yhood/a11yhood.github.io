/**
 * DEPRECATED: Legacy PlatformScraper base class
 * Scrapers now run on the backend via /api/scrapers/trigger
 * This stub exists for type compatibility only
 */

export abstract class PlatformScraper {
  protected source: string

  constructor(source: string, requestsPerMinute: number = 30) {
    this.source = source
    console.warn('[PlatformScraper] DEPRECATED: Use backend API /api/scrapers/trigger instead')
  }

  async scrape(): Promise<any[]> {
    throw new Error('PlatformScraper is deprecated. Use backend API instead.')
  }

  setTestMode(enabled: boolean, limit: number = 5): void {
    console.warn('[PlatformScraper] Test mode not supported on frontend scrapers')
  }
}
