/**
 * Ravelry OAuth Manager
 * Handles OAuth2 flow for Ravelry authentication
 */

import { APIService } from '../api'

export interface OAuth2Config {
  clientId: string
  clientSecret: string
  accessToken?: string
  refreshToken?: string
  username?: string
  expiresAt?: number
  redirectUri?: string
}

const CONFIG_KEY = 'ravelry-oauth-config'
const STATE_KEY = 'ravelry-oauth-config-state'
const FLOW_LOG_KEY = 'ravelry-oauth-flow-log'

const OAUTH_AUTHORIZE_URL = 'https://www.ravelry.com/oauth2/auth'
const OAUTH_TOKEN_URL = 'https://www.ravelry.com/oauth2/token'
const SCOPES = 'offline forum-write'

/**
 * Generate a secure random state parameter for OAuth2 flow
 */
function generateState(): string {
  const array = new Uint8Array(16)
  crypto.getRandomValues(array)
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('')
}

/**
 * Get OAuth configuration from localStorage
 */
async function getConfig(): Promise<OAuth2Config | null> {
  try {
    const configStr = localStorage.getItem(CONFIG_KEY)
    if (configStr) {
      const parsed = JSON.parse(configStr) as OAuth2Config
      // Only validate against backend if we expect a stored token there
      if (parsed.accessToken) {
        try {
          await APIService.getOAuthConfig('ravelry')
        } catch (error: any) {
          if (error?.status === 404) {
            // Backend lost config but we have it in localStorage; return it
            // The caller can retry saveConfig to re-sync with backend
            console.warn('[Ravelry OAuth] Backend missing config but found in localStorage; will resync on next save')
            return parsed
          }
          throw error
        }
      }
      return parsed
    }

    // If not in localStorage, try backend
    try {
      const response = await APIService.getOAuthConfig('ravelry')
      if (response) {
        localStorage.setItem(CONFIG_KEY, JSON.stringify(response))
        return response
      }
    } catch (error) {
      // Ignore if not found; treat as no config
      if ((error as any)?.status === 404) return null
      throw error
    }

    return null
  } catch (error) {
    console.error('[Ravelry OAuth] Error retrieving config:', error)
    return null
  }
}

/**
 * Save OAuth configuration to localStorage AND backend
 */
async function saveConfig(config: OAuth2Config): Promise<void> {
  const SAVE_LOG_KEY = 'ravelry-oauth-save-log'
  try {
    console.log('[Ravelry OAuth] Saving config...')
    // Save to localStorage for temporary access
    localStorage.setItem(CONFIG_KEY, JSON.stringify(config))
    
    // Save token to backend database
    if (config.accessToken) {
      // Add a small delay to ensure auth is ready (session may be initializing)
      await new Promise(resolve => setTimeout(resolve, 500))
      
      let lastError: any;
      // Retry once if authorization fails (session might not be ready yet)
      for (let attempt = 1; attempt <= 2; attempt++) {
        try {
          console.log(`[Ravelry OAuth] Saving token to backend (attempt ${attempt}/2)...`)
          console.log('[Ravelry OAuth] Payload:', {
            access_token: config.accessToken ? `***${config.accessToken.slice(-10)}` : null,
            refresh_token: config.refreshToken ? 'present' : 'missing',
            client_id: config.clientId ? `***${config.clientId.slice(-6)}` : null,
            client_secret: config.clientSecret ? 'present' : 'missing',
            redirect_uri: config.redirectUri,
          })
          const response = await APIService.saveOAuthToken('ravelry', {
            access_token: config.accessToken,
            refresh_token: config.refreshToken,
            client_id: config.clientId,
            client_secret: config.clientSecret,
            redirect_uri: config.redirectUri || '',
          })
          console.log('[Ravelry OAuth] Config saved successfully, response:', response)
          localStorage.setItem(SAVE_LOG_KEY, JSON.stringify({
            timestamp: Date.now(),
            success: true,
            message: 'Token saved to backend',
            response,
          }))
          return
        } catch (error: any) {
          lastError = error
          const errorLog = {
            timestamp: Date.now(),
            attempt,
            success: false,
            error: error instanceof Error ? error.message : String(error),
            status: error?.status,
            data: error?.data,
          }
          console.error(`[Ravelry OAuth] Save attempt ${attempt} failed:`, errorLog)
          localStorage.setItem(SAVE_LOG_KEY, JSON.stringify(errorLog))
          
          if (error?.status === 401 && attempt === 1) {
            console.warn('[Ravelry OAuth] Authorization failed on attempt 1, waiting and retrying...')
            await new Promise(resolve => setTimeout(resolve, 1000))
            continue
          }
          throw error
        }
      }
      throw lastError
    }
  } catch (error) {
    console.error('[Ravelry OAuth] Failed to save config:', error)
    throw error
  }
}

/**
 * Clear OAuth configuration from localStorage AND backend
 */
async function clearConfig(): Promise<void> {
  try {
    localStorage.removeItem(CONFIG_KEY)
    // Delete token from backend database
    try {
      await APIService.disconnectOAuth('ravelry')
    } catch (error: any) {
      // If backend already has no config (e.g., after DB reset), ignore 404
      if (error?.status !== 404) {
        throw error
      }
    }
    console.log('[Ravelry OAuth] Configuration cleared')
  } catch (error) {
    console.error('[Ravelry OAuth] Failed to clear configuration:', error)
    throw error
  }
}

/**
 * Check if authorized (has valid credentials)
 */
async function isAuthorized(): Promise<boolean> {
  const config = await getConfig()
  return !!(config && config.accessToken && config.clientId && config.clientSecret)
}

/**
 * Get the OAuth2 authorization URL
 */
async function getAuthorizationUrl(redirectUri: string): Promise<string> {
  console.log('[Ravelry OAuth] Getting authorization URL')
  
  const config = await getConfig()
  if (!config?.clientId) {
    throw new Error('Client ID not configured')
  }
  
  const state = generateState()
  localStorage.setItem(STATE_KEY, state)
  
  const params = new URLSearchParams({
    client_id: config.clientId,
    response_type: 'code',
    redirect_uri: redirectUri,
    scope: SCOPES,
    state,
  })
  
  return `${OAUTH_AUTHORIZE_URL}?${params.toString()}`
}

/**
 * Exchange authorization code for access token
 */
async function exchangeCodeForToken(
  code: string,
  clientId: string,
  clientSecret: string,
  redirectUri: string,
): Promise<boolean> {
  console.log('[Ravelry OAuth] Exchanging code for token...')

  try {
    localStorage.setItem(FLOW_LOG_KEY, JSON.stringify({
      step: 'token-exchange-start',
      timestamp: Date.now(),
      redirectUri,
    }))

    const tokenRequestBody = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
    })

    const authHeader = btoa(`${clientId}:${clientSecret}`)
    
    // Use CORS proxy for token exchange (required for browser-based OAuth)
    const tokenUrl = `https://corsproxy.io/?${encodeURIComponent(OAUTH_TOKEN_URL)}`
    
    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${authHeader}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: tokenRequestBody.toString(),
    })

    if (response.ok) {
      const data = await response.json()
      
      const expiresAt = data.expires_in 
        ? Date.now() + (data.expires_in * 1000) 
        : undefined

      const config: OAuth2Config = {
        clientId,
        clientSecret,
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresAt,
        redirectUri,
      }

      await saveConfig(config)
      
      localStorage.setItem(FLOW_LOG_KEY, JSON.stringify({
        step: 'token-saved',
        timestamp: Date.now(),
        expiresAt,
      }))

      console.log('[Ravelry OAuth] Token exchange successful')
      return true
    }

    const errorText = await response.text()
    console.error('[Ravelry OAuth] Token exchange failed:', response.status, errorText)
    
    localStorage.setItem(FLOW_LOG_KEY, JSON.stringify({
      step: 'token-exchange-failed',
      timestamp: Date.now(),
      status: response.status,
      error: errorText,
    }))

    return false
  } catch (error) {
    console.error('[Ravelry OAuth] Exception during token exchange:', error)
    
    localStorage.setItem(FLOW_LOG_KEY, JSON.stringify({
      step: 'token-exchange-exception',
      timestamp: Date.now(),
      error: error instanceof Error ? error.message : String(error),
    }))

    return false
  }
}

/**
 * Ensure token is saved to backend (for pre-flight before scraper runs)
 * Retrieves config and attempts to re-save if needed
 */
async function ensureTokenSaved(): Promise<boolean> {
  try {
    console.log('[Ravelry OAuth] ensureTokenSaved: starting pre-flight check...')
    
    // Check what's in localStorage
    const localStorageConfig = localStorage.getItem(CONFIG_KEY)
    console.log('[Ravelry OAuth] ensureTokenSaved: localStorage config exists:', !!localStorageConfig)
    if (localStorageConfig) {
      try {
        const parsed = JSON.parse(localStorageConfig)
        console.log('[Ravelry OAuth] ensureTokenSaved: localStorage config keys:', Object.keys(parsed))
        console.log('[Ravelry OAuth] ensureTokenSaved: has accessToken:', !!parsed.accessToken)
        console.log('[Ravelry OAuth] ensureTokenSaved: accessToken length:', parsed.accessToken?.length || 0)
      } catch (e) {
        console.error('[Ravelry OAuth] ensureTokenSaved: failed to parse localStorage config:', e)
      }
    }
    
    const config = await getConfig()
    console.log('[Ravelry OAuth] ensureTokenSaved: getConfig returned:', config ? 'config object' : 'null')
    
    if (!config) {
      console.warn('[Ravelry OAuth] ensureTokenSaved: config is null after getConfig')
      console.warn('[Ravelry OAuth] ensureTokenSaved: checking localStorage directly...')
      const direct = localStorage.getItem(CONFIG_KEY)
      console.warn('[Ravelry OAuth] ensureTokenSaved: direct localStorage.getItem(CONFIG_KEY):', direct ? 'found' : 'NOT found')
      return false
    }
    
    console.log('[Ravelry OAuth] ensureTokenSaved: config returned has accessToken:', !!config.accessToken)
    console.log('[Ravelry OAuth] ensureTokenSaved: config returned has clientId:', !!config.clientId)
    console.log('[Ravelry OAuth] ensureTokenSaved: config returned has clientSecret:', !!config.clientSecret)
    
    if (!config?.accessToken) {
      console.warn('[Ravelry OAuth] ensureTokenSaved: No access token found in config')
      return false
    }
    
    // Try to re-save to backend to ensure persistence
    console.log('[Ravelry OAuth] ensureTokenSaved: Re-saving config to backend for safety...')
    await saveConfig(config)
    console.log('[Ravelry OAuth] ensureTokenSaved: Config re-saved to backend successfully')
    return true
  } catch (error) {
    console.error('[Ravelry OAuth] ensureTokenSaved: Failed to ensure token saved:', error)
    if (error instanceof Error) {
      console.error('[Ravelry OAuth] ensureTokenSaved: Error message:', error.message)
      console.error('[Ravelry OAuth] ensureTokenSaved: Error stack:', error.stack)
    }
    return false
  }
}

export const RavelryOAuthManager = {
  getConfig,
  saveConfig,
  clearConfig,
  isAuthorized,
  getAuthorizationUrl,
  exchangeCodeForToken,
  ensureTokenSaved,
}
