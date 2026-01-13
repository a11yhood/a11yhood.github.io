/**
 * LEGACY FILE - DO NOT USE IN NEW CODE
 * Scrapers have been moved to backend/scrapers/
 * This file is kept for reference only.
 */

import { PlatformScraper } from './scraper'

/**
 * OAuth2 configuration interface
 * Stores tokens and credentials needed for OAuth2 authentication
 */
export interface OAuth2Config {
  clientId: string
  clientSecret: string
  accessToken?: string
  refreshToken?: string
  username?: string
  expiresAt?: number
}

/**
 * OAuth2 token response from authorization server
 */
export interface OAuth2TokenResponse {
  access_token: string
  refresh_token: string
  expires_in: number
  token_type: string
}

/**
 * Base class for platform scrapers that use OAuth2 authentication
 * Provides common OAuth2 flow methods and configuration management
 */
export abstract class OAuth2PlatformScraper extends PlatformScraper {
  protected abstract readonly API_BASE_URL: string
  protected abstract readonly OAUTH_AUTHORIZE_URL: string
  protected abstract readonly OAUTH_TOKEN_URL: string
  protected abstract readonly configKey: string
  protected abstract readonly scopes: string

  /**
   * Get OAuth2 configuration from storage (localStorage for temporary state)
   */
  protected async getOAuthConfig(): Promise<OAuth2Config | null> {
    try {
      const configStr = localStorage.getItem(this.configKey)
      return configStr ? JSON.parse(configStr) : null
    } catch (error: any) {
      console.error(`[${this.source}] Error retrieving OAuth config:`, error)
      return null
    }
  }

  /**
   * Save OAuth2 configuration - saves to localStorage AND backend
   */
  protected async saveOAuthConfig(config: OAuth2Config): Promise<void> {
    try {
      console.log(`[${this.source}] Saving OAuth config...`)
      // Save to localStorage for temporary access
      localStorage.setItem(this.configKey, JSON.stringify(config))
      
      // Save token to backend database
      if (config.accessToken) {
        const { APIService } = await import('@/lib/api')
        await APIService.saveOAuthToken(
          this.configKey.replace('-oauth-config', ''),
          {
            access_token: config.accessToken,
            refresh_token: config.refreshToken,
            client_id: config.clientId,
            client_secret: config.clientSecret,
            redirect_uri: '',
          }
        )
      }
      console.log(`[${this.source}] OAuth config saved successfully`)
    } catch (error) {
      console.error(`[${this.source}] Failed to save OAuth config:`, error)
      throw error
    }
  }

  /**
   * Clear OAuth2 configuration from storage
   */
  protected async clearOAuthConfig(): Promise<void> {
    try {
      localStorage.removeItem(this.configKey)
      console.log(`[${this.source}] OAuth configuration cleared`)
    } catch (error) {
      console.error(`[${this.source}] Failed to clear OAuth configuration:`, error)
    }
  }

  /**
   * Check if the scraper is authorized (has valid credentials)
   */
  async isAuthorized(): Promise<boolean> {
    const config = await this.getOAuthConfig()
    return !!(config && config.accessToken && config.clientId && config.clientSecret)
  }

  /**
   * Generate a secure random state parameter for OAuth2 flow
   */
  protected generateState(): string {
    const array = new Uint8Array(16)
    crypto.getRandomValues(array)
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('')
  }

  /**
   * Get the OAuth2 authorization URL
   * @param redirectUri - The redirect URI registered with the OAuth provider
   * @returns The full authorization URL to redirect the user to
   */
  async getAuthorizationUrl(redirectUri: string): Promise<string> {
    console.log(`[${this.source}] getAuthorizationUrl called`)
    console.log(`[${this.source}] → redirectUri:`, redirectUri)
    
    const config = await this.getOAuthConfig()
    console.log(`[${this.source}] → config retrieved:`, config ? 'YES' : 'NO')
    
    if (!config?.clientId) {
      console.error(`[${this.source}] ✗ No clientId in config!`)
      throw new Error('Client ID not configured')
    }
    
    console.log(`[${this.source}] → clientId:`, config.clientId.substring(0, 10) + '...')
    
    const state = this.generateState()
    console.log(`[${this.source}] → Generated state:`, state)
    console.log(`[${this.source}] → State length:`, state.length, 'characters')
    
    if (!state || state.length < 8) {
      console.error(`[${this.source}] ✗ Generated state is too short!`)
      throw new Error('Failed to generate secure state parameter')
    }
    
    localStorage.setItem(`${this.configKey}-state`, state)
    console.log(`[${this.source}] → State saved to localStorage`)
    
    const verifyState = localStorage.getItem(`${this.configKey}-state`)
    console.log(`[${this.source}] → Verified saved state:`, verifyState?.substring(0, 16) + '...')
    
    const params = new URLSearchParams()
    params.append('client_id', config.clientId)
    params.append('response_type', 'code')
    params.append('redirect_uri', redirectUri)
    params.append('scope', this.scopes)
    params.append('state', state)
    
    console.log(`[${this.source}] → URLSearchParams built:`)
    console.log(`[${this.source}]   - client_id:`, params.get('client_id')?.substring(0, 10) + '...')
    console.log(`[${this.source}]   - response_type:`, params.get('response_type'))
    console.log(`[${this.source}]   - redirect_uri:`, params.get('redirect_uri'))
    console.log(`[${this.source}]   - scope:`, params.get('scope'))
    console.log(`[${this.source}]   - state:`, params.get('state')?.substring(0, 16) + '...')
    console.log(`[${this.source}]   - state length:`, params.get('state')?.length)
    
    const authUrl = `${this.OAUTH_AUTHORIZE_URL}?${params.toString()}`
    
    console.log(`[${this.source}] → Complete URL:`, authUrl)
    console.log(`[${this.source}] → URL contains state parameter:`, authUrl.includes('state='))
    
    return authUrl
  }

  /**
   * Exchange authorization code for access token
   * @param code - The authorization code from the OAuth callback
   * @param clientId - The client ID
   * @param clientSecret - The client secret
   * @param redirectUri - The redirect URI used in the authorization request
   * @param useCorsProxy - Whether to use a CORS proxy (default: true for browser contexts)
   * @returns True if successful, false otherwise
   */
  async exchangeCodeForToken(
    code: string,
    clientId: string,
    clientSecret: string,
    redirectUri: string,
    useCorsProxy: boolean = true
  ): Promise<boolean> {
    console.log(`[${this.source}] ========== TOKEN EXCHANGE START ==========`)
    console.log(`[${this.source}] → Exchanging authorization code for access token`)
    console.log(`[${this.source}] → Code:`, code.substring(0, 10) + '...')
    console.log(`[${this.source}] → Redirect URI:`, redirectUri)

    try {
      localStorage.setItem(`${this.configKey}-flow-log`, JSON.stringify({
        step: 'token-exchange-start',
        timestamp: Date.now(),
        redirectUri,
      }))

      const tokenRequestBody = new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
      })

      console.log(`[${this.source}] → Request body:`, tokenRequestBody.toString())

      const authHeader = btoa(`${clientId}:${clientSecret}`)
      console.log(`[${this.source}] → Using Basic Auth with client credentials`)

      const tokenUrl = this.OAUTH_TOKEN_URL
      const finalUrl = useCorsProxy 
        ? `https://corsproxy.io/?${encodeURIComponent(tokenUrl)}`
        : tokenUrl
      
      if (useCorsProxy) {
        console.log(`[${this.source}] → Original URL:`, tokenUrl)
        console.log(`[${this.source}] → Using CORS proxy:`, finalUrl)
      } else {
        console.log(`[${this.source}] → Direct URL:`, finalUrl)
      }
      console.log(`[${this.source}] → Sending POST request...`)

      const response = await fetch(finalUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${authHeader}`,
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json',
        },
        body: tokenRequestBody.toString(),
      })

      console.log(`[${this.source}] ← Response status:`, response.status)
      console.log(`[${this.source}] ← Response statusText:`, response.statusText)
      console.log(`[${this.source}] ← Response headers:`, Object.fromEntries(response.headers.entries()))

      if (!response.ok) {
        let errorText = ''
        let errorJson = null
        
        try {
          errorText = await response.text()
          console.error(`[${this.source}] ✗ Error response body (raw):`, errorText)
          
          try {
            errorJson = JSON.parse(errorText)
            console.error(`[${this.source}] ✗ Error response body (parsed):`, errorJson)
          } catch {
            console.error(`[${this.source}] ✗ Could not parse error response as JSON`)
          }
        } catch (readError) {
          console.error(`[${this.source}] ✗ Could not read error response body:`, readError)
          errorText = 'Could not read response body'
        }
        
        console.error(`[${this.source}] ✗ Token exchange failed:`, response.status, response.statusText)
        
        localStorage.setItem(`${this.configKey}-flow-log`, JSON.stringify({
          step: 'token-exchange-failed',
          timestamp: Date.now(),
          status: response.status,
          statusText: response.statusText,
          errorBody: errorText,
          errorJson: errorJson,
          requestDetails: {
            url: this.OAUTH_TOKEN_URL,
            redirectUri,
            codeLength: code.length,
            clientIdLength: clientId.length,
            clientSecretLength: clientSecret.length,
          }
        }))
        
        return false
      }

      const data: OAuth2TokenResponse = await response.json()
      console.log(`[${this.source}] ✓ Token exchange successful!`)
      console.log(`[${this.source}] → Access token received:`, data.access_token.substring(0, 10) + '...')
      console.log(`[${this.source}] → Expires in:`, data.expires_in, 'seconds')

      const expiresAt = Date.now() + (data.expires_in * 1000)

      const config: OAuth2Config = {
        clientId,
        clientSecret,
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresAt,
      }

      console.log(`[${this.source}] → Saving config...`)
      await this.saveOAuthConfig(config)
      console.log(`[${this.source}] ✓ Config saved successfully!`)
      
      localStorage.setItem(`${this.configKey}-flow-log`, JSON.stringify({
        step: 'token-saved',
        timestamp: Date.now(),
        expiresAt,
      }))
      
      console.log(`[${this.source}] ========== TOKEN EXCHANGE COMPLETE ==========`)

      return true
    } catch (error) {
      console.error(`[${this.source}] ✗✗✗ TOKEN EXCHANGE EXCEPTION ✗✗✗`)
      console.error(`[${this.source}] Error:`, error)
      
      let errorMessage = 'Unknown error'
      let isCorsError = false
      
      if (error instanceof Error) {
        console.error(`[${this.source}] Error message:`, error.message)
        console.error(`[${this.source}] Error stack:`, error.stack)
        errorMessage = error.message
        
        if (error.message.includes('CORS') || 
            error.message.includes('Access-Control-Allow-Origin') ||
            error.message.includes('NetworkError') ||
            error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
          isCorsError = true
          console.error(`[${this.source}] ✗ CORS error detected - the CORS proxy may be unavailable`)
        }
      }
      
      localStorage.setItem(`${this.configKey}-flow-log`, JSON.stringify({
        step: 'token-exchange-exception',
        timestamp: Date.now(),
        error: errorMessage,
        stack: error instanceof Error ? error.stack : undefined,
        isCorsError,
        note: isCorsError ? 'CORS proxy (corsproxy.io) may be unavailable. This is required because browsers block direct OAuth token exchanges for security reasons.' : undefined,
      }))
      
      return false
    }
  }

  /**
   * Make an authenticated API request with OAuth2 bearer token
   * @param url - The API endpoint URL
   * @param options - Fetch options
   * @returns The fetch response
   */
  protected async authenticatedRequest(url: string, options: RequestInit = {}): Promise<Response> {
    const config = await this.getOAuthConfig()
    
    if (!config || !config.accessToken) {
      throw new Error(`${this.source} OAuth access token not configured`)
    }

    return fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        'Authorization': `Bearer ${config.accessToken}`,
        'Accept': 'application/json',
      }
    })
  }
}
