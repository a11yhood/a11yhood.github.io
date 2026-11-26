/**
 * Build a plain-text preview from Markdown source.
 *
 * Used for blog post summaries so cards show readable text instead of raw
 * Markdown syntax. Link and image URLs are dropped (screen readers would
 * otherwise read them literally), and the result is cut at a word boundary.
 */
export function createPlainTextSummary(markdown: string, maxLength: number): string {
  const text = markdownToPlainText(markdown)
  return truncateAtWordBoundary(text, maxLength)
}

function markdownToPlainText(markdown: string): string {
  const text = markdown
    // Fenced code markers (keep the code text itself)
    .replace(/^\s*(```|~~~).*$/gm, ' ')
    // Images: drop entirely, including the URL
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    // Links: keep the link text, drop the URL
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    // Raw HTML tags only (a tag name right after "<" or "</"), so text such as
    // "a < b and c > d" is left alone
    .replace(/<\/?[A-Za-z][A-Za-z0-9-]*(?:\s[^<>]*)?\/?>/g, ' ')
    // Heading, blockquote and list markers at line start
    .replace(/^\s*#{1,6}\s+/gm, '')
    .replace(/^\s*>\s?/gm, '')
    .replace(/^\s*(?:[-*+]|\d+\.)\s+/gm, '')
    // Inline code backticks
    .replace(/`+/g, '')
    // Emphasis markers
    .replace(/(\*\*|__)(.+?)\1/g, '$2')
    .replace(/(^|\W)[*_](?=\S)(.+?)(?<=\S)[*_](?=\W|$)/g, '$1$2')

  return text.replace(/\s+/g, ' ').trim()
}

function truncateAtWordBoundary(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text

  const cut = text.slice(0, maxLength)
  // If the cut lands exactly on a space, the slice already ends on a whole word
  if (text[maxLength] === ' ') {
    return cut.replace(/[\s.,;:!?-]+$/, '') + '...'
  }
  const lastSpace = cut.lastIndexOf(' ')
  // Prefer the last whole word; fall back to a hard cut for one very long word
  const base = lastSpace > 0 ? cut.slice(0, lastSpace) : cut
  return base.replace(/[\s.,;:!?-]+$/, '') + '...'
}
