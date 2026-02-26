import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { UserRequest, UserData, UserAccount } from '@/lib/types'
import { APIService } from '@/lib/api'
import { Clock, CheckCircle, XCircle, FolderOpen } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { RequestCard } from './RequestCard'

type UserRequestsPanelProps = {
  user: UserData
  userAccount?: UserAccount
  onNavigateToProduct?: (productId: string) => void
}

export function UserRequestsPanel({ user, userAccount, onNavigateToProduct }: UserRequestsPanelProps) {
  const [requests, setRequests] = useState<UserRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [showRequestDialog, setShowRequestDialog] = useState(false)
  const [requestType, setRequestType] = useState<'moderator' | 'admin'>('moderator')
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [withdrawingRequestId, setWithdrawingRequestId] = useState<string | null>(null)
  const [showWithdrawDialog, setShowWithdrawDialog] = useState(false)

  const userRole = userAccount?.role || 'user'

  // Admins do not see personal request cards (moderator/product manager) in their panel
  if (userRole === 'admin') {
    return null
  }

  useEffect(() => {
    loadRequests()
  }, [user.id])

  const loadRequests = async () => {
    setLoading(true)
    try {
      const userRequests = await APIService.getMyRequests()
      setRequests(userRequests)
    } catch (error) {
      console.error('Failed to load requests:', error)
    } finally {
      setLoading(false)
    }
  }


  const handleSubmitRequest = async () => {
    if (!message.trim()) {
      toast.error(`Please provide a message explaining why you want to become ${requestType === 'moderator' ? 'a moderator' : 'an admin'}`)
      return
    }

    setSubmitting(true)
    try {
      await APIService.createUserRequest({
        userId: user.id,
        userName: user.login,
        userAvatarUrl: user.avatarUrl,
        type: requestType,
        message: message.trim(),
      })
      
      toast.success('Your request has been submitted to the admins')
      setShowRequestDialog(false)
      setMessage('')
      await loadRequests()
    } catch (error) {
      if (error instanceof Error) {
        toast.error(error.message)
      } else {
        toast.error('Failed to submit request')
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
        toast.success('Request withdrawn successfully')
        await loadRequests()
      } else {
        toast.error('Failed to withdraw request')
      }
    } catch (error) {
      if (error instanceof Error) {
        toast.error(error.message)
      } else {
        toast.error('Failed to withdraw request')
      }
    } finally {
      setShowWithdrawDialog(false)
      setWithdrawingRequestId(null)
    }
  }

  const hasPendingModeratorRequest = requests.some(
    r => r.type === 'moderator' && r.status === 'pending'
  )

  const hasPendingAdminRequest = requests.some(
    r => r.type === 'admin' && r.status === 'pending'
  )

  const moderatorRequests = requests.filter(r => r.type === 'moderator' || r.type === 'admin')
  const productEditorRequests = requests.filter(r => r.type === 'product-ownership')

  // Users can request editor status (if not already editor or admin)
  const canRequestModerator = userRole === 'user' && !hasPendingModeratorRequest
  // Editors can request admin status (if not already admin)
  const canRequestAdmin = userRole === 'moderator' && !hasPendingAdminRequest
  // Admins cannot request anything - they're already at the top level
  const canShowRequestButton = canRequestModerator || canRequestAdmin

  const getStatusBadge = (status: UserRequest['status']) => {
    switch (status) {
      case 'pending':
        return (
          <Badge variant="secondary" className="flex items-center gap-1">
            <Clock size={14} />
            Pending
          </Badge>
        )
      case 'approved':
        return (
          <Badge className="flex items-center gap-1 bg-green-600 hover:bg-green-700">
            <CheckCircle size={14} />
            Approved
          </Badge>
        )
      case 'rejected':
        return (
          <Badge variant="destructive" className="flex items-center gap-1">
            <XCircle size={14} />
            Rejected
          </Badge>
        )
    }
  }

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
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
                      name: user.login,
                      username: user.login,
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
