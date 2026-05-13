import { useMemo } from 'react'
import { marked } from 'marked'
import DOMPurify from 'dompurify'
import { resolveApiImageUrl } from '@/lib/api'

type MarkdownTextProps = {
  text?: string | null
  className?: string
}

// Renders markdown safely with GFM support and sanitized HTML.
export function MarkdownText({ text, className }: MarkdownTextProps) {
  const html = useMemo(() => {
    const md = (text ?? '').toString()
    // Configure marked for GFM + breaks similar to GitHub
    marked.setOptions({ gfm: true, breaks: true })
    const rawHtml = marked.parse(md) as string

    // Sanitize to prevent XSS
    const sanitized = DOMPurify.sanitize(rawHtml, { USE_PROFILES: { html: true } })

    // Ensure external links open in a new tab safely
    const container = document.createElement('div')
    container.innerHTML = sanitized
    container.querySelectorAll('a').forEach((a) => {
      a.setAttribute('target', '_blank')
      a.setAttribute('rel', 'noopener noreferrer')
    })
    container.querySelectorAll('img').forEach((img) => {
      const src = img.getAttribute('src')
      const trimmedSrc = src?.trim() || ''
      if (!trimmedSrc) {
        const altText = img.getAttribute('alt')?.trim() || ''
        if (!altText) {
          // Decorative empty-src images should be dropped entirely.
          img.remove()
          return
        }

        // Keep meaningful content available to assistive tech and sighted users.
        const fallback = document.createElement('span')
        fallback.textContent = `[Image: ${altText}]`
        img.replaceWith(fallback)
        return
      }
      img.setAttribute('src', resolveApiImageUrl(trimmedSrc))
    })
    return container.innerHTML
  }, [text])

  return <div className={className} dangerouslySetInnerHTML={{ __html: html }} />
}

export default MarkdownText
