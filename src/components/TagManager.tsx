import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Plus, Tag as TagIcon } from '@phosphor-icons/react'
import { UserData } from '@/lib/types'
import { toast } from 'sonner'
import { getProductsPathForTag } from '@/lib/tagRoutes'

type TagManagerProps = {
  productId: string
  currentTags: string[]
  allTags: string[]
  onAddTag: (tag: string) => void
  user: UserData | null
}

export function TagManager({
  currentTags,
  allTags,
  onAddTag,
  user,
}: TagManagerProps) {
  const [isAdding, setIsAdding] = useState(false)
  const [tagInput, setTagInput] = useState('')
  const [suggestions, setSuggestions] = useState<string[]>([])

  const handleInputChange = (value: string) => {
    setTagInput(value)
    if (value.trim()) {
      const filtered = allTags
        .filter(
          (tag) =>
            tag.toLowerCase().includes(value.toLowerCase()) &&
            !currentTags.includes(tag)
        )
        .slice(0, 5)
      setSuggestions(filtered)
    } else {
      setSuggestions([])
    }
  }

  const handleAddTag = (tag: string) => {
    const normalizedTag = tag.trim().toLowerCase()
    if (!normalizedTag) return

    if (currentTags.some((t) => t.toLowerCase() === normalizedTag)) {
      toast.error('This tag already exists on the product')
      return
    }

    onAddTag(normalizedTag)
    setTagInput('')
    setSuggestions([])
    setIsAdding(false)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!tagInput.trim()) return
    const newTags = tagInput
      .split(',')
      .map((t) => t.trim().toLowerCase())
      .filter((t, i, arr) => t && arr.indexOf(t) === i && !currentTags.some((c) => c.toLowerCase() === t))
    if (newTags.length === 0) {
      toast.error('No new tags to add')
      return
    }
    newTags.forEach((tag) => onAddTag(tag))
    setTagInput('')
    setSuggestions([])
    setIsAdding(false)
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <TagIcon size={20} />
          Tags
        </h2>
        {user && !isAdding && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setIsAdding(true)}
            aria-label="Add tag"
            className="h-6 w-6 p-0"
          >
            <Plus size={16} />
          </Button>
        )}
      </div>

      {user && isAdding && (
        <form onSubmit={handleSubmit} className="mb-4">
          <div className="space-y-2">
            <Input
              id="tag-input"
              placeholder="Enter tag name(s), comma-separated..."
              value={tagInput}
              onChange={(e) => handleInputChange(e.target.value)}
              autoFocus
              type="text"
            />
            {suggestions.length > 0 && (
              <div className="bg-(--color-bg-popover) border border-border rounded-md p-2 space-y-1">
                {suggestions.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => handleAddTag(tag)}
                    className="w-full text-left px-2 py-1 text-sm rounded hover:bg-accent hover:text-accent-foreground transition-colors"
                  >
                    {tag}
                  </button>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <Button type="submit" size="sm" disabled={!tagInput.trim()}>
                Add Tag
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => {
                  setIsAdding(false)
                  setTagInput('')
                  setSuggestions([])
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        </form>
      )}

      <ul className="flex flex-wrap gap-2">
        {currentTags && currentTags.length > 0 ? (
          currentTags.map((tag) => (
            <li key={tag}>
              <Link to={getProductsPathForTag(tag)} aria-label={`View all products tagged with ${tag}`}>
                <Badge variant="secondary" className="cursor-pointer hover:bg-secondary/80 transition-colors">
                  {tag}
                </Badge>
              </Link>
            </li>
          ))
        ) : (
          <p className="text-sm text-muted-foreground">No tags yet</p>
        )}
      </ul>
    </div>
  )
}
