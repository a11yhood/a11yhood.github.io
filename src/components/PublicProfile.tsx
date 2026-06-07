import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { CalendarBlank, Globe, MapPin, ChartBar, BookOpen, FolderOpen, Article } from '@phosphor-icons/react'
import { APIService } from '@/lib/api'
import { UserAccount, Product, Collection, BlogPost } from '@/lib/types'

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
          const effectiveUsername = acct.username ?? username
          const s = await APIService.getUserStats(effectiveUsername)
          setStats(s)

          // Load products the user can edit (owner or editor) from the
          // relationship-backed endpoint.
          try {
            const ownedProducts = await APIService.getOwnedProducts(acct.id)
            setManagedProducts(ownedProducts)
          } catch (error) {
            console.error('[PublicProfile] Failed to load products:', error)
          }

          // Load collections where the user is owner or editor.
          try {
            const allPublicCollections = await APIService.getPublicCollections('updated_at')
            setUserCollections(
              allPublicCollections.filter(
                (collection) => collection.userId === acct.id || (collection.editorIds || []).includes(acct.id)
              )
            )
          } catch {
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
          } catch {
            // Silently fail if we can't load blog posts
          }
        } else {
          setError('User not found')
        }
      } catch {
        setError('Could not load user profile')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [username])

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

  const displayedProductsSubmitted = Math.max(stats.productsSubmitted, managedProducts.length)
  const displayedCollectionsCount = userCollections.length
  const displayedTotalContributions = Math.max(
    stats.totalContributions,
    displayedProductsSubmitted + displayedCollectionsCount + stats.ratingsGiven + stats.discussionsParticipated
  )

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold mb-6">Profile</h1>

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4">
              <Avatar className="w-20 h-20">
                <AvatarImage src={account.avatarUrl} alt={account.username || 'User avatar'} />
                <AvatarFallback>{(account.username || '?').slice(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="space-y-2">
                <div>
                  <CardTitle as="h2" className="text-2xl flex items-center gap-2">
                    {account.displayName || account.username || username}
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
                  {account.website && (() => {
                    try {
                      const url = new URL(account.website)
                      if (url.protocol !== 'http:' && url.protocol !== 'https:') return null
                      return (
                        <a
                          href={url.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 hover:text-primary"
                        >
                          <Globe size={16} />
                          Website
                        </a>
                      )
                    } catch {
                      return null
                    }
                  })()}
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
          <CardTitle as="h2" className="flex items-center gap-2">
            <ChartBar size={24} />
            Contribution Statistics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="text-center p-4 bg-muted rounded-lg">
              <div className="text-3xl font-bold">{displayedTotalContributions}</div>
              <div className="text-sm text-muted-foreground mt-1">Total</div>
            </div>
            <div className="text-center p-4 bg-muted rounded-lg">
              <div className="text-3xl font-bold">{displayedProductsSubmitted}</div>
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
            <div className="text-center p-4 bg-muted rounded-lg">
              <div className="text-3xl font-bold">{displayedCollectionsCount}</div>
              <div className="text-sm text-muted-foreground mt-1">Collections</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle as="h2" className="flex items-center gap-2">
            <BookOpen size={24} />
            Projects and Collections
          </CardTitle>
          <CardDescription>
            Items this user contributes to
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <section aria-labelledby="profile-products-heading" className="space-y-3">
            <h3 id="profile-products-heading" className="text-lg font-semibold">Products ({managedProducts.length})</h3>
            {managedProducts.length === 0 ? (
              <p className="text-sm text-muted-foreground">No product contributions yet.</p>
            ) : (
              <ul className="space-y-2">
                {managedProducts.map((product) => {
                  const role = product.submittedBy === account.id ? 'owner' : 'editor'
                  return (
                    <li key={product.id} className="flex items-center justify-between gap-3 rounded-md border p-3">
                      <Link to={`/product/${product.slug || product.id}`} className="font-medium hover:underline">
                        {product.name}
                      </Link>
                      <span className="text-xs text-muted-foreground">({role})</span>
                    </li>
                  )
                })}
              </ul>
            )}
          </section>

          <section aria-labelledby="profile-collections-heading" className="space-y-3">
            <h3 id="profile-collections-heading" className="text-lg font-semibold">Collections ({userCollections.length})</h3>
            {userCollections.length === 0 ? (
              <p className="text-sm text-muted-foreground">No collection contributions yet.</p>
            ) : (
              <ul className="space-y-2">
                {userCollections.map((collection) => {
                  const role = collection.userId === account.id ? 'owner' : 'editor'
                  return (
                    <li key={collection.id} className="flex items-center justify-between gap-3 rounded-md border p-3">
                      <Link to={`/collections/${collection.slug || collection.id}`} className="font-medium hover:underline">
                        {collection.name}
                      </Link>
                      <span className="text-xs text-muted-foreground">({role})</span>
                    </li>
                  )
                })}
              </ul>
            )}
          </section>
        </CardContent>
      </Card>

      {blogPosts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle as="h2" className="flex items-center gap-2">
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
                <Link
                  key={post.id}
                  to={`/blog/${post.slug}`}
                  className="block no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-lg"
                >
                  <div className="border rounded-lg p-4 hover:border-primary transition-colors cursor-pointer">
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
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

    </div>
  )
}
