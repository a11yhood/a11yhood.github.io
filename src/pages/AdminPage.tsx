import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { AdminDashboard } from '@/components/AdminDashboard'
import { Product, UserAccount } from '@/lib/types'

export function AdminPage({
    products,
    userAccount,
    ravelryAuthTimestamp,
    onProductsUpdate,
    onBlogPostsUpdate,
    adminVerboseLoggingEnabled,
    onAdminVerboseLoggingChange,
}: {
    products: Product[]
    userAccount: UserAccount | null
    ravelryAuthTimestamp: number
    onProductsUpdate: (products: Product[]) => void
    onBlogPostsUpdate: () => void
    adminVerboseLoggingEnabled: boolean
    onAdminVerboseLoggingChange: (enabled: boolean) => void
}) {
    const navigate = useNavigate()

    const role = userAccount?.role
    const canAccess = role === 'admin' || role === 'moderator'
    if (!canAccess) {
        return (
            <div className="text-center py-12">
                <p className="text-lg text-muted-foreground">Access denied</p>
                <Button variant="outline" onClick={() => navigate('/')} className="mt-4">
                    Back to Home
                </Button>
            </div>
        )
    }

    return (
        <AdminDashboard
            onBack={() => navigate('/')}
            products={products}
            onProductsUpdate={onProductsUpdate}
            userAccount={userAccount}
            ravelryAuthTimestamp={ravelryAuthTimestamp}
            onBlogPostsUpdate={onBlogPostsUpdate}
            adminVerboseLoggingEnabled={adminVerboseLoggingEnabled}
            onAdminVerboseLoggingChange={onAdminVerboseLoggingChange}
        />
    )
}