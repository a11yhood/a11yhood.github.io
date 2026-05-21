import { Button } from '@/components/ui/button'
import { BlogPostList } from '@/components/BlogPostList'
import { BlogPost, UserAccount } from '@/lib/types'
import { useNavigate } from 'react-router-dom'

interface BlogPageProps {
    blogPosts: BlogPost[]
    blogPostsLoading: boolean
    userAccount: UserAccount | null
}



export function BlogPage({ blogPosts, blogPostsLoading, userAccount }: { blogPosts: BlogPost[], blogPostsLoading: boolean, userAccount: UserAccount | null }) {
    const navigate = useNavigate()
    const isAdmin = userAccount?.role === 'admin'

    return (
        <div>
            <div className="mb-6 flex items-center justify-between">
                <h1 className="text-3xl font-bold">Blog</h1>
                <div className="flex items-center gap-2">
                    {isAdmin && (
                        <Button variant="outline" onClick={() => navigate('/admin')}>
                            Manage Posts
                        </Button>
                    )}
                    <Button variant="outline" onClick={() => navigate('/')} className="flex items-center gap-2">
                        ← Back to Products
                    </Button>
                </div>
            </div>
            <BlogPostList
                posts={blogPosts}
                isLoading={blogPostsLoading}
                onSelectPost={(post) => navigate(`/blog/${post.slug}`)}
            />
        </div>
    )
}