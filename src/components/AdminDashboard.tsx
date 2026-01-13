/**
 * AdminDashboard - Platform administration interface
 * 
 * Main admin panel showing:
 * - Products: Unified view with ScraperManager (scraper + user products)
 * - Requests: Role requests and product management requests
 * 
 * Features:
 * - Product ban/unban to prevent scraper updates
 * - Bulk operations by source (Thingiverse, Ravelry, GitHub, User-Submitted)
 * - Request management for moderators and admins
 * 
 * Additional admin pages accessible via menu:
 * - Users & Stats: /admin/users
 * - Logs: /admin/logs (authorization + scraping)
 */
import { useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { CollapsibleCard } from '@/components/CollapsibleCard'
import { Button } from '@/components/ui/button'
import { UserAccount, Product, BlogPost } from '@/lib/types'
import { ScraperManager } from '@/components/ScraperManager'
import { AdminRequestsPanel } from '@/components/AdminRequestsPanel'
import { CircleNotch } from '@phosphor-icons/react'
import { RavelrySettings } from '@/components/RavelrySettings'
import { ThingiverseSettings } from '@/components/ThingiverseSettings'
import { BlogManager } from '@/components/BlogManager'
import { BlogPostEditor } from '@/components/BlogPostEditor'
import { GitHubSettings } from '@/components/GitHubSettings'
import { GOATSettings } from '@/components/GOATSettings'

type AdminDashboardProps = {
  onBack: () => void
  products: Product[]
  onProductsUpdate: (products: Product[]) => void
  userAccount: UserAccount | null
  ravelryAuthTimestamp?: number
  onBlogPostsUpdate?: () => void
}

export function AdminDashboard({ onBack, products, onProductsUpdate, userAccount, ravelryAuthTimestamp, onBlogPostsUpdate }: AdminDashboardProps) {
  const [loading, setLoading] = useState(false)
  const [showBlogEditor, setShowBlogEditor] = useState(false)
  const [blogEditorPost, setBlogEditorPost] = useState<BlogPost | null>(null)
  const [blogManagerReloadKey, setBlogManagerReloadKey] = useState(0)
  // Collapsing for main sections handled by CollapsibleCard

  const handleOpenNewPost = () => {
    setBlogEditorPost(null)
    setShowBlogEditor(true)
  }

  const handleEditPost = (post: BlogPost) => {
    setBlogEditorPost(post)
    setShowBlogEditor(true)
  }

  const handleCloseEditor = () => {
    setShowBlogEditor(false)
    setBlogEditorPost(null)
  }

  const handleBlogSaved = () => {
    setShowBlogEditor(false)
    setBlogEditorPost(null)
    setBlogManagerReloadKey((key) => key + 1)
    onBlogPostsUpdate?.()
  }

  useEffect(() => {
    // Ensure we never show a section a moderator cannot access
    if (userAccount?.role === 'moderator') {
      // Moderators can access admin panel for requests
      setLoading(false)
    }
  }, [userAccount?.role])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <CircleNotch size={48} className="animate-spin mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">Loading admin dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Button variant="ghost" onClick={onBack} className="mb-2">
            ← Back to Products
          </Button>
          <h1 className="text-3xl font-bold">{userAccount?.role === 'admin' ? 'Admin Dashboard' : 'Moderator Dashboard'}</h1>
          <p className="text-muted-foreground mt-1">
            {userAccount?.role === 'admin'
              ? 'Manage products and review requests'
              : 'Review editor requests and track your account'}
          </p>
        </div>
      </div>

      {/* Products Section */}
      {userAccount?.role === 'admin' && (
        <div className="space-y-6 mt-6">
          <CollapsibleCard
            title="External Product Scraper"
            description="Manage scrapers and unify imported products"
            defaultOpen
          >
            <div className="space-y-6">
              <ScraperManager 
                products={products} 
                onProductsUpdate={onProductsUpdate}
                role={userAccount?.role}
                currentUserId={userAccount?.id}
              />
            </div>
          </CollapsibleCard>
          <CollapsibleCard
            title="News & Blog Posts"
            description="Publish announcements and feature news posts"
            defaultOpen
          >
            {showBlogEditor ? (
              <BlogPostEditor
                post={blogEditorPost ?? undefined}
                authorName={userAccount?.username ?? 'Admin'}
                authorId={userAccount?.id ?? ''}
                onSave={handleBlogSaved}
                onCancel={handleCloseEditor}
              />
            ) : (
              <BlogManager
                onCreateNew={handleOpenNewPost}
                onEditPost={handleEditPost}
                userAccount={userAccount ? { id: userAccount.id, login: userAccount.username } : null}
                onPostsUpdate={onBlogPostsUpdate}
                reloadKey={blogManagerReloadKey}
              />
            )}
          </CollapsibleCard>
          <CollapsibleCard
            title="Authorization Settings"
            description="Manage Ravelry, Thingiverse, GitHub, and GOAT OAuth credentials"
            defaultOpen
          >
            <div className="space-y-6">
              <RavelrySettings
                products={products}
                onProductsUpdate={onProductsUpdate}
                ravelryAuthTimestamp={ravelryAuthTimestamp}
              />
              <ThingiverseSettings
                products={products}
                onProductsUpdate={onProductsUpdate}
              />
              <GitHubSettings
                products={products}
                onProductsUpdate={onProductsUpdate}
              />
              <GOATSettings
                products={products}
                onProductsUpdate={onProductsUpdate}
              />
            </div>
          </CollapsibleCard>
        </div>
      )}

      {/* Requests Section */}
      <div className="space-y-6 mt-6">
        {userAccount ? (
          <AdminRequestsPanel 
            adminId={userAccount.id} 
            products={products}
            canManageRoleRequests={userAccount.role === 'admin'}
          />
        ) : (
          <Card>
            <CardContent className="pt-6">
              <p className="text-muted-foreground text-center py-8">
                Loading user account...
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
