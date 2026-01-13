import { useState, useImperativeHandle, forwardRef, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Plus, X, MagnifyingGlass } from '@phosphor-icons/react'
import { Product, UserData } from '@/lib/types'
import { Badge } from '@/components/ui/badge'
import { ProductImageManager } from './ProductImageManager'
import { ProductCard } from './ProductCard'
import { toast } from 'sonner'
import { APIService } from '@/lib/api'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faUniversalAccess } from '@fortawesome/free-solid-svg-icons'

type ProductSubmissionProps = {
  user: UserData | null
  onSubmit: (product: Omit<Product, 'id' | 'createdAt'>) => void
  onRequestOwnership?: (productSlug: string) => void
}

export interface ProductSubmissionRef {
  close: () => void
}

export const ProductSubmission = forwardRef<ProductSubmissionRef, ProductSubmissionProps>(function ProductSubmission({ user, onSubmit, onRequestOwnership }, ref) {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [type, setType] = useState('')
  const [sourceUrl, setSourceUrl] = useState('')
  const [sourceUrls, setSourceUrls] = useState<string[] | undefined>(undefined)
  const [source, setSource] = useState<string | undefined>(undefined)
  const [description, setDescription] = useState('')
  const [tagInput, setTagInput] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [imageUrl, setImageUrl] = useState<string | undefined>(undefined)
  const [imageAlt, setImageAlt] = useState<string | undefined>(undefined)
  const [sourceLastUpdated, setSourceLastUpdated] = useState<number | string | undefined>(undefined)
  const [sourceRating, setSourceRating] = useState<number | undefined>(undefined)
  const [sourceRatingCount, setSourceRatingCount] = useState<number | undefined>(undefined)
  const [stars, setStars] = useState<number | undefined>(undefined)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const errorSummaryRef = useRef<HTMLDivElement>(null)
  const [validationAttempted, setValidationAttempted] = useState(false)
  
  // New state for URL lookup flow
  const [urlCheckState, setUrlCheckState] = useState<'initial' | 'checking' | 'exists' | 'form'>('initial')
  const [existingProduct, setExistingProduct] = useState<Product | null>(null)
  const [isScrapingUrl, setIsScrapingUrl] = useState(false)
  const [urlToCheck, setUrlToCheck] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Expose close method to parent via ref
  useImperativeHandle(ref, () => ({
    close: () => {
      setOpen(false)
      resetForm()
    }
  }))

  const resetForm = () => {
    setName('')
    setType('')
    setSourceUrl('')
    setSourceUrls(undefined)
    setSource(undefined)
    setDescription('')
    setTagInput('')
    setTags([])
    setImageUrl(undefined)
    setImageAlt(undefined)
    setSourceLastUpdated(undefined)
    setSourceRating(undefined)
    setSourceRatingCount(undefined)
    setStars(undefined)
    setErrors({})
    setValidationAttempted(false)
    setUrlCheckState('initial')
    setExistingProduct(null)
    setIsScrapingUrl(false)
    setUrlToCheck('')
    setIsSubmitting(false)
  }
  
  const normalizeUrl = (url: string): string => {
    const trimmed = url.trim()
    if (!trimmed) return ''
    // Add https:// if no protocol specified
    if (!/^https?:\/\//i.test(trimmed)) {
      return `https://${trimmed}`
    }
    return trimmed
  }
  
  // Normalize URLs for prefill (e.g., strip dynamic numeric suffixes like 
  // "-123456" often added by tests for uniqueness). Remove query/hash.
  const normalizeProductUrl = (url: string): string => {
    try {
      const u = new URL(url)
      // Remove query and hash for a cleaner prefill
      u.search = ''
      u.hash = ''
      // If the pathname ends with a hyphen followed by digits, strip the suffix
      u.pathname = u.pathname.replace(/-\d+$/, '')
      return `${u.origin}${u.pathname}`
    } catch {
      // Fallback: best-effort strip numeric suffix from the end
      return url.replace(/-\d+$/, '')
    }
  }
  
  const handleUrlCheck = async () => {
    const normalized = normalizeUrl(urlToCheck)
    if (!normalized || !isValidUrl(normalized)) {
      setErrors({ urlToCheck: 'Please enter a valid URL' })
      return
    }

    setErrors({})
    setUrlCheckState('checking')

    try {
      // Call load-url endpoint which checks DB first, then scrapes if needed
      const scrapeResult = await APIService.loadUrl(normalized)
      
      if (scrapeResult.success && scrapeResult.product) {
        const p = scrapeResult.product as any
        
        // If product came from database (already exists), show it
        if (scrapeResult.source === 'database') {
          const normalized = {
            id: p.id,
            slug: p.slug,
            name: p.name,
            type: p.type || p.category,
            source: p.source,
            sourceUrl: p.sourceUrl || p.url,
            description: p.description,
            tags: p.tags || [],
            createdAt: p.createdAt || Date.now(),
            origin: 'user-submitted',
            imageUrl: p.imageUrl || p.image,
            ownerIds: p.ownerIds || [],
          } as Product
          setExistingProduct(normalized)
          setUrlCheckState('exists')
          return
        }
        
        // Product was scraped - pre-fill form with scraped data
        setSourceUrl(normalized)
        if (p.name) setName(p.name)
        if (p.description) setDescription(p.description)
        if (p.type) setType(p.type)
        if (p.tags) setTags(p.tags)
        if (p.imageUrl || p.image) setImageUrl(p.imageUrl || p.image)
        if (p.sourceLastUpdated || p.source_last_updated) setSourceLastUpdated(p.sourceLastUpdated || p.source_last_updated)
        if (p.source) setSource(p.source)
        if (p.sourceUrls && Array.isArray(p.sourceUrls)) setSourceUrls(p.sourceUrls)
        if (typeof p.sourceRating === 'number') setSourceRating(p.sourceRating)
        if (typeof p.sourceRatingCount === 'number') setSourceRatingCount(p.sourceRatingCount)
        if (typeof p.stars === 'number') setStars(p.stars)
        
        toast.success(`Successfully scraped product information`)
        setUrlCheckState('form')
        return
      }

      // Not found and couldn't scrape: show manual form with URL pre-filled
      setSourceUrl(normalizeProductUrl(normalized))
      toast.info(`Please fill in the product details below`)
      setUrlCheckState('form')
    } catch (error) {
      // Check if this is an unsupported domain error
      const errorMessage = error instanceof Error ? error.message : String(error)
      const isUnsupported = (
        errorMessage.includes('URL domain is not supported') ||
        errorMessage.includes('No supported sources are configured') ||
        errorMessage.toLowerCase().includes('supported sources')
      )
      if (isUnsupported) {
        console.info('Unsupported domain during URL check:', errorMessage)
        try {
          const domain = new URL(normalized).hostname
          // Pass the error to parent via setting the URL and showing unsupported error
          setErrors({ urlToCheck: errorMessage })
          // Allow manual form entry even when the domain is unsupported
          setSourceUrl(normalizeProductUrl(normalized))
          setUrlCheckState('form')
          toast.info('This source is not supported yet. Please submit details manually.')
          // Trigger parent component to show request dialog
          const event = new CustomEvent('unsupported-domain', { detail: { domain, url: normalized } })
          window.dispatchEvent(event)
        } catch {
          setErrors({ urlToCheck: 'Invalid URL format' })
          setUrlCheckState('form')
        }
      } else {
        console.error('Error checking URL:', error)
        setErrors({ urlToCheck: errorMessage || 'Error checking URL' })
        // Let users proceed with manual entry when scraping fails for other reasons
        setSourceUrl(normalizeProductUrl(normalized))
        setUrlCheckState('form')
      }
    }
  }
  
  const handleUrlBlur = () => {
    // Auto-check on blur if URL is entered and we're in initial state
    if (urlToCheck.trim() && urlCheckState === 'initial') {
      handleUrlCheck()
    }
  }
  
  const handleRequestOwnership = () => {
    if (existingProduct && onRequestOwnership) {
      onRequestOwnership(existingProduct.slug)
    }
  }

  const handleNavigateToProduct = (productSlug: string, options?: { edit?: boolean; requestEdit?: boolean }) => {
    setOpen(false)
    resetForm()
    const params = new URLSearchParams()
    if (options?.edit) params.set('edit', '1')
    if (options?.requestEdit) params.set('requestEdit', '1')
    const query = params.toString()
    navigate(query ? `/product/${productSlug}?${query}` : `/product/${productSlug}`)
  }

  const validateForm = () => {
    setValidationAttempted(true)
    const newErrors: Record<string, string> = {}

    if (!name.trim()) {
      newErrors.name = 'Product name is required'
    }

    if (!type.trim()) {
      newErrors.type = 'Product type is required'
    }

    if (!description.trim()) {
      newErrors.description = 'Description is required'
    } else if (description.trim().length < 20) {
      newErrors.description = 'Description must be at least 20 characters'
    }

    if (!sourceUrl.trim()) {
      newErrors.sourceUrl = 'Product URL is required'
    } else if (!isValidUrl(sourceUrl)) {
      newErrors.sourceUrl = 'Please enter a valid URL'
    }

    if (imageUrl && !imageAlt?.trim()) {
      newErrors.imageAlt = 'Alt text is required when an image is provided'
    }

    if (imageAlt && imageAlt.trim() && imageAlt.trim().length < 10) {
      newErrors.imageAlt = 'Alt text should be at least 10 characters'
    }

    setErrors(newErrors)
    if (Object.keys(newErrors).length > 0) {
      setTimeout(() => errorSummaryRef.current?.focus(), 0)
      return false
    }
    return true
  }

  const isValidUrl = (url: string) => {
    try {
      new URL(url)
      return true
    } catch {
      return false
    }
  }

  const handleAddTag = () => {
    const normalizedTag = tagInput.trim().toLowerCase()
    if (normalizedTag && !tags.some((t) => t.toLowerCase() === normalizedTag)) {
      setTags([...tags, normalizedTag])
      setTagInput('')
    }
  }

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((t) => t !== tagToRemove))
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleAddTag()
    }
  }

  const handleImageChange = (url: string | undefined, alt: string | undefined) => {
    setImageUrl(url)
    setImageAlt(alt)
    setErrors((prev) => {
      const updated = { ...prev }
      delete updated.imageAlt
      return updated
    })
  }
  

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      setIsSubmitting(false)
      return
    }

    setIsSubmitting(true)
    const normalizedLastUpdated = (() => {
      if (!sourceLastUpdated) return undefined
      if (typeof sourceLastUpdated === 'number') return sourceLastUpdated
      const parsed = Date.parse(sourceLastUpdated)
      return Number.isNaN(parsed) ? undefined : parsed
    })()
    const normalizedRating = typeof sourceRating === 'number' ? sourceRating : undefined
    const normalizedRatingCount = typeof sourceRatingCount === 'number' ? sourceRatingCount : undefined
    const normalizedStars = typeof stars === 'number' ? stars : undefined
    const productData: Omit<Product, 'id' | 'createdAt'> = {
      name: name.trim(),
      type: type.trim(),
      sourceUrl: sourceUrl.trim() || undefined,
      sourceUrls,
      source: source || 'user-submitted',
      description: description.trim(),
      tags,
      imageUrl: imageUrl || undefined,
      imageAlt: imageAlt?.trim() || undefined,
      origin: 'user-submitted',
      sourceLastUpdated: normalizedLastUpdated,
      sourceRating: normalizedRating,
      sourceRatingCount: normalizedRatingCount,
      stars: normalizedStars,
    }

    onSubmit(productData)
    setIsSubmitting(false)
    setOpen(false)
    resetForm()
  }

  if (!user) {
    return null
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      setOpen(isOpen)
      if (!isOpen) resetForm()
    }}>
      <DialogTrigger asChild>
        <Button
          size="sm"
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              setOpen(true)
            }
          }}
          className="flex items-center gap-2"
          aria-hidden={open ? 'true' : undefined}
          tabIndex={open ? -1 : undefined}
          aria-label="Submit Product"
        >
          <Plus size={16} />
          <FontAwesomeIcon icon={faUniversalAccess} className="w-[18px] h-[18px]" />
          <span className="hidden sm:inline">Submit Product</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" aria-modal="true" role="dialog">
        <DialogHeader>
          <DialogTitle>Submit New Product</DialogTitle>
          <DialogDescription>
            Share an accessibility tool or product with the community.
          </DialogDescription>
        </DialogHeader>

        {errors.urlToCheck && (
          <div className="mb-4 rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">
            {errors.urlToCheck}
          </div>
        )}

        {urlCheckState === 'initial' && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="url-check">Product URL</Label>
              <div className="flex gap-2">
                <Input
                  id="url-check"
                  name="urlToCheck"
                  type="url"
                  autoComplete="url"
                  value={urlToCheck}
                  onChange={(e) => setUrlToCheck(e.target.value)}
                  onBlur={handleUrlBlur}
                  placeholder="https://github.com/user/repo"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      handleUrlCheck()
                    }
                  }}
                  aria-invalid={!!errors.urlToCheck}
                  aria-describedby={errors.urlToCheck ? 'url-check-error' : 'url-check-help'}
                />
                <Button type="button" onClick={handleUrlCheck}>
                  <MagnifyingGlass size={20} className="mr-2" />
                  Check
                </Button>
              </div>
              {errors.urlToCheck && (
                <p id="url-check-error" className="text-sm text-destructive" role="alert">{errors.urlToCheck}</p>
              )}
              <p id="url-check-help" className="text-sm text-muted-foreground">
                Enter a URL to check if it's already in our database or if we can automatically fetch its details.
              </p>
            </div>
          </div>
        )}

        {urlCheckState === 'checking' && (
          <div className="flex flex-col items-center justify-center py-8 space-y-4" role="status" aria-live="polite">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" aria-hidden="true"></div>
            <p className="text-muted-foreground">Checking URL...</p>
          </div>
        )}

        {urlCheckState === 'exists' && existingProduct && (
          <div className="space-y-4">
            <div className="p-4 bg-muted rounded-lg space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">Product Already Exists</h3>
                  <p className="text-sm text-muted-foreground">
                    This product is already in our database.
                  </p>
                </div>
                <div className="flex gap-2">
                  {user && existingProduct.ownerIds?.includes(user.id) ? (
                    <Button size="sm" onClick={() => handleNavigateToProduct(existingProduct.slug, { edit: true })}>
                      Edit product
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      onClick={() => {
                        if (onRequestOwnership) {
                          handleRequestOwnership()
                        }
                        handleNavigateToProduct(existingProduct.slug, { requestEdit: true })
                      }}
                    >
                      Request to Edit Product
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setOpen(false)
                      resetForm()
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
              <div
                className="block cursor-pointer"
                role="button"
                tabIndex={0}
                onClick={() => handleNavigateToProduct(existingProduct.slug)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    handleNavigateToProduct(existingProduct.slug)
                  }
                }}
              >
                <ProductCard
                  product={existingProduct}
                  ratings={[]}
                  onClick={() => {}}
                />
              </div>
            </div>
          </div>
        )}

        {urlCheckState === 'checking' && (
          <div className="flex flex-col items-center justify-center py-8 space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            <p className="text-muted-foreground">Checking database and fetching product details...</p>
          </div>
        )}

        {(urlCheckState === 'form') && (
          <form onSubmit={handleSubmit} className="space-y-6">
            {Object.entries(errors).filter(([key]) => ['name', 'type', 'sourceUrl', 'description', 'imageAlt'].includes(key)).length > 0 && (
              <div
                ref={errorSummaryRef}
                role="alert"
                aria-live="assertive"
                tabIndex={-1}
                className="border border-destructive/50 bg-destructive/5 text-destructive rounded-md p-4 space-y-2"
              >
                <p className="font-semibold">Please fix the following:</p>
                <ul className="list-disc pl-5 space-y-1">
                  {Object.entries(errors)
                    .filter(([key]) => ['name', 'type', 'sourceUrl', 'description', 'imageAlt'].includes(key))
                    .map(([key, message]) => {
                      const idMap: Record<string, string> = {
                        name: 'product-name',
                        type: 'product-type',
                        sourceUrl: 'product-url',
                        description: 'product-description',
                        imageAlt: 'image-alt-text',
                      }
                      const targetId = idMap[key] || 'product-form-help'
                      return (
                        <li key={key}>
                          <a href={`#${targetId}`} className="underline">
                            {message}
                          </a>
                        </li>
                      )
                    })}
                </ul>
              </div>
            )}

            <fieldset className="space-y-6" aria-describedby="product-form-help">
              <legend className="text-lg font-semibold">Product Details</legend>
              <p id="product-form-help" className="text-sm text-muted-foreground">
                Required fields are marked with * and will be validated before submission.
              </p>

              <div className="space-y-2">
                <Label htmlFor="product-name">
                  Product Name <span aria-hidden="true" className="text-destructive">*</span>
                </Label>
                <Input
                  id="product-name"
                  name="name"
                  type="text"
                  autoComplete="off"
                  required
                  aria-required="true"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value)
                    setErrors((prev) => {
                      const updated = { ...prev }
                      delete updated.name
                      return updated
                    })
                  }}
                  placeholder="e.g., Ergonomic Keyboard Stand"
                  aria-invalid={errors.name || (validationAttempted && !name.trim()) ? 'true' : undefined}
                  aria-describedby={errors.name ? 'name-error' : undefined}
                />
                {errors.name && (
                  <p id="name-error" className="text-sm text-destructive" role="alert">
                    {errors.name}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="product-type">
                  Product Type <span aria-hidden="true" className="text-destructive">*</span>
                </Label>
                <Select
                  value={type}
                  onValueChange={(value) => {
                    setType(value)
                    setErrors((prev) => {
                      const updated = { ...prev }
                      delete updated.type
                      return updated
                    })
                  }}
                >
                  <SelectTrigger
                    id="product-type"
                    aria-label="Product Type"
                    role="combobox"
                    aria-required="true"
                    aria-invalid={errors.type || (validationAttempted && !type.trim()) ? 'true' : undefined}
                    aria-describedby={errors.type ? 'type-error' : undefined}
                  >
                    <SelectValue placeholder="Choose a type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Software">Software</SelectItem>
                    <SelectItem value="Fabrication">Fabrication</SelectItem>
                    <SelectItem value="Knitting">Knitting</SelectItem>
                    <SelectItem value="Crochet">Crochet</SelectItem>
                    <SelectItem value="Hardware">Hardware</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
                <input type="hidden" name="type" value={type} />
                {errors.type && (
                  <p id="type-error" className="text-sm text-destructive" role="alert">
                    {errors.type}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="product-url">
                  Source URL <span aria-hidden="true" className="text-destructive">*</span>
                </Label>
                <Input
                  id="product-url"
                  name="sourceUrl"
                  type="url"
                  autoComplete="url"
                  required
                  aria-required="true"
                  value={sourceUrl}
                  onChange={(e) => {
                    setSourceUrl(e.target.value)
                    setErrors((prev) => {
                      const updated = { ...prev }
                      delete updated.sourceUrl
                      return updated
                    })
                  }}
                  placeholder="https://example.com/product"
                  aria-invalid={errors.sourceUrl || (validationAttempted && !sourceUrl.trim()) ? 'true' : undefined}
                  aria-describedby={errors.sourceUrl ? 'url-error' : undefined}
                />
                {errors.sourceUrl && (
                  <p id="url-error" className="text-sm text-destructive" role="alert">
                    {errors.sourceUrl}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="product-description">
                  Description <span aria-hidden="true" className="text-destructive">*</span>
                </Label>
                <Textarea
                  id="product-description"
                  name="description"
                  required
                  aria-required="true"
                  value={description}
                  onChange={(e) => {
                    setDescription(e.target.value)
                    setErrors((prev) => {
                      const updated = { ...prev }
                      delete updated.description
                      return updated
                    })
                  }}
                  placeholder="Describe the product and how it helps with accessibility..."
                  rows={4}
                  aria-invalid={errors.description || (validationAttempted && !description.trim()) ? 'true' : undefined}
                  aria-describedby={errors.description ? 'description-error' : undefined}
                />
                {errors.description && (
                  <p id="description-error" className="text-sm text-destructive" role="alert">
                    {errors.description}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="product-tags">Tags</Label>
                <div className="flex gap-2">
                  <Input
                    id="product-tags"
                    name="tags"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Add tags (press Enter)"
                    autoComplete="off"
                  />
                  <Button type="button" onClick={handleAddTag} variant="secondary">
                    Add
                  </Button>
                </div>
                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {tags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="gap-1">
                        {tag}
                        <button
                          type="button"
                          onClick={() => handleRemoveTag(tag)}
                          className="ml-1 hover:text-destructive"
                          aria-label={`Remove ${tag} tag`}
                        >
                          <X size={14} />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label>Product Image</Label>
                <ProductImageManager
                  imageUrl={imageUrl}
                  imageAlt={imageAlt}
                  onImageChange={handleImageChange}
                  imageAltError={errors.imageAlt}
                />
                {errors.imageAlt && (
                  <p className="text-sm text-destructive" role="alert">{errors.imageAlt}</p>
                )}
              </div>
            </fieldset>

            <div className="flex gap-3 justify-end pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setOpen(false)
                  resetForm()
                }}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isScrapingUrl}
                onClick={() => setValidationAttempted(true)}
              >
                Submit Product
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
})
