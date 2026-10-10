import { describe, expect, it } from 'vitest'
import { applySocialMetadata, buildSocialMetadata } from '@/lib/socialMetadata'
import { BlogPost, Collection, Product } from '@/lib/types'

const baseProduct: Product = {
  id: 'product-1',
  slug: 'reader',
  name: 'Screen Reader',
  type: 'software',
  source: 'github',
  description: 'A product for testing social metadata.',
  tags: ['testing'],
  createdAt: Date.now(),
  imageUrl: '/api/images/product-1',
}

const baseBlogPost: BlogPost = {
  id: 'post-1',
  slug: 'accessible-testing',
  title: 'Accessible Testing',
  content: 'Helpful content',
  excerpt: 'How to test accessibly',
  authorId: 'author-1',
  authorName: 'Author',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  published: true,
  headerImage: '/api/images/post-1',
}

const baseCollection: Collection = {
  id: 'collection-1',
  slug: 'favorites',
  name: 'Favorites',
  description: 'Useful accessibility tools.',
  userId: 'user-1',
  username: 'curator',
  entries: [{ kind: 'product', targetSlug: 'reader', order: 0 }],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  isPublic: true,
}

describe('buildSocialMetadata', () => {
  it('builds product metadata from matching product route', () => {
    const metadata = buildSocialMetadata({
      pathname: '/product/reader',
      search: '',
      origin: 'https://a11yhood.example',
      products: [baseProduct],
      blogPosts: [],
      collections: [],
    })

    expect(metadata.title).toBe('Screen Reader | a11yhood')
    expect(metadata.description).toContain('testing social metadata')
    expect(metadata.image).toBe('https://a11yhood.example/api/images/product-1')
    expect(metadata.url).toBe('https://a11yhood.example/product/reader')
  })

  it('builds blog metadata for blog post route', () => {
    const metadata = buildSocialMetadata({
      pathname: '/blog/accessible-testing',
      search: '',
      origin: 'https://a11yhood.example',
      products: [],
      blogPosts: [baseBlogPost],
      collections: [],
    })

    expect(metadata.title).toBe('Accessible Testing | a11yhood blog')
    expect(metadata.description).toBe('How to test accessibly')
    expect(metadata.type).toBe('article')
    expect(metadata.image).toBe('https://a11yhood.example/api/images/post-1')
  })

  it('builds collection metadata with representative collection image', () => {
    const metadata = buildSocialMetadata({
      pathname: '/collections/favorites',
      search: '',
      origin: 'https://a11yhood.example',
      products: [baseProduct],
      blogPosts: [],
      collections: [baseCollection],
    })

    expect(metadata.title).toBe('Favorites | a11yhood collection')
    expect(metadata.description).toContain('Useful accessibility tools')
    expect(metadata.image).toBe('https://a11yhood.example/api/images/product-1')
  })

  it('builds search metadata with query-specific description and representative image', () => {
    const metadata = buildSocialMetadata({
      pathname: '/products',
      search: '?q=writing&tag=keyboard&source=github&minRating=4',
      origin: 'https://a11yhood.example',
      products: [
        baseProduct,
        { ...baseProduct, id: 'product-2', slug: 'voice-control', imageUrl: '/api/images/product-2' },
      ],
      blogPosts: [],
      collections: [],
    })

    expect(metadata.title).toBe('Search: writing | a11yhood')
    expect(metadata.description).toContain('Search results for “writing”')
    expect(metadata.description).toContain('tags: keyboard')
    expect(metadata.description).toContain('sources: github')
    expect(metadata.description).toContain('minimum rating: 4')
    expect(metadata.image.startsWith('https://a11yhood.example/api/images/product-')).toBe(true)
  })
})

describe('applySocialMetadata', () => {
  it('applies and updates social tags on document head', () => {
    applySocialMetadata({
      title: 'My page',
      description: 'Meta description',
      image: 'https://a11yhood.example/image.png',
      url: 'https://a11yhood.example/products?q=screen',
      type: 'website',
    })

    expect(document.title).toBe('My page')
    expect(document.head.querySelector('meta[name="description"]')?.getAttribute('content')).toBe('Meta description')
    expect(document.head.querySelector('meta[property="og:title"]')?.getAttribute('content')).toBe('My page')
    expect(document.head.querySelector('meta[property="og:image"]')?.getAttribute('content')).toBe('https://a11yhood.example/image.png')
    expect(document.head.querySelector('meta[name="twitter:card"]')?.getAttribute('content')).toBe('summary_large_image')
    expect(document.head.querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe('https://a11yhood.example/products?q=screen')
  })
})
