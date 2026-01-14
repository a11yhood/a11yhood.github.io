/**
 * Main application component for a11yhood.
 * 
 * Manages global app state (products, ratings, discussions, users) and routing.
 * Provides AuthContext for authentication across all child components.
 * Console logs trace module loading for debugging initialization issues.
 */
console.log('📦 [App.tsx] Loading imports...')

import { useEffect, useState, useMemo, useRef } from 'react'
import { Routes, Route, Navigate, useNavigate, useParams, useLocation, useSearchParams } from 'react-router-dom'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { MagnifyingGlass, UserCircle, SignOut, ChartBar, BookOpen, Gear, Rows, SquaresFour } from '@phosphor-icons/react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faLayerGroup } from '@fortawesome/free-solid-svg-icons'
import { Toaster } from '@/components/ui/sonner'
import { ProductCard } from '@/components/ProductCard'
import { ProductListItem } from '@/components/ProductListItem'
import { ProductDetail } from '@/components/ProductDetail'
import { ProductFilters } from '@/components/ProductFilters'
import { ProductSubmission } from '@/components/ProductSubmission'
import { UserProfile } from '@/components/UserProfile'
import { AdminDashboard } from '@/components/AdminDashboard'
import { AdminUsersStats } from '@/components/AdminUsersStats'
import { AdminLogs } from '@/components/AdminLogs'
import { BlogPostList } from '@/components/BlogPostList'
import { BlogPostDetail } from '@/components/BlogPostDetail'
import { BlogPostEditor } from '@/components/BlogPostEditor'
import { CollectionsList } from '@/components/CollectionsList'
import { CollectionDetail } from '@/components/CollectionDetail'
import { CreateCollectionDialog } from '@/components/CreateCollectionDialog'
import { EditCollectionDialog } from '@/components/EditCollectionDialog'
import { AboutPage } from '@/components/AboutPage'
import { UserSignup } from '@/components/UserSignup'
import { FeaturedBlogCarousel } from '@/components/FeaturedBlogCarousel'
import { Product, Rating, Discussion, UserData, UserAccount, BlogPost, Collection, CollectionCreateInput } from '@/lib/types'
import { APIService, setAuthTokenGetter } from '@/lib/api'
import { logger } from '@/lib/logger'
import { RavelryOAuthManager } from '@/lib/scrapers/ravelry-oauth'
// API adapter disabled - using real backend API now
// import '@/lib/api-adapter'
import { toast } from 'sonner'
import logoImage from '@/assets/images/ahood-200.png'
import { useAuth } from '@/contexts/AuthContext'
import { AppHeader } from '@/components/AppHeader'
import { AppFooter } from '@/components/AppFooter'
import { DevRoleSwitcher } from '@/components/DevRoleSwitcher'
import { PublicProfile } from '@/components/PublicProfile'
import { Switch } from '@/components/ui/switch'

console.log('✓ [App.tsx] All imports loaded')

export function ProductListPage({ 
  products, 
  ratings, 
  user,
  userAccount,
  canViewBanned,
  canModerate,
  includeBanned,
  onIncludeBannedChange,
  collections,
  blogPosts,
  allProductSources,
  allProductTypes,
  popularTags,
  filteredTags,
  totalProductCount,
  currentPage,
  onPageChange,
  pageSize,
  onPageSizeChange,
  onRate,
  onDeleteProduct,
  onToggleBan,
  onCreateCollection,
  onOpenCreateCollection,
  searchQuery,
  onSearchChange,
  searchInputValue,
  onSearchInputChange,
  onSearchInputBlur,
  onSearchInputKeyDown,
  isSearching,
  selectedTypes,
  onTypeToggle,
  selectedTags,
  onTagToggle,
  selectedSources,
  onSourceToggle,
  minRating,
  onMinRatingChange,
  updatedSince,
  onUpdatedSinceChange,
  sortBy,
  sortOrder,
  onSortChange,
  onClearFilters
}: {
  products: Product[]
  ratings: Rating[]
  user: UserData | null
  userAccount: UserAccount | null
  canViewBanned: boolean
  canModerate: boolean
  includeBanned: boolean
  onIncludeBannedChange: (next: boolean) => void
  collections: Collection[]
  blogPosts: BlogPost[]
  allProductSources: Array<{ name: string; count: number }>
  allProductTypes: string[]
  popularTags: string[]
  filteredTags: string[]
  totalProductCount: number
  currentPage: number
  onPageChange: (page: number) => void
  pageSize: number
  onPageSizeChange: (size: number) => void
  onRate: (productId: string, rating: number) => void
  onDeleteProduct: (productId: string) => void
  onToggleBan: (product: Product) => void
  onCreateCollection: (data: Omit<Collection, 'id' | 'createdAt' | 'updatedAt'>) => void
  onOpenCreateCollection: (defaults: { name?: string; description?: string; productSlugs?: string[]; isPublic?: boolean }) => void
  searchQuery: string
  onSearchChange: (query: string) => void
  searchInputValue: string
  onSearchInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  onSearchInputBlur: () => void
  onSearchInputKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void
  isSearching: boolean
  selectedTypes: string[]
  onTypeToggle: (type: string) => void
  selectedTags: string[]
  onTagToggle: (tag: string) => void
  selectedSources: string[]
  onSourceToggle: (source: string) => void
  minRating: number
  onMinRatingChange: (rating: number) => void
  updatedSince: string | null
  onUpdatedSinceChange: (date: string | null) => void
  sortBy: 'rating' | 'updated_at' | 'created_at'
  sortOrder: 'asc' | 'desc'
  onSortChange: (value: string) => void
  onClearFilters: () => void
}) {
  const navigate = useNavigate()
  const initialColumns = typeof window !== 'undefined' && window.innerWidth >= 1024 ? 3 : 1
  const [columnCount, setColumnCount] = useState<1 | 3>(initialColumns as 1 | 3)
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024)
  const [page, setPage] = useState(1)

  // Sync local page with parent's currentPage
  useEffect(() => {
    setPage(currentPage)
  }, [currentPage])

  // Update mobile state on window resize
  useEffect(() => {
    const handleResize = () => {
      const nextIsMobile = window.innerWidth < 1024
      setIsMobile(nextIsMobile)
      setColumnCount(nextIsMobile ? 1 : 3)
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const featuredPosts = blogPosts.filter(post => post.published).slice(0, 5)

  const getAverageRating = (productId: string) => {
    const productRatings = ratings.filter((r) => r.productId === productId)
    const product = products.find(p => p.id === productId)
    
    if (productRatings.length > 0 && product?.sourceRating) {
      const userAverage = productRatings.reduce((sum, r) => sum + r.rating, 0) / productRatings.length
      return (userAverage + product.sourceRating) / 2
    }
    if (productRatings.length > 0) {
      return productRatings.reduce((sum, r) => sum + r.rating, 0) / productRatings.length
    }
    if (product?.sourceRating) {
      return product.sourceRating
    }
    return 0
  }

  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(totalProductCount / pageSize))
    if (page > totalPages) {
      setPage(totalPages)
      onPageChange(totalPages)
    }
  }, [totalProductCount, page, pageSize, onPageChange])

  const totalPages = Math.max(1, Math.ceil(totalProductCount / pageSize))
  const startIndex = 0 // Backend handles pagination via limit/offset
  const endIndex = products.length
  const paginatedProducts = products

  // Combine API-filtered tags with tags from current page of products, plus selected tags
  const allTags = useMemo(() => {
    const tagCounts = new Map<string, number>()
    products.forEach(product => {
      (product.tags || []).filter(Boolean).forEach(tag => {
        tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1)
      })
    })
    
    // Add filtered tags (from API) and selected tags with lower priority if not in current results
    ;[...(filteredTags || []), ...selectedTags].forEach(tag => {
      if (tag && !tagCounts.has(tag)) {
        tagCounts.set(tag, 0) // Add with 0 count to include but sort last
      }
    })
    
    // Sort by frequency (descending), then alphabetically
    return Array.from(tagCounts.entries())
      .sort((a, b) => {
        if (b[1] !== a[1]) return b[1] - a[1] // Higher frequency first
        return a[0].localeCompare(b[0]) // Alphabetically for same frequency
      })
      .map(([tag]) => tag)
  }, [products, filteredTags, selectedTags])

  return (
    <div>
      {featuredPosts.length > 0 && (
        <FeaturedBlogCarousel 
          posts={featuredPosts}
          onSelectPost={(post) => navigate(`/blog/${post.slug}`)}
        />
      )}

      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-6">Find Access Solutions</h1>
        <div className="relative">
          <MagnifyingGlass
            size={20}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            type="search"
            placeholder="Search products..."
            value={searchInputValue}
            onChange={onSearchInputChange}
            onBlur={onSearchInputBlur}
            onKeyDown={onSearchInputKeyDown}
            className="pl-10"
            aria-label="Search products"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <aside className="lg:col-span-1" aria-label="Filters">
          {canViewBanned && (
            <div className="flex items-center justify-between mb-4">
              <label className="text-sm text-muted-foreground cursor-pointer flex items-center gap-2">
                Include banned products (admin/mod only)
                <Switch
                  id="include-banned"
                  checked={includeBanned}
                  onCheckedChange={onIncludeBannedChange}
                  data-testid="include-banned-switch"
                />
              </label>
            </div>
          )}
          <ProductFilters
            types={allProductTypes}
            tags={allTags}
            sources={allProductSources}
            selectedTypes={selectedTypes}
            selectedTags={selectedTags}
            selectedSources={selectedSources}
            minRating={minRating}
            updatedSince={updatedSince}
            sortBy={sortBy}
            sortOrder={sortOrder}
            onTypeToggle={onTypeToggle}
            onTagToggle={onTagToggle}
            onSourceToggle={onSourceToggle}
            onMinRatingChange={onMinRatingChange}
            onUpdatedSinceChange={onUpdatedSinceChange}
            onSortChange={onSortChange}
            onClearFilters={onClearFilters}
          />
        </aside>

        <div className="lg:col-span-3">
          <div className="mb-4 space-y-2">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="text-sm text-muted-foreground">
                {totalProductCount === 0
                  ? 'Showing 0 products'
                  : `Showing ${(page - 1) * pageSize + 1}-${Math.min(page * pageSize, totalProductCount)} of ${totalProductCount}`}
              </div>
              
              {user && totalProductCount > 0 && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onOpenCreateCollection({
                    name: searchQuery ? `Search: ${searchQuery}` : 'Filtered Products',
                    productSlugs: products.map(p => p.slug),
                    isPublic: false
                  })}
                  className="text-xs"
                >
                  Save as Collection
                </Button>
              )}
              
              {isSearching && (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  <span className="text-sm text-muted-foreground">Loading results...</span>
                </div>
              )}
              
              {/* Screen reader announcements */}
              <div 
                role="status" 
                aria-live="polite" 
                aria-atomic="true" 
                className="sr-only"
              >
                {isSearching && 'Searching products'}
                {!isSearching && products.length > 0 && `Showing ${products.length} products`}
                {!isSearching && products.length === 0 && 'No products found'}
              </div>
              {totalPages > 1 && (
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      const newPage = Math.max(1, page - 1)
                      setPage(newPage)
                      onPageChange(newPage)
                    }}
                    disabled={page <= 1}
                    className="h-8 px-2"
                    aria-label="Previous page"
                  >
                    Prev
                  </Button>
                  <span className="text-sm text-muted-foreground min-w-[6ch] text-center">
                    Page {page} / {totalPages}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      const newPage = Math.min(totalPages, page + 1)
                      setPage(newPage)
                      onPageChange(newPage)
                    }}
                    disabled={page >= totalPages}
                    className="h-8 px-2"
                    aria-label="Next page"
                  >
                    Next
                  </Button>
                </div>
              )}
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              <fieldset className="flex items-center gap-1 border border-border rounded-md p-1">
                <legend className="text-xs text-muted-foreground px-2">Items per page:</legend>
                {[30, 50, 100].map((size) => (
                  <Button
                    key={size}
                    variant={pageSize === size ? 'secondary' : 'ghost'}
                    size="sm"
                    onClick={() => {
                      onPageSizeChange(size)
                      setPage(1)
                      onPageChange(1)
                    }}
                    className="h-8 px-2 text-xs"
                    aria-pressed={pageSize === size}
                  >
                    {size}
                  </Button>
                ))}
              </fieldset>

              <div className="flex items-center gap-1 border border-border rounded-md p-1">
                <Button
                  variant={columnCount === 3 ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => setColumnCount(3)}
                  className="h-8 w-8 p-0"
                  aria-label="3 column view"
                  aria-pressed={columnCount === 3}
                >
                  <SquaresFour size={18} />
                </Button>
                <Button
                  variant={columnCount === 1 ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => setColumnCount(1)}
                  className="h-8 w-8 p-0"
                  aria-label="1 column view"
                  aria-pressed={columnCount === 1}
                >
                  <Rows size={18} />
                </Button>
              </div>

              {user && products.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    onOpenCreateCollection({
                      name: searchQuery ? `Search: ${searchQuery}` : 'My Collection',
                      description: `Collection with ${products.length} products`,
                      productSlugs: products.map(p => p.slug).filter((s): s is string => !!s),
                      isPublic: true,
                    })
                  }}
                  className="flex items-center gap-2"
                  aria-label={searchQuery ? 'Save search results as collection' : 'Save products as collection'}
                >
                  <FontAwesomeIcon icon={faLayerGroup} className="w-[16px] h-[16px]" />
                  <span className="hidden sm:inline">Save as Collection</span>
                  <span className="sm:hidden">Save</span>
                </Button>
              )}
            </div>
          </div>

          <h2 className="sr-only">Search Results</h2>

          {isSearching ? (
            <div className="flex flex-col items-center justify-center py-24">
              <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4" />
              <p className="text-muted-foreground">Loading results...</p>
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-lg text-muted-foreground">
                No products found. Try adjusting your filters.
              </p>
              {(selectedTypes.length > 0 || selectedTags.length > 0 || minRating > 0) && (
                <Button variant="outline" onClick={onClearFilters} className="mt-4">
                  Clear all filters
                </Button>
              )}
            </div>
          ) : columnCount === 1 ? (
            <div className="border border-border rounded-md overflow-hidden bg-card opacity-90" aria-busy={isSearching}>
              {paginatedProducts.map((product) => (
                <ProductListItem
                  key={product.id}
                  product={product}
                  ratings={ratings}
                  href={`/product/${product.slug ?? product.id}`}
                  onNavigate={() => navigate(`/product/${product.slug ?? product.id}`)}
                  user={user}
                  onRate={onRate}
                  showBannedBadge={canViewBanned}
                  canModerate={canModerate}
                  onToggleBan={() => onToggleBan(product)}
                  onDelete={onDeleteProduct}
                />
              ))}
            </div>
          ) : (
            <div className="grid gap-6 grid-cols-1 md:grid-cols-2 xl:grid-cols-3 opacity-90" aria-busy={isSearching}>
              {paginatedProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  ratings={ratings}
                  href={`/product/${product.slug ?? product.id}`}
                  onNavigate={() => navigate(`/product/${product.slug ?? product.id}`)}
                  onDelete={onDeleteProduct}
                  user={user}
                  onRate={onRate}
                  userAccount={userAccount}
                  showBannedBadge={canViewBanned}
                  canModerate={canModerate}
                  onToggleBan={() => onToggleBan(product)}
                />
              ))}
            </div>
          )}

          {totalProductCount > 0 && (
            <div className="flex items-center justify-between gap-3 flex-wrap mt-6">
              <div className="text-sm text-muted-foreground">
                {totalProductCount === 0
                  ? 'Showing 0 products'
                  : `Showing ${(page - 1) * pageSize + 1}-${Math.min(page * pageSize, totalProductCount)} of ${totalProductCount}`}
              </div>

              {totalPages > 1 && (
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      const newPage = Math.max(1, page - 1)
                      setPage(newPage)
                      onPageChange(newPage)
                    }}
                    disabled={page <= 1}
                    className="h-8 px-2"
                    aria-label="Previous page"
                  >
                    Prev
                  </Button>
                  <span className="text-sm text-muted-foreground min-w-[6ch] text-center">
                    Page {page} / {totalPages}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      const newPage = Math.min(totalPages, page + 1)
                      setPage(newPage)
                      onPageChange(newPage)
                    }}
                    disabled={page >= totalPages}
                    className="h-8 px-2"
                    aria-label="Next page"
                  >
                    Next
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function ProductDetailPage({ 
  products,
  ratings,
  discussions,
  user,
  userAccount,
  userCollections,
  onRate,
  onDiscuss,
  onAddTag,
  onAddToCollection,
  onRemoveFromCollection,
  onCreateCollection,
  onDelete,
  onEdit,
  onToggleBan,
  onEditDiscussion,
  onDeleteDiscussion,
  onToggleBlockDiscussion,
  allTags,
  allProductTypes = [],
}: {
  products: Product[]
  ratings: Rating[]
  discussions: Discussion[]
  user: UserData | null
  userAccount: UserAccount | null
  userCollections: Collection[]
  onRate: (productId: string, rating: number) => void
  onDiscuss: (productId: string, content: string, parentId?: string) => void
  onAddTag: (productId: string, tag: string) => void
  onAddToCollection: (collectionSlug: string) => Promise<void>
  onRemoveFromCollection: (collectionSlug: string) => Promise<void>
  onCreateCollection: (data: Omit<Collection, 'id' | 'createdAt' | 'updatedAt'>) => void
  onDelete: (productId: string) => void
  onEdit: (product: Product) => void
  onToggleBan: (product: Product, reason?: string) => void
  onEditDiscussion: (id: string, content: string) => Promise<void> | void
  onDeleteDiscussion: (id: string) => Promise<void> | void
  onToggleBlockDiscussion: (id: string, block: boolean) => Promise<void> | void
  allTags: string[]
  allProductTypes?: string[]
}) {
  const { slug: productSlug } = useParams()
  const [searchParams] = useSearchParams()
  const autoOpenEdit = searchParams.get('edit') === '1'
  const autoOpenOwnershipRequest = searchParams.get('requestEdit') === '1'
  const navigate = useNavigate()
  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchProduct = async () => {
      if (!productSlug) {
        setLoading(false)
        return
      }

      try {
        // First check if product is already in the products array (from home page navigation)
        const cachedProduct = products.find(p => p.slug === productSlug)
        if (cachedProduct) {
          setProduct({ ...cachedProduct, slug: cachedProduct.slug ?? productSlug })
          setLoading(false)
          return
        }

        // Otherwise fetch just this product
        const fetchedProduct = await APIService.getProductBySlug(productSlug)
        setProduct(fetchedProduct ? { ...fetchedProduct, slug: fetchedProduct.slug ?? productSlug } : null)
      } catch (error) {
        console.error('Failed to fetch product:', error)
        setProduct(null)
      } finally {
        setLoading(false)
      }
    }

    fetchProduct()
  }, [productSlug, products])

  if (loading) {
    return (
      <div className="text-center py-12">
        <p className="text-lg text-muted-foreground">Loading...</p>
      </div>
    )
  }

  if (!product) {
    return (
      <div className="text-center py-12">
        <p className="text-lg text-muted-foreground">Product not found</p>
        <Button variant="outline" onClick={() => navigate('/')} className="mt-4">
          Back to Products
        </Button>
      </div>
    )
  }

  return (
    <ProductDetail
      product={product}
      ratings={ratings}
      discussions={discussions}
      user={user}
      userAccount={userAccount}
      userCollections={userCollections}
      onBack={() => navigate('/')}
      onRate={(rating) => onRate(product.id, rating)}
      onDiscuss={(content, parentId) => onDiscuss(product.id, content, parentId)}
      onAddTag={(tag) => onAddTag(product.id, tag)}
      onAddToCollection={onAddToCollection}
      onRemoveFromCollection={onRemoveFromCollection}
      onCreateCollection={onCreateCollection}
      allTags={allTags}
      allProductTypes={allProductTypes}
      onDelete={onDelete}
      onEdit={onEdit}
      onToggleBan={onToggleBan}
      onEditDiscussion={onEditDiscussion}
      onDeleteDiscussion={onDeleteDiscussion}
      onToggleBlockDiscussion={onToggleBlockDiscussion}
      autoOpenEdit={autoOpenEdit}
      autoOpenOwnershipRequest={autoOpenOwnershipRequest}
    />
  )
}

function ProductDetailPageWrapper({ 
  products,
  ratings,
  discussions,
  user,
  userAccount,
  userCollections,
  onRate,
  onDiscuss,
  onAddTag,
  onCollectionsChange,
  onCreateCollection,
  onDelete,
  onEdit,
  onToggleBan,
  onEditDiscussion,
  onDeleteDiscussion,
  onToggleBlockDiscussion,
  allTags,
  allProductTypes = [],
}: {
  products: Product[]
  ratings: Rating[]
  discussions: Discussion[]
  user: UserData | null
  userAccount: UserAccount | null
  userCollections: Collection[]
  onRate: (productId: string, rating: number) => void
  onDiscuss: (productId: string, content: string, parentId?: string) => void
  onAddTag: (productId: string, tag: string) => void
  onCollectionsChange: (collections: Collection[] | ((current: Collection[]) => Collection[])) => void
  onCreateCollection: (data: CollectionCreateInput) => void
  onDelete: (productId: string) => void
  onEdit: (product: Product) => void
  onToggleBan: (product: Product, reason?: string) => void
  onEditDiscussion: (id: string, content: string) => Promise<void> | void
  onDeleteDiscussion: (id: string) => Promise<void> | void
  onToggleBlockDiscussion: (id: string, block: boolean) => Promise<void> | void
  allTags: string[]
  allProductTypes?: string[]
}) {
  const { slug } = useParams()
  const [searchParams] = useSearchParams()
  const autoOpenEdit = searchParams.get('edit') === '1'
  const autoOpenOwnershipRequest = searchParams.get('requestEdit') === '1'
  
  const [localRatings, setLocalRatings] = useState<Rating[]>(ratings)
  const [localDiscussions, setLocalDiscussions] = useState<Discussion[]>(discussions)

  // Fetch ratings and discussions if not already loaded
  useEffect(() => {
    const fetchData = async () => {
      if (ratings.length === 0) {
        try {
          const [allRatings, allDiscussions] = await Promise.all([
            APIService.getAllRatings(),
            APIService.getAllDiscussions(),
          ])
          setLocalRatings(allRatings)
          setLocalDiscussions(allDiscussions)
        } catch (error) {
          console.warn('[ProductDetailPageWrapper] Failed to fetch ratings/discussions:', error)
        }
      }
    }
    fetchData()
  }, [ratings.length])

  // Keep local state in sync when parent updates
  useEffect(() => {
    if (ratings.length > 0) setLocalRatings(ratings)
  }, [ratings])

  useEffect(() => {
    if (discussions.length > 0) setLocalDiscussions(discussions)
  }, [discussions])

  const handleAddToCollection = async (collectionSlug: string) => {
    if (!slug) return

    if (!collectionSlug) return

    const updated = await APIService.addProductToCollection(collectionSlug, slug)
    if (updated) {
      onCollectionsChange((current) => current.map((c) => ((c.slug || c.id) === collectionSlug ? updated : c)))
      toast.success('Added to collection')
    }
  }

  const handleRemoveFromCollection = async (collectionSlug: string) => {
    if (!slug) return
    const updated = await APIService.removeProductFromCollection(collectionSlug, slug)
    if (updated) {
      onCollectionsChange((current) => current.map((c) => ((c.slug || c.id) === collectionSlug ? updated : c)))
      toast.success('Removed from collection')
    }
  }

  return (
    <ProductDetailPage
      products={products}
      ratings={localRatings}
      discussions={localDiscussions}
      user={user}
      userAccount={userAccount}
      userCollections={userCollections}
      onRate={onRate}
      onDiscuss={onDiscuss}
      onAddTag={onAddTag}
      onAddToCollection={handleAddToCollection}
      onRemoveFromCollection={handleRemoveFromCollection}
      onCreateCollection={onCreateCollection}
      onDelete={onDelete}
      onEdit={onEdit}
      onToggleBan={onToggleBan}
      onEditDiscussion={onEditDiscussion}
      onDeleteDiscussion={onDeleteDiscussion}
      onToggleBlockDiscussion={onToggleBlockDiscussion}
      allTags={allTags}
      allProductTypes={allProductTypes}
      autoOpenEdit={autoOpenEdit}
      autoOpenOwnershipRequest={autoOpenOwnershipRequest}
    />
  )
}

function BlogPage({ blogPosts, userAccount }: { blogPosts: BlogPost[], userAccount: UserAccount | null }) {
  const navigate = useNavigate()
  const isAdmin = userAccount?.role === 'admin'

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-bold">Blog</h1>
        <div className="flex items-center gap-2">
          {isAdmin && (
            <Button variant="outline" onClick={() => navigate('/admin')}>
              Manage Posts
            </Button>
          )}
          <Button variant="ghost" onClick={() => navigate('/')} className="flex items-center gap-2">
            ← Back to Products
          </Button>
        </div>
      </div>
      <BlogPostList 
        posts={blogPosts}
        onSelectPost={(post) => navigate(`/blog/${post.slug}`)}
      />
    </div>
  )
}

function BlogPostPage({ blogPosts, userAccount }: { blogPosts: BlogPost[], userAccount: UserAccount | null }) {
  const { slug } = useParams()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const isEditMode = searchParams.get('edit') === 'true'
  const post = blogPosts.find(p => p.slug === slug)
  const isAdmin = userAccount?.role === 'admin'

  if (!post) {
    return (
      <div className="text-center py-12">
        <p className="text-lg text-muted-foreground">Blog post not found</p>
        <Button variant="outline" onClick={() => navigate('/blog')} className="mt-4">
          Back to Blog
        </Button>
      </div>
    )
  }

  const handleSave = async (updatedPost: BlogPost) => {
    try {
      await APIService.updateBlogPost(post.id, updatedPost)
      toast.success('Blog post updated successfully')
      // Remove edit mode from URL
      setSearchParams({})
      // Reload blog posts
      window.location.reload()
    } catch (error) {
      toast.error('Failed to update blog post')
      console.error('Update error:', error)
    }
  }

  const handleCancelEdit = () => {
    setSearchParams({})
  }

  if (isEditMode && isAdmin && userAccount) {
    return (
      <div>
        <h1 className="text-3xl font-bold mb-6">Edit Blog Post</h1>
        <BlogPostEditor
          post={post}
          authorName={userAccount.username}
          authorId={userAccount.id}
          onSave={handleSave}
          onCancel={handleCancelEdit}
        />
      </div>
    )
  }

  return (
    <BlogPostDetail
      post={post}
      onBack={() => navigate('/blog')}
      onEdit={isAdmin ? () => setSearchParams({ edit: 'true' }) : undefined}
    />
  )
}

function CollectionsPage({ 
  collections, 
  products, 
  user,
  onDeleteCollection,
  onEditCollection,
  onCreateCollection
}: {
  collections: Collection[]
  products: Product[]
  user: UserData | null
  onDeleteCollection: (collectionSlug: string) => void
  onEditCollection: (collection: Collection) => void
  onCreateCollection: () => void
}) {
  const navigate = useNavigate()
  const [publicCollections, setPublicCollections] = useState<Collection[]>([])

  useEffect(() => {
    const loadPublic = async () => {
      try {
        const result = await APIService.getPublicCollections('updated_at')
        setPublicCollections(result)
      } catch (e) {
        // ignore errors for now
      }
    }
    loadPublic()
  }, [])

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-bold">My Collections</h1>
        <div className="flex items-center gap-2">
          <Button onClick={onCreateCollection}>Create Collection</Button>
          <Button variant="ghost" onClick={() => navigate('/')}>
            ← Back to Products
          </Button>
        </div>
      </div>
      <CollectionsList
        collections={collections}
        products={products}
        onSelectCollection={(collection) => navigate(`/collections/${collection.slug || collection.id}`)}
        onDeleteCollection={onDeleteCollection}
        onEditCollection={onEditCollection}
        currentUserId={user?.id}
      />

      <div className="mt-10">
        <h2 className="text-2xl font-semibold mb-4">Public Collections</h2>
        <CollectionsList
          collections={publicCollections}
          products={products}
          onSelectCollection={(collection) => navigate(`/collections/${collection.slug || collection.id}`)}
          onDeleteCollection={() => { /* no-op for public */ }}
          currentUserId={user?.id}
        />
      </div>
    </div>
  )
}

function CollectionDetailPage({ 
  collections,
  ratings,
  user,
  userAccount,
  onRemoveProductFromCollection,
  onDeleteProduct
}: {
  collections: Collection[]
  ratings: Rating[]
  user: UserData | null
  userAccount: UserAccount | null
  onRemoveProductFromCollection: (collectionSlug: string, productSlug: string) => void
  onDeleteProduct: (productId: string) => void
}) {
  const { collectionSlug } = useParams()
  const navigate = useNavigate()
  
  // Try to find by slug first, then by ID
  const collection = collections.find(c => c.slug === collectionSlug || c.slug === collectionSlug)
  const [externalCollection, setExternalCollection] = useState<Collection | null>(null)

  // Refetch collection if it's loaded externally (not from main collections list)
  const refetchExternalCollection = async () => {
    if (!collection && collectionSlug) {
      try {
        const fetched = await APIService.getCollection(collectionSlug)
        setExternalCollection(fetched)
      } catch (e) {
        console.error('Failed to refetch collection:', e)
      }
    }
  }

  useEffect(() => {
    const load = async () => {
      if (!collection && collectionSlug) {
        try {
          const fetched = await APIService.getCollection(collectionSlug)
          setExternalCollection(fetched)
        } catch (e) {
          setExternalCollection(null)
        }
      }
    }
    load()
  }, [collection, collectionSlug])

  const effectiveCollection = collection || externalCollection || null

  if (!effectiveCollection) {
    return (
      <div className="text-center py-12">
        <p className="text-lg text-muted-foreground">Collection not found</p>
        <Button variant="outline" onClick={() => navigate('/collections')} className="mt-4">
          Back to Collections
        </Button>
      </div>
    )
  }

  return (
    <CollectionDetail
      collection={effectiveCollection}
      ratings={ratings}
      onBack={() => navigate('/collections')}
      onRemoveProduct={async (productSlug) => {
        onRemoveProductFromCollection(effectiveCollection.slug || effectiveCollection.id, productSlug)
        // Refetch collection after removal to update UI
        await refetchExternalCollection()
      }}
      onSelectProduct={(productSlug) => navigate(`/product/${productSlug}`)}
      isOwner={user?.id === effectiveCollection.userId}
      userAccount={userAccount}
      onDeleteProduct={onDeleteProduct}
      onTogglePrivacy={async (nextPublic) => {
        try {
          const updated = await APIService.updateCollection(effectiveCollection.id, { isPublic: nextPublic })
          if (updated) {
            // Update local list if present
            if (collections.find(c => c.slug === effectiveCollection.slug)) {
              // trigger state change via navigation back
            }
            // Update fallback state for direct-link views
            setExternalCollection(updated)
            toast.success(`Collection is now ${nextPublic ? 'public' : 'private'}`)
          }
        } catch (e) {
          toast.error('Failed to update collection visibility')
        }
      }}
    />
  )
}

function ProfilePage({ 
  user, 
  userAccount,
  onUpdate 
}: {
  user: UserData
  userAccount: UserAccount
  onUpdate: () => void
}) {
  const navigate = useNavigate()

  return (
    <div>
      <Button variant="ghost" onClick={() => navigate('/')} className="mb-6">
        ← Back to Products
      </Button>
      <UserProfile 
        userAccount={userAccount}
        user={user}
        onUpdate={onUpdate}
        onProductClick={(product) => navigate(`/product/${product.slug ?? product.id}`)}
        onCollectionsClick={() => navigate('/collections')}
        onBlogPostClick={(post) => navigate(`/blog/${post.slug}`)}
      />
    </div>
  )
}

function AdminPage({ 
  products,
  userAccount,
  ravelryAuthTimestamp,
  onProductsUpdate,
  onBlogPostsUpdate
}: {
  products: Product[]
  userAccount: UserAccount | null
  ravelryAuthTimestamp: number
  onProductsUpdate: (products: Product[]) => void
  onBlogPostsUpdate: () => void
}) {
  const navigate = useNavigate()

  const role = userAccount?.role
  const canAccess = role === 'admin' || role === 'moderator'
  if (!canAccess) {
    return (
      <div className="text-center py-12">
        <p className="text-lg text-muted-foreground">Access denied</p>
        <Button variant="outline" onClick={() => navigate('/')} className="mt-4">
          Back to Home
        </Button>
      </div>
    )
  }

  return (
    <AdminDashboard 
      onBack={() => navigate('/')} 
      products={products}
      onProductsUpdate={onProductsUpdate}
      userAccount={userAccount}
      ravelryAuthTimestamp={ravelryAuthTimestamp}
      onBlogPostsUpdate={onBlogPostsUpdate}
    />
  )
}

function AdminUsersPage({ userAccount }: { userAccount: UserAccount | null }) {
  const navigate = useNavigate()

  if (userAccount?.role !== 'admin') {
    return (
      <div className="text-center py-12">
        <p className="text-lg text-muted-foreground">Access denied</p>
        <Button variant="outline" onClick={() => navigate('/admin')} className="mt-4">
          Back to Admin
        </Button>
      </div>
    )
  }

  return <AdminUsersStats />
}

function AdminLogsPage({ 
  products,
  userAccount,
  ravelryAuthTimestamp,
  onProductsUpdate
}: {
  products: Product[]
  userAccount: UserAccount | null
  ravelryAuthTimestamp: number
  onProductsUpdate: (products: Product[]) => void
}) {
  const navigate = useNavigate()

  if (userAccount?.role !== 'admin') {
    return (
      <div className="text-center py-12">
        <p className="text-lg text-muted-foreground">Access denied</p>
        <Button variant="outline" onClick={() => navigate('/admin')} className="mt-4">
          Back to Admin
        </Button>
      </div>
    )
  }

  return (
    <AdminLogs 
      products={products}
      onProductsUpdate={onProductsUpdate}
      ravelryAuthTimestamp={ravelryAuthTimestamp}
    />
  )
}

function App() {
  console.log('🎯 [App] Function App() called - component initializing')
  const [products, setProducts] = useState<Product[]>([])
  const [ratings, setRatings] = useState<Rating[]>([])
  const [discussions, setDiscussions] = useState<Discussion[]>([])
  const [dataLoaded, setDataLoaded] = useState(false)
  const [allProductSources, setAllProductSources] = useState<Array<{ name: string; count: number }>>([])
  const [allProductTypes, setAllProductTypes] = useState<string[]>([])
  const [popularTags, setPopularTags] = useState<string[]>([])
  const [filteredTags, setFilteredTags] = useState<string[]>([])
  const [totalProductCount, setTotalProductCount] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(50)
  
  console.log('✓ [App] State initialized')
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()
  const [user, setUser] = useState<UserData | null>(null)
  const [userAccount, setUserAccount] = useState<UserAccount | null>(null)
  const [blogPosts, setBlogPosts] = useState<BlogPost[]>([])
  const [includeBanned, setIncludeBanned] = useState(false)
  const [hasAutoEnabledBanned, setHasAutoEnabledBanned] = useState(false)
  
  // Derive admin/moderator status from userAccount role
  const isAdmin = userAccount?.role === 'admin'
  const isModerator = userAccount?.role === 'moderator' || userAccount?.role === 'admin'
  const [collections, setCollections] = useState<Collection[]>([])
  const [showCreateCollectionDialog, setShowCreateCollectionDialog] = useState(false)
  const [showCreateCollectionFromSearchDialog, setShowCreateCollectionFromSearchDialog] = useState(false)
  const [showEditCollectionDialog, setShowEditCollectionDialog] = useState(false)
  const [editingCollection, setEditingCollection] = useState<Collection | null>(null)
  const [initialCollectionProductSlugs, setInitialCollectionProductSlugs] = useState<string[]>([])
  const [initialCollectionName, setInitialCollectionName] = useState<string>('')
  const [initialCollectionDescription, setInitialCollectionDescription] = useState<string>('')
  const [initialCollectionIsPublic, setInitialCollectionIsPublic] = useState<boolean>(true)
  const [showSignup, setShowSignup] = useState(false)
  const [isNewUser, setIsNewUser] = useState(false)
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0)
  const [oauthProcessed, setOauthProcessed] = useState(false)
  const [ravelryAuthTimestamp, setRavelryAuthTimestamp] = useState(0)
  const isTestEnv = import.meta.env.MODE === 'test'
  const devMode = import.meta.env.VITE_DEV_MODE === 'true'
  const [thingiverseAuthTimestamp, setThingiverseAuthTimestamp] = useState(0)
  
  // Filter states - initialize from URL params
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '')
  const [searchInputValue, setSearchInputValue] = useState(searchParams.get('q') || '')
  const [selectedTypes, setSelectedTypes] = useState<string[]>([])
  const [selectedSources, setSelectedSources] = useState<string[]>([])
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [minRating, setMinRating] = useState(0)
  const [updatedSince, setUpdatedSince] = useState<string | null>(null) // ISO date string
  const [committedUpdatedSince, setCommittedUpdatedSince] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState<'rating' | 'updated_at' | 'created_at'>('created_at')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [sortHasChanged, setSortHasChanged] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  
  // Track the latest search request to ignore stale responses
  const latestSearchIdRef = useRef(0)
  const userAccountFetchRef = useRef<string | null>(null) // Track which user we've fetched account for

  const handleTypeToggle = (type: string) => {
    setSelectedTypes((current) =>
      current.includes(type) ? current.filter((t) => t !== type) : [...current, type]
    )
  }

  const handleSourceToggle = (source: string) => {
    setSelectedSources((current) =>
      current.includes(source) ? current.filter((s) => s !== source) : [...current, source]
    )
  }

  const handleTagToggle = (tag: string) => {
    setSelectedTags((current) =>
      current.includes(tag) ? current.filter((t) => t !== tag) : [...current, tag]
    )
  }

  const handleClearFilters = () => {
    setSelectedTypes([])
    setSelectedTags([])
    setSelectedSources([])
    setMinRating(0)
    setUpdatedSince(null)
    setSearchQuery('')
    setSearchInputValue('')
    // Clear search from URL
    const newParams = new URLSearchParams(searchParams)
    newParams.delete('q')
    setSearchParams(newParams, { replace: true })
  }

  const handleUpdatedSinceChange = (date: string | null) => {
    setUpdatedSince(date)
  }

  const handleSortChange = (value: string) => {
    console.log('[App.handleSortChange] Called with value:', value)
    // Parse the combined value (e.g., "rating-desc", "created_at-asc")
    const [newSortBy, newSortOrder] = value.split('-') as ['rating' | 'updated_at' | 'created_at', 'asc' | 'desc']
    console.log('[App.handleSortChange] Setting sortBy:', newSortBy, 'sortOrder:', newSortOrder)
    setSortBy(newSortBy)
    setSortOrder(newSortOrder)
    setSortHasChanged(true) // Mark that sort has been explicitly changed
    setCurrentPage(1) // Reset to first page when sorting changes
  }

  // Debounce the updatedSince input so we only fire requests after user pauses typing
  useEffect(() => {
    const timer = setTimeout(() => {
      setCommittedUpdatedSince(updatedSince)
    }, 350)
    return () => clearTimeout(timer)
  }, [updatedSince])

  const handleSearchCommit = (value: string) => {
    setSearchQuery(value)
    // Update URL params to preserve search on navigation
    const newParams = new URLSearchParams(searchParams)
    if (value) {
      newParams.set('q', value)
    } else {
      newParams.delete('q')
    }
    setSearchParams(newParams, { replace: true })
  }

  const handleSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    setSearchInputValue(newValue)
    handleSearchCommit(newValue)
  }

  const handleSearchInputBlur = () => {
    // No longer needed since search happens on every keystroke
  }

  const handleSearchInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // No longer needed since search happens on every keystroke
  }

  // Sync searchInputValue when searchQuery is cleared externally
  useEffect(() => {
    setSearchInputValue(searchQuery)
  }, [searchQuery])

  // Combine filtered tags with tags from current page of products, plus any selected tags
  // Sort by frequency in current results (most common first)
  const allTags = useMemo(() => {
    // Count tag frequencies in current products
    const tagCounts = new Map<string, number>()
    products.forEach(product => {
      (product.tags || []).filter(Boolean).forEach(tag => {
        tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1)
      })
    })
    
    // Add filtered tags and selected tags with lower priority if not in current results
    ;[...filteredTags, ...selectedTags].forEach(tag => {
      if (tag && !tagCounts.has(tag)) {
        tagCounts.set(tag, 0) // Add with 0 count to include but sort last
      }
    })
    
    // Sort by frequency (descending), then alphabetically
    return Array.from(tagCounts.entries())
      .sort((a, b) => {
        if (b[1] !== a[1]) return b[1] - a[1] // Higher frequency first
        return a[0].localeCompare(b[0]) // Alphabetically for same frequency
      })
      .map(([tag]) => tag)
  }, [products, filteredTags, selectedTags])

  useEffect(() => {
    const loadData = async () => {
      setIsSearching(true)
      console.log('[App] Loading initial data...', { pathname: location.pathname })
      
      // Only load all products on pages that need the full list
      const needsFullProductList = location.pathname === '/' || 
                                   location.pathname === '/submit' ||
                                   location.pathname.startsWith('/collections') ||
                                   location.pathname.startsWith('/admin')
      
      try {
        // Always load metadata (types, sources, tags) even on detail pages
        // as they're needed for filters and forms
        const metadataResults = await Promise.allSettled([
          APIService.getProductSources(),
          APIService.getProductTypes(),
          APIService.getPopularTags(10),
        ])
        
        const loadedSources = metadataResults[0].status === 'fulfilled' ? metadataResults[0].value : []
        const loadedTypes = metadataResults[1].status === 'fulfilled' ? metadataResults[1].value : []
        const loadedTags = metadataResults[2].status === 'fulfilled' ? metadataResults[2].value : []
        
        setAllProductSources(loadedSources)
        setAllProductTypes(loadedTypes)
        setPopularTags(loadedTags)

        if (!needsFullProductList) {
          // For product detail pages, skip product list loading - page will fetch what it needs
          setDataLoaded(true)
          setIsSearching(false)
          return
        }

        // First fetch shared metadata (sources/types/tags) so we can fan-out product fetches per source
        // Use Promise.allSettled so that failures in one endpoint don't block others
        const results = await Promise.allSettled([
          APIService.getProductCount({ includeBanned }),
        ])
        
        const totalCount = results[0].status === 'fulfilled' ? results[0].value : 0

        // Fetch first page of products with pagination
        const offset = (1 - 1) * pageSize // page 1, so offset = 0
        const loadedProducts = await APIService.getAllProducts({ 
          includeBanned,
          limit: pageSize,
          offset,
          sortBy,
          sortOrder,
        })
        
        console.log('[App] Data loaded:', {
          products: loadedProducts.length,
          totalCount,
          types: loadedTypes,
          sources: loadedSources,
          tags: loadedTags,
        })
        
        // Note: Frontend no longer seeds data - backend handles all seeding
        setProducts(loadedProducts)
        setTotalProductCount(totalCount)
        setCurrentPage(1)
        
        // Metadata already set above, no need to set again
        setDataLoaded(true)
        setIsSearching(false)
        
        // Load ratings, discussions, and blog posts asynchronously (needed for home page display)
        // Only do this on home page
        if (location.pathname === '/') {
          Promise.all([
            APIService.getAllRatings(),
            APIService.getAllDiscussions(),
            APIService.getAllBlogPosts(false),
          ])
            .then(([ratings, discussions, blogPosts]) => {
              setRatings(ratings)
              setDiscussions(discussions)
              setBlogPosts(blogPosts)
            })
            .catch(error => {
              console.warn('[App] Failed to load ratings/discussions/blog posts:', error)
            })
        }
      } catch (error) {
        console.error('Failed to load data:', error)
        setDataLoaded(true)
        setIsSearching(false)
      }
    }
    
    loadData()
  }, [location.pathname])

  // Use AuthContext (supports both dev mode and production)
  const { user: authUser, loading: authLoading, getAccessToken, signIn, signOut } = useAuth()

  // Set up the auth token getter for API calls
  useEffect(() => {
    setAuthTokenGetter(getAccessToken)
  }, [getAccessToken])

  // Refetch products when filters, search, or page changes (consolidated effect to avoid duplicates)
  useEffect(() => {
    console.log('[App.fetchEffect] Triggered. dataLoaded:', dataLoaded, 'currentPage:', currentPage, 'sortBy:', sortBy, 'sortOrder:', sortOrder, 'location:', location.pathname)
    if (!dataLoaded) {
      console.log('[App.fetchEffect] Skipping - data not loaded yet')
      return // Wait for initial load
    }

    // Only run on home page
    if (location.pathname !== '/') {
      console.log('[App.fetchEffect] Skipping - not on home page')
      return
    }

    // Check if this is the initial load with no filters (skip to avoid duplicate from initial load)
    const isInitialLoad = currentPage === 1 && searchQuery === '' && selectedSources.length === 0 && 
                selectedTypes.length === 0 && selectedTags.length === 0 && 
                minRating === 0 && committedUpdatedSince === null &&
                sortBy === 'created_at' && sortOrder === 'desc' && !sortHasChanged
    
    if (isInitialLoad) {
      console.log('[App.fetchEffect] Skipping - using data from initial load')
      return
    }

    // Skip firing requests while the date input is incomplete or invalid
    const hasValidUpdatedSince = !committedUpdatedSince || /^\d{4}-\d{2}-\d{2}$/.test(committedUpdatedSince)
    if (!hasValidUpdatedSince) {
      console.log('[App.fetchEffect] Skipping - updatedSince is not a complete date yet', committedUpdatedSince)
      return
    }

    const abortController = new AbortController()
    const currentSearchId = ++latestSearchIdRef.current
    let debounceTimer: ReturnType<typeof setTimeout>

    const fetchProducts = async () => {
      try {
        // Convert date to ISO string with time set to start of day
        let updatedSinceISO: string | undefined
        if (committedUpdatedSince) {
          const [year, month, day] = committedUpdatedSince.split('-').map(Number)
          const utcDate = new Date(Date.UTC(year, (month || 1) - 1, day || 1, 0, 0, 0, 0))

          if (Number.isNaN(utcDate.getTime())) {
            console.warn('[App.fetchEffect] Invalid updatedSince date, skipping fetch', { updatedSince: committedUpdatedSince })
            return
          }

          updatedSinceISO = utcDate.toISOString()
        }

        const offset = (currentPage - 1) * pageSize
        // Expand 'Other' selection to include all minor sources (<5 items)
        const minorSources = (allProductSources || []).filter(s => (s?.count ?? 0) < 5).map(s => s.name)
        const effectiveSources = selectedSources.includes('Other')
          ? Array.from(new Set([
              ...selectedSources.filter(s => s !== 'Other'),
              ...minorSources,
            ]))
          : selectedSources

        const params = {
          includeBanned,
          search: searchQuery || undefined,
          limit: pageSize,
          offset,
          sources: effectiveSources.length > 0 ? effectiveSources : undefined,
          types: selectedTypes.length > 0 ? selectedTypes : undefined,
          tags: selectedTags.length > 0 ? selectedTags : undefined,
          minRating: minRating || undefined,
          updatedSince: updatedSinceISO,
          sortBy,
          sortOrder,
        }

        console.log('[App.fetchEffect] Fetching products with params:', params)
        setIsSearching(true)

        const [countResult, productsResult, tagsResult] = await Promise.allSettled([
          APIService.getProductCount(params, { signal: abortController.signal }),
          APIService.getAllProducts(params, { signal: abortController.signal }),
          APIService.getFilteredTags({
            search: params.search,
            sources: effectiveSources.length > 0 ? effectiveSources : undefined,
            types: params.types,
            includeBanned: params.includeBanned,
          })
        ])

        // Ignore stale responses
        if (currentSearchId !== latestSearchIdRef.current) {
          console.log('[App.fetchEffect] Search is stale, ignoring')
          return
        }

        if (abortController.signal.aborted) {
          console.log('[App.fetchEffect] Request was aborted')
          return
        }

        if (productsResult.status === 'fulfilled') {
          // Handle fallback for minRating filter
          if ((minRating || 0) > 0 && productsResult.value.length === 0) {
            const fallbackParams = { ...params }
            delete (fallbackParams as any).minRating
            try {
              const withoutRating = await APIService.getAllProducts(fallbackParams)
              const clientFiltered = withoutRating.filter(p => {
                const productRatings = ratings.filter(r => r.productSlug === p.slug)
                if (productRatings.length > 0 && p.sourceRating) {
                  const userAverage = productRatings.reduce((sum, r) => sum + r.rating, 0) / productRatings.length
                  const avgRating = (userAverage + p.sourceRating) / 2
                  return avgRating >= (minRating || 0)
                }
                if (productRatings.length > 0) {
                  const avgRating = productRatings.reduce((sum, r) => sum + r.rating, 0) / productRatings.length
                  return avgRating >= (minRating || 0)
                }
                if (p.sourceRating) {
                  return p.sourceRating >= (minRating || 0)
                }
                return false
              })
              setProducts(clientFiltered)
            } catch (e) {
              console.warn('[App.fetchEffect] Fallback client-side rating filter failed:', e)
              setProducts(productsResult.value)
            }
          } else {
            setProducts(productsResult.value)
          }
        } else {
          console.error('Failed to load products:', productsResult.reason)
          setProducts([])
        }

        if (tagsResult.status === 'fulfilled') {
          setFilteredTags(tagsResult.value)
        }

        const fallbackCount = productsResult.status === 'fulfilled' ? productsResult.value.length : 0
        const finalCount = countResult.status === 'fulfilled' ? countResult.value : fallbackCount
        
        setTotalProductCount(finalCount)
        
        // Only reset to page 1 if this was triggered by search/filter change (not page change)
        if (currentPage === 1) {
          console.log('[App.fetchEffect] Already on page 1')
        } else if (searchQuery === '' && selectedSources.length === 0 && selectedTypes.length === 0 && selectedTags.length === 0 && minRating === 0 && committedUpdatedSince === null) {
          // Page change without filter change - don't reset page
        } else {
          // Filter change - reset to page 1
          setCurrentPage(1)
        }
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          console.debug('[App.fetchEffect] Request was aborted')
        } else {
          console.error('Failed to fetch products:', error)
        }
      } finally {
        setIsSearching(false)
      }
    }

    debounceTimer = setTimeout(fetchProducts, 400)

    return () => {
      clearTimeout(debounceTimer)
      abortController.abort()
    }
  }, [searchQuery, includeBanned, selectedTypes, selectedSources, selectedTags, minRating, committedUpdatedSince, currentPage, dataLoaded, pageSize, location.pathname, sortBy, sortOrder])

  useEffect(() => {
    const fetchUser = async () => {
      console.log('🔍 [App] fetchUser called. authLoading:', authLoading, 'authUser:', authUser?.id)
      
      if (authLoading) return
      
      try {
        if (!authUser) {
          console.log('❌ [App] No authUser - clearing user state')
          setUser(null)
          setUserAccount(null)
          setShowSignup(false)
          userAccountFetchRef.current = null
          return
        }

        // Skip if we've already fetched this user
        if (userAccountFetchRef.current === authUser.id) {
          console.log('✓ [App] User account already fetched for', authUser.id)
          return
        }

        // Fetch account from backend using auth token (definitive source of truth)
        let account: typeof userAccount | null = null
        try {
          account = await APIService.getCurrentUser()
          if (!account) throw new Error('No account returned from /users/me')
          userAccountFetchRef.current = authUser.id
          
          const userData = {
            id: authUser.id,
            username: account.username,
            avatarUrl: account.avatarUrl,
          }
          
          setUser(userData)
          setUserAccount(account)
          console.log('🔐 [App] User account loaded from backend:', { username: account.username, role: account.role })
          console.log('✅ [App] User role:', account.role, '| isAdmin:', account.role === 'admin')
          
          if (isTestEnv) {
            setShowSignup(false)
            setIsNewUser(false)
          }
          return
        } catch (err: any) {
          const status = err?.status ?? 0
          if (status === 404) {
            // New user — create account
            console.log('📨 [App] User account not found, creating...')
          } else if (status) {
            console.error('Failed to fetch user account from /users/me:', {
              status,
              message: err?.message,
            })
            return
          }
        }

        // Account doesn't exist yet — create it using minimal info from auth
        // Priority: preferred_username (from GitHub via Supabase) > user_name > email > default
        let createUsername = 'user'
        
        // Check Supabase user_metadata for GitHub username fields
        const preferredUsername = authUser.user_metadata?.preferred_username
        const userName = authUser.user_metadata?.user_name
        
        if (preferredUsername && typeof preferredUsername === 'string') {
          createUsername = preferredUsername
        } else if (userName && typeof userName === 'string') {
          createUsername = userName
        } else if (authUser.email && typeof authUser.email === 'string' && authUser.email.includes('@')) {
          createUsername = authUser.email.split('@')[0]
        } else if (authUser.email) {
          createUsername = authUser.email
        }
        
        // Ensure username is safe by removing special characters and limiting length
        createUsername = createUsername.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 20)
        
        console.log('📨 [App] Creating user account...', { username: createUsername, email: authUser.email, source: preferredUsername ? 'preferred_username' : userName ? 'user_name' : 'email/default' })
        
        // Try to create account; if username conflict, retry with random suffix
        let account: typeof userAccount | null = null
        let usernameToCreate = createUsername
        let retries = 0
        const maxRetries = 3
        
        while (retries < maxRetries) {
          try {
            account = await APIService.createOrUpdateUserAccount(
              usernameToCreate,
              usernameToCreate,
              undefined, // avatar from auth not guaranteed
              authUser.email
            )
            // Success! Break out of retry loop
            break
          } catch (error: any) {
            // Check if this is a uniqueness constraint error (409 Conflict or contains "unique" in message)
            const isUniqueError = error?.status === 409 || (error?.message && error.message.toLowerCase().includes('unique'))
            
            if (isUniqueError && retries < maxRetries - 1) {
              // Username taken - append random suffix and retry
              retries++
              const randomSuffix = Math.random().toString(36).substring(2, 6)
              usernameToCreate = `${createUsername.slice(0, 16)}_${randomSuffix}`
              console.log('📨 [App] Username taken, retrying with:', usernameToCreate)
              continue
            } else {
              // Not a uniqueness error or out of retries - rethrow
              throw error
            }
          }
        }
        
        if (!account) {
          throw new Error('Failed to create user account after retries')
        }
        
        userAccountFetchRef.current = authUser.id

        const userData = {
          id: authUser.id,
          username: account.username,
          avatarUrl: account.avatarUrl,
        }

        setUser(userData)
        setUserAccount(account)
        console.log('🔐 [App] New user account created:', { username: account.username, role: account.role })
        
        if (!isTestEnv) {
          setIsNewUser(true)
          setShowSignup(true)
        } else {
          setShowSignup(false)
          setIsNewUser(false)
        }
      } catch (error) {
        console.error('Failed to load user account:', error)
        // Show user-friendly error message
        const errorMessage = error instanceof Error ? error.message : 'Failed to create account'
        toast.error(`Account setup failed: ${errorMessage}`)
        setShowSignup(false)
        setUser(null)
        setUserAccount(null)
      }
    }
    fetchUser()
  }, [authUser, authLoading, isTestEnv])

  useEffect(() => {
    const handleRavelryOAuth = async () => {
      console.log('[App OAuth] ========== OAUTH HANDLER CHECK ==========')
      console.log('[App OAuth] → Current URL:', window.location.href)
      console.log('[App OAuth] → Pathname:', window.location.pathname)
      console.log('[App OAuth] → Search params:', window.location.search)
      
      // Check for OAuth callback params first
      const urlParams = new URLSearchParams(window.location.search)
      const code = urlParams.get('code')
      const state = urlParams.get('state')
      const errorParam = urlParams.get('error')
      const isCallback = (code || errorParam) && window.location.pathname === '/admin'
      
      console.log('[App OAuth] → Code in URL:', code ? `YES (${code.substring(0, 10)}...)` : 'NO')
      console.log('[App OAuth] → Is OAuth callback:', isCallback)
      console.log('[App OAuth] → oauthProcessed flag:', oauthProcessed)
      console.log('[App OAuth] → authUser:', authUser ? `${authUser.username}` : 'null')
      console.log('[App OAuth] → authLoading:', authLoading)
      
      // If this is a fresh callback, reset the processed flag
      if (isCallback && oauthProcessed) {
        console.log('[App OAuth] → Fresh callback detected, resetting oauthProcessed flag')
        setOauthProcessed(false)
        return // Return and let next render process it
      }
      
      if (oauthProcessed && !isCallback) {
        console.log('[App OAuth] → Already processed and no callback params, skipping')
        return
      }

      // Wait for auth to be loaded before processing Ravelry OAuth
      if (authLoading) {
        console.log('[App OAuth] → Auth still loading, will retry...')
        return
      }

      // In production, require user to be logged in before processing Ravelry OAuth callback
      // In dev mode, we can proceed without waiting since DevAuthProvider handles it
      const isDevMode = import.meta.env.VITE_DEV_MODE === 'true'
      if (!authUser && !isDevMode) {
        if (code) {
          console.warn('[App OAuth] ⚠️  Ravelry OAuth callback received but user not logged in')
          toast.error('Please sign in with GitHub first, then authorize Ravelry.')
          setOauthProcessed(true)
          window.history.replaceState({}, document.title, '/admin')
        }
        return
      }
      
      console.log('[App OAuth] → State in URL:', state ? `YES (${state.substring(0, 16)}...)` : 'NO')
      console.log('[App OAuth] → Error in URL:', errorParam || 'NO')
      console.log('[App OAuth] → Path is /admin:', window.location.pathname === '/admin')
      
      if (errorParam) {
        console.error('[App OAuth] ✗ OAuth error in callback:', errorParam)
        const errorDesc = urlParams.get('error_description')
        console.error('[App OAuth] ✗ Error description:', errorDesc)
        
        toast.error(`OAuth Error: ${errorParam}${errorDesc ? ` - ${errorDesc}` : ''}`)
        window.history.replaceState({}, document.title, '/admin')
        setOauthProcessed(true)
        return
      }
      
      if (code && window.location.pathname === '/admin') {
        setOauthProcessed(true)
        
        console.log('[App OAuth] ========== OAUTH CALLBACK DETECTED ==========')
        console.log('[App OAuth] → Authorization code received:', code.substring(0, 10) + '...')
        console.log('[App OAuth] → State received:', state ? state.substring(0, 16) + '...' : 'MISSING')
        console.log('[App OAuth] → Current URL:', window.location.href)

        window.history.replaceState({}, document.title, '/admin')
        console.log('[App OAuth] → URL cleaned up immediately to prevent reload loop')

        try {
          const savedState = localStorage.getItem('ravelry-oauth-config-state')
          console.log('[App OAuth] → Saved state:', savedState ? savedState.substring(0, 16) + '...' : 'MISSING')
          
          if (!state || !savedState || state !== savedState) {
            console.error('[App OAuth] ✗ State validation failed!')
            console.error('[App OAuth]   - Received state:', state || 'MISSING')
            console.error('[App OAuth]   - Expected state:', savedState || 'MISSING')
            
            toast.error('OAuth state validation failed. Please try again.')
            localStorage.removeItem('ravelry-oauth-config-state')
            return
          }
          
          console.log('[App OAuth] ✓ State validation successful')
          localStorage.removeItem('ravelry-oauth-config-state')
          
          const config = await RavelryOAuthManager.getConfig()
          
          if (!config?.clientId || !config?.clientSecret) {
            console.error('[App OAuth] ✗ No OAuth credentials found in config')
            toast.error('OAuth credentials not configured. Please set up your Client ID and Secret first.')
            return
          }

          console.log('[App OAuth] → Config retrieved successfully')
          console.log('[App OAuth] → Exchanging code for access token...')

          const redirectUri = `${window.location.origin}/admin`
          const success = await RavelryOAuthManager.exchangeCodeForToken(
            code,
            config.clientId,
            config.clientSecret,
            redirectUri
          )

          console.log('[App OAuth] ← Exchange result:', success)

          if (success) {
            console.log('[App OAuth] ✓ OAuth flow completed successfully!')
            toast.success('Successfully authorized with Ravelry!')
            setRavelryAuthTimestamp(Date.now())
          } else {
            console.error('[App OAuth] ✗ Token exchange failed')
            toast.error('Failed to complete Ravelry authorization. Please try again.')
          }
        } catch (error) {
          console.error('[App OAuth] ✗ OAuth callback error:', error)
          toast.error('Error during Ravelry authorization')
        } finally {
          console.log('[App OAuth] ========== OAUTH CALLBACK COMPLETE ==========')
        }
      } else {
        console.log('[App OAuth] → No callback detected on this page load')
      }
    }

    handleRavelryOAuth()
  }, [authLoading, authUser, oauthProcessed])

  // Load collections for authenticated users

  useEffect(() => {
    const loadCollections = async () => {
      // Only load collections on pages that need them
      const needsCollections = location.pathname.startsWith('/collections') || 
                               location.pathname.startsWith('/product/')
      
      if (user && needsCollections) {
        try {
          const userCollections = await APIService.getUserCollections()
          setCollections(userCollections)
        } catch (error) {
          // Silently handle 404 for collections endpoint (not yet implemented)
          if (error instanceof Error && !error.message.includes('404')) {
            console.error('Failed to load collections:', error)
          }
        }
      }
    }
    loadCollections()
  }, [user, location.pathname])

  useEffect(() => {
    const loadPendingRequests = async () => {
      // Only load pending requests when on admin pages
      const isAdminPage = location.pathname.startsWith('/admin')
      if ((isAdmin || isModerator) && isAdminPage) {
        try {
          const requests = await APIService.getAllPendingRequests()
          const validRequests = requests.filter(request => {
            if (request.type === 'product-ownership' && request.productSlug) {
              const productExists = products.some(p => p.slug === request.productSlug)
              return productExists
            }
            return true
          })
          setPendingRequestsCount(validRequests.length)
        } catch (error) {
          console.error('Failed to load pending requests:', error)
        }
      }
    }
    loadPendingRequests()
    
    // Only set up polling when on admin pages
    const isAdminPage = location.pathname.startsWith('/admin')
    const interval = isAdminPage ? setInterval(loadPendingRequests, 60000) : null
    
    return () => {
      if (interval) clearInterval(interval)
    }
  }, [isAdmin, isModerator, products, location.pathname])

  const handleRate = async (productSlug: string, rating: number) => {
    if (!user) return

    try {
      const savedRating = await APIService.updateRating(productSlug, user.id, rating)
      console.log('[handleRate] savedRating:', savedRating)
      
      // Immediately update local state with the saved rating
      setRatings((currentRatings) => {
        const current = currentRatings || []
        // Find existing rating by matching productId (UUID) and userId
        const existingRatingIndex = current.findIndex(
          (r) => r.productId === savedRating.productId && r.userId === user.id
        )

        if (existingRatingIndex >= 0) {
          // Update existing rating
          const updated = [...current]
          updated[existingRatingIndex] = savedRating
          return updated
        } else {
          // Add new rating
          return [...current, savedRating]
        }
      })

      // Log activity (non-blocking)
      if (user?.id && savedRating.productId) {
        console.log('[handleRate] Logging activity with:', {
          userId: user.id,
          productId: savedRating.productId,
          type: 'rating',
          timestamp: Date.now(),
        })
        APIService.logUserActivity({
          userId: user.id,
          type: 'rating',
          productId: savedRating.productId,
          timestamp: Date.now(),
          metadata: { rating },
        }).catch(err => {
          console.error('[handleRate] Failed to log rating activity:', err)
          console.error('[handleRate] Error details:', JSON.stringify(err, null, 2))
        })
      }

      // Refetch all ratings for this product to ensure we have the latest aggregate data
      try {
        const productRatings = await APIService.getAllRatings()
        const thisProductRatings = productRatings.filter(r => r.productId === savedRating.productId)
        setRatings((currentRatings) => {
          const current = currentRatings || []
          // Remove old ratings for this product and add the fresh ones
          const otherRatings = current.filter(r => r.productId !== savedRating.productId)
          return [...otherRatings, ...thisProductRatings]
        })
      } catch (refetchError) {
        console.warn('[handleRate] Failed to refetch ratings (non-critical):', refetchError)
      }
      
      toast.success('Rating saved')
    } catch (error) {
      console.error('Failed to save rating:', error)
      toast.error('Failed to save rating')
    }
  }

  const handleDiscuss = async (
    productSlug: string,
    content: string,
    parentSlug?: string
  ) => {
    if (!user) return

    try {
      const newDiscussion = await APIService.createDiscussion({
        productSlug,
        userId: user.id,
        username: user.username,
        content,
        parentId,
      })

      setDiscussions((currentDiscussions) => [...(currentDiscussions || []), newDiscussion])
      
      // Stats are computed dynamically from database, no need to increment
      // APIService.incrementUserStats(user.id, 'discussionsParticipated')
      if (user?.id && newDiscussion.productId) {
        APIService.logUserActivity({
          userId: user.id,
          type: 'discussion',
          productId: newDiscussion.productId,
          timestamp: Date.now(),
          metadata: { parentId },
        }).catch(err => console.warn('Failed to log discussion activity:', err))
      }
      
      toast.success(parentId ? 'Reply posted' : 'Discussion started')
    } catch (error) {
      console.error('Failed to post discussion:', error)
      toast.error('Failed to post discussion')
    }
  }

  const handleEditDiscussion = async (discussionId: string, content: string) => {
    let previous: Discussion | undefined
    setDiscussions((current) => {
      const list = current || []
      previous = list.find((d) => d.id === discussionId)
      const editedAt = Date.now()
      return list.map((d) => (d.id === discussionId ? { ...d, content, editedAt } : d))
    })

    try {
      const updated = await APIService.updateDiscussion(discussionId, { content })
      if (updated) {
        setDiscussions((current) => (current || []).map((d) => (d.id === discussionId ? { ...d, ...updated } : d)))
        toast.success('Post updated')
      }
    } catch (error: any) {
      // rollback optimistic update
      setDiscussions((current) => {
        const list = current || []
        return list.map((d) => (d.id === discussionId && previous ? previous : d))
      })
      const message = error?.message || 'Failed to update post'
      console.error('Failed to update discussion:', error)
      toast.error(message)
      throw error
    }
  }

  const handleDeleteDiscussion = async (discussionId: string) => {
    try {
      const deleted = await APIService.deleteDiscussion(discussionId)
      if (deleted) {
        // Keep the node for threading, mark content as deleted
        setDiscussions((current) => (current || []).map((d) => (d.id === discussionId ? { ...d, content: deleted.content } : d)))
        toast.success('Post deleted')
      }
    } catch (error) {
      console.error('Failed to delete discussion:', error)
      toast.error('Failed to delete post')
    }
  }

  const handleToggleBlockDiscussion = async (discussionId: string, block: boolean) => {
    try {
      const updated = block
        ? await APIService.blockDiscussion(discussionId)
        : await APIService.unblockDiscussion(discussionId)

      setDiscussions((current) => (current || []).map((d) => (d.id === discussionId ? { ...d, ...updated } as Discussion : d)))
      toast.success(block ? 'Post blocked' : 'Post unblocked')
    } catch (error: any) {
      console.error('Failed to toggle block on discussion:', error)
      const message = error?.message || (block ? 'Failed to block post' : 'Failed to unblock post')
      toast.error(message)
    }
  }

  const handleAddTag = async (productSlug: string, tag: string) => {
    if (!user) return

    try {
      const normalizedTag = tag.trim().toLowerCase()
      const product = products?.find(p => p.slug === productSlug)
      
      if (!product) return
      
      if (product.tags.some((t) => t.toLowerCase() === normalizedTag)) {
        toast.info('Tag already exists')
        return
      }
      
      const updatedProduct = await APIService.updateProduct(
        productSlug,
        { tags: [...product.tags, normalizedTag] },
        user.id
      )
      
      if (updatedProduct) {
        setProducts((currentProducts) => {
          const current = currentProducts || []
          return current.map((p) => p.id === productSlug ? updatedProduct : p)
        })
        
        if (user?.id && product.id) {
          APIService.logUserActivity({
            userId: user.id,
            type: 'tag',
            productId: product.id,
            timestamp: Date.now(),
            metadata: { tag: normalizedTag },
          }).catch(err => console.warn('Failed to log tag activity:', err))
        }
        
        toast.success('Tag added successfully')
      }
    } catch (error) {
      console.error('Failed to add tag:', error)
      toast.error('Failed to add tag')
    }
  }

  const handleLogin = () => {
    console.log('[App] 🔐 handleLogin called')
    console.log('[App] → isTestEnv:', isTestEnv)
    console.log('[App] → signIn function:', typeof signIn)
    
    if (isTestEnv) {
      toast.info('Login is disabled in tests')
      return
    }
    
    console.log('[App] → Calling signIn()...')
    // Call auth context signIn which triggers GitHub OAuth
    signIn().catch((error) => {
      console.error('[App] ❌ Sign in error:', error)
      toast.error('Failed to sign in. Please try again.')
    })
    console.log('[App] → signIn() called (waiting for redirect or error)')
  }

  const handleLogout = async () => {
    try {
      await signOut()
      setUser(null)
      setUserAccount(null)
      setHasAutoEnabledBanned(false)
      setIncludeBanned(false)
      setProducts((current) => current.filter((p) => !p.banned))
      toast.success('Signed out successfully')
    } catch (error) {
      console.error('Logout error:', error)
      toast.error('Failed to sign out. Please try again.')
    }
  }

  const handleProfileUpdate = async () => {
    if (user) {
      const account = await APIService.getUserAccount(user.username)
      if (account) {
        setUserAccount(account)
      }
    }
  }

  const handleBlogPostsUpdate = async () => {
    try {
      const posts = await APIService.getAllBlogPosts(false)
      setBlogPosts(posts)
    } catch (error) {
      console.error('Failed to reload blog posts:', error)
    }
  }

  const handleIncludeBannedChange = async (nextIncludeBanned: boolean) => {
    // Just update state - let the consolidated fetch effect handle the API call with proper pagination
    setIncludeBanned(nextIncludeBanned)
    setCurrentPage(1) // Reset to first page when filter changes
  }

  useEffect(() => {
    const canViewBanned = isAdmin || isModerator

    if (canViewBanned && !includeBanned && !hasAutoEnabledBanned) {
      setHasAutoEnabledBanned(true)
      handleIncludeBannedChange(true)
      return
    }

    if (!canViewBanned) {
      setHasAutoEnabledBanned(false)
      if (includeBanned) {
        handleIncludeBannedChange(false)
      }
    }
  }, [includeBanned, isAdmin, isModerator, hasAutoEnabledBanned])

  const handleProductCreated = async () => {
    // Reset page to 1 and let the consolidated fetch effect reload with proper pagination
    setCurrentPage(1)
  }

  const handleDeleteProduct = async (productSlug: string) => {
    console.log('[App] handleDeleteProduct called with slug/id:', productSlug)
    console.log('[App] Current user:', user)
    console.log('[App] Current userAccount:', userAccount)
    const resolvedSlug = products.find(p => p.slug === productSlug || p.id === productSlug)?.slug || productSlug
    
    try {
      console.log('[App] Calling APIService.deleteProduct...')
      await APIService.deleteProduct(resolvedSlug)
      console.log('[App] Delete successful, updating local state')
      
      setProducts((currentProducts) => 
        (currentProducts || []).filter(p => p.id !== productSlug && p.slug !== productSlug)
      )
      
      setRatings((currentRatings) =>
        (currentRatings || []).filter(r => r.productId !== productSlug && (r as any).productSlug !== productSlug)
      )
      
      setDiscussions((currentDiscussions) =>
        (currentDiscussions || []).filter(d => d.productId !== productSlug && (d as any).productSlug !== productSlug)
      )
      
      toast.success('Product deleted successfully')
    } catch (error) {
      console.error('[App] Failed to delete product:', error)
      const errorMessage = error instanceof Error ? error.message : String(error)
      const detailedMessage = `Failed to delete product: ${errorMessage}`
      console.error('[App] Error details:', { error, errorMessage })
      toast.error(detailedMessage)
    }
  }

  const handleEditProduct = async (updatedProduct: Product) => {
    try {
      await APIService.updateProduct(updatedProduct.slug, updatedProduct, user?.username)
      
      setProducts((currentProducts) =>
        (currentProducts || []).map(p =>
          p.slug === updatedProduct.slug ? updatedProduct : p
        )
      )
      
      if (user?.id && updatedProduct.id) {
        try {
          await APIService.logUserActivity({
            userId: user.id,
            type: 'product_submit',
            productId: updatedProduct.id,
            timestamp: Date.now(),
            metadata: { action: 'edit' },
          })
        } catch (activityError) {
          console.warn('Failed to log activity (non-critical):', activityError)
        }
      }
      
      toast.success('Product updated successfully')
    } catch (error) {
      console.error('Failed to update product:', error)
      toast.error('Failed to update product')
    }
  }

  const handleToggleBan = async (product: Product, reason?: string) => {
    console.log('[App.handleToggleBan] invoked', {
      productSlug: product.slug,
      productId: product.id,
      banned: product.banned,
      reason,
      userRole: userAccount?.role
    })
    if (!userAccount || (userAccount.role !== 'admin' && userAccount.role !== 'moderator')) {
      toast.error('Only moderators or admins can change ban status')
      console.warn('[App.handleToggleBan] blocked - insufficient role', { role: userAccount?.role })
      return
    }

    try {
      const productKey = product.slug || product.id
      if (!productKey) {
        toast.error('Missing product identifier')
        return
      }

      const current = products.find((p) => p.slug === productKey || p.id === productKey)
      if (!current) {
        console.warn('[Ban] Product not found in state, proceeding with payload product only', { productKey })
      }

      const target = current ?? product

      console.log('[Ban] Toggling ban', { productKey, currentBanned: target.banned, reason })

      if (target.banned) {
        const updated = await APIService.unbanProduct(productKey)
        if (updated) {
          setProducts((existing) => existing.map((p) => (p.slug === productKey || p.id === productKey ? updated : p)))
          toast.success('Product unbanned')
        }
      } else {
        const banReason = reason && reason.trim() ? reason.trim() : `Banned by ${userAccount.role}`
        const updated = await APIService.banProduct(productKey, banReason, userAccount.username)
        if (updated) {
          setProducts((existing) => existing.map((p) => (p.slug === productKey || p.id === productKey ? updated : p)))
          toast.success('Product banned')
        }
      }
    } catch (error) {
      console.error('Failed to toggle ban:', error)
      toast.error('Failed to update ban status')
    }
  }

  const handleCreateCollection = async (collectionData: CollectionCreateInput) => {
    try {
      const { productSlugs = [], ...rest } = collectionData
      const newCollection = await APIService.createCollection({
        ...rest,
        productSlugs: [], // Create with empty array, then add products
      })
      let finalCollection = newCollection
      if (productSlugs && productSlugs.length > 0) {
        const collectionSlug = newCollection.slug || newCollection.slug
        const updated = await APIService.addMultipleProductsToCollection(collectionSlug, productSlugs)
        if (updated) finalCollection = updated
      }
      setCollections((current) => [finalCollection, ...current])
      toast.success('Collection created successfully')
    } catch (error) {
      console.error('Failed to create collection:', error)
      toast.error('Failed to create collection')
    }
  }

  const handleCreateCollectionFromSearch = async (collectionData: CollectionCreateInput) => {
    try {
      const newCollection = await APIService.createCollectionFromSearch({
        name: collectionData.name,
        description: collectionData.description,
        isPublic: collectionData.isPublic,
        search: searchQuery || undefined,
        sources: selectedSources.length > 0 ? selectedSources : undefined,
        types: selectedTypes.length > 0 ? selectedTypes : undefined,
        tags: selectedTags.length > 0 ? selectedTags : undefined,
        minRating: minRating > 0 ? minRating : undefined,
        createdBy: collectionData.username,
      })
      setCollections((current) => [newCollection, ...current])
      setShowCreateCollectionFromSearchDialog(false)
      toast.success('Collection created from search results!')
    } catch (error) {
      console.error('Failed to create collection from search:', error)
      toast.error('Failed to create collection from search')
    }
  }

  const handleUpdateCollection = async (
    collectionSlug: string,
    updates: Partial<Omit<Collection, 'slug' | 'createdAt' | 'username'>>
  ) => {
    try {
      const updated = await APIService.updateCollection(collectionSlug, updates)
      if (updated) {
        setCollections((current) =>
          current.map((c) => (c.slug === collectionSlug ? updated : c))
        )
        toast.success('Collection updated successfully')
      }
    } catch (error) {
      console.error('Failed to update collection:', error)
      toast.error('Failed to update collection')
    }
  }

  const handleDeleteCollection = async (collectionSlug: string) => {
    try {
      await APIService.deleteCollection(collectionSlug)
      setCollections((current) => current.filter((c) => c.slug !== collectionSlug))
      toast.success('Collection deleted successfully')
    } catch (error) {
      console.error('Failed to delete collection:', error)
      toast.error('Failed to delete collection')
    }
  }

  const handleRemoveProductFromCollection = async (collectionSlug: string, productSlug: string) => {
    try {
      const updated = await APIService.removeProductFromCollection(collectionSlug, productSlug)
      if (updated) {
        setCollections((current) =>
          current.map((c) => (c.slug === collectionSlug ? updated : c))
        )
        toast.success('Product removed from collection')
      }
    } catch (error) {
      console.error('Failed to remove product:', error)
      toast.error('Failed to remove product')
    }
  }

  const handleCompleteSignup = () => {
    setShowSignup(false)
    setIsNewUser(false)
    toast.success('Welcome to a11yhood!')
  }

  const handleSkipSignup = () => {
    setShowSignup(false)
    setIsNewUser(false)
    toast.success('Welcome to a11yhood!')
  }

  return (
    <div className="min-h-screen bg-(--color-bg)">
      {showSignup && user ? (
        <UserSignup
          user={{
            id: user.id,
            username: user.username || '',
            avatarUrl: user.avatarUrl || userAccount?.avatarUrl || ''
          }}
          onComplete={handleCompleteSignup}
          onSkip={handleSkipSignup}
        />
      ) : (
        <>
          <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[100] focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-md focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            onClick={(e) => {
              const main = document.getElementById('main-content') as HTMLElement | null
              if (main) {
                // Ensure main is programmatically focusable, then move focus
                if (!main.hasAttribute('tabIndex')) {
                  main.setAttribute('tabIndex', '-1')
                }
                main.focus()
              }
            }}
          >
            Skip to main content
          </a>
          
          <AppHeader 
            user={user}
            userAccount={userAccount}
            pendingRequestsCount={pendingRequestsCount}
            onLogin={handleLogin}
            onLogout={handleLogout}
            onProductCreated={handleProductCreated}
          />

          {(isTestEnv || devMode) && (
            <DevRoleSwitcher 
              userAccount={userAccount}
            />
          )}

          <main id="main-content" tabIndex={-1} className="max-w-7xl mx-auto px-6 py-8">
            <Routes>
              {/* OAuth callback route for Supabase GitHub sign-in */}
              <Route path="/auth/callback" element={<AuthCallback />} />
              <Route path="/about" element={<AboutPage />} />
              <Route path="/" element={
                <ProductListPage
                  products={products}
                  ratings={ratings}
                  user={user}
                  userAccount={userAccount}
                  canViewBanned={isAdmin || isModerator}
                  includeBanned={includeBanned}
                  onIncludeBannedChange={handleIncludeBannedChange}
                  collections={collections}
                  blogPosts={blogPosts}
                  allProductSources={allProductSources}
                  allProductTypes={allProductTypes}
                  popularTags={popularTags}
                  filteredTags={filteredTags}
                  totalProductCount={totalProductCount}
                  currentPage={currentPage}
                  onPageChange={setCurrentPage}
                  pageSize={pageSize}
                  onPageSizeChange={setPageSize}
                  onRate={handleRate}
                  onDeleteProduct={handleDeleteProduct}
                  onCreateCollection={handleCreateCollection}
                  onOpenCreateCollection={(defaults) => {
                    setInitialCollectionName(defaults.name ?? '')
                    setInitialCollectionDescription(defaults.description ?? '')
                    setInitialCollectionProductSlugs(defaults.productSlugs ?? [])
                    setInitialCollectionIsPublic(defaults.isPublic ?? true)
                    setShowCreateCollectionDialog(true)
                  }}
                  searchQuery={searchQuery}
                  onSearchChange={setSearchQuery}
                  searchInputValue={searchInputValue}
                  onSearchInputChange={handleSearchInputChange}
                  onSearchInputBlur={handleSearchInputBlur}
                  onSearchInputKeyDown={handleSearchInputKeyDown}
                  isSearching={isSearching}
                  selectedTypes={selectedTypes}
                  onTypeToggle={handleTypeToggle}
                  selectedTags={selectedTags}
                  onTagToggle={handleTagToggle}
                  selectedSources={selectedSources}
                  onSourceToggle={handleSourceToggle}
                  minRating={minRating}
                  onMinRatingChange={setMinRating}
                  updatedSince={updatedSince}
                  onUpdatedSinceChange={handleUpdatedSinceChange}
                  sortBy={sortBy}
                  sortOrder={sortOrder}
                  onSortChange={handleSortChange}
                  onClearFilters={handleClearFilters}
                  canModerate={isAdmin || isModerator}
                  onToggleBan={handleToggleBan}
                />
              } />
              <Route path="/product/:slug" element={
                <ProductDetailPageWrapper
                  products={products}
                  ratings={ratings}
                  discussions={discussions}
                  user={user}
                  userAccount={userAccount}
                  userCollections={collections}
                  onRate={handleRate}
                  onDiscuss={handleDiscuss}
                  onAddTag={handleAddTag}
                  onCollectionsChange={setCollections}
                  onCreateCollection={handleCreateCollection}
                  onDelete={handleDeleteProduct}
                  onEdit={handleEditProduct}
                  onToggleBan={handleToggleBan}
                  onEditDiscussion={handleEditDiscussion}
                  onDeleteDiscussion={handleDeleteDiscussion}
                  onToggleBlockDiscussion={handleToggleBlockDiscussion}
                  allTags={allTags}
                  allProductTypes={allProductTypes}
                />
              } />
              <Route path="/blog" element={
                <BlogPage blogPosts={blogPosts} userAccount={userAccount} />
              } />
              <Route path="/blog/:slug" element={
                <BlogPostPage blogPosts={blogPosts} userAccount={userAccount} />
              } />
              <Route path="/collections" element={
                <CollectionsPage
                  collections={collections}
                  products={(isAdmin || isModerator) && includeBanned ? (products || []) : (products || []).filter((p) => !p.banned)}
                  user={user}
                  onDeleteCollection={handleDeleteCollection}
                  onEditCollection={(collection) => {
                    setEditingCollection(collection)
                    setShowEditCollectionDialog(true)
                  }}
                  onCreateCollection={() => setShowCreateCollectionDialog(true)}
                />
              } />
              <Route path="/collections/:collectionSlug" element={
                <CollectionDetailPage
                  collections={collections}
                  ratings={ratings}
                  user={user}
                  userAccount={userAccount}
                  onRemoveProductFromCollection={handleRemoveProductFromCollection}
                  onDeleteProduct={handleDeleteProduct}
                />
              } />
              <Route path="/account/:username" element={
                user && userAccount ? (
                  <ProfilePage
                    user={user}
                    userAccount={userAccount}
                    onUpdate={handleProfileUpdate}
                  />
                ) : (
                  <div className="text-center py-12">
                    <p className="text-lg text-muted-foreground">Please sign in to view your account</p>
                    <Button onClick={handleLogin} className="mt-4">Sign In</Button>
                  </div>
                )
              } />
              <Route path="/profile" element={<Navigate to={user ? `/profile/${user.username}` : '/'} replace />} />
              <Route path="/profile/:username" element={
                <PublicProfileWrapper />
              } />
              {/* Backward compatibility: redirect /account to /account/:username if signed in */}
              <Route path="/account" element={<Navigate to={user ? `/account/${user.username}` : '/'} replace />} />
              <Route path="/admin" element={
                <AdminPage
                  products={products}
                  userAccount={userAccount}
                  ravelryAuthTimestamp={ravelryAuthTimestamp}
                  onProductsUpdate={setProducts}
                  onBlogPostsUpdate={handleBlogPostsUpdate}
                />
              } />
              <Route path="/admin/users" element={
                <AdminUsersPage userAccount={userAccount} />
              } />
              <Route path="/admin/logs" element={
                <AdminLogsPage
                  products={products}
                  userAccount={userAccount}
                  ravelryAuthTimestamp={ravelryAuthTimestamp}
                  onProductsUpdate={setProducts}
                />
              } />
            </Routes>
          </main>

          {user && (
            <>
              <CreateCollectionDialog
                open={showCreateCollectionDialog}
                onOpenChange={setShowCreateCollectionDialog}
                onCreateCollection={handleCreateCollection}
                initialProductSlugs={initialCollectionProductSlugs}
                initialName={initialCollectionName}
                initialDescription={initialCollectionDescription}
                initialIsPublic={initialCollectionIsPublic}
                username={user.username}
              />

              <CreateCollectionDialog
                open={showCreateCollectionFromSearchDialog}
                onOpenChange={setShowCreateCollectionFromSearchDialog}
                onCreateCollection={handleCreateCollectionFromSearch}
                title="Save Search Results as Collection"
                description="Create a new collection from your current search and filter results"
                username={user.username}
                hideProductSlugs
              />

              <EditCollectionDialog
                open={showEditCollectionDialog}
                onOpenChange={setShowEditCollectionDialog}
                collection={editingCollection}
                onUpdateCollection={handleUpdateCollection}
              />
            </>
          )}

          <Toaster />
          <AppFooter />
        </>
      )}
    </div>
  )
}

export default App

function PublicProfileWrapper() {
  const { username } = useParams()
  if (!username) return <div className="text-center py-12"><p className="text-muted-foreground">No user specified</p></div>
  return <PublicProfile username={username} />
}

function AuthCallback() {
  const navigate = useNavigate()

  useEffect(() => {
    const process = async () => {
      try {
        const isDevMode = import.meta.env.VITE_DEV_MODE === 'true'
        if (isDevMode) {
          // In dev mode we bypass Supabase entirely
          return
        }

        // Triggers Supabase to detect and set session from URL hash
        const { supabase } = await import('@/lib/supabase')
        await supabase.auth.getSession()
      } catch (e) {
        console.error('[AuthCallback] Failed to process session from URL:', e)
      } finally {
        // Clean up the URL and redirect to home
        window.history.replaceState({}, document.title, '/')
        navigate('/', { replace: true })
      }
    }
    process()
  }, [navigate])

  return (
    <div className="text-center py-12">
      <p className="text-lg text-muted-foreground">Signing you in…</p>
    </div>
  )
}
