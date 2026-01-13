/**
 * GOAT OAuth manager for token-based authentication
 * Provides interface for managing GOAT access tokens for scraping
 */

import { APIService } from '@/lib/api'

export class GOATOAuthManager {
  /**
   * Get GOAT OAuth configuration from backend
   */
  static async getConfig(): Promise<{ accessToken: string; appName: string } | null> {
    try {
      const data = await APIService.getOAuthConfig('goat')
      if (data) {
        return {
          accessToken: data.accessToken || '',
          appName: data.appName || 'a11yhood'
        }
      }
      return null
    } catch (error) {
      console.error('[GOATOAuthManager] Error getting config:', error)
      return null
    }
  }

  /**
   * Save GOAT OAuth configuration to backend
   */
  static async saveConfig(config: { accessToken: string; appName: string }): Promise<void> {
    try {
      await APIService.saveOAuthToken('goat', {
        access_token: config.accessToken,
        app_name: config.appName
      })
      
      console.log('[GOATOAuthManager] Configuration saved to backend')
    } catch (error) {
      console.error('[GOATOAuthManager] Error saving config:', error)
      throw error
    }
  }

  /**
   * Clear OAuth configuration from backend
   */
  static async clearConfig(): Promise<void> {
    try {
      await APIService.disconnectOAuth('goat')
      console.log('[GOATOAuthManager] Configuration cleared from backend')
    } catch (error) {
      console.error('[GOATOAuthManager] Error clearing config:', error)
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
      console.error('[GOATOAuthManager] Error checking authorization:', error)
      return false
    }
  }
}
