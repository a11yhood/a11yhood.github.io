import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Separator } from '@/components/ui/separator'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Star, X } from '@phosphor-icons/react'

// Type descriptions for accessibility and tooltips
const TYPE_DESCRIPTIONS: Record<string, string> = {
  'App or Website': 'Web applications and websites',
  'Assistive Technology': 'Tools and software designed to assist people with disabilities',
  'Crochet': 'Crochet-related projects and resources',
  'Fabrication': 'Digital fabrication tools and resources (3D printing, CNC, etc.)',
  'Knitting': 'Knitting-related projects and resources',
  'Other': 'Other types of products not covered by other categories',
  'Software': 'Software tools and applications',
}

type ProductFiltersProps = {
  types: string[]
  tags: string[]
  sources: Array<{ name: string; count: number }>
  selectedTypes: string[]
  selectedTags: string[]
  selectedSources: string[]
  minRating: number
  updatedSince: string | null // ISO date string
  sortBy: 'rating' | 'updated_at' | 'created_at'
  sortOrder: 'asc' | 'desc'
  onTypeToggle: (type: string) => void
  onTagToggle: (tag: string) => void
  onSourceToggle: (source: string) => void
  onMinRatingChange: (rating: number) => void
  onUpdatedSinceChange: (date: string | null) => void
  onSortChange: (value: string) => void
  onClearFilters: () => void
}

export function ProductFilters({
  types = [],
  tags = [],
  sources = [],
  selectedTypes,
  selectedTags,
  selectedSources,
  minRating,
  updatedSince = null,
  sortBy,
  sortOrder,
  onTypeToggle,
  onTagToggle,
  onSourceToggle,
  onMinRatingChange,
  onUpdatedSinceChange,
  onSortChange,
  onClearFilters,
}: ProductFiltersProps) {
  const [tagSearch, setTagSearch] = useState('')
  const safeTags = tags.filter(Boolean)
  
  // Ensure sources are in the correct format (handle both old string[] and new object[] formats)
  const safeSources = sources.map(source => 
    typeof source === 'string' ? { name: source, count: 0 } : source
  )

  // Group small-count sources under "Other"
  const MAJOR_THRESHOLD = 5
  const majorSources = safeSources.filter(s => (s?.count ?? 0) >= MAJOR_THRESHOLD)
  const minorSources = safeSources.filter(s => (s?.count ?? 0) < MAJOR_THRESHOLD)
  const otherTotal = minorSources.reduce((sum, s) => sum + (s?.count ?? 0), 0)
  const groupedSources = otherTotal > 0 
    ? [...majorSources, { name: 'Other', count: otherTotal }]
    : majorSources
  
  const hasActiveFilters =
    selectedTypes.length > 0 ||
    selectedTags.length > 0 ||
    selectedSources.length > 0 ||
    minRating > 0 ||
    updatedSince !== null
  
  const filteredTags = tagSearch
    ? safeTags.filter(tag => tag.toLowerCase().includes(tagSearch.toLowerCase()))
    : safeTags.slice(0, 20)

  if (tagSearch) {
    console.log('[ProductFilters] Tag search:', tagSearch, 'found:', filteredTags.length, 'matching tags:', filteredTags.slice(0, 10))
  }

  return (
    <Card className="p-4 lg:p-6 sticky top-6 max-h-[calc(100vh-120px)] overflow-y-auto lg:max-h-none" role="search">
      <div className="mb-3 lg:mb-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Search</h2>
          {hasActiveFilters && (
            <button
              onClick={onClearFilters}
              className="text-sm text-accent hover:underline"
              aria-label="Clear Filters"
            >
              Clear Filters
            </button>
          )}
        </div>

        <Label className="text-base font-medium" for="sortby">Sort By
        <Select value={`${sortBy}-${sortOrder}`} onValueChange={onSortChange} >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="rating-desc">Highest Rated</SelectItem>
            <SelectItem value="updated_at-desc">Updated</SelectItem>
            <SelectItem value="created_at-desc">Added</SelectItem>
          </SelectContent>
        </Select>
	</Label>
      </div>

      <div className="space-y-3.5 lg:space-y-5">
        <fieldset>
          <legend className="text-base font-medium mb-1.5 lg:mb-2">Type</legend>
          <div className="grid grid-cols-2 gap-2 lg:gap-3" role="group" aria-label="Filter by product type">
            {types.map((type) => {
              const description = TYPE_DESCRIPTIONS[type]
              return (
                <div key={type}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <label className="flex items-center space-x-2 text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer group">
                        <Checkbox
                          checked={selectedTypes.includes(type)}
                          onCheckedChange={() => onTypeToggle(type)}
                          aria-label={description ? `${type}, ${description}` : type}
                          aria-describedby={description ? `type-desc-${type}` : undefined}
                        />
                        <span>{type}</span>
                      </label>
                    </TooltipTrigger>
                    {description && (
                      <>
                        <TooltipContent side="right">{description}</TooltipContent>
                        <div id={`type-desc-${type}`} className="sr-only">{description}</div>
                      </>
                    )}
                  </Tooltip>
                </div>
              )
            })}
          </div>
        </fieldset>

        <Separator className="my-2.5 lg:my-4" />

        <fieldset>
          <legend className="text-base font-medium mb-1.5 lg:mb-2">Source</legend>
          <div className="grid grid-cols-1 gap-2 lg:gap-3" role="group" aria-label="Filter by source">
            {groupedSources.map((source) => (
              <div key={source.name}>
                <label className="flex items-start justify-between gap-2 text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer">
                  <div className="flex items-start gap-2 flex-1 min-w-0 break-words">
                    <Checkbox
                      checked={selectedSources.includes(source.name)}
                      onCheckedChange={() => onSourceToggle(source.name)}
                      aria-label={`${source.name}, ${source.count} products`}
                    />
                    <span className="break-words">{source.name}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">({source.count})</span>
                </label>
              </div>
            ))}
          </div>
        </fieldset>

        <Separator className="my-2.5 lg:my-4" />

        <div>
          <div className="flex items-center justify-between gap-2 mb-2 lg:mb-2.5">
            <Label className="text-base font-medium">Minimum Rating</Label>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => onMinRatingChange(star === minRating ? 0 : star)}
                  className="p-1 hover:bg-accent rounded transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  aria-label={`Set minimum rating to ${star} stars`}
                  title={`${star} star${star === 1 ? '' : 's'} minimum`}
                >
                  <Star
                    size={16}
                    weight={star <= minRating ? 'fill' : 'regular'}
                    className={star <= minRating ? 'text-primary' : 'text-muted-foreground'}
                  />
                </button>
              ))}
              {minRating > 0 && (
                <span className="text-xs text-muted-foreground ml-1">{minRating}+</span>
              )}
            </div>
          </div>
        </div>

        <Separator className="my-2.5 lg:my-4" />

        <div className="flex items-center gap-2">
          <Label htmlFor="updated-since" className="text-sm font-medium whitespace-nowrap">
            Last updated since
          </Label>
          <Input
            id="updated-since"
            type="date"
            value={updatedSince || ''}
            onChange={(e) => onUpdatedSinceChange(e.target.value || null)}
            className="text-sm flex-1"
            aria-label="Filter by last update date"
          />
        </div>

        {tags.length > 0 && (
          <>
            <Separator className="my-2.5 lg:my-4" />
            <div>
              <div className="flex items-center justify-between gap-2 mb-2 lg:mb-2.5">
                <Label className="text-base font-medium">Tags</Label>
                <Input
                  type="search"
                  placeholder="Search..."
                  value={tagSearch}
                  onChange={(e) => setTagSearch(e.target.value)}
                  className="h-8 w-32 text-sm"
                  aria-label="Search for tags"
                />
              </div>
              
              {selectedTags.length > 0 && (
                <div className="mb-2 lg:mb-3">
                  <div className="text-xs text-muted-foreground mb-2">Active tags:</div>
                  <div className="flex flex-wrap gap-2">
                    {selectedTags.map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        role="switch"
                        aria-checked="true"
                        aria-label={tag}
                        onClick={() => onTagToggle(tag)}
                        className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-medium transition-colors bg-primary text-primary-foreground hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        {tag}
                        <X size={14} className="ml-1" weight="bold" aria-hidden="true" />
                      </button>
                    ))}
                  </div>
                </div>
              )}
              
              <div 
                className="flex flex-wrap gap-2"
                aria-label="Available tags"
              >
                {filteredTags.filter(tag => !selectedTags.includes(tag)).map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    role="switch"
                    aria-checked="false"
                    aria-label={tag}
                    onClick={() => onTagToggle(tag)}
                    className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-medium transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {tag}
                  </button>
                ))}
                {tagSearch && filteredTags.length === 0 && (
                  <p className="text-sm text-muted-foreground">No tags match your search</p>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </Card>
  )
}
