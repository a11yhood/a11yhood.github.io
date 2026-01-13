import { useMemo } from 'react'
import { marked } from 'marked'
import DOMPurify from 'dompurify'

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
    return container.innerHTML
  }, [text])

  return <div className={className} dangerouslySetInnerHTML={{ __html: html }} />
}

export default MarkdownText
