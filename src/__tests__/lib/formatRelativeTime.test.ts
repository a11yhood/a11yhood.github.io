import { describe, it, expect } from 'vitest'
import { formatRelativeTime } from '@/lib/utils'

describe('formatRelativeTime()', () => {
  // Test with numeric timestamps (milliseconds and seconds)
  it('formats numeric timestamp in milliseconds', () => {
    const oneHourAgo = Date.now() - 3600000
    const result = formatRelativeTime(oneHourAgo)
    expect(result).toBe('1 hour ago')
  })

  it('formats numeric timestamp in seconds', () => {
    const oneHourAgoSeconds = Math.floor(Date.now() / 1000) - 3600
    const result = formatRelativeTime(oneHourAgoSeconds)
    expect(result).toBe('1 hour ago')
  })

  it('formats numeric timestamp: just now', () => {
    const justNow = Date.now() - 30000 // 30 seconds ago
    const result = formatRelativeTime(justNow)
    expect(result).toBe('just now')
  })

  // Test with ISO string timestamps
  it('formats ISO string timestamp: 1 hour ago', () => {
    const oneHourAgo = new Date(Date.now() - 3600000).toISOString()
    const result = formatRelativeTime(oneHourAgo)
    expect(result).toBe('1 hour ago')
  })

  it('formats ISO string timestamp: just now', () => {
    const justNow = new Date(Date.now() - 30000).toISOString()
    const result = formatRelativeTime(justNow)
    expect(result).toBe('just now')
  })

  it('formats ISO string timestamp: 3 days ago', () => {
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 3600000).toISOString()
    const result = formatRelativeTime(threeDaysAgo)
    expect(result).toBe('3 days ago')
  })

  // Test with clock skew (slight future timestamps)
  it('returns "just now" for timestamp slightly in future (clock skew ≤48h)', () => {
    const twoHoursInFuture = Date.now() + 2 * 3600000
    const result = formatRelativeTime(twoHoursInFuture)
    expect(result).toBe('just now') // Clamped to present
  })

  it('returns empty string for timestamp far in future (>48h)', () => {
    const threeDaysInFuture = Date.now() + 3 * 24 * 3600000
    const result = formatRelativeTime(threeDaysInFuture)
    expect(result).toBe('')
  })

  // Test edge cases
  it('returns empty string for null/undefined', () => {
    expect(formatRelativeTime(null)).toBe('')
    expect(formatRelativeTime(undefined)).toBe('')
  })

  it('returns empty string for invalid numeric value', () => {
    expect(formatRelativeTime(0)).toBe('')
    expect(formatRelativeTime(-1)).toBe('')
    expect(formatRelativeTime(NaN)).toBe('')
  })

  it('returns empty string for invalid string', () => {
    expect(formatRelativeTime('not-a-date')).toBe('')
    expect(formatRelativeTime('0')).toBe('')
  })

  // Test boundary conditions
  it('formats week boundary correctly', () => {
    const sixDaysAgo = new Date(Date.now() - 6 * 24 * 3600000).toISOString()
    const result = formatRelativeTime(sixDaysAgo)
    expect(result).toBe('6 days ago')

    const eightDaysAgo = new Date(Date.now() - 8 * 24 * 3600000).toISOString()
    const result2 = formatRelativeTime(eightDaysAgo)
    expect(result2).toBe('1 week ago')
  })

  it('formats month boundary correctly', () => {
    const threeWeeksAgo = new Date(Date.now() - 21 * 24 * 3600000).toISOString()
    const result = formatRelativeTime(threeWeeksAgo)
    expect(result).toBe('3 weeks ago')

    const fortyFiveDaysAgo = new Date(Date.now() - 45 * 24 * 3600000).toISOString()
    const result2 = formatRelativeTime(fortyFiveDaysAgo)
    expect(result2).toBe('1 month ago')
  })
})
