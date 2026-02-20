import React, { useMemo, useRef, useState } from 'react'
import { PencilSimple } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Product, UserAccount } from '@/lib/types'
import { formatRelativeTime } from '@/lib/utils'
import { ProductImageManager } from './ProductImageManager'
import { toast } from 'sonner'

type ProductEditDialogProps = {
  product: Product
  onSave: (updatedProduct: Product) => void
  userAccount?: UserAccount | null
  autoOpen?: boolean
  allProductTypes?: string[]
}

export function ProductEditDialog({ product, onSave, userAccount, autoOpen, allProductTypes = [] }: ProductEditDialogProps) {
  const [open, setOpen] = useState(!!autoOpen)
  const [formData, setFormData] = useState<Product>(product)
  const [tagInput, setTagInput] = useState('')
  const [errors, setErrors] = useState<{ id: string; message: string }[]>([])
  const errorSummaryRef = useRef<HTMLDivElement>(null)

  const isEditor = userAccount?.id && product.editorIds?.includes(userAccount.id)
  const canEdit = userAccount?.role === 'admin' || userAccount?.role === 'moderator' || !!isEditor

  // Ensure current product type is in the list
  const availableTypes = React.useMemo(() => {
    const types = [...allProductTypes]
    if (product.type && !types.includes(product.type)) {
      types.push(product.type)
    }
    return types
  }, [allProductTypes, product.type])

  const lastUpdatedTs = useMemo(() => {
    const ts = (product as any).sourceLastUpdated ?? (product as any).source_last_updated
    if (!ts) return null
    if (typeof ts === 'number') return ts
    const parsed = Date.parse(ts)
    return Number.isNaN(parsed) ? null : parsed
  }, [product])

  if (!canEdit) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const validationErrors: { id: string; message: string }[] = []

    if (!formData.name.trim()) {
      validationErrors.push({ id: 'name', message: 'Product name is required.' })
    }

    if (!formData.description.trim()) {
      validationErrors.push({ id: 'description', message: 'Product description is required.' })
    }

    if (!formData.type.trim()) {
      validationErrors.push({ id: 'type', message: 'Product type is required.' })
    }

    if (!formData.source.trim()) {
      validationErrors.push({ id: 'source', message: 'Product source is required.' })
    }

    if (formData.imageUrl && !formData.imageAlt?.trim()) {
      validationErrors.push({ id: 'image-alt-text', message: 'Alt text is required when an image is provided.' })
    }

    if (formData.imageAlt && formData.imageAlt.trim().length < 10) {
      validationErrors.push({ id: 'image-alt-text', message: 'Alt text should be at least 10 characters.' })
    }

    if (validationErrors.length > 0) {
      setErrors(validationErrors)
      setTimeout(() => errorSummaryRef.current?.focus(), 0)
      return
    }

    setErrors([])
    onSave(formData)
    setOpen(false)
    toast.success('Product updated successfully')
  }

  const handleAddTag = () => {
    const tag = tagInput.trim().toLowerCase()
    const currentTags = formData.tags || []
    if (tag && !currentTags.includes(tag)) {
      setFormData({
        ...formData,
        tags: [...currentTags, tag],
      })
      setTagInput('')
    }
  }

  const handleRemoveTag = (tagToRemove: string) => {
    const currentTags = formData.tags || []
    setFormData({
      ...formData,
      tags: currentTags.filter((tag) => tag !== tagToRemove),
    })
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleAddTag()
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3"
          aria-label="Edit product"
        >
          <PencilSimple size={18} />
          <span className="hidden sm:inline">Edit Product</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Product</DialogTitle>
          <DialogDescription>
            Update product details. All fields marked with * are required.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          {errors.length > 0 && (
            <div
              ref={errorSummaryRef}
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

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="block text-sm leading-none font-medium select-none group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50 peer-disabled:cursor-not-allowed peer-disabled:opacity-50">
                Product Name <span aria-hidden="true" className="text-destructive">*</span>
                <Input
                  id="name"
                  name="name"
                  type="text"
                  autoComplete="off"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Enter product name"
                  required
                  aria-required="true"
                  className="mt-1"
                />
              </label>
            </div>

            <div className="space-y-2">
              <label className="block text-sm leading-none font-medium select-none group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50 peer-disabled:cursor-not-allowed peer-disabled:opacity-50">
                Description <span aria-hidden="true" className="text-destructive">*</span>
                <Textarea
                  id="description"
                  name="description"
                  autoComplete="off"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe the product"
                  rows={4}
                  required
                  aria-required="true"
                  className="mt-1"
                />
              </label>
            </div>

            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-2">
                <label className="block text-sm leading-none font-medium select-none group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50 peer-disabled:cursor-not-allowed peer-disabled:opacity-50">
                  Type <span aria-hidden="true" className="text-destructive">*</span>
                  <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value })}>
                    <SelectTrigger className="mt-1 w-full">
                      <SelectValue placeholder="Select a type" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableTypes.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </label>
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-sm leading-none font-medium select-none group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50 peer-disabled:cursor-not-allowed peer-disabled:opacity-50">
                Source <span aria-hidden="true" className="text-destructive">*</span>
                <Input
                  id="source"
                  name="source"
                  autoComplete="organization"
                  value={formData.source}
                  onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                  placeholder="e.g., GitHub, Thingiverse"
                  required
                  aria-required="true"
                  className="mt-1"
                />
              </label>
            </div>

            <div className="space-y-2">
              <label className="block text-sm leading-none font-medium select-none group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50 peer-disabled:cursor-not-allowed peer-disabled:opacity-50">
                Source URL
                <Input
                  id="source-url"
                  name="sourceUrl"
                  type="url"
                  autoComplete="url"
                  value={formData.sourceUrl || ''}
                  onChange={(e) => setFormData({ ...formData, sourceUrl: e.target.value })}
                  placeholder="https://..."
                  className="mt-1"
                />
              </label>
            </div>

            <div className="space-y-2">
              <label className="block text-sm leading-none font-medium select-none group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50 peer-disabled:cursor-not-allowed peer-disabled:opacity-50">
                Product Image
                <div className="mt-1">
                  <ProductImageManager
                    imageUrl={formData.imageUrl}
                    imageAlt={formData.imageAlt}
                    onImageChange={(imageUrl, imageAlt) => setFormData({ ...formData, imageUrl, imageAlt })}
                  />
                </div>
              </label>
              {formData.imageUrl && (
                <p className="text-xs text-muted-foreground">
                  Alt text is required for accessibility and will be saved with the image.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <label className="block text-sm leading-none font-medium select-none group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50 peer-disabled:cursor-not-allowed peer-disabled:opacity-50">
                Tags
                <div className="flex gap-2 mt-1">
                  <Input
                    id="tags"
                    name="tags"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Add a tag and press Enter"
                    autoComplete="off"
                  />
                  <Button type="button" variant="secondary" onClick={handleAddTag} disabled={!tagInput.trim()}>
                    Add
                  </Button>
                </div>
              </label>
              {formData.tags && formData.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {formData.tags.map((tag) => (
                    <div
                      key={tag}
                      className="inline-flex items-center gap-1 bg-secondary text-secondary-foreground px-2 py-1 rounded-md text-sm"
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(tag)}
                        className="ml-1 hover:text-destructive"
                        aria-label={`Remove ${tag} tag`}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">Save Changes</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
