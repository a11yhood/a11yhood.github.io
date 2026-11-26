import { describe, it, expect } from 'vitest'
import { createPlainTextSummary } from '@/lib/plainTextSummary'

describe('createPlainTextSummary', () => {
  it('keeps link text and drops the URL', () => {
    expect(createPlainTextSummary('See [the docs](https://example.com/a) now.', 300)).toBe(
      'See the docs now.'
    )
  })

  it('drops image syntax including the URL and alt-free images', () => {
    expect(createPlainTextSummary('Before ![Logo](https://example.com/logo.png) after.', 300)).toBe(
      'Before after.'
    )
    expect(createPlainTextSummary('A ![](https://example.com/x.jpg) B', 300)).toBe('A B')
  })

  it('removes list markers but keeps item text', () => {
    const md = '- first item\n- second item\n\n1. numbered one\n2. numbered two'
    expect(createPlainTextSummary(md, 300)).toBe(
      'first item second item numbered one numbered two'
    )
  })

  it('removes heading markers', () => {
    expect(createPlainTextSummary('## Big News\n\nBody text here.', 300)).toBe(
      'Big News Body text here.'
    )
  })

  it('keeps code text and drops fence markers and inline backticks', () => {
    const md = 'Run `npm test` now:\n\n```bash\nnpm run build\n```\n\nDone.'
    expect(createPlainTextSummary(md, 300)).toBe('Run npm test now: npm run build Done.')
  })

  it('removes emphasis markers', () => {
    expect(createPlainTextSummary('This is **bold** and *italic* and __strong__.', 300)).toBe(
      'This is bold and italic and strong.'
    )
  })

  it('returns very short posts unchanged apart from whitespace cleanup', () => {
    expect(createPlainTextSummary('  Hi there.  ', 300)).toBe('Hi there.')
    expect(createPlainTextSummary('', 300)).toBe('')
  })

  it('does not cut in the middle of a word', () => {
    const result = createPlainTextSummary('alpha beta gamma delta epsilon', 12)
    expect(result).toBe('alpha beta...')
    expect(result.endsWith('...')).toBe(true)
  })

  it('keeps the word when the cut lands exactly on a word boundary', () => {
    // "alpha beta" is exactly 10 chars and text[10] is a space
    expect(createPlainTextSummary('alpha beta gamma', 10)).toBe('alpha beta...')
  })

  it('hard-cuts a single word longer than the limit', () => {
    expect(createPlainTextSummary('supercalifragilistic', 5)).toBe('super...')
  })

  it('does not drop text between a less-than and a greater-than sign', () => {
    expect(createPlainTextSummary('a < b and c > d', 300)).toBe('a < b and c > d')
  })

  it('strips real HTML tags but keeps their text', () => {
    expect(createPlainTextSummary('<p>Hello <strong>world</strong></p><br/>', 300)).toBe(
      'Hello world'
    )
  })
})
