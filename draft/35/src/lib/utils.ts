/**
 * Shared utility functions for formatting, icons, and rating calculations.
 * 
 * Provides consistent formatting of source names and icons across components.
 * Rating calculation blends user ratings with platform ratings for balanced scores.
 */
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { faGithub, faRavelry } from '@fortawesome/free-brands-svg-icons'
import { faCube } from '@fortawesome/free-solid-svg-icons'
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core'
import type { Rating } from './types'

/**
 * Utility for merging Tailwind CSS classes with proper override handling.
 * Uses clsx for conditional classes and tailwind-merge to resolve conflicts.
 * Example: cn('p-4', condition && 'bg-blue-500', 'hover:bg-blue-600')
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Normalize a source string for display.
 * - Strips "scraped-" prefix
 * - Maps common sources to proper casing
 */
export function formatSourceLabel(source?: string | null): string {
  if (!source) return ''
  const raw = String(source).toLowerCase().replace(/^scraped-/, '')
  if (raw.includes('thingiverse')) return 'Thingiverse'
  if (raw.includes('ravelry')) return 'Ravelry'
  if (raw.includes('github')) return 'GitHub'
  if (raw.includes('abledata')) return 'AbleData'
  if (raw.includes('goat')) return 'GOAT'
  if (raw === 'user-submitted' || raw === 'user submitted') return 'User Submitted'
  // If the original source already has proper casing, preserve it
  // This handles cases like "AbleData" from backend
  if (source.match(/^[A-Z]/)) return source.replace(/^scraped-/, '')
  // Title-case fallback for all lowercase sources
  return raw.replace(/(^|[-_\s])([a-z])/g, (_, sep, c) => (sep ? ' ' : '') + c.toUpperCase())
}

/**
 * Derive a short canonical host from a URL (e.g., github.com).
 * Falls back to an empty string if parsing fails.
 */
export function getCanonicalHost(url?: string | null): string {
  if (!url) return ''
  try {
    const host = new URL(url).hostname
    return host.replace(/^www\./, '')
  } catch {
    return ''
  }
}

/**
 * Get the appropriate icon for a source.
 * Returns FontAwesome icon definition for consistent brand representation across all components.
 */
export function getSourceIcon(source: string | null | undefined): IconDefinition | null {
  if (!source) return null
  const sourceLower = String(source).toLowerCase()
  if (sourceLower.includes('github')) return faGithub
  if (sourceLower.includes('ravelry')) return faRavelry
  if (sourceLower.includes('thingiverse')) return faCube
  return null
}

/**
 * Calculate combined average rating from user ratings and source rating.
 * 
 * Strategy:
 * - If only user ratings exist: return average of user ratings
 * - If only source rating exists: return source rating
 * - If both exist: blend user average with source rating (50/50 weight)
 * 
 * This approach values both community ratings and original platform ratings equally,
 * giving users a balanced view of product quality from multiple perspectives.
 * 
 * @param sourceRating - Rating from original platform (0-5 scale)
 * @param userRatings - All user ratings (filtered by productId if provided)
 * @param productId - Optional product ID to filter user ratings
 * @returns Combined rating on 0-5 scale, or 0 if no ratings available
 */
export function calculateAverageRating(
  sourceRating: number | undefined,
  userRatings: Rating[] = [],
  productId?: string
): number {
  // Collect all ratings: standalone ratings only
  const allRatings: number[] = productId 
    ? userRatings.filter((r) => r.productId === productId).map((r) => r.rating)
    : userRatings.map((r) => r.rating)
  
  if (allRatings.length === 0 && sourceRating) {
    return sourceRating
  }
  if (allRatings.length > 0 && sourceRating) {
    const userAverage = allRatings.reduce((sum, r) => sum + r, 0) / allRatings.length
    return (userAverage + sourceRating) / 2
  }
  if (allRatings.length > 0) {
    return allRatings.reduce((sum, r) => sum + r, 0) / allRatings.length
  }
  return 0
}

/**
 * Format a timestamp as a relative time string (e.g., "last week", "2 months ago").
 * 
 * @param timestamp - Unix timestamp in milliseconds or seconds
 * @returns Formatted relative time string, or empty string if no timestamp
 */
export function formatRelativeTime(timestamp?: number | string | null): string {
  if (timestamp === null || timestamp === undefined) return ''
  // Normalize input: allow ISO string, numeric string, seconds or milliseconds
  let tsNum: number | null = null
  if (typeof timestamp === 'string') {
    const trimmed = timestamp.trim()
    const asNumber = Number(trimmed)
    if (Number.isFinite(asNumber)) {
      if (asNumber <= 0) return ''
      tsNum = asNumber
    } else {
      const parsed = new Date(trimmed).getTime()
      tsNum = Number.isFinite(parsed) ? parsed : null
    }
  } else if (typeof timestamp === 'number') {
    tsNum = timestamp
  } else {
    return ''
  }
  if (!tsNum || !Number.isFinite(tsNum)) return ''
  if (tsNum <= 0) return ''
  
  // Handle both milliseconds and seconds timestamps
  const ts = tsNum > 9999999999 ? tsNum : tsNum * 1000
  const now = Date.now()
  const diffMs = now - ts
  
  // Allow slight future skew (clock or timezone) up to 48 hours
  if (diffMs < 0) {
    const skewHours = Math.abs(diffMs) / (1000 * 60 * 60)
    if (skewHours <= 48) {
      return 'just now'
    }
    // Large future dates considered invalid
    return ''
  }
  
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  
  if (!Number.isFinite(diffDays)) return ''
  
  if (diffDays < 1) {
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    if (diffHours < 1) {
      const diffMinutes = Math.floor(diffMs / (1000 * 60))
      if (diffMinutes < 1) return 'just now'
      return `${diffMinutes} minute${diffMinutes !== 1 ? 's' : ''} ago`
    }
    return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`
  }
  
  if (diffDays < 7) {
    return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`
  }
  
  const diffWeeks = Math.floor(diffDays / 7)
  if (diffWeeks < 4) {
    return `${diffWeeks} week${diffWeeks !== 1 ? 's' : ''} ago`
  }
  
  const diffMonths = Math.floor(diffDays / 30)
  if (diffMonths < 12) {
    return `${diffMonths} month${diffMonths !== 1 ? 's' : ''} ago`
  }
  
  const diffYears = Math.floor(diffDays / 365)
  if (!Number.isFinite(diffYears) || diffYears < 1) return ''
  
  return `${diffYears} year${diffYears !== 1 ? 's' : ''} ago`
}
