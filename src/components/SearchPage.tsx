/**
 * SearchPage component - Product search and filtering page
 * This is the content that was previously on the homepage
 */
import { ProductListPage } from '@/App'
import type { Product, Rating, UserData, UserAccount, BlogPost, Collection } from '@/lib/types'

type SearchPageProps = {
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
}

/**
 * SearchPage is essentially a wrapper around ProductListPage
 * This separates the search functionality from the new homepage
 */
export function SearchPage(props: SearchPageProps) {
  return <ProductListPage {...props} />
}
