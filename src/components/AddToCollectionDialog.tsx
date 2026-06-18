import { useState, useEffect, useMemo, useRef } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Checkbox } from '@/components/ui/checkbox'
import { Plus, FolderOpen } from '@phosphor-icons/react'
import { Collection } from '@/lib/types'
import { collectionContainsAllProducts, getCollectionProductEntries } from '@/lib/collectionUtils'

type AddToCollectionDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  collections: Collection[]
  currentUserId?: string
  currentUsername?: string
  productSlug?: string
  productSlugs?: string[]
  onAddToCollection: (collectionSlug: string, productSlugs?: string[]) => void
  onRemoveFromCollection?: (collectionSlug: string, productSlugs?: string[]) => void
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
  onAddToCollection,
  onRemoveFromCollection,
  onCreateNew,
  title = 'Add to Collection',
  description = 'Select collections to add these items to',
  allowRemoval = true,
}: AddToCollectionDialogProps) {
  const [selectedCollections, setSelectedCollections] = useState<Set<string>>(new Set())
  const [initialCollections, setInitialCollections] = useState<Set<string>>(new Set())
  const prevOpenRef = useRef(false)
  const normalizedProductSlugs = useMemo(() => {
    return (productSlugs && productSlugs.length > 0)
      ? productSlugs.filter(Boolean)
      : (productSlug ? [productSlug] : [])
  }, [productSlug, productSlugs])

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

  // Update selectedCollections only when dialog opens (not every time collections change)
  useEffect(() => {
    if (open && !prevOpenRef.current) {
      // Dialog is opening
      const initial = new Set(editableCollections.filter(c => collectionContainsAllProducts(c, normalizedProductSlugs, collections)).map(c => c.slug || c.id))
      setSelectedCollections(initial)
      setInitialCollections(initial)
    }
    prevOpenRef.current = open
  }, [open, editableCollections, normalizedProductSlugs, collections])

  const handleToggleCollection = (collectionSlug: string, isChecked: boolean) => {
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

    // Execute all changes
    await Promise.all([
      ...added.map(slug => onAddToCollection(slug, normalizedProductSlugs)),
      ...(allowRemoval && onRemoveFromCollection ? removed.map(slug => onRemoveFromCollection(slug, normalizedProductSlugs)) : [])
    ])

    onOpenChange(false)
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
        
        {editableCollections.length === 0 ? (
          <div className="py-8 text-center">
            <FolderOpen size={48} className="mx-auto mb-4 text-muted-foreground" />
            <p className="text-sm text-muted-foreground mb-4">
              You don't have editor access to any collections yet
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
                {editableCollections.map((collection) => {
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
