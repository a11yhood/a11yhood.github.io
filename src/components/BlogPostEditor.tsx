import React, { useState, useEffect, useRef } from 'react'
import { BlogPost } from '@/lib/types'
import { APIService } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { CheckCircle, X, FloppyDisk, Eye, Image as ImageIcon, Trash, UserPlus } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { renderMarkdown } from '@/lib/markdown'

type BlogPostEditorProps = {
  post?: BlogPost
  authorName: string
  authorId: string
  onSave: (post: BlogPost) => void
  onCancel: () => void
}

/**
 * BlogPostEditor component for creating and editing blog posts with markdown support
 * Provides split-view editing with live markdown preview, image uploads, and publish controls
 */
export function BlogPostEditor({ post, authorName, authorId, onSave, onCancel }: BlogPostEditorProps) {
  const [title, setTitle] = useState(post?.title || '')
  const [content, setContent] = useState(post?.content || '')
  const [excerpt, setExcerpt] = useState(post?.excerpt || '')
  const [tags, setTags] = useState(post?.tags?.join(', ') || '')
  const [headerImage, setHeaderImage] = useState(post?.headerImage || '')
  const [headerImageAlt, setHeaderImageAlt] = useState(post?.headerImageAlt || '')
  const [published, setPublished] = useState(post?.published || false)
  const [featured, setFeatured] = useState(post?.featured || false)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<{ id: string; message: string }[]>([])
  const [invalidFields, setInvalidFields] = useState<Record<string, boolean>>({})
  const [authorNames, setAuthorNames] = useState<string[]>(
    post?.authorNames && post.authorNames.length > 0 ? post.authorNames : [authorName]
  )
  const [newAuthor, setNewAuthor] = useState('')
  const [publishDate, setPublishDate] = useState(() => {
    if (post?.publishDate) {
      const date = new Date(post.publishDate)
      return date.toISOString().split('T')[0]
    }
    return ''
  })
  const headerImageInputRef = useRef<HTMLInputElement>(null)
  const errorSummaryRef = useRef<HTMLDivElement>(null)

  // Backend now normalizes images; `headerImage` should be an http(s) URL or data URL already

  // Generate URL-friendly slug from title
  const generateSlug = (text: string) => {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
  }

  const slug = post?.slug || generateSlug(title)

  // Convert image file to base64
  const handleImageUpload = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        const result = e.target?.result
        if (typeof result === 'string') {
          resolve(result)
        } else {
          reject(new Error('Failed to read file'))
        }
      }
      reader.onerror = () => reject(new Error('Failed to read file'))
      reader.readAsDataURL(file)
    })
  }

  // Handle header image upload
  const handleHeaderImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file')
      return
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be less than 5MB')
      return
    }

    try {
      const base64 = await handleImageUpload(file)
      setHeaderImage(base64)
      toast.success('Header image uploaded')
    } catch (error) {
      toast.error('Failed to upload image')
    }
  }

  // Insert image by URL into markdown content
  const insertImageUrlIntoContent = () => {
    const url = prompt('Enter the image URL (https://...)')?.trim()
    if (!url) return

    // Only allow http/https URLs (avoid embedding data URLs)
    try {
      const parsed = new URL(url)
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        toast.error('Please provide an http/https image URL')
        return
      }
    } catch {
      toast.error('Please provide a valid image URL')
      return
    }

    const altText = prompt('Enter alt text for the image (for accessibility)')?.trim()
    // Use angle brackets around URL to safely handle spaces/parentheses per CommonMark
    const markdown = `![${altText || 'image'}](<${url}>)\n`
    setContent((prev) => prev + markdown)
    toast.success('Image URL inserted')
  }

  const handleSave = async () => {
    const validationErrors: { id: string; message: string }[] = []

    if (!title.trim()) {
      validationErrors.push({ id: 'title', message: 'Title is required.' })
    }

    if (!content.trim()) {
      validationErrors.push({ id: 'post-content', message: 'Post content is required.' })
    }

    if (authorNames.length === 0) {
      validationErrors.push({ id: 'new-author', message: 'At least one author is required.' })
    }

    if (validationErrors.length > 0) {
      setErrors(validationErrors)
      setInvalidFields({
        title: validationErrors.some((e) => e.id === 'title'),
        content: validationErrors.some((e) => e.id === 'post-content'),
        authors: validationErrors.some((e) => e.id === 'new-author'),
      })
      setTimeout(() => errorSummaryRef.current?.focus(), 0)
      return
    }

    setErrors([])
    setInvalidFields({})

    setSaving(true)
    try {
      let savedPost: BlogPost
      
      const parsedPublishDate = publishDate ? new Date(publishDate).getTime() : undefined

      if (post) {
        // Update existing post
        const updated = await APIService.updateBlogPost(post.id, {
          title,
          content,
          excerpt,
          headerImage: headerImage || undefined,
          headerImageAlt: headerImageAlt || undefined,
          slug,
          tags: tags.split(',').map(t => t.trim()).filter(t => t),
          published,
          featured,
          publishedAt: published && !post.published ? Date.now() : post.publishedAt,
          authorNames,
          publishDate: parsedPublishDate,
        })

        if (!updated) {
          toast.error('Failed to update post')
          return
        }
        savedPost = updated
      } else {
        // Create new post
        savedPost = await APIService.createBlogPost({
          title,
          content,
          excerpt,
          headerImage: headerImage || undefined,
          headerImageAlt: headerImageAlt || undefined,
          slug,
          tags: tags.split(',').map(t => t.trim()).filter(t => t),
          published,
          featured,
          authorId,
          authorName: authorNames[0],
          authorNames,
          publishedAt: published ? Date.now() : undefined,
          publishDate: parsedPublishDate,
        })
      }

      toast.success(post ? 'Post updated successfully' : 'Post created successfully')
      onSave(savedPost)
    } catch (error) {
      console.error('Failed to save post:', error)
      toast.error('Failed to save post')
    } finally {
      setSaving(false)
    }
  }

  const handleAddAuthor = () => {
    const trimmedAuthor = newAuthor.trim()
    if (!trimmedAuthor) {
      toast.error('Please enter an author name')
      return
    }
    
    if (authorNames.some(name => name.toLowerCase() === trimmedAuthor.toLowerCase())) {
      toast.error('Author already added')
      return
    }
    
    setAuthorNames([...authorNames, trimmedAuthor])
    setNewAuthor('')
    setErrors((prev) => prev.filter((err) => err.id !== 'new-author'))
    setInvalidFields((prev) => ({ ...prev, authors: false }))
    toast.success('Author added')
  }

  const handleRemoveAuthor = (index: number) => {
    if (authorNames.length === 1) {
      toast.error('At least one author is required')
      return
    }
    const removedAuthor = authorNames[index]
    setAuthorNames(authorNames.filter((_, i) => i !== index))
    toast.success(`Removed ${removedAuthor}`)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">{post ? 'Edit Blog Post' : 'New Blog Post'}</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Slug: <code className="bg-muted px-2 py-1 rounded">{slug}</code>
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onCancel}>
            <X className="w-4 h-4 mr-2" />
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            <FloppyDisk className="w-4 h-4 mr-2" />
            {saving ? 'Saving...' : 'Save Post'}
          </Button>
        </div>
      </div>

      {errors.length > 0 && (
        <div
          ref={errorSummaryRef}
          tabIndex={-1}
          className="border border-destructive/40 bg-destructive/5 text-destructive rounded-md p-4 space-y-2"
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

      {/* Metadata Section */}
      <Card>
        <CardHeader>
          <CardTitle>Post Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <fieldset className="space-y-4" aria-describedby="post-details-help">
            <legend className="sr-only">Post details</legend>
            <p id="post-details-help" className="text-sm text-muted-foreground">
              Provide the title, summary, authors, and metadata for this post.
            </p>

            <div>
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                name="title"
                autoComplete="off"
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value)
                  setInvalidFields((prev) => ({ ...prev, title: false }))
                  setErrors((prev) => prev.filter((err) => err.id !== 'title'))
                }}
                placeholder="Enter post title"
                className="mt-1"
                aria-invalid={invalidFields.title || undefined}
                aria-describedby={invalidFields.title ? 'title-error' : undefined}
              />
              {invalidFields.title && (
                <p id="title-error" className="text-sm text-destructive mt-1">Title is required.</p>
              )}
            </div>

            <div>
              <Label htmlFor="excerpt" className="text-base">Excerpt (Recommended)</Label>
              <p id="excerpt-help" className="text-sm text-muted-foreground mb-2">
                A short preview that appears on the homepage and blog list. Helps readers decide if they want to read more.
              </p>
              <Textarea
                id="excerpt"
                name="excerpt"
                autoComplete="off"
                value={excerpt}
                onChange={(e) => setExcerpt(e.target.value)}
                placeholder="Write a compelling 1-2 sentence summary of your post that will appear in the featured carousel and blog list..."
                className="mt-1 h-24"
                aria-describedby="excerpt-help excerpt-count"
              />
              <p id="excerpt-count" className="text-xs text-muted-foreground mt-1">
                {excerpt.length} characters (recommended: 100-200)
              </p>
            </div>

          {/* Authors Section */}
          <div>
            <Label htmlFor="new-author">Authors</Label>
            <p id="authors-help" className="text-sm text-muted-foreground mb-2">
              Add multiple authors to this post
            </p>
            
            <div className="flex gap-2 flex-wrap mb-3">
              {authorNames.map((name, index) => (
                <Badge key={index} variant="secondary" className="flex items-center gap-1 pr-1">
                  {name}
                  {authorNames.length > 1 && (
                    <button
                      onClick={() => handleRemoveAuthor(index)}
                      className="ml-1 hover:bg-destructive/20 rounded-full p-0.5"
                      aria-label={`Remove ${name}`}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </Badge>
              ))}
            </div>

            <div className="flex gap-2">
              <Input
                id="new-author"
                name="newAuthor"
                autoComplete="off"
                value={newAuthor}
                onChange={(e) => setNewAuthor(e.target.value)}
                placeholder="Add author name"
                aria-invalid={invalidFields.authors || undefined}
                aria-describedby={`authors-help${invalidFields.authors ? ' authors-error' : ''}`}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    handleAddAuthor()
                  }
                }}
              />
              {invalidFields.authors && (
                <p id="authors-error" className="text-sm text-destructive self-end">
                  At least one author is required.
                </p>
              )}
              <Button type="button" onClick={handleAddAuthor} variant="outline">
                <UserPlus className="w-4 h-4 mr-2" />
                Add
              </Button>
            </div>
          </div>

          {/* Publish Date */}
          <div>
            <Label htmlFor="publish-date">Publish Date (Optional)</Label>
            <p id="publish-date-help" className="text-sm text-muted-foreground mb-2">
              Set a custom publish date for the post
            </p>
            <Input
              id="publish-date"
              name="publishDate"
              type="date"
              value={publishDate}
              autoComplete="off"
              onChange={(e) => setPublishDate(e.target.value)}
              className="mt-1"
              aria-describedby="publish-date-help"
            />
          </div>

          <div>
            <Label htmlFor="tags">Tags</Label>
            <p id="tags-help" className="text-sm text-muted-foreground mb-2">
              Separate tags with commas to improve search and filtering.
            </p>
            <Input
              id="tags"
              name="tags"
              autoComplete="off"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="Separate tags with commas"
              className="mt-1"
              aria-describedby="tags-help"
            />
            {tags && (
              <div className="mt-2 flex gap-2 flex-wrap">
                {tags.split(',').map((tag, i) => (
                  <Badge key={i} variant="secondary">
                    {tag.trim()}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <fieldset className="flex gap-4" aria-describedby="publication-help">
            <legend className="sr-only">Publication settings</legend>
            <p id="publication-help" className="sr-only">
              Choose whether this post is published or featured.
            </p>
            <label htmlFor="published-checkbox" className="flex items-center gap-2 cursor-pointer">
              <input
                id="published-checkbox"
                name="published"
                type="checkbox"
                checked={published}
                onChange={(e) => setPublished(e.target.checked)}
                className="w-4 h-4 rounded"
              />
              <span className="text-sm font-medium">
                <CheckCircle className="w-4 h-4 inline mr-1" />
                Published
              </span>
            </label>

            <label htmlFor="featured-checkbox" className="flex items-center gap-2 cursor-pointer">
              <input
                id="featured-checkbox"
                name="featured"
                type="checkbox"
                checked={featured}
                onChange={(e) => setFeatured(e.target.checked)}
                className="w-4 h-4 rounded"
              />
              <span className="text-sm font-medium">Featured Post</span>
            </label>
          </fieldset>

          {/* Header Image Upload */}
          <div className="border-t pt-4">
            <Label htmlFor="header-image-upload">Header Image</Label>
            <p id="header-image-help" className="text-sm text-muted-foreground mb-3">
              Displayed at the top of your blog post (max 5MB)
            </p>
            
            {headerImage && (
              <div className="mb-4 relative">
                <img
                  src={headerImage}
                  alt="Header preview"
                  className="w-full h-48 object-cover rounded-lg"
                />
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => {
                    setHeaderImage('')
                    setHeaderImageAlt('')
                  }}
                  className="absolute top-2 right-2"
                >
                  <Trash className="w-3 h-3 mr-1" />
                  Remove
                </Button>
              </div>
            )}

            <input
              id="header-image-upload"
              name="headerImage"
              ref={headerImageInputRef}
              type="file"
              accept="image/*"
              onChange={handleHeaderImageChange}
              className="hidden"
              aria-label="Upload header image"
              aria-describedby="header-image-help"
            />
            
            <Button
              variant="outline"
              onClick={() => headerImageInputRef.current?.click()}
              className="w-full"
            >
              <ImageIcon className="w-4 h-4 mr-2" />
              {headerImage ? 'Change Header Image' : 'Upload Header Image'}
            </Button>

            {headerImage && (
              <div className="mt-3">
                <Label htmlFor="header-alt">Image Alt Text</Label>
                <Input
                  id="header-alt"
                  name="headerImageAlt"
                  autoComplete="off"
                  value={headerImageAlt}
                  onChange={(e) => setHeaderImageAlt(e.target.value)}
                  placeholder="Describe the image for accessibility"
                  className="mt-1"
                />
              </div>
            )}
          </div>
        </fieldset>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Content</CardTitle>
          <CardDescription>
            Write your post using Markdown formatting for rich text content
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="edit" className="w-full">
            <TabsList>
              <TabsTrigger value="edit">Edit</TabsTrigger>
              <TabsTrigger value="preview">
                <Eye className="w-4 h-4 mr-2" />
                Preview
              </TabsTrigger>
              <TabsTrigger value="help">Formatting Help</TabsTrigger>
            </TabsList>

            <TabsContent value="edit" className="mt-4 space-y-3">
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={insertImageUrlIntoContent}
                  className="w-full"
                >
                  <ImageIcon className="w-4 h-4 mr-2" />
                  Insert Image (URL)
                </Button>
              </div>

              <Label htmlFor="post-content" className="sr-only">Post content</Label>
              <Textarea
                id="post-content"
                name="content"
                autoComplete="off"
                value={content}
                onChange={(e) => {
                  setContent(e.target.value)
                  setInvalidFields((prev) => ({ ...prev, content: false }))
                  setErrors((prev) => prev.filter((err) => err.id !== 'post-content'))
                }}
                placeholder="Enter your post content in Markdown..."
                className="font-mono text-sm h-96 resize-none"
                aria-invalid={invalidFields.content || undefined}
                aria-describedby={`content-help${invalidFields.content ? ' content-error' : ''}`}
              />
              <p id="content-help" className="text-xs text-muted-foreground">
                Use the "Formatting Help" tab to see available Markdown syntax
              </p>
              {invalidFields.content && (
                <p id="content-error" className="text-sm text-destructive">Post content is required.</p>
              )}
            </TabsContent>

            <TabsContent value="preview" className="mt-4">
              <div className="p-6 bg-card border border-border rounded-lg min-h-96">
                {content ? (
                  <div 
                    className="prose prose-sm sm:prose lg:prose-lg dark:prose-invert max-w-none"
                    dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }}
                  />
                ) : (
                  <div className="text-muted-foreground">Nothing to preview yet...</div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="help" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Markdown Formatting Guide</CardTitle>
                  <CardDescription>
                    Use these formatting options to style your blog post
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <h3 className="font-semibold text-sm">Headings</h3>
                      <div className="bg-muted p-3 rounded text-xs font-mono space-y-1">
                        <div># Heading 1</div>
                        <div>## Heading 2</div>
                        <div>### Heading 3</div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <h3 className="font-semibold text-sm">Text Styles</h3>
                      <div className="bg-muted p-3 rounded text-xs font-mono space-y-1">
                        <div>**bold text**</div>
                        <div>*italic text*</div>
                        <div>`inline code`</div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <h3 className="font-semibold text-sm">Links</h3>
                      <div className="bg-muted p-3 rounded text-xs font-mono">
                        [Link text](https://url.com)
                      </div>
                    </div>

                    <div className="space-y-2">
                      <h3 className="font-semibold text-sm">Images</h3>
                      <div className="bg-muted p-3 rounded text-xs font-mono">
                        ![Alt text](image-url)
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Or use the "Insert Image" button above
                      </p>
                    </div>

                    <div className="space-y-2">
                      <h3 className="font-semibold text-sm">Lists</h3>
                      <div className="bg-muted p-3 rounded text-xs font-mono space-y-1">
                        <div>- Unordered item</div>
                        <div>- Another item</div>
                        <div className="mt-2">1. Ordered item</div>
                        <div>2. Second item</div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <h3 className="font-semibold text-sm">Blockquotes</h3>
                      <div className="bg-muted p-3 rounded text-xs font-mono">
                        &gt; Quote text here
                      </div>
                    </div>

                    <div className="space-y-2">
                      <h3 className="font-semibold text-sm">Code Blocks</h3>
                      <div className="bg-muted p-3 rounded text-xs font-mono space-y-1">
                        <div>```</div>
                        <div>code block here</div>
                        <div>```</div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <h3 className="font-semibold text-sm">Horizontal Rule</h3>
                      <div className="bg-muted p-3 rounded text-xs font-mono">
                        ---
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t">
                    <h3 className="font-semibold text-sm mb-2">Tables</h3>
                    <div className="bg-muted p-3 rounded text-xs font-mono">
                      <div>| Header 1 | Header 2 |</div>
                      <div>| -------- | -------- |</div>
                      <div>| Cell 1   | Cell 2   |</div>
                      <div>| Cell 3   | Cell 4   |</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
