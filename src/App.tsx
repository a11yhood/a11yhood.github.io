/**
 * Main application component for a11yhood.
 * 
 * Manages global app state (products, ratings, discussions, users) and routing.
 * Provides AuthContext for authentication across all child components.
 * Console logs trace module loading for debugging initialization issues.
 */
console.log('📦 [App.tsx] Loading imports...')

import { useEffect, useLayoutEffect, useState, useMemo, useRef } from 'react'
import { Routes, Route, Navigate, useNavigate, useParams, useLocation, useSearchParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { BlogPostDraftPage } from '@/components/BlogPostDraftPage'
import { CreateCollectionDialog } from '@/components/CreateCollectionDialog'
import { AddToCollectionDialog } from '@/components/AddToCollectionDialog'
import { EditCollectionDialog } from '@/components/EditCollectionDialog'
import { AboutPage } from '@/components/AboutPage'
import { UserSignup } from '@/components/UserSignup'
import { HomePage } from '@/components/HomePage'
import { SearchPage } from '@/components/SearchPage'
import { AddToCollectionTargets, Product, ProductUpdate, Rating, Discussion, UserData, UserAccount, BlogPost, Collection, CollectionCreateInput, CollectionEntry } from '@/lib/types'
import { APIService, setAuthTokenGetter } from '@/lib/api'
import { logger, setRuntimeLogLevel } from '@/lib/logger'
import { createCollectionEntriesFromProductIds, getCollectionEntries, getCollectionProductEntries } from '@/lib/collectionUtils'
import { serializeCollectionEntryForUpdate } from '@/lib/collectionEntrySerialization'
import { RavelryOAuthManager } from '@/lib/scrapers/ravelry-oauth'
// API adapter disabled - using real backend API now
// import '@/lib/api-adapter'
import { useAuth } from '@/contexts/AuthContext'
import { useNotifications } from '@/contexts/NotificationContext'
import { AppHeader } from '@/components/AppHeader'
import { AppFooter } from '@/components/AppFooter'
import { DevRoleSwitcher } from '@/components/DevRoleSwitcher'
import { PublicProfile } from '@/components/PublicProfile'
import { BlogPage } from '@/pages/BlogPage'
import { AdminLogsPage } from '@/pages/AdminLogsPage'
import { BlogPostPage } from '@/pages/BlogPostPage'
import { AdminPage } from '@/pages/AdminPage'
import { AdminUsersPage } from '@/pages/AdminUsersPage'
import { ProfilePage } from '@/pages/ProfilePage'
import { CollectionsPage } from '@/pages/CollectionsPage'
import { CollectionDetailPage } from '@/pages/CollectionDetailPage'
import { asProductArray } from '@/pages/ProductListPage'
import { routeNeedsFullProductList } from '@/lib/routeUtils'
import { ProductDetailPageWrapper } from '@/pages/ProductDetailPage'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { AlertBanner } from '@/components/AlertBanner'
// API adapter disabled - using real backend API now
// import '@/lib/api-adapter'

console.log('✓ [App.tsx] All imports loaded')

export type ApiErrorLike = {
  status?: number
  message?: string
  data?: {
    detail?: string
    type?: string
    debug_info?: unknown
  }
}

const POST_AUTH_REDIRECT_KEY = 'a11yhood:post-auth-redirect'

const routeNeedsCollections = (pathname: string) => (
  pathname === '/products' ||
  pathname.startsWith('/product/') ||
  pathname.startsWith('/collections')
)

const mergeCollections = (...groups: Collection[][]): Collection[] => {
  const merged: Collection[] = []
  const seenKeys = new Set<string>()

  groups.forEach((group) => {
    group.forEach((collection) => {
      const key = collection.slug || collection.id
      if (!key || seenKeys.has(key)) return
      seenKeys.add(key)
      merged.push(collection)
    })
  })

  return merged
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
  const location = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()
  const [user, setUser] = useState<UserData | null>(null)
  const [userAccount, setUserAccount] = useState<UserAccount | null>(null)
  const [blogPosts, setBlogPosts] = useState<BlogPost[]>([])
  const [blogPostsLoading, setBlogPostsLoading] = useState(true)
  const [includeBanned, setIncludeBanned] = useState(false)
  const [hasAutoEnabledBanned, setHasAutoEnabledBanned] = useState(false)

  // Derive admin/moderator status from userAccount role
  const isAdmin = userAccount?.role === 'admin'
  const isModerator = userAccount?.role === 'moderator' || userAccount?.role === 'admin'
  const [collections, setCollections] = useState<Collection[]>([])
  const [collectionsLoaded, setCollectionsLoaded] = useState(false)
  const [showCreateCollectionDialog, setShowCreateCollectionDialog] = useState(false)
  const [showAddSearchResultsDialog, setShowAddSearchResultsDialog] = useState(false)
  const [showEditCollectionDialog, setShowEditCollectionDialog] = useState(false)
  const [editingCollection, setEditingCollection] = useState<Collection | null>(null)
  const [initialCollectionEntries, setInitialCollectionEntries] = useState<CollectionEntry[]>([])
  const [initialPreselectedCollectionKeys, setInitialPreselectedCollectionKeys] = useState<string[]>([])
  const [initialCollectionName, setInitialCollectionName] = useState<string>('')
  const [initialCollectionDescription, setInitialCollectionDescription] = useState<string>('')
  const [initialCollectionIsPublic, setInitialCollectionIsPublic] = useState<boolean>(true)
  const [showSignup, setShowSignup] = useState(false)
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0)
  const [pageError, setPageError] = useState<string | null>(null)
  const errorSummaryRef = useRef<HTMLDivElement>(null)
  const oauthProcessedRef = useRef(false)
  const [ravelryAuthTimestamp, setRavelryAuthTimestamp] = useState(0)
  const isTestEnv = import.meta.env.MODE === 'test'
  const devMode = import.meta.env.VITE_DEV_MODE === 'true'
  const [adminVerboseLoggingEnabled, setAdminVerboseLoggingEnabled] = useState(true)

  useEffect(() => {
    const saved = localStorage.getItem('admin-verbose-logging-enabled')
    if (saved === null) return
    setAdminVerboseLoggingEnabled(saved === 'true')
  }, [])

  useEffect(() => {
    localStorage.setItem('admin-verbose-logging-enabled', String(adminVerboseLoggingEnabled))
  }, [adminVerboseLoggingEnabled])

  useEffect(() => {
    // In production, keep non-admin logs at info and raise admin sessions to debug.
    if (import.meta.env.PROD) {
      setRuntimeLogLevel(isAdmin && adminVerboseLoggingEnabled ? 'debug' : 'info')
      return
    }

    // In non-production, respect the configured env log level.
    setRuntimeLogLevel(null)
  }, [isAdmin, adminVerboseLoggingEnabled])

  // Note: the error summary uses role="alert" which announces to screen readers
  // automatically. We intentionally do NOT programmatically focus the error div
  // because doing so steals focus from the skip link and disrupts keyboard navigation.

  useEffect(() => {
    setPageError(null)
  }, [location.pathname])

  const showPageError = (message: string) => {
    setPageError(message)
  }

  // Tracks optimistically-applied tags per product ID across sequential async handleAddTag calls
  const pendingProductTagsRef = useRef<Map<string, string[]>>(new Map())

  // Helper to normalize URL param arrays: filter empty strings, deduplicate, and sort so
  // order differences between URL and state never cause spurious state updates.
  const normalizeParamArray = (params: string[]): string[] => {
    return Array.from(new Set(params.filter(Boolean))).sort()
  }

  // Helper for order-insensitive array equality (sorts copies before comparing)
  const arraysEqual = (a: string[], b: string[]): boolean => {
    if (a.length !== b.length) return false
    const sortedA = [...a].sort()
    const sortedB = [...b].sort()
    return sortedA.every((v, i) => v === sortedB[i])
  }

  // Helper to parse the combined "sort" URL param (e.g. "rating-desc") into sortBy / sortOrder.
  // Returns null if the value is absent or malformed so callers can fall back to defaults.
  const parseSortParam = (param: string | null): { sortBy: 'rating' | 'updated_at' | 'created_at'; sortOrder: 'asc' | 'desc' } | null => {
    if (!param) return null
    const idx = param.lastIndexOf('-')
    if (idx === -1) return null
    const by = param.slice(0, idx)
    const order = param.slice(idx + 1)
    if ((by === 'rating' || by === 'updated_at' || by === 'created_at') && (order === 'asc' || order === 'desc')) {
      return { sortBy: by, sortOrder: order }
    }
    return null
  }

  const parseMinRatingParam = (param: string | null): number => {
    const parsed = Number(param)
    return Number.isInteger(parsed) && parsed >= 1 && parsed <= 5 ? parsed : 0
  }

  const parseUpdatedSinceParam = (param: string | null): string | null => {
    if (!param) return null
    return /^\d{4}-\d{2}-\d{2}$/.test(param) ? param : null
  }

  // Filter states - initialize from URL params
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '')
  const [searchInputValue, setSearchInputValue] = useState(searchParams.get('q') || '')
  const [selectedTypes, setSelectedTypes] = useState<string[]>(() => normalizeParamArray(searchParams.getAll('type')))
  const [selectedSources, setSelectedSources] = useState<string[]>(() => normalizeParamArray(searchParams.getAll('source')))
  const [selectedTags, setSelectedTags] = useState<string[]>(() => normalizeParamArray(searchParams.getAll('tag')))
  const [minRating, setMinRating] = useState(() => parseMinRatingParam(searchParams.get('minRating')))
  const [updatedSince, setUpdatedSince] = useState<string | null>(() => parseUpdatedSinceParam(searchParams.get('updatedSince'))) // YYYY-MM-DD string
  const [committedUpdatedSince, setCommittedUpdatedSince] = useState<string | null>(() => parseUpdatedSinceParam(searchParams.get('updatedSince')))
  const defaultSort = { sortBy: 'created_at' as const, sortOrder: 'desc' as const }
  const initialSort = parseSortParam(searchParams.get('sort'))
  const [sortBy, setSortBy] = useState<'rating' | 'updated_at' | 'created_at'>(() => {
    return initialSort?.sortBy ?? defaultSort.sortBy
  })
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>(() => {
    return initialSort?.sortOrder ?? defaultSort.sortOrder
  })
  const [sortHasChanged, setSortHasChanged] = useState(() => {
    if (!initialSort) return false
    return (
      initialSort.sortBy !== defaultSort.sortBy ||
      initialSort.sortOrder !== defaultSort.sortOrder
    )
  })
  const [isSearching, setIsSearching] = useState(false)

  // Track the latest search request to ignore stale responses
  const latestSearchIdRef = useRef(0)
  const userAccountFetchRef = useRef<string | null>(null) // Track which user we've fetched account for

  const handleTypeToggle = (type: string) => {
    setSelectedTypes((currentTypes) => {
      const nextTypes = currentTypes.includes(type)
        ? currentTypes.filter((t) => t !== type)
        : [...currentTypes, type]
      const newParams = new URLSearchParams(searchParams)
      newParams.delete('type')
      nextTypes.forEach((t) => newParams.append('type', t))
      setSearchParams(newParams, { replace: false })
      return nextTypes
    })
  }

  const handleSourceToggle = (source: string) => {
    setSelectedSources((currentSources) => {
      const nextSources = currentSources.includes(source)
        ? currentSources.filter((s) => s !== source)
        : [...currentSources, source]
      const newParams = new URLSearchParams(searchParams)
      newParams.delete('source')
      nextSources.forEach((s) => newParams.append('source', s))
      setSearchParams(newParams, { replace: false })
      return nextSources
    })
  }

  const handleTagToggle = (tag: string) => {
    setSelectedTags((currentTags) => {
      const nextTags = currentTags.includes(tag)
        ? currentTags.filter((t) => t !== tag)
        : [...currentTags, tag]
      const newParams = new URLSearchParams(searchParams)
      newParams.delete('tag')
      nextTags.forEach((t) => newParams.append('tag', t))
      setSearchParams(newParams, { replace: false })
      return nextTags
    })
  }

  const handleClearFilters = () => {
    setSelectedTypes([])
    setSelectedTags([])
    setSelectedSources([])
    setMinRating(0)
    setUpdatedSince(null)
    setCommittedUpdatedSince(null)
    setSearchQuery('')
    setSearchInputValue('')
    // Clear search and filter params from URL
    const newParams = new URLSearchParams(searchParams)
    newParams.delete('q')
    newParams.delete('tag')
    newParams.delete('type')
    newParams.delete('source')
    newParams.delete('minRating')
    newParams.delete('updatedSince')
    setSearchParams(newParams, { replace: false })
  }

  const handleMinRatingChange = (rating: number) => {
    setMinRating(rating)
    const newParams = new URLSearchParams(searchParams)
    if (rating > 0) {
      newParams.set('minRating', String(rating))
    } else {
      newParams.delete('minRating')
    }
    setSearchParams(newParams, { replace: false })
  }

  const handleUpdatedSinceChange = (date: string | null) => {
    setUpdatedSince(date)
    const newParams = new URLSearchParams(searchParams)
    if (date) {
      newParams.set('updatedSince', date)
    } else {
      newParams.delete('updatedSince')
    }
    setSearchParams(newParams, { replace: false })
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
    // Persist sort choice in URL so it can be shared / restored on navigation
    const newParams = new URLSearchParams(searchParams)
    newParams.set('sort', value)
    setSearchParams(newParams, { replace: false })
  }

  // Keep default sorting route-aware unless the user explicitly picks a sort.
  useEffect(() => {
    if (sortHasChanged) {
      return
    }

    const defaultSortByForRoute = 'created_at' as const

    if (sortBy !== defaultSortByForRoute || sortOrder !== 'desc') {
      setSortBy(defaultSortByForRoute)
      setSortOrder('desc')
    }
  }, [location.pathname, sortHasChanged, sortBy, sortOrder])

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

  const handleSearchInputKeyDown = () => {
    // No longer needed since search happens on every keystroke
  }

  // Sync searchInputValue when searchQuery is cleared externally
  useEffect(() => {
    setSearchInputValue(searchQuery)
  }, [searchQuery])

  // Sync search query from URL params when navigating to /products
  useEffect(() => {
    if (location.pathname !== '/products') return
    const urlQuery = searchParams.get('q') || ''

    // Guard primitives too — avoid enqueuing a state update when nothing changed.
    setSearchQuery(current => current === urlQuery ? current : urlQuery)
    setSearchInputValue(current => current === urlQuery ? current : urlQuery)

    // Only update filter states when the normalized URL params actually differ from current state.
    // normalizeParamArray sorts the values, so order changes in the URL don't trigger spurious updates.
    const urlTags = normalizeParamArray(searchParams.getAll('tag'))
    const urlTypes = normalizeParamArray(searchParams.getAll('type'))
    const urlSources = normalizeParamArray(searchParams.getAll('source'))
    const urlMinRating = parseMinRatingParam(searchParams.get('minRating'))
    const urlUpdatedSince = parseUpdatedSinceParam(searchParams.get('updatedSince'))

    setSelectedTags(current => {
      return arraysEqual(current, urlTags) ? current : urlTags
    })
    setSelectedTypes(current => {
      return arraysEqual(current, urlTypes) ? current : urlTypes
    })
    setSelectedSources(current => {
      return arraysEqual(current, urlSources) ? current : urlSources
    })
    setMinRating(current => current === urlMinRating ? current : urlMinRating)
    setUpdatedSince(current => current === urlUpdatedSince ? current : urlUpdatedSince)
    setCommittedUpdatedSince(current => current === urlUpdatedSince ? current : urlUpdatedSince)

    // Sync sort from URL
    const parsed = parseSortParam(searchParams.get('sort'))
    if (parsed) {
      setSortBy(current => current === parsed.sortBy ? current : parsed.sortBy)
      setSortOrder(current => current === parsed.sortOrder ? current : parsed.sortOrder)
      setSortHasChanged(true)
    } else {
      // When `sort` is missing or malformed in the URL, clear the "changed" flag
      // so state does not appear to be driven by a stale sort parameter.
      setSortHasChanged(false)
    }
  }, [searchParams, location.pathname])

  // Combine filtered tags with tags from current page of products, plus any selected tags
  // Sort by frequency in current results (most common first)
  const allTags = useMemo(() => {
    const normalizedProducts = asProductArray(products)
    // Count tag frequencies in current products
    const tagCounts = new Map<string, number>()
    normalizedProducts.forEach(product => {
      if (product && product.tags) {
        product.tags.filter(Boolean).forEach(tag => {
          tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1)
        })
      }
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

      // Only load all products on pages that actually consume the list.
      const needsFullProductList = routeNeedsFullProductList(location.pathname)

      // Only load filter metadata (tags, sources, types) on pages that use them
      // Don't load on collection detail pages (/collections/:slug)
      const needsFilterMetadata = needsFullProductList

      try {
        // Load metadata only if needed (search, admin pages)
        // Do not block initial product load on slow metadata endpoints.
        if (needsFilterMetadata) {
          void Promise.allSettled([
            APIService.getProductSources(),
            APIService.getProductTypes(),
            APIService.getPopularTags(10),
          ])
            .then((metadataResults) => {
              const loadedSources = metadataResults[0].status === 'fulfilled' ? metadataResults[0].value : []
              const loadedTypes = metadataResults[1].status === 'fulfilled' ? metadataResults[1].value : []
              const loadedTags = metadataResults[2].status === 'fulfilled' ? metadataResults[2].value : []

              setAllProductSources(loadedSources)
              setAllProductTypes(loadedTypes)
              setPopularTags(loadedTags)
            })
            .catch((error) => {
              console.warn('[App] Failed to load product metadata:', error)
            })
        } else if (location.pathname === '/') {
          // On homepage, load initial products with default parameters
          // The fetchProducts effect will handle any filter changes (including admin's includeBanned)
          setDataLoaded(true)
          setIsSearching(false)

          const homeFeaturedParams = {
            limit: 50,
            tags: ['featured'],
            // Keep false on homepage to match requirement
            includeBanned: false,
            sortBy: 'created_at' as const,
            sortOrder: 'desc' as const,
          }

          Promise.all([
            APIService.getAllProducts(homeFeaturedParams),
            APIService.getAllRatings(),
            APIService.getAllBlogPosts(false),
          ])
            .then(([products, ratings, blogPosts]) => {
              setProducts(asProductArray(products))
              setRatings(ratings)
              setBlogPosts(blogPosts)
              setBlogPostsLoading(false)
            })
            .catch(error => {
              console.warn('[App] Failed to load homepage data:', error)
              setBlogPostsLoading(false)
            })
          return
        } else if (location.pathname.startsWith('/blog')) {
          // Ensure direct navigations to /blog show a loading state and fetch posts.
          setDataLoaded(true)
          setIsSearching(false)
          setBlogPostsLoading(true)

          APIService.getAllBlogPosts(false)
            .then((posts) => {
              setBlogPosts(posts)
            })
            .catch((error) => {
              console.warn('[App] Failed to load blog posts:', error)
            })
            .finally(() => {
              setBlogPostsLoading(false)
            })
          return
        } else {
          // For other pages (detail pages), skip loading
          setDataLoaded(true)
          setIsSearching(false)
          return
        }

        if (!needsFullProductList) {
          // For product detail pages, skip product list loading - page will fetch what it needs
          setDataLoaded(true)
          setIsSearching(false)
          return
        }

        // Build initial fetch params from URL when landing on /products so we don't
        // briefly show unfiltered results before URL-driven filters are applied.
        const initialUrlQuery = location.pathname === '/products' ? (searchParams.get('q') || '') : ''
        const initialUrlTypes = location.pathname === '/products' ? normalizeParamArray(searchParams.getAll('type')) : []
        const initialUrlSources = location.pathname === '/products' ? normalizeParamArray(searchParams.getAll('source')) : []
        const initialUrlTags = location.pathname === '/products' ? normalizeParamArray(searchParams.getAll('tag')) : []

        const initialProductParams = {
          includeBanned: false,
          search: initialUrlQuery || undefined,
          limit: pageSize,
          offset: 0,
          sources: initialUrlSources.length > 0 ? initialUrlSources : undefined,
          types: initialUrlTypes.length > 0 ? initialUrlTypes : undefined,
          tags: initialUrlTags.length > 0 ? initialUrlTags : undefined,
          sortBy: 'created_at' as const,
          sortOrder: 'desc' as const,
        }

        const [countResult, productsResult] = await Promise.allSettled([
          APIService.getProductCount(initialProductParams),
          APIService.getAllProducts(initialProductParams),
        ])

        const loadedProducts = productsResult.status === 'fulfilled' ? asProductArray(productsResult.value) : []
        const totalCount = countResult.status === 'fulfilled' ? countResult.value : loadedProducts.length

        console.log('[App] Data loaded:', {
          products: loadedProducts.length,
          totalCount,
        })

        setProducts(loadedProducts)
        setTotalProductCount(totalCount)
        setCurrentPage(1)

        setDataLoaded(true)
        setIsSearching(false)

        const needsAdminSideData = location.pathname === '/admin' || location.pathname === '/admin/logs'

        // Keep /products responsive by avoiding eager discussions/blog preloads.
        // Product details fetch missing discussions on demand.
        const sideLoadPromises: Promise<unknown>[] = [APIService.getAllRatings()]
        if (needsAdminSideData) {
          sideLoadPromises.push(APIService.getAllDiscussions())
          sideLoadPromises.push(APIService.getAllBlogPosts(false))
        }

        Promise.allSettled(sideLoadPromises)
          .then((results) => {
            const ratingsResult = results[0]
            if (ratingsResult?.status === 'fulfilled') {
              setRatings(ratingsResult.value as Rating[])
            }

            if (needsAdminSideData) {
              const discussionsResult = results[1]
              const blogPostsResult = results[2]

              if (discussionsResult?.status === 'fulfilled') {
                setDiscussions(discussionsResult.value as Discussion[])
              }

              if (blogPostsResult?.status === 'fulfilled') {
                setBlogPosts(blogPostsResult.value as BlogPost[])
              }
            }

            if (needsAdminSideData) {
              setBlogPostsLoading(false)
            }
          })
          .catch(error => {
            console.warn('[App] Failed to load side data:', error)
            if (needsAdminSideData) {
              setBlogPostsLoading(false)
            }
          })
      } catch (error) {
        console.error('Failed to load data:', error)
        setDataLoaded(true)
        setIsSearching(false)
      }
    }

    loadData()
    // Intentionally omit searchParams: search/query updates on /products are handled
    // by the fetch effect below; including it causes bootstrap to re-run on every keystroke.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname, pageSize])

  // Use AuthContext (supports both dev mode and production)
  const { user: authUser, loading: authLoading, getAccessToken, signIn, signOut } = useAuth()
  const { notify } = useNotifications()

  // Register the API auth token getter before normal effects to avoid
  // render-time side effects while still minimizing child effect races.
  useLayoutEffect(() => {
    setAuthTokenGetter(getAccessToken)
  }, [getAccessToken])

  // Refetch products when filters, search, or page changes (consolidated effect to avoid duplicates)
  useEffect(() => {
    console.log('[App.fetchEffect] Triggered. dataLoaded:', dataLoaded, 'currentPage:', currentPage, 'sortBy:', sortBy, 'sortOrder:', sortOrder, 'location:', location.pathname)
    if (!dataLoaded) {
      console.log('[App.fetchEffect] Skipping - data not loaded yet')
      return // Wait for initial load
    }

    // Only run on home/products pages
    if (location.pathname !== '/' && location.pathname !== '/products') {
      console.log('[App.fetchEffect] Skipping - not on home or products page')
      return
    }

    // Check if this is the initial load with no filters (skip to avoid duplicate from initial load)
    const defaultSortByForRoute = 'created_at' as const
    const isInitialLoad = currentPage === 1 && searchQuery === '' && selectedSources.length === 0 &&
      selectedTypes.length === 0 && selectedTags.length === 0 &&
      minRating === 0 && committedUpdatedSince === null &&
      sortBy === defaultSortByForRoute && sortOrder === 'desc' && !sortHasChanged

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

        const requiredHomeTags = location.pathname === '/' ? ['featured'] : undefined

        const params = {
          includeBanned,
          search: searchQuery || undefined,
          limit: pageSize,
          offset,
          sources: effectiveSources.length > 0 ? effectiveSources : undefined,
          types: selectedTypes.length > 0 ? selectedTypes : undefined,
          tags: selectedTags.length > 0 ? selectedTags : requiredHomeTags,
          minRating: minRating || undefined,
          updatedSince: updatedSinceISO,
          sortBy,
          sortOrder,
        }

        console.log('[App.fetchEffect] Fetching products with params:', params)
        setIsSearching(true)

        const requestParams = { ...params, signal: abortController.signal }

        const [countResult, productsResult, tagsResult] = await Promise.allSettled([
          APIService.getProductCount(requestParams),
          APIService.getAllProducts(requestParams),
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
          const fetchedProducts = asProductArray(productsResult.value)
          // Handle fallback for minRating filter
          if ((minRating || 0) > 0 && fetchedProducts.length === 0) {
            const fallbackParams = { ...params, minRating: undefined }
            try {
              const withoutRating = await APIService.getAllProducts(fallbackParams)
              const clientFiltered = asProductArray(withoutRating).filter(p => {
                const productRatings = ratings.filter(r => r.productId === p.id)
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
              setProducts(fetchedProducts)
            }
          } else {
            setProducts(fetchedProducts)
          }
        } else {
          console.error('Failed to load products:', productsResult.reason)
          setProducts([])
        }

        if (tagsResult.status === 'fulfilled') {
          setFilteredTags(tagsResult.value)
        }

        const fallbackCount = productsResult.status === 'fulfilled' ? asProductArray(productsResult.value).length : 0
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

    const debounceTimer = setTimeout(fetchProducts, 400)

    return () => {
      clearTimeout(debounceTimer)
      abortController.abort()
    }
  }, [searchQuery, includeBanned, selectedTypes, selectedSources, selectedTags, minRating, committedUpdatedSince, currentPage, dataLoaded, pageSize, location.pathname, sortBy, sortOrder, allProductSources, ratings, sortHasChanged])

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

        // Fetch account from backend using auth token (definitive source of truth).
        // getCurrentUser() returns null when /users/me → 404 (new user); throws for all
        // other errors so they are handled correctly below.
        let account: typeof userAccount | null = null
        try {
          account = await APIService.getCurrentUser()
          if (account !== null) {
            // Existing account found — validate and store it.
            if (!account.id) throw new Error('Account response from /users/me is missing id')
            userAccountFetchRef.current = authUser.id

            const userData = {
              id: account.id,
              username: account.username || authUser.id,
              avatarUrl: account.avatarUrl,
            }

            setUser(userData)
            setUserAccount(account)
            console.log('🔐 [App] User account loaded from backend:', { username: account.username, role: account.role })
            console.log('✅ [App] User role:', account.role, '| isAdmin:', account.role === 'admin')

            if (isTestEnv) {
              setShowSignup(false)
            }
            return
          }
          // account is null → /users/me returned 404; fall through to create account
          console.log('📨 [App] User account not found, creating...')
        } catch (err: unknown) {
          const status = (err as ApiErrorLike)?.status ?? 0
          if (status) {
            const message = (err as ApiErrorLike)?.message
            console.error('Failed to fetch user account from /users/me:', {
              status,
              message,
            })
            return
          } else {
            throw err
          }
        }

        // Account doesn't exist yet — create it using minimal info from auth
        // Priority: preferred_username (from GitHub via Supabase) > user_name > email > default
        let createUsername = 'user'

        // Check Supabase user_metadata for GitHub username fields
        const preferredUsername = authUser.user_metadata?.preferred_username
        const userName = authUser.user_metadata?.user_name
        const metadataUsername = authUser.user_metadata?.username

        if (preferredUsername && typeof preferredUsername === 'string') {
          createUsername = preferredUsername
        } else if (userName && typeof userName === 'string') {
          createUsername = userName
        } else if (metadataUsername && typeof metadataUsername === 'string') {
          createUsername = metadataUsername
        } else if (authUser.email && typeof authUser.email === 'string' && authUser.email.includes('@')) {
          createUsername = authUser.email.split('@')[0]
        } else if (authUser.email) {
          createUsername = authUser.email
        }

        // Ensure username is safe by removing special characters and limiting length
        createUsername = createUsername.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 20)

        console.log('📨 [App] Creating user account...', { username: createUsername, email: authUser.email, source: preferredUsername ? 'preferred_username' : userName ? 'user_name' : 'email/default' })

        // Try to create account; if username conflict, retry with random suffix
        // Re-use account variable declared earlier in the scope
        let usernameToCreate = createUsername
        let retries = 0
        const maxRetries = 3

        while (retries < maxRetries) {
          try {
            account = await APIService.createOrUpdateUserAccount(
              authUser.id,
              usernameToCreate,
              undefined, // avatar from auth not guaranteed
              authUser.email
            )
            // Success! Break out of retry loop
            break
          } catch (error: unknown) {
            // Check if this is a uniqueness constraint error (409 Conflict or contains "unique" in message)
            const apiError = error as ApiErrorLike
            const errorMessage = apiError.message?.toLowerCase()
            const isUniqueError = apiError.status === 409 || Boolean(errorMessage && errorMessage.includes('unique'))

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
        if (!account.id) {
          throw new Error('Created account response is missing id')
        }

        userAccountFetchRef.current = authUser.id

        const userData = {
          id: account.id,
          username: account.username || authUser.id,
          avatarUrl: account.avatarUrl,
        }

        setUser(userData)
        setUserAccount(account)
        console.log('🔐 [App] New user account created:', { username: account.username, role: account.role })

        if (!isTestEnv) {
          setShowSignup(true)
        } else {
          setShowSignup(false)
        }
      } catch (error) {
        console.error('Failed to load user account:', error)
        // Show user-friendly error message
        const errorMessage = error instanceof Error ? error.message : 'Failed to create account'
        showPageError(`Account setup failed: ${errorMessage}`)
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
      console.log('[App OAuth] → oauthProcessed flag:', oauthProcessedRef.current)
      console.log('[App OAuth] → authUser:', authUser ? `${authUser.id}` : 'null')
      console.log('[App OAuth] → authLoading:', authLoading)

      // If this is a fresh callback, reset the processed flag
      if (isCallback && oauthProcessedRef.current) {
        console.log('[App OAuth] → Fresh callback detected, resetting oauthProcessed flag')
        oauthProcessedRef.current = false
        return // Return and let next render process it
      }

      if (oauthProcessedRef.current && !isCallback) {
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
          showPageError('Please sign in with GitHub first, then authorize Ravelry.')
          oauthProcessedRef.current = true
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
        
        showPageError(`OAuth Error: ${errorParam}${errorDesc ? ` - ${errorDesc}` : ''}`)
        window.history.replaceState({}, document.title, '/admin')
        oauthProcessedRef.current = true
        return
      }

      if (code && window.location.pathname === '/admin') {
        oauthProcessedRef.current = true

        console.log('[App OAuth] ========== OAUTH CALLBACK DETECTED ==========')
        console.log('[App OAuth] → Authorization code received:', code.substring(0, 10) + '...')
        console.log('[App OAuth] → State received:', state ? state.substring(0, 16) + '...' : 'MISSING')
        console.log('[App OAuth] → Current URL:', window.location.href)

        localStorage.setItem('ravelry-last-auth-code', code)
        localStorage.setItem('ravelry-oauth-flow-log', JSON.stringify({
          step: 'callback-received',
          timestamp: Date.now(),
          codeLength: code.length,
          hasState: !!state,
          url: window.location.href,
        }))

        window.history.replaceState({}, document.title, '/admin')
        console.log('[App OAuth] → URL cleaned up immediately to prevent reload loop')

        try {
          const savedState = localStorage.getItem('ravelry-oauth-config-state')
          console.log('[App OAuth] → Saved state:', savedState ? savedState.substring(0, 16) + '...' : 'MISSING')

          if (!state || !savedState || state !== savedState) {
            console.error('[App OAuth] ✗ State validation failed!')
            console.error('[App OAuth]   - Received state:', state || 'MISSING')
            console.error('[App OAuth]   - Expected state:', savedState || 'MISSING')
            
            showPageError('OAuth state validation failed. Please try again.')
            localStorage.removeItem('ravelry-oauth-config-state')
            return
          }

          console.log('[App OAuth] ✓ State validation successful')
          localStorage.removeItem('ravelry-oauth-config-state')

          const config = await RavelryOAuthManager.getConfig()

          if (!config?.clientId || !config?.clientSecret) {
            console.error('[App OAuth] ✗ No OAuth credentials found in config')
            localStorage.setItem('ravelry-oauth-flow-log', JSON.stringify({
              step: 'missing-credentials-before-exchange',
              timestamp: Date.now(),
              hasClientId: !!config?.clientId,
              hasClientSecret: !!config?.clientSecret,
            }))
            showPageError('OAuth credentials not configured. Please set up your Client ID and Secret first.')
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
            notify.success('Successfully authorized with Ravelry!')
            setRavelryAuthTimestamp(Date.now())
          } else {
            console.error('[App OAuth] ✗ Token exchange failed')
            showPageError('Failed to complete Ravelry authorization. Please try again.')
          }
        } catch (error) {
          console.error('[App OAuth] ✗ OAuth callback error:', error)
          showPageError('Error during Ravelry authorization')
        } finally {
          console.log('[App OAuth] ========== OAUTH CALLBACK COMPLETE ==========')
        }
      } else {
        console.log('[App OAuth] → No callback detected on this page load')
      }
    }

    void handleRavelryOAuth()
  }, [authLoading, authUser, notify])

  useEffect(() => {
    if (authLoading || !routeNeedsCollections(location.pathname)) return

    let cancelled = false

    const loadCollections = async () => {
      setCollectionsLoaded(false)

      const [userCollectionsResult, publicCollectionsResult] = await Promise.allSettled([
        authUser ? APIService.getUserCollections() : Promise.resolve([]),
        APIService.getPublicCollections('updated_at'),
      ])

      if (cancelled) return

      if (userCollectionsResult.status === 'rejected') {
        console.warn('[App] Failed to load user collections:', userCollectionsResult.reason)
      }

      if (publicCollectionsResult.status === 'rejected') {
        console.warn('[App] Failed to load public collections:', publicCollectionsResult.reason)
      }

      const userCollections = userCollectionsResult.status === 'fulfilled' ? userCollectionsResult.value : []
      const publicCollections = publicCollectionsResult.status === 'fulfilled' ? publicCollectionsResult.value : []

      setCollections(mergeCollections(userCollections, publicCollections))
      setCollectionsLoaded(true)
    }

    void loadCollections()

    return () => {
      cancelled = true
    }
  }, [authLoading, authUser, location.pathname])

  useEffect(() => {
    const loadPendingRequests = async () => {
      // Only load pending requests when on admin pages
      const isAdminPage = location.pathname.startsWith('/admin')
      if ((isAdmin || isModerator) && isAdminPage) {
        try {
          const requests = await APIService.getAllPendingRequests()
          const validRequests = requests.filter(request => {
            if (request.type === 'product-ownership' && request.productId) {
              const productExists = products.some(p => p.id === request.productId)
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
      if (rating === 0) {
        await APIService.deleteRating(productSlug, user.id)

        setRatings((currentRatings) => (currentRatings || []).filter(
          (currentRating) => !(currentRating.productId === productSlug && currentRating.userId === user.id)
        ))

        notify.success('Rating removed')
        return
      }

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
          timestamp: new Date().toISOString(),
        })
        APIService.logUserActivity({
          userId: user.id,
          type: 'rating',
          productId: savedRating.productId,
          timestamp: new Date().toISOString(),
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
      
      notify.success('Rating saved')
    } catch (error) {
      console.error('Failed to save rating:', error)
      showPageError('Failed to save rating')
    }
  }

  const handleDiscuss = async (
    productId: string,
    content: string,
    parentId?: string
  ) => {
    if (!user) return

    try {
      const newDiscussion = await APIService.createDiscussion({
        productId,
        userId: user.id,
        username: userAccount?.username || user.username,
        content,
        parentId,
      })

      setDiscussions((currentDiscussions) => [...(currentDiscussions || []), newDiscussion])

      // Stats are computed dynamically from database, no need to increment
      // APIService.incrementUserStats(user.id, 'discussionsParticipated')
      if (user?.id && newDiscussion.productId) {
        const discussionActivityMetadata = parentId ? { parentId } : undefined
        APIService.logUserActivity({
          userId: user.id,
          type: 'discussion',
          productId: newDiscussion.productId,
          timestamp: new Date().toISOString(),
          metadata: discussionActivityMetadata,
        }).catch(err => console.warn('Failed to log discussion activity:', err))
      }
      
      notify.success(parentId ? 'Reply posted' : 'Discussion started')
    } catch (error) {
      console.error('Failed to post discussion:', error)
      showPageError('Failed to post discussion')
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
        notify.success('Post updated')
      }
    } catch (error: unknown) {
      // rollback optimistic update
      setDiscussions((current) => {
        const list = current || []
        return list.map((d) => (d.id === discussionId && previous ? previous : d))
      })
      const message = (error as ApiErrorLike)?.message || 'Failed to update post'
      console.error('Failed to update discussion:', error)
      showPageError(message)
      throw error
    }
  }

  const handleDeleteDiscussion = async (discussionId: string) => {
    try {
      const deleted = await APIService.deleteDiscussion(discussionId)
      if (deleted) {
        // Keep the node for threading, mark content as deleted
        setDiscussions((current) => (current || []).map((d) => (d.id === discussionId ? { ...d, content: deleted.content } : d)))
        notify.success('Post deleted')
      }
    } catch (error) {
      console.error('Failed to delete discussion:', error)
      showPageError('Failed to delete post')
    }
  }

  const handleToggleBlockDiscussion = async (discussionId: string, block: boolean) => {
    try {
      const updated = block
        ? await APIService.blockDiscussion(discussionId)
        : await APIService.unblockDiscussion(discussionId)

      setDiscussions((current) => (current || []).map((d) => (d.id === discussionId ? { ...d, ...updated } as Discussion : d)))
      notify.success(block ? 'Post blocked' : 'Post unblocked')
    } catch (error: unknown) {
      console.error('Failed to toggle block on discussion:', error)
      const message = (error as ApiErrorLike)?.message || (block ? 'Failed to block post' : 'Failed to unblock post')
      showPageError(message)
    }
  }

  const handleAddTag = async (productIdOrSlug: string, tag: string, productObj?: Product) => {
    if (!user) {
      return
    }

    try {
      const normalizedTag = tag.trim().toLowerCase()

      // Use provided product object if available, otherwise look it up
      const product = productObj || products?.find(p => p.slug === productIdOrSlug || p.id === productIdOrSlug)

      if (!product) {
        return
      }

      if (!product.id) {
        console.error('[App.handleAddTag] Product is missing UUID id; cannot update via PATCH endpoint')
        showPageError('Failed to add tag: product identifier not found')
        return
      }

      // Read the latest known tags from the pending ref rather than product.tags (which may be a
      // stale closure value).  TagManager now awaits each onAddTag call sequentially, so each
      // successive call sees the tag list built by the previous one rather than all reading the
      // same original snapshot.
      const latestTags = pendingProductTagsRef.current.get(product.id) ?? product.tags

      if (latestTags.some((t) => t.toLowerCase() === normalizedTag)) {
        notify.info('Tag already exists')
        return
      }

      const nextTags = [...latestTags, normalizedTag]
      // Optimistically record the new tag list so the next sequential call sees it.
      // Note: this ref-based strategy is correct for the sequential (one-at-a-time) flow
      // produced by TagManager's for…of loop.  Genuinely concurrent calls from separate
      // components could still race; a queue/lock would be needed to handle that case.
      pendingProductTagsRef.current.set(product.id, nextTags)

      try {
        const updatedProduct = await APIService.updateProduct(
          product.id,
          { tags: nextTags },
          user?.id
        )

        if (updatedProduct) {
          // Sync pending state to the authoritative server response
          pendingProductTagsRef.current.set(product.id, updatedProduct.tags)
          setProducts((currentProducts) => {
            const current = currentProducts || []
            return current.map((p) => (p.slug === productIdOrSlug || p.id === productIdOrSlug) ? updatedProduct : p)
          })

          if (user?.id && product.id) {
            APIService.logUserActivity({
              userId: user.id,
              type: 'tag',
              productId: product.id,
              timestamp: new Date().toISOString(),
              metadata: { tag: normalizedTag },
            }).catch(err => console.warn('Failed to log tag activity:', err))
          }
          
          notify.success('Tag added successfully')
        } else {
          // API did not throw but also did not return an updated product; treat as failure.
          // Roll back optimistic tags so subsequent calls don't build on unpersisted state.
          pendingProductTagsRef.current.set(product.id, latestTags)
          console.error('[App.handleAddTag] updateProduct returned null; tag change was not persisted')
          showPageError('Failed to add tag')
        }
      } catch (error) {
        // Roll back the optimistic ref update so the next sequential call starts from the
        // last confirmed state rather than including the tag that failed to persist.
        pendingProductTagsRef.current.set(product.id, latestTags)
        throw error
      }
    } catch (error) {
      console.error('Failed to add tag:', error)
      showPageError('Failed to add tag')
    }
  }

  const handleLogin = (returnToPath?: string) => {
    console.log('[App] 🔐 handleLogin called')
    console.log('[App] → isTestEnv:', isTestEnv)
    console.log('[App] → signIn function:', typeof signIn)

    if (isTestEnv) {
      notify.info('Login is disabled in tests')
      return
    }

    if (import.meta.env.VITE_DEV_MODE === 'true' && authUser) {
      // In dev mode, OAuth signIn may be a no-op. Ensure login clicks still produce a
      // usable signed-in UI state and preserve return behavior for product-page actions.
      setUser((current) => {
        if (current?.id) return current
        return {
          id: authUser.id,
          username:
            (typeof authUser.user_metadata?.preferred_username === 'string' && authUser.user_metadata.preferred_username) ||
            (typeof authUser.user_metadata?.user_name === 'string' && authUser.user_metadata.user_name) ||
            (typeof authUser.user_metadata?.username === 'string' && authUser.user_metadata.username) ||
            (typeof authUser.email === 'string' ? authUser.email.split('@')[0] : authUser.id),
          avatarUrl:
            (typeof authUser.user_metadata?.avatar_url === 'string' && authUser.user_metadata.avatar_url) ||
            (typeof authUser.user_metadata?.picture === 'string' && authUser.user_metadata.picture) ||
            undefined,
        }
      })

      if (returnToPath && typeof window !== 'undefined') {
        sessionStorage.setItem(POST_AUTH_REDIRECT_KEY, returnToPath)
        window.history.replaceState({}, document.title, returnToPath)
      }

      notify.info('Dev mode sign-in enabled')
      return
    }

    if (returnToPath && typeof window !== 'undefined') {
      sessionStorage.setItem(POST_AUTH_REDIRECT_KEY, returnToPath)
    }

    console.log('[App] → Calling signIn()...')
    // Call auth context signIn which triggers GitHub OAuth
    signIn().catch((error) => {
      console.error('[App] ❌ Sign in error:', error)
      const detail = error instanceof Error ? error.message : ''
      showPageError(detail ? `Failed to sign in: ${detail}` : 'Failed to sign in. Please try again.')
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
      notify.success('Signed out successfully')
    } catch (error) {
      console.error('Logout error:', error)
      showPageError('Failed to sign out. Please try again.')
    }
  }

  const handleProfileUpdate = async () => {
    if (user) {
      const account = await APIService.getUserAccount(user.id)
      if (account) {
        setUserAccount(account)
      }
    }
  }

  const handleBlogPostsUpdate = async () => {
    try {
      setBlogPostsLoading(true)
      const posts = await APIService.getAllBlogPosts(false)
      setBlogPosts(posts)
    } catch (error) {
      console.error('Failed to reload blog posts:', error)
    } finally {
      setBlogPostsLoading(false)
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
        (currentRatings || []).filter(r => {
          const maybeWithProductSlug = r as Rating & { productSlug?: string }
          return r.productId !== productSlug && maybeWithProductSlug.productSlug !== productSlug
        })
      )

      setDiscussions((currentDiscussions) =>
        (currentDiscussions || []).filter(d => {
          const maybeWithProductSlug = d as Discussion & { productSlug?: string }
          return d.productId !== productSlug && maybeWithProductSlug.productSlug !== productSlug
        })
      )
      
      notify.success('Product deleted successfully')
    } catch (error) {
      console.error('[App] Failed to delete product:', error)
      const errorMessage = error instanceof Error ? error.message : String(error)
      const detailedMessage = `Failed to delete product: ${errorMessage}`
      console.error('[App] Error details:', { error, errorMessage })
      showPageError(detailedMessage)
    }
  }

  const handleEditProduct = async (updatedProduct: ProductUpdate) => {
    try {
      logger.debug('[App.handleEditProduct] Updating product:', {
        id: updatedProduct.id,
        slug: updatedProduct.slug,
        imageUrl: updatedProduct.imageUrl,
        imageAlt: updatedProduct.imageAlt
      })

      const savedProduct = await APIService.updateProduct(updatedProduct.id, updatedProduct, user?.id)

      logger.debug('[App.handleEditProduct] Product saved, response:', {
        savedProduct,
        hasImageUrl: savedProduct?.imageUrl,
        hasImageAlt: savedProduct?.imageAlt
      })
      
      // Prefer server state; some backends return 204 for PATCH, so refetch.
      const refetchedProduct = !savedProduct
        ? await APIService.getProduct(updatedProduct.slug || updatedProduct.id)
        : null

      // Use saved/refetched product when available; otherwise fall back to local draft.
      const productToUse: Product = savedProduct || refetchedProduct || {
        ...updatedProduct,
        imageUrl: updatedProduct.imageUrl ?? undefined,
        imageAlt: updatedProduct.imageAlt ?? undefined,
      }
      
      setProducts((currentProducts) => {
        const current = currentProducts || []
        const next = current.map((p) =>
          p.slug === productToUse.slug || p.id === productToUse.id ? productToUse : p
        )

        const exists = current.some((p) => p.slug === productToUse.slug || p.id === productToUse.id)
        return exists ? next : [productToUse, ...next]
      })
      
      if (user?.id && updatedProduct.id) {
        try {
          await APIService.logUserActivity({
            userId: user.id,
            type: 'product_submit',
            productId: updatedProduct.id,
            timestamp: new Date().toISOString(),
            metadata: { action: 'edit' },
          })
        } catch (activityError) {
          console.warn('Failed to log activity (non-critical):', activityError)
        }
      }
      
      notify.success('Product updated successfully')
    } catch (error) {
      console.error('Failed to update product:', error)
      showPageError('Failed to update product')
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
      showPageError('Only moderators or admins can change ban status')
      console.warn('[App.handleToggleBan] blocked - insufficient role', { role: userAccount?.role })
      return
    }

    try {
      const productKey = product.slug || product.id
      if (!productKey) {
        showPageError('Missing product identifier')
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
          notify.success('Product unbanned')
        }
      } else {
        const banReason = reason && reason.trim() ? reason.trim() : `Banned by ${userAccount.role}`
        const updated = await APIService.banProduct(productKey, banReason, userAccount.username)
        if (updated) {
          setProducts((existing) => existing.map((p) => (p.slug === productKey || p.id === productKey ? updated : p)))
          notify.success('Product banned')
        }
      }
    } catch (error) {
      console.error('Failed to toggle ban:', error)
      showPageError('Failed to update ban status')
    }
  }

  const handleCreateCollection = async (collectionData: CollectionCreateInput) => {
    try {
      console.debug('[CreateCollection] Payload being sent:', collectionData)
      const newCollection = await APIService.createCollection(collectionData)
      setCollections((current) => [newCollection, ...current])
      notify.success('Collection created successfully')
    } catch (error) {
      console.error('Failed to create collection:', error)
      showPageError('Failed to create collection')
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
        notify.success('Collection updated successfully')
      }
    } catch (error) {
      console.error('Failed to update collection:', error)
      showPageError('Failed to update collection')
    }
  }

  const handleDeleteCollection = async (collectionSlug: string) => {
    try {
      await APIService.deleteCollection(collectionSlug)
      setCollections((current) => current.filter((c) => c.slug !== collectionSlug && c.id !== collectionSlug))
      notify.success('Collection deleted successfully')
    } catch (error) {
      console.error('Failed to delete collection:', error)
      showPageError('Failed to delete collection')
    }
  }

  const handleRemoveProductFromCollection = async (collectionSlug: string, productSlug: string) => {
    try {
      const updated = await APIService.removeProductFromCollection(collectionSlug, productSlug)
      if (updated) {
        setCollections((current) =>
          current.map((c) => (c.slug === collectionSlug ? updated : c))
        )
        notify.success('Product removed from collection')
      }
    } catch (error) {
      console.error('Failed to remove product:', error)
      showPageError('Failed to remove product')
    }
  }

  const handleCompleteSignup = () => {
    setShowSignup(false)
    notify.success('Welcome to a11yhood!')
  }

  const handleSkipSignup = () => {
    setShowSignup(false)
    notify.success('Welcome to a11yhood!')
  }

  const handleSkipToMainClick = (_event: MouseEvent<HTMLAnchorElement>) => {
    // Preserve native anchor navigation for resilience, then move focus to main.
    requestAnimationFrame(() => {
      const main = document.getElementById('main-content') as HTMLElement | null
      if (main) {
        if (!main.hasAttribute('tabIndex')) {
          main.setAttribute('tabIndex', '-1')
        }
        main.focus()
      }
    })
  }

  const getCollectionEntryIdentity = (entry: CollectionEntry) => {
    if (entry.kind === 'query') {
      return `${entry.kind}:${JSON.stringify(entry.query || {})}`
    }

    return `${entry.kind}:${entry.targetSlug || entry.targetId || entry.title || ''}`
  }

  const collectionEntriesMatch = (entry: CollectionEntry, candidate: CollectionEntry) => {
    if (entry.kind !== candidate.kind) {
      return false
    }

    if (entry.kind === 'query') {
      return JSON.stringify(entry.query || {}) === JSON.stringify(candidate.query || {})
    }

    const entryKeys = new Set([entry.targetId, entry.targetSlug].filter(Boolean) as string[])
    const candidateKeys = [candidate.targetId, candidate.targetSlug].filter(Boolean) as string[]

    if (entryKeys.size > 0 && candidateKeys.length > 0) {
      return candidateKeys.some((key) => entryKeys.has(key))
    }

    // No stable identifier on either side — treat as non-matching to avoid
    // accidentally deleting unrelated entries that share a title.
    return false
  }

  const normalizeAddToCollectionEntries = (targets: AddToCollectionTargets = []): CollectionEntry[] => {
    if (targets.length === 0) {
      return []
    }

    if (typeof targets[0] === 'string') {
      return createCollectionEntriesFromProductIds((targets as string[]).map((value) => String(value).trim()).filter(Boolean))
    }

    return (targets as CollectionEntry[])
      .filter((entry) => !!entry && !!entry.kind)
      .map((entry, index) => ({ ...entry, order: typeof entry.order === 'number' ? entry.order : index }))
  }

  const normalizeCollectionEntryForBackend = (entry: CollectionEntry): CollectionEntry => {
    if (entry.kind === 'product') {
      const productKey = entry.targetId || entry.targetSlug || ''
      const resolvedProduct = products.find((product) => product.id === productKey || product.slug === productKey)

      if (resolvedProduct?.id) {
        return {
          ...entry,
          targetId: resolvedProduct.id,
          targetSlug: resolvedProduct.slug || entry.targetSlug,
        }
      }
    }

    if (entry.kind === 'collection') {
      const collectionKey = entry.targetId || entry.targetSlug || ''
      const resolvedCollection = collections.find((collection) => collection.id === collectionKey || collection.slug === collectionKey)

      if (resolvedCollection?.id) {
        return {
          ...entry,
          targetId: resolvedCollection.id,
          targetSlug: resolvedCollection.slug || entry.targetSlug,
        }
      }
    }

    return entry
  }

  const resolveProductApiKey = (productKey: string): string => {
    const resolvedProduct = products.find((product) => product.id === productKey || product.slug === productKey)
    return resolvedProduct?.slug || resolvedProduct?.id || productKey
  }

  const refreshCollectionInState = async (
    collectionSlug: string,
    fallbackCollection?: Collection | null,
    expectedEntries: CollectionEntry[] = [],
  ) => {
    if (fallbackCollection) {
      setCollections((current) =>
        current.map((collection) => ((collection.slug || collection.id) === collectionSlug ? fallbackCollection : collection))
      )
    }

    const expectedEntryIdentities = new Set(expectedEntries.map(getCollectionEntryIdentity))

    try {
      const refreshed = await APIService.getCollection(collectionSlug)
      if (refreshed) {
        if (fallbackCollection) {
          const fallbackEntries = getCollectionEntries(fallbackCollection)
          const refreshedEntries = getCollectionEntries(refreshed)
          const refreshedEntryIdentities = new Set(refreshedEntries.map(getCollectionEntryIdentity))
          const hasExpectedEntries =
            expectedEntryIdentities.size === 0 ||
            Array.from(expectedEntryIdentities).every((identity) => refreshedEntryIdentities.has(identity))

          const refetchLooksStale =
            !hasExpectedEntries &&
            fallbackEntries.length > 0 &&
            refreshedEntries.length < fallbackEntries.length

          if (refetchLooksStale) {
            return fallbackCollection
          }
        }

        setCollections((current) =>
          current.map((collection) => ((collection.slug || collection.id) === collectionSlug ? refreshed : collection))
        )
        return refreshed
      }
    } catch (error) {
      console.warn(`[App] Failed to refetch collection after mutation: ${collectionSlug}`, error)
    }

    if (fallbackCollection) {
      return fallbackCollection
    }

    return null
  }

  const handleAddEntriesToCollection = async (collectionSlug: string, targets: AddToCollectionTargets = []) => {
    const rawEntriesToAdd = normalizeAddToCollectionEntries(targets)
    if (rawEntriesToAdd.length === 0) {
      return
    }

    const entriesToAdd = rawEntriesToAdd.map(normalizeCollectionEntryForBackend)
    if (entriesToAdd.length === 0) {
      throw new Error('No supported items to add to collection')
    }

    const hasOnlyProductEntries = entriesToAdd.every((entry) => entry.kind === 'product' && !!(entry.targetSlug || entry.targetId))

    const mergeEntriesIntoCollection = async (baseCollection: Collection) => {
      const existingEntries = getCollectionEntries(baseCollection)
      const seen = new Set(existingEntries.map(getCollectionEntryIdentity))
      const mergedEntries = [...existingEntries]

      entriesToAdd.forEach((entry) => {
        const key = getCollectionEntryIdentity(entry)
        if (!seen.has(key)) {
          seen.add(key)
          mergedEntries.push(entry)
        }
      })

      const updated = await APIService.updateCollection(collectionSlug, {
        entries: mergedEntries.map((entry) => serializeCollectionEntryForUpdate(entry)),
      })

      if (!updated) {
        throw new Error(`Failed to update collection: ${collectionSlug}`)
      }

      await refreshCollectionInState(collectionSlug, updated, entriesToAdd)
      return updated
    }

    if (hasOnlyProductEntries) {
      const productTargets = Array.from(
        new Set(
          entriesToAdd
            .map((entry) => resolveProductApiKey(entry.targetSlug || entry.targetId || ''))
            .filter(Boolean)
        )
      )

      if (productTargets.length === 1) {
        const updated = await APIService.addProductToCollection(collectionSlug, productTargets[0])
        if (!updated) {
          throw new Error(`Failed to add product to collection: ${collectionSlug}`)
        }

        const directProductKeys = new Set(
          getCollectionProductEntries(updated)
            .map((entry) => resolveProductApiKey(entry.targetSlug || entry.targetId || ''))
            .filter(Boolean)
        )
        const hasAllTargetsDirectly = productTargets.every((target) => directProductKeys.has(target))

        if (!hasAllTargetsDirectly) {
          await mergeEntriesIntoCollection(updated)
          return
        }

        await refreshCollectionInState(collectionSlug, updated, entriesToAdd)
        return
      }

      const updated = await APIService.addMultipleProductsToCollection(collectionSlug, productTargets)
      if (!updated) {
        throw new Error(`Failed to add products to collection: ${collectionSlug}`)
      }

      const directProductKeys = new Set(
        getCollectionProductEntries(updated)
          .map((entry) => resolveProductApiKey(entry.targetSlug || entry.targetId || ''))
          .filter(Boolean)
      )
      const hasAllTargetsDirectly = productTargets.every((target) => directProductKeys.has(target))

      if (!hasAllTargetsDirectly) {
        await mergeEntriesIntoCollection(updated)
        return
      }

      await refreshCollectionInState(collectionSlug, updated, entriesToAdd)
      return
    }

    const collectionSnapshot = collections.find((candidate) => (candidate.slug || candidate.id) === collectionSlug)
    const baseCollection = collectionSnapshot || await APIService.getCollection(collectionSlug)

    if (!baseCollection) {
      throw new Error(`Collection not found: ${collectionSlug}`)
    }

    await mergeEntriesIntoCollection(baseCollection)
  }

  const handleRemoveEntriesFromCollection = async (collectionSlug: string, targets: AddToCollectionTargets = []) => {
    const rawEntriesToRemove = normalizeAddToCollectionEntries(targets)
    if (rawEntriesToRemove.length === 0) {
      return
    }

    const entriesToRemove = rawEntriesToRemove.map(normalizeCollectionEntryForBackend)
    if (entriesToRemove.length === 0) {
      return
    }

    const hasOnlyProductEntries = entriesToRemove.every((entry) => entry.kind === 'product' && !!(entry.targetSlug || entry.targetId))
    if (hasOnlyProductEntries) {
      const productTargets = Array.from(
        new Set(
          entriesToRemove
            .map((entry) => resolveProductApiKey(entry.targetSlug || entry.targetId || ''))
            .filter(Boolean)
        )
      )

      const removalResults = await Promise.all(
        productTargets.map((target) => APIService.removeProductFromCollection(collectionSlug, target))
      )
      const validRemovalResults = removalResults.filter((r): r is Collection => r !== null)
      const latestRemoved = validRemovalResults.length > 0 ? validRemovalResults[validRemovalResults.length - 1] : null

      await refreshCollectionInState(collectionSlug, latestRemoved)
      return
    }

    const baseCollection = await APIService.getCollection(collectionSlug)
    if (!baseCollection) {
      throw new Error(`Collection not found: ${collectionSlug}`)
    }

    const filteredEntries = getCollectionEntries(baseCollection)
      .filter((entry) => !entriesToRemove.some((candidate) => collectionEntriesMatch(entry, candidate)))

    const updated = await APIService.updateCollection(collectionSlug, {
      entries: filteredEntries.map((entry) => serializeCollectionEntryForUpdate(entry)),
    })

    if (!updated) {
      throw new Error(`Failed to update collection: ${collectionSlug}`)
    }

    await refreshCollectionInState(collectionSlug, updated)
  }

  const isCollectionEntryMode = initialCollectionEntries.length > 0 && initialCollectionEntries.every((entry) => entry.kind === 'collection')
  const addToCollectionDialogTitle = isCollectionEntryMode ? 'Add Collection to Collection' : 'Add Search Results to Collection'
  const addToCollectionDialogDescription = isCollectionEntryMode
    ? 'Select one or more collections to add this collection to'
    : 'Select one or more collections to add the current search results to'

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
            onClick={handleSkipToMainClick}
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

          <AlertBanner />

          {pageError && (
            <div className="max-w-7xl mx-auto px-6 pt-4">
              <div
                ref={errorSummaryRef}
                role="alert"
                tabIndex={-1}
                className="error-summary rounded-md border border-destructive/40 bg-destructive/10 p-4 text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-base font-semibold">We couldn't complete your request</h2>
                    <p className="mt-1 text-sm">{pageError}</p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-auto px-2 py-1"
                    onClick={() => setPageError(null)}
                    aria-label="Dismiss error message"
                  >
                    Dismiss
                  </Button>
                </div>
              </div>
            </div>
          )}

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
                <HomePage
                  products={products}
                  blogPosts={blogPosts}
                  blogPostsLoading={blogPostsLoading}
                  ratings={ratings}
                  onRate={handleRate}
                />
              } />
              <Route path="/products" element={
                <SearchPage
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
                  onOpenAddToCollection={(defaults) => {
                    setInitialCollectionName(defaults.name ?? '')
                    setInitialCollectionDescription(defaults.description ?? '')
                    setInitialCollectionEntries(defaults.entries)
                    setInitialPreselectedCollectionKeys(defaults.preselectedCollectionKeys ?? [])

                    setInitialCollectionIsPublic(defaults.isPublic ?? true)
                    setShowAddSearchResultsDialog(true)
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
                  onMinRatingChange={handleMinRatingChange}
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
                  onLogin={handleLogin}
                  allTags={allTags}
                  allProductTypes={allProductTypes}
                />
              } />
              <Route path="/blog" element={
                <BlogPage blogPosts={blogPosts} blogPostsLoading={blogPostsLoading} userAccount={userAccount} />
              } />
              <Route path="/blog/:slug" element={
                <BlogPostPage blogPosts={blogPosts} userAccount={userAccount} />
              } />
              <Route path="/draft/:id" element={
                <BlogPostDraftPage userAccount={userAccount} />
              } />
              <Route path="/collections" element={
                <CollectionsPage
                  collections={collections}
                  collectionsLoaded={collectionsLoaded}
                  products={(isAdmin || isModerator) && includeBanned ? (products || []) : (products || []).filter((p) => !p.banned)}
                  user={user}
                  userAccount={userAccount}
                  onDeleteCollection={handleDeleteCollection}
                  onEditCollection={(collection) => {
                    setEditingCollection(collection)
                    setShowEditCollectionDialog(true)
                  }}
                  onCreateCollection={() => setShowCreateCollectionDialog(true)}
                  onOpenAddToCollection={(defaults) => {
                    setInitialCollectionName(defaults.name ?? '')
                    setInitialCollectionDescription(defaults.description ?? '')
                    setInitialCollectionEntries(defaults.entries)
                    setInitialPreselectedCollectionKeys(defaults.preselectedCollectionKeys ?? [])

                    setInitialCollectionIsPublic(defaults.isPublic ?? true)
                    setShowAddSearchResultsDialog(true)
                  }}
                />
              } />
              <Route path="/collections/:collectionSlug" element={
                <CollectionDetailPage
                  collections={collections}
                  ratings={ratings}
                  products={products}
                  user={user}
                  userAccount={userAccount}
                  onRemoveProductFromCollection={handleRemoveProductFromCollection}
                  onDeleteProduct={handleDeleteProduct}
                  onDeleteCollection={handleDeleteCollection}
                  onEditCollection={(collection) => {
                    setEditingCollection(collection)
                    setShowEditCollectionDialog(true)
                  }}
                  onOpenAddToCollection={(defaults) => {
                    setInitialCollectionName(defaults.name ?? '')
                    setInitialCollectionDescription(defaults.description ?? '')
                    setInitialCollectionEntries(defaults.entries)
                    setInitialPreselectedCollectionKeys(defaults.preselectedCollectionKeys ?? [])

                    setInitialCollectionIsPublic(defaults.isPublic ?? true)
                    setShowAddSearchResultsDialog(true)
                  }}
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
              <Route path="/profile" element={<Navigate to={user ? `/profile/${userAccount?.username || user.username}` : '/'} replace />} />
              <Route path="/profile/:username" element={
                <PublicProfileWrapper />
              } />
              {/* Backward compatibility: redirect /account to /account/:username if signed in */}
              <Route path="/account" element={<Navigate to={user ? `/account/${userAccount?.username || user.username}` : '/'} replace />} />
              <Route path="/admin" element={
                <AdminPage
                  products={products}
                  userAccount={userAccount}
                  ravelryAuthTimestamp={ravelryAuthTimestamp}
                  onProductsUpdate={setProducts}
                  onBlogPostsUpdate={handleBlogPostsUpdate}
                  adminVerboseLoggingEnabled={adminVerboseLoggingEnabled}
                  onAdminVerboseLoggingChange={setAdminVerboseLoggingEnabled}
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
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </main>

          {user && (
            <>
              <CreateCollectionDialog
                open={showCreateCollectionDialog}
                onOpenChange={setShowCreateCollectionDialog}
                onCreateCollection={handleCreateCollection}
                initialEntries={initialCollectionEntries}
                initialName={initialCollectionName}
                initialDescription={initialCollectionDescription}
                initialIsPublic={initialCollectionIsPublic}
                username={user.username}
              />

              <AddToCollectionDialog
                open={showAddSearchResultsDialog}
                onOpenChange={setShowAddSearchResultsDialog}
                collections={collections}
                currentUserId={userAccount?.id || user?.id}
                currentUsername={user?.username}
                entriesToAdd={initialCollectionEntries}
                preselectedCollectionKeys={initialPreselectedCollectionKeys}
                onAddToCollection={async (collectionSlug, targets = []) => {
                  try {
                    await handleAddEntriesToCollection(collectionSlug, targets)
                    notify.success('Added to collection')
                  } catch (error) {
                    console.error('Failed to add items to collection:', error)
                    notify.error('Failed to add items to collection')
                  }
                }}
                onRemoveFromCollection={async (collectionSlug, targets = []) => {
                  try {
                    await handleRemoveEntriesFromCollection(collectionSlug, targets)
                    notify.success('Removed from collection')
                  } catch (error) {
                    console.error('Failed to remove items from collection:', error)
                    notify.error('Failed to remove items from collection')
                  }
                }}
                onCreateNew={() => {
                  setShowAddSearchResultsDialog(false)
                  setShowCreateCollectionDialog(true)
                }}
                title={addToCollectionDialogTitle}
                description={addToCollectionDialogDescription}
                allowRemoval={true}
                username={user.username}
              />

              <EditCollectionDialog
                open={showEditCollectionDialog}
                onOpenChange={setShowEditCollectionDialog}
                collection={editingCollection}
                onUpdateCollection={handleUpdateCollection}
              />
            </>
          )}

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
        const basePathRaw = import.meta.env.BASE_URL || '/'
        const basePath = (() => {
          const withLeadingSlash = basePathRaw.startsWith('/') ? basePathRaw : `/${basePathRaw}`
          return withLeadingSlash.endsWith('/') ? withLeadingSlash : `${withLeadingSlash}/`
        })()
        const basePathNoTrailingSlash = basePath === '/' ? '/' : basePath.slice(0, -1)

        let redirectPath = '/'
        if (typeof window !== 'undefined') {
          const storedRedirect = sessionStorage.getItem(POST_AUTH_REDIRECT_KEY)
          sessionStorage.removeItem(POST_AUTH_REDIRECT_KEY)
          if (storedRedirect && storedRedirect.startsWith('/') && !storedRedirect.startsWith('//')) {
            redirectPath = storedRedirect
          }
        }

        // Stored redirect comes from window.location and can include the router basename.
        // Strip basename before navigate() to avoid double-basenaming on hosted deployments.
        const normalizedRedirectPath = (() => {
          if (basePathNoTrailingSlash === '/') {
            return redirectPath
          }
          if (redirectPath === basePathNoTrailingSlash) {
            return '/'
          }
          if (redirectPath.startsWith(`${basePathNoTrailingSlash}/`)) {
            return redirectPath.slice(basePathNoTrailingSlash.length) || '/'
          }
          return redirectPath
        })()

        // Clean up URL fragments while preserving app basename for hosted deployments.
        window.history.replaceState({}, document.title, basePath)
        navigate(normalizedRedirectPath, { replace: true })
      }
    }
    process()
  }, [navigate])

  return (
    <div className="text-center py-12">
      <h1 className="sr-only">Signing in</h1>
      <p className="text-lg text-muted-foreground">Signing you in…</p>
    </div>
  )
}
