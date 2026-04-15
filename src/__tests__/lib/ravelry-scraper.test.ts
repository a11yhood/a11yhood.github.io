/**
 * Ravelry Scraper Tests
 * 
 * These tests validate the Ravelry scraper behavior including:
 * - Product type assignment (knitting vs crochet)
 * - Error handling (403 forbidden, etc.)
 * - Test mode limits
 * - Category pagination
 * - Data integrity
 * 
 * NOTE: These are integration tests that should be run manually
 * with proper OAuth credentials configured. Automated testing of
 * OAuth2-based scrapers requires complex mocking.
 * 
 * To test manually:
 * 1. Configure Ravelry OAuth in Admin Settings
 * 2. Run scraper in test mode (5 products)
 * 3. Verify:
 *    - Both knitting AND crochet products are found
 *    - Products have correct type fields
 *    - 403 errors are handled gracefully
 *    - Scraper completes and products are saved
 *    - Halt button works during scraping
 * 
 * Common Issues Checklist:
 * ✓ Products scraped but not saved → Check console for save errors
 * ✓ Only knitting OR crochet found → Check if both craft types in results
 * ✓ Scraper stuck in "running" → Check if Promise resolves
 * ✓ Halt doesn't work → Check globalThis.__scraperShouldHalt flag
 * ✓ 403 errors → OAuth token may need refresh
 */

import { describe, it } from 'vitest'

describe('RavelryScraper', () => {
  // These tests require OAuth setup and should be run manually
  // See header comments for testing instructions
  
  describe('Manual Testing Checklist', () => {
    it.todo('manual: verify OAuth configuration before scraping')
    it.todo('manual: find both knitting and crochet patterns')
    it.todo('manual: handle 403 errors gracefully and continue')
    it.todo('manual: respect test mode limit of 5 products')
    it.todo('manual: complete and update status to success')
    it.todo('manual: save all scraped products to database')
    it.todo('manual: stop immediately when halt button is clicked')
  })
})
