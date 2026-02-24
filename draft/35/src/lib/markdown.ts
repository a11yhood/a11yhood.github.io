import { marked, type RendererObject } from 'marked'

marked.setOptions({
  gfm: true,
  breaks: true,
})

const renderer: Partial<RendererObject> = {
  heading({ tokens, depth }) {
    const text = this.parser.parseInline(tokens)
    const headingClass = {
      1: 'text-4xl font-bold mb-4 mt-8',
      2: 'text-3xl font-bold mb-3 mt-6',
      3: 'text-2xl font-semibold mb-2 mt-5',
      4: 'text-xl font-semibold mb-2 mt-4',
      5: 'text-lg font-semibold mb-1 mt-3',
      6: 'text-base font-semibold mb-1 mt-2',
    }[depth] || ''
    
    return `<h${depth} class="${headingClass}">${text}</h${depth}>`
  },

  paragraph({ tokens }) {
    const text = this.parser.parseInline(tokens)
    return `<p class="mb-4 leading-relaxed">${text}</p>`
  },

  link({ href, title, tokens }) {
    const text = this.parser.parseInline(tokens)
    const titleAttr = title ? ` title="${title}"` : ''
    return `<a href="${href}" class="text-primary underline hover:text-primary/80 transition-colors"${titleAttr} target="_blank" rel="noopener noreferrer">${text}</a>`
  },

  list({ ordered, items }) {
    const tag = ordered ? 'ol' : 'ul'
    const listClass = ordered ? 'list-decimal list-inside mb-4 space-y-1' : 'list-disc list-inside mb-4 space-y-1'
    const renderedItems = items.map(item => this.listitem(item)).join('')
    return `<${tag} class="${listClass}">${renderedItems}</${tag}>`
  },

  listitem({ tokens, task, checked }) {
    const text = this.parser.parse(tokens, false)
    if (task) {
      const checkbox = `<input type="checkbox" ${checked ? 'checked ' : ''}disabled class="mr-2" />`
      return `<li class="ml-4">${checkbox}${text}</li>`
    }
    return `<li class="ml-4">${text}</li>`
  },

  code({ text, lang }) {
    return `<pre class="bg-muted p-4 rounded-lg overflow-x-auto mb-4"><code class="text-sm font-mono">${escapeHtml(text)}</code></pre>`
  },

  codespan({ text }) {
    return `<code class="bg-muted px-2 py-1 rounded text-sm font-mono">${escapeHtml(text)}</code>`
  },

  blockquote({ tokens }) {
    const text = this.parser.parse(tokens, false)
    return `<blockquote class="border-l-4 border-primary pl-4 py-2 my-4 italic text-muted-foreground">${text}</blockquote>`
  },

  image({ href, title, text }) {
    const titleAttr = title ? ` title="${title}"` : ''
    return `<img src="${href}" alt="${text || ''}" class="max-w-full h-auto rounded-lg my-4"${titleAttr} />`
  },

  strong({ tokens }) {
    const text = this.parser.parseInline(tokens)
    return `<strong class="font-bold">${text}</strong>`
  },

  em({ tokens }) {
    const text = this.parser.parseInline(tokens)
    return `<em class="italic">${text}</em>`
  },

  hr() {
    return `<hr class="my-8 border-t border-border" />`
  },

  table({ header, rows }) {
    return `<div class="overflow-x-auto my-4"><table class="min-w-full border-collapse border border-border">${header}${rows}</table></div>`
  },

  tablerow({ text }) {
    return `<tr>${text}</tr>`
  },

  tablecell({ text, header }) {
    const tag = header ? 'th' : 'td'
    const className = header 
      ? 'border border-border px-4 py-2 bg-muted font-semibold text-left' 
      : 'border border-border px-4 py-2'
    return `<${tag} class="${className}">${text}</${tag}>`
  },
}

function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  }
  return text.replace(/[&<>"']/g, (m) => map[m])
}

marked.use({ renderer })

export function renderMarkdown(markdown: string): string {
  try {
    return marked.parse(markdown, { async: false }) as string
  } catch (error) {
    console.error('Error rendering markdown:', error)
    return `<p class="text-destructive">Error rendering content</p>`
  }
}
