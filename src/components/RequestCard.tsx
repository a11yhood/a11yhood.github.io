import React from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Package, CheckCircle, XCircle, Clock, User as UserIcon, Trash } from '@phosphor-icons/react'
import { Link } from 'react-router-dom'
import { Product, UserAccount, UserRequest } from '@/lib/types'

export type RequestCardProps = {
  request: UserRequest
  product?: Product | null
  productMissing?: boolean
  userLookup?: Record<string, { name?: string; role?: UserAccount['role'] | 'unknown'; username?: string }>
  showActions?: boolean
  allowDeleteReviewed?: boolean
  disableRoleActions?: boolean
  onApprove?: (request: UserRequest) => void
  onReject?: (request: UserRequest) => void
  onDelete?: (request: UserRequest) => void
  onWithdraw?: (request: UserRequest) => void
}

function formatDate(timestamp: number) {
  return new Date(timestamp).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function getStatusBadge(status: UserRequest['status']) {
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

function renderRoleBadge(userId: string | undefined, userLookup?: RequestCardProps['userLookup']) {
  if (!userId || !userLookup) return null
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

function renderUserIdLine(userId?: string, userLookup?: RequestCardProps['userLookup']) {
  if (!userId) return null
  const name = userLookup?.[userId]?.name
  return (
    <p className="text-xs text-muted-foreground font-mono">User ID: {userId}{name ? ` (${name})` : ''}</p>
  )
}

export function RequestCard({
  request,
  product,
  productMissing,
  userLookup,
  showActions,
  allowDeleteReviewed,
  disableRoleActions,
  onApprove,
  onReject,
  onDelete,
  onWithdraw,
}: RequestCardProps) {
  const isRoleRequest = request.type === 'admin' || request.type === 'moderator'
  const actionsBlocked = isRoleRequest && disableRoleActions
  const hasEditors = product?.editorIds && product.editorIds.length > 0

  return (
    <Card key={request.id}>
      <CardContent className="pt-6">
        <div className="space-y-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <Avatar>
                <AvatarImage src={request.userAvatarUrl} alt={request.userName} />
                <AvatarFallback>
                  <UserIcon size={20} />
                </AvatarFallback>
              </Avatar>
              <div>
                {(() => {
                  const lookupEntry = request.userId && userLookup ? userLookup[request.userId] : undefined
                  const displayName = request.userName || lookupEntry?.name || lookupEntry?.username || request.userId || 'Unknown user'
                  const username = lookupEntry?.username
                  return username ? (
                    <Link to={`/profile/${username}`} className="font-semibold hover:underline">
                      {displayName}
                    </Link>
                  ) : (
                    <h4 className="font-semibold">{displayName}</h4>
                  )
                })()}
                <p className="text-sm text-muted-foreground">
                  {request.type === 'moderator'
                    ? 'Editor Request'
                    : request.type === 'admin'
                      ? 'Admin Request'
                      : request.type === 'source-domain'
                        ? 'Source Domain Request'
                        : 'Product Editor Request'}
                </p>
                <p className="text-xs text-muted-foreground font-mono">ID: {request.id}</p>
                {renderUserIdLine(request.userId, userLookup)}
              </div>
              {renderRoleBadge(request.userId, userLookup)}
            </div>
            <div className="flex items-center gap-2">
              {getStatusBadge(request.status)}
              {allowDeleteReviewed && request.status !== 'pending' && onDelete && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onDelete(request)}
                  className="h-8 w-8 p-0"
                  title="Delete this request"
                >
                  <Trash size={16} />
                </Button>
              )}
            </div>
          </div>

          {request.type === 'product-ownership' && request.productId && (
            productMissing ? (
              <div className="flex items-center gap-2 bg-destructive/10 border border-destructive/30 p-3 rounded">
                <XCircle size={18} className="text-destructive" />
                <div>
                  <p className="text-sm font-medium text-destructive">Product Not Found</p>
                  <p className="text-xs text-muted-foreground">Product ID: {request.productId}</p>
                  <p className="text-xs text-muted-foreground">This product may have been deleted</p>
                </div>
              </div>
            ) : product ? (
              <div className="flex items-center gap-2 bg-muted p-3 rounded">
                <Package size={18} className="text-muted-foreground" />
                <div className="space-y-1">
                  <p className="text-sm font-medium">{product.name}</p>
                  <p className="text-xs text-muted-foreground">{product.type}</p>
                  <p className="text-xs text-muted-foreground font-mono">ID: {product.id}</p>
                  {hasEditors ? (
                    <p className="text-xs text-muted-foreground">
                      Editors: {product.editorIds!.map((editorId) => {
                        const editor = userLookup?.[editorId]
                        const editorName = editor?.name
                        const editorLogin = editor?.username || editor?.name
                        return editorLogin ? (
                          <Link key={editorId} to={`/profile/${editorLogin}`} className="text-primary hover:underline">
                            {editorName || editorLogin} ({editorId})
                          </Link>
                        ) : (
                          editorName ? `${editorName} (${editorId})` : editorId
                        )
                      }).reduce((acc: React.ReactNode[], curr, idx) => (
                        acc.concat(idx > 0 ? [', ', curr] : [curr])
                      ), [])}
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground">Editors: none</p>
                  )}
                  <Link
                    to={`/products/${product.id}`}
                    className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                  >
                    View product detail
                  </Link>
                </div>
              </div>
            ) : null
          )}

          <div>
            <p className="text-sm text-muted-foreground mb-1">
              Submitted {formatDate(request.createdAt)}
            </p>
          </div>

          {(request.message || request.reason) && (
            <div>
              <p className="text-sm font-medium mb-1">Message from user:</p>
              <p className="text-sm text-muted-foreground bg-muted p-3 rounded whitespace-pre-wrap">
                {request.message || request.reason}
              </p>
            </div>
          )}

          {request.status !== 'pending' && (
            <div>
              <p className="text-sm text-muted-foreground mb-1">
                Reviewed {request.reviewedAt && formatDate(request.reviewedAt)}
              </p>
              {request.reviewerNote && (
                <div>
                  <p className="text-sm font-medium mb-1">Your response:</p>
                  <p className="text-sm text-muted-foreground bg-muted p-3 rounded">
                    {request.reviewerNote}
                  </p>
                </div>
              )}
            </div>
          )}

          {request.status === 'pending' && (
            <div className="space-y-2">
              {actionsBlocked && (
                <p className="text-sm text-muted-foreground">
                  Only admins can approve or reject admin/moderator role requests.
                </p>
              )}

              {showActions && !actionsBlocked && (
                <div className="flex gap-2">
                  <Button
                    variant="default"
                    onClick={() => onApprove?.(request)}
                    className="flex items-center gap-2"
                    disabled={!!productMissing}
                  >
                    <CheckCircle size={16} />
                    Approve
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => onReject?.(request)}
                    className="flex items-center gap-2"
                  >
                    <XCircle size={16} />
                    Reject
                  </Button>
                  {onDelete && (
                    <Button
                      variant="outline"
                      onClick={() => onDelete(request)}
                      className="flex items-center gap-2"
                    >
                      <Trash size={16} />
                      Delete
                    </Button>
                  )}
                </div>
              )}

              {!showActions && onWithdraw && request.status === 'pending' && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onWithdraw(request)}
                  className="text-destructive hover:text-destructive"
                >
                  Withdraw request
                </Button>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
