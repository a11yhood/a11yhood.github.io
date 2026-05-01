import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { BlogPostDetail } from '@/components/BlogPostDetail'
import { BlogPostEditor } from '@/components/BlogPostEditor'
import { BlogPost, UserAccount } from '@/lib/types'
import { APIService } from '@/lib/api'
import { toast } from 'sonner'

export function BlogPostPage({ blogPosts, userAccount }: { blogPosts: BlogPost[], userAccount: UserAccount | null }) {
    const { slug } = useParams()
    const navigate = useNavigate()
    const [searchParams, setSearchParams] = useSearchParams()
    const isEditMode = searchParams.get('edit') === 'true'
    const post = blogPosts.find(p => p.slug === slug)
    const isAdmin = userAccount?.role === 'admin'

    if (!post) {
        return (
            <div className="text-center py-12">
                <h1 className="text-2xl font-bold mb-2">Blog Post Not Found</h1>
                <p className="text-lg text-muted-foreground">Blog post not found</p>
                <Button variant="outline" onClick={() => navigate('/blog')} className="mt-4">
                    Back to Blog
                </Button>
            </div>
        )
    }

    const handleSave = async (updatedPost: BlogPost) => {
        try {
            await APIService.updateBlogPost(post.id, updatedPost)
            toast.success('Blog post updated successfully')
            // Remove edit mode from URL
            setSearchParams({})
            // Reload blog posts
            window.location.reload()
        } catch (error) {
            toast.error('Failed to update blog post')
            console.error('Update error:', error)
        }
    }

    const handleCancelEdit = () => {
        setSearchParams({})
    }

    if (isEditMode && isAdmin && userAccount) {
        return (
            <div>
                <h1 className="text-3xl font-bold mb-6">Edit Blog Post</h1>
                <BlogPostEditor
                    post={post}
                    authorName={userAccount.username || 'Unknown'}
                    authorId={userAccount.id}
                    onSave={handleSave}
                    onCancel={handleCancelEdit}
                />
            </div>
        )
    }

    return (
        <BlogPostDetail
            post={post}
            onBack={() => navigate('/blog')}
            onEdit={isAdmin ? () => setSearchParams({ edit: 'true' }) : undefined}
        />
    )
}