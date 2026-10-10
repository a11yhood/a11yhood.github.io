import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const themeCss = fs.readFileSync(path.resolve(process.cwd(), 'src/styles/theme.css'), 'utf8')
const mainCss = fs.readFileSync(path.resolve(process.cwd(), 'src/styles/main.css'), 'utf8')

function relativeLuminance(hex: string) {
  const normalized = hex.replace('#', '').trim()
  const value = normalized.length === 3
    ? normalized.split('').map((char) => char + char).join('')
    : normalized

  const number = Number.parseInt(value, 16)
  const channels = {
    r: (number >> 16) & 255,
    g: (number >> 8) & 255,
    b: number & 255,
  }

  const channel = (color: number) => {
    const adjusted = color / 255
    return adjusted <= 0.03928
      ? adjusted / 12.92
      : ((adjusted + 0.055) / 1.055) ** 2.4
  }

  return 0.2126 * channel(channels.r) + 0.7152 * channel(channels.g) + 0.0722 * channel(channels.b)
}

function contrastRatio(foreground: string, background: string) {
  const foregroundLuminance = relativeLuminance(foreground)
  const backgroundLuminance = relativeLuminance(background)
  const lighter = Math.max(foregroundLuminance, backgroundLuminance)
  const darker = Math.min(foregroundLuminance, backgroundLuminance)

  return (lighter + 0.05) / (darker + 0.05)
}

describe('Primary button contrast', () => {
  it('keeps the default button text above the WCAG AA threshold', () => {
    expect(themeCss).toContain('--color-accent-9: var(--blue-11);')
    expect(mainCss).toContain('--color-primary: var(--color-accent-9);')

    const whiteContrast = '#ffffff'
    const buttonBackground = '#0d74ce'

    expect(contrastRatio(whiteContrast, buttonBackground)).toBeGreaterThanOrEqual(4.5)
  })
})
