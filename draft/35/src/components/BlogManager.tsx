import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { BlogPost } from '@/lib/types'
import { APIService } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Plus, Pen, Trash, Eye, EyeSlash, Star } from '@phosphor-icons/react'
import { toast } from 'sonner'

type BlogManagerProps = {
  onCreateNew: () => void
  onEditPost: (post: BlogPost) => void
  userAccount: { id: string; login: string } | null
  onPostsUpdate?: () => void
  reloadKey?: number
}

/**
 * BlogManager component for admin blog post management
 * Provides table view of all posts with CRUD operations and publishing controls
 */
export function BlogManager({ onCreateNew, onEditPost, userAccount, onPostsUpdate, reloadKey }: BlogManagerProps) {
  const [posts, setPosts] = useState<BlogPost[]>([])
  const [loading, setLoading] = useState(true)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [postToDelete, setPostToDelete] = useState<BlogPost | null>(null)
  const navigate = useNavigate()
  const canManagePosts = Boolean(userAccount)

  const loadPosts = useCallback(async () => {
    setLoading(true)
    try {
      // Get all posts including unpublished (admin view)
      const allPosts = await APIService.getAllBlogPosts(true)
      setPosts(allPosts)
    } catch (error) {
      console.error('Failed to load posts:', error)
      toast.error('Failed to load blog posts')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadPosts()
  }, [loadPosts, reloadKey])

  const handleTogglePublish = async (post: BlogPost) => {
    try {
      const updated = await APIService.updateBlogPost(post.id, {
        published: !post.published,
        publishedAt: !post.published ? Date.now() : undefined,
      })

      if (updated) {
        setPosts(posts.map(p => (p.id === post.id ? updated : p)))
        toast.success(
          updated.published ? 'Post published successfully' : 'Post unpublished successfully'
        )
        
        if (onPostsUpdate) {
          onPostsUpdate()
        }
      }
    } catch (error) {
      console.error('Failed to toggle publish:', error)
      toast.error('Failed to update post status')
    }
  }

  const handleToggleFeatured = async (post: BlogPost) => {
    try {
      const updated = await APIService.updateBlogPost(post.id, {
        featured: !post.featured,
      })

      if (updated) {
        setPosts(posts.map(p => (p.id === post.id ? updated : p)))
        toast.success(
          updated.featured ? 'Post featured successfully' : 'Post removed from featured'
        )
      }
    } catch (error) {
      console.error('Failed to toggle featured:', error)
      toast.error('Failed to update post')
    }
  }

  const handleDelete = async (post: BlogPost) => {
    setPostToDelete(post)
    setDeleteDialogOpen(true)
  }

  const confirmDelete = async () => {
    if (!postToDelete) return

    try {
      const result = await APIService.deleteBlogPost(postToDelete.id)

      if (result.success) {
        setPosts(posts.filter(p => p.id !== postToDelete.id))
        toast.success('Post deleted successfully')
        
        if (onPostsUpdate) {
          onPostsUpdate()
        }
      } else {
        toast.error('Failed to delete post')
      }
    } catch (error) {
      console.error('Failed to delete post:', error)
      toast.error('Failed to delete post')
    } finally {
      setDeleteDialogOpen(false)
      setPostToDelete(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Loading blog posts...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header with Create Button */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Blog Posts</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {posts.length} post{posts.length !== 1 ? 's' : ''} total
          </p>
        </div>
        <Button onClick={onCreateNew} disabled={!canManagePosts}>
          <Plus className="w-4 h-4 mr-2" />
          New Post
        </Button>
      </div>

      {/* Posts Table */}
      {posts.length > 0 ? (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Author</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Featured</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {posts.map((post) => (
                  <TableRow 
                    key={post.id} 
                    className="hover:bg-muted/40 cursor-pointer"
                    onClick={() => navigate(`/blog/${post.slug}`)}
                  >
                    {/* Title */}
                    <TableCell>
                      <div>
                        <p className="font-medium">{post.title}</p>
                        <p className="text-xs text-muted-foreground">{post.slug}</p>
                      </div>
                    </TableCell>

                    {/* Author */}
                    <TableCell>
                      <p className="text-sm">{post.authorName}</p>
                    </TableCell>

                    {/* Status */}
                    <TableCell>
                      <Badge variant={post.published ? 'default' : 'secondary'}>
                        {post.published ? 'Published' : 'Draft'}
                      </Badge>
                    </TableCell>

                    {/* Featured */}
                    <TableCell>
                      {post.featured && (
                        <Badge variant="outline" className="bg-yellow-500/10">
                          <Star className="w-3 h-3 mr-1 fill-yellow-500" />
                          Featured
                        </Badge>
                      )}
                    </TableCell>

                    {/* Date */}
                    <TableCell>
                      <p className="text-sm">
                        {new Date(post.publishedAt || post.createdAt).toLocaleDateString(
                          'en-US',
                          {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          }
                        )}
                      </p>
                    </TableCell>

                    {/* Actions */}
                    <TableCell>
                      <div className="flex justify-end gap-2">
                        {/* Publish/Unpublish Toggle */}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleTogglePublish(post)
                          }}
                          title={post.published ? 'Unpublish' : 'Publish'}
                        >
                          {post.published ? (
                            <Eye className="w-4 h-4" />
                          ) : (
                            <EyeSlash className="w-4 h-4" />
                          )}
                        </Button>

                        {/* Featured Toggle */}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleToggleFeatured(post)
                          }}
                          title={post.featured ? 'Remove from featured' : 'Add to featured'}
                        >
                          <Star
                            className="w-4 h-4"
                            fill={post.featured ? 'currentColor' : 'none'}
                          />
                        </Button>

                        {/* Edit Button */}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            onEditPost(post)
                          }}
                        >
                          <Pen className="w-4 h-4" />
                        </Button>

                        {/* Delete Button */}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDelete(post)
                          }}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">No blog posts yet</p>
            <Button onClick={onCreateNew} variant="outline" className="mt-4" disabled={!canManagePosts}>
              <Plus className="w-4 h-4 mr-2" />
              Create Your First Post
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Blog Post?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{postToDelete?.title}". This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
