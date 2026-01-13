import { useState, useEffect, useRef } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { CollectionCreateInput } from '@/lib/types'

type CreateCollectionDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreateCollection: (collection: CollectionCreateInput) => void
  initialProductSlugs?: string[]
  initialName?: string
  initialDescription?: string
  initialIsPublic?: boolean
  username: string
  title?: string
  description?: string
  hideProductSlugs?: boolean
}

export function CreateCollectionDialog({
  open,
  onOpenChange,
  onCreateCollection,
  initialProductSlugs = [],
  initialName,
  initialDescription,
  initialIsPublic,
  username,
  title = 'Create Collection',
  description = 'Create a new collection to organize related products',
  hideProductSlugs = false,
}: CreateCollectionDialogProps) {
  const [name, setName] = useState('')
  const [collectionDescription, setCollectionDescription] = useState('')
  const [isPublic, setIsPublic] = useState(true)
  const [errors, setErrors] = useState<{ id: string; message: string }[]>([])
  const errorSummaryRef = useRef<HTMLDivElement>(null)

  // Initialize fields when dialog opens with provided initial values
  // This ensures "Save as Collection" from search can prefill values
  useEffect(() => {
    if (open) {
      setName(initialName ?? '')
      setCollectionDescription(initialDescription ?? '')
      setIsPublic(initialIsPublic ?? true)
    }
  }, [open, initialName, initialDescription, initialIsPublic])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    const validationErrors: { id: string; message: string }[] = []
    
    if (!name.trim()) {
      validationErrors.push({ id: 'collection-name', message: 'Collection name is required.' })
    }
    
    if (validationErrors.length > 0) {
      setErrors(validationErrors)
      setTimeout(() => errorSummaryRef.current?.focus(), 0)
      return
    }
    
    setErrors([])

    onCreateCollection({
      name: name.trim(),
      description: collectionDescription.trim() || undefined,
      username,
      productSlugs: initialProductSlugs,
      isPublic,
    })

    setName('')
    setCollectionDescription('')
    setIsPublic(false)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{title || 'Create Collection'}</DialogTitle>
          <DialogDescription>
            {description || 'Create a collection to organize and save products you\'re interested in'}
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
          <fieldset className="space-y-4 py-4" aria-describedby="collection-help">
            <legend className="sr-only">Collection details</legend>
            <p id="collection-help" className="text-sm text-muted-foreground">
              Provide a name and optional description. Public collections are visible to others.
            </p>
            <div className="space-y-2">
              <label className="block text-sm leading-none font-medium select-none group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50 peer-disabled:cursor-not-allowed peer-disabled:opacity-50">
                Collection Name <span aria-hidden="true" className="text-destructive">*</span>
                <Input
                  id="collection-name"
                  name="name"
                  autoComplete="off"
                  placeholder="My Accessibility Tools"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value)
                    setErrors((prev) => prev.filter((err) => err.id !== 'collection-name'))
                  }}
                  required
                  aria-required="true"
                  aria-invalid={errors.some((e) => e.id === 'collection-name') || undefined}
                  aria-describedby={errors.some((e) => e.id === 'collection-name') ? 'collection-name-error' : undefined}
                  className="mt-1"
                />
              </label>
              {errors.find((e) => e.id === 'collection-name') && (
                <p id="collection-name-error" className="text-sm text-destructive" role="alert">
                  Collection name is required.
                </p>
              )}
            </div>
            <div className="space-y-2">
              <label className="block text-sm leading-none font-medium select-none group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50 peer-disabled:cursor-not-allowed peer-disabled:opacity-50">
                Description (Optional)
                <Textarea
                  id="collection-description"
                  name="description"
                  autoComplete="off"
                  placeholder="Add a description for your collection..."
                  value={collectionDescription}
                  onChange={(e) => setCollectionDescription(e.target.value)}
                  rows={3}
                  className="mt-1"
                />
              </label>
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <label className="block text-sm leading-none font-medium select-none group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50 peer-disabled:cursor-not-allowed peer-disabled:opacity-50">
                  <Switch
                    id="collection-public"
                    checked={isPublic}
                    onCheckedChange={setIsPublic}
                    aria-describedby="collection-public-help"
                  />
                  Make Public
                </label>
                <p id="collection-public-help" className="text-sm text-muted-foreground">
                  Allow others to view this collection
                </p>
              </div>
            </div>
          </fieldset>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!name.trim()}>
              Create Collection
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
