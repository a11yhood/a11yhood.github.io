import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { UserCircle, Check, X, Clock } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { UserAccount, UserRequest } from '@/lib/types'
import { APIService } from '@/lib/api'
import { toast } from 'sonner'

type ProductEditorsProps = {
  productId: string
  username: string | null
  isEditor: boolean
  userAccount?: UserAccount | null
  onEditorsChange?: () => void
  autoOpenRequestForm?: boolean
}

export function ProductEditors({
  productId,
  username,
  isEditor,
  userAccount,
  onEditorsChange,
  autoOpenRequestForm,
}: ProductEditorsProps) {
  const isBrowser = typeof window !== 'undefined'
  const [editors, setEditors] = useState<UserAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [requestMessage, setRequestMessage] = useState('')
  const [hasExistingRequest, setHasExistingRequest] = useState(false)
  const [pendingRequest, setPendingRequest] = useState<UserRequest | null>(null)
  const [showRequestForm, setShowRequestForm] = useState(false)

  useEffect(() => {
    if (!isBrowser) return
    loadEditors()
  }, [productId])

  useEffect(() => {
    if (!isBrowser) return
    checkExistingRequest()
  }, [productId, username])

  useEffect(() => {
    if (!isBrowser) return
    if (autoOpenRequestForm && !isEditor && !hasExistingRequest) {
      setShowRequestForm(true)
    }
  }, [autoOpenRequestForm, isEditor, hasExistingRequest])

  const loadEditors = async () => {
    if (!isBrowser) return
    try {
      const productEditors = await APIService.getProductOwners(productId)
      setEditors(productEditors)
    } catch (error) {
      // Silently handle 404 for product managers endpoint (legacy owners endpoint not yet implemented)
      if (error instanceof Error && !error.message.includes('404')) {
        console.error('Failed to load product managers:', error)
      }
    } finally {
      setLoading(false)
    }
  }

  const checkExistingRequest = async () => {
    if (!username) return
    
    try {
      const userRequests = (await APIService.getUserRequests(username)) || []
      const existingRequest = userRequests.find(
        r => r.type === 'product-ownership' && 
            r.productId === productId && 
            r.status === 'pending'
      )
      setHasExistingRequest(!!existingRequest)
      setPendingRequest(existingRequest || null)
    } catch (error) {
      // Silently handle 404 for user requests endpoint (not yet implemented)
      if (error instanceof Error && !error.message.includes('404')) {
        console.error('Failed to check existing request:', error)
      }
    }
  }

  const handleRequestEditor = async () => {
    if (!username) return

    try {
      const userAccount = await APIService.getUserAccount(username)
      if (!userAccount) {
        toast.error('User account not found')
        return
      }

      await APIService.createUserRequest({
        userId: userAccount.id,
        userName: userAccount.username,
        userAvatarUrl: userAccount.avatarUrl,
        type: 'product-ownership',
        message: requestMessage,
        productId,
      })

      toast.success('Management request submitted')
      setHasExistingRequest(true)
      setShowRequestForm(false)
      setRequestMessage('')
      checkExistingRequest()
    } catch (error) {
      console.error('Failed to submit editor request:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to submit request')
    }
  }

  const handleWithdrawRequest = async () => {
    if (!pendingRequest || !username) return

    try {
      await APIService.withdrawRequest(pendingRequest.id, username)
      toast.success('Request withdrawn')
      setHasExistingRequest(false)
      setPendingRequest(null)
    } catch (error) {
      console.error('Failed to withdraw request:', error)
      toast.error('Failed to withdraw request')
    }
  }

  const handleRemoveEditor = async (editorId: string) => {
    const canModerate = userAccount?.role === 'admin' || userAccount?.role === 'moderator'
    if (!canModerate) return

    try {
      await APIService.removeProductOwner(productId, editorId)
      toast.success('Manager removed')
      loadEditors()
      onEditorsChange?.()
    } catch (error) {
      console.error('Failed to remove manager:', error)
      toast.error('Failed to remove manager')
    }
  }

  if (!isBrowser) {
    return null
  }

  if (loading) {
    return null
  }

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <UserCircle size={20} />
        Editors
      </h3>

      {editors.length > 0 ? (
        <div className="space-y-3 mb-4">
          {editors.map((editor) => (
            <div key={editor.id} className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <Avatar className="w-8 h-8">
                  <AvatarImage src={editor.avatarUrl} alt={editor.username || editor.id} />
                  <AvatarFallback>
                    {(editor.username || editor.id || '??').slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <Link to={`/profile/${editor.username || editor.id}`} className="hover:underline">
                    <div className="text-sm font-medium">
                      {editor.username || editor.id}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      @{editor.username}
                    </div>
                  </Link>
                </div>
              </div>
              {(userAccount?.role === 'admin' || userAccount?.role === 'moderator') && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemoveEditor(editor.id)}
                  aria-label={`Remove ${editor.login} as editor`}
                >
                  <X size={16} />
                </Button>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground mb-4">
          This product has no editors yet.
        </p>
      )}

      {username && !isEditor && (
        <>
          {hasExistingRequest ? (
            <div className="bg-muted rounded-lg p-4 space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Clock size={16} className="text-muted-foreground" />
                <span>Editor request pending</span>
              </div>
              {pendingRequest?.message && (
                <p className="text-sm text-muted-foreground">
                  Your message: "{pendingRequest.message}"
                </p>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={handleWithdrawRequest}
                className="w-full"
              >
                Withdraw Request
              </Button>
            </div>
          ) : showRequestForm ? (
            <div className="space-y-3">
              <Textarea
                placeholder="Why would you like to be a manager of this product? (optional)"
                value={requestMessage}
                onChange={(e) => setRequestMessage(e.target.value)}
                className="min-h-[100px]"
              />
              <div className="flex gap-2">
                <Button
                  onClick={handleRequestEditor}
                  className="flex-1"
                >
                  <Check size={16} className="mr-2" />
                  Submit Request
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowRequestForm(false)
                    setRequestMessage('')
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <Button
              variant="outline"
              onClick={() => setShowRequestForm(true)}
              className="w-full"
            >
              Become an Editor
            </Button>
          )}
        </>
      )}

      {isEditor && (
        <Badge variant="secondary" className="w-full justify-center">
          <Check size={14} className="mr-1" />
          You are an editor
        </Badge>
      )}
    </Card>
  )
}
