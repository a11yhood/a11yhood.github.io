import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { CollapsibleCard } from '@/components/CollapsibleCard'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { UserRequest, Product, UserAccount } from '@/lib/types'
import { APIService } from '@/lib/api'
import { ShieldCheck, Clock, CheckCircle, XCircle, User as UserIcon, Package, Trash } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { RequestCard } from './RequestCard'
import { Link } from 'react-router-dom'

type AdminRequestsPanelProps = {
  adminId: string
  products?: Product[]
  canManageRoleRequests?: boolean
}

export function AdminRequestsPanel({ adminId, products = [], canManageRoleRequests = true }: AdminRequestsPanelProps) {
  const [allRequests, setAllRequests] = useState<UserRequest[]>([])
  const [loading, setLoading] = useState(true)
  // Collapsible handled by CollapsibleCard
  const [reviewingRequest, setReviewingRequest] = useState<UserRequest | null>(null)
  const [reviewNote, setReviewNote] = useState('')
  const [reviewAction, setReviewAction] = useState<'approve' | 'reject' | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [userLookup, setUserLookup] = useState<Record<string, UserAccount>>({})

  useEffect(() => {
    loadRequests()
  }, [])

  useEffect(() => {
    const resolveUserLookup = async () => {
      const ids = Array.from(new Set(
        allRequests
          .map(r => r.userId)
          .filter(Boolean)
      ))
      
      const missing = ids.filter(id => !userLookup[id])
      if (missing.length === 0) return

      try {
        const entries = await Promise.all(
          missing.map(async (id) => {
            try {
              const account = await APIService.getUserAccount(id)
              return [id, account] as const
            } catch (error) {
              console.warn('Failed to load user account', { id, error })
              return [id, { role: 'user' } as UserAccount] as const
            }
          })
        )

        setUserLookup((prev) => ({ 
          ...prev, 
          ...Object.fromEntries(entries) 
        }))
      } catch (error) {
        console.error('Failed to resolve user lookup:', error)
      }
    }

    resolveUserLookup()
  }, [allRequests, userLookup])

  const loadRequests = async () => {
    setLoading(true)
    try {
      const requests = await APIService.getAllRequests()
      setAllRequests(requests)
    } catch (error) {
      console.error('Failed to load requests:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleReviewRequest = async (request: UserRequest, action: 'approve' | 'reject') => {
    if (!canManageRoleRequests && (request.type === 'admin' || request.type === 'moderator')) {
      toast.error('Only admins can review role change requests')
      return
    }

    try {
      console.log('handleReviewRequest called with:', { requestId: request.id, action })
      
      const freshRequests = await APIService.getAllRequests()
      console.log('Fresh requests loaded:', freshRequests.length)
      
      const freshRequest = freshRequests.find(r => r.id === request.id)
      console.log('Fresh request found:', freshRequest ? 'Yes' : 'No')
      
      if (!freshRequest) {
        console.error('Request not found in fresh list. Request ID:', request.id)
        console.error('Available request IDs:', freshRequests.map(r => r.id))
        toast.error('Request no longer exists. The list has been refreshed.')
        await loadRequests()
        return
      }
      
      if (freshRequest.status !== 'pending') {
        toast.error(`This request has already been ${freshRequest.status}`)
        await loadRequests()
        return
      }
      
      console.log('Setting reviewingRequest with ID:', freshRequest.id)
      setReviewingRequest(freshRequest)
      setReviewAction(action)
      setReviewNote('')
    } catch (error) {
      console.error('Failed to load fresh request:', error)
      toast.error('Failed to load request details')
    }
  }

  const handleSubmitReview = async () => {
    if (!reviewingRequest || !reviewAction) {
      console.error('Missing reviewingRequest or reviewAction')
      return
    }

    if (!canManageRoleRequests && (reviewingRequest.type === 'admin' || reviewingRequest.type === 'moderator')) {
      toast.error('Only admins can review role change requests')
      return
    }
    
    if (!adminId) {
      toast.error('Admin ID not available. Please refresh the page.')
      return
    }

    setSubmitting(true)
    try {
      console.log('=== SUBMITTING REVIEW ===')
      console.log('Initial Request ID:', reviewingRequest.id)
      
      const freshRequests = await APIService.getAllRequests()
      console.log('Loaded fresh requests:', freshRequests.length)
      
      const stillExists = freshRequests.find(r => r.id === reviewingRequest.id)
      console.log('Request still exists:', stillExists ? 'Yes' : 'No')
      
      if (!stillExists) {
        console.error('Request disappeared before submission')
        toast.error('Request no longer exists. Please refresh.')
        setReviewingRequest(null)
        setReviewAction(null)
        await loadRequests()
        return
      }
      
      if (stillExists.status !== 'pending') {
        console.error('Request status changed to:', stillExists.status)
        toast.error(`This request has already been ${stillExists.status}`)
        setReviewingRequest(null)
        setReviewAction(null)
        await loadRequests()
        return
      }

      console.log('Sending review to API with:', {
        requestId: stillExists.id,
        action: reviewAction,
        reviewerNote: reviewNote,
        reviewerId: adminId,
      })
      
      const result = reviewAction === 'approve'
        ? await APIService.approveRequest(stillExists.id, adminId, reviewNote)
        : await APIService.rejectRequest(stillExists.id, adminId, reviewNote)
      
      console.log('API response:', result)
      
      if (result) {
        console.log('Request processed successfully, reloading...')
        toast.success(`Request ${reviewAction}d successfully`)
        setReviewingRequest(null)
        setReviewAction(null)
        setReviewNote('')
        await loadRequests()
        console.log('=== REVIEW COMPLETE ===')
      } else {
        console.error('API returned null/falsy response')
        toast.error('Failed to process request')
      }
    } catch (error) {
      console.error('=== ERROR PROCESSING REQUEST ===')
      console.error('Error:', error)
      if (error instanceof Error) {
        console.error('Error message:', error.message)
        console.error('Error stack:', error.stack)
        toast.error(`Failed: ${error.message}`)
      } else {
        toast.error('Failed to process request')
      }
    } finally {
      setSubmitting(false)
    }
  }



  const handleDeleteRequest = async (request: UserRequest) => {
    if (!confirm(`Are you sure you want to delete this request from ${request.userName}? This action cannot be undone.`)) {
      return
    }

    try {
      const result = await APIService.deleteRequest(request.id)
      if (result.success) {
        toast.success('Request deleted successfully')
        await loadRequests()
      } else {
        toast.error('Failed to delete request')
      }
    } catch (error) {
      console.error('Failed to delete request:', error)
      if (error instanceof Error) {
        toast.error(`Failed: ${error.message}`)
      } else {
        toast.error('Failed to delete request')
      }
    }
  }

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

  const renderRoleBadge = (userId?: string) => {
    if (!userId) return null
    const role = userLookup[userId]?.role
    if (!role || role === 'unknown') return null

    const variant: 'default' | 'secondary' | 'outline' =
      role === 'admin' ? 'default' : role === 'moderator' ? 'secondary' : 'outline'
    const label = role === 'admin' ? 'Admin' : role === 'moderator' ? 'Moderator' : 'User'

    return (
      <Badge variant={variant} className="capitalize">
        {label}
      </Badge>
    )
  }

  const renderUserIdLine = (userId?: string) => {
    if (!userId) return null
    const name = userLookup[userId]?.name
    return (
      <p className="text-xs text-muted-foreground font-mono">User ID: {userId}{name ? ` (${name})` : ''}</p>
    )
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

  const pendingRequests = allRequests.filter(r => r.status === 'pending')
  const reviewedRequests = allRequests.filter(r => r.status !== 'pending')

  return (
    <div>
      <CollapsibleCard
        iconLeft={<ShieldCheck size={24} />}
        title="User Requests"
        description="Review and manage user requests for admin, moderator, and product management."
        defaultOpen
      >
          {loading ? (
            <p className="text-muted-foreground text-center py-8">Loading requests...</p>
          ) : allRequests.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No requests yet
            </p>
          ) : (
            <Tabs defaultValue="pending">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="pending">
                  Pending ({pendingRequests.length})
                </TabsTrigger>
                <TabsTrigger value="reviewed">
                  Reviewed ({reviewedRequests.length})
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="pending" className="space-y-4 mt-4">
                {pendingRequests.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    No pending requests
                  </p>
                ) : (
                  pendingRequests.map((request) => {
                    const product = request.productId ? products.find(p => p.id === request.productId) : null
                    const productMissing = request.type === 'product-ownership' && request.productId && !product
                    const isRoleRequest = request.type === 'admin' || request.type === 'moderator'

                    return (
                      <RequestCard
                        key={request.id}
                        request={request}
                        product={product}
                        productMissing={!!productMissing}
                        userLookup={userLookup}
                        showActions
                        disableRoleActions={isRoleRequest && !canManageRoleRequests}
                        onApprove={(req) => handleReviewRequest(req, 'approve')}
                        onReject={(req) => handleReviewRequest(req, 'reject')}
                        onDelete={handleDeleteRequest}
                      />
                    )
                  })
                )}
              </TabsContent>
              
              <TabsContent value="reviewed" className="space-y-4 mt-4">
                {reviewedRequests.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    No reviewed requests yet
                  </p>
                ) : (
                  reviewedRequests.map((request) => {
                    const product = request.productId ? products.find(p => p.id === request.productId) : null
                    const productMissing = request.type === 'product-ownership' && request.productId && !product

                    return (
                      <RequestCard
                        key={request.id}
                        request={request}
                        product={product}
                        productMissing={!!productMissing}
                        userLookup={userLookup}
                        allowDeleteReviewed
                        onDelete={handleDeleteRequest}
                      />
                    )
                  })
                )}
              </TabsContent>
            </Tabs>
          )}
      </CollapsibleCard>

      <Dialog open={!!reviewingRequest} onOpenChange={(open) => {
        if (!open) {
          setReviewingRequest(null)
          setReviewAction(null)
          setReviewNote('')
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {reviewAction === 'approve' ? 'Approve' : 'Reject'} Request
            </DialogTitle>
            <DialogDescription>
              {reviewAction === 'approve'
                ? reviewingRequest?.type === 'admin'
                  ? `Approve ${reviewingRequest?.userName}'s request to become an admin. They will have full control over the platform.`
                  : reviewingRequest?.type === 'moderator'
                  ? `Approve ${reviewingRequest?.userName}'s request to become an editor. They will be able to edit products.`
                  : reviewingRequest?.type === 'source-domain'
                  ? `Approve this request to add a new source domain. The domain will be added to the allowed sources list.`
                  : `Approve ${reviewingRequest?.userName}'s request to become an editor of this product.`
                : reviewingRequest?.type === 'source-domain'
                ? `Reject this source domain request. You can optionally provide a reason.`
                : `Reject ${reviewingRequest?.userName}'s request. You can optionally provide a reason.`
              }
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {reviewingRequest?.type === 'source-domain' && (reviewingRequest.message || reviewingRequest.reason) && (
              <div className="bg-muted p-3 rounded">
                <p className="text-sm font-medium mb-1">Request Details:</p>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {reviewingRequest.message || reviewingRequest.reason}
                </p>
              </div>
            )}
            {reviewingRequest?.type !== 'source-domain' && (
              <div>
                <Label htmlFor="review-note">
                  {reviewAction === 'approve' ? 'Welcome message (optional)' : 'Reason for rejection (optional)'}
                </Label>
                <Textarea
                  id="review-note"
                  placeholder={
                    reviewAction === 'approve'
                      ? 'Welcome to the editor team! Please review our guidelines...'
                      : 'We appreciate your interest, but...'
                  }
                  value={reviewNote}
                  onChange={(e) => setReviewNote(e.target.value)}
                  rows={4}
                  className="mt-2"
                />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setReviewingRequest(null)
                setReviewAction(null)
                setReviewNote('')
              }}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSubmitReview} 
              disabled={submitting}
              variant={reviewAction === 'approve' ? 'default' : 'destructive'}
            >
              {submitting ? 'Processing...' : reviewAction === 'approve' ? 'Approve' : 'Reject'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
