import { AdminLogs } from '@/components/AdminLogs'
import { Button } from '@/components/ui/button'
import { Product, UserAccount } from "@/lib/types"
import { useNavigate } from "react-router-dom"

export function AdminLogsPage({
    products,
    userAccount,
    ravelryAuthTimestamp,
    onProductsUpdate
}: {
    products: Product[]
    userAccount: UserAccount | null
    ravelryAuthTimestamp: number
    onProductsUpdate: (products: Product[]) => void
}) {
    const navigate = useNavigate()

    if (userAccount?.role !== 'admin') {
        return (
            <div className="text-center py-12">
                <p className="text-lg text-muted-foreground">Access denied</p>
                <Button variant="outline" onClick={() => navigate('/admin')} className="mt-4">
                    Back to Admin
                </Button>
            </div>
        )
    }

    return (
        <AdminLogs
            products={products}
            onProductsUpdate={onProductsUpdate}
            ravelryAuthTimestamp={ravelryAuthTimestamp}
        />
    )
}