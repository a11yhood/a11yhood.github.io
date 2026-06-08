import { Collection, Product, Rating, UserAccount } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardHeader, CardDescription, CardContent, CardTitle } from '@/components/ui/card'
import { ArrowLeft, Lock, LockOpen, Trash, Pencil } from '@phosphor-icons/react'
import { ProductCard } from '@/components/ProductCard'
import { ProductFilterTag } from '@/components/ProductFilterTag'
import { formatDistanceToNow } from 'date-fns'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { APIService } from '@/lib/api'
import { Link, useNavigate } from 'react-router-dom'
import { getProductsPathForTag } from '@/lib/tagRoutes'
import MarkdownText from '@/components/ui/MarkdownText'
import { useNotifications } from '@/contexts/NotificationContext'

type CollectionDetailProps = {
  collection: Collection
  ratings: Rating[]
  products?: Product[]
  onBack: () => void
  onRemoveProduct: (productSlug: string) => void
  onSelectProduct: (productSlug: string) => void
  isOwner: boolean
  userAccount?: UserAccount | null
  onDeleteProduct: (productSlug: string) => void
  onTogglePrivacy?: (nextPublic: boolean) => Promise<void> | void
  onDeleteCollection?: () => void
  onEditCollection?: () => void
  onCollectionUpdated?: (collection: Collection) => void
}

export function CollectionDetail({
  collection,
  ratings,
  products: globalProducts,
  onBack,
  onRemoveProduct,
  onSelectProduct,
  isOwner,
  userAccount,
  onDeleteProduct,
  onTogglePrivacy,
  onDeleteCollection,
  onEditCollection,
  onCollectionUpdated,
}: CollectionDetailProps) {
  void onDeleteProduct
  const { notify } = useNotifications()
  const navigate = useNavigate()
  const [isLoading, setIsLoading] = useState(false)
  const [resolvedCreatorUsername, setResolvedCreatorUsername] = useState('')
  const [collectionEditorIds, setCollectionEditorIds] = useState<string[]>(collection.editorIds || [])
  const [resolvedEditors, setResolvedEditors] = useState<Record<string, UserAccount | null>>({})
  const [collaboratorUsername, setCollaboratorUsername] = useState('')
  const [isAddingCollaborator, setIsAddingCollaborator] = useState(false)
  const [removingCollaboratorId, setRemovingCollaboratorId] = useState<string | null>(null)
  const [requestReason, setRequestReason] = useState('')
  const [isSubmittingCollaboratorRequest, setIsSubmittingCollaboratorRequest] = useState(false)
  const [hasPendingCollaboratorRequest, setHasPendingCollaboratorRequest] = useState(false)
  const [collaboratorError, setCollaboratorError] = useState<string>('')

  // Products individually fetched by this component (not present in globalProducts).
  // Stored in a ref so mutations don't trigger re-renders; `fetchVersion` is bumped
  // to tell the collectionProducts memo to recompute after a fetch completes.
  const fetchedBySlugRef = useRef<Map<string, Product>>(new Map())
  const [fetchVersion, setFetchVersion] = useState(0)

  // Stable ref to globalProducts — lets the fetch effect read the latest value
  // without declaring it as a dependency (which would restart fetches on every
  // unrelated global-products update).
  const globalProductsRef = useRef(globalProducts)
  useEffect(() => { globalProductsRef.current = globalProducts }, [globalProducts])

  const orderedProductSlugs = useMemo(
    () => collection.productSlugs ?? [],
    [collection.productSlugs]
  )

  // Set-based key for fetch behavior: changes only when membership changes,
  // so reorder-only updates do not trigger network requests.
  const slugSetKey = useMemo(
    () => orderedProductSlugs.slice().sort().join(','),
    [orderedProductSlugs]
  )

  // Fetch effect: runs only when the slug set changes.
  // globalProducts changes do NOT restart this effect; the collectionProducts
  // memo below handles syncing those updates without touching the network.
  useEffect(() => {
    // New slug set — wipe any products fetched for the previous collection.
    fetchedBySlugRef.current = new Map()
    setFetchVersion(0)

    const slugs = slugSetKey ? slugSetKey.split(',').filter(Boolean) : []
    if (slugs.length === 0) {
      setIsLoading(false)
      return
    }

    // Snapshot global products at the start of this cycle.  Slugs already
    // present here don't need a network call.
    const globalBySlug = new Map<string, Product>()
    ;(globalProductsRef.current || []).forEach((p) => {
      if (p?.slug) globalBySlug.set(p.slug, p)
    })

    const missingSlugs = slugs.filter((slug) => !globalBySlug.has(slug))
    if (missingSlugs.length === 0) {
      console.log('[CollectionDetail] All products already cached, skipping API calls')
      setIsLoading(false)
      return
    }

    let cancelled = false
    setIsLoading(true)
    console.log(`[CollectionDetail] Fetching ${missingSlugs.length} missing products`)

    Promise.allSettled(
      missingSlugs.map((slug) => APIService.getProduct(slug))
    ).then((results) => {
      if (cancelled) return
      results.forEach((result, i) => {
        if (result.status === 'fulfilled' && result.value != null) {
          fetchedBySlugRef.current.set(missingSlugs[i], result.value)
        } else if (result.status === 'rejected') {
          console.error('[CollectionDetail] Error loading product:', missingSlugs[i], result.reason)
        }
      })
      setFetchVersion((v) => v + 1)
      setIsLoading(false)
    }).catch((err) => {
      if (!cancelled) {
        console.error('[CollectionDetail] Unexpected error fetching products:', err)
        setIsLoading(false)
      }
    })

    return () => { cancelled = true }
  }, [slugSetKey])

  // Merge globalProducts (always fresh, takes precedence) with locally-fetched
  // fallbacks to produce the ordered list for rendering.  Recomputes whenever
  // the slug set, global cache, or locally-fetched set changes — without issuing
  // any network requests.
  const collectionProducts = useMemo(() => {
    void fetchVersion
    const slugs = orderedProductSlugs
    if (slugs.length === 0) return []
    const bySlug = new Map<string, Product>()
    // Locally-fetched products (lower priority — may be slightly stale)
    fetchedBySlugRef.current.forEach((p, slug) => bySlug.set(slug, p))
    // Global products are always fresh and take precedence
    ;(globalProducts || []).forEach((p) => { if (p?.slug) bySlug.set(p.slug, p) })
    return slugs.map((s) => bySlug.get(s)).filter((p): p is Product => p != null)
  // fetchVersion triggers recomputation when fetchedBySlugRef is mutated
  }, [orderedProductSlugs, globalProducts, fetchVersion])

  // Derive top tags from the collection's products, sorted by frequency
  const topTags = useMemo(() => {
    const tagCounts = new Map<string, number>()
    collectionProducts.forEach(product => {
      product?.tags?.forEach(tag => {
        tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1)
      })
    })
    return Array.from(tagCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([tag]) => tag)
  }, [collectionProducts])

  const creatorUsername =
    collection.username ||
    (collection as Collection & { userName?: string }).userName ||
    ''

  useEffect(() => {
    let cancelled = false

    if (creatorUsername) {
      setResolvedCreatorUsername(creatorUsername)
      return () => { cancelled = true }
    }

    setResolvedCreatorUsername('')
    if (!collection.userId) {
      return () => { cancelled = true }
    }

    APIService.getUserAccount(collection.userId)
      .then((user) => {
        if (cancelled) return
        setResolvedCreatorUsername(user?.username || '')
      })
      .catch((error) => {
        if (cancelled) return
        console.warn('[CollectionDetail] Failed to resolve creator username', {
          userId: collection.userId,
          error,
        })
        setResolvedCreatorUsername('')
      })

    return () => { cancelled = true }
  }, [creatorUsername, collection.userId])

  const currentUserId = userAccount?.id
  const mergedEditorIds = useMemo(() => {
    const merged = [...(collection.editorIds || []), ...collectionEditorIds]
    return Array.from(new Set(merged.filter(Boolean)))
  }, [collection.editorIds, collectionEditorIds])

  const collaboratorIds = useMemo(
    () => mergedEditorIds.filter((id) => id !== collection.userId),
    [mergedEditorIds, collection.userId]
  )

  const isCollectionEditor = !!currentUserId && (
    mergedEditorIds.includes(currentUserId)
  )

  const isPrivilegedRole = userAccount?.role === 'admin' || userAccount?.role === 'moderator'
  const canManageCollaborators = isOwner || isPrivilegedRole
  const canRequestCollaboratorAccess = !!userAccount && !canManageCollaborators && !isCollectionEditor
  const canManageCollectionProducts = isOwner || isCollectionEditor

  useEffect(() => {
    setCollectionEditorIds(collection.editorIds || [])
  }, [collection.editorIds])

  const getCollaboratorErrorMessage = (error: unknown, action: 'add' | 'remove'): string => {
    const apiError = error as { status?: number; data?: { detail?: string }; message?: string }
    const detail = apiError.data?.detail

    if (apiError.status === 400) {
      return detail || (action === 'add'
        ? 'Invalid collaborator username.'
        : 'This collaborator change is not allowed.')
    }

    if (apiError.status === 403) {
      return 'Only the collection owner, admin, or moderator can manage collaborators.'
    }

    if (apiError.status === 404) {
      return detail || (action === 'add'
        ? 'Collaborator username was not found.'
        : 'Collection or collaborator user was not found.')
    }

    return detail || apiError.message || 'Unable to update collaborators right now.'
  }

  const loadEditorData = useCallback(async () => {
    try {
      const editorData = await APIService.getCollectionEditors(collection.slug || collection.id)
      setCollectionEditorIds(editorData.editorIds || [])
    } catch (error) {
      console.debug('[CollectionDetail] Failed to load collection editors', error)
      setCollectionEditorIds(collection.editorIds || [])
    }
  }, [collection.id, collection.slug, collection.editorIds])

  useEffect(() => {
    void loadEditorData()
  }, [loadEditorData])

  useEffect(() => {
    let cancelled = false

    const loadPendingCollaboratorRequests = async () => {
      if (!canRequestCollaboratorAccess) {
        setHasPendingCollaboratorRequest(false)
        return
      }

      try {
        const requests = await APIService.getMyRequests('pending', 'collection-ownership')
        if (cancelled) return

        const collectionIdentifiers = new Set([collection.id, collection.slug].filter(Boolean) as string[])
        const hasPending = (requests || []).some((request) =>
          request.type === 'collection-ownership' &&
          request.status === 'pending' &&
          !!request.collectionId &&
          collectionIdentifiers.has(request.collectionId)
        )

        setHasPendingCollaboratorRequest(hasPending)
      } catch {
        if (cancelled) return
        setHasPendingCollaboratorRequest(false)
      }
    }

    loadPendingCollaboratorRequests().catch(() => {
      if (cancelled) return
      setHasPendingCollaboratorRequest(false)
    })

    return () => { cancelled = true }
  }, [canRequestCollaboratorAccess, collection.id, collection.slug])

  useEffect(() => {
    let cancelled = false

    const loadEditorUsers = async () => {
      const idsNeedingLookup = collaboratorIds.filter((id) => resolvedEditors[id] === undefined)
      if (idsNeedingLookup.length === 0) {
        return
      }

      const results = await Promise.all(
        idsNeedingLookup.map(async (id) => {
          try {
            const user = await APIService.getUserAccount(id)
            return { id, user: user || null }
          } catch {
            return { id, user: null }
          }
        })
      )

      if (cancelled) {
        return
      }

      setResolvedEditors((current) => {
        const next = { ...current }
        results.forEach(({ id, user }) => {
          next[id] = user
        })
        return next
      })
    }

    loadEditorUsers().catch((error) => {
      console.debug('[CollectionDetail] Failed to resolve collaborator usernames', error)
    })

    return () => { cancelled = true }
  }, [collaboratorIds, resolvedEditors])

  const handleAddCollaborator = async () => {
    const username = collaboratorUsername.trim().replace(/^@/, '')
    if (!username) {
      setCollaboratorError('Enter a collaborator username.')
      return
    }

    setCollaboratorError('')
    setIsAddingCollaborator(true)

    try {
      const collaboratorAccount = await APIService.getUserByUsername(username)
      if (!collaboratorAccount?.id) {
        setCollaboratorError('Collaborator username was not found.')
        return
      }

      const updated = await APIService.addCollectionEditor(collection.slug || collection.id, collaboratorAccount.id)
      if (updated) {
        setCollectionEditorIds(updated.editorIds || [])
        onCollectionUpdated?.(updated)
      }
      setCollaboratorUsername('')
      notify.success('Collaborator added')
    } catch (error) {
      const message = getCollaboratorErrorMessage(error, 'add')
      setCollaboratorError(message)
      notify.error(message)
    } finally {
      setIsAddingCollaborator(false)
    }
  }

  const handleRemoveCollaborator = async (editorUserId: string) => {
    if (editorUserId === collection.userId) {
      setCollaboratorError('The collection owner cannot be removed as a collaborator.')
      return
    }

    setCollaboratorError('')
    setRemovingCollaboratorId(editorUserId)

    try {
      const updated = await APIService.removeCollectionEditor(collection.slug || collection.id, editorUserId)
      if (updated) {
        setCollectionEditorIds(updated.editorIds || [])
        onCollectionUpdated?.(updated)
      }
      notify.success('Collaborator removed')
    } catch (error) {
      const message = getCollaboratorErrorMessage(error, 'remove')
      setCollaboratorError(message)
      notify.error(message)
    } finally {
      setRemovingCollaboratorId(null)
    }
  }

  const handleRequestCollaboratorAccess = async () => {
    if (!userAccount) {
      return
    }

    setCollaboratorError('')
    setIsSubmittingCollaboratorRequest(true)

    try {
      const resolvedRequester = userAccount.username
        ? userAccount
        : await APIService.getUserAccount(userAccount.id)

      const requesterUsername = resolvedRequester?.username || userAccount.username || userAccount.displayName || 'unknown-user'

      await APIService.createUserRequest({
        userId: userAccount.id,
        userName: requesterUsername,
        userAvatarUrl: userAccount.avatarUrl,
        type: 'collection-ownership',
        reason: requestReason.trim() || `Please add me as a collaborator to ${collection.name}.`,
        collectionId: collection.id,
      })

      setRequestReason('')
      setHasPendingCollaboratorRequest(true)
      notify.success('Collaborator request submitted')
    } catch (error) {
      const apiError = error as { status?: number; data?: { detail?: string }; message?: string }
      const message = apiError.data?.detail || apiError.message || 'Failed to submit collaborator request.'
      setCollaboratorError(message)
      notify.error(message)
    } finally {
      setIsSubmittingCollaboratorRequest(false)
    }
  }

  return (
    <div>
      <Button variant="outline" onClick={onBack} className="mb-6">
        <ArrowLeft size={18} className="mr-2" />
        Back to Collections
      </Button>

      <h1 className="text-2xl font-semibold leading-none mb-4">{collection.name}</h1>

      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <CardTitle as="h2" className="text-lg mb-2">Collection details</CardTitle>
              <div className="flex items-center gap-3">
                <CardDescription className="flex items-center gap-2">
                  {collection.isPublic ? (
                    <>
                      <LockOpen size={16} />
                      <span>Public Collection</span>
                    </>
                  ) : (
                    <>
                      <Lock size={16} />
                      <span>Private Collection</span>
                    </>
                  )}
                </CardDescription>
                {isOwner && (
                  <Button
                    variant="link"
                    className="h-auto p-0 text-sm"
                    onClick={() => onTogglePrivacy?.(!collection.isPublic)}
                  >
                    {collection.isPublic ? 'Make Private' : 'Make Public'}
                  </Button>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {isOwner && onEditCollection && (
                <Button variant="outline" size="sm" onClick={onEditCollection} aria-label="Edit collection">
                  <Pencil size={18} className="mr-2" />
                  Edit
                </Button>
              )}
              {isOwner && onDeleteCollection && (
                <Button variant="destructive" size="sm" onClick={onDeleteCollection} aria-label="Delete collection">
                  <Trash size={18} className="mr-2" />
                  Delete
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {collection.description && (
            <MarkdownText text={collection.description} className="text-muted-foreground mb-4" />
          )}
          {topTags.length > 0 && (
            <ul className="flex flex-wrap gap-2 mb-4">
              {topTags.map((tag) => (
                <li key={tag}>
                  <ProductFilterTag
                    tag={tag}
                    selected={false}
                    onTagClick={(clickedTag) => navigate(getProductsPathForTag(clickedTag))}
                    variant="card"
                  />
                </li>
              ))}
            </ul>
          )}
          <div className="flex flex-wrap gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Created by:</span>{' '}
              {resolvedCreatorUsername ? (
                <Link
                  to={`/profile/${resolvedCreatorUsername}`}
                  className="font-medium hover:underline"
                >
                  {resolvedCreatorUsername}
                </Link>
              ) : (
                <span className="font-medium">Unknown</span>
              )}
            </div>
            <div>
              <span className="text-muted-foreground">Products:</span>{' '}
              <span className="font-medium">{collection.productSlugs?.length ?? collectionProducts.length}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Updated:</span>{' '}
              <span className="font-medium">
                {formatDistanceToNow(collection.updatedAt, { addSuffix: true })}
              </span>
            </div>
          </div>
          <div className="mt-3 text-sm">
            <span className="text-muted-foreground">Collaborators:</span>{' '}
            {collaboratorIds.length > 0 ? (
              <span className="font-medium">{collaboratorIds.length}</span>
            ) : (
              <span className="font-medium">None</span>
            )}
          </div>
          <div className="mt-4 border-t pt-4">
            <h3 className="font-medium mb-2">Collaborators</h3>
            {collaboratorIds.length > 0 ? (
              <ul className="space-y-2">
                {collaboratorIds.map((editorId) => {
                  const resolvedEditor = resolvedEditors[editorId]
                  const username = resolvedEditor?.username || null

                  return (
                    <li key={editorId} className="flex items-center justify-between gap-3 rounded border p-2">
                      <div className="text-sm">
                        {username ? (
                          <Link to={`/profile/${username}`} className="hover:underline">
                            @{username}
                          </Link>
                        ) : (
                          <span>{editorId}</span>
                        )}
                      </div>
                      {canManageCollaborators && (
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={removingCollaboratorId === editorId || editorId === collection.userId}
                          onClick={() => handleRemoveCollaborator(editorId)}
                          aria-label={username ? `Remove collaborator ${username}` : `Remove collaborator ${editorId}`}
                        >
                          Remove
                        </Button>
                      )}
                    </li>
                  )
                })}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">No collaborators yet.</p>
            )}

            {canManageCollaborators && (
              <div className="mt-3 space-y-2">
                <label htmlFor="collaborator-username" className="text-sm font-medium">
                  Add collaborator by username
                </label>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <Input
                    id="collaborator-username"
                    value={collaboratorUsername}
                    onChange={(event) => setCollaboratorUsername(event.target.value)}
                    placeholder="Enter username"
                    aria-describedby={collaboratorError ? 'collaborator-error' : undefined}
                  />
                  <Button onClick={handleAddCollaborator} disabled={isAddingCollaborator}>
                    Add collaborator
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Only collection owners, admins, and moderators can manage collaborators.
                </p>
              </div>
            )}

            {canRequestCollaboratorAccess && (
              <div className="mt-3 space-y-2">
                <label htmlFor="collaborator-request-message" className="text-sm font-medium">
                  Request collaborator access
                </label>
                <Input
                  id="collaborator-request-message"
                  value={requestReason}
                  onChange={(event) => setRequestReason(event.target.value)}
                  placeholder="Optional reason for collaborator access"
                  aria-describedby={collaboratorError ? 'collaborator-error' : undefined}
                />
                <Button
                  variant="outline"
                  disabled={isSubmittingCollaboratorRequest || hasPendingCollaboratorRequest}
                  onClick={handleRequestCollaboratorAccess}
                >
                  {hasPendingCollaboratorRequest ? 'Request pending' : 'Request collaborator access'}
                </Button>
                <p className="text-xs text-muted-foreground">
                  This adds a collaborator request to the admin request queue for owner/admin review.
                </p>
              </div>
            )}

            {collaboratorError && (
              <p id="collaborator-error" className="mt-2 text-sm text-destructive" role="status">
                {collaboratorError}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {isLoading && collectionProducts.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-lg text-muted-foreground mb-2">Loading products...</p>
        </div>
      ) : !isLoading && collectionProducts.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-lg text-muted-foreground mb-2">This collection is empty</p>
          <p className="text-sm text-muted-foreground">
            {canManageCollectionProducts ? 'Add products from the product details page' : 'No products in this collection yet'}
          </p>
        </div>
      ) : (
        <div>
          <h2 className="text-xl font-semibold mb-4">
            Products ({collectionProducts.length}{isLoading ? '…' : ''})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {collectionProducts.map((product) => (
              <div key={product.id} className="relative">
                <ProductCard
                  product={product}
                  ratings={ratings}
                  onTagClick={(tag) => navigate(getProductsPathForTag(tag))}
                  onClick={() => onSelectProduct(product.slug)}
                  onDelete={onRemoveProduct}
                  userAccount={userAccount}
                />
                {canManageCollectionProducts && (
                  <div className="absolute top-2 right-2 z-10">
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        onRemoveProduct(product.slug)
                      }}
                      aria-label="Remove from collection"
                    >
                      <Trash size={16} />
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
