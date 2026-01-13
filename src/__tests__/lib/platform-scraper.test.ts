import { describe, it, expect, beforeEach, vi } from 'vitest'
import { PlatformScraper } from '@/lib/scrapers/scraper'

class DummyScraper extends PlatformScraper {
  constructor() {
    super('Dummy', 60)
  }
}

describe('PlatformScraper (deprecated)', () => {
  let warnSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    vi.clearAllMocks()
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
  })

  it('emits deprecation warning on construction', () => {
    new DummyScraper()
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('DEPRECATED')
    )
  })

  it('throws when calling scrape()', async () => {
    const s = new DummyScraper()
    await expect(s.scrape()).rejects.toThrow(
      'PlatformScraper is deprecated. Use backend API instead.'
    )
  })

  it('warns when enabling test mode', () => {
    const s = new DummyScraper()
    s.setTestMode(true, 1)
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('Test mode not supported')
    )
  })
})
