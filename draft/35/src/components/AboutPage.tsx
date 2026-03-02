import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { marked } from 'marked'
import DOMPurify from 'dompurify'

export function AboutPage() {
  const [content, setContent] = useState<string>('')
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadAbout = async () => {
      setIsLoading(true)
      setError(null)
      try {
        const response = await fetch('/about.md')
        if (!response.ok) {
          throw new Error(`Failed to load about content (status ${response.status})`)
        }
        const markdown = await response.text()
        const html = marked.parse(markdown)
        const safeHtml = DOMPurify.sanitize(html)
        setContent(safeHtml)
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load about content'
        setError(message)
        setContent('')
      } finally {
        setIsLoading(false)
      }
    }

    loadAbout()
  }, [])

  return (
    <main className="max-w-4xl mx-auto px-4 py-10">
      <Card>
        <CardHeader>
          <CardTitle>About a11yhood</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading && (
            <p className="text-muted-foreground">Loading...</p>
          )}
          {error && (
            <p className="text-destructive">{error}</p>
          )}
          {!isLoading && !error && (
            <div
              className="prose prose-sm sm:prose max-w-none text-foreground"
              dangerouslySetInnerHTML={{ __html: content }}
            />
          )}
        </CardContent>
      </Card>
    </main>
  )
}
