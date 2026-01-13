import React, { useState, useEffect } from 'react'
import { ProductUrl, ProductUrlCreate } from '../types/product-url'
import { APIService } from '../lib/api'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Textarea } from './ui/textarea'
import { Label } from './ui/label'

interface ProductUrlsProps {
  productId: string
  isEditor: boolean
  onUrlsChange?: (urls: ProductUrl[]) => void
}

export function ProductUrls({ productId, isEditor, onUrlsChange }: ProductUrlsProps) {
  const [urls, setUrls] = useState<ProductUrl[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState<ProductUrlCreate>({ url: '', description: '' })
  const [submitting, setSubmitting] = useState(false)

  // Load URLs on mount
  useEffect(() => {
    loadUrls()
  }, [productId])

  const loadUrls = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await APIService.getProductUrls(productId)
      setUrls(data)
      onUrlsChange?.(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load URLs')
    } finally {
      setLoading(false)
    }
  }

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.url) {
      setError('URL is required')
      return
    }

    setSubmitting(true)
    setError(null)
    try {
      const newUrl = await APIService.addProductUrl(productId, formData)
      setUrls([...urls, newUrl])
      setFormData({ url: '', description: '' })
      setShowForm(false)
      onUrlsChange?.([...urls, newUrl])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add URL')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (urlId: string) => {
    if (!confirm('Delete this URL?')) return

    try {
      await APIService.deleteProductUrl(productId, urlId)
      const updated = urls.filter(u => u.id !== urlId)
      setUrls(updated)
      onUrlsChange?.(updated)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete URL')
    }
  }

  if (loading) {
    return <div className="text-sm text-gray-500">Loading URLs...</div>
  }

  return (
    <div className="space-y-4">
      {error && <div className="text-sm text-red-600">{error}</div>}

      {/* URL List */}
      {urls.length > 0 && (
        <div className="space-y-2">
          <h3 className="font-semibold text-sm">Related Links</h3>
          {urls.map(url => (
            <div
              key={url.id}
              className="flex items-start justify-between p-2 bg-muted/30 rounded border border-border"
            >
              <div className="flex-1 min-w-0">
                <a
                  href={url.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline text-sm break-all"
                >
                  {url.description || url.url}
                </a>
                {url.description && (
                  <p className="text-xs text-gray-500 mt-1">{url.url}</p>
                )}
              </div>
              {isEditor && (
                <button
                  onClick={() => handleDelete(url.id)}
                  className="ml-2 text-xs text-red-600 hover:text-red-800 whitespace-nowrap"
                  aria-label="Delete URL"
                >
                  Delete
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add URL Form */}
      {isEditor && (
        <>
          {!showForm ? (
            <Button
              onClick={() => setShowForm(true)}
              variant="outline"
              size="sm"
              className="w-full"
            >
              {urls.length > 0 ? 'Add Another URL' : 'Add URL'}
            </Button>
          ) : (
            <form onSubmit={handleAdd} className="space-y-2 p-3 bg-muted/30 rounded border border-border">
              <div>
                <label className="block text-sm leading-none font-medium select-none group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50 peer-disabled:cursor-not-allowed peer-disabled:opacity-50">
                  URL
                  <Input
                    id="product-url-input"
                    name="url"
                    type="url"
                    placeholder="https://example.com"
                    value={formData.url}
                    onChange={e => setFormData({ ...formData, url: e.target.value })}
                    disabled={submitting}
                    required
                    className="mt-1"
                  />
                </label>
              </div>
              <div>
                <label className="block text-sm leading-none font-medium select-none group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50 peer-disabled:cursor-not-allowed peer-disabled:opacity-50">
                  Description (Optional)
                  <Textarea
                    id="product-url-description"
                    name="description"
                    placeholder="Optional description (e.g., 'Source code repository')"
                    value={formData.description || ''}
                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                    disabled={submitting}
                    rows={2}
                    className="mt-1"
                  />
                </label>
              </div>
              <div className="flex gap-2">
                <Button
                  type="submit"
                  size="sm"
                  disabled={submitting}
                >
                  {submitting ? 'Adding...' : 'Add URL'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setShowForm(false)
                    setFormData({ url: '', description: '' })
                  }}
                  disabled={submitting}
                >
                  Cancel
                </Button>
              </div>
            </form>
          )}
        </>
      )}

      {urls.length === 0 && !showForm && (
        <p className="text-xs text-gray-500 italic">
          No URLs added yet. Add links to source code, documentation, or related resources.
        </p>
      )}
    </div>
  )
}
