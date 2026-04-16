import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { BlogPostDetail } from '@/components/BlogPostDetail'
import { APIService } from '@/lib/api'
import type { BlogPost, UserAccount } from '@/lib/types'

type BlogPostDraftPageProps = {
  userAccount: UserAccount | null
}

/**
 * Draft preview page for blog posts accessible via /draft/:id
 * Allows authors and admins to preview unpublished (draft) blog posts by ID.
 * Always renders an <h1> heading to satisfy WCAG page-has-heading-one.
 */
export function BlogPostDraftPage({ userAccount }: BlogPostDraftPageProps) {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [post, setPost] = useState<BlogPost | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const isAdmin = userAccount?.role === 'admin'

  useEffect(() => {
    if (!id) {
      setError('No draft ID provided')
      setIsLoading(false)
      return
    }
    setIsLoading(true)
    setError(null)
    APIService.getBlogPost(id)
      .then((fetchedPost) => {
        setPost(fetchedPost)
        setIsLoading(false)
      })
      .catch((fetchError) => {
        console.warn('[BlogPostDraftPage] Failed to load draft post', {
          postId: id,
          error: fetchError,
        })
        setError('Failed to load draft post')
        setIsLoading(false)
      })
  }, [id])

  if (isLoading) {
    return (
      <div className="text-center py-12" role="status">
        {/* sr-only heading ensures the page always has an h1 during load */}
        <h1 className="sr-only">Loading draft post</h1>
        <p className="text-muted-foreground">Loading draft...</p>
      </div>
    )
  }

  if (error || !post) {
    return (
      <div className="text-center py-12">
        <h1 className="text-2xl font-bold mb-4">Draft Not Found</h1>
        <p className="text-muted-foreground">
          {error || 'The requested draft post could not be found.'}
        </p>
        <Button variant="outline" onClick={() => navigate('/blog')} className="mt-4">
          Back to Blog
        </Button>
      </div>
    )
  }

  return (
    <BlogPostDetail
      post={post}
      onBack={() => navigate('/blog')}
      onEdit={isAdmin ? () => navigate(`/blog/${post.slug}?edit=true`) : undefined}
    />
  )
}
