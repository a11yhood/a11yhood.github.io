/**
 * DEPRECATED: Legacy Thingiverse scraper
 * Scrapers now run on the backend via /api/scrapers/trigger
 * This stub exists for compatibility with ThingiverseSettings component
 */

import { APIService } from '@/lib/api'

export class ThingiverseOAuthManager {
  /**
   * Get Thingiverse OAuth configuration from backend
   */
  static async getConfig(): Promise<{ accessToken: string; appName: string } | null> {
    try {
      // Use APIService to properly handle authentication
      // Note: APIService automatically converts snake_case to camelCase
      const data = await APIService.getOAuthConfig('thingiverse')
      if (data) {
        return {
          accessToken: data.accessToken || '',
          appName: data.appName || 'a11yhood'
        }
      }
      return null
    } catch (error) {
      console.error('[ThingiverseOAuthManager] Error getting config:', error)
      return null
    }
  }

  /**
   * Save Thingiverse OAuth configuration to backend
   */
  static async saveConfig(config: { accessToken: string; appName: string }): Promise<void> {
    try {
      // Save to backend database via API
      await APIService.saveOAuthToken('thingiverse', {
        access_token: config.accessToken,
        app_name: config.appName
      })
      
      console.log('[ThingiverseOAuthManager] Configuration saved to backend')
    } catch (error) {
      console.error('[ThingiverseOAuthManager] Error saving config:', error)
      throw error
    }
  }

  /**
   * Clear OAuth configuration from backend
   */
  static async clearConfig(): Promise<void> {
    try {
      await APIService.disconnectOAuth('thingiverse')
      console.log('[ThingiverseOAuthManager] Configuration cleared from backend')
    } catch (error) {
      console.error('[ThingiverseOAuthManager] Error clearing config:', error)
      throw error
    }
  }

  /**
   * Check if user is authorized (has valid OAuth configuration)
   */
  static async isAuthorized(): Promise<boolean> {
    try {
      const config = await this.getConfig()
      return config !== null && config.accessToken.length > 0
    } catch (error) {
      console.error('[ThingiverseOAuthManager] Error checking authorization:', error)
      return false
    }
  }
}

/**
 * DEPRECATED: ThingiverseScraper class
 * Use backend API instead: APIService.triggerScraper('thingiverse')
 */
export class ThingiverseScraper {
  constructor() {
    console.warn('[ThingiverseScraper] DEPRECATED: Use backend API /api/scrapers/trigger instead')
  }

  async scrape() {
    throw new Error('ThingiverseScraper is deprecated. Use APIService.triggerScraper("thingiverse") instead')
  }
}
