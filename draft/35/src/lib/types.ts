/**
 * Core TypeScript types for a11yhood frontend.
 * 
 * All types use camelCase (API service converts from backend's snake_case).
 * Product editorship tracked via editorIds array populated from product_editors table.
 * Source ratings (sourceRating, stars) come from external platforms; internal ratings computed separately.
 */

export type Product = {
  // Core identifiers
  id: string
  slug?: string
  name: string
  type: string
  
  // Source tracking - indicates platform origin
  // Values: 'user-submitted', 'thingiverse', 'ravelry', 'github', etc.
  source: string
  sourceUrl?: string // Primary URL to the product
  sourceUrls?: string[] // Additional URLs (mirrors/versions)
  
  // Product classification and presentation
  description: string
  imageUrl?: string // Base64 or URL to product image
  imageAlt?: string // Accessibility: descriptive text for screen readers
  tags: string[] // User-defined and scraped tags
  
  // Creation metadata
  createdAt: number // Timestamp when product was added
  submittedBy?: string // User ID (user submissions) or 'system' (scraped)
  
  // Edit history tracking
  lastEditedAt?: number // Timestamp of last modification
  lastEditedBy?: string // Editor: 'system', 'admin', or user ID
  
  // Source update tracking
  source_last_updated?: number // Legacy snake_case timestamp from backend
  sourceLastUpdated?: number | string // CamelCase alias for scraper-provided last updated timestamp
  
  // Ban status - prevents product from being updated during scraping
  banned?: boolean
  bannedAt?: number
  bannedBy?: string // Who banned: 'admin' or user ID
  bannedReason?: string
  
  // Ownership tracking - populated from product_editors relationship table
  editorIds?: string[] // Array of user IDs who are product editors
  
  // Source rating - rating from original platform (e.g., Thingiverse, Ravelry)
  // Separate from internal user ratings to preserve platform data
  sourceRating?: number // Rating from source platform (0-5 scale)
  sourceRatingCount?: number // Number of ratings on source platform
  stars?: number // Number of stars/followers/likes from source platform
}

export type Rating = {
  productId: string
  userId: string
  rating: number
  createdAt: number
}

export type Discussion = {
  id: string
  productId: string
  userId: string
  username: string
  content: string
  parentId?: string
  createdAt: number
  blocked?: boolean
  blockedBy?: string
  blockedReason?: string
  blockedAt?: number
  editedAt?: number
}

export type UserData = {
  id: string
  login: string
  avatarUrl?: string
}

export type UserAccount = {
  id: string
  username?: string
  avatarUrl?: string
  email?: string
  role: 'user' | 'moderator' | 'admin'
  createdAt?: string
  joinedAt?: string
  lastActive?: string
}

export type UserPreferences = {
  productCardColumns?: 1 | 3
}

export type UserActivity = {
  userId: string
  type: 'product_submit' | 'rating' | 'discussion' | 'tag'
  productId?: string
  timestamp: number
  metadata?: Record<string, any>
}

export type ScrapingLog = {
  id: string
  timestamp: number
  status: 'success' | 'error'
  totalProductsScraped: number
  productsPerSource: Record<string, number>
  productsAdded: number
  productsUpdated: number
  duration: number
  errors: string[]
}

/**
 * Blog post type for community articles and announcements
 * Supports markdown content with image support and full admin lifecycle
 */
export type BlogPost = {
  // Core identifiers
  id: string
  title: string
  slug: string // URL-friendly identifier (auto-generated from title)
  
  // Content
  content: string // Markdown content (supports inline images)
  excerpt?: string // Short preview text
  
  // Images
  headerImage?: string // Base64 or URL for header image
  headerImageAlt?: string // Alt text for header image
  
  // Metadata
  authorId: string // User ID of the primary author
  authorName: string // Display name of the primary author
  authorIds?: string[] // User IDs of all authors (includes primary author)
  authorNames?: string[] // Display names of all authors (includes primary author)
  createdAt: number // Timestamp when created
  updatedAt: number // Timestamp of last edit
  publishDate?: number // Custom publication date (for backdating posts)
  
  // Publishing
  published: boolean // Whether the post is visible to users
  publishedAt?: number // Timestamp when published
  
  // Organization
  tags?: string[] // Topic tags for categorization
  featured?: boolean // Whether to highlight on homepage
}

export type Collection = {
  id: string
  slug?: string
  name: string
  description?: string
  username: string
  userId?: string
  userName?: string
  productSlugs: string[]
  createdAt: number
  updatedAt: number
  isPublic: boolean
}

export type CollectionCreateInput = {
  name: string
  description?: string
  isPublic: boolean
  productSlugs?: string[]
  username: string
}

export type UserRequest = {
  id: string
  userId: string
  userName: string
  userAvatarUrl?: string
  type: 'moderator' | 'admin' | 'product-ownership' | 'source-domain'
  message?: string
  reason?: string
  status: 'pending' | 'approved' | 'rejected'
  createdAt: number
  reviewedAt?: number
  reviewedBy?: string
  reviewerNote?: string
  productId?: string
}