/**
 * HomePage component - New homepage with random products, blog roll, and quick search
 * Shows 3 randomly selected featured products, recent blog posts, and a quick search sidebar
 */
import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Product, BlogPost, Rating } from '@/lib/types'
import { selectFeaturedRandomProducts } from '@/lib/homepageRandom'
import { ProductCard } from '@/components/ProductCard'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { MagnifyingGlass, ArrowRight } from '@phosphor-icons/react'
import { getProductsPathForTag } from '@/lib/tagRoutes'

const RANDOM_PRODUCT_COUNT = 5
const NEWS_POST_LIMIT = 10
const EXCERPT_MAX_LENGTH = 200

type HomePageProps = {
  products: Product[]
  blogPosts: BlogPost[]
  blogPostsLoading: boolean
  ratings: Rating[]
  onRate: (productId: string, rating: number) => void
}

export function HomePage({ products, blogPosts, blogPostsLoading, ratings, onRate }: HomePageProps) {
  const navigate = useNavigate()
  const [searchQuery, setSearchQuery] = useState('')
  const randomProducts = useMemo(() => {
    if (products.length === 0) {
      return Array.from({ length: RANDOM_PRODUCT_COUNT }, () => null)
    }

    const selected = selectFeaturedRandomProducts(products, RANDOM_PRODUCT_COUNT)
    return [...selected].sort(() => Math.random() - 0.5)
  }, [products])

  const visibleRandomProducts = useMemo(
    () => randomProducts.filter((product): product is Product => product !== null),
    [randomProducts]
  )

  const recentBlogPosts = useMemo(() => {
    return blogPosts
      .filter(post => post.published)
      .sort((a, b) => {
        const dateA = a.publishDate || a.publishedAt || a.createdAt
        const dateB = b.publishDate || b.publishedAt || b.createdAt
        return dateB - dateA
      })
      .slice(0, NEWS_POST_LIMIT)
  }, [blogPosts])

  const handleSearch = (e?: React.FormEvent) => {
    e?.preventDefault()
    if (searchQuery.trim()) {
      navigate(`/products?q=${encodeURIComponent(searchQuery.trim())}`)
    } else {
      navigate('/products')
    }
  }

  const truncateExcerpt = (text: string, maxLength: number = EXCERPT_MAX_LENGTH) => {
    if (text.length <= maxLength) return text
    return text.slice(0, maxLength).trim() + '...'
  }

  const renderNewsContent = () => {
    if (blogPostsLoading) {
      return (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">Loading...</p>
          </CardContent>
        </Card>
      )
    }

    if (recentBlogPosts.length === 0) {
      return (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">No blog posts yet. Check back soon!</p>
          </CardContent>
        </Card>
      )
    }

    return (
      <div className="space-y-4">
        {recentBlogPosts.map((post, index) => {
          const displayDate = post.publishDate
            ? new Date(post.publishDate)
            : new Date(post.publishedAt || post.createdAt)

          return (
            <Link
              key={post.id}
              to={`/blog/${post.slug}`}
              className={`block no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-lg ${
                index > 0 ? 'hidden lg:block' : ''
              }`}
            >
              <Card className="cursor-pointer hover:shadow-lg transition-shadow overflow-hidden">
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
            </Link>
          )
        })}
      </div>
    )
  }

  const renderExploreProducts = () => {
    return (
      <div className="space-y-4">
        {visibleRandomProducts.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            ratings={ratings}
            onRate={onRate}
            onTagClick={(tag) => navigate(getProductsPathForTag(tag))}
            onNavigate={() => navigate(`/product/${product.slug}`)}
          />
        ))}
      </div>
    )
  }

  return (
    <div data-testid="homepage-grid" className="grid grid-cols-1 gap-8 lg:grid-cols-10">
      <section
        data-testid="homepage-welcome-section"
        className="lg:col-start-4 lg:col-span-7 lg:row-start-1"
      >
        {/* Site Mission */}
        <Card>
          <CardHeader>
            <h2 className="text-2xl sm:text-3xl font-semibold leading-tight">Welcome to a11yhood</h2>
            <CardDescription className="text-base sm:text-lg leading-relaxed text-foreground/90">
              A place to learn about and share open source accessibility technology.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="list-disc pl-5 space-y-2 text-base leading-relaxed">
              <li>
                Search our catalog of open-source assistive technology drawn from sites such as
                GitHub, Ravelry, and Thingiverse.
              </li>
              <li>Tag, rate, and organize products.</li>
              <li>Add your own.</li>
              <li>
                Join our{' '}
                <a
                  href="https://github.com/orgs/a11yhood/discussions"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium underline underline-offset-2 text-primary hover:text-primary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-sm"
                >
                  open source community
                </a>
                .
              </li>
            </ul>
          </CardContent>
        </Card>
      </section>

      <aside
        data-testid="homepage-search-section"
        className="lg:col-span-3 lg:row-start-1"
      >
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

      <section
        data-testid="homepage-news-section"
        className="lg:col-start-4 lg:col-span-7 lg:row-start-2"
      >
        <h2 className="text-2xl font-bold sm:text-3xl mb-4">News</h2>
        {renderNewsContent()}
      </section>

      <section
        data-testid="homepage-explore-section"
        className="lg:col-span-3 lg:row-start-2"
      >
        <h2 className="text-2xl font-bold mb-4">Explore Products</h2>
        {renderExploreProducts()}
      </section>
    </div>
  )
}
