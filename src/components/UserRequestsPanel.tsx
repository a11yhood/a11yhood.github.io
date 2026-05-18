import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { UserRequest, UserData, UserAccount } from '@/lib/types'
import { APIService } from '@/lib/api'
import { FolderOpen } from '@phosphor-icons/react'
import { useNotifications } from '@/contexts/NotificationContext'
import { RequestCard } from './RequestCard'

type UserRequestsPanelProps = {
  user: UserData
  userAccount?: UserAccount
  onNavigateToProduct?: (productId: string) => void
}

export function UserRequestsPanel({ user, userAccount, onNavigateToProduct: _onNavigateToProduct }: UserRequestsPanelProps) {
  const { notify } = useNotifications()
  const [requests, setRequests] = useState<UserRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [showRequestDialog, setShowRequestDialog] = useState(false)
  const [requestType] = useState<'moderator' | 'admin'>('moderator')
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [withdrawingRequestId, setWithdrawingRequestId] = useState<string | null>(null)
  const [showWithdrawDialog, setShowWithdrawDialog] = useState(false)

  const userRole = userAccount?.role || 'user'

  useEffect(() => {
    loadRequests()
  }, [user.id])

  // Admins do not see personal request cards (moderator/product manager) in their panel
  if (userRole === 'admin') {
    return null
  }

  const loadRequests = async () => {
    setLoading(true)
    try {
      const userRequests = await APIService.getMyRequests()
      setRequests(Array.isArray(userRequests) ? userRequests : [])
    } catch (error) {
      console.error('Failed to load requests:', error)
    } finally {
      setLoading(false)
    }
  }


  const handleSubmitRequest = async () => {
    if (!message.trim()) {
      notify.error(`Please provide a message explaining why you want to become ${requestType === 'moderator' ? 'a moderator' : 'an admin'}`)
      return
    }

    setSubmitting(true)
    try {
      await APIService.createUserRequest({
        userId: user.id,
        userName: user.username,
        userAvatarUrl: user.avatarUrl,
        type: requestType,
        message: message.trim(),
      })
      
      notify.success('Your request has been submitted to the admins')
      setShowRequestDialog(false)
      setMessage('')
      await loadRequests()
    } catch (error) {
      if (error instanceof Error) {
        notify.error(error.message)
      } else {
        notify.error('Failed to submit request')
      }
    } finally {
      setSubmitting(false)
    }
  }

  const handleWithdrawRequest = async () => {
    if (!withdrawingRequestId) return

    try {
      const result = await APIService.withdrawRequest(withdrawingRequestId, user.id)
      
      if (result.success) {
        notify.success('Request withdrawn successfully')
        await loadRequests()
      } else {
        notify.error('Failed to withdraw request')
      }
    } catch (error) {
      if (error instanceof Error) {
        notify.error(error.message)
      } else {
        notify.error('Failed to withdraw request')
      }
    } finally {
      setShowWithdrawDialog(false)
      setWithdrawingRequestId(null)
    }
  }

  const productEditorRequests = requests.filter(r => r.type === 'product-ownership')

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle as="h2" className="flex items-center gap-2">
            <FolderOpen size={24} />
            Product editor requests
          </CardTitle>
          <CardDescription>
            Track your product editor requests
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground text-center py-6">Loading product editor requests...</p>
          ) : productEditorRequests.length === 0 ? (
            <p className="text-sm text-muted-foreground">You haven't submitted any product editor requests yet.</p>
          ) : (
            <div className="space-y-3">
              {productEditorRequests.map((request) => (
                <RequestCard
                  key={request.id}
                  request={request}
                  userLookup={{
                    [user.id]: {
                      name: user.username,
                      username: user.username,
                      role: userAccount?.role || 'user',
                    },
                  }}
                  showActions={false}
                  onWithdraw={(req) => {
                    setWithdrawingRequestId(req.id)
                    setShowWithdrawDialog(true)
                  }}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Removed the bottom card that displayed "Editor and Admin request" */}

      <Dialog open={showRequestDialog} onOpenChange={setShowRequestDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {requestType === 'admin' ? 'Request Admin Status' : 'Request Editor Status'}
            </DialogTitle>
            <DialogDescription>
              {requestType === 'admin'
                ? "Tell us why you'd like to become an admin. Admins have full control over the platform and can manage all users and content."
                : "Tell us why you'd like to become an editor. Editors can edit products and help maintain the quality of the community."
              }
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="request-message">
                {requestType === 'admin' 
                  ? 'Why do you want to become an admin?' 
                  : 'Why do you want to become an editor?'
                }
              </Label>
              <Textarea
                id="request-message"
                placeholder="I've been an active member of the community and would like to help by..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={6}
                className="mt-2"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowRequestDialog(false)
                setMessage('')
              }}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button onClick={handleSubmitRequest} disabled={submitting}>
              {submitting ? 'Submitting...' : 'Submit Request'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showWithdrawDialog} onOpenChange={setShowWithdrawDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Request?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel this request? This action cannot be undone, and you'll need to submit a new request if you change your mind.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setWithdrawingRequestId(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleWithdrawRequest}
              className="bg-destructive hover:bg-destructive/90"
            >
              Cancel Request
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
