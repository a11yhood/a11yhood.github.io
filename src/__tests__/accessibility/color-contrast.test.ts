import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

function hexToRgb(hex: string) {
  const normalized = hex.replace('#', '')
  const value = normalized.length === 3
    ? normalized.split('').map((char) => char + char).join('')
    : normalized

  const int = Number.parseInt(value, 16)
  return {
    r: (int >> 16) & 255,
    g: (int >> 8) & 255,
    b: int & 255,
  }
}

function relativeLuminance(hex: string) {
  const { r, g, b } = hexToRgb(hex)
  const channels = [r, g, b].map((channel) => {
    const normalized = channel / 255
    return normalized <= 0.04045
      ? normalized / 12.92
      : ((normalized + 0.055) / 1.055) ** 2.4
  })

  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2]
}

function contrastRatio(foreground: string, background: string) {
  const l1 = relativeLuminance(foreground)
  const l2 = relativeLuminance(background)
  const lighter = Math.max(l1, l2)
  const darker = Math.min(l1, l2)
  return (lighter + 0.05) / (darker + 0.05)
}

describe('theme color contrast', () => {
  const themeCss = readFileSync(resolve(process.cwd(), 'src/styles/theme.css'), 'utf-8')

  const resolveThemeColor = (token: string): string => {
    const escapedToken = token.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')
    const declarations = [...themeCss.matchAll(new RegExp(`(^|\\s)${escapedToken}\\s*:\\s*(#[0-9a-fA-F]{6}|#[0-9a-fA-F]{3}|var\\(--[a-z0-9-]+\\))`, 'g'))]
    const match = declarations[declarations.length - 1]

    if (!match) {
      throw new Error(`Could not resolve theme token ${token}`)
    }

    const raw = match[2]
    if (raw.startsWith('var(')) {
      const variableName = raw.slice(4, -1)
      return resolveThemeColor(variableName)
    }

    return raw
  }

  it('keeps the default primary button background above the WCAG AA ratio for white text', () => {
    const bg = resolveThemeColor('--color-accent-9')
    const ratio = contrastRatio('#ffffff', bg)

    expect(ratio).toBeGreaterThanOrEqual(4.5)
  })

  it('keeps the hover background for primary buttons above the WCAG AA ratio for white text', () => {
    const bg = resolveThemeColor('--color-accent-10')
    const ratio = contrastRatio('#ffffff', bg)

    expect(ratio).toBeGreaterThanOrEqual(4.5)
  })
})
