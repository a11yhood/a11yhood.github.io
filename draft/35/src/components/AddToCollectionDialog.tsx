import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Checkbox } from '@/components/ui/checkbox'
import { Plus, FolderOpen } from '@phosphor-icons/react'
import { Collection } from '@/lib/types'

type AddToCollectionDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  collections: Collection[]
  productSlug: string
  onAddToCollection: (collectionSlug: string) => void
  onRemoveFromCollection: (collectionSlug: string) => void
  onCreateNew: () => void
}

export function AddToCollectionDialog({
  open,
  onOpenChange,
  collections,
  productSlug,
  onAddToCollection,
  onRemoveFromCollection,
  onCreateNew,
}: AddToCollectionDialogProps) {
  const [selectedCollections, setSelectedCollections] = useState<Set<string>>(
    new Set(collections.filter(c => (c.productSlugs || []).includes(productSlug)).map(c => c.slug || c.id))
  )
  const [initialCollections, setInitialCollections] = useState<Set<string>>(new Set())

  // Update selectedCollections when dialog opens or collections change
  useEffect(() => {
    if (open) {
      const initial = new Set(collections.filter(c => (c.productSlugs || []).includes(productSlug)).map(c => c.slug || c.id))
      setSelectedCollections(initial)
      setInitialCollections(initial)
    }
  }, [open, collections, productSlug])

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
      ...added.map(slug => onAddToCollection(slug)),
      ...removed.map(slug => onRemoveFromCollection(slug))
    ])

    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add to Collection</DialogTitle>
          <DialogDescription>
            Select collections to add this product to
          </DialogDescription>
        </DialogHeader>
        
        {collections.length === 0 ? (
          <div className="py-8 text-center">
            <FolderOpen size={48} className="mx-auto mb-4 text-muted-foreground" />
            <p className="text-sm text-muted-foreground mb-4">
              You haven't created any collections yet
            </p>
            <Button onClick={onCreateNew}>
              <Plus size={18} className="mr-2" />
              Create Your First Collection
            </Button>
          </div>
        ) : (
          <>
            <ScrollArea className="max-h-[300px] pr-4">
              <div className="space-y-3">
                {collections.map((collection) => {
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
                        <div className="font-medium">{collection.name}</div>
                        {collection.description && (
                          <div className="text-sm text-muted-foreground">
                            {collection.description}
                          </div>
                        )}
                        <div className="text-xs text-muted-foreground mt-1">
                          {(collection.productSlugs || []).length} {(collection.productSlugs || []).length === 1 ? 'product' : 'products'}
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
