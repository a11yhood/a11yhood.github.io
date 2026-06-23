import { useState, useEffect, useMemo, useRef } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Checkbox } from '@/components/ui/checkbox'
import { Plus, FolderOpen } from '@phosphor-icons/react'
import { AddToCollectionTargets, Collection, CollectionEntry } from '@/lib/types'
import { collectionContainsCollection, collectionContainsProduct, createCollectionEntriesFromProductIds, getCollectionEntries, getCollectionEntryProductCandidates, getCollectionProductEntries, isCollectionEntry } from '@/lib/collectionUtils'
import { deriveRemovalProductTargets } from '@/lib/addToCollection'

type AddToCollectionDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  collections: Collection[]
  currentUserId?: string
  currentUsername?: string
  productSlug?: string
  productSlugs?: string[]
  entriesToAdd?: CollectionEntry[]
  preselectedCollectionKeys?: string[]
  onAddToCollection: (collectionSlug: string, targets?: AddToCollectionTargets) => void | Promise<void>
  onRemoveFromCollection?: (collectionSlug: string, productSlugs?: string[]) => void | Promise<void>
  onCreateNew: () => void
  title?: string
  description?: string
  allowRemoval?: boolean
}

export function AddToCollectionDialog({
  open,
  onOpenChange,
  collections,
  currentUserId,
  currentUsername,
  productSlug,
  productSlugs,
  entriesToAdd,
  preselectedCollectionKeys: preselectedCollectionKeysProp,
  onAddToCollection,
  onRemoveFromCollection,
  onCreateNew,
  title = 'Add to Collection',
  description = 'Select collections to add these items to',
  allowRemoval = true,
}: AddToCollectionDialogProps) {
  const [selectedCollections, setSelectedCollections] = useState<Set<string>>(new Set())
  const [initialCollections, setInitialCollections] = useState<Set<string>>(new Set())
  const [hasManualSelectionChanges, setHasManualSelectionChanges] = useState(false)
  const prevOpenRef = useRef(false)
  const syncedSelectionSignatureRef = useRef('')
  const isDevMode = import.meta.env.VITE_DEV_MODE === 'true'
  const normalizedProductSlugs = useMemo(() => {
    return (productSlugs && productSlugs.length > 0)
      ? productSlugs.filter(Boolean)
      : (productSlug ? [productSlug] : [])
  }, [productSlug, productSlugs])
  const normalizedEntriesToAdd = useMemo(() => {
    if (entriesToAdd && entriesToAdd.length > 0) {
      return entriesToAdd.filter(isCollectionEntry)
    }

    return createCollectionEntriesFromProductIds(normalizedProductSlugs)
  }, [entriesToAdd, normalizedProductSlugs])
  const normalizedProductTargetGroups = useMemo(() => {
    return normalizedEntriesToAdd
      .filter((entry) => entry.kind === 'product')
      .map((entry) => getCollectionEntryProductCandidates(entry))
      .filter((candidates) => candidates.length > 0)
  }, [normalizedEntriesToAdd])
  const normalizedRemovalProductTargets = useMemo(() => {
    return deriveRemovalProductTargets(normalizedEntriesToAdd, normalizedProductSlugs)
  }, [normalizedEntriesToAdd, normalizedProductSlugs])
  const canPreselectExistingCollections = useMemo(
    () => normalizedEntriesToAdd.length > 0
      && normalizedEntriesToAdd.every((entry) => entry.kind === 'product' && !!(entry.targetSlug || entry.targetId))
      && normalizedProductTargetGroups.length > 0,
    [normalizedEntriesToAdd, normalizedProductTargetGroups]
  )

  const collectionTargetsToAdd = useMemo(
    () => normalizedEntriesToAdd
      .filter((entry) => entry.kind === 'collection')
      .map((entry) => entry.targetId || entry.targetSlug || '')
      .filter(Boolean),
    [normalizedEntriesToAdd]
  )

  const isCollectionOwner = (collection: Collection) => {
    return !!currentUserId && collection.userId === currentUserId
  }

  const isCollectionEditor = (collection: Collection) => {
    const isEditorById = !!currentUserId && (collection.editorIds || []).includes(currentUserId)
    const isEditorByUsername = !!currentUsername && (collection.editorUsernames || []).includes(currentUsername)
    return isEditorById || isEditorByUsername
  }

  const getCollectionDisplayName = (collection: Collection) => {
    const isOwner = isCollectionOwner(collection)
    const isEditor = isCollectionEditor(collection)
    return !isOwner && isEditor ? `${collection.name} [editor]` : collection.name
  }

  const editableCollections = collections.filter((collection) => {
    if (!currentUserId && !currentUsername) return true

    const isOwner = isCollectionOwner(collection)
    const isEditor = isCollectionEditor(collection)

    return isOwner || isEditor
  })

  const eligibleCollections = useMemo(() => {
    if (collectionTargetsToAdd.length === 0) {
      return editableCollections
    }

    const sourceCollections = collectionTargetsToAdd
      .map((sourceCollectionId) => collections.find(
        (candidate) => candidate.id === sourceCollectionId || candidate.slug === sourceCollectionId
      ))
      .filter((collection): collection is Collection => !!collection)

    return editableCollections.filter((collection) => {
      const targetCollectionKey = collection.id || collection.slug
      if (!targetCollectionKey) return false

      return !collectionTargetsToAdd.some((sourceCollectionId) => {
        if (sourceCollectionId === collection.id || sourceCollectionId === collection.slug) {
          // A collection cannot contain itself.
          return true
        }

        const sourceCollection = sourceCollections.find(
          (source) => source.id === sourceCollectionId || source.slug === sourceCollectionId
        )

        if (!sourceCollection) {
          return false
        }

        const sourceKeys = new Set<string>([
          sourceCollectionId,
          sourceCollection.id,
          sourceCollection.slug,
        ].filter(Boolean) as string[])

        // Exclude targets that already include this source as a direct child
        // to prevent duplicate entries for the same collection.
        const hasDirectDuplicate = getCollectionEntries(collection).some((entry) => {
          if (entry.kind !== 'collection') {
            return false
          }

          const entryTarget = entry.targetId || entry.targetSlug
          return !!entryTarget && sourceKeys.has(entryTarget)
        })

        if (hasDirectDuplicate) {
          return true
        }

        // Prevent cycles: if source already contains target, target cannot include source.
        return collectionContainsCollection(sourceCollection, targetCollectionKey, collections)
      })
    })
  }, [collectionTargetsToAdd, editableCollections, collections])

  const computedPreselectedCollectionKeys = useMemo(() => {
    if (preselectedCollectionKeysProp && preselectedCollectionKeysProp.length > 0) {
      return Array.from(new Set(preselectedCollectionKeysProp.filter(Boolean))).sort()
    }

    if (!canPreselectExistingCollections) {
      return []
    }

    return eligibleCollections
      .filter((collection) => normalizedProductTargetGroups.every((candidates) => {
        return candidates.some((candidate) => collectionContainsProduct(collection, candidate, collections))
      }))
      .map((c) => c.slug || c.id)
      .filter(Boolean)
      .sort()
  }, [preselectedCollectionKeysProp, canPreselectExistingCollections, eligibleCollections, normalizedProductTargetGroups, collections])

  const preselectedCollectionSignature = computedPreselectedCollectionKeys.join('|')

  // Keep the initial selection in sync until the user changes it so late
  // collection loads still precheck existing memberships.
  useEffect(() => {
    if (open && !prevOpenRef.current) {
      setHasManualSelectionChanges(false)
      syncedSelectionSignatureRef.current = ''
      if (isDevMode) {
        console.debug('[AddToCollectionDialog] Opening dialog', {
          title,
          providedPreselectedCollectionKeys: preselectedCollectionKeysProp || [],
          computedPreselectedCollectionKeys,
          eligibleCollectionKeys: eligibleCollections.map((collection) => collection.slug || collection.id),
          normalizedEntriesToAdd,
        })
      }
    }

    if (open && !hasManualSelectionChanges && syncedSelectionSignatureRef.current !== preselectedCollectionSignature) {
      const syncedInitial = new Set(computedPreselectedCollectionKeys)
      setSelectedCollections(syncedInitial)
      setInitialCollections(syncedInitial)
      syncedSelectionSignatureRef.current = preselectedCollectionSignature
    }

    prevOpenRef.current = open
  }, [
    open,
    hasManualSelectionChanges,
    computedPreselectedCollectionKeys,
    preselectedCollectionSignature,
    isDevMode,
    title,
    preselectedCollectionKeysProp,
    eligibleCollections,
    normalizedEntriesToAdd,
  ])

  const handleToggleCollection = (collectionSlug: string, isChecked: boolean) => {
    setHasManualSelectionChanges(true)
    const newSelected = new Set(selectedCollections)
    if (isChecked) {
      newSelected.add(collectionSlug)
    } else {
      newSelected.delete(collectionSlug)
    }
    setSelectedCollections(newSelected)
  }

  const handleDone = async () => {
    // Find collections that were added (in selected but not in initial)
    const added = Array.from(selectedCollections).filter(slug => !initialCollections.has(slug))
    // Find collections that were removed (in initial but not in selected)
    const removed = Array.from(initialCollections).filter(slug => !selectedCollections.has(slug))

    onOpenChange(false)

    const payload = entriesToAdd && entriesToAdd.length > 0 ? normalizedEntriesToAdd : normalizedProductSlugs

    void Promise.all([
      ...added.map((slug) => onAddToCollection(slug, payload)),
      ...(allowRemoval && onRemoveFromCollection ? removed.map((slug) => onRemoveFromCollection(slug, normalizedRemovalProductTargets)) : [])
    ]).catch(() => undefined)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {description}
          </DialogDescription>
        </DialogHeader>
        
        {eligibleCollections.length === 0 ? (
          <div className="py-8 text-center">
            <FolderOpen size={48} className="mx-auto mb-4 text-muted-foreground" />
            <p className="text-sm text-muted-foreground mb-4">
              {collectionTargetsToAdd.length > 0
                ? 'No valid target collections are available for this collection entry'
                : "You don't have editor access to any collections yet"}
            </p>
            <Button onClick={onCreateNew}>
              <Plus size={18} className="mr-2" />
              Create a Collection
            </Button>
          </div>
        ) : (
          <>
            <ScrollArea className="max-h-[300px] pr-4">
              <div className="space-y-3">
                {eligibleCollections.map((collection) => {
                  const collectionSlug = collection.slug || collection.id
                  const isChecked = selectedCollections.has(collectionSlug)
                  return (
                    <div
                      key={collection.id}
                      className="flex items-start gap-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                    >
                      <Checkbox
                        id={`collection-${collection.id}`}
                        checked={isChecked}
                        onCheckedChange={(checked) => {
                          handleToggleCollection(collectionSlug, checked as boolean)
                        }}
                        className="mt-1"
                      />
                      <label
                        htmlFor={`collection-${collection.id}`}
                        className="flex-1 cursor-pointer"
                      >
                        <div className="font-medium">{getCollectionDisplayName(collection)}</div>
                        {collection.description && (
                          <div className="text-sm text-muted-foreground">
                            {collection.description}
                          </div>
                        )}
                        <div className="text-xs text-muted-foreground mt-1">
                          {getCollectionProductEntries(collection).length} {getCollectionProductEntries(collection).length === 1 ? 'product' : 'products'}
                        </div>
                      </label>
                    </div>
                  )
                })}
              </div>
            </ScrollArea>
            <div className="flex justify-between items-center pt-4 border-t">
              <Button variant="ghost" onClick={onCreateNew}>
                <Plus size={18} className="mr-2" />
                New Collection
              </Button>
              <Button onClick={handleDone}>
                Done
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
