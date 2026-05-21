import { useEffect, useState } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { CollectionDetail } from '@/components/CollectionDetail'
import { Collection, Product, Rating, UserAccount, UserData } from '@/lib/types'
import { useNotifications } from '@/contexts/NotificationContext'
import { APIService } from '@/lib/api'

export function CollectionDetailPage({
    collections,
    ratings,
    products,
    user,
    userAccount,
    onRemoveProductFromCollection,
    onDeleteProduct,
    onDeleteCollection,
    onEditCollection,
}: {
    collections: Collection[]
    ratings: Rating[]
    products: Product[]
    user: UserData | null
    userAccount: UserAccount | null
    onRemoveProductFromCollection: (collectionSlug: string, productSlug: string) => void
    onDeleteProduct: (productId: string) => void
    onDeleteCollection?: (collectionSlug: string) => void
    onEditCollection?: (collection: Collection) => void
}) {
    const { notify } = useNotifications()
    const { collectionSlug } = useParams()
    const navigate = useNavigate()
    const location = useLocation()
    const state = location.state as { collectionSnapshot?: Collection } | null

    // Try to find by slug first, then by ID.
    const collection = collections.find(c => c.slug === collectionSlug || c.id === collectionSlug)
    const snapshotCollection = state?.collectionSnapshot &&
        (state.collectionSnapshot.slug === collectionSlug || state.collectionSnapshot.id === collectionSlug)
        ? state.collectionSnapshot
        : null
    const [externalCollection, setExternalCollection] = useState<Collection | null>(null)

    // Explicit refresh for post-mutation actions.
    const refetchExternalCollection = async () => {
        if (collectionSlug) {
            try {
                const fetched = await APIService.getCollection(collectionSlug)
                setExternalCollection(fetched)
            } catch (e) {
                console.error('Failed to refetch collection:', e)
            }
        }
    }

    useEffect(() => {
        const load = async () => {
            // Avoid extra backend call when we already have collection data from
            // list state or route-state snapshot.
            if (!collection && !snapshotCollection && collectionSlug) {
                try {
                    const fetched = await APIService.getCollection(collectionSlug)
                    setExternalCollection(fetched)
                } catch (error) {
                    console.warn('[CollectionDetailPage] Failed to load collection:', collectionSlug, error)
                    setExternalCollection(null)
                }
            }
        }
        load()
    }, [collection, snapshotCollection, collectionSlug])

    const effectiveCollection = externalCollection || snapshotCollection || collection || null

    if (!effectiveCollection) {
        return (
            <div className="text-center py-12">
                <p className="text-lg text-muted-foreground">Collection not found</p>
                <Button variant="outline" onClick={() => navigate('/collections')} className="mt-4">
                    Back to Collections
                </Button>
            </div>
        )
    }

    return (
        <CollectionDetail
            collection={effectiveCollection}
            ratings={ratings}
            products={products}
            onBack={() => navigate('/collections')}
            onRemoveProduct={async (productSlug) => {
                onRemoveProductFromCollection(effectiveCollection.slug || effectiveCollection.id, productSlug)
                // Refetch collection after removal to update UI
                await refetchExternalCollection()
            }}
            onSelectProduct={(productSlug) => navigate(`/product/${productSlug}`)}
            isOwner={user?.id === effectiveCollection.userId}
            userAccount={userAccount}
            onDeleteProduct={onDeleteProduct}
            onDeleteCollection={onDeleteCollection ? async () => {
                await onDeleteCollection(effectiveCollection.slug || effectiveCollection.id)
                navigate('/collections')
            } : undefined}
            onEditCollection={onEditCollection ? () => onEditCollection(effectiveCollection) : undefined}
            onTogglePrivacy={async (nextPublic) => {
                try {
                    const updated = await APIService.updateCollection(effectiveCollection.id, { isPublic: nextPublic })
                    if (updated) {
                        // Update local list if present
                        if (collections.find(c => c.slug === effectiveCollection.slug)) {
                            // trigger state change via navigation back
                        }
                        // Update fallback state for direct-link views
                        setExternalCollection(updated)
                        notify.success(`Collection is now ${nextPublic ? 'public' : 'private'}`)
                    }
                } catch {
                    notify.error('Failed to update collection visibility')
                }
            }}
        />
    )
}