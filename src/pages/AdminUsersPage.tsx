import { Button } from '@/components/ui/button'
import { AdminUsersStats } from '@/components/AdminUsersStats'
import { UserAccount } from '@/lib/types'
import { useNavigate } from 'react-router-dom'

export function AdminUsersPage({ userAccount }: { userAccount: UserAccount | null }) {
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

    return <AdminUsersStats />
}