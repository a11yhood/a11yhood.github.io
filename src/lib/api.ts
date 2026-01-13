/**
 * API service layer for backend communication.
 * 
 * Provides type-safe REST client with automatic snake_case/camelCase conversion.
 * All requests include auth token from AuthContext when available.
 * Token getter is set by AuthContext once on app load.
 * 
 * Security: Never bypasses backend validation; all authorization enforced server-side.
 */
import { UserAccount, UserActivity, Product, Rating, Discussion, ScrapingLog, BlogPost, Collection, CollectionCreateInput, UserRequest } from './types'
import { ProductUrl, ProductUrlCreate, ProductUrlUpdate } from '../types/product-url'

// Use relative path for dev/preview (Vite proxy will handle it), or explicit URL if configured
export function getApiBaseUrl(
  configuredUrl?: string,
  locationOrigin?: string,
  locationProtocol?: string
) {
  const configuredBaseUrl = configuredUrl ?? import.meta.env.VITE_API_URL ?? ''

  const origin = locationOrigin ?? (typeof window !== 'undefined' ? window.location.origin : '')

  // For https localhost frontend talking to http localhost backend, fall back to relative paths
  // so the Vite proxy can avoid mixed-content/CORS. Only do this for runtime (when locationOrigin
  // is not explicitly supplied, e.g., tests pass locationOrigin and should keep the configured base).
  if (!locationOrigin && configuredBaseUrl.startsWith('http://localhost') && origin.startsWith('https://localhost')) {
    return ''
  }

  // When running on localhost without explicit API URL,
  // use relative paths so Vite proxy can handle requests to the backend
  if (!configuredBaseUrl) return ''

  // If a base URL is explicitly configured, always return it (even if http on https localhost);
  // environments that need proxying should leave VITE_API_URL unset.
  return configuredBaseUrl
}

// Token getter function set by AuthContext on app load.
// In dev mode: returns dev-token-<user_id>
// In prod mode: returns Supabase session access token
let getAuthToken: (() => Promise<string | null>) | null = null

export function setAuthTokenGetter(getter: () => Promise<string | null>) {
  console.log('[API] setAuthTokenGetter called - token getter registered')
  getAuthToken = getter
}

/**
 * Convert snake_case API responses to camelCase for frontend consumption.
 * Recursively handles nested objects and arrays.
 */
function toCamelCase(obj: any): any {
  if (obj === null || obj === undefined) return obj
  if (Array.isArray(obj)) return obj.map(toCamelCase)
  if (typeof obj !== 'object') return obj
  
  const result: any = {}
  for (const [key, value] of Object.entries(obj)) {
    const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase())
    result[camelKey] = toCamelCase(value)
  }
  return result
}

/**
 * Convert camelCase request bodies to snake_case for backend compatibility.
 * Backend expects snake_case field names in all API contracts.
 */
function toSnakeCase(obj: any): any {
  if (obj === null || obj === undefined) return obj
  if (Array.isArray(obj)) return obj.map(toSnakeCase)
  if (typeof obj !== 'object') return obj
  
  const result: any = {}
  for (const [key, value] of Object.entries(obj)) {
    const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`)
    result[snakeKey] = toSnakeCase(value)
  }
  return result
}

class APIError extends Error {
  constructor(
    message: string,
    public status: number,
    public data?: any
  ) {
    super(message)
    this.name = 'APIError'
  }
}

/**
 * Process API response and handle errors.
 * 
 * FastAPI returns error details in 'detail' field; falls back to 'message' for compatibility.
 * Throws APIError with status code for upstream handling (e.g., toast notifications).
 */
async function handleResponse<T>(response: Response): Promise<T> {
  const isCountRequest = response.url.includes('/products/count')
  const isDeleteRequest = response.url.includes('/disconnect') || response.url.includes('/delete')
  
  console.log('[API.handleResponse] Processing response:', {
    url: response.url,
    status: response.status,
    statusText: response.statusText,
    ok: response.ok,
    contentType: response.headers.get('content-type'),
  })
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: response.statusText }))
    // FastAPI returns errors with 'detail' field, fallback to 'message' for other APIs
    const errorMessage = errorData.detail || errorData.message || `HTTP ${response.status}: ${response.statusText}`
    console.error('[API.handleResponse] Error response:', {
      url: response.url,
      status: response.status,
      statusText: response.statusText,
      errorMessage,
      errorData
    })
    throw new APIError(
      errorMessage,
      response.status,
      errorData
    )
  }
  if (response.status === 204 || response.status === 205) {
    // No content to parse
    console.log('[API.handleResponse] No content response (204/205):', { status: response.status })
    return undefined as T
  }
  const data = await response.json()
  if (isCountRequest) {
    console.log('[API.handleResponse] Count response:', { url: response.url, rawData: data })
  }
  if (isDeleteRequest) {
    console.log('[API.handleResponse] Delete response:', { url: response.url, status: response.status, data })
  }
  return toCamelCase(data) as T
}

async function request<T>(
  endpoint: string,
  options: RequestInit & { signal?: AbortSignal } = {}
): Promise<T> {
  const base = getApiBaseUrl()
  const url = `${base}/api${endpoint}`
  const startTime = performance.now()
  
  console.debug('[API] Request details:', { 
    endpoint, 
    base, 
    url,
    envViteApiUrl: import.meta.env.VITE_API_URL,
    windowOrigin: typeof window !== 'undefined' ? window.location.origin : 'N/A'
  })
  
  // Extract and log query parameters for debugging
  if (endpoint.includes('?')) {
    const [path, queryString] = endpoint.split('?')
    const params = new URLSearchParams(queryString)
    console.debug('[API] Query parameters:', Object.fromEntries(params.entries()))
  }
  
  // For public user profile reads (base endpoint and /stats), skip auth.
  // Private endpoints like /requests, /owned-products, /me, /collections, /role MUST include auth.
  const omitAuth = 
    endpoint.startsWith('/users/') && 
    (!options.method || options.method === 'GET') &&
    !endpoint.includes('/requests') &&
    !endpoint.includes('/owned-products') &&
    !endpoint.includes('/collections') &&
    !endpoint.includes('/role') &&
    !endpoint.includes('/me')

  // Get auth token from registered getter (set by AuthContext on app load).
  // If no getter is registered, token will be null and the request will be sent without Authorization.
  // Backend will enforce auth checks and return 401 if required.
  const token = omitAuth ? null : (getAuthToken ? await getAuthToken() : null)
  const shouldSendAuth = !!token && !omitAuth
  
  console.debug('[API] Making request:', { endpoint, hasTokenGetter: !!getAuthToken, hasToken: !!token, omitAuth, shouldSendAuth })

  // Convert body to snake_case if present
  const processedOptions = { ...options }
  if (processedOptions.body && typeof processedOptions.body === 'string') {
    try {
      const bodyObj = JSON.parse(processedOptions.body)
      const snakeCaseBody = toSnakeCase(bodyObj)
      console.debug('[API] Body conversion - camelCase:', bodyObj)
      console.debug('[API] Body conversion - snake_case:', snakeCaseBody)
      processedOptions.body = JSON.stringify(snakeCaseBody)
    } catch {
      // If body is not JSON, leave it as is
    }
  }

  const response = await fetch(url, {
    ...processedOptions,
    headers: {
      'Content-Type': 'application/json',
      ...(shouldSendAuth ? { 'Authorization': `Bearer ${token}` } : {}),
      // Fallback header for proxies that may drop Authorization
      ...(shouldSendAuth ? { 'X-Forwarded-Authorization': token } : {}),
      ...options.headers,
    },
  })
  const result = await handleResponse<T>(response)
  
  const endTime = performance.now()
  const duration = endTime - startTime
  console.info(`[API] ${options.method || 'GET'} ${endpoint}: ${duration.toFixed(1)}ms`)
  
  return result
}

export class APIService {
  // Backwards-compatible alias so tests can call APIService.setAuthTokenGetter
  static setAuthTokenGetter(getter: () => Promise<string | null>) {
    setAuthTokenGetter(getter)
  }
  
  // Get API base URL for constructing full URLs
  static getBaseUrl(): string {
    return getApiBaseUrl()
  }
  
  // Get current authenticated user from backend
  static async getCurrentUser(): Promise<UserAccount | null> {
    try {
      return await request<UserAccount>('/users/me')
    } catch (error) {
      return null
    }
  }
  
  // Sign out from backend
  static async signOut(): Promise<void> {
    await request('/auth/signout', {
      method: 'POST',
    })
  }
  
  static async getUserAccount(username: string): Promise<UserAccount | null> {
    return request<UserAccount | null>(`/users/${encodeURIComponent(username)}`)
  }

  static async createOrUpdateUserAccount(
    username: string,
    login: string,
    avatarUrl: string,
    email?: string
  ): Promise<UserAccount> {
    return request<UserAccount>(`/users/${encodeURIComponent(username)}` , {
      method: 'PUT',
      body: JSON.stringify({ username: login, avatarUrl, email }),
    })
  }

  static async updateUserProfile(
    username: string,
    updates: Partial<Pick<UserAccount, 'displayName' | 'bio' | 'location' | 'website' | 'preferences'>>
  ): Promise<UserAccount | null> {
    return request<UserAccount | null>(`/users/${encodeURIComponent(username)}/profile`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    })
  }

  static async setUserRole(
    username: string,
    role: 'user' | 'moderator' | 'admin'
  ): Promise<UserAccount | null> {
    return request<UserAccount | null>(`/users/${encodeURIComponent(username)}/role`, {
      method: 'PATCH',
      body: JSON.stringify({ role }),
    })
  }

  static async getModerators(): Promise<UserAccount[]> {
    return request<UserAccount[]>('/users?role=moderator')
  }

  static async getAllUsers(): Promise<UserAccount[]> {
    return request<UserAccount[]>('/users')
  }

  static async incrementUserStats(
    username: string,
    stat: 'productsSubmitted' | 'ratingsGiven' | 'discussionsParticipated'
  ): Promise<void> {
    await request(`/users/${encodeURIComponent(username)}/stats/${stat}`, {
      method: 'POST',
    })
  }

  static async logUserActivity(activity: UserActivity): Promise<UserActivity> {
    return request<UserActivity>('/activities', {
      method: 'POST',
      body: JSON.stringify(activity),
    })
  }

  static async getUserActivities(username: string, limit = 50): Promise<UserActivity[]> {
    return request<UserActivity[]>(`/activities?username=${encodeURIComponent(username)}&limit=${limit}`)
  }

  static async getUserStats(username: string): Promise<{
    productsSubmitted: number
    ratingsGiven: number
    discussionsParticipated: number
    totalContributions: number
  }> {
    try {
      return await request(`/users/${encodeURIComponent(username)}/stats`)
    } catch (error) {
      // Return empty stats if endpoint doesn't exist yet
      return {
        productsSubmitted: 0,
        ratingsGiven: 0,
        discussionsParticipated: 0,
        totalContributions: 0
      }
    }
  }

  static async getAllProducts(options?: {
    includeBanned?: boolean
    search?: string
    limit?: number
    offset?: number
    sources?: string[]
    types?: string[]
    tags?: string[]
    minRating?: number
    updatedSince?: string // ISO date string
    sortBy?: 'rating' | 'updated_at' | 'created_at'
    sortOrder?: 'asc' | 'desc'
    signal?: AbortSignal
  }): Promise<Product[]> {
    const params = new URLSearchParams()
    if (options?.includeBanned) {
      params.set('include_banned', 'true')
    }
    if (options?.search) {
      params.set('search', options.search)
    }
    options?.sources?.forEach((source) => {
      if (source) params.append('source', source)
    })
    options?.types?.forEach((type) => {
      if (type) params.append('type', type)
    })
    options?.tags?.forEach((tag) => {
      if (tag) params.append('tags', tag)
    })
    if (options?.minRating !== undefined) {
      params.set('min_rating', String(options.minRating))
    }
    if (options?.updatedSince !== undefined) {
      params.set('updated_since', options.updatedSince)
    }
    if (options?.sortBy !== undefined) {
      params.set('sort_by', options.sortBy)
    }
    if (options?.sortOrder !== undefined) {
      params.set('sort_order', options.sortOrder)
    }
    if (options?.limit !== undefined) {
      params.set('limit', String(options.limit))
    }
    if (options?.offset !== undefined) {
      params.set('offset', String(options.offset))
    }
    const suffix = params.toString() ? `?${params.toString()}` : ''
    console.debug('[API] getAllProducts URL:', `/products${suffix}`)
    console.debug('[API] Source filters:', options?.sources)
    return request<Product[]>(`/products${suffix}`, { signal: options?.signal })
  }

  static async getProductCount(options?: {
    includeBanned?: boolean
    search?: string
    sources?: string[]
    types?: string[]
    tags?: string[]
    minRating?: number
    updatedSince?: string // ISO date string
    signal?: AbortSignal
  }): Promise<number> {
    const params = new URLSearchParams()
    if (options?.includeBanned) {
      params.set('include_banned', 'true')
    }
    if (options?.search) {
      params.set('search', options.search)
    }
    options?.sources?.forEach((source) => {
      if (source) params.append('source', source)
    })
    options?.types?.forEach((type) => {
      if (type) params.append('type', type)
    })
    options?.tags?.forEach((tag) => {
      if (tag) params.append('tags', tag)
    })
    if (options?.minRating !== undefined) {
      params.set('min_rating', String(options.minRating))
    }
    if (options?.updatedSince !== undefined) {
      params.set('updated_since', options.updatedSince)
    }
    const suffix = params.toString() ? `?${params.toString()}` : ''
    const data = await request<{ count: number }>(`/products/count${suffix}`, { signal: options?.signal })
    return data.count || 0
  }

  static async getProductsBySource(
    source: string,
    options?: { includeBanned?: boolean; limit?: number; offset?: number; search?: string; sortBy?: 'rating' | 'updated_at' | 'created_at'; sortOrder?: 'asc' | 'desc' }
  ): Promise<Product[]> {
    const params = new URLSearchParams()
    if (source) params.set('source', source)
    if (options?.includeBanned) params.set('include_banned', 'true')
    if (options?.limit !== undefined) params.set('limit', String(options.limit))
    if (options?.offset !== undefined) params.set('offset', String(options.offset))
    if (options?.search) params.set('search', options.search)
    if (options?.sortBy !== undefined) params.set('sort_by', options.sortBy)
    if (options?.sortOrder !== undefined) params.set('sort_order', options.sortOrder)
    const suffix = params.toString() ? `?${params.toString()}` : ''
    return request<Product[]>(`/products${suffix}`)
  }

  static async getProductCountBySource(source: string, options?: { includeBanned?: boolean }): Promise<number> {
    const params = new URLSearchParams()
    params.set('source', source)
    if (options?.includeBanned) params.set('include_banned', 'true')
    const suffix = params.toString() ? `?${params.toString()}` : ''
    const endpoint = `/products/count${suffix}`
    
    console.log('[API.getProductCountBySource] Request:', {
      source,
      includeBanned: options?.includeBanned,
      queryString: params.toString(),
      endpoint,
      fullUrl: `${getApiBaseUrl()}/api${endpoint}`
    })
    
    try {
      const data = await request<{ count: number }>(endpoint)
      console.log('[API.getProductCountBySource] Success response:', {
        source,
        count: data.count,
        rawData: data,
        responseType: typeof data
      })
      return data.count ?? 0
    } catch (error) {
      console.error('[API.getProductCountBySource] Failed:', {
        source,
        endpoint,
        error: error instanceof Error ? error.message : String(error),
        fullError: error
      })
      throw error
    }
  }

  static async getProductSources(): Promise<Array<{ name: string; count: number }>> {
    const data = await request<{ sources: Array<{ name: string; count: number }> }>('/products/sources')
    return data.sources || []
  }

  static async getProductTypes(): Promise<string[]> {
    const data = await request<{ types: string[] }>('/products/types')
    return data.types || []
  }

  static async getPopularTags(limit: number = 10): Promise<string[]> {
    const data = await request<{ tags: string[] }>(`/products/tags?limit=${limit}`)
    return data.tags || []
  }

  static async getFilteredTags(options?: {
    search?: string
    sources?: string[]
    types?: string[]
    includeBanned?: boolean
    limit?: number
  }): Promise<string[]> {
    const params = new URLSearchParams()
    if (options?.search) params.set('search', options.search)
    if (options?.includeBanned) params.set('include_banned', 'true')
    if (options?.limit) params.set('limit', String(options.limit))
    options?.sources?.forEach((source) => {
      if (source) params.append('source', source)
    })
    options?.types?.forEach((type) => {
      if (type) params.append('type', type)
    })
    const suffix = params.toString() ? `?${params.toString()}` : ''
    console.log('[API.getFilteredTags] Calling /products/tags' + suffix, 'with options:', options)
    const data = await request<{ tags: string[] }>(`/products/tags${suffix}`)
    console.log('[API.getFilteredTags] Response tags count:', data.tags?.length || 0, 'tags:', data.tags?.slice(0, 20))
    const hasHtmlAudioElement = data.tags?.some(tag => tag.toLowerCase() === 'htmlaudioelement')
    console.log('[API.getFilteredTags] Contains "htmlaudioelement":', hasHtmlAudioElement, 'all tags:', data.tags)
    return data.tags || []
  }
  static async getProduct(productIdOrSlug: string): Promise<Product | null> {
    // Prefer slug lookup; falls back to ID lookup on 404 for backwards compatibility
    try {
      return await request<Product | null>(`/products/slug/${encodeURIComponent(productIdOrSlug)}`)
    } catch (error) {
      if (error instanceof APIError && error.status === 404) {
        return request<Product | null>(`/products/${productIdOrSlug}`)
      }
      throw error
    }
  }

  static async getProductBySlug(slug: string): Promise<Product | null> {
    return request<Product | null>(`/products/slug/${encodeURIComponent(slug)}`)
  }

  static async productExistsByUrl(url: string): Promise<{ exists: boolean; product?: Product }> {
    // Use a manual fetch so we can treat 404 as {exists:false} without throwing
    const endpoint = `/products/exists?url=${encodeURIComponent(url)}`
    const fullUrl = `${API_BASE_URL}/api${endpoint}`
    const token = getAuthToken ? await getAuthToken() : null

    const response = await fetch(fullUrl, {
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      },
    })

    if (response.status === 404) {
      return { exists: false }
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: response.statusText }))
      const errorMessage = (errorData as any).detail || (errorData as any).message || `HTTP ${response.status}: ${response.statusText}`
      throw new APIError(errorMessage, response.status, errorData)
    }

    const data = await response.json()
    return toCamelCase(data) as { exists: boolean; product?: Product }
  }

  static async loadUrl(url: string): Promise<{ success: boolean; product?: Partial<Product>; message?: string; source?: string }> {
    const supportsAbort = typeof AbortController !== 'undefined' && typeof AbortSignal !== 'undefined'
    const controller = supportsAbort ? new AbortController() : null
    const timeout = controller ? setTimeout(() => controller.abort(), 12000) : null // Safety timeout

    const load = async (withSignal: boolean) => request('/scrapers/load-url', {
      method: 'POST',
      body: JSON.stringify({ url }),
      ...(withSignal && controller ? { signal: controller.signal } : {}),
    })

    try {
      return await load(!!controller)
    } catch (err: any) {
      const message = String(err?.message || err)
      const signalMismatch = err instanceof TypeError && message.includes('Expected signal')

      // Some test environments use a different AbortSignal implementation; retry without it
      if (controller && signalMismatch) {
        return await load(false)
      }

      throw err
    } finally {
      if (timeout) clearTimeout(timeout)
    }
  }

  static async createProduct(product: Omit<Product, 'id' | 'createdAt'>): Promise<Product> {
    return request<Product>('/products', {
      method: 'POST',
      body: JSON.stringify(product),
    })
  }

  static async updateProduct(
    productId: string,
    updates: Partial<Product>,
    editorId?: string
  ): Promise<Product | null> {
    console.log('[API.updateProduct] Raw updates received:', updates)
    console.log('[API.updateProduct] EditorId:', editorId)
    
    // Extract only editable fields that match backend's ProductUpdate schema
    const editableUpdates: Partial<Product> = {
      name: updates.name,
      description: updates.description,
      source: updates.source,
      sourceUrl: updates.sourceUrl,
      type: updates.type,
      imageUrl: updates.imageUrl,
      imageAlt: updates.imageAlt,
      tags: updates.tags,
    }
    // Remove undefined fields
    Object.keys(editableUpdates).forEach(key => {
      if (editableUpdates[key as keyof typeof editableUpdates] === undefined) {
        delete editableUpdates[key as keyof typeof editableUpdates]
      }
    })
    
    console.log('[API.updateProduct] Filtered editable updates (camelCase):', editableUpdates)
    console.log('[API.updateProduct] Target endpoint:', `/products/${productId}`)
    
    return request<Product | null>(`/products/${productId}`, {
      method: 'PATCH',
      body: JSON.stringify(editableUpdates),
    })
  }

  static async deleteProduct(productSlug: string): Promise<void> {
    console.log('[API.deleteProduct] Starting delete for product slug:', productSlug)
    const endpoint = `/products/${productSlug}`
    const requestOptions = {
      method: 'DELETE',
    }
    
    console.log('[API.deleteProduct] Request details:', {
      endpoint,
      method: requestOptions.method,
      fullUrl: `${getApiBaseUrl()}/api${endpoint}`
    })
    
    try {
      const result = await request<void>(endpoint, requestOptions)
      console.log('[API.deleteProduct] Delete successful:', {
        productId,
        result,
        resultType: typeof result
      })
      return result
    } catch (error) {
      console.error('[API.deleteProduct] Delete failed:', {
        productId,
        endpoint,
        error: error instanceof Error ? error.message : String(error),
        errorStatus: (error as any)?.status,
        errorData: (error as any)?.data,
        fullError: error
      })
      throw error
    }
  }

  static async deleteProductsBySource(source: string): Promise<{ deletedCount: number }> {
    console.log('[API.deleteProductsBySource] Starting bulk delete for source:', source)
    
    // Backend expects 'source' as a query parameter
    const params = new URLSearchParams()
    params.set('source', source)
    const endpoint = `/products/bulk-delete?${params.toString()}`
    
    console.log('[API.deleteProductsBySource] Request details:', {
      source,
      queryParam: params.toString(),
      endpoint,
      fullUrl: `${getApiBaseUrl()}/api${endpoint}`
    })
    
    try {
      const result = await request<{ deletedCount: number }>(endpoint, {
        method: 'POST',
      })
      console.log('[API.deleteProductsBySource] ✅ SUCCESS - Backend deleted:', {
        source,
        deletedCount: result.deletedCount,
        result
      })
      return result
    } catch (error) {
      console.error('[API.deleteProductsBySource] ❌ FAILED:', {
        source,
        endpoint,
        error: error instanceof Error ? error.message : String(error),
        fullError: error
      })
      throw error
    }
  }

  static async deleteProductsByIds(productIds: string[]): Promise<{ deletedCount: number }> {
    console.log('[API] deleteProductsByIds called for IDs:', productIds)
    const params = new URLSearchParams()
    productIds.forEach(id => params.append('product_ids', id))
    const result = await request<{ deletedCount: number }>(`/products/bulk-delete?${params.toString()}`, {
      method: 'POST',
    })
    console.log('[API] deleteProductsByIds result:', result)
    return result
  }

  static async getProductsByUser(username: string): Promise<Product[]> {
    return request<Product[]>(`/users/${encodeURIComponent(username)}/products`)
  }

  static async banProduct(
    productId: string,
    reason?: string,
    bannedBy?: string
  ): Promise<Product | null> {
    console.log('[API.banProduct] Request start', { productId, reason, bannedBy })
    const safeId = encodeURIComponent(productId)
    const result = await request<Product | null>(`/products/${safeId}/ban`, {
      method: 'POST',
      body: JSON.stringify({ reason, bannedBy }),
    })
    console.log('[API.banProduct] Response', { productId, ok: !!result, banned: result?.banned, bannedBy: result?.bannedBy })
    return result
  }

  static async unbanProduct(productId: string): Promise<Product | null> {
    console.log('[API.unbanProduct] Request start', { productId })
    const safeId = encodeURIComponent(productId)
    const result = await request<Product | null>(`/products/${safeId}/unban`, {
      method: 'POST',
    })
    console.log('[API.unbanProduct] Response', { productId, ok: !!result, banned: result?.banned })
    return result
  }

  static async getBannedProductsBySource(): Promise<Record<string, number>> {
    return request<Record<string, number>>('/products/banned/by-source')
  }

  static async addProductOwner(productId: string, username: string): Promise<Product | null> {
    return request<Product | null>(`/products/${productId}/owners`, {
      method: 'POST',
      body: JSON.stringify({ username }),
    })
  }

  static async removeProductOwner(productId: string, username: string): Promise<Product | null> {
    return request<Product | null>(`/products/${productId}/owners/${encodeURIComponent(username)}`, {
      method: 'DELETE',
    })
  }

  static async getProductsByOwner(username: string): Promise<Product[]> {
    return request<Product[]>(`/products/owner/${encodeURIComponent(username)}`)
  }

  static async getProductOwners(productId: string): Promise<UserAccount[]> {
    return request<UserAccount[]>(`/products/${productId}/owners`)
  }

  // Product URLs
  static async getProductUrls(productId: string): Promise<ProductUrl[]> {
    return request<ProductUrl[]>(`/products/${productId}/urls`)
  }

  static async addProductUrl(productId: string, url: ProductUrlCreate): Promise<ProductUrl> {
    return request<ProductUrl>(`/products/${productId}/urls`, {
      method: 'POST',
      body: JSON.stringify(url),
    })
  }

  static async updateProductUrl(
    productId: string,
    urlId: string,
    updates: ProductUrlUpdate
  ): Promise<ProductUrl> {
    return request<ProductUrl>(`/products/${productId}/urls/${urlId}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    })
  }

  static async deleteProductUrl(productId: string, urlId: string): Promise<void> {
    await request(`/products/${productId}/urls/${urlId}`, {
      method: 'DELETE',
    })
  }

  static async getAllRatings(): Promise<Rating[]> {
    return request<Rating[]>('/ratings')
  }

  static async createRating(rating: Rating): Promise<Rating> {
    return request<Rating>('/ratings', {
      method: 'POST',
      body: JSON.stringify(rating),
    })
  }

  static async updateRating(productId: string, userId: string, rating: number): Promise<Rating> {
    return request<Rating>(`/ratings/${productId}/${userId}`, {
      method: 'PUT',
      body: JSON.stringify({ rating }),
    })
  }

  static async getRatingsByUser(username: string): Promise<Rating[]> {
    return request<Rating[]>(`/users/${encodeURIComponent(username)}/ratings`)
  }

  static async getAllDiscussions(): Promise<Discussion[]> {
    return request<Discussion[]>('/discussions')
  }

  static async createDiscussion(discussion: Omit<Discussion, 'id' | 'createdAt'>): Promise<Discussion> {
    return request<Discussion>('/discussions', {
      method: 'POST',
      body: JSON.stringify(discussion),
    })
  }

  static async updateDiscussion(
    discussionId: string,
    updates: Partial<Pick<Discussion, 'content'>>
  ): Promise<Discussion | null> {
    return request<Discussion | null>(`/discussions/${discussionId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    })
  }

  static async deleteDiscussion(discussionId: string): Promise<Discussion> {
    return request<Discussion>(`/discussions/${discussionId}`, {
      method: 'DELETE',
    })
  }

  static async blockDiscussion(discussionId: string, reason?: string): Promise<Discussion> {
    return request<Discussion>(`/discussions/${discussionId}/block`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    })
  }

  static async unblockDiscussion(discussionId: string): Promise<Discussion> {
    return request<Discussion>(`/discussions/${discussionId}/unblock`, {
      method: 'POST',
    })
  }

  static async getDiscussionsByUser(username: string): Promise<Discussion[]> {
    return request<Discussion[]>(`/users/${encodeURIComponent(username)}/discussions`)
  }

  static async logScrapingSession(log: Omit<ScrapingLog, 'id'>): Promise<ScrapingLog> {
    return request<ScrapingLog>('/scraping-logs', {
      method: 'POST',
      body: JSON.stringify(log),
    })
  }

  static async getScrapingLogs(limit = 50): Promise<ScrapingLog[]> {
    return request<ScrapingLog[]>(`/scraping-logs?limit=${limit}`)
  }

  static async triggerScraper(source: string, testMode = false, testLimit = 5): Promise<{ message: string; testMode: boolean; testLimit?: number }> {
    return request(`/scrapers/trigger`, {
      method: 'POST',
      body: JSON.stringify({
        source,
        testMode,
        testLimit,
      }),
    })
  }

  static async saveOAuthToken(platform: string, tokenData: any): Promise<{ message: string }> {
    return request(`/scrapers/oauth/${platform}/save-token`, {
      method: 'POST',
      body: JSON.stringify(tokenData),
    })
  }

  static async disconnectOAuth(platform: string): Promise<void> {
    return request(`/scrapers/oauth/${platform}/disconnect`, {
      method: 'DELETE',
    })
  }

  static async getOAuthConfig(platform: string): Promise<any> {
    return request(`/scrapers/oauth/${platform}/config`)
  }
  static async getScraperSearchTerms(platform: 'github' | 'thingiverse' | 'ravelry'): Promise<{ searchTerms: string[] }> {
    return request(`/scrapers/${platform}/search-terms`)
  }

  // Add a single search term using the add endpoint
  static async addScraperSearchTerm(platform: 'github' | 'thingiverse' | 'ravelry', searchTerm: string): Promise<{ searchTerms?: string[]; message?: string }> {
    return request(`/scrapers/${platform}/search-terms/add`, {
      method: 'POST',
      body: JSON.stringify({ searchTerm })
    })
  }

  static async updateScraperSearchTerms(platform: 'github' | 'thingiverse' | 'ravelry', searchTerms: string[]): Promise<{ searchTerms: string[]; message: string }> {
    return request(`/scrapers/${platform}/search-terms`, {
      method: 'POST',
      body: JSON.stringify({ searchTerms }),
    })
  }
  static async getAllBlogPosts(includeUnpublished = false): Promise<BlogPost[]> {
    return request<BlogPost[]>(`/blog-posts?includeUnpublished=${includeUnpublished}`)
  }

  static async getBlogPost(postId: string): Promise<BlogPost | null> {
    return request<BlogPost | null>(`/blog-posts/${postId}`)
  }

  static async getBlogPostBySlug(slug: string): Promise<BlogPost | null> {
    return request<BlogPost | null>(`/blog-posts/slug/${slug}`)
  }

  static async createBlogPost(post: Omit<BlogPost, 'id' | 'createdAt' | 'updatedAt'>): Promise<BlogPost> {
    return request<BlogPost>('/blog-posts', {
      method: 'POST',
      body: JSON.stringify(post),
    })
  }

  static async updateBlogPost(
    postId: string,
    updates: Partial<Omit<BlogPost, 'id' | 'createdAt'>>
  ): Promise<BlogPost | null> {
    return request<BlogPost | null>(`/blog-posts/${postId}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    })
  }

  static async deleteBlogPost(postId: string): Promise<{ success: boolean }> {
    return request<{ success: boolean }>(`/blog-posts/${postId}`, {
      method: 'DELETE',
    })
  }

  static async getAllCollections(): Promise<Collection[]> {
    return request<Collection[]>('/collections')
  }

  static async getCollection(collectionSlug: string): Promise<Collection | null> {
    const result = await request<Collection | null>(`/collections/${collectionSlug}`)
    if (result) {
      console.log(`[API] getCollection(${collectionSlug}):`, {
        id: result.id,
        name: result.name,
        productSlugsCount: result.productSlugs?.length || 0,
        productSlugs: result.productSlugs,
      })
    }
    return result
  }

  static async getUserCollections(): Promise<Collection[]> {
    // Gets the authenticated user's collections
    return request<Collection[]>('/collections')
  }

  static async getPublicCollections(sortBy?: 'created_at' | 'product_count' | 'updated_at', search?: string): Promise<Collection[]> {
    const params = new URLSearchParams()
    if (sortBy) params.append('sort_by', sortBy)
    if (search) params.append('search', search)
    const query = params.toString() ? `?${params.toString()}` : ''
    return request<Collection[]>(`/collections/public${query}`)
  }

  static async createCollection(collection: CollectionCreateInput): Promise<Collection> {
    return request<Collection>('/collections', {
      method: 'POST',
      body: JSON.stringify(collection),
    })
  }

  static async createCollectionFromSearch(
    searchParams: {
      name: string
      description?: string
      isPublic: boolean
      search?: string
      sources?: string[]
      types?: string[]
      tags?: string[]
      minRating?: number
      createdBy?: string
    }
  ): Promise<Collection> {
    return request<Collection>('/collections/from-search', {
      method: 'POST',
      body: JSON.stringify(searchParams),
    })
  }

  static async updateCollection(
    collectionId: string,
    updates: Partial<Omit<Collection, 'id' | 'createdAt' | 'updatedAt' | 'userId' | 'userName' | 'username' | 'productSlugs'>>
  ): Promise<Collection | null> {
    return request<Collection | null>(`/collections/${collectionId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    })
  }

  static async deleteCollection(collectionSlug: string): Promise<{ message: string }> {
    return request<{ message: string }>(`/collections/${collectionSlug}`, {
      method: 'DELETE',
    })
  }

  static async addProductToCollection(collectionSlug: string, productSlug: string): Promise<Collection | null> {
    console.log(`[API] addProductToCollection(${collectionSlug}, ${productSlug}) - sending POST request`)
    const result = await request<Collection | null>(`/collections/${collectionSlug}/products/${productSlug}`, {
      method: 'POST',
    })
    if (result) {
      console.log(`[API] ✅ addProductToCollection response:`, {
        id: result.id,
        name: result.name,
        productSlugsCount: result.productSlugs?.length || 0,
        productSlugs: result.productSlugs,
      })
    } else {
      console.error(`[API] ❌ addProductToCollection returned null/undefined`)
    }
    return result
  }

  static async removeProductFromCollection(collectionSlug: string, productSlug: string): Promise<Collection | null> {
    return request<Collection | null>(`/collections/${collectionSlug}/products/${productSlug}`, {
      method: 'DELETE',
    })
  }

  static async addMultipleProductsToCollection(collectionSlug: string, productSlugs: string[]): Promise<Collection | null> {
    return request<Collection | null>(`/collections/${collectionSlug}/products`, {
      method: 'POST',
      body: JSON.stringify({ productSlugs }),
    })
  }

  static async getUserRequests(username: string): Promise<UserRequest[]> {
    try {
      return await request<UserRequest[]>(`/users/${encodeURIComponent(username)}/requests`)
    } catch (error) {
      // Return empty array if endpoint doesn't exist yet
      return []
    }
  }

  static async getMyRequests(status?: string, type?: string): Promise<UserRequest[]> {
    const params = new URLSearchParams()
    if (status) params.append('status', status)
    if (type) params.append('type', type)
    const query = params.toString() ? `?${params.toString()}` : ''
    return request<UserRequest[]>(`/requests/me${query}`)
  }

  static async getAllPendingRequests(): Promise<UserRequest[]> {
    return request<UserRequest[]>('/requests/?status=pending')
  }

  static async getAllRequests(): Promise<UserRequest[]> {
    return request<UserRequest[]>('/requests/')
  }

  static async createUserRequest(
    requestData: Omit<UserRequest, 'id' | 'createdAt' | 'status'>
  ): Promise<UserRequest> {
    return request<UserRequest>('/requests/', {
      method: 'POST',
      body: JSON.stringify(requestData),
    })
  }

  static async approveRequest(requestId: string, reviewerId: string, note?: string): Promise<UserRequest | null> {
    return request<UserRequest | null>(`/requests/${requestId}`, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'approved' }),
    })
  }

  static async rejectRequest(requestId: string, reviewerId: string, note?: string): Promise<UserRequest | null> {
    return request<UserRequest | null>(`/requests/${requestId}`, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'rejected' }),
    })
  }

  static async withdrawRequest(requestId: string, userId: string): Promise<{ success: boolean }> {
    try {
      await request<void>(`/requests/${requestId}`, {
        method: 'DELETE',
      })
      return { success: true }
    } catch (error) {
      console.error('Failed to withdraw request:', error)
      return { success: false }
    }
  }

  static async getOwnedProducts(username: string): Promise<Product[]> {
    // Get all products owned by the user via product_editors table
    try {
      const response = await request<{ products: Product[] }>(`/users/${encodeURIComponent(username)}/owned-products`)
      return response.products || []
    } catch (error) {
      // If endpoint doesn't exist, return empty array
      console.warn('Owned products endpoint not available:', error)
      return []
    }
  }

  static async deleteRequest(requestId: string): Promise<{ success: boolean }> {
    return request<{ success: boolean }>(`/requests/${requestId}`, {
      method: 'DELETE',
    })
  }

  static async exportUserData(username: string): Promise<{
    account: UserAccount | null
    products: Product[]
    ratings: Rating[]
    discussions: Discussion[]
    activities: UserActivity[]
  }> {
    return request(`/users/${encodeURIComponent(username)}/export`)
  }

  static async cleanupOldActivities(daysToKeep = 90): Promise<{ success: boolean }> {
    return request<{ success: boolean }>('/activities/cleanup', {
      method: 'POST',
      body: JSON.stringify({ daysToKeep }),
    })
  }

  static async cleanupStaleRequests(): Promise<{
    removedStaleProductRequests: number
    archivedOldRequests: number
    totalRemaining: number
  }> {
    return request('/requests/cleanup', {
      method: 'POST',
    })
  }

  static async resetRequestsTable(): Promise<{ success: boolean }> {
    return request<{ success: boolean }>('/requests/reset', {
      method: 'POST',
    })
  }
}

export { APIError }
