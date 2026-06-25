import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent } from '@/components/ui/card'
import { ProductCard } from '@/components/ProductCard'
import { ProductListItem } from '@/components/ProductListItem'
import { ProductFilters } from '@/components/ProductFilters'
import { MagnifyingGlass, SquaresFour, Rows, FolderOpen, NotePencil, Plus } from '@phosphor-icons/react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faLayerGroup } from '@fortawesome/free-solid-svg-icons'
import {
    AddToCollectionDefaults,
    Product,
    Rating,
    UserData,
    UserAccount,
    Collection,
    CollectionCreateInput,
    BlogPost
} from '@/lib/types'
import { buildAddToCollectionDefaultsForCollection, buildAddToCollectionDefaultsForProducts } from '@/lib/addToCollection'


// eslint-disable-next-line react-refresh/only-export-components
export function asProductArray(value: unknown): Product[] {
    if (Array.isArray(value)) {
        return value
    }

    if (value && typeof value === 'object') {
        const candidate = value as { products?: unknown; items?: unknown; data?: unknown }
        if (Array.isArray(candidate.products)) return candidate.products as Product[]
        if (Array.isArray(candidate.items)) return candidate.items as Product[]
        if (Array.isArray(candidate.data)) return candidate.data as Product[]
    }

    return []
}

// eslint-disable-next-line react-refresh/only-export-components
export function getProductRenderKey(product: Product, index: number): string {
    if (product.slug) {
        return `slug:${product.slug}`
    }

    if (product.id !== undefined && product.id !== null) {
        return `id:${String(product.id)}`
    }

    return `idx:${index}`
}


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
    onOpenAddToCollection,
    searchQuery,
    onSearchChange,
    searchInputValue,
    onSearchInputChange,
    onSearchInputBlur,
    onSearchInputKeyDown,
    isSearching,
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
    onCreateCollection: (data: CollectionCreateInput) => void
    onOpenAddToCollection: (defaults: AddToCollectionDefaults) => void
    searchQuery: string
    onSearchChange: (query: string) => void
    searchInputValue: string
    onSearchInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void
    onSearchInputBlur: () => void
    onSearchInputKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void
    isSearching: boolean
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
    const [page, setPage] = useState(1)

    // These are intentionally accepted for API compatibility with SearchPage props.
    void popularTags
    void onCreateCollection
    void onSearchChange

    // Sync local page with parent's currentPage
    useEffect(() => {
        setPage(currentPage)
    }, [currentPage])

    // Update mobile state on window resize
    useEffect(() => {
        const handleResize = () => {
            const nextIsMobile = window.innerWidth < 1024
            setColumnCount(nextIsMobile ? 1 : 3)
        }
        window.addEventListener('resize', handleResize)
        return () => window.removeEventListener('resize', handleResize)
    }, [])

    useEffect(() => {
        const totalPages = Math.max(1, Math.ceil(totalProductCount / pageSize))
        if (page > totalPages) {
            setPage(totalPages)
            onPageChange(totalPages)
        }
    }, [totalProductCount, page, pageSize, onPageChange])

    const totalPages = Math.max(1, Math.ceil(totalProductCount / pageSize))
    const paginatedProducts = products
    const normalizedSearchQuery = searchQuery.trim().toLowerCase()
    const canAddToCollection = !!user
    const isDevMode = import.meta.env.VITE_DEV_MODE === 'true'

    const handleOpenAddForTargets = (productTargets: string[], defaults?: { name?: string; description?: string; isPublic?: boolean }) => {
        const sanitizedTargets = productTargets
            .map((target) => String(target).trim())
            .filter(Boolean)

        if (sanitizedTargets.length === 0) {
            return
        }

        const matchedProducts = sanitizedTargets
            .map((target) => products.find((product) => product.slug === target || product.id === target))
            .filter((product): product is Product => !!product)

        const resolvedDefaults = matchedProducts.length > 0
            ? buildAddToCollectionDefaultsForProducts(matchedProducts, collections, {
                name: defaults?.name,
                description: defaults?.description,
                isPublic: defaults?.isPublic,
            })
            : {
                name: defaults?.name,
                description: defaults?.description,
                isPublic: defaults?.isPublic,
                entries: sanitizedTargets.map((target, index) => ({ kind: 'product' as const, targetSlug: target, order: index })),
                preselectedCollectionKeys: [],
            }

        if (isDevMode) {
            console.debug('[ProductListPage] Open add-to-collection (product plus)', {
                productTargets: sanitizedTargets,
                matchedProductCount: matchedProducts.length,
                entryCount: resolvedDefaults.entries.length,
                preselectedCollectionKeys: resolvedDefaults.preselectedCollectionKeys,
                entriesPreview: resolvedDefaults.entries.map((entry) => ({ targetSlug: entry.targetSlug, targetId: entry.targetId })),
            })
        }

        onOpenAddToCollection(resolvedDefaults)
    }

    const matchingCollections = useMemo(() => {
        if (!normalizedSearchQuery) {
            return []
        }

        const currentUserId = userAccount?.id || user?.id
        const currentUsername = user?.username

        return (collections || []).filter((collection) => {
            const isOwner = !!currentUserId && collection.userId === currentUserId
            const isEditorById = !!currentUserId && (collection.editorIds || []).includes(currentUserId)
            const isEditorByUsername = !!currentUsername && (collection.editorUsernames || []).includes(currentUsername)
            const canAccess = collection.isPublic || isOwner || isEditorById || isEditorByUsername

            if (!canAccess) {
                return false
            }

            const searchableText = [
                collection.name,
                collection.description,
                collection.username,
            ]
                .filter(Boolean)
                .join(' ')
                .toLowerCase()

            return searchableText.includes(normalizedSearchQuery)
        })
    }, [collections, normalizedSearchQuery, userAccount?.id, user?.id, user?.username])

    const matchingBlogPosts = useMemo(() => {
        if (!normalizedSearchQuery) {
            return []
        }

        const canViewUnpublished = userAccount?.role === 'admin' || userAccount?.role === 'moderator'

        return (blogPosts || []).filter((post) => {
            if (!canViewUnpublished && !post.published) {
                return false
            }

            const searchableText = [
                post.title,
                post.excerpt,
                post.authorName,
                ...(post.tags || []),
            ]
                .filter(Boolean)
                .join(' ')
                .toLowerCase()

            return searchableText.includes(normalizedSearchQuery)
        })
    }, [blogPosts, normalizedSearchQuery, userAccount?.role])

    // Combine API-filtered tags with tags from current page of products, plus selected tags
    const allTags = useMemo(() => {
        const normalizedProducts = asProductArray(products)
        const tagCounts = new Map<string, number>()
        normalizedProducts.forEach(product => {
            if (product && product.tags) {
                product.tags.filter(Boolean).forEach(tag => {
                    tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1)
                })
            }
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
            <div className="mb-8">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <h1 className="text-3xl font-bold">Find Access Solutions</h1>
                    <div className="relative w-full sm:max-w-md">
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
                        tags={allTags}
                        sources={allProductSources}
                        selectedTags={selectedTags}
                        selectedSources={selectedSources}
                        minRating={minRating}
                        updatedSince={updatedSince}
                        sortBy={sortBy}
                        sortOrder={sortOrder}
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
                                    onClick={() => {
                                        const resolvedDefaults = buildAddToCollectionDefaultsForProducts(products, collections, {
                                            name: searchQuery ? `Search: ${searchQuery}` : 'Filtered Products',
                                            isPublic: false,
                                        })
                                        if (isDevMode) {
                                            console.debug('[ProductListPage] Open add-to-collection (summary button)', {
                                                productCount: products.length,
                                                entryCount: resolvedDefaults.entries.length,
                                                preselectedCollectionKeys: resolvedDefaults.preselectedCollectionKeys,
                                                productTargets: resolvedDefaults.entries.map((entry) => ({ targetSlug: entry.targetSlug, targetId: entry.targetId })),
                                            })
                                        }
                                        onOpenAddToCollection(resolvedDefaults)
                                    }}
                                    className="text-xs"
                                >
                                    Add to Collection
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
                                        const resolvedDefaults = buildAddToCollectionDefaultsForProducts(products, collections, {
                                            name: searchQuery ? `Search: ${searchQuery}` : 'My Collection',
                                            description: `Collection with ${products.length} products`,
                                            isPublic: true,
                                        })
                                        if (isDevMode) {
                                            console.debug('[ProductListPage] Open add-to-collection (toolbar button)', {
                                                productCount: products.length,
                                                entryCount: resolvedDefaults.entries.length,
                                                preselectedCollectionKeys: resolvedDefaults.preselectedCollectionKeys,
                                                productTargets: resolvedDefaults.entries.map((entry) => ({ targetSlug: entry.targetSlug, targetId: entry.targetId })),
                                            })
                                        }
                                        onOpenAddToCollection(resolvedDefaults)
                                    }}
                                    className="flex items-center gap-2"
                                    aria-label={searchQuery ? 'Add search results to collection' : 'Add products to collection'}
                                >
                                    <FontAwesomeIcon icon={faLayerGroup} className="w-[16px] h-[16px]" />
                                    <span className="hidden sm:inline">Add to Collection</span>
                                    <span className="sm:hidden">Add</span>
                                </Button>
                            )}
                        </div>
                    </div>

                    <h2 className="sr-only">Search Results</h2>

                    {matchingCollections.length > 0 && (
                        <section className="mb-6" aria-label="Matching collections">
                            <div className="flex items-center gap-2 mb-3">
                                <FolderOpen size={18} className="text-muted-foreground" aria-hidden="true" />
                                <h3 className="text-lg font-semibold">Collections ({matchingCollections.length})</h3>
                            </div>
                            <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
                                {matchingCollections.map((collection) => {
                                    const productCount = (collection.entries || []).filter((entry) => entry.kind === 'product').length
                                    const destination = `/collections/${collection.slug || collection.id}`
                                    return (
                                        <Card
                                            key={collection.id}
                                            className="cursor-pointer hover:shadow-md transition-shadow"
                                            onClick={() => navigate(destination)}
                                            role="link"
                                            tabIndex={0}
                                            onKeyDown={(event) => {
                                                if (event.key === 'Enter' || event.key === ' ') {
                                                    event.preventDefault()
                                                    navigate(destination)
                                                }
                                            }}
                                            aria-label={`View collection ${collection.name}`}
                                        >
                                            <CardContent className="space-y-2 pt-5">
                                                <div className="flex items-start justify-between gap-3">
                                                    <div className="space-y-1 min-w-0">
                                                        <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                                                            <FolderOpen size={12} aria-hidden="true" />
                                                            Collection
                                                        </p>
                                                        <h4 className="text-base font-semibold line-clamp-2">{collection.name}</h4>
                                                    </div>
                                                    {canAddToCollection && (collection.id || collection.slug) && (
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="sm"
                                                            className="h-7 w-7 p-0"
                                                            onClick={(event) => {
                                                                event.stopPropagation()
                                                                onOpenAddToCollection(buildAddToCollectionDefaultsForCollection(collection))
                                                            }}
                                                            aria-label={`Add ${collection.name} to a collection`}
                                                        >
                                                            <Plus size={14} weight="bold" />
                                                        </Button>
                                                    )}
                                                </div>
                                                {collection.description && (
                                                    <p className="text-sm text-muted-foreground line-clamp-2">{collection.description}</p>
                                                )}
                                                <p className="text-xs text-muted-foreground">
                                                    By @{collection.username} • {productCount} {productCount === 1 ? 'product' : 'products'}
                                                </p>
                                            </CardContent>
                                        </Card>
                                    )
                                })}
                            </div>
                        </section>
                    )}

                    {matchingBlogPosts.length > 0 && (
                        <section className="mb-6" aria-label="Matching blog posts">
                            <div className="flex items-center gap-2 mb-3">
                                <NotePencil size={18} className="text-muted-foreground" aria-hidden="true" />
                                <h3 className="text-lg font-semibold">Blog Posts ({matchingBlogPosts.length})</h3>
                            </div>
                            <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
                                {matchingBlogPosts.map((post) => {
                                    const destination = `/blog/${post.slug}`
                                    const dateLabel = new Date(post.publishDate || post.createdAt).toLocaleDateString()
                                    return (
                                        <Card
                                            key={post.id}
                                            className="cursor-pointer hover:shadow-md transition-shadow"
                                            onClick={() => navigate(destination)}
                                            role="link"
                                            tabIndex={0}
                                            onKeyDown={(event) => {
                                                if (event.key === 'Enter' || event.key === ' ') {
                                                    event.preventDefault()
                                                    navigate(destination)
                                                }
                                            }}
                                            aria-label={`View blog post ${post.title}`}
                                        >
                                            <CardContent className="space-y-2 pt-5">
                                                <h4 className="text-base font-semibold">{post.title}</h4>
                                                {post.excerpt && (
                                                    <p className="text-sm text-muted-foreground line-clamp-2">{post.excerpt}</p>
                                                )}
                                                <p className="text-xs text-muted-foreground">
                                                    By {post.authorName} • {dateLabel}
                                                </p>
                                            </CardContent>
                                        </Card>
                                    )
                                })}
                            </div>
                        </section>
                    )}

                    {isSearching && products.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-24">
                            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4" />
                            <p className="text-muted-foreground">Loading results...</p>
                        </div>
                    ) : !isSearching && products.length === 0 ? (
                        <div className="text-center py-12">
                            <p className="text-lg text-muted-foreground">
                                No products found. Try adjusting your filters.
                            </p>
                            {((searchQuery.trim().length > 0) || selectedTags.length > 0 || selectedSources.length > 0 || minRating > 0 || updatedSince !== null) && (
                                <Button variant="outline" onClick={onClearFilters} className="mt-4">
                                    Clear all filters
                                </Button>
                            )}
                        </div>
                    ) : columnCount === 1 ? (
                        <div className="border border-border rounded-md overflow-hidden bg-card opacity-90" aria-busy={isSearching}>
                            {paginatedProducts.map((product, index) => (
                                <ProductListItem
                                    key={getProductRenderKey(product, index)}
                                    product={product}
                                    ratings={ratings}
                                    collections={collections}
                                    selectedTags={selectedTags}
                                    href={`/product/${product.slug ?? product.id}`}
                                    onNavigate={() => navigate(`/product/${product.slug ?? product.id}`)}
                                    onTagClick={onTagToggle}
                                    user={user}
                                    onRate={onRate}
                                    showBannedBadge={canViewBanned}
                                    canModerate={canModerate}
                                    onToggleBan={() => onToggleBan(product)}
                                    onDelete={onDeleteProduct}
                                    onOpenAddToCollection={canAddToCollection ? handleOpenAddForTargets : undefined}
                                />
                            ))}
                        </div>
                    ) : (
                        <div className="grid gap-6 grid-cols-1 md:grid-cols-2 xl:grid-cols-3 opacity-90" aria-busy={isSearching}>
                            {paginatedProducts.map((product, index) => (
                                <ProductCard
                                    key={getProductRenderKey(product, index)}
                                    product={product}
                                    ratings={ratings}
                                    collections={collections}
                                    selectedTags={selectedTags}
                                    href={`/product/${product.slug ?? product.id}`}
                                    onNavigate={() => navigate(`/product/${product.slug ?? product.id}`)}
                                    onTagClick={onTagToggle}
                                    onDelete={onDeleteProduct}
                                    user={user}
                                    onRate={onRate}
                                    userAccount={userAccount}
                                    showBannedBadge={canViewBanned}
                                    canModerate={canModerate}
                                    onToggleBan={() => onToggleBan(product)}
                                    onOpenAddToCollection={canAddToCollection ? handleOpenAddForTargets : undefined}
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