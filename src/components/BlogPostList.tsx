import { BlogPost } from '@/lib/types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Star, ArrowRight } from '@phosphor-icons/react'

type BlogPostListProps = {
  posts: BlogPost[]
  onSelectPost?: (post: BlogPost) => void
  showReadMore?: boolean
}

/**
 * BlogPostList component for displaying published blog posts
 * Shows featured posts prominently and includes excerpt previews
 */
export function BlogPostList({ posts, onSelectPost, showReadMore = true }: BlogPostListProps) {
  if (posts.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No blog posts yet. Check back soon!</p>
      </div>
    )
  }

  const sortedPosts = [...posts].sort((a, b) => {
    const dateA = a.publishDate || a.publishedAt || a.createdAt
    const dateB = b.publishDate || b.publishedAt || b.createdAt
    return dateB - dateA
  })

  const featuredPosts = sortedPosts.filter(p => p.featured)
  const regularPosts = sortedPosts.filter(p => !p.featured)

  return (
    <div className="space-y-8">
      {/* Featured Posts Section */}
      {featuredPosts.length > 0 && (
        <div>
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
            Featured
          </h2>
          <div className="space-y-4">
            {featuredPosts.map((post) => (
              <BlogPostCard
                key={post.id}
                post={post}
                onSelectPost={onSelectPost}
                showReadMore={showReadMore}
                featured
              />
            ))}
          </div>
        </div>
      )}

      {/* Regular Posts Section */}
      {regularPosts.length > 0 && (
        <div>
          {featuredPosts.length > 0 && (
            <h2 className="text-xl font-bold mb-4">Latest Posts</h2>
          )}
          <div className="space-y-4">
            {regularPosts.map((post) => (
              <BlogPostCard
                key={post.id}
                post={post}
                onSelectPost={onSelectPost}
                showReadMore={showReadMore}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

type BlogPostCardProps = {
  post: BlogPost
  onSelectPost?: (post: BlogPost) => void
  showReadMore?: boolean
  featured?: boolean
}

/**
 * Individual blog post card component
 * Displays post metadata, excerpt, and tags
 */
function BlogPostCard({
  post,
  onSelectPost,
  showReadMore = true,
  featured = false,
}: BlogPostCardProps) {
  const displayDate = post.publishDate 
    ? new Date(post.publishDate)
    : new Date(post.publishedAt || post.createdAt)
  
  const publishDate = displayDate.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })

  const authors = post.authorNames && post.authorNames.length > 0 
    ? post.authorNames 
    : [post.authorName]

  const authorsText = authors.length === 1 
    ? authors[0] 
    : authors.length === 2 
      ? `${authors[0]} and ${authors[1]}`
      : `${authors.slice(0, -1).join(', ')}, and ${authors[authors.length - 1]}`

  return (
    <Card
      className={`overflow-hidden transition-all hover:shadow-lg cursor-pointer w-full ${
        featured ? 'border-primary/20' : ''
      }`}
      onClick={() => onSelectPost && onSelectPost(post)}
    >
      {post.headerImage && (
        <div className="relative w-full h-48 overflow-hidden bg-muted">
          {/* eslint-disable-next-line no-console */}
          {post.headerImage && console.debug('[BlogPostCard] headerImage', {
            preview: post.headerImage.slice(0, 30),
            isDataUrl: post.headerImage.startsWith('data:'),
            isHttp: post.headerImage.startsWith('http'),
            length: post.headerImage.length,
          })}
          <img
            src={post.headerImage}
            alt={post.headerImageAlt || ''}
            className="w-full h-full object-cover"
            onError={(e) => {
              const target = e.currentTarget
              target.style.display = 'none'
            }}
          />
        </div>
      )}
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <CardTitle className="text-xl leading-tight">{post.title}</CardTitle>
            <CardDescription className="mt-1">
              By {authorsText} • {publishDate}
            </CardDescription>
          </div>
          {post.featured && (
            <Star className="w-5 h-5 fill-yellow-400 text-yellow-400 flex-shrink-0" />
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {post.excerpt ? (
          <p className="text-sm text-foreground">{post.excerpt}</p>
        ) : (
          <div className="text-sm text-muted-foreground prose prose-sm dark:prose-invert max-w-none line-clamp-3">
            <div className="whitespace-pre-wrap">{post.content.substring(0, 300)}</div>
          </div>
        )}

        {post.tags && post.tags.length > 0 && (
          <ul className="flex gap-2 flex-wrap">
            {post.tags.map((tag) => (
	    <li>
              <Badge key={tag} variant="secondary" className="text-xs">
                {tag}
              </Badge></li>
            ))}
          </ul>
        )}

        {showReadMore && (
          <div className="flex items-center gap-2 text-primary text-sm font-medium">
            Read Full Post
            <ArrowRight className="w-4 h-4" />
          </div>
        )}
      </CardContent>
    </Card>
  )
}
