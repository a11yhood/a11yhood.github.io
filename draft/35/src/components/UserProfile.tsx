import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Link } from 'react-router-dom'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { CollapsibleCard } from '@/components/CollapsibleCard'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import MarkdownText from '@/components/ui/MarkdownText'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { UserAccount, UserData, Product, BlogPost } from '@/lib/types'
import { APIService } from '@/lib/api'
import { UserRequestsPanel } from '@/components/UserRequestsPanel'
import { Pencil, MapPin, Globe, CalendarBlank, ChartBar, Package, Article, CaretDown, CaretRight } from '@phosphor-icons/react'
import { toast } from 'sonner'

type UserProfileProps = {
  userAccount: UserAccount
  user: UserData
  onUpdate?: () => void
  onProductClick?: (product: Product) => void
  onCollectionsClick?: () => void
  onBlogPostClick?: (post: BlogPost) => void
}

export function UserProfile({ userAccount, user, onUpdate, onProductClick, onCollectionsClick, onBlogPostClick }: UserProfileProps) {
  const [open, setOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(true)
  const [statsOpen, setStatsOpen] = useState(true)
  // Managed by CollapsibleCard (uncontrolled by default)
  const [postsOpen, setPostsOpen] = useState(true)
  const [displayName, setDisplayName] = useState(userAccount.displayName || '')
  const [bio, setBio] = useState(userAccount.bio || '')
  const [location, setLocation] = useState(userAccount.location || '')
  const [website, setWebsite] = useState(userAccount.website || '')
  const [stats, setStats] = useState({
    productsSubmitted: 0,
    ratingsGiven: 0,
    discussionsParticipated: 0,
    totalContributions: 0,
  })
  const [ownedProducts, setOwnedProducts] = useState<Product[]>([])
  const [loadingOwnedProducts, setLoadingOwnedProducts] = useState(false)
  const [ownedProductsError, setOwnedProductsError] = useState<string | null>(null)
  const [blogPosts, setBlogPosts] = useState<BlogPost[]>([])
  const [loadingBlogPosts, setLoadingBlogPosts] = useState(false)

  useEffect(() => {
    const loadStats = async () => {
      const userStats = await APIService.getUserStats(userAccount.id)
      setStats(userStats)
    }
    loadStats()
  }, [userAccount.id])

  useEffect(() => {
    const loadOwnedProducts = async () => {
      setLoadingOwnedProducts(true)
      setOwnedProductsError(null)
      try {
        const products = await APIService.getOwnedProducts(userAccount.username)
        setOwnedProducts(products)
      } catch (error) {
        console.error('Failed to load owned products:', error)
        setOwnedProductsError('Could not load your products right now')
      } finally {
        setLoadingOwnedProducts(false)
      }
    }

    loadOwnedProducts()
  }, [userAccount.id])

  useEffect(() => {
    const loadBlogPosts = async () => {
      if (userAccount.role !== 'admin') return
      
      setLoadingBlogPosts(true)
      try {
        const allPosts = await APIService.getAllBlogPosts(true)
        const userPosts = allPosts.filter(p => 
          p.authorId === userAccount.id || 
          (p.authorIds && p.authorIds.includes(userAccount.id))
        )
        setBlogPosts(userPosts)
      } catch (error) {
        console.error('Failed to load blog posts:', error)
      } finally {
        setLoadingBlogPosts(false)
      }
    }

    loadBlogPosts()
  }, [userAccount.id, userAccount.role])

  const handleSave = async () => {
    try {
      await APIService.updateUserProfile(userAccount.githubId, {
        displayName: displayName.trim() || undefined,
        bio: bio.trim() || undefined,
        location: location.trim() || undefined,
        website: website.trim() || undefined,
      })
      
      toast.success('Profile updated successfully')
      setOpen(false)
      onUpdate?.()
    } catch (error) {
      toast.error('Failed to update profile')
      console.error('Profile update error:', error)
    }
  }

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold mb-6">My Account</h1>
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4">
              <Avatar className="w-20 h-20">
                <AvatarImage src={userAccount.avatarUrl} alt={userAccount.username} />
                <AvatarFallback>{userAccount.username.slice(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="space-y-2">
                <div>
                  <CardTitle className="text-2xl flex items-center gap-2">
                    {userAccount.username}
                    {userAccount.role === 'moderator' && (
                      <Badge variant="secondary">Moderator</Badge>
                    )}
                    {userAccount.role === 'admin' && (
                      <Badge variant="default">Admin</Badge>
                    )}
                  </CardTitle>
                  {userAccount.displayName && (
                    <p className="text-sm text-muted-foreground">@{userAccount.login}</p>
                  )}
                </div>
                {userAccount.bio && (
                  <CardDescription className="max-w-2xl">{userAccount.bio}</CardDescription>
                )}
                <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                  {userAccount.location && (
                    <div className="flex items-center gap-1">
                      <MapPin size={16} />
                      {userAccount.location}
                    </div>
                  )}
                  {userAccount.website && (
                    <a
                      href={userAccount.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 hover:text-primary"
                    >
                      <Globe size={16} />
                      Website
                    </a>
                  )}
                  <div className="flex items-center gap-1">
                    <CalendarBlank size={16} />
                    Joined {formatDate(userAccount.createdAt)}
                  </div>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Link to={`/profile/${userAccount.login}`} className="inline-block">
                <Button size="sm" variant="ghost">
                  View Public Profile
                </Button>
              </Link>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline">
                  <Pencil size={16} className="mr-2" />
                  Edit Profile
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Edit Profile</DialogTitle>
                  <DialogDescription>
                    Update your profile information
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="display-name">Display Name</Label>
                    <Input
                      id="display-name"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder={userAccount.username}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bio">Bio</Label>
                    <Textarea
                      id="bio"
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      placeholder="Tell us about yourself..."
                      rows={3}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="location">Location</Label>
                    <Input
                      id="location"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder="City, Country"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="website">Website</Label>
                    <Input
                      id="website"
                      type="url"
                      value={website}
                      onChange={(e) => setWebsite(e.target.value)}
                      placeholder="https://example.com"
                    />
                  </div>
                  <div className="flex justify-end gap-2 pt-4">
                    <Button variant="outline" onClick={() => setOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleSave}>Save Changes</Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
            </div>
            <Button
              variant="ghost"
              size="icon"
              aria-label={profileOpen ? 'Collapse profile' : 'Expand profile'}
              aria-expanded={profileOpen}
              onClick={() => setProfileOpen(v => !v)}
              data-slot="card-action"
            >
              {profileOpen ? <CaretDown size={18} /> : <CaretRight size={18} />}
            </Button>
          </div>
        </CardHeader>
        {profileOpen && <CardContent />}
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ChartBar size={24} />
            Contribution Statistics
          </CardTitle>
          <Button
            className="ml-auto"
            variant="ghost"
            size="icon"
            aria-label={statsOpen ? 'Collapse statistics' : 'Expand statistics'}
            aria-expanded={statsOpen}
            onClick={() => setStatsOpen(v => !v)}
            data-slot="card-action"
          >
            {statsOpen ? <CaretDown size={18} /> : <CaretRight size={18} />}
          </Button>
        </CardHeader>
        {statsOpen && (
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
        )}
      </Card>

      <CollapsibleCard
        iconLeft={<Package size={24} />}
        title="My Products"
        description="Products you can edit"
        defaultOpen
      >
          {loadingOwnedProducts && (
            <p className="text-sm text-muted-foreground">Loading your products...</p>
          )}
          {ownedProductsError && (
            <p className="text-sm text-destructive">{ownedProductsError}</p>
          )}
          {!loadingOwnedProducts && !ownedProductsError && ownedProducts.length === 0 && (
            <p className="text-sm text-muted-foreground">You do not own any products yet.</p>
          )}
          {!loadingOwnedProducts && ownedProducts.length > 0 && (
            <div className="grid gap-4 md:grid-cols-2">
              {ownedProducts.map((product) => (
                <div
                  key={product.id}
                  className="border rounded-lg p-4 hover:border-primary transition-colors cursor-pointer"
                  onClick={() => onProductClick?.(product)}
                  role={onProductClick ? 'button' : undefined}
                  tabIndex={onProductClick ? 0 : -1}
                  onKeyDown={(e) => {
                    if (!onProductClick) return
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      onProductClick(product)
                    }
                  }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <h3 className="font-semibold leading-tight">{product.name}</h3>
                      {product.description && (
                        <MarkdownText
                          text={product.description}
                          className="text-sm text-muted-foreground line-clamp-2"
                        />
                      )}
                    </div>
                    <div className="flex gap-1 flex-wrap justify-end">
                      {product.type && (
                        <Badge variant="outline" className="text-xs capitalize">
                          {product.type}
                        </Badge>
                      )}
                      {product.source && (
                        <Badge variant="secondary" className="text-xs capitalize">
                          {product.source}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                    <ul className="flex flex-wrap gap-1">
                      {product.tags?.slice(0, 3).map((tag) => (
                        <li><Badge key={tag} variant="secondary" className="text-[11px]">
                          {tag}
                        </Badge></li>
                      ))}
                      {product.tags && product.tags.length > 3 && (
                        <Badge variant="secondary" className="text-[11px]">+{product.tags.length - 3}</Badge>
                      )}
                    </ul>
                    {product.sourceUrl && (
                      <a
                        href={product.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-primary"
                        onClick={(e) => e.stopPropagation()}
                      >
                        View source
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
      </CollapsibleCard>

      <CollapsibleCard
        title="My Collections"
        description="View and manage your saved collections"
        defaultOpen
      >
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="text-sm text-muted-foreground">
            Keep track of the products you curate. Collections live here now.
          </div>
          <Button onClick={onCollectionsClick} disabled={!onCollectionsClick}>
            Open My Collections
          </Button>
        </div>
      </CollapsibleCard>

      {userAccount.role === 'admin' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Article size={24} />
              My Posts
            </CardTitle>
            <CardDescription>Blog posts you've authored</CardDescription>
            <Button
              className="ml-auto"
              variant="ghost"
              size="icon"
              aria-label={postsOpen ? 'Collapse posts' : 'Expand posts'}
              aria-expanded={postsOpen}
              onClick={() => setPostsOpen(v => !v)}
              data-slot="card-action"
            >
              {postsOpen ? <CaretDown size={18} /> : <CaretRight size={18} />}
            </Button>
          </CardHeader>
          {postsOpen && (
          <CardContent>
            {loadingBlogPosts && (
              <p className="text-sm text-muted-foreground">Loading your posts...</p>
            )}
            {!loadingBlogPosts && blogPosts.length === 0 && (
              <p className="text-sm text-muted-foreground">You haven't authored any blog posts yet.</p>
            )}
            {!loadingBlogPosts && blogPosts.length > 0 && (
              <div className="space-y-3">
                {blogPosts.map((post) => (
                  <div
                    key={post.id}
                    className="border rounded-lg p-4 hover:border-primary transition-colors cursor-pointer"
                    onClick={() => onBlogPostClick?.(post)}
                    role={onBlogPostClick ? 'button' : undefined}
                    tabIndex={onBlogPostClick ? 0 : -1}
                    onKeyDown={(e) => {
                      if (!onBlogPostClick) return
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        onBlogPostClick(post)
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
                          <span>{new Date(post.publishDate || post.createdAt).toLocaleDateString()}</span>
                          {post.published ? (
                            <Badge variant="secondary" className="text-xs">Published</Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs">Draft</Badge>
                          )}
                          {post.featured && <Badge variant="default" className="text-xs">Featured</Badge>}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
          )}
        </Card>
      )}

      <UserRequestsPanel user={user} userAccount={userAccount} />
    </div>
  )
}
