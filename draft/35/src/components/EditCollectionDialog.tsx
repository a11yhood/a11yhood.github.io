import { useState, useEffect, useRef } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Collection } from '@/lib/types'

type EditCollectionDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  collection: Collection | null
  onUpdateCollection: (collectionSlug: string, updates: Partial<Omit<Collection, 'id' | 'createdAt' | 'userId'>>) => void
}

export function EditCollectionDialog({
  open,
  onOpenChange,
  collection,
  onUpdateCollection,
}: EditCollectionDialogProps) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [isPublic, setIsPublic] = useState(false)
  const [errors, setErrors] = useState<{ id: string; message: string }[]>([])
  const errorSummaryRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (collection) {
      setName(collection.name)
      setDescription(collection.description || '')
      setIsPublic(collection.isPublic)
    }
  }, [collection])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!collection) return
    
    const validationErrors: { id: string; message: string }[] = []
    
    if (!name.trim()) {
      validationErrors.push({ id: 'edit-collection-name', message: 'Collection name is required.' })
    }
    
    if (validationErrors.length > 0) {
      setErrors(validationErrors)
      setTimeout(() => errorSummaryRef.current?.focus(), 0)
      return
    }
    
    setErrors([])

    onUpdateCollection(collection.slug || collection.id, {
      name: name.trim(),
      description: description.trim() || undefined,
      isPublic,
    })

    onOpenChange(false)
  }

  if (!collection) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Collection</DialogTitle>
          <DialogDescription>
            Update your collection details
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          {errors.length > 0 && (
            <div
              ref={errorSummaryRef}
              role="alert"
              aria-live="assertive"
              tabIndex={-1}
              className="border border-destructive/40 bg-destructive/5 text-destructive rounded-md p-4 space-y-2 mb-4"
            >
              <p className="font-semibold">Please fix the following:</p>
              <ul className="list-disc pl-5 space-y-1">
                {errors.map((error) => (
                  <li key={error.id}>
                    <a href={`#${error.id}`} className="underline">
                      {error.message}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <fieldset className="space-y-4 py-4" aria-describedby="edit-collection-help">
            <legend className="sr-only">Collection details</legend>
            <p id="edit-collection-help" className="text-sm text-muted-foreground">
              Update the collection name, description, and visibility.
            </p>
            <div className="space-y-2">
              <Label htmlFor="edit-collection-name">Collection Name <span aria-hidden="true" className="text-destructive">*</span></Label>
              <Input
                id="edit-collection-name"
                name="name"
                autoComplete="off"
                placeholder="My Accessibility Tools"
                value={name}
                onChange={(e) => {
                  setName(e.target.value)
                  setErrors((prev) => prev.filter((err) => err.id !== 'edit-collection-name'))
                }}
                required
                aria-required="true"
                aria-invalid={errors.some((e) => e.id === 'edit-collection-name') || undefined}
                aria-describedby={errors.some((e) => e.id === 'edit-collection-name') ? 'edit-collection-name-error' : undefined}
              />
              {errors.find((e) => e.id === 'edit-collection-name') && (
                <p id="edit-collection-name-error" className="text-sm text-destructive" role="alert">
                  Collection name is required.
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-collection-description">Description (Optional)</Label>
              <Textarea
                id="edit-collection-description"
                name="description"
                autoComplete="off"
                placeholder="Add a description for your collection..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="edit-collection-public">Make Public</Label>
                <p id="edit-collection-public-help" className="text-sm text-muted-foreground">
                  Allow others to view this collection
                </p>
              </div>
              <Switch
                id="edit-collection-public"
                checked={isPublic}
                onCheckedChange={setIsPublic}
                aria-describedby="edit-collection-public-help"
              />
            </div>
          </fieldset>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!name.trim()}>
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
