import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { CalendarBlank, Globe, MapPin, ChartBar, BookOpen, FolderOpen, Article } from '@phosphor-icons/react'
import { APIService } from '@/lib/api'
import { UserAccount, Product, Collection, BlogPost } from '@/lib/types'
import { ProductCard } from '@/components/ProductCard'
import { pickCollectionImage } from '@/lib/collectionUtils'

export function PublicProfile({ username }: { username: string }) {
  const navigate = useNavigate()
  const [account, setAccount] = useState<UserAccount | null>(null)
  const [stats, setStats] = useState({
    productsSubmitted: 0,
    ratingsGiven: 0,
    discussionsParticipated: 0,
    totalContributions: 0,
  })
  const [managedProducts, setManagedProducts] = useState<Product[]>([])
  const [userCollections, setUserCollections] = useState<Collection[]>([])
  const [collectionImages, setCollectionImages] = useState<Record<string, { imageUrl: string; imageAlt?: string; name: string }>>({})
  const [blogPosts, setBlogPosts] = useState<BlogPost[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const acct = await APIService.getUserByUsername(username)
        if (acct) {
          setAccount(acct)
          const s = await APIService.getUserStats(acct.username || acct.id)
          setStats(s)
          
          // Load products the user manages
          try {
            const userManagedProducts = await APIService.getProductsByOwner(acct.username || acct.id)
            setManagedProducts(userManagedProducts)
          } catch (e) {
            console.error('[PublicProfile] Failed to load products:', e)
          }
          
          // Load collections created by the user (public only for non-admin viewers)
          try {
            const allPublicCollections = await APIService.getPublicCollections('updated_at')
            setUserCollections(allPublicCollections.filter(c => c.userId === acct.id))
          } catch (e) {
            // Silently fail if we can't load collections
          }

          // Load published blog posts by this user
          try {
            const allPosts = await APIService.getAllBlogPosts(false)
            const userPosts = allPosts.filter(p => 
              p.authorId === acct.id || 
              (p.authorIds && p.authorIds.includes(acct.id))
            )
            setBlogPosts(userPosts)
          } catch (e) {
            // Silently fail if we can't load blog posts
          }
        } else {
          setError('User not found')
        }
      } catch (e) {
        setError('Could not load user profile')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [username])

  // After collections are loaded, fetch a few products per collection to find a
  // representative image (prefer alt text / featured, then pick randomly).
  useEffect(() => {
    if (userCollections.length === 0) return

    const fetchImages = async () => {
      const results = await Promise.allSettled(
        userCollections.map(async (collection) => {
          const slugs = collection.productSlugs || []
          if (slugs.length === 0) return null

          // Fetch up to 5 products from the collection to find a suitable image
          const productResults = await Promise.allSettled(
            slugs.slice(0, 5).map(slug => APIService.getProductBySlug(slug))
          )
          const fetched = productResults
            .filter((r): r is PromiseFulfilledResult<Product> => r.status === 'fulfilled' && r.value !== null)
            .map(r => r.value)

          const picked = pickCollectionImage(fetched)
          return picked ? { collectionId: collection.id, image: picked } : null
        })
      )

      const images: Record<string, { imageUrl: string; imageAlt?: string; name: string }> = {}
      results.forEach(result => {
        if (result.status === 'fulfilled' && result.value) {
          images[result.value.collectionId] = result.value.image
        }
      })
      setCollectionImages(images)
    }

    fetchImages()
  }, [userCollections])

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading profile...</p>
  }
  if (error || !account) {
    return <p className="text-sm text-destructive">{error || 'User not found'}</p>
  }

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric',
    })
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold mb-6">Profile</h1>

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4">
              <Avatar className="w-20 h-20">
                <AvatarImage src={account.avatarUrl} alt={account.username} />
                <AvatarFallback>{(account.username || '?').slice(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="space-y-2">
                <div>
                  <CardTitle className="text-2xl flex items-center gap-2">
                    {account.displayName || account.username}
                    {account.role === 'moderator' && (
                      <Badge variant="secondary">Editor</Badge>
                    )}
                    {account.role === 'admin' && (
                      <Badge variant="default">Admin</Badge>
                    )}
                  </CardTitle>
                  {account.displayName && account.username && (
                    <p className="text-sm text-muted-foreground">@{account.username}</p>
                  )}
                </div>
                {account.bio && (
                  <CardDescription className="max-w-2xl">{account.bio}</CardDescription>
                )}
                <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                  {account.location && (
                    <div className="flex items-center gap-1">
                      <MapPin size={16} />
                      {account.location}
                    </div>
                  )}
                  {account.website && (
                    <a
                      href={account.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 hover:text-primary"
                    >
                      <Globe size={16} />
                      Website
                    </a>
                  )}
                  {account.createdAt && (
                    <div className="flex items-center gap-1">
                      <CalendarBlank size={16} />
                      Joined {formatDate(new Date(account.createdAt).getTime())}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ChartBar size={24} />
            Contribution Statistics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="text-center p-4 bg-muted rounded-lg">
              <div className="text-3xl font-bold">{stats.totalContributions}</div>
              <div className="text-sm text-muted-foreground mt-1">Total</div>
            </div>
            <div className="text-center p-4 bg-muted rounded-lg">
              <div className="text-3xl font-bold">{stats.productsSubmitted}</div>
              <div className="text-sm text-muted-foreground mt-1">Products</div>
            </div>
            <div className="text-center p-4 bg-muted rounded-lg">
              <div className="text-3xl font-bold">{stats.ratingsGiven}</div>
              <div className="text-sm text-muted-foreground mt-1">Ratings</div>
            </div>
            <div className="text-center p-4 bg-muted rounded-lg">
              <div className="text-3xl font-bold">{stats.discussionsParticipated}</div>
              <div className="text-sm text-muted-foreground mt-1">Discussions</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {managedProducts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen size={24} />
              Edited Products ({managedProducts.length})
            </CardTitle>
            <CardDescription>
              Products this user manages and maintains
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
              {managedProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  ratings={[]}
                  onClick={() => navigate(`/product/${product.slug}`)}
                  user={null}
                  userAccount={null}
                  onRate={() => {}}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {blogPosts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Article size={24} />
              Posts ({blogPosts.length})
            </CardTitle>
            <CardDescription>
              Blog posts authored by this user
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {blogPosts.map((post) => (
                <div
                  key={post.id}
                  className="border rounded-lg p-4 hover:border-primary transition-colors cursor-pointer"
                  onClick={() => navigate(`/blog/${post.slug}`)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      navigate(`/blog/${post.slug}`)
                    }
                  }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1 flex-1">
                      <h3 className="font-semibold leading-tight">{post.title}</h3>
                      {post.excerpt && (
                        <p className="text-sm text-muted-foreground line-clamp-2">{post.excerpt}</p>
                      )}
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{new Date(post.publishDate || post.publishedAt || post.createdAt).toLocaleDateString()}</span>
                        {post.featured && <Badge variant="default" className="text-xs">Featured</Badge>}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {userCollections.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FolderOpen size={24} />
              Collections ({userCollections.length})
            </CardTitle>
            <CardDescription>
              Public collections curated by this user
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
              {userCollections.map((collection) => {
                const img = collectionImages[collection.id]
                return (
                  <Card 
                    key={collection.id}
                    className="cursor-pointer hover:shadow-md transition-shadow overflow-hidden"
                    onClick={() => navigate(`/collections/${collection.slug || collection.id}`)}
                  >
                    <div className="w-full h-32 bg-muted overflow-hidden flex items-center justify-center">
                      {img ? (
                        <img
                          src={img.imageUrl}
                          alt={img.imageAlt || `${img.name} image`}
                          className="w-full h-full object-cover object-center"
                        />
                      ) : (
                        <FolderOpen size={40} className="text-muted-foreground/30" aria-hidden="true" />
                      )}
                    </div>
                    <CardHeader>
                      <CardTitle className="text-lg">{collection.name}</CardTitle>
                      {collection.description && (
                        <CardDescription className="line-clamp-2">
                          {collection.description}
                        </CardDescription>
                      )}
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">
                        {(collection.productSlugs?.length ?? 0)} product{(collection.productSlugs?.length ?? 0) !== 1 ? 's' : ''}
                      </p>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

