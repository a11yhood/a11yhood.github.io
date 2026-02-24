/**
 * AdminUsersStats - User management and statistics page
 * 
 * Features:
 * - User activity tracking and contribution metrics
 * - User sorting by contributions, recent activity, or join date
 * - Role management (user, moderator, admin)
 * - Platform-wide statistics dashboard
 */
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { CollapsibleCard } from '@/components/CollapsibleCard'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { UserAccount } from '@/lib/types'
import { APIService } from '@/lib/api'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Users, TrendUp, ChatCircle, Star, Package, Calendar, CircleNotch } from '@phosphor-icons/react'
import { toast } from 'sonner'

type UserStats = {
  productsSubmitted: number
  ratingsGiven: number
  discussionsParticipated: number
  totalContributions: number
}

type UserWithStats = UserAccount & UserStats

export function AdminUsersStats() {
  const navigate = useNavigate()
  const [users, setUsers] = useState<UserWithStats[]>([])
  const [loading, setLoading] = useState(true)
  const [sortBy, setSortBy] = useState<'contributions' | 'recent' | 'joined'>('contributions')

  useEffect(() => {
    loadUsers()
  }, [])

  const loadUsers = async () => {
    setLoading(true)
    try {
      const allUsers = await APIService.getAllUsers()
      // Fetch stats for each user
      const usersWithStats: UserWithStats[] = await Promise.all(
        allUsers.map(async (user) => {
          const stats = await APIService.getUserStats(user.id)
          return {
            ...user,
            ...stats
          }
        })
      )
      setUsers(usersWithStats)
    } catch (error) {
      console.error('Failed to load users:', error)
        toast.error('Failed to load users')
      toast.error('Failed to load users')
    } finally {
      setLoading(false)
    }
  }

  const handleRoleChange = async (username: string, newRole: 'user' | 'moderator' | 'admin') => {
    try {
      await APIService.setUserRole(username, newRole)
      await loadUsers()
      toast.success(`User role updated to ${newRole}`)
    } catch (error) {
      console.error('Failed to update user role:', error)
      toast.error('Failed to update user role')
    }
  }

  const sortedUsers = [...users].sort((a, b) => {
    switch (sortBy) {
      case 'contributions':
        return b.totalContributions - a.totalContributions
      case 'recent':
        const bLastActive = a.lastActive ? new Date(a.lastActive).getTime() : 0
        const aLastActive = b.lastActive ? new Date(b.lastActive).getTime() : 0
        return aLastActive - bLastActive
      case 'joined':
        const bJoinedAt = b.joinedAt ? new Date(b.joinedAt).getTime() : 0
        const aJoinedAt = a.joinedAt ? new Date(a.joinedAt).getTime() : 0
        return bJoinedAt - aJoinedAt
      default:
        return 0
    }
  })

  const totalStats = {
    totalUsers: users.length,
    totalProducts: users.reduce((sum, u) => sum + (u.productsSubmitted || 0), 0),
    totalRatings: users.reduce((sum, u) => sum + (u.ratingsGiven || 0), 0),
    totalDiscussions: users.reduce((sum, u) => sum + (u.discussionsParticipated || 0), 0),
    totalContributions: users.reduce((sum, u) => sum + (u.totalContributions || 0), 0),
  }

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const formatRelativeTime = (timestamp: string | number | undefined) => {
    if (!timestamp) return 'never'
    const ts = typeof timestamp === 'string' ? new Date(timestamp).getTime() : timestamp
    const seconds = Math.floor((Date.now() - ts) / 1000)
    
    if (seconds < 60) return 'just now'
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`
    if (seconds < 2592000) return `${Math.floor(seconds / 604800)}w ago`
    return formatDate(ts)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <CircleNotch size={48} className="animate-spin mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">Loading users and statistics...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Button variant="ghost" onClick={() => navigate('/admin')} className="mb-2">
            ← Back to Admin
          </Button>
          <h1 className="text-3xl font-bold">Users & Statistics</h1>
          <p className="text-muted-foreground mt-1">
            View and manage community members and platform metrics
          </p>
        </div>
      </div>

      {/* Statistics Cards */}
      <CollapsibleCard
        title="Platform Statistics"
        description="Overview of community activity"
        defaultOpen
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users size={20} className="text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{totalStats.totalUsers}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Registered community members
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Contributions</CardTitle>
              <TrendUp size={20} className="text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{totalStats.totalContributions}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Combined community activity
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Products Submitted</CardTitle>
              <Package size={20} className="text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{totalStats.totalProducts}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Tools added to database
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Ratings Given</CardTitle>
              <Star size={20} className="text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{totalStats.totalRatings}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Product ratings submitted
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Discussions</CardTitle>
              <ChatCircle size={20} className="text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{totalStats.totalDiscussions}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Discussion contributions
              </p>
            </CardContent>
          </Card>
        </div>
      </CollapsibleCard>

      {/* Users Table */}
      <CollapsibleCard
        title="All Users"
        description="View and manage community members"
        defaultOpen
      >
        <div className="flex justify-end mb-3">
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Sort users" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="contributions">Top Contributors</SelectItem>
              <SelectItem value="recent">Recent Activity</SelectItem>
              <SelectItem value="joined">Newest</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          {users.length === 0 ? (
            <div className="text-center py-12">
              <Users size={48} className="mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">No users found</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead className="text-center">Products</TableHead>
                    <TableHead className="text-center">Ratings</TableHead>
                    <TableHead className="text-center">Discussions</TableHead>
                    <TableHead className="text-center">Total</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead>Last Active</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="w-10 h-10">
                            <AvatarImage src={user.avatarUrl} alt={user.username} />
                            <AvatarFallback>
                              {user.username.slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium">{user.username}</div>
                            <div className="text-sm text-muted-foreground">{user.email || '—'}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Select
                          value={user.role || 'user'}
                          onValueChange={(value: 'user' | 'moderator' | 'admin') => 
                            handleRoleChange(user.username || user.id, value)
                          }
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="user">User</SelectItem>
                            <SelectItem value="moderator">Moderator</SelectItem>
                            <SelectItem value="admin">Admin</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-center">
                        {user.productsSubmitted > 0 ? (
                          <Badge variant="secondary">{user.productsSubmitted}</Badge>
                        ) : (
                          <span className="text-muted-foreground">0</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {user.ratingsGiven > 0 ? (
                          <Badge variant="secondary">{user.ratingsGiven}</Badge>
                        ) : (
                          <span className="text-muted-foreground">0</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {user.discussionsParticipated > 0 ? (
                          <Badge variant="secondary">{user.discussionsParticipated}</Badge>
                        ) : (
                          <span className="text-muted-foreground">0</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant={user.totalContributions > 0 ? "default" : "outline"}>
                          {user.totalContributions}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar size={14} />
                          {user.joinedAt ? formatDate(new Date(user.joinedAt).getTime()) : 'Unknown'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-muted-foreground">
                          {formatRelativeTime(user.lastActive)}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </CollapsibleCard>
    </div>
  )
}
