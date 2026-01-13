/**
 * GitHub OAuth manager for token-based authentication
 * Provides interface for managing GitHub access tokens for scraping
 */

import { APIService } from '@/lib/api'

export class GitHubOAuthManager {
  /**
   * Get GitHub OAuth configuration from backend
   */
  static async getConfig(): Promise<{ accessToken: string; appName: string } | null> {
    try {
      // Use APIService to properly handle authentication
      // Note: APIService automatically converts snake_case to camelCase
      const data = await APIService.getOAuthConfig('github')
      if (data) {
        return {
          accessToken: data.accessToken || '',
          appName: data.appName || 'a11yhood'
        }
      }
      return null
    } catch (error) {
      console.error('[GitHubOAuthManager] Error getting config:', error)
      return null
    }
  }

  /**
   * Save GitHub OAuth configuration to backend
   */
  static async saveConfig(config: { accessToken: string; appName: string }): Promise<void> {
    try {
      // Save to backend database via API
      await APIService.saveOAuthToken('github', {
        access_token: config.accessToken,
        app_name: config.appName
      })
      
      console.log('[GitHubOAuthManager] Configuration saved to backend')
    } catch (error) {
      console.error('[GitHubOAuthManager] Error saving config:', error)
      throw error
    }
  }

  /**
   * Clear OAuth configuration from backend
   */
  static async clearConfig(): Promise<void> {
    try {
      await APIService.disconnectOAuth('github')
      console.log('[GitHubOAuthManager] Configuration cleared from backend')
    } catch (error) {
      console.error('[GitHubOAuthManager] Error clearing config:', error)
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
      console.error('[GitHubOAuthManager] Error checking authorization:', error)
      return false
    }
  }
}
