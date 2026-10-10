import { Button } from '@/components/ui/button'
import { AdminUsersStats } from '@/components/AdminUsersStats'
import { UserAccount } from '@/lib/types'
import { useNavigate } from 'react-router-dom'

export function AdminUsersPage({ userAccount }: { userAccount: UserAccount | null }) {
    const navigate = useNavigate()

    const role = userAccount?.role
    const canAccess = role === 'admin' || role === 'moderator'

    if (!canAccess) {
        return (
            <div className="text-center py-12">
                <h1 className="text-2xl font-bold">Access denied</h1>
                <Button variant="outline" onClick={() => navigate('/admin')} className="mt-4">
                    Back to Admin
                </Button>
            </div>
        )
    }

    return <AdminUsersStats currentUserRole={role} />
}