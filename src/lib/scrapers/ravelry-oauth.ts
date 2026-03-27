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
      // Local config is source-of-truth for browser OAuth flow.
      // Backend validation is best-effort and should never block local usage.
      if (parsed.accessToken) {
        try {
          await APIService.getOAuthConfig('ravelry')
        } catch (error: any) {
          // If backend is temporarily unavailable or auth/session is still warming up,
          // keep using local config so callback handling and re-auth continue to work.
          console.warn('[Ravelry OAuth] Backend config check failed, using local config:', {
            status: error?.status,
            message: error?.message,
          })
          return parsed
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

    // Keep backend OAuth config in sync before callback token exchange.
    // The backend callback endpoint relies on stored client/redirect config.
    if (config.clientId && config.clientSecret) {
      try {
        const upsertPayload: {
          clientId: string
          clientSecret: string
          accessToken?: string
          refreshToken?: string
          redirectUri?: string
        } = {
          clientId: config.clientId,
          clientSecret: config.clientSecret,
          accessToken: config.accessToken,
          refreshToken: config.refreshToken,
        }

        // Only include redirectUri when it is explicitly set to avoid clobbering
        // any previously stored redirect URI in the backend with an empty value.
        if (config.redirectUri !== undefined) {
          upsertPayload.redirectUri = config.redirectUri
        }

        await APIService.upsertOAuthConfig('ravelry', upsertPayload)
      } catch (error: any) {
        // Best-effort: do not block token persistence or local usage
        console.warn('[Ravelry OAuth] Failed to upsert backend OAuth config, continuing with local config only:', {
          status: error?.status,
          message: error?.message,
        })
      }
    }
    
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
  // Backend responses may omit clientSecret; accessToken is the primary signal of an active connection.
  return !!(config && config.accessToken)
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
      requestDetails: {
        url: OAUTH_TOKEN_URL,
        redirectUri,
        codeLength: code.length,
        clientIdLength: clientId.length,
        clientSecretLength: clientSecret.length,
      },
    }))

    const data = await APIService.completeOAuthCallback('ravelry', code)

      // Accept either camelCase or snake_case fields from backend responses.
      const accessToken = data?.accessToken ?? data?.access_token
      const refreshToken = data?.refreshToken ?? data?.refresh_token
      const expiresIn = data?.expiresIn ?? data?.expires_in
      const username = data?.username

      let resolvedAccessToken = accessToken
      let resolvedRefreshToken = refreshToken
      let resolvedUsername = username

      // If callback response omits token fields, pull current config from backend.
      if (!resolvedAccessToken) {
        try {
          const backendConfig = await APIService.getOAuthConfig('ravelry')
          resolvedAccessToken = backendConfig?.accessToken ?? backendConfig?.access_token
          resolvedRefreshToken = resolvedRefreshToken ?? backendConfig?.refreshToken ?? backendConfig?.refresh_token
          resolvedUsername = resolvedUsername ?? backendConfig?.username
        } catch (configError) {
          console.warn('[Ravelry OAuth] Could not refresh OAuth config after callback:', configError)
        }
      }

      if (!resolvedAccessToken) {
        console.error('[Ravelry OAuth] Callback succeeded but no access token was returned or available from config')
        return false
      }

      const expiresAt = expiresIn
        ? Date.now() + (expiresIn * 1000)
        : undefined

      const config: OAuth2Config = {
        clientId,
        clientSecret,
        accessToken: resolvedAccessToken,
        refreshToken: resolvedRefreshToken,
        username: resolvedUsername,
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
  } catch (error) {
    console.error('[Ravelry OAuth] Exception during token exchange:', error)

    const apiError = error as any
    const status = apiError?.status
    const message = apiError?.message || (error instanceof Error ? error.message : String(error))
    const hint = status === 404
      ? 'Backend missing /scrapers/oauth/{platform}/callback endpoint'
      : undefined
    
    localStorage.setItem(FLOW_LOG_KEY, JSON.stringify({
      step: 'token-exchange-exception',
      timestamp: Date.now(),
      status,
      error: message,
      hint,
      requestDetails: {
        url: '/api/scrapers/oauth/ravelry/callback',
        redirectUri,
        codeLength: code.length,
        clientIdLength: clientId.length,
        clientSecretLength: clientSecret.length,
      },
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
