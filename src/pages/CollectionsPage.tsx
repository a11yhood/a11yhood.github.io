import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { CollectionsList } from '@/components/CollectionsList'
import { AddToCollectionDefaults, Collection, Product, UserAccount, UserData } from '@/lib/types'
import { APIService } from '@/lib/api'
import { getCollectionProductSlugs } from '@/lib/collectionUtils'
import { useNavigate } from 'react-router-dom'



export function CollectionsPage({
    collections,
    collectionsLoaded,
    products,
    user,
    userAccount,
    onDeleteCollection,
    onEditCollection,
    onCreateCollection,
    onOpenAddToCollection
}: {
    collections: Collection[]
    collectionsLoaded: boolean
    products: Product[]
    user: UserData | null
    userAccount: UserAccount | null
    onDeleteCollection: (collectionSlug: string) => void
    onEditCollection: (collection: Collection) => void
    onCreateCollection: () => void
    onOpenAddToCollection: (defaults: AddToCollectionDefaults) => void
}) {
    const navigate = useNavigate()
    const [ownerPage, setOwnerPage] = useState(1)
    const [editorPage, setEditorPage] = useState(1)
    const [publicPage, setPublicPage] = useState(1)
    const [collectionProducts, setCollectionProducts] = useState<Product[]>([])
    const [loadedCollectionIds, setLoadedCollectionIds] = useState<Set<string>>(new Set())
    const itemsPerPage = 12 // 3 columns x 4 rows

    const currentUserId = userAccount?.id || user?.id
    const currentUsername = userAccount?.username || user?.username
    const ownerCollections = collections.filter((collection) => !!currentUserId && collection.userId === currentUserId)
    const editorCollections = collections.filter((collection) => {
        if (!currentUserId && !currentUsername) return false
        if (currentUserId && collection.userId === currentUserId) return false

        const isEditorById = !!currentUserId && (collection.editorIds || []).includes(currentUserId)
        const isEditorByUsername = !!currentUsername && (collection.editorUsernames || []).includes(currentUsername)

        return isEditorById || isEditorByUsername
    })

    // Paginate collections
    const ownerStart = (ownerPage - 1) * itemsPerPage
    const ownerEnd = ownerStart + itemsPerPage
    const paginatedOwnerCollections = ownerCollections.slice(ownerStart, ownerEnd)
    const ownerTotalPages = Math.ceil(ownerCollections.length / itemsPerPage)

    const editorStart = (editorPage - 1) * itemsPerPage
    const editorEnd = editorStart + itemsPerPage
    const paginatedEditorCollections = editorCollections.slice(editorStart, editorEnd)
    const editorTotalPages = Math.ceil(editorCollections.length / itemsPerPage)

    const myCollectionIds = new Set([...ownerCollections, ...editorCollections].map((collection) => collection.id))
    const filteredPublicCollections = collections.filter((collection) => collection.isPublic && !myCollectionIds.has(collection.id))
    const publicStart = (publicPage - 1) * itemsPerPage
    const publicEnd = publicStart + itemsPerPage
    const paginatedPublicCollections = filteredPublicCollections.slice(publicStart, publicEnd)
    const publicTotalPages = Math.ceil(filteredPublicCollections.length / itemsPerPage)

    // Reset loaded collections when pagination changes
    useEffect(() => {
        setLoadedCollectionIds(new Set())
        setCollectionProducts([])
    }, [ownerPage, editorPage, publicPage])

    // Load products from each visible collection for image display, one collection at a time
    useEffect(() => {
        const loadNextCollectionImages = async () => {
            const visibleCollections = [...paginatedOwnerCollections, ...paginatedEditorCollections, ...paginatedPublicCollections]
            const MAX_IMAGE_PRODUCTS_PER_COLLECTION = 3

            // Find the first unloaded collection
            const unloadedCollection = visibleCollections.find(c => !loadedCollectionIds.has(c.id))

            if (!unloadedCollection) return

            // Get up to the first N product slugs from this collection.
            // getCollectionProductSlugs handles both productSlugs and entries-based collections.
            const candidateProductSlugs = getCollectionProductSlugs(unloadedCollection)
                .slice(0, MAX_IMAGE_PRODUCTS_PER_COLLECTION)

            if (candidateProductSlugs.length === 0) {
                // Mark as loaded even if no products
                setLoadedCollectionIds(prev => new Set([...prev, unloadedCollection.id]))
                return
            }

            // Check which products we don't already have
            const existingSlugs = new Set([...products, ...collectionProducts].map(p => p.slug))
            const slugsToFetch = candidateProductSlugs.filter(slug => !existingSlugs.has(slug))

            console.log('[CollectionsPage] Loading image products for collection:', {
                collectionName: unloadedCollection.name,
                totalSlugs: candidateProductSlugs.length,
                slugsToFetch: slugsToFetch.length
            })

            try {
                if (slugsToFetch.length > 0) {
                    // Fetch products for this collection
                    const results = await Promise.allSettled(
                        slugsToFetch.map(slug => APIService.getProductBySlug(slug))
                    )

                    const newProducts: Product[] = []
                    results.forEach(result => {
                        if (result.status === 'fulfilled' && result.value) {
                            newProducts.push(result.value)
                        }
                    })

                    if (newProducts.length > 0) {
                        console.log('[CollectionsPage] Loaded image products for collection:', newProducts.length)
                        setCollectionProducts(prev => [...prev, ...newProducts])
                    }
                }
            } catch (error) {
                console.error('[CollectionsPage] Failed to load collection image products:', error)
            } finally {
                // Mark this collection as loaded
                setLoadedCollectionIds(prev => new Set([...prev, unloadedCollection.id]))
            }
        }

        loadNextCollectionImages()
    }, [paginatedOwnerCollections, paginatedEditorCollections, paginatedPublicCollections, products, collectionProducts, loadedCollectionIds])

    // Merge products from App and locally loaded collection products
    const allProducts = [...products, ...collectionProducts]

    const sectionStatus = (count: number) =>
        !collectionsLoaded ? 'Loading…' : count === 0 ? 'No collections found.' : `${count} ${count === 1 ? 'collection' : 'collections'}.`

    return (
        <div>
            {user ? (
                <>
                    <div className="mb-6 flex items-center justify-between">
                        <h1 className="text-3xl font-bold">Collections</h1>
                        <div className="flex items-center gap-2">
                            <Button variant="outline" onClick={onCreateCollection}>Create Collection</Button>
                            <Button variant="outline" onClick={() => navigate('/')}>
                                ← Back to Products
                            </Button>
                        </div>
                    </div>
                    <div aria-busy={!collectionsLoaded}>
                        <h2 className="text-2xl font-semibold mb-4">
                            Your Collections
                            <span className="sr-only" aria-live="polite" aria-atomic="true">{sectionStatus(ownerCollections.length)}</span>
                        </h2>
                        <CollectionsList
                            collections={paginatedOwnerCollections}
                            products={allProducts}
                            isFirstLoadComplete={collectionsLoaded}
                            onSelectCollection={(collection) =>
                                navigate(`/collections/${collection.slug || collection.id}`, {
                                    state: { collectionSnapshot: collection },
                                })
                            }
                            onDeleteCollection={onDeleteCollection}
                            onEditCollection={onEditCollection}
                            onOpenAddToCollection={onOpenAddToCollection}
                            currentUserId={currentUserId}
                            currentUsername={currentUsername}
                        />
                        {ownerTotalPages > 1 && (
                            <div className="flex justify-center gap-2 mt-6">
                                <Button
                                    variant="outline"
                                    onClick={() => setOwnerPage((p) => Math.max(1, p - 1))}
                                    disabled={ownerPage === 1}
                                >
                                    Previous
                                </Button>
                                <span className="flex items-center px-4">
                                    Page {ownerPage} of {ownerTotalPages}
                                </span>
                                <Button
                                    variant="outline"
                                    onClick={() => setOwnerPage((p) => Math.min(ownerTotalPages, p + 1))}
                                    disabled={ownerPage === ownerTotalPages}
                                >
                                    Next
                                </Button>
                            </div>
                        )}
                    </div>
                    <div className="mt-10" aria-busy={!collectionsLoaded}>
                        <h2 className="text-2xl font-semibold mb-4">
                            Editor Collections
                            <span className="sr-only" aria-live="polite" aria-atomic="true">{sectionStatus(editorCollections.length)}</span>
                        </h2>
                        <CollectionsList
                            collections={paginatedEditorCollections}
                            products={allProducts}
                            isFirstLoadComplete={collectionsLoaded}
                            onSelectCollection={(collection) =>
                                navigate(`/collections/${collection.slug || collection.id}`, {
                                    state: { collectionSnapshot: collection },
                                })
                            }
                            onDeleteCollection={onDeleteCollection}
                            onEditCollection={onEditCollection}
                            onOpenAddToCollection={onOpenAddToCollection}
                            currentUserId={currentUserId}
                            currentUsername={currentUsername}
                        />
                        {editorTotalPages > 1 && (
                            <div className="flex justify-center gap-2 mt-6">
                                <Button
                                    variant="outline"
                                    onClick={() => setEditorPage((p) => Math.max(1, p - 1))}
                                    disabled={editorPage === 1}
                                >
                                    Previous
                                </Button>
                                <span className="flex items-center px-4">
                                    Page {editorPage} of {editorTotalPages}
                                </span>
                                <Button
                                    variant="outline"
                                    onClick={() => setEditorPage((p) => Math.min(editorTotalPages, p + 1))}
                                    disabled={editorPage === editorTotalPages}
                                >
                                    Next
                                </Button>
                            </div>
                        )}
                    </div>
                </>
            ) : (
                <div className="mb-6">
                    <div className="flex items-center justify-between mb-2">
                        <h1 className="text-3xl font-bold">Collections</h1>
                        <Button variant="outline" onClick={() => navigate('/')}>
                            ← Back to Products
                        </Button>
                    </div>
                    <p className="text-lg text-muted-foreground">Log in to create your own collection</p>
                </div>
            )}

            <div className="mt-10" aria-busy={!collectionsLoaded}>
                <h2 className="text-2xl font-semibold mb-4">
                    Public Collections
                    <span className="sr-only" aria-live="polite" aria-atomic="true">{sectionStatus(filteredPublicCollections.length)}</span>
                </h2>
                <CollectionsList
                    collections={paginatedPublicCollections}
                    products={allProducts}
                    isFirstLoadComplete={collectionsLoaded}
                    onSelectCollection={(collection) =>
                        navigate(`/collections/${collection.slug || collection.id}`, {
                            state: { collectionSnapshot: collection },
                        })
                    }
                    onDeleteCollection={() => { /* no-op for public */ }}
                    onOpenAddToCollection={onOpenAddToCollection}
                    currentUserId={currentUserId}
                    currentUsername={currentUsername}
                />
                {publicTotalPages > 1 && (
                    <div className="flex justify-center gap-2 mt-6">
                        <Button
                            variant="outline"
                            onClick={() => setPublicPage(p => Math.max(1, p - 1))}
                            disabled={publicPage === 1}
                        >
                            Previous
                        </Button>
                        <span className="flex items-center px-4">
                            Page {publicPage} of {publicTotalPages}
                        </span>
                        <Button
                            variant="outline"
                            onClick={() => setPublicPage(p => Math.min(publicTotalPages, p + 1))}
                            disabled={publicPage === publicTotalPages}
                        >
                            Next
                        </Button>
                    </div>
                )}
            </div>
        </div>
    )
}
