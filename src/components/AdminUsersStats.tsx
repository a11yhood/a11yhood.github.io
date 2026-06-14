/**
 * AdminUsersStats - User management and statistics page
 * 
 * Features:
 * - User activity tracking and contribution metrics
 * - User sorting by contributions, recent activity, or join date
 * - Role management (user, moderator, admin)
 * - Platform-wide statistics dashboard
 */
import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Link } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
import { useNotifications } from '@/contexts/NotificationContext'

type UserStats = {
  productsSubmitted: number
  collectionsCreated: number
  ratingsGiven: number
  discussionsParticipated: number
  totalContributions: number
}

type UserWithStats = UserAccount & Partial<UserStats> & {
  statsLoaded: boolean
}

const asFiniteNumber = (value: unknown): number | null => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null
  return value
}

const normalizeStats = (input: Partial<UserStats>): UserStats => {
  const productsSubmitted = asFiniteNumber(input.productsSubmitted) ?? 0
  const collectionsCreated = asFiniteNumber(input.collectionsCreated) ?? 0
  const ratingsGiven = asFiniteNumber(input.ratingsGiven) ?? 0
  const discussionsParticipated = asFiniteNumber(input.discussionsParticipated) ?? 0
  const totalContributions =
    asFiniteNumber(input.totalContributions) ??
    productsSubmitted + collectionsCreated + ratingsGiven + discussionsParticipated

  return {
    productsSubmitted,
    collectionsCreated,
    ratingsGiven,
    discussionsParticipated,
    totalContributions,
  }
}

const tryReadEmbeddedStats = (user: UserAccount): UserStats | null => {
  const maybeStats = user as UserAccount & Partial<UserStats>
  const hasAnyEmbeddedStat =
    asFiniteNumber(maybeStats.productsSubmitted) !== null ||
    asFiniteNumber(maybeStats.collectionsCreated) !== null ||
    asFiniteNumber(maybeStats.ratingsGiven) !== null ||
    asFiniteNumber(maybeStats.discussionsParticipated) !== null ||
    asFiniteNumber(maybeStats.totalContributions) !== null

  if (!hasAnyEmbeddedStat) return null
  return normalizeStats(maybeStats)
}

const mapWithConcurrency = async <T, R>(
  items: T[],
  concurrency: number,
  mapper: (item: T, index: number) => Promise<R>
): Promise<R[]> => {
  if (items.length === 0) return []

  const cappedConcurrency = Math.max(1, Math.min(concurrency, items.length))
  const results: R[] = new Array(items.length)
  let nextIndex = 0

  const worker = async () => {
    while (true) {
      const currentIndex = nextIndex
      nextIndex += 1
      if (currentIndex >= items.length) return
      results[currentIndex] = await mapper(items[currentIndex], currentIndex)
    }
  }

  await Promise.all(Array.from({ length: cappedConcurrency }, () => worker()))
  return results
}

export function AdminUsersStats({ currentUserRole = 'admin' }: { currentUserRole?: 'user' | 'moderator' | 'admin' }) {
  const { notify } = useNotifications()
  const navigate = useNavigate()
  const [users, setUsers] = useState<UserWithStats[]>([])
  const [loadingUsers, setLoadingUsers] = useState(true)
  const [sortBy, setSortBy] = useState<'contributions' | 'recent' | 'joined'>('contributions')
  const canManageRoles = currentUserRole === 'admin'

  const loadUsers = useCallback(async () => {
    setLoadingUsers(true)
    try {
      const allUsers = await APIService.getAllUsers()

      setUsers(allUsers.map((user) => ({ ...user, statsLoaded: false })))
      setLoadingUsers(false)

      await mapWithConcurrency(
        allUsers,
        4,
        async (user) => {
          try {
            const embeddedStats = tryReadEmbeddedStats(user)
            const fetchedStats = embeddedStats ?? await APIService.getUserStats(user.id)
            const normalizedStats = normalizeStats(fetchedStats)

            setUsers((currentUsers) =>
              currentUsers.map((currentUser) =>
                currentUser.id === user.id
                  ? {
                    ...currentUser,
                    ...normalizedStats,
                    statsLoaded: true,
                  }
                  : currentUser
              )
            )
          } catch (error) {
            console.warn('[AdminUsersStats] Failed to load stats for user', { userId: user.id, error })
            setUsers((currentUsers) =>
              currentUsers.map((currentUser) =>
                currentUser.id === user.id
                  ? {
                    ...currentUser,
                    statsLoaded: true,
                  }
                  : currentUser
              )
            )
          }
        }
      )
    } catch (error) {
      console.error('Failed to load users:', error)
      notify.error('Failed to load users')
      setUsers([])
      setLoadingUsers(false)
    } finally {
      setLoadingUsers(false)
    }
  }, [notify])

  useEffect(() => {
    void loadUsers()
  }, [loadUsers])

  const handleRoleChange = async (username: string, newRole: 'user' | 'moderator' | 'admin') => {
    if (!canManageRoles) {
      notify.error('Only admins can change user roles')
      return
    }

    try {
      await APIService.setUserRole(username, newRole)
      await loadUsers()
      notify.success(`User role updated to ${newRole}`)
    } catch (error) {
      console.error('Failed to update user role:', error)
      notify.error('Failed to update user role')
    }
  }

  const sortedUsers = [...users].sort((a, b) => {
    switch (sortBy) {
      case 'contributions':
        return (b.totalContributions ?? -1) - (a.totalContributions ?? -1)
      case 'recent': {
        const bLastActive = a.lastActive ? new Date(a.lastActive).getTime() : 0
        const aLastActive = b.lastActive ? new Date(b.lastActive).getTime() : 0
        return aLastActive - bLastActive
      }
      case 'joined': {
        const bJoinedAt = b.joinedAt ? new Date(b.joinedAt).getTime() : 0
        const aJoinedAt = a.joinedAt ? new Date(a.joinedAt).getTime() : 0
        return bJoinedAt - aJoinedAt
      }
      default:
        return 0
    }
  })

  const totalStats = {
    totalUsers: users.length,
    totalProducts: users.reduce((sum, u) => sum + (u.productsSubmitted ?? 0), 0),
    totalRatings: users.reduce((sum, u) => sum + (u.ratingsGiven ?? 0), 0),
    totalDiscussions: users.reduce((sum, u) => sum + (u.discussionsParticipated ?? 0), 0),
    totalContributions: users.reduce((sum, u) => sum + (u.totalContributions ?? 0), 0),
  }

  const loadedStatsCount = users.filter((user) => user.statsLoaded).length

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

  const renderStatsCell = (value: number | undefined) => {
    if (typeof value !== 'number') {
      return <span className="text-muted-foreground">...</span>
    }

    if (value > 0) {
      return <Badge variant="secondary">{value}</Badge>
    }

    return <span className="text-muted-foreground">0</span>
  }

  if (loadingUsers) {
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
          <p className="text-xs text-muted-foreground mt-1" role="status" aria-live="polite">
            Loaded stats for {loadedStatsCount} of {users.length} users
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
              <CardTitle as="h2" className="text-sm font-medium">Total Users</CardTitle>
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
              <CardTitle as="h2" className="text-sm font-medium">Total Contributions</CardTitle>
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
              <CardTitle as="h2" className="text-sm font-medium">Products Submitted / Edited</CardTitle>
              <Package size={20} className="text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{totalStats.totalProducts}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Tools submitted or editor-managed
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle as="h2" className="text-sm font-medium">Ratings Given</CardTitle>
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
              <CardTitle as="h2" className="text-sm font-medium">Discussions</CardTitle>
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
          <label htmlFor="users-sort-select" className="sr-only">Sort users by</label>
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
            <SelectTrigger id="users-sort-select" className="w-48">
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
                <caption>
                  User statistics and role management table showing contribution counts, join date, and last active time.
                </caption>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead className="text-center">Products Submitted / Edited</TableHead>
                    <TableHead className="text-center">Collections</TableHead>
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
                            <div className="font-medium">
                              {user.username ? (
                                <Link
                                  to={`/profile/${encodeURIComponent(user.username)}`}
                                  className="underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-sm"
                                  aria-label={`View ${user.username}'s profile`}
                                >
                                  {user.username}
                                </Link>
                              ) : (
                                'Unknown user'
                              )}
                            </div>
                            <div className="text-sm text-muted-foreground">{user.email || '—'}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {canManageRoles ? (
                          <select
                            className="w-32 rounded-md border border-input bg-background px-2 py-1 text-sm"
                            aria-label={`Role for ${user.username || user.id}`}
                            value={user.role || 'user'}
                            onChange={(event) =>
                              handleRoleChange(
                                user.username || user.id,
                                event.target.value as 'user' | 'moderator' | 'admin'
                              )
                            }
                          >
                            <option value="user">User</option>
                            <option value="moderator">Moderator</option>
                            <option value="admin">Admin</option>
                          </select>
                        ) : (
                          <Badge variant="outline" className="capitalize">{user.role || 'user'}</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {renderStatsCell(user.productsSubmitted)}
                      </TableCell>
                      <TableCell className="text-center">
                        {renderStatsCell(user.collectionsCreated)}
                      </TableCell>
                      <TableCell className="text-center">
                        {renderStatsCell(user.ratingsGiven)}
                      </TableCell>
                      <TableCell className="text-center">
                        {renderStatsCell(user.discussionsParticipated)}
                      </TableCell>
                      <TableCell className="text-center">
                        {typeof user.totalContributions === 'number' ? (
                          <Badge variant={user.totalContributions > 0 ? 'default' : 'outline'}>
                            {user.totalContributions}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">...</span>
                        )}
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
