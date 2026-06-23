import React, { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { ProductDetail } from '@/components/ProductDetail'
import { APIService } from '@/lib/api'
import { Collection, CollectionCreateInput, Discussion, Product, Rating, UserAccount, UserData } from '@/lib/types'
import { ApiErrorLike } from '@/App'
import { useNotifications } from '@/contexts/NotificationContext'

export function ProductDetailPage({
    products,
    ratings,
    discussions,
    user,
    userAccount,
    userCollections,
    onRate,
    onDiscuss,
    onAddTag,
    onAddToCollection,
    onRemoveFromCollection,
    onCreateCollection,
    onDelete,
    onEdit,
    onToggleBan,
    onEditDiscussion,
    onDeleteDiscussion,
    onToggleBlockDiscussion,
    onLogin,
    allTags,
    allProductTypes = [],
}: {
    products: Product[]
    ratings: Rating[]
    discussions: Discussion[]
    user: UserData | null
    userAccount: UserAccount | null
    userCollections: Collection[]
    onRate: (productId: string, rating: number) => void
    onDiscuss: (productId: string, content: string, parentId?: string) => void
    onAddTag: (productId: string, tag: string, productObj?: Product) => void
    onAddToCollection: (collectionSlug: string) => Promise<void>
    onRemoveFromCollection: (collectionSlug: string) => Promise<void>
    onCreateCollection: (data: CollectionCreateInput) => void
    onDelete: (productId: string) => void
    onEdit: (product: Product) => void
    onToggleBan: (product: Product, reason?: string) => void
    onEditDiscussion: (id: string, content: string) => Promise<void> | void
    onDeleteDiscussion: (id: string) => Promise<void> | void
    onToggleBlockDiscussion: (id: string, block: boolean) => Promise<void> | void
    onLogin: (returnToPath?: string) => void
    allTags: string[]
    allProductTypes?: string[]
}) {
    const { slug: productSlug } = useParams()
    const [searchParams] = useSearchParams()
    const autoOpenEdit = searchParams.get('edit') === '1'
    const autoOpenOwnershipRequest = searchParams.get('requestEdit') === '1'
    const navigate = useNavigate()
    const [product, setProduct] = useState<Product | null>(null)
    const [loading, setLoading] = useState(true)
    const previousProductSlugRef = useRef<string | undefined>(undefined)

    useEffect(() => {
        let isActive = true

        const slugChanged = previousProductSlugRef.current !== productSlug
        previousProductSlugRef.current = productSlug

        // Clear stale product data immediately when navigating between slugs.
        // Without this, child effects can issue requests for the previous product ID.
        if (slugChanged) {
            setLoading(true)
            setProduct(null)
        }

        const fetchProduct = async () => {
            if (!productSlug) {
                if (isActive) {
                    setLoading(false)
                }
                return
            }

            try {
                // First check if product is already in the products array (from home page navigation)
                const cachedProduct = products.find(p => p.slug === productSlug)
                if (cachedProduct) {
                    if (isActive) {
                        setProduct({ ...cachedProduct, slug: cachedProduct.slug ?? productSlug })
                        setLoading(false)
                    }
                    return
                }

                // Otherwise fetch just this product
                const fetchedProduct = await APIService.getProductBySlug(productSlug)
                if (isActive) {
                    setProduct(fetchedProduct ? { ...fetchedProduct, slug: fetchedProduct.slug ?? productSlug } : null)
                }
            } catch (error) {
                const status = (error as ApiErrorLike | undefined)?.status
                // 404 is expected when the URL slug is stale or invalid.
                // Treat it as a normal "not found" state without noisy error logging.
                if (status !== 404 && isActive) {
                    console.error('Failed to fetch product:', error)
                }
                if (isActive) {
                    setProduct(null)
                }
            } finally {
                if (isActive) {
                    setLoading(false)
                }
            }
        }

        void fetchProduct()

        return () => {
            isActive = false
        }
    }, [productSlug, products])

    if (loading) {
        return (
            <div className="text-center py-12">
                <p className="text-lg text-muted-foreground">Loading...</p>
            </div>
        )
    }

    if (!product) {
        return (
            <div className="text-center py-12">
                <p className="text-lg text-muted-foreground">Product not found</p>
                <Button variant="outline" onClick={() => navigate('/')} className="mt-4">
                    Back to Products
                </Button>
            </div>
        )
    }

    return (
        <ProductDetail
            product={product}
            ratings={ratings}
            discussions={discussions}
            user={user}
            userAccount={userAccount}
            userCollections={userCollections}
            onBack={() => navigate('/')}
            onRate={(rating) => onRate(product.id, rating)}
            onDiscuss={(content, parentId) => onDiscuss(product.id, content, parentId)}
            onAddTag={(tag) => onAddTag(product.slug ?? product.id, tag, product)}
            onAddToCollection={onAddToCollection}
            onRemoveFromCollection={onRemoveFromCollection}
            onCreateCollection={onCreateCollection}
            allTags={allTags}
            allProductTypes={allProductTypes}
            onDelete={onDelete}
            onEdit={onEdit}
            onToggleBan={onToggleBan}
            onEditDiscussion={onEditDiscussion}
            onDeleteDiscussion={onDeleteDiscussion}
            onToggleBlockDiscussion={onToggleBlockDiscussion}
            onRequireLogin={onLogin}
            autoOpenEdit={autoOpenEdit}
            autoOpenOwnershipRequest={autoOpenOwnershipRequest}
        />
    )
}

export function ProductDetailPageWrapper({
    products,
    ratings,
    discussions,
    user,
    userAccount,
    userCollections,
    onRate,
    onDiscuss,
    onAddTag,
    onCollectionsChange,
    onCreateCollection,
    onDelete,
    onEdit,
    onToggleBan,
    onEditDiscussion,
    onDeleteDiscussion,
    onToggleBlockDiscussion,
    onLogin,
    allTags,
    allProductTypes = [],
}: {
    products: Product[]
    ratings: Rating[]
    discussions: Discussion[]
    user: UserData | null
    userAccount: UserAccount | null
    userCollections: Collection[]
    onRate: (productId: string, rating: number) => void
    onDiscuss: (productId: string, content: string, parentId?: string) => void
    onAddTag: (productId: string, tag: string, productObj?: Product) => void
    onCollectionsChange: (collections: Collection[] | ((current: Collection[]) => Collection[])) => void
    onCreateCollection: (data: CollectionCreateInput) => void
    onDelete: (productId: string) => void
    onEdit: (product: Product) => void
    onToggleBan: (product: Product, reason?: string) => void
    onEditDiscussion: (id: string, content: string) => Promise<void> | void
    onDeleteDiscussion: (id: string) => Promise<void> | void
    onToggleBlockDiscussion: (id: string, block: boolean) => Promise<void> | void
    onLogin: (returnToPath?: string) => void
    allTags: string[]
    allProductTypes?: string[]
}) {
    const { notify } = useNotifications()
    const { slug } = useParams()
    const [searchParams] = useSearchParams()
    void searchParams

    const [localRatings, setLocalRatings] = useState<Rating[]>(ratings)
    const [localDiscussions, setLocalDiscussions] = useState<Discussion[]>(discussions)
    const localDiscussionsRef = useRef<Discussion[]>(discussions)

    // Fetch missing ratings/discussions independently.
    // Avoid coupling discussion availability to ratings preloads.
    useEffect(() => {
        const fetchData = async () => {
            const needsRatings = ratings.length === 0
            const needsDiscussions = discussions.length === 0

            if (!needsRatings && !needsDiscussions) {
                return
            }

            try {
                const tasks: Array<Promise<Rating[] | Discussion[]>> = []
                if (needsRatings) tasks.push(APIService.getAllRatings())
                if (needsDiscussions) tasks.push(APIService.getAllDiscussions())

                const results = await Promise.allSettled(tasks)
                let idx = 0

                if (needsRatings) {
                    const ratingsResult = results[idx]
                    idx += 1
                    if (ratingsResult?.status === 'fulfilled') {
                        setLocalRatings(ratingsResult.value as Rating[])
                    }
                }

                if (needsDiscussions) {
                    const discussionsResult = results[idx]
                    if (discussionsResult?.status === 'fulfilled') {
                        setLocalDiscussions(discussionsResult.value as Discussion[])
                    }
                }
            } catch (error) {
                console.warn('[ProductDetailPageWrapper] Failed to fetch ratings/discussions:', error)
            }
        }
        fetchData()
    }, [ratings.length, discussions.length])

    // Keep local state in sync when parent updates
    useEffect(() => {
        if (ratings.length > 0) setLocalRatings(ratings)
    }, [ratings])

    useEffect(() => {
        if (discussions.length > 0) setLocalDiscussions(discussions)
    }, [discussions])

    useEffect(() => {
        localDiscussionsRef.current = localDiscussions
    }, [localDiscussions])

    const resolveProductCollectionTarget = (candidate?: string): string => {
        const normalizedCandidate = typeof candidate === 'string' ? candidate.trim() : ''
        const resolvedProduct = products.find((item) =>
            item.id === normalizedCandidate || item.slug === normalizedCandidate
        )

        if (resolvedProduct) {
            return resolvedProduct.slug || resolvedProduct.id
        }

        return normalizedCandidate || slug || ''
    }

    const handleAddToCollection = async (collectionSlug: string, productSlugs?: string[]) => {
        const explicitTarget = productSlugs?.find((value) => !!value)
        const targetKey = resolveProductCollectionTarget(explicitTarget)
        if (!targetKey) return

        if (!collectionSlug) return

        const updated = await APIService.addProductToCollection(collectionSlug, targetKey)
        if (updated) {
            onCollectionsChange((current) => current.map((c) => ((c.slug || c.id) === collectionSlug ? updated : c)))
            notify.success('Added to collection')
        }
    }

    const handleRemoveFromCollection = async (collectionSlug: string, productSlugs?: string[]) => {
        const explicitTarget = productSlugs?.find((value) => !!value)
        const targetKey = resolveProductCollectionTarget(explicitTarget)
        if (!targetKey) return

        const updated = await APIService.removeProductFromCollection(collectionSlug, targetKey)
        if (updated) {
            onCollectionsChange((current) => current.map((c) => ((c.slug || c.id) === collectionSlug ? updated : c)))
            notify.success('Removed from collection')
        }
    }

    const handleEditDiscussionLocal = async (id: string, content: string) => {
        const previous = localDiscussionsRef.current.find((d) => d.id === id)

        setLocalDiscussions((current) => {
            const editedAt = Date.now()
            return current.map((d) => (d.id === id ? { ...d, content, editedAt } : d))
        })

        try {
            await onEditDiscussion(id, content)
        } catch (error) {
            if (previous) {
                setLocalDiscussions((current) => current.map((d) => (d.id === id ? previous : d)))
            }
            throw error
        }
    }

    return (
        <ProductDetailPage
            products={products}
            ratings={localRatings}
            discussions={localDiscussions}
            user={user}
            userAccount={userAccount}
            userCollections={userCollections}
            onRate={onRate}
            onDiscuss={onDiscuss}
            onAddTag={onAddTag}
            onAddToCollection={handleAddToCollection}
            onRemoveFromCollection={handleRemoveFromCollection}
            onCreateCollection={onCreateCollection}
            onDelete={onDelete}
            onEdit={onEdit}
            onToggleBan={onToggleBan}
            onEditDiscussion={handleEditDiscussionLocal}
            onDeleteDiscussion={onDeleteDiscussion}
            onToggleBlockDiscussion={onToggleBlockDiscussion}
            onLogin={onLogin}
            allTags={allTags}
            allProductTypes={allProductTypes}
        />
    )
}
