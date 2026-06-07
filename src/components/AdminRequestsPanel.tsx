import { useState, useEffect } from 'react'
import { CollapsibleCard } from '@/components/CollapsibleCard'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { UserRequest, Product, UserAccount } from '@/lib/types'
import { APIService } from '@/lib/api'
import { ShieldCheck } from '@phosphor-icons/react'
import { useNotifications } from '@/contexts/NotificationContext'
import { RequestCard } from './RequestCard'

type AdminRequestsPanelProps = {
  adminId: string
  products?: Product[]
  canManageRoleRequests?: boolean
}

export function AdminRequestsPanel({ adminId, products = [], canManageRoleRequests = true }: AdminRequestsPanelProps) {
  const { notify } = useNotifications()
  const [allRequests, setAllRequests] = useState<UserRequest[]>([])
  const [requestProductLookup, setRequestProductLookup] = useState<Record<string, Product | null>>({})
  const [loading, setLoading] = useState(true)
  // Collapsible handled by CollapsibleCard
  const [reviewingRequest, setReviewingRequest] = useState<UserRequest | null>(null)
  const [reviewNote, setReviewNote] = useState('')
  const [reviewAction, setReviewAction] = useState<'approve' | 'reject' | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [userLookup, setUserLookup] = useState<Record<string, UserAccount>>({})
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [requestToDelete, setRequestToDelete] = useState<UserRequest | null>(null)

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

  useEffect(() => {
    const resolveRequestProducts = async () => {
      const productIds = Array.from(new Set(
        allRequests
          .filter((request) => request.type === 'product-ownership' && !!request.productId)
          .map((request) => request.productId as string)
      ))

      if (productIds.length === 0) return

      const missing = productIds.filter((id) => {
        const alreadyResolved = Object.prototype.hasOwnProperty.call(requestProductLookup, id)
        const alreadyInProps = products.some((product) => product.id === id)
        return !alreadyResolved && !alreadyInProps
      })

      if (missing.length === 0) return

      const resolvedEntries = await Promise.all(
        missing.map(async (id) => {
          try {
            const product = await APIService.getProductById(id)
            return [id, product ?? null] as const
          } catch (error) {
            console.warn('Failed to resolve request product:', { id, error })
            return [id, null] as const
          }
        })
      )

      setRequestProductLookup((prev) => ({
        ...prev,
        ...Object.fromEntries(resolvedEntries),
      }))
    }

    void resolveRequestProducts()
  }, [allRequests, products, requestProductLookup])

  const getRequestProduct = (productId?: string): Product | null => {
    if (!productId) return null
    return products.find((product) => product.id === productId) || requestProductLookup[productId] || null
  }

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
      notify.error('Only admins can review role change requests')
      return
    }

    try {
      const freshRequests = await APIService.getAllRequests()
      const freshRequest = freshRequests.find(r => r.id === request.id)
      if (!freshRequest) {
        notify.error('Request no longer exists. The list has been refreshed.')
        await loadRequests()
        return
      }
      if (freshRequest.status !== 'pending') {
        notify.error(`This request has already been ${freshRequest.status}`)
        await loadRequests()
        return
      }
      setReviewingRequest(freshRequest)
      setReviewAction(action)
      setReviewNote('')
    } catch (error) {
      console.error('Failed to load fresh request:', error)
      notify.error('Failed to load request details')
    }
  }

  const handleSubmitReview = async () => {
    if (!reviewingRequest || !reviewAction) return
    if (!canManageRoleRequests && (reviewingRequest.type === 'admin' || reviewingRequest.type === 'moderator')) {
      notify.error('Only admins can review role change requests')
      return
    }
    if (!adminId) {
      notify.error('Admin ID not available. Please refresh the page.')
      return
    }

    setSubmitting(true)
    try {
      const freshRequests = await APIService.getAllRequests()
      const stillExists = freshRequests.find(r => r.id === reviewingRequest.id)
      if (!stillExists) {
        notify.error('Request no longer exists. Please refresh.')
        setReviewingRequest(null)
        setReviewAction(null)
        await loadRequests()
        return
      }
      if (stillExists.status !== 'pending') {
        notify.error(`This request has already been ${stillExists.status}`)
        setReviewingRequest(null)
        setReviewAction(null)
        await loadRequests()
        return
      }

      const result = reviewAction === 'approve'
        ? await APIService.approveRequest(stillExists.id, adminId, reviewNote)
        : await APIService.rejectRequest(stillExists.id, adminId, reviewNote)

      if (result) {
        notify.success(`Request ${reviewAction}d successfully`)
        setReviewingRequest(null)
        setReviewAction(null)
        setReviewNote('')
        await loadRequests()
      } else {
        notify.error('Failed to process request')
      }
    } catch (error) {
      console.error('Error processing request:', error)
      if (error instanceof Error) {
        notify.error(`Failed: ${error.message}`)
      } else {
        notify.error('Failed to process request')
      }
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteRequest = (request: UserRequest) => {
    setRequestToDelete(request)
    setDeleteDialogOpen(true)
  }

  const handleConfirmDelete = async () => {
    if (!requestToDelete) return
    try {
      const result = await APIService.deleteRequest(requestToDelete.id)
      if (result.success) {
        notify.success('Request deleted successfully')
        await loadRequests()
      } else {
        notify.error('Failed to delete request')
      }
    } catch (error) {
      console.error('Failed to delete request:', error)
      if (error instanceof Error) {
        notify.error(`Failed: ${error.message}`)
      } else {
        notify.error('Failed to delete request')
      }
    } finally {
      setDeleteDialogOpen(false)
      setRequestToDelete(null)
    }
  }

  const pendingRequests = allRequests.filter(r => r.status === 'pending')
  const reviewedRequests = allRequests.filter(r => r.status !== 'pending')

  return (
    <div>
      <CollapsibleCard
        iconLeft={<ShieldCheck size={24} />}
        title="User Requests"
        description="Review and manage user requests for admin, moderator, product editor, and collection editor access."
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
                    const product = getRequestProduct(request.productId)
                    const productResolutionPending = Boolean(
                      request.productId &&
                      !products.some((p) => p.id === request.productId) &&
                      !Object.prototype.hasOwnProperty.call(requestProductLookup, request.productId)
                    )
                    const productMissing = request.type === 'product-ownership' && request.productId && !product && !productResolutionPending
                    const isRoleRequest = request.type === 'admin' || request.type === 'moderator'

                    return (
                      <RequestCard
                        key={request.id}
                        request={request}
                        product={product}
                        productLoading={productResolutionPending}
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
                    const product = getRequestProduct(request.productId)
                    const productResolutionPending = Boolean(
                      request.productId &&
                      !products.some((p) => p.id === request.productId) &&
                      !Object.prototype.hasOwnProperty.call(requestProductLookup, request.productId)
                    )
                    const productMissing = request.type === 'product-ownership' && request.productId && !product && !productResolutionPending

                    return (
                      <RequestCard
                        key={request.id}
                        request={request}
                        product={product}
                        productLoading={productResolutionPending}
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
                  : reviewingRequest?.type === 'collection-ownership'
                  ? `Approve ${reviewingRequest?.userName}'s request to become an editor of this collection.`
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

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Request?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this request from {requestToDelete?.userName}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
