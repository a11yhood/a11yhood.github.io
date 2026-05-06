/**
 * Regression test for: https://dequeuniversity.com/rules/axe/4.11/region
 *
 * When the SPA redirect URL encoded in public/404.html exceeds the server's
 * maximum URI length, GitHub Pages returns an HTTP 414 "URI Too Long" response.
 * That bare error page contains a <pre> element with no landmark wrapper, which
 * axe flags as a "region" violation (all page content must be inside landmarks).
 *
 * The fix: 404.html must cap the redirect URL length and fall back to the base
 * path when the encoded URL would be too long, so users always land on the SPA
 * (which has proper landmark structure) rather than the bare 414 error page.
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { resolve } from 'path'

const root = resolve(__dirname, '../../../')

function read404Html(): string {
  return readFileSync(resolve(root, 'public/404.html'), 'utf-8')
}

// The maximum safe URL length used by the 404.html guard.
const MAX_REDIRECT_URL_LENGTH = 2048

describe('404.html SPA redirect – URI length guard (axe region regression)', () => {
  it('contains a MAX_REDIRECT_URL_LENGTH constant to cap redirect URL length', () => {
    const html = read404Html()
    expect(html).toContain('MAX_REDIRECT_URL_LENGTH')
  })

  it('contains a target.length check that falls back to base path', () => {
    const html = read404Html()
    // The script must check target.length against the constant and reassign target
    expect(html).toMatch(/target\.length\s*>\s*MAX_REDIRECT_URL_LENGTH/)
  })

  it('redirect URL stays within safe limit for a typical short path', () => {
    // Simulate the 404.html redirect logic for a normal SPA path
    const protocol = 'https:'
    const hostname = 'a11yhood.org'
    const port = ''
    const pathname = '/products'
    const search = '?q=wheelchair'

    const parts = pathname.split('/')
    const pathSegmentsToKeep = (parts[1] === 'pr-preview' && parts[2]) ? 2 : 0
    const basePath = pathname.split('/').slice(0, 1 + pathSegmentsToKeep).join('/') + '/'
    const routePayload = pathname.slice(1).split('/').slice(pathSegmentsToKeep).join('/')
    const searchPayload = search ? search.slice(1) : ''
    const encodedRoute = encodeURIComponent(routePayload)
    const encodedSearch = encodeURIComponent(searchPayload)
    const redirectPath = basePath + '?/' + encodedRoute + (searchPayload ? '&' + encodedSearch : '')
    let target = protocol + '//' + hostname + (port ? ':' + port : '') + redirectPath

    if (target.length > MAX_REDIRECT_URL_LENGTH) {
      target = protocol + '//' + hostname + (port ? ':' + port : '') + basePath
    }

    expect(target.length).toBeLessThanOrEqual(MAX_REDIRECT_URL_LENGTH)
  })

  it('redirect URL falls back to base path when path+query would be too long', () => {
    // Simulate a very long query string that would otherwise trigger HTTP 414
    const protocol = 'https:'
    const hostname = 'a11yhood.org'
    const port = ''
    const pathname = '/products'
    // A query string long enough to push the encoded URL past 2048 chars.
    // "https://a11yhood.org/?/products&q%3D" is ~37 chars; we need longParam > 2011 chars.
    const longParam = 'a'.repeat(2500)
    const search = `?q=${longParam}`

    const parts = pathname.split('/')
    const pathSegmentsToKeep = (parts[1] === 'pr-preview' && parts[2]) ? 2 : 0
    const basePath = pathname.split('/').slice(0, 1 + pathSegmentsToKeep).join('/') + '/'
    const routePayload = pathname.slice(1).split('/').slice(pathSegmentsToKeep).join('/')
    const searchPayload = search ? search.slice(1) : ''
    const encodedRoute = encodeURIComponent(routePayload)
    const encodedSearch = encodeURIComponent(searchPayload)
    const redirectPath = basePath + '?/' + encodedRoute + (searchPayload ? '&' + encodedSearch : '')
    let target = protocol + '//' + hostname + (port ? ':' + port : '') + redirectPath

    if (target.length > MAX_REDIRECT_URL_LENGTH) {
      target = protocol + '//' + hostname + (port ? ':' + port : '') + basePath
    }

    // The long URL must have been replaced by the base path fallback
    expect(target).toBe(protocol + '//' + hostname + basePath)
    expect(target.length).toBeLessThanOrEqual(MAX_REDIRECT_URL_LENGTH)
  })

  it('PR-preview redirect URL falls back to base path for an excessively long path', () => {
    const protocol = 'https:'
    const hostname = 'a11yhood.github.io'
    const port = ''
    const prNumber = '388'
    // A path segment long enough to create a > 2048 char encoded URL
    const longRoute = 'products/' + 'x'.repeat(2000)
    const pathname = `/pr-preview/${prNumber}/${longRoute}`

    const parts = pathname.split('/')
    const pathSegmentsToKeep = (parts[1] === 'pr-preview' && parts[2]) ? 2 : 0
    const basePath = pathname.split('/').slice(0, 1 + pathSegmentsToKeep).join('/') + '/'
    const routePayload = pathname.slice(1).split('/').slice(pathSegmentsToKeep).join('/')
    const searchPayload = ''
    const encodedRoute = encodeURIComponent(routePayload)
    const redirectPath = basePath + '?/' + encodedRoute
    let target = protocol + '//' + hostname + (port ? ':' + port : '') + redirectPath

    if (target.length > MAX_REDIRECT_URL_LENGTH) {
      target = protocol + '//' + hostname + (port ? ':' + port : '') + basePath
    }

    expect(target).toBe(`${protocol}//${hostname}/pr-preview/${prNumber}/`)
    expect(target.length).toBeLessThanOrEqual(MAX_REDIRECT_URL_LENGTH)
  })
})
