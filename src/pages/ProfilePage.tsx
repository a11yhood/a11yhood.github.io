import { Button } from '@/components/ui/button'
import { UserProfile } from '@/components/UserProfile'
import { UserData, UserAccount } from '@/lib/types'
import { useNavigate } from 'react-router-dom'

export function ProfilePage({
    user,
    userAccount,
    onUpdate
}: {
    user: UserData
    userAccount: UserAccount
    onUpdate: () => void
}) {
    const navigate = useNavigate()

    return (
        <div>
            <Button variant="outline" onClick={() => navigate('/')} className="mb-6">
                ← Back to Products
            </Button>
            <UserProfile
                userAccount={userAccount}
                user={user}
                onUpdate={onUpdate}
                onProductClick={(product) => navigate(`/product/${product.slug ?? product.id}`)}
                onCollectionsClick={() => navigate('/collections')}
                onBlogPostClick={(post) => navigate(`/blog/${post.slug}`)}
            />
        </div>
    )
}