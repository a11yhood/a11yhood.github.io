import { useState } from 'react'
import { BlogPost } from '@/lib/types'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CaretLeft, CaretRight } from '@phosphor-icons/react'
import { format } from 'date-fns'

export function FeaturedBlogCarousel({ 
  posts, 
  onSelectPost 
}: { 
  posts: BlogPost[]
  onSelectPost: (post: BlogPost) => void 
}) {
  const [currentIndex, setCurrentIndex] = useState(0)

  if (!posts || posts.length === 0) {
    return null
  }

  const currentPost = posts[currentIndex]

  const handlePrevious = () => {
    setCurrentIndex((prev) => (prev === 0 ? posts.length - 1 : prev - 1))
  }

  const handleNext = () => {
    setCurrentIndex((prev) => (prev === posts.length - 1 ? 0 : prev + 1))
  }

  const truncateExcerpt = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text
    return text.slice(0, maxLength).trim() + '...'
  }

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Featured News</h2>
        {posts.length > 1 && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrevious}
              className="h-8 w-8 p-0"
              aria-label="Previous post"
            >
              <CaretLeft size={16} />
            </Button>
            <span className="text-sm text-muted-foreground">
              {currentIndex + 1} / {posts.length}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleNext}
              className="h-8 w-8 p-0"
              aria-label="Next post"
            >
              <CaretRight size={16} />
            </Button>
          </div>
        )}
      </div>

      <Card 
        className="overflow-hidden cursor-pointer hover:shadow-lg transition-shadow"
        onClick={() => onSelectPost(currentPost)}
      >
        {currentPost.headerImage && (
          <div className="w-full h-12 overflow-hidden bg-muted">
            <img
              src={currentPost.headerImage}
              alt=""
              className="w-full h-full object-cover"
            />
          </div>
        )}
        <div className="p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
            <time dateTime={new Date(currentPost.publishDate || currentPost.createdAt).toISOString()}>
              {format(new Date(currentPost.publishDate || currentPost.createdAt), 'MMM d, yyyy')}
            </time>
            {currentPost.authorNames && currentPost.authorNames.length > 0 && (
              <>
                <span>•</span>
                <span>by {currentPost.authorNames.join(', ')}</span>
              </>
            )}
          </div>
          <h3 className="text-lg font-bold mb-2">{currentPost.title}</h3>
          {currentPost.excerpt && currentPost.excerpt.trim() && (
            <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2">
              {truncateExcerpt(currentPost.excerpt, 150)}
            </p>
          )}
        </div>
      </Card>

      {posts.length > 1 && (
        <div className="flex justify-center gap-2 mt-4">
          {posts.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentIndex(index)}
              className={`h-2 rounded-full transition-all ${
                index === currentIndex 
                  ? 'w-8 bg-primary' 
                  : 'w-2 bg-muted-foreground/30 hover:bg-muted-foreground/50'
              }`}
              aria-label={`Go to post ${index + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  )
}
