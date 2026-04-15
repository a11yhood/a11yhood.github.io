import { expect, afterEach, beforeEach, vi, beforeAll } from 'vitest'
import { cleanup } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import 'vitest-axe/extend-expect'
import * as axeMatchers from 'vitest-axe/matchers'

expect.extend(axeMatchers)

// Provide a simple ResizeObserver polyfill for components that expect it
class MockResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

if (!('ResizeObserver' in globalThis)) {
  // @ts-expect-error jsdom does not implement ResizeObserver
  globalThis.ResizeObserver = MockResizeObserver
}

// Mock fetch globally for KV operations
const kvStore = new Map()

const resolvedBackendBase = (process.env.TEST_BACKEND_URL || process.env.VITE_API_URL || 'http://localhost:8002').replace(/\/$/, '')
;(globalThis as any).__TEST_BACKEND_BASE__ = resolvedBackendBase
;(globalThis as any).__TEST_API_BASE__ = `${resolvedBackendBase}/api`

// Local HTTPS test backends may use self-signed certs.
// Relax TLS verification only when targeting localhost.
if (/^https:\/\/localhost(?::\d+)?$/i.test(resolvedBackendBase)) {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'
}

// Set by globalSetup.ts after health-checking the backend.
// Defaults to false so backend-dependent suites are properly skipped
// when the backend is not reachable (e.g. CI without a running backend).
;(globalThis as any).__BACKEND_AVAILABLE__ = process.env.VITEST_BACKEND_AVAILABLE === '1'

beforeAll(() => {
  const originalFetch = global.fetch
  const backendBase = (globalThis as any).__TEST_BACKEND_BASE__ as string
  const backendOrigin = new URL(backendBase).origin

  global.fetch = vi.fn(async (url, options) => {
    const method = options?.method || 'GET'
    const urlStr = url as string
    
    // Rewrite relative /api requests to backend base URL for integration tests
    if (urlStr.startsWith('/api/')) {
      const abs = `${backendBase}${urlStr}`
      return originalFetch(abs, options as any)
    }

    // Allow absolute calls to backend to pass through untouched
    if (urlStr.startsWith('http://') || urlStr.startsWith('https://')) {
      try {
        if (new URL(urlStr).origin === backendOrigin) {
          return originalFetch(url as any, options as any)
        }
      } catch {
        // Ignore parse failures; non-backend absolute URLs are handled below.
      }
    }
    
    // Handle POST to base URL (keys listing)
    if (method === 'POST' && urlStr === 'http://localhost:3000') {
      const keys = Array.from(kvStore.keys())
      return Promise.resolve({
        ok: true,
        status: 200,
        headers: new Headers(),
        redirected: false,
        statusText: 'OK',
        type: 'basic' as ResponseType,
        url: urlStr,
        clone: () => ({} as Response),
        body: null,
        bodyUsed: false,
        arrayBuffer: async () => new ArrayBuffer(0),
        blob: async () => new Blob(),
        formData: async () => new FormData(),
        json: async () => ({ keys }),
        text: async () => JSON.stringify({ keys }),
      } as Response)
    }
    
    const urlObj = new URL(urlStr)
    const key = decodeURIComponent(urlObj.pathname.substring(1))
    
    if (method === 'GET') {
      const value = kvStore.get(key)
      if (value !== undefined) {
        return Promise.resolve({
          ok: true,
          status: 200,
          headers: new Headers(),
          redirected: false,
          statusText: 'OK',
          type: 'basic' as ResponseType,
          url: urlStr,
          clone: () => ({} as Response),
          body: null,
          bodyUsed: false,
          arrayBuffer: async () => new ArrayBuffer(0),
          blob: async () => new Blob(),
          formData: async () => new FormData(),
          json: async () => ({ value }),
          text: async () => JSON.stringify({ value }),
        } as Response)
      } else {
        // Return 200 with null value for KV getOrSetKey compatibility
        return Promise.resolve({
          ok: true,
          status: 200,
          headers: new Headers(),
          redirected: false,
          statusText: 'OK',
          type: 'basic' as ResponseType,
          url: urlStr,
          clone: () => ({} as Response),
          body: null,
          bodyUsed: false,
          arrayBuffer: async () => new ArrayBuffer(0),
          blob: async () => new Blob(),
          formData: async () => new FormData(),
          json: async () => ({ value: null }),
          text: async () => JSON.stringify({ value: null }),
        } as Response)
      }
    } else if (method === 'PUT') {
      const body = options?.body
      let value
      if (typeof body === 'string') {
        const data = JSON.parse(body)
        value = data.value !== undefined ? data.value : data
        kvStore.set(key, value)
      }
      return Promise.resolve({
        ok: true,
        status: 200,
        headers: new Headers(),
        redirected: false,
        statusText: 'OK',
        type: 'basic' as ResponseType,
        url: urlStr,
        clone: () => ({} as Response),
        body: null,
        bodyUsed: false,
        arrayBuffer: async () => new ArrayBuffer(0),
        blob: async () => new Blob(),
        formData: async () => new FormData(),
        json: async () => ({ success: true, value }),
        text: async () => JSON.stringify({ success: true, value }),
      } as Response)
    } else if (method === 'DELETE') {
      kvStore.delete(key)
      return Promise.resolve({
        ok: true,
        status: 204,
        headers: new Headers(),
        redirected: false,
        statusText: 'No Content',
        type: 'basic' as ResponseType,
        url: urlStr,
        clone: () => ({} as Response),
        body: null,
        bodyUsed: false,
        arrayBuffer: async () => new ArrayBuffer(0),
        blob: async () => new Blob(),
        formData: async () => new FormData(),
        json: async () => ({}),
        text: async () => '',
      } as Response)
    }
    
    return Promise.resolve({
      ok: false,
      status: 404,
      headers: new Headers(),
      redirected: false,
      statusText: 'Not Found',
      type: 'basic' as ResponseType,
      url: urlStr,
      clone: () => ({} as Response),
      body: null,
      bodyUsed: false,
      arrayBuffer: async () => new ArrayBuffer(0),
      blob: async () => new Blob(),
      formData: async () => new FormData(),
      json: async () => ({ error: 'Not found' }),
      text: async () => JSON.stringify({ error: 'Not found' }),
    } as Response)
  }) as typeof fetch
})

afterEach(() => {
  cleanup()
  kvStore.clear()
})

beforeEach(() => {
  window.history.pushState({}, '', '/')
})

// Mock localStorage globally - initialize before each test
const localStorageStore = new Map<string, string>()

Object.defineProperty(window, 'localStorage', {
  writable: true,
  value: {
    getItem: (key: string) => localStorageStore.get(key) ?? null,
    setItem: (key: string, value: string) => {
      localStorageStore.set(key, value)
    },
    removeItem: (key: string) => {
      localStorageStore.delete(key)
    },
    clear: () => {
      localStorageStore.clear()
    },
    key: (index: number) => {
      const keys = Array.from(localStorageStore.keys())
      return keys[index] ?? null
    },
    length: 0,
  },
})

// Clear localStorage before each test (but preserve dev-user for test isolation)
beforeEach(() => {
  const devUser = localStorageStore.get('dev-user')
  localStorageStore.clear()
  if (devUser) {
    localStorageStore.set('dev-user', devUser)
  }
})

// Mock matchMedia for components that use media queries
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

// Radix UI selects rely on pointer capture APIs that jsdom does not implement
if (!Element.prototype.setPointerCapture) {
  Element.prototype.setPointerCapture = () => {}
}
if (!Element.prototype.releasePointerCapture) {
  Element.prototype.releasePointerCapture = () => {}
}
if (!Element.prototype.hasPointerCapture) {
  Element.prototype.hasPointerCapture = () => false
}

// jsdom does not implement scrollIntoView; Radix selects call it during navigation
if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {}
}

global.window.spark = {
  user: vi.fn().mockResolvedValue(null),
  kv: {
    keys: vi.fn().mockResolvedValue([]),
    get: vi.fn().mockResolvedValue(undefined),
    set: vi.fn().mockResolvedValue(undefined),
    delete: vi.fn().mockResolvedValue(undefined),
  },
}
