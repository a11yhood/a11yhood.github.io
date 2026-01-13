import { BlogPost } from '@/lib/types'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Star } from '@phosphor-icons/react'
import { renderMarkdown } from '@/lib/markdown'
import { useState, useEffect } from 'react'

type BlogPostDetailProps = {
  post: BlogPost
  onBack: () => void
  onEdit?: (post: BlogPost) => void
}

/**
 * BlogPostDetail component for displaying full blog post content
 * Shows complete markdown-rendered content with metadata
 */
export function BlogPostDetail({ post, onBack, onEdit }: BlogPostDetailProps) {
  const [headerError, setHeaderError] = useState(false)
  const displayDate = post.publishDate 
    ? new Date(post.publishDate)
    : new Date(post.publishedAt || post.createdAt)
  
  const publishDate = displayDate.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })

  const authors = post.authorNames && post.authorNames.length > 0 
    ? post.authorNames 
    : [post.authorName]

  // Backend now normalizes images; `post.headerImage` should be an http(s) URL or data URL already
  useEffect(() => {
    // Lightweight visibility debug for header behavior
    if (post.headerImage) {
      // eslint-disable-next-line no-console
      console.debug('[BlogPostDetail] headerImage', {
        preview: post.headerImage.slice(0, 30),
        isDataUrl: post.headerImage.startsWith('data:'),
        isHttp: post.headerImage.startsWith('http'),
        length: post.headerImage.length,
      })
    }
  }, [post.headerImage])

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <Button variant="ghost" size="sm" onClick={onBack}>
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Blog
      </Button>

      <Card className="overflow-hidden">
        {post.headerImage && (
          <div className="relative w-full h-96 overflow-hidden bg-muted">
            {!headerError ? (
              <img
                src={post.headerImage}
                alt={post.headerImageAlt || ''}
                className="w-full h-full object-cover"
                onError={() => setHeaderError(true)}
              />
            ) : (
              <div className="w-full h-full bg-muted flex items-center justify-center text-muted-foreground">
                {/* Graceful fallback if image fails to load */}
                <span>Header image unavailable</span>
              </div>
            )}
          </div>
        )}

        <CardHeader>
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-4xl font-bold">{post.title}</h1>
                {post.featured && (
                  <div className="mt-2">
                    <Badge className="bg-yellow-500/20 text-yellow-700 dark:text-yellow-300">
                      <Star className="w-3 h-3 mr-1 fill-current" />
                      Featured Post
                    </Badge>
                  </div>
                )}
              </div>
              {onEdit && (
                <div className="flex-shrink-0">
                  <Button variant="outline" size="sm" onClick={() => onEdit(post)}>
                    Edit Post
                  </Button>
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
              <span>{publishDate}</span>
              {post.updatedAt && post.updatedAt !== post.createdAt && (
                <>
                  <span>•</span>
                  <span>
                    Updated{' '}
                    {new Date(post.updatedAt).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </span>
                </>
              )}
              <span>•</span>
              <span>
                By {authors.length === 1 
                  ? authors[0] 
                  : authors.length === 2 
                    ? `${authors[0]} and ${authors[1]}`
                    : `${authors.slice(0, -1).join(', ')}, and ${authors[authors.length - 1]}`}
              </span>
            </div>

            {post.tags && post.tags.length > 0 && (
              <div className="flex gap-2 flex-wrap pt-2">
                {post.tags.map((tag) => (
                  <Badge key={tag} variant="secondary">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </CardHeader>

        <CardContent>
          <div className="prose prose-sm sm:prose lg:prose-lg dark:prose-invert max-w-none">
            <div 
              dangerouslySetInnerHTML={{ __html: renderMarkdown(post.content) }}
            />
          </div>

          {onEdit && (
            <div className="mt-8 pt-8 border-t">
              <Button onClick={() => onEdit(post)}>Edit Post</Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Back to Blog Link */}
      <Button variant="outline" onClick={onBack} className="w-full">
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Blog
      </Button>
    </div>
  )
}
