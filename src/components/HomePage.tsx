/**
 * HomePage component - New homepage with random products, blog roll, and quick search
 * Shows 3 randomly selected products (one from each platform), recent blog posts, and search sidebar
 */
import { useState, useEffect, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Product, BlogPost, Rating } from '@/lib/types'
import { ProductCard } from '@/components/ProductCard'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { MagnifyingGlass, ArrowRight } from '@phosphor-icons/react'

type HomePageProps = {
  products: Product[]
  blogPosts: BlogPost[]
  ratings: Rating[]
  onRate: (productId: string, rating: number) => void
}

/**
 * Get a random product from a specific source, optionally filtered by rating range
 */
function getRandomProductFromSource(products: Product[], sourceKeyword: string, minRating?: number): Product | null {
  const sourceProducts = products.filter(p => {
    // Flexible source matching - check if source contains the keyword
    const productSource = (p.source || '').toLowerCase().trim()
    const keyword = sourceKeyword.toLowerCase().trim()
    
    // Match if source contains the keyword anywhere
    if (!productSource.includes(keyword)) {
      return false
    }
    
    // Optional: filter by minimum rating if provided
    // Only filter if minRating is specified, otherwise accept all
    if (minRating !== undefined && minRating > 0) {
      const rating = p.sourceRating || 0
      if (rating < minRating) {
        return false
      }
    }
    
    return true
  })
  
  if (sourceProducts.length === 0) return null
  
  const randomIndex = Math.floor(Math.random() * sourceProducts.length)
  return sourceProducts[randomIndex]
}

export function HomePage({ products, blogPosts, ratings, onRate }: HomePageProps) {
  const navigate = useNavigate()
  const [searchQuery, setSearchQuery] = useState('')
  const [randomProducts, setRandomProducts] = useState<(Product | null)[]>([null, null, null])
  const productCountRef = useRef(0)
  const hasMountedRef = useRef(false)

  // Select random products on mount and cache them
  // Only recalculate if the product count changes significantly (indicating new data)
  useEffect(() => {
    // Only run once on mount or if product count changes by more than 10%
    const currentCount = products.length
    const countChanged = Math.abs(currentCount - productCountRef.current) > Math.max(10, currentCount * 0.1)
    
    if (!hasMountedRef.current || countChanged) {
      // Debug: log available sources
      if (!hasMountedRef.current) {
        const uniqueSources = [...new Set(products.map(p => p.source).filter(Boolean))]
        console.log('[HomePage] Available sources:', uniqueSources)
      }
      
      // Try to get products from specific sources, fall back to any product if not available
      let ravelryProduct = getRandomProductFromSource(products, 'ravelry')
      let githubProduct = getRandomProductFromSource(products, 'github')
      let thingiverseProduct = getRandomProductFromSource(products, 'thingiverse')
      
      // Fallback: if a source isn't available, get any random product
      if (!ravelryProduct && products.length > 0) {
        ravelryProduct = products[Math.floor(Math.random() * products.length)]
      }
      if (!githubProduct && products.length > 0) {
        // Get a different product than Ravelry
        const available = products.filter(p => p.id !== ravelryProduct?.id)
        if (available.length > 0) {
          githubProduct = available[Math.floor(Math.random() * available.length)]
        }
      }
      if (!thingiverseProduct && products.length > 0) {
        // Get a different product than the first two
        const available = products.filter(p => p.id !== ravelryProduct?.id && p.id !== githubProduct?.id)
        if (available.length > 0) {
          thingiverseProduct = available[Math.floor(Math.random() * available.length)]
        }
      }
      
      console.log('[HomePage] Random products:', {
        ravelry: ravelryProduct?.name || 'Not found',
        github: githubProduct?.name || 'Not found',
        thingiverse: thingiverseProduct?.name || 'Not found'
      })
      
      setRandomProducts([ravelryProduct, githubProduct, thingiverseProduct])
      productCountRef.current = currentCount
      hasMountedRef.current = true
    }
  }, [products.length]) // Only depend on length, not entire products array

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
              const sources = ['Ravelry', 'GitHub', 'Thingiverse']
              if (!product) {
                return (
                  <Card key={idx} className="opacity-50">
                    <CardHeader>
                      <CardTitle className="text-sm text-muted-foreground">
                        No {sources[idx]} products available
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
