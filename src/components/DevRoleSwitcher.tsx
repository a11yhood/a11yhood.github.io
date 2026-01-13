/**
 * Dev/Test Mode Only: User Switcher
 *
 * Switches between the fixed dev accounts (admin/moderator/user)
 * by updating localStorage and reloading, so auth context picks up
 * the new user identity and role together.
 * 
 * Only visible in test/dev mode (import.meta.env.MODE === 'test')
 */
import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { UserAccount } from '@/lib/types'
import { toast } from 'sonner'

type DevRoleSwitcherProps = {
  userAccount: UserAccount | null
  onRoleChange?: (newRole: string) => void
}

export function DevRoleSwitcher({ userAccount, onRoleChange }: DevRoleSwitcherProps) {
  const [selectedUser, setSelectedUser] = useState<'user' | 'moderator' | 'admin'>('user')
  const [isSwitching, setIsSwitching] = useState(false)
  const [isOpen, setIsOpen] = useState(true)

  useEffect(() => {
    // Prefer explicit dev-user selection if present
    const devUser = (localStorage.getItem('dev-user') as 'user' | 'moderator' | 'admin' | null)
    if (devUser === 'user' || devUser === 'moderator' || devUser === 'admin') {
      setSelectedUser(devUser)
      return
    }
    // Fallback to current account role
    if (userAccount?.role) {
      setSelectedUser(userAccount.role as 'user' | 'moderator' | 'admin')
    }
  }, [userAccount?.role])

  const handleUserChange = async (newUser: string) => {
    const validUser = ['user', 'moderator', 'admin'].includes(newUser)
      ? (newUser as 'user' | 'moderator' | 'admin')
      : 'user'

    setIsSwitching(true)
    try {
      localStorage.setItem('dev-user', validUser)
      setSelectedUser(validUser)
      toast.success(`Switched to ${validUser} account`)
      // Reload so DevAuthContext picks up the new user identity
      await new Promise((resolve) => setTimeout(resolve, 150))
      window.location.reload()
    } catch (error) {
      console.error('Failed to switch user:', error)
      toast.error('Failed to switch user')
      setSelectedUser(userAccount?.role as 'user' | 'moderator' | 'admin' || 'user')
    } finally {
      setIsSwitching(false)
    }
  }

  if (!isOpen) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <Button
          variant="secondary"
          size="icon"
          className="h-11 w-11 rounded-full shadow-lg border border-blue-200 bg-blue-50 text-blue-800"
          onClick={() => setIsOpen(true)}
          aria-label="Expand dev role switcher"
        >
          🧪
        </Button>
      </div>
    )
  }

  return (
    <Card className="fixed bottom-4 right-4 w-80 shadow-lg border-blue-200 bg-blue-50 z-50">
      <CardHeader className="pb-2 flex items-center justify-between gap-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <span className="inline-block w-2 h-2 bg-blue-500 rounded-full"></span>
          Dev Mode: Role Switcher
        </CardTitle>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsOpen(false)}
          aria-expanded={isOpen}
          aria-label="Collapse dev role switcher"
          className="h-8 px-2"
        >
          Hide
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground">Active Dev Account</label>
          <Select value={selectedUser} onValueChange={handleUserChange} disabled={isSwitching}>
            <SelectTrigger className="bg-(--color-bg)">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="user">👤 regular_user</SelectItem>
              <SelectItem value="moderator">🛡️ moderator_user</SelectItem>
              <SelectItem value="admin">👑 admin_user</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="pt-1 border-t border-blue-200">
          <p className="text-xs text-blue-700 leading-snug">
            {selectedUser === 'user' && '✓ Testing regular user permissions'}
            {selectedUser === 'moderator' && '✓ Testing moderator permissions'}
            {selectedUser === 'admin' && '✓ Testing admin permissions (all features)'}
          </p>
        </div>

        <div className="text-xs text-muted-foreground space-y-1">
          <div>Logged in as: <span className="font-mono font-semibold">{userAccount?.username}</span></div>
          <div>Current dev-user: <span className="font-mono">{selectedUser}</span></div>
          <div className="flex items-center gap-2">
            <span>Role:</span>
            <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200">
              {userAccount?.role ?? 'unknown'}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
