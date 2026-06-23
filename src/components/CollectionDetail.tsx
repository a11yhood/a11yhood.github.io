import { AddToCollectionDefaults, Collection, CollectionEntry, Product, Rating, UserAccount } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardHeader, CardDescription, CardContent, CardTitle } from '@/components/ui/card'
import { ArrowLeft, FolderOpen, Lock, LockOpen, Plus, Trash, Pencil } from '@phosphor-icons/react'
import { ProductCard } from '@/components/ProductCard'
import { ProductFilterTag } from '@/components/ProductFilterTag'
import { formatDistanceToNow } from 'date-fns'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { APIService } from '@/lib/api'
import { Link, useNavigate } from 'react-router-dom'
import { getProductsPathForTag } from '@/lib/tagRoutes'
import MarkdownText from '@/components/ui/MarkdownText'
import { useNotifications } from '@/contexts/NotificationContext'
import { collectionEntryKey, getCollectionEntries, getCollectionEntryProductCandidates, resolveCollectionProducts } from '@/lib/collectionUtils'
import { buildAddToCollectionDefaultsForCollection } from '@/lib/addToCollection'
import { serializeCollectionEntryForUpdate } from '@/lib/collectionEntrySerialization'

type CollectionDetailProps = {
  collection: Collection
  collections?: Collection[]
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
  onOpenAddToCollection?: (defaults: AddToCollectionDefaults) => void
}

export function CollectionDetail({
  collection,
  collections = [],
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
  onOpenAddToCollection,
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
  const [resolvedNestedCollections, setResolvedNestedCollections] = useState<Record<string, Collection | null>>({})

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

  const orderedEntries = useMemo(
    () => getCollectionEntries(collection),
    [collection]
  )

  const collectionKey = collection.slug || collection.id
  useEffect(() => {
    setResolvedNestedCollections({})
  }, [collectionKey])

  // Set-based key for fetch behavior: changes only when membership changes,
  // so reorder-only updates do not trigger network requests.
  const slugSetKey = useMemo(
    () => orderedEntries
      .filter((entry) => entry.kind === 'product')
      .map((entry) => entry.targetSlug || entry.targetId || '')
      .filter(Boolean)
      .slice()
      .sort()
      .join(','),
    [orderedEntries]
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
      missingSlugs.map(async (slug) => {
        const candidates = getCollectionEntryProductCandidates({ targetSlug: slug })
        for (const candidate of candidates) {
          try {
            const product = await APIService.getProduct(candidate)
            if (product) {
              return product
            }
          } catch {
            // Keep trying fallback candidates (e.g., UUID extracted from a prefixed key).
            continue
          }
        }
        return null
      })
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
  const allProductsForResolution = useMemo(() => {
    // Read this state value so eslint recognizes the dependency that invalidates
    // memoization when fetchedBySlugRef is mutated.
    void fetchVersion

    const merged: Product[] = []
    const seen = new Set<string>()

    const addProduct = (product?: Product | null) => {
      if (!product) {
        return
      }

      const key = product.slug || product.id
      if (!key || seen.has(key)) {
        return
      }

      seen.add(key)
      merged.push(product)
    }

    ;(globalProducts || []).forEach(addProduct)
    fetchedBySlugRef.current.forEach((product) => addProduct(product))

    return merged
  }, [globalProducts, fetchVersion])

  const collectionProducts = useMemo(() => {
    return resolveCollectionProducts(collection, collections, allProductsForResolution)
  }, [collection, collections, allProductsForResolution])

  const nestedCollections = useMemo(
    () => orderedEntries
      .map((entry, index) => ({ entry, sourceIndex: index }))
      .filter((item) => item.entry.kind === 'collection'),
    [orderedEntries]
  )

  useEffect(() => {
    let cancelled = false

    const unresolvedKeys = nestedCollections
      .map(({ entry }) => entry.targetSlug || entry.targetId || '')
      .filter(Boolean)
      .filter((targetKey) => {
        if (Object.prototype.hasOwnProperty.call(resolvedNestedCollections, targetKey)) {
          return false
        }

        return !collections.some((candidate) => candidate.slug === targetKey || candidate.id === targetKey)
      })

    if (unresolvedKeys.length === 0) {
      return () => { cancelled = true }
    }

    Promise.allSettled(unresolvedKeys.map((targetKey) => APIService.getCollection(targetKey)))
      .then((results) => {
        if (cancelled) {
          return
        }

        setResolvedNestedCollections((current) => {
          const next = { ...current }
          results.forEach((result, index) => {
            const key = unresolvedKeys[index]
            if (result.status === 'fulfilled' && result.value) {
              next[key] = result.value
            } else {
              // Mark failed lookups so 404/500 targets do not trigger an infinite refetch loop.
              next[key] = null
            }
          })
          return next
        })
      })
      .catch((error) => {
        if (!cancelled) {
          console.debug('[CollectionDetail] Failed to resolve nested collections by id:', error)
        }
      })

    return () => { cancelled = true }
  }, [nestedCollections, collections, resolvedNestedCollections])

  const productLabelByKey = useMemo(() => {
    const labels = new Map<string, string>()
    allProductsForResolution.forEach((product) => {
      if (product.slug) {
        labels.set(product.slug, product.name)
      }
      if (product.id) {
        labels.set(product.id, product.name)
      }
    })
    return labels
  }, [allProductsForResolution])

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

  const parentCollections = useMemo(() => {
    const collectionIdentifiers = new Set([collection.id, collection.slug].filter(Boolean) as string[])

    return collections.filter((candidate) => {
      if (candidate.id === collection.id || candidate.slug === collection.slug) {
        return false
      }

      return getCollectionEntries(candidate).some((entry) => {
        if (entry.kind !== 'collection') return false
        const targetKey = entry.targetId || entry.targetSlug
        return !!targetKey && collectionIdentifiers.has(targetKey)
      })
    })
  }, [collections, collection.id, collection.slug])

  const handleAddCurrentCollectionToCollection = () => {
    if (!onOpenAddToCollection) return

    const defaults = buildAddToCollectionDefaultsForCollection(collection)
    if (defaults.entries.length === 0) return
    onOpenAddToCollection(defaults)
  }

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

  const handleRemoveNestedCollection = async (sourceIndex: number) => {
    if (!canManageCollectionProducts) {
      return
    }

    try {
      const nextEntries = orderedEntries.filter((_, index) => index !== sourceIndex)
      const updated = await APIService.updateCollection(collection.slug || collection.id, {
        entries: nextEntries.map((entry) => serializeCollectionEntryForUpdate(entry)) as unknown as CollectionEntry[],
      })

      if (updated) {
        onCollectionUpdated?.(updated)
      }

      notify.success('Collection entry removed')
    } catch (error) {
      console.error('Failed to remove nested collection entry:', error)
      notify.error('Failed to remove collection entry')
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
              <span className="font-medium">{collectionProducts.length}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Updated:</span>{' '}
              <span className="font-medium">
                {formatDistanceToNow(collection.updatedAt, { addSuffix: true })}
              </span>
            </div>
          </div>

          {(parentCollections.length > 0 || onOpenAddToCollection) && (
            <div className="mt-4 border-t pt-4">
              <div className="flex items-center justify-between gap-3">
                <h3 className="font-medium flex items-center gap-2">
                  <FolderOpen size={16} aria-hidden="true" />
                  Part of
                </h3>
                {onOpenAddToCollection && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={handleAddCurrentCollectionToCollection}
                    aria-label={`Add ${collection.name} to another collection`}
                  >
                    <Plus size={14} weight="bold" />
                  </Button>
                )}
              </div>
              {parentCollections.length > 0 ? (
                <ul className="mt-2 flex flex-wrap gap-2">
                  {parentCollections.map((parentCollection) => (
                    <li key={parentCollection.id}>
                      <Link to={`/collections/${parentCollection.slug || parentCollection.id}`} className="no-underline">
                        <Badge variant="outline">Collection: {parentCollection.name}</Badge>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-sm text-muted-foreground">This collection is not part of another collection yet.</p>
              )}
            </div>
          )}

          {orderedEntries.length > 0 && (
            <div className="mt-4">
              <h3 className="font-medium mb-2">Included items</h3>
              <ul className="flex flex-wrap gap-2">
                {orderedEntries.map((entry, index) => {
                  const key = collectionEntryKey(entry, index)

                  if (entry.kind === 'product') {
                    const candidates = getCollectionEntryProductCandidates(entry)
                    const resolvedLabel = candidates
                      .map((candidate) => productLabelByKey.get(candidate))
                      .find((name): name is string => !!name)
                    const targetRef = entry.targetSlug || entry.targetId
                    const targetLabel = entry.title && targetRef
                      ? `${entry.title} (${targetRef})`
                      : (resolvedLabel || entry.title || targetRef || `Product ${index + 1}`)
                    return (
                      <li key={key}>
                        <Badge variant="secondary">Product: {targetLabel}</Badge>
                      </li>
                    )
                  }

                  return null
                })}
              </ul>
            </div>
          )}

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
                  onClick={() => onSelectProduct(product.id || product.slug)}
                  onDelete={(productSlug) => onRemoveProduct(product.id || productSlug)}
                  userAccount={userAccount}
                />
                {canManageCollectionProducts && (
                  <div className="absolute top-2 right-2 z-10">
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        onRemoveProduct(product.id || product.slug)
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

      {nestedCollections.length > 0 && (
        <section className="mt-8" aria-label="Nested collections">
          <h2 className="text-xl font-semibold mb-4">Nested collections</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {nestedCollections.map(({ entry, sourceIndex }, index) => {
              const key = collectionEntryKey(entry, sourceIndex)
              const targetCollection =
                collections.find((candidate) => candidate.slug === entry.targetSlug || candidate.id === entry.targetId) ||
                resolvedNestedCollections[entry.targetSlug || entry.targetId || '']
              const destination = targetCollection?.slug || targetCollection?.id || entry.targetSlug || entry.targetId || ''
              const nestedCollectionLabel = targetCollection?.name || entry.title || entry.targetSlug || targetCollection?.slug || entry.targetId

              return (
                <div key={`${key}:${index}`} className="relative">
                  <Link to={`/collections/${destination}`} className="block no-underline">
                    <Card className="overflow-hidden hover:shadow-md transition-shadow h-full">
                      <div className="h-32 bg-muted/40 flex items-center justify-center">
                        <FolderOpen size={44} className="text-muted-foreground/50" aria-hidden="true" />
                      </div>
                      <CardContent className="p-4 space-y-2">
                        <div className="space-y-1">
                          <Badge variant="outline" className="w-fit text-xs">
                            Collection
                          </Badge>
                          <h3 className="font-semibold text-base line-clamp-2">
                            {nestedCollectionLabel}
                          </h3>
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-3">
                          {targetCollection?.description || entry.description || 'Collection entry'}
                        </p>
                      </CardContent>
                    </Card>
                  </Link>
                  {canManageCollectionProducts && (
                    <div className="absolute top-2 right-2 z-10">
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={(event) => {
                          event.preventDefault()
                          event.stopPropagation()
                          void handleRemoveNestedCollection(sourceIndex)
                        }}
                        aria-label="Remove from collection"
                      >
                        <Trash size={16} />
                      </Button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </section>
      )}
    </div>
  )
}
