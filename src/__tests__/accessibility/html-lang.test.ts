/**
 * Regression test for: html-has-lang
 * https://dequeuniversity.com/rules/axe/4.11/html-has-lang
 *
 * Every HTML document served by this app must have a `lang` attribute on the
 * `<html>` element so that screen readers announce content in the correct
 * language.  This test reads the static entry-point files directly to guard
 * against accidental removal of the attribute.
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { resolve } from 'path'

// Tests run from the project root via `vitest run`
const rootDir = process.cwd()

describe('html-has-lang – static HTML entry points', () => {
  it('index.html has a lang attribute on the <html> element', () => {
    const content = readFileSync(resolve(rootDir, 'index.html'), 'utf-8')
    expect(content).toMatch(/<html[^>]+lang=/i)
  })

  it('public/404.html has a lang attribute on the <html> element', () => {
    const content = readFileSync(resolve(rootDir, 'public/404.html'), 'utf-8')
    expect(content).toMatch(/<html[^>]+lang=/i)
  })
})
