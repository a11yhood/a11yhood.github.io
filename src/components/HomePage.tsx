/**
 * HomePage component - New homepage with random products, blog roll, and quick search
 * Shows 3 randomly selected featured products, recent blog posts, and a quick search sidebar
 */
import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Product, BlogPost, Rating } from '@/lib/types'
import { selectFeaturedRandomProducts } from '@/lib/homepageRandom'
import { ProductCard } from '@/components/ProductCard'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { MagnifyingGlass, ArrowRight } from '@phosphor-icons/react'
import { getProductsPathForTag } from '@/lib/tagRoutes'

type HomePageProps = {
  products: Product[]
  blogPosts: BlogPost[]
  ratings: Rating[]
  onRate: (productId: string, rating: number) => void
}

export function HomePage({ products, blogPosts, ratings, onRate }: HomePageProps) {
  const navigate = useNavigate()
  const [searchQuery, setSearchQuery] = useState('')
  const [randomProducts, setRandomProducts] = useState<(Product | null)[]>([null, null, null])

  // Re-select random products whenever the products array changes.
  // This covers: initial slow-backend load (empty → featured list arrives),
  // and any subsequent changes to the featured pool (e.g. tag edits).
  useEffect(() => {
    if (products.length === 0) {
      setRandomProducts([null, null, null])
      return
    }
    setRandomProducts(selectFeaturedRandomProducts(products, 3))
  }, [products])

  const recentBlogPosts = useMemo(() => {
    return blogPosts
      .filter(post => post.published)
      .sort((a, b) => {
        const dateA = a.publishDate || a.publishedAt || a.createdAt
        const dateB = b.publishDate || b.publishedAt || b.createdAt
        return dateB - dateA
      })
      .slice(0, 3)
  }, [blogPosts])

  const handleSearch = (e?: React.FormEvent) => {
    e?.preventDefault()
    if (searchQuery.trim()) {
      navigate(`/products?q=${encodeURIComponent(searchQuery.trim())}`)
    } else {
      navigate('/products')
    }
  }

  const truncateExcerpt = (text: string, maxLength: number = 200) => {
    if (text.length <= maxLength) return text
    return text.slice(0, maxLength).trim() + '...'
  }

  return (
    <div className="space-y-8">
      {/* Top Section: Quick Search and Random Products */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Quick Search */}
        <aside className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Quick Search</CardTitle>
              <CardDescription>Find accessibility solutions</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSearch} className="space-y-3">
                <div className="relative">
                  <MagnifyingGlass
                    size={20}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                  />
                  <Input
                    type="search"
                    placeholder="Search products..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                    aria-label="Search products"
                  />
                </div>
                <Button type="submit" className="w-full">
                  Search
                </Button>
              </form>
            </CardContent>
          </Card>
        </aside>

        {/* Random Products */}
        <section className="lg:col-span-3">
          <h2 className="text-2xl font-bold mb-4">Random Products</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {randomProducts.map((product, idx) => {
              if (!product) {
                // products.length === 0 means data is still loading; otherwise
                // the catalog genuinely has no more products to fill this slot.
                const message =
                  products.length === 0
                    ? 'Loading products…'
                    : 'No more products available'
                return (
                  <Card key={idx} className="opacity-50">
                    <CardHeader>
                      <CardTitle className="text-sm text-muted-foreground">
                        {message}
                      </CardTitle>
                    </CardHeader>
                  </Card>
                )
              }
              return (
                <ProductCard
                  key={product.id}
                  product={product}
                  ratings={ratings}
                  onRate={onRate}
                  onTagClick={(tag) => navigate(getProductsPathForTag(tag))}
                  onNavigate={() => navigate(`/product/${product.slug}`)}
                />
              )
            })}
          </div>
        </section>
      </div>

      {/* Blog Roll Section */}
      <section>
          <h2 className="text-2xl font-bold mb-4">Recent Posts</h2>
          {recentBlogPosts.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">No blog posts yet. Check back soon!</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {recentBlogPosts.map((post) => {
                const displayDate = post.publishDate 
                  ? new Date(post.publishDate)
                  : new Date(post.publishedAt || post.createdAt)
                
                return (
                  <Card 
                    key={post.id} 
                    className="cursor-pointer hover:shadow-lg transition-shadow overflow-hidden"
                    onClick={() => navigate(`/blog/${post.slug}`)}
                  >
                    {post.headerImage && (
                      <div className="w-full h-48 overflow-hidden">
                        <img 
                          src={post.headerImage} 
                          alt={post.headerImageAlt || post.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    <CardHeader>
                      <div className="flex items-start justify-between gap-4">
                        <CardTitle className="text-xl">{post.title}</CardTitle>
                        <time className="text-sm text-muted-foreground whitespace-nowrap">
                          {displayDate.toLocaleDateString('en-US', { 
                            year: 'numeric', 
                            month: 'short', 
                            day: 'numeric' 
                          })}
                        </time>
                      </div>
                      {post.excerpt && (
                        <CardDescription className="text-base mt-2">
                          {truncateExcerpt(post.excerpt)}
                        </CardDescription>
                      )}
                    </CardHeader>
                    <CardContent>
                      <Button variant="link" className="p-0 h-auto">
                        Read more <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </section>
    </div>
  )
}
