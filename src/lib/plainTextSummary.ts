import { Marked } from 'marked'

const summaryMarkdown = new Marked({ breaks: false })

/** Build a plain-text preview without changing the app's shared Markdown renderer. */
export function createPlainTextSummary(markdown: string, maxLength: number): string {
  const text = markdownToPlainText(markdown)
  return truncateAtWordBoundary(text, maxLength)
}

function markdownToPlainText(markdown: string): string {
  const html = summaryMarkdown.parse(markdown, { async: false })
  const document = new DOMParser().parseFromString(html, 'text/html')

  // A bare autolink has no useful label; do not leak its URL into a summary.
  for (const link of document.querySelectorAll('a')) {
    const href = link.getAttribute('href')?.trim()
    if (href && link.textContent?.trim() === href) {
      link.replaceWith(' ')
    }
  }

  return (document.body.textContent ?? '').replace(/\s+/g, ' ').trim()
}

function graphemes(text: string): string[] {
  if (typeof Intl.Segmenter === 'function') {
    return Array.from(
      new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(text),
      ({ segment }) => segment
    )
  }

  const units = Array.from(text)
  const result: string[] = []
  let regionalIndicators = 0

  for (const unit of units) {
    const codePoint = unit.codePointAt(0) ?? 0
    const isRegionalIndicator = codePoint >= 0x1f1e6 && codePoint <= 0x1f1ff
    const isEmojiModifier = codePoint >= 0x1f3fb && codePoint <= 0x1f3ff
    const isEmojiTag = codePoint >= 0xe0020 && codePoint <= 0xe007f
    const previous = result.length - 1
    const joinsPrevious =
      previous >= 0 &&
      (unit === '\u200d' ||
        result[previous].endsWith('\u200d') ||
        isEmojiModifier ||
        isEmojiTag ||
        /\p{Mark}/u.test(unit) ||
        (isRegionalIndicator && regionalIndicators % 2 === 1))

    if (joinsPrevious) result[previous] += unit
    else result.push(unit)

    regionalIndicators = isRegionalIndicator ? regionalIndicators + 1 : 0
  }

  return result
}

function truncateAtWordBoundary(text: string, maxLength: number): string {
  const units = graphemes(text)
  if (units.length <= maxLength) return text

  const cut = units.slice(0, maxLength).join('')
  // If the cut lands exactly on a space, the slice already ends on a whole word.
  if (units[maxLength] === ' ') {
    return cut.replace(/[\s.,;:!?-]+$/, '') + '...'
  }
  const lastSpace = cut.lastIndexOf(' ')
  // Prefer the last whole word; fall back to a grapheme-safe cut for one long word.
  const base = lastSpace > 0 ? cut.slice(0, lastSpace) : cut
  return base.replace(/[\s.,;:!?-]+$/, '') + '...'
}
